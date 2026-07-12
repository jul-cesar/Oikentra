# 01 - Autenticación y Gestión de Negocios

**Proyecto:** Aplicación móvil para gestión básica de caja y fiados en pequeños negocios  
**Módulo:** Autenticación y gestión de negocios  
**Enfoque:** Spec Driven Development (SDD)  
**Estado:** Borrador funcional y técnico  

---

## 1. Propósito del documento

Este documento define cómo funcionará la autenticación de usuarios y la gestión inicial de negocios dentro de la aplicación.

La idea principal es que una persona pueda crear una cuenta, iniciar sesión y registrar uno o varios negocios. Cada negocio tendrá su propia información: ventas, gastos, clientes, fiados, abonos y reportes.

Este módulo es la base de seguridad y organización del sistema. Sin una cuenta de usuario y sin un negocio activo, el usuario no debe poder registrar información financiera.

---

# PARTE 1 - ENFOQUE FUNCIONAL / NO TÉCNICO

Esta sección explica el módulo desde el punto de vista del usuario, el negocio y las reglas funcionales, sin entrar todavía en código ni tecnologías.

---

## 2. Descripción general

El usuario debe poder usar la aplicación con una cuenta propia. Después de iniciar sesión, podrá crear negocios y entrar a cada uno para administrar su información.

Flujo principal:

```txt
Usuario
  ↓
Inicia sesión
  ↓
Crea o selecciona un negocio
  ↓
Entra al negocio
  ↓
Puede registrar ventas, gastos, clientes, fiados y abonos
  ↓
Puede consultar reportes e historial del negocio activo
```

La autenticación no existe solo para “entrar a la app”. Su objetivo es:

- Identificar al usuario dueño de la información.
- Asociar cada negocio a un usuario.
- Separar los datos de un usuario de los datos de otro.
- Proteger los endpoints del backend.
- Permitir respaldo o sincronización futura de los datos.
- Permitir que un usuario tenga varios negocios registrados.

---

## 3. Actores del módulo

### 3.1 Usuario

Persona que instala la app, crea una cuenta e inicia sesión.

Puede ser:

- Tendero.
- Dueño de miscelánea.
- Vendedor informal.
- Persona con puesto de comida.
- Emprendedor.
- Administrador de uno o varios negocios pequeños.

### 3.2 Negocio

Unidad independiente administrada por el usuario.

Ejemplos:

- Tienda La 20.
- Miscelánea El Progreso.
- Puesto de comidas Doña Ana.
- Venta de catálogos.
- Negocio familiar.

Cada negocio tiene sus propios datos. La información de un negocio no debe mezclarse con la de otro.

### 3.3 Sistema

Conjunto de app móvil, backend y base de datos que permite autenticar usuarios, guardar negocios y proteger la información.

---

## 4. Alcance funcional

Este módulo incluye:

- Registro de usuario.
- Inicio de sesión.
- Inicio de sesión con Google.
- Cierre de sesión.
- Recuperación de sesión activa.
- Creación de negocios.
- Listado de negocios del usuario.
- Selección de negocio activo.
- Consulta del negocio activo.
- Edición básica de un negocio.
- Validación de que el usuario solo acceda a sus propios negocios.

---

## 5. Fuera de alcance inicial

Este módulo no incluye en el MVP:

- Roles avanzados por negocio.
- Empleados o cajeros invitados.
- Gestión multiusuario de un mismo negocio.
- Permisos detallados por acción.
- Inicio de sesión por SMS.
- Autenticación biométrica.
- Doble factor de autenticación.
- Recuperación avanzada de cuenta.
- Panel web administrativo.
- Suscripciones o pagos.

Estas funcionalidades pueden evaluarse en fases posteriores.

---

## 6. Reglas de negocio

### RN-AUTH-001 - El usuario debe estar autenticado para usar información en la nube

El usuario debe iniciar sesión para crear, consultar o modificar negocios en el backend.

Sin sesión válida, el sistema debe negar el acceso a endpoints protegidos.

---

### RN-AUTH-002 - Un usuario puede tener varios negocios

Un usuario puede registrar más de un negocio en su cuenta.

Ejemplo:

```txt
Usuario: Ana
Negocios:
  - Tienda La Bendición