# Solicitar acceso al CRM y aprobación de usuarios

Esta guía explica cómo darse de alta en el CRM de Valere Consultores y cómo el administrador (Juan) gestiona las solicitudes pendientes.

## Para usuarios nuevos: cómo solicitar acceso

1. Abre la URL del CRM: https://valere-v2.pages.dev
2. En la pantalla de login, pulsa el enlace **"Solicitar acceso"** debajo del botón "Entrar".
3. Te llevará al formulario `/signup`. Rellena:
   - **Nombre** (tu nombre de pila).
   - **Apellido** (un apellido).
   - **Email** (puede ser cualquier email — corporativo o personal).
   - **Contraseña** (mínimo 8 caracteres).
4. Pulsa **"Solicitar acceso"**.
5. Verás una pantalla "Tu cuenta está pendiente". Tu solicitud queda registrada y el administrador recibe un email de aviso al instante.
6. Cuando el administrador apruebe tu solicitud, recibirás un email **"[Valere CRM] Tu cuenta ha sido aprobada"** con un enlace al login. A partir de ese momento puedes entrar normalmente.

### ¿Cuánto tarda la aprobación?

Depende del administrador. Lo habitual es minutos u horas. Si pasados 7 días tu solicitud no se aprueba, se borra automáticamente y tendrás que volver a registrarte.

### No me llega el email de aprobación

- Comprueba la carpeta de spam o promociones.
- Verifica que el email que pusiste al registrarte es el correcto. Si te equivocaste, vuelve a hacer el signup con el email correcto.
- El email viene de `Valere CRM <noreply@valereconsultores.com>`. Algunos clientes de correo lo pueden marcar como sospechoso por ser un dominio reciente.

### He intentado registrarme y dice "este email ya está registrado"

Ya tienes una cuenta (puede que no aprobada). Si has olvidado la contraseña, contacta con el administrador para que te la resetee — no hay todavía un flujo de "olvidé mi contraseña" público en signup.

## Para el administrador: aprobar o rechazar solicitudes

### Recibir aviso de nueva solicitud

Cada vez que alguien se registra en `/signup`, llega un email a `jolivares@valereconsultores.com` con asunto **"[Valere CRM] Nueva alta pendiente: <email>"**. El email contiene los datos del solicitante y un enlace directo al panel de admin.

### Revisar solicitudes pendientes

1. Loguéate en el CRM con tu cuenta de master.
2. Ve a **Admin** (menú lateral) → tab **"Pendientes"**.
3. Verás una tabla con todas las solicitudes pendientes: nombre, email, fecha de solicitud y un selector de rol.

### Aprobar a un usuario

1. En la tabla de pendientes, localiza al solicitante.
2. Selecciona el rol que quieres asignarle:
   - **Cliente** (`client`): rol por defecto, acceso de lectura/operativa estándar.
   - **Consultor** (`consultant`): rol para comerciales/consultores energéticos.
   - **Manager** (`manager`): rol con permisos elevados (incluye Admin parcial).
   - **Master** (`master`): superusuario con acceso total. Úsalo solo para administradores reales.
3. Pulsa el botón verde **"Aprobar"**.
4. La cuenta queda activa al instante (`approved=true`, `status='active'`).
5. El usuario recibe automáticamente un email de bienvenida con el enlace al login.

### Rechazar a un usuario

1. Pulsa el botón rojo **"Rechazar"** junto a la solicitud.
2. Aparece un diálogo de confirmación. Confirma.
3. La cuenta se borra completamente (de `auth.users` y `user_profiles`).
4. El usuario recibe un email educado informando de que su solicitud no ha sido aprobada.

### Auto-rechazo a 7 días

Las solicitudes que llevan más de 7 días sin aprobar se borran automáticamente cada noche a las 03:00 UTC (05:00 hora española en verano). Esto mantiene la lista limpia y evita acumulación de solicitudes obsoletas. El usuario afectado **no recibe email de aviso** en este caso (porque el cron lo hace en silencio).

Si sabes que vas a tardar más de una semana en revisar una solicitud concreta, apruébala con rol restringido y luego cámbialo después.

## Cambiar el rol de un usuario ya aprobado

1. Admin → tab **Usuarios** (no "Pendientes" — esa es solo para nuevos).
2. Localiza al usuario y cambia el desplegable de rol.
3. El cambio es inmediato (sin email de aviso).

## Borrar un usuario ya aprobado

Actualmente no hay botón en la UI para borrar un usuario aprobado. Hay que hacerlo manualmente desde Supabase:

```sql
DELETE FROM auth.users WHERE email = 'usuario@ejemplo.com';
-- el cascade borra automáticamente de user_profiles
```

O usar la función `admin_reject_user(uuid)` también funciona sobre aprobados (no validamos estado).

## Excepciones técnicas

- **`jolivares@valereconsultores.com`** se aprueba automáticamente al hacer signup (rol `master`). Es la única excepción hardcoded.
- **Usuarios creados antes del 26-04-2026** que tengan `approved=false` con `status='active'` (legacy de invitaciones por email no completadas) NO se borran automáticamente — el cron solo afecta a `status='pendiente'`. Aparecerán en el tab "Pendientes" para que el admin decida.
