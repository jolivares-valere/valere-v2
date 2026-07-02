---
title: Recuperar la contraseña
section: auth
audience: todos
keywords: [contraseña, password, olvidé, recuperar, restablecer, reset, no puedo entrar, acceso, login]
related:
  - docs/help/AUTH-SIGNUP-Y-APROBACION.md
---

# Recuperar la contraseña

## Qué es
Si olvidaste tu contraseña, puedes crear una nueva tú mismo desde la pantalla de inicio de sesión, sin necesidad de que el administrador la resetee. El CRM te envía un email con un enlace para elegir una contraseña nueva.

## Cómo acceder
1. Abre el CRM: https://valere-v2.pages.dev
2. En la pantalla de login, pulsa **«¿Olvidaste tu contraseña?»** (debajo del botón «Entrar»).
3. Escribe tu email y pulsa **«Enviar enlace»**.
4. Recibirás un email con un enlace. Ábrelo y elige tu contraseña nueva (mínimo 8 caracteres), escríbela dos veces y pulsa **«Guardar contraseña»**.
5. Vuelve al login y entra con la contraseña nueva.

## Detalles
- Por seguridad, el mensaje de confirmación es siempre el mismo exista o no una cuenta con ese email. Así nadie puede averiguar qué correos están registrados.
- El enlace del email **caduca** (por defecto ~1 hora). Si te aparece «El enlace no es válido o ha caducado», solicita uno nuevo desde «¿Olvidaste tu contraseña?».
- Tu cuenta debe estar aprobada para poder usar el CRM. Recuperar la contraseña no aprueba una cuenta pendiente.

## Si algo falla
- **No me llega el email**: revisa la carpeta de spam/promociones. El correo viene de `Valere CRM <noreply@valereconsultores.com>`. Si tras unos minutos no llega, avisa al administrador.
- **El enlace caducó**: pide uno nuevo desde «¿Olvidaste tu contraseña?».
- **Dice que la contraseña no puede ser igual a la anterior**: elige una contraseña distinta a la que tenías.
- **Sigo sin poder entrar tras cambiarla**: comprueba que tu cuenta está aprobada (si ves la pantalla «Tu cuenta está pendiente», el administrador aún no la ha aprobado).
