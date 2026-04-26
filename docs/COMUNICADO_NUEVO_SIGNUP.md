# Comunicado equipo — Nuevo flujo de alta en el CRM

## Versión email (pegar en Outlook/Gmail)

**Asunto:** Nuevo proceso para dar de alta usuarios en el CRM Valere

> Hola equipo,
>
> A partir de hoy, el CRM Valere (https://valere-v2.pages.dev) tiene un nuevo flujo para añadir usuarios:
>
> **Si necesitas acceso al CRM:**
> 1. Entra en https://valere-v2.pages.dev
> 2. Pulsa "Solicitar acceso" en la pantalla de login.
> 3. Rellena nombre, apellido, email y contraseña.
> 4. Yo recibo un aviso al instante. En cuanto te apruebe, recibirás un email de confirmación con el enlace.
>
> **Si necesitas que demos de alta a alguien externo (un cliente, un colaborador):**
> Mándale el enlace https://valere-v2.pages.dev/signup. Que se registre. Yo apruebo.
>
> El cambio es porque las invitaciones por email de Supabase tenían rate-limit y a veces fallaban. El nuevo flujo es más fiable y elimina los emails de invitación con enlaces que caducaban en 24 h.
>
> Si tienes una cuenta antigua no aprobada (`administracion`, `arodriguez`), ignora — la activaré manualmente en el panel.
>
> Cualquier duda, respondedme.
>
> Juan

## Versión Slack/WhatsApp (más corta)

> Equipo: a partir de hoy para dar de alta a alguien en el CRM (https://valere-v2.pages.dev) no hace falta invitación por email. La persona entra, pulsa "Solicitar acceso", se registra, y yo apruebo. Yo recibo aviso al instante. Cualquier duda me decís.

## Notas internas (NO enviar al equipo)

- Quitamos las invitaciones de Supabase por: rate-limit, coste implícito, link caduca a 24h, friction para el usuario final.
- El nuevo flujo usa Resend (3000 emails/mes plan Free, sobra) con dominio `valereconsultores.com` ya verificado.
- 7 días de auto-rechazo de pendientes que no se aprueben (cron diario 03:00 UTC).
- Las cuentas legacy `administracion@valereconsultores.com` y `arodriguez@valereconsultores.com` están con `approved=false` desde el 25-04 — fueron invitaciones que no completaron el flow de email (saturó el rate-limit). Aparecerán en el tab "Pendientes" del admin para que decidas: aprobarlas con su rol o borrar (probablemente aprobar como `consultant` o `client`).
