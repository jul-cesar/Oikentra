# 00 - Product Vision

## Proyecto
**Nombre del producto:**  
**Nombre provisional:** Saldao  
**Tipo de producto:** Aplicación móvil de gestión básica de caja y fiados para pequeños negocios.  
**Enfoque metodológico:** Spec Driven Development (SDD).  
**Estado del documento:** Borrador inicial.

---

## 1. Contexto

Muchos pequeños negocios, especialmente tiendas de barrio, misceláneas, puestos de comida, ventas informales y negocios familiares, llevan el control de sus ventas, gastos y fiados de forma manual, usando cuadernos, notas sueltas o memoria.

Esto genera desorden financiero, pérdida de información, dificultad para saber cuánto dinero entra y sale, y poco control sobre las deudas pendientes de los clientes.

El documento base del proyecto plantea este problema en el contexto de tiendas de barrio en Sincelejo, donde se identifican necesidades como control de caja diaria, control de fiados, reportes simples, uso en Android de gama baja y funcionamiento sin conexión constante a internet.

---

## 2. Problema principal

Los pequeños negocios no cuentan con una herramienta simple, rápida y adaptada a su realidad para registrar ventas, gastos, fiados y abonos.

Como consecuencia, el dueño del negocio puede tener dificultades para responder preguntas básicas como:

- ¿Cuánto vendí hoy?
- ¿Cuánto gasté hoy?
- ¿Cuánto dinero quedó?
- ¿Quién me debe?
- ¿Cuánto me deben en total?
- ¿Qué deudas llevan muchos días sin pagarse?
- ¿Cómo se movió mi negocio esta semana?

---

## 3. Usuario objetivo

El producto está dirigido a personas que administran uno o varios pequeños negocios.

### Usuarios principales

- Tenderos de barrio.
- Dueños de misceláneas.
- Vendedores informales.
- Personas con puestos de comida.
- Negocios familiares.
- Emprendedores que venden productos o servicios de manera informal.

### Características del usuario

- Puede tener bajo conocimiento contable.
- Puede tener bajo o medio nivel de alfabetización digital.
- Usa celular Android como herramienta principal.
- Necesita registrar operaciones rápido, sin procesos complejos.
- Puede no tener conexión estable a internet durante todo el día.
- Puede administrar más de un negocio.

---

## 4. Propuesta de valor

La aplicación permitirá llevar el control básico de caja y fiados desde el celular, usando lenguaje simple y flujos rápidos.

La propuesta central es:

> Registrar ventas, gastos, fiados y abonos en pocos segundos, incluso cuando no haya internet.

El producto no busca ser un sistema contable formal. Busca ser una herramienta práctica para que el usuario entienda mejor el movimiento diario de su negocio.

---

## 5. Alcance del MVP

La primera versión del producto incluirá las funcionalidades mínimas necesarias para validar la idea con usuarios reales.

### 5.1 Autenticación básica

El usuario podrá:

- Crear una cuenta.
- Iniciar sesión.
- Cerrar sesión.
- Mantener su sesión activa en el dispositivo.

La autenticación se implementará de forma simple usando Better Auth.

### 5.2 Gestión de negocios

El usuario podrá:

- Crear un negocio.
- Ver sus negocios registrados.
- Seleccionar un negocio activo.
- Editar información básica del negocio.
- Administrar más de un negocio desde la misma cuenta.

Regla clave:

> Toda venta, gasto, fiado, abono, cliente y reporte debe pertenecer a un negocio específico.

### 5.3 Caja diaria

El usuario podrá:

- Registrar una venta.
- Registrar un gasto.
- Agregar una nota opcional.
- Seleccionar una categoría simple para gastos.
- Ver el resumen del día.

El resumen del día debe mostrar:

- Total de entradas.
- Total de salidas.
- Diferencia del día.

Importante:

> En el MVP se hablará de “dinero que entró”, “dinero que salió” y “dinero que quedó”, no de ganancia neta contable.

### 5.4 Control de fiados

El usuario podrá:

- Crear clientes.
- Registrar un nuevo fiado.
- Registrar abonos parciales.
- Marcar una deuda como pagada.
- Ver cuánto debe cada cliente.
- Ver el total por cobrar.
- Identificar deudas antiguas.

### 5.5 Resumen financiero simple

El usuario podrá consultar:

- Resumen del día.
- Resumen semanal básico.
- Total pendiente por cobrar.
- Clientes que más deben.
- Deudas antiguas.

Los reportes deben usar lenguaje cotidiano, evitando términos como débito, crédito, activo, pasivo, utilidad neta o balance contable.

### 5.6 Modo offline inicial

La aplicación debe permitir operar sin conexión a internet para las acciones principales:

- Registrar ventas.
- Registrar gastos.
- Registrar clientes.
- Registrar fiados.
- Registrar abonos.
- Consultar información guardada localmente.

La base de datos local propuesta es SQLite.

---

## 6. Fuera de alcance inicial

Las siguientes funcionalidades no hacen parte del MVP:

- Inventario.
- Facturación electrónica.
- Integraciones bancarias.
- OCR o lectura de facturas por foto.
- Inteligencia artificial.
- Microcréditos.
- Reportes tributarios.
- Nómina.
- Roles avanzados.
- Gestión multiusuario por negocio.
- Suscripciones o pagos dentro de la app.
- Dashboard web administrativo.
- Sincronización avanzada entre múltiples dispositivos.

---

## 7. Decisiones abiertas

Algunas decisiones quedan pendientes para próximas especificaciones.


### 7.2 Estrategia offline y sincronización

Se desea que la app tenga modo offline, pero la estrategia de sincronización con una base de datos remota todavía no está definida.

Opciones a evaluar:

1. **Solo local en MVP**
   - Toda la información vive en SQLite.
   - No hay sincronización inicial.
   - Menor complejidad.
   - Riesgo: si el usuario pierde el celular, pierde la información.

2. **Local + backup manual**
   - SQLite como base principal.
   - Exportación o copia de seguridad manual.
   - Menor complejidad que sincronización completa.

3. **Local-first con sincronización**
   - SQLite como base principal.
   - PostgreSQL como respaldo remoto.
   - Mayor complejidad técnica.
   - Permite recuperar datos e iniciar sesión en otro dispositivo.

La decisión final se tomará después de definir el modelo de datos y los casos de uso críticos.

### 7.3 Backend

Se considera usar:

- Node.js
- Hono o Express
- PostgreSQL
- Better Auth
- Drizzle ORM o Prisma

La arquitectura definitiva se definirá en el documento de arquitectura.

---

## 8. Principios de diseño del producto

El producto debe cumplir estos principios:

### 8.1 Simplicidad

Cada acción frecuente debe poder hacerse en pocos pasos.

Ejemplo:

> Registrar una venta no debería requerir más de monto + guardar.

### 8.2 Lenguaje cotidiano

La app debe hablar como habla el usuario.

Usar:

- Venta
- Gasto
- Fiado
- Abono
- Me deben
- Entró
- Salió
- Quedó

Evitar:

- Débito
- Crédito
- Activo
- Pasivo
- Utilidad neta
- Cuentas por cobrar
- Estado financiero

### 8.3 Uso rápido

La app debe priorizar rapidez sobre complejidad.

El usuario puede estar atendiendo clientes mientras registra información.

### 8.4 Offline primero

Las acciones principales no deben depender de internet.

### 8.5 Multi-negocio

Un usuario puede administrar uno o varios negocios.

### 8.6 Datos separados por negocio

La información de un negocio no debe mezclarse con la de otro.

### 8.7 Confianza

La app debe evitar que el usuario sienta que puede perder su información.

Aunque la sincronización no esté definida inicialmente, el diseño debe considerar mecanismos futuros de respaldo.

---

## 9. Métricas de éxito del MVP

El MVP se considerará exitoso si, durante una prueba piloto, se cumplen algunas de estas condiciones:

- El usuario puede registrar ventas sin ayuda.
- El usuario puede registrar gastos sin ayuda.
- El usuario puede registrar fiados y abonos sin ayuda.
- El usuario entiende cuánto dinero entró y salió en el día.
- El usuario entiende cuánto dinero le deben.
- El usuario usa la app varias veces durante la semana.
- El usuario considera que la app es más clara que usar un cuaderno.
- La satisfacción promedio es igual o superior a 4 sobre 5.

---

## 10. Hipótesis del producto

### Hipótesis 1

Si el usuario puede registrar una venta o gasto en pocos segundos, aumentará la probabilidad de uso diario.

### Hipótesis 2

Si el control de fiados es más claro que un cuaderno, el usuario podrá reducir olvidos y disputas.

### Hipótesis 3

Si la app funciona sin internet, será más viable para pequeños negocios con conectividad irregular.

### Hipótesis 4

Si el usuario puede crear varios negocios, la app será útil para más casos que solo tiendas de barrio.

### Hipótesis 5

Si el lenguaje evita términos contables, la adopción será mayor en usuarios sin formación financiera.

---

## 11. Actores iniciales

### Usuario

Persona que usa la app para administrar uno o varios negocios.

### Negocio

Unidad independiente donde se registran ventas, gastos, fiados, clientes y reportes.

### Cliente de fiado

Persona que adquiere productos o servicios y queda debiendo dinero al negocio.

---

## 12. Primeras entidades del dominio

- User
- Business
- CashMovement
- Customer
- Credit
- Payment
- DailySummary

Estas entidades se detallarán en el documento `01-domain-model.md`.

---

## 13. Reglas iniciales de negocio

- Un usuario puede tener uno o varios negocios.
- Un negocio pertenece a un usuario.
- Una venta pertenece a un negocio.
- Un gasto pertenece a un negocio.
- Un cliente pertenece a un negocio.
- Un fiado pertenece a un cliente y a un negocio.
- Un abono pertenece a un fiado.
- Una deuda se considera pagada cuando el total abonado es igual o mayor al monto del fiado.
- El total por cobrar es la suma de los saldos pendientes de todos los fiados activos.
- El resumen diario se calcula con las ventas y gastos registrados en una fecha específica.
- La app debe permitir registrar información aunque no exista conexión a internet.

---

## 14. Preguntas para el siguiente documento

Estas preguntas deben resolverse en `01-domain-model.md` y `02-business-rules.md`:

1. ¿Una venta fiada también debe contar como venta del día?
2. ¿Un abono debe entrar a caja como ingreso del día?
3. ¿Se permitirá editar una venta o solo anularla?
4. ¿Se permitirá editar un fiado o solo registrar correcciones?
5. ¿Un cliente puede tener varios fiados activos al mismo tiempo?
6. ¿Los gastos tendrán categorías fijas o personalizadas?
7. ¿El usuario podrá cerrar caja manualmente al final del día?
8. ¿Qué pasa si el usuario registra una venta con fecha anterior?
9. ¿Cómo se manejarán eliminaciones en modo offline?
10. ¿El MVP necesita backup o solo almacenamiento local?

---

## 15. Definición corta del producto

Aplicación móvil para pequeños negocios que permite registrar ventas, gastos, fiados y abonos de forma rápida, simple y sin depender de conexión constante a internet.