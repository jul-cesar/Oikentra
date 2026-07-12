# 12 - Arquitectura de Bases de Datos

## 1. Decisión recomendada

Para el MVP se usará:

```txt
1 instancia PostgreSQL
        ├── auth_db
        ├── business_db
        ├── sync_db
        └── reports_db (solo cuando sea necesario)
```

Esto significa:

- Un solo servidor PostgreSQL desplegado o conectado desde Dokploy.
- Una base lógica por microservicio.
- Un usuario y contraseña distintos por servicio.
- Ningún servicio consulta o modifica directamente la base de otro.

---

## 2. Distribución por servicio

| Servicio | Base | Responsabilidad |
|---|---|---|
| `auth-service` | `auth_db` | Usuarios, sesiones, cuentas y verificaciones |
| `business-service` | `business_db` | Negocios, clientes, ventas, gastos, fiados y abonos |
| `sync-service` | `sync_db` | Idempotencia, dispositivos, cursores y conflictos |
| `reports-service` | Sin base inicialmente | Generación síncrona de archivos |
| `reports-service` futuro | `reports_db` | Jobs, proyecciones y metadata de archivos |

---

## 3. Reports-service

Durante el MVP, `reports-service` puede ser prácticamente stateless:

```txt
reports-service
        ↓ HTTP interno
business-service
        ↓
Genera PDF, CSV o XLSX
        ↓
Devuelve bytes al cliente
```

No necesita base propia mientras:

- Genere reportes de forma síncrona.
- No mantenga proyecciones.
- No guarde historial de reportes.
- No procese trabajos en segundo plano.

Se agregará `reports_db` cuando existan:

- Reportes asíncronos.
- Estado de trabajos.
- Historial de archivos.
- Proyecciones de lectura.
- Eventos procesados.
- Reintentos persistentes.

---

## 4. Por qué no usar una sola base compartida

Una única base con todas las tablas facilitaría joins, pero provocaría:

- Acoplamiento entre servicios.
- Migraciones compartidas.
- Acceso directo a tablas ajenas.
- Mayor dificultad para separar servicios.
- Riesgo de que un servicio afecte datos de otro.

Por eso cada servicio será dueño de su base.

---

## 5. Por qué no usar una instancia por servicio desde el inicio

Usar cuatro servidores PostgreSQL separados aumentaría:

- Consumo de recursos.
- Backups.
- Actualizaciones.
- Monitoreo.
- Configuración.
- Costos operativos.

Para el MVP basta una instancia PostgreSQL con varias bases lógicas.

Más adelante una base podrá moverse a otra instancia sin cambiar los contratos de API.

---

## 6. Usuarios y permisos

Cada servicio tendrá credenciales exclusivas:

```txt
auth_app_user
business_app_user
sync_app_user
reports_app_user
```

Ejemplo:

```txt
auth-service      solo accede a auth_db
business-service  solo accede a business_db
sync-service      solo accede a sync_db
reports-service   solo accede a reports_db cuando exista
```

Los microservicios no usarán el usuario administrador de PostgreSQL.

---

## 7. Comunicación entre servicios

No se harán consultas SQL entre bases.

Ejemplos:

```txt
sync-service → HTTP interno → business-service
reports-service → HTTP interno → business-service
```

Reglas:

- `sync-service` no escribe en `business_db`.
- `reports-service` no consulta directamente `business_db`.
- `business-service` no consulta tablas de Better Auth.
- La identidad llega mediante Traefik y `auth-service`.

---

## 8. Migraciones

Cada servicio administra sus propias migraciones:

```txt
auth-service/migrations
business-service/migrations
sync-service/migrations
reports-service/migrations
```

Reglas:

- Drizzle genera y ejecuta migraciones por servicio.
- Una migración no modifica bases ajenas.
- Las migraciones se versionan en Git.
- Se ejecutan de forma controlada antes del despliegue.
- La aplicación no debe iniciar si su esquema es incompatible.

---

## 9. Transacciones

Una transacción solo puede cubrir datos dentro de la base de un servicio.

Ejemplo válido:

```txt
business_db:
crear abono + crear movimiento de caja
```

Ambos registros se crean en una sola transacción.

Ejemplo no válido:

```txt
transacción única entre sync_db y business_db
```

Entre servicios se utilizarán:

- Idempotencia.
- Reintentos.
- Estados de procesamiento.
- Compensaciones cuando sean necesarias.

---

## 10. Backups

Se configurarán respaldos de:

```txt
auth_db
business_db
sync_db
```

Prioridad:

1. `business_db`.
2. `auth_db`.
3. `sync_db`.
4. `reports_db` cuando exista.

También se debe probar la restauración, no solamente crear backups.

---

## 11. Redis

Redis será independiente de PostgreSQL.

Usos:

| Área | Uso |
|---|---|
| Auth | Sesiones, verificaciones y rate limiting |
| Sync | Colas, reintentos y locks |
| Reports | Cache temporal de archivos o resultados |

Redis no almacenará la única copia de información financiera.

---

## 12. Variables de conexión

```txt
AUTH_DATABASE_URL
BUSINESS_DATABASE_URL
SYNC_DATABASE_URL
REPORTS_DATABASE_URL
REDIS_URL
```

Cada variable estará disponible únicamente en el servicio correspondiente.

---

## 13. Evolución futura

Una base se moverá a una instancia independiente cuando:

- Requiera escalar por separado.
- Necesite mayor aislamiento.
- Tenga una carga muy diferente.
- Requiera alta disponibilidad propia.
- Exista un requisito de seguridad.
- El mantenimiento de una base afecte a los demás servicios.

---

## 14. Decisiones cerradas

- Una instancia PostgreSQL para el MVP.
- Una base lógica por servicio con persistencia propia.
- Credenciales separadas.
- Sin consultas SQL entre servicios.
- `reports-service` sin base inicialmente.
- Migraciones independientes.
- PostgreSQL como fuente de verdad.
- Redis como componente auxiliar.

---

## 15. Decisiones pendientes

- Proveedor o ubicación de PostgreSQL.
- Política y frecuencia de backups.
- Retención de operaciones de sincronización.
- Momento para crear `reports_db`.
- Cifrado de backups.
- Alta disponibilidad futura.
