# 19 - API Gateway y autenticación centralizada

## Estado del documento

- **Estado:** Diseño aprobado, pendiente de revisión escrita
- **Plataforma cliente inicial:** Web
- **Servicio nuevo:** `gateway-service`
- **Traefik:** Conservado únicamente para TLS y enrutamiento hacia web/gateway

## 1. Propósito

Oikentra incorporará un gateway de aplicación como única entrada pública a sus APIs. El objetivo es retirar de Traefik las responsabilidades de autenticación, CORS y enrutamiento por microservicio, y eliminar los proxies duplicados que hoy viven en Next.js.

Traefik seguirá terminando HTTPS, pero no ejecutará `ForwardAuth`, no generará identidad y no aplicará CORS.

## 2. Arquitectura objetivo

```text
Internet
   │ HTTPS
   ▼
Traefik
   ├── /       → web
   └── /api/*  → gateway-service
                    ├── /api/auth/*     → auth-service
                    ├── /api/business/* → business-service
                    ├── /api/reports/*  → reports-service
                    ├── /api/sync/*     → sync-service
                    └── /api/ai/*       → ai-service
```

Solo `web` y `gateway-service` estarán expuestos mediante Traefik. Los microservicios serán accesibles únicamente dentro de la red privada.

Web y API usarán el mismo origen público, por ejemplo:

```text
https://oikentra.com/
https://oikentra.com/api/*
```

## 3. Responsabilidades

### 3.1 Traefik

Traefik se limitará a:

- terminar TLS;
- renovar certificados;
- enrutar `/` hacia web;
- enrutar `/api/*` hacia gateway;
- propagar información de conexión necesaria.

Traefik no tendrá:

- `ForwardAuth`;
- configuración CORS;
- rutas individuales por microservicio;
- conocimiento de sesiones;
- manipulación de `X-Internal-Auth`.

### 3.2 Gateway

El gateway será responsable de:

- clasificar rutas públicas y protegidas;
- aplicar CORS y responder preflight;
- validar `Origin` en operaciones autenticadas con cookie;
- autenticar mediante `auth-service`;
- almacenar temporalmente assertions en Redis;
- eliminar headers internos enviados por clientes;
- seleccionar la audiencia y el servicio destino;
- propagar request IDs;
- aplicar timeouts y límites de cuerpo;
- reenviar cuerpos y respuestas mediante streaming;
- conservar correctamente cookies, `Set-Cookie`, estados y redirects;
- devolver errores uniformes de gateway;
- generar logs estructurados sin secretos.

El gateway no tendrá reglas de negocio, repositorios ni acceso a bases de datos de dominio.

### 3.3 Auth-service

`auth-service` seguirá siendo la única autoridad de identidad. Será responsable de:

- login, registro, logout, recuperación y OAuth mediante Better Auth;
- validar cookies de sesión;
- administrar revocaciones;
- emitir assertions RS256 de corta duración;
- conservar exclusivamente la clave privada de firma;
- usar Redis como `secondaryStorage` de Better Auth, con PostgreSQL como fuente persistente cuando corresponda.

### 3.4 Microservicios protegidos

Cada microservicio:

- aceptará tráfico de aplicación solo desde la red privada;
- exigirá `X-Internal-Auth`;
- verificará firma RS256, issuer, expiración y audiencia;
- extraerá `userId` y `sessionId` de la assertion;
- aplicará sus propios permisos y reglas de negocio;
- conservará únicamente la clave pública.

## 4. Clasificación de rutas

### 4.1 Rutas públicas

Las rutas necesarias para autenticarse no requieren una sesión previa, por ejemplo:

- login;
- registro;
- verificación de correo;
- recuperación y restablecimiento de contraseña;
- callbacks OAuth;
- health checks explícitamente públicos.

El gateway las reenvía a `auth-service` preservando cookies, redirects y múltiples headers `Set-Cookie`.

### 4.2 Rutas protegidas

Las rutas de business, reports, sync y AI requieren sesión válida, salvo excepciones documentadas de health check.

La tabla de rutas será explícita y cerrada. Una ruta `/api/*` sin destino registrado devolverá `404`; no existirá un proxy abierto basado en una URL proporcionada por el cliente.

## 5. Flujo de autenticación protegido

```text
Cliente
  │ Cookie Better Auth
  ▼
Gateway
  │ calcula hash opaco de sesión + audiencia
  ▼
Redis
  ├── HIT  → assertion vigente
  └── MISS → auth-service valida sesión y firma assertion
                 │
                 └── gateway guarda assertion temporalmente
  ▼
Microservicio destino
  │ verifica assertion localmente
  ▼
Respuesta
```

### 5.1 Clave de caché

El gateway no almacenará el token de sesión como clave legible. Calculará:

```text
sessionDigest = HMAC-SHA256(GATEWAY_CACHE_KEY_SECRET, sessionToken)
auth:assertion:{sessionDigest}:{audience}
```

La audiencia será una constante elegida por la ruta, nunca un valor libre enviado por el cliente.

### 5.2 Valor almacenado

Redis almacenará como mínimo:

- assertion RS256;
- expiración de la assertion;
- identificador de sesión necesario para observabilidad, sin incluir secretos.

El TTL terminará al menos cinco segundos antes de `exp`. Con assertions de 60 segundos, la caché tendrá un máximo efectivo aproximado de 55 segundos.

### 5.3 Cache miss

En un miss, el gateway llamará a un endpoint interno de `auth-service`, enviando:

- cookie original;
- audiencia seleccionada por el gateway;
- request ID;
- credencial interna que identifique al gateway.

`auth-service` validará la audiencia contra una lista cerrada, validará la sesión con Better Auth y emitirá la assertion.

El endpoint de emisión estará disponible solo en la red privada y exigirá una credencial de servicio del gateway. La clave privada RS256 nunca saldrá de `auth-service`.

### 5.4 Cache hit

El gateway verificará que la entrada tenga margen de vigencia suficiente y enviará la assertion al servicio destino sin consultar `auth-service`.

El microservicio siempre verificará la assertion; nunca confiará en el hecho de que provenga de la red del gateway.

## 6. Redis y tolerancia a fallos

Redis será caché, no fuente de verdad.

- Si Redis falla, el gateway consultará directamente `auth-service`.
- Si Redis responde con datos inválidos o expirados, el gateway eliminará la entrada y consultará auth.
- Si auth falla y existe una assertion válida recuperada antes del fallo, podrá utilizarse hasta su expiración.
- Si no existe caché válida y auth no está disponible, el gateway devolverá `503 AUTH_SERVICE_UNAVAILABLE`.
- El gateway no extenderá por sí mismo una sesión ni una assertion.

Better Auth utilizará Redis mediante `secondaryStorage` para evitar consultas repetitivas a PostgreSQL. Esta caché interna no reemplaza la caché de assertions del gateway: resuelven saltos diferentes.

## 7. Logout y revocación

El logout seguirá este orden:

1. el gateway conserva el digest de la cookie recibida;
2. reenvía el logout a `auth-service`;
3. auth revoca la sesión y devuelve los headers `Set-Cookie` correspondientes;
4. el gateway elimina las assertions cacheadas para todas las audiencias conocidas de ese digest;
5. el gateway reenvía la respuesta al cliente.

Una revocación realizada fuera de ese flujo puede permanecer efectiva en el gateway hasta que expire la assertion. Se acepta una ventana máxima aproximada de 60 segundos.

No se crearán listas de revocación adicionales en la primera versión.

## 8. Headers y seguridad

Antes de enrutar una petición protegida, el gateway eliminará cualquier header de identidad enviado por el cliente, incluidos:

- `X-Internal-Auth`;
- `X-User-Id`;
- `X-Session-Id`;
- variantes equivalentes reservadas.

Después agregará sus propios headers:

- `X-Internal-Auth`;
- `X-Request-Id`.

También eliminará headers hop-by-hop y no reenviará `Host` arbitrario. Los destinos serán URLs configuradas por entorno, no valores de la petición.

Los logs no incluirán cookies, assertions, credenciales internas ni cuerpos sensibles.

## 9. CORS y CSRF

El gateway mantendrá una lista explícita de orígenes permitidos.

Para web bajo el mismo dominio, la mayoría de peticiones serán same-origin y no necesitarán CORS. El gateway conservará soporte CORS para desarrollo y futuros clientes web en otros orígenes.

CORS no sustituye protección CSRF. En operaciones autenticadas mediante cookie, el gateway validará `Origin` contra la lista permitida antes de reenviar métodos que cambien estado. Better Auth conservará sus propias protecciones para endpoints de autenticación.

No se responderá con `Access-Control-Allow-Origin: *` cuando se usen credenciales.

## 10. Proxy y respuestas

El gateway:

- preservará método, path y query string;
- transmitirá cuerpos y respuestas por streaming;
- conservará códigos de estado válidos del servicio destino;
- preservará múltiples `Set-Cookie` en auth;
- conservará redirects manuales necesarios para OAuth;
- aplicará timeout por servicio;
- devolverá `502` para respuesta inválida del upstream;
- devolverá `503` cuando un destino no esté disponible;
- devolverá `504` cuando expire el timeout;
- añadirá `Cache-Control: no-store` a respuestas de autenticación y errores sensibles.

## 11. Observabilidad

Cada petición recibirá o reutilizará un request ID válido. El mismo ID acompañará:

- llamada a auth;
- llamada al servicio destino;
- respuesta y logs de gateway.

Los logs estructurados incluirán:

- servicio;
- request ID;
- método;
- ruta normalizada;
- destino lógico;
- resultado de caché: hit, miss, bypass o error;
- estado final;
- estado del upstream;
- duración;
- categoría de error.

No se registrarán valores de autenticación.

## 12. Despliegue

Traefik expondrá únicamente:

- web para `/`;
- gateway para `/api/*`.

`auth-service`, `business-service`, `reports-service`, `sync-service`, `ai-service` y Redis no publicarán puertos en producción. Permanecerán accesibles por nombre dentro de la red privada.

En desarrollo local podrán publicarse puertos para depuración, pero el flujo integrado recomendado pasará por gateway.

## 13. Migración

La migración se hará sin cambiar contratos públicos:

1. crear `gateway-service` y probar en paralelo;
2. implementar proxy público de auth;
3. implementar emisión por audiencia y caché Redis;
4. incorporar un servicio protegido a la vez;
5. apuntar los clientes web a rutas same-origin existentes;
6. retirar proxies `apps/web/app/api/auth`, `business` y `reports` cuando exista paridad;
7. retirar `ForwardAuth`, CORS y rutas por microservicio de Traefik;
8. cerrar exposición pública de servicios;
9. actualizar documentación y smoke tests.

Debe existir rollback mientras Next.js y gateway convivan: cambiar el destino de `/api` sin migrar datos ni modificar los microservicios.

## 14. Verificación

La implementación deberá probar:

- rutas públicas y protegidas;
- caché hit y miss por audiencia;
- expiración y margen de TTL;
- fallback cuando Redis falla;
- rechazo de sesión inválida;
- rechazo de headers internos falsificados;
- preservación de múltiples cookies;
- logout e invalidación de caché;
- CORS permitido y rechazado;
- validación de Origin para CSRF;
- audiencia incorrecta;
- timeouts y servicios no disponibles;
- streaming de cuerpos y respuestas;
- ausencia de acceso público directo a microservicios.

## 15. Fuera de alcance inicial

- reglas de negocio dentro del gateway;
- acceso del gateway a bases de datos de dominio;
- reemplazar Better Auth;
- mover la clave privada RS256 fuera de auth-service;
- service mesh;
- mTLS entre todos los servicios;
- balanceo avanzado dentro del gateway;
- transformación de payloads de dominio;
- rate limiting distribuido general;
- caché de respuestas de negocio;
- exponer APIs públicas para terceros.

Estas capacidades solo se agregarán cuando exista una necesidad medida.
