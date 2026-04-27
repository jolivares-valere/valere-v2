---
title: Mi perfil — contraseña, notificaciones, firma
section: perfil
audience: todos
keywords: [perfil, mi cuenta, ajustes, settings, contraseña, password, cambiar password, foto avatar, notificaciones, email, firma, signature, idioma, preferencias, zona horaria]
related:
  - empezando/primer-acceso
  - notificaciones/gestionar-notificaciones
  - admin/gestionar-usuarios
---

# Mi perfil

## Resumen rápido
Click en tu **avatar** (esquina superior derecha) → **Mi perfil**. Desde ahí cambias contraseña, foto, preferencias de notificaciones por email, firma para correos salientes y zona horaria.

## Cómo abrir mi perfil

1. Click en el círculo con tu inicial o foto, esquina superior derecha del CRM.
2. Menú desplegable → **Mi perfil** (o **Mi cuenta** según versión).
3. Se abre una página con varias pestañas: Datos personales, Seguridad, Notificaciones, Preferencias.

## Cambiar contraseña

1. Mi perfil → pestaña **Seguridad**.
2. Sección **Cambiar contraseña**.
3. Rellena:
   - **Contraseña actual** *(obligatorio)*: por seguridad, hay que confirmar la actual.
   - **Nueva contraseña** *(obligatorio)*: mínimo 8 caracteres, recomendado >12, mezclar mayúsculas/minúsculas/números.
   - **Confirmar nueva**: igual que la nueva.
4. **Guardar cambios**.
5. Te mantiene la sesión iniciada — no necesitas volver a entrar.

> **Si has olvidado la contraseña actual**: cierra sesión, en la pantalla de login pulsa **¿Has olvidado tu contraseña?** y sigue las instrucciones del email de recuperación.

### Buenas prácticas de contraseña

- Usa un **gestor de contraseñas** (1Password, Bitwarden, Apple Passwords).
- **No reutilices** la contraseña del CRM en otros sitios.
- Mínimo recomendado: 12 caracteres con símbolos.
- Si sospechas que tu contraseña puede estar comprometida, cámbiala inmediatamente.

## Cambiar foto / avatar

1. Mi perfil → pestaña **Datos personales**.
2. Click sobre el avatar circular grande arriba.
3. Sube una imagen (JPG/PNG, mínimo 200×200, máximo 2 MB).
4. Recorta si lo pide.
5. **Guardar**.

La foto aparece en:
- La barra superior del CRM.
- Las actividades que registras.
- Las menciones en notas internas (`@tu_nombre`).
- El listado de usuarios para el admin.

## Cambiar email asociado a la cuenta

1. Mi perfil → pestaña **Datos personales**.
2. Campo **Email**.
3. Cambia el valor.
4. **Guardar**.
5. Se envía un email de confirmación al **nuevo** email — abre y confirma para que el cambio sea efectivo.

Hasta confirmar, el login sigue funcionando con el email viejo.

## Notificaciones por email

1. Mi perfil → pestaña **Notificaciones**.
2. Activa/desactiva con checkboxes:
   - **Recordatorios de tareas vencidas**: email diario con tus tareas pendientes.
   - **Nueva oportunidad asignada**: email cuando alguien te asigna una oportunidad.
   - **Vencimientos de contratos**: email cuando un contrato tuyo vence en 30/60/90 días.
   - **Renovaciones próximas**: email cuando una renovación entra en zona naranja/roja.
   - **Mención en una nota**: email si un compañero te menciona con `@tunombre`.
   - **Resumen semanal**: email los lunes con los KPIs de tu semana anterior.
3. **Guardar preferencias**.

> **Atajo "no me molestes"**: desactivar **todas** las notificaciones de un click con el toggle "Pausar todos los emails durante X días" (vacaciones, etc.).

## Firma para emails enviados desde el CRM

Si envías emails desde dentro del CRM (función futura / parcial), tu firma se añade al final automáticamente.

1. Mi perfil → pestaña **Preferencias** → sección **Firma de email**.
2. Escribe la firma (texto plano o markdown ligero):

   ```text
   --
   Juan Olivares
   Consultor energético — Valere Consultores
   📞 +34 600 000 000
   ✉ juan@valere.es
   www.valere.es
   ```

3. **Guardar**.

## Idioma y zona horaria

1. Mi perfil → pestaña **Preferencias**.
2. **Idioma de la interfaz**: español (única opción actualmente; inglés y catalán están en roadmap).
3. **Zona horaria**: por defecto Europa/Madrid. Cámbiala si trabajas desde otro país (Canarias = Atlantic/Canary, etc.). Afecta a cómo se muestran las fechas/horas en actividades, calendario y notificaciones.

## Cerrar sesión en otros dispositivos

Si has perdido el portátil o sospechas que alguien usó tu cuenta:

1. Mi perfil → pestaña **Seguridad**.
2. Sección **Sesiones activas**.
3. Lista todas las sesiones abiertas con dispositivo, navegador, IP aproximada y última actividad.
4. **Cerrar sesión** junto a la sospechosa, o **Cerrar sesión en todos los dispositivos** para empezar de cero.

## Eliminar mi cuenta

Solo el admin/master puede eliminar usuarios. Pide a tu admin (`master@valere.es` o equivalente) que ejecute la baja.

Si eres admin y estás dado de baja en la consultora, transfiere primero tus empresas/contratos a otro comercial antes de pedir la eliminación, para que no quede contenido huérfano.

## Errores frecuentes

- **"Contraseña actual incorrecta"**: la contraseña vieja está mal. Si no la recuerdas, recupera contraseña desde el login.
- **"La nueva contraseña no cumple los requisitos"**: mínimo 8 caracteres. Pon más.
- **"Email ya en uso"**: otro usuario del CRM usa ese email. Solicita al admin si es un problema (no debería ocurrir).
- **"No me llegan los emails de notificaciones"**: revisa spam, comprueba que el email del perfil es correcto y confirmado, y que las notificaciones no están todas desactivadas.

## Preguntas relacionadas

- ¿Tengo doble factor de autenticación (2FA)?
- ¿Cómo descargar mis datos personales (RGPD)?
- ¿Puedo tener dos cuentas con el mismo email?
- ¿Cómo cambio mi rol (de comercial a manager)?
