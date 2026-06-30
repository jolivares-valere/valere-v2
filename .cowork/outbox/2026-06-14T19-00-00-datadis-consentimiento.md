# Outbox · 2026-06-14 (tarde) · Datadis — expediente de consentimiento

> Continuación de la sesión de diseño. Solo `.md` en `docs/`. No se tocó código ni git.
> **Recordar: git sigue pendiente de reparar** (ver outbox `2026-06-14T17-00-00` + `REPARAR_GIT_CLAUD_2026-06-14.ps1`).

## Qué se hizo esta tarde
Profundización del **consentimiento Datadis** con Juan. Se aclaró el flujo real (corrigiendo un malentendido previo):

- **Corrección clave:** SÍ existe la vía de **enviar el documento firmado por email a soporte de Datadis**, que da
  de alta la autorización manualmente (~2-3 días). El PDF firmado SÍ vale frente a Datadis. (Antes se había asumido
  que solo valía el clic del cliente en datadis.es — incompleto.)
- **Flujo decidido por Juan:** el CRM orquesta el expediente completo, con **2 correos distintos**:
  1. Correo nº1 → al cliente (doc a firmar).
  2. (cliente devuelve firmado a Valere) → **subida manual** del firmado al CRM.
  3. Correo nº2 → a soporte de Datadis (doc firmado), **como borrador que un humano revisa y envía**.
- Validez autorización: **24 meses**. Confirmación de `activo` por **sondeo** del sync contra la cuenta Valere.

## Entregables nuevos (docs/)
- `DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md` — máquina de 7 estados, tablas propuestas
  (`expediente_consentimiento_datadis`), 2 correos, guarda en proxy, sondeo, caducidad, plan EC-1..EC-7.
- `BORRADOR_DATADIS_TEXTOS_2026-06-14.md` — borrador de cláusula RGPD (NO vinculante, revisar legal) + textos de
  los 2 correos + campos que rellena el CRM + checklist de pendientes.

## Pendiente para mañana / próximas sesiones
1. **Reparar git** (bloquea commitear todo lo de hoy).
2. **Tareas operativas de Juan** (no código): confirmar con Datadis (a) email de soporte para el correo nº2,
   (b) modelo oficial de documento, (c) plazo de alta; y confirmar que existe la **cuenta de empresa de Valere en
   datadis.es** con el NIF que los clientes autorizan.
3. **Revisión legal** del borrador de cláusula.
4. Decidir A/B del modelo de datos (tabla nueva de expediente vs ampliar `consentimientos_datadis`). Recomendado: A.
5. Cuando haya OK: construir EC-1..EC-7 (rama `claude/datadis-consentimiento` + PR).

## Verificado en vivo (solo lectura)
- `consentimientos_datadis`: columnas reales = id, cups, cliente_id, firmado_por_email/nombre, fecha_firma, ip_firma,
  texto_legal, hash_texto, fecha_inicio/fin_autorizacion, revocado_at/motivo, created_by/at, updated_at. **0 filas.**
  Pensada para firma electrónica en pantalla; le falta el ciclo de expediente → de ahí la tabla nueva propuesta.
- `datadis-proxy` v13 ACTIVE. `documentos` 108 filas (polimórfica, reutilizable para los PDFs). Resend ya configurado.
