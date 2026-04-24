---
title: Gestionar usuarios y roles
section: admin
audience: admin
keywords: [usuarios, roles, permisos, comercial, manager, master, aprobar, desactivar, admin]
related:
  - empezando/primer-acceso
  - admin/custom-fields
---

# Gestionar usuarios y roles

## Resumen rápido
**Admin** → **Usuarios** → ver lista de todos los usuarios del CRM → aprobar altas pendientes, cambiar roles, desactivar cuentas.

Solo roles `master` y `manager` tienen acceso a esta pantalla.

## Roles del sistema

| Rol | Qué puede hacer |
|---|---|
| **Master** | Acceso total. Gestión de usuarios, custom fields, configuración sistema. |
| **Manager** | Gestión equipo comercial. Ve todo el pipeline del equipo. No configura sistema. |
| **Comercial** | Ve y gestiona sus propias empresas, contratos, oportunidades, actividades. |
| **Client** | Rol mínimo (default temporal). Sin acceso real al CRM hasta que un admin le cambie el rol. |

La visibilidad de datos se controla con **RLS** (Row Level Security) de Supabase automáticamente según el rol asignado.

## Aprobar un alta nueva

Cuando alguien se registra en `valere-v2.pages.dev` con "Crear cuenta", entra al sistema con rol `client` (no puede hacer nada). Un admin tiene que aprobarle y asignarle rol real.

1. Admin → **Usuarios** → filtro **Pendientes de aprobar**.
2. Verás los usuarios recién registrados.
3. Por cada uno:
   - Verifica que el email es de @valereconsultores.com (o del dominio autorizado).
   - Pulsa **Aprobar**.
   - Se abre el dialog para **asignar rol**: comercial / manager / master.
   - **Guardar**.
4. El usuario recibe notificación por email de que ya puede entrar.

## Cambiar el rol de un usuario existente

1. Admin → Usuarios → buscar al usuario en la lista.
2. Click en el usuario.
3. Campo **Rol** → cambiar al nuevo valor.
4. **Guardar**.

⚠️ **Precaución**: bajar a alguien de master a manager o de manager a comercial es un cambio de permisos — se pierde acceso a pantallas. Avisar antes de hacerlo.

## Desactivar un usuario

Cuando alguien sale del equipo:

1. Admin → Usuarios → buscar.
2. Campo **Activo** → desactivar (toggle OFF).
3. Guardar.
4. El usuario ya no puede hacer login aunque tenga contraseña.
5. Sus datos asignados (empresas, oportunidades, contratos) siguen existiendo — no se borran.

**Reasignar su cartera**:
- Desde el listado de Empresas, filtrar por el comercial desactivado.
- Acción masiva → reasignar a otro comercial.

## Eliminar un usuario completamente

⚠️ **Destructivo e irreversible**.

Solo hacer si el usuario se equivocó al registrarse y nunca hizo nada en el sistema:

1. Admin → Usuarios → buscar.
2. Icono papelera 🗑.
3. Confirmar.
4. El usuario desaparece (auth.users + profile).

Si el usuario YA creó datos (empresas, actividades), NO se puede eliminar — solo desactivar. Esto protege la integridad referencial.

## Buenas prácticas

- **Aprobaciones en 24h**: no dejes usuarios pendientes sin atender — frustra su primera experiencia.
- **Principio de mínimo privilegio**: si alguien solo necesita ser comercial, no le des manager "por si acaso". Ajusta después si hace falta.
- **Auditoría periódica**: cada 3 meses revisa la lista de usuarios activos — desactiva los que ya no deberían tener acceso.
- **Desactivar inmediato al salir**: cuando alguien deja el equipo, desactivar el mismo día antes de que termine su día de trabajo.

## Historial

El sistema registra:
- Fecha de creación de cada usuario.
- Quién le aprobó el alta.
- Cambios de rol con fecha + quién lo cambió.
- Fecha de desactivación (si aplica).

Accesible desde la ficha del usuario → pestaña **Historial**.

## Errores frecuentes

- **"Email ya registrado"**: esa persona ya tiene cuenta. Buscar en la lista antes de intentar crear.
- **"No puedo cambiar mi propio rol"**: protección — ningún usuario puede modificarse a sí mismo para evitar escalada de privilegios. Pedir a otro admin.
- **"Este usuario tiene datos asociados"**: no se puede borrar. Solo desactivar.

## Preguntas relacionadas

- ¿Cómo reasignar todas las empresas de un comercial a otro?
- ¿Puedo darle acceso temporal (1 día) a alguien?
- ¿Hay límite de usuarios en el plan?
- ¿Cómo forzar a alguien a cambiar su contraseña?
