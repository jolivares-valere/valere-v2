# Cierre Fase 0 Seguridad + arranque Fase 1 (2026-07-03)

## Fase 0 — CERRADA (6/6, auditada cruzada con Fable 5)
Trabajo hecho vía conector Supabase (no todo son ficheros de migración en el repo).
Migraciones registradas en Supabase: fase0_1_revoke_execute_security_definer,
fase0_2_drop_sobrecargas_lead_captacion, fase0_3_rls_hardening_alertas_telemetry_priceterms,
fase0_3b_revoke_is_staff_anon, fase0_5_drop_fv_backups_20260511. Además 1 cambio directo de
cron.job (esios-nightly).

- P1: revocado EXECUTE a `authenticated` en 7 funciones SECURITY DEFINER (cierra falsificación de auditoría).
- P2: eliminadas 4 sobrecargas de crear/actualizar_lead_captacion (1 firma viva por función).
- P3: RLS por comando + grants de columna en alertas/client_telemetry/datadis_supply_price_terms;
  helper is_staff(); anon expulsado. Tests de impersonación OK.
- P4: leaked-password NO disponible en plan Free -> cerrado con compensación (min length 12 + composición).
- P5: DROP 3 tablas fv_*_backup_20260511 (comparación por hash de credenciales, sin CSV de secretos).
- P6: esios-price-cache pasa de ABIERTA a auth por `x-cron-secret` desde Vault
  (vault name 'esios_cron_secret', ASCII); JWT legacy fuera del cron. Tope de 400 días.

Informe de cierre (8 secciones) en Drive: carpeta "BACKUP CRM VALERE"
(ID 1nJCUtqjql8U5Buz1gnpIu71qz9t-x3F6), Google Doc
1SND5tiYyATxwOHwmn5IQh3HcWrljpA_NTHBvOsjqjEs.

## Pendiente de Fase 0
- ANEXO: confirmar que el cron esios-nightly de las 20:30 UTC (2026-07-03) corrió en 200
  (leer net._http_response / logs del cron el 2026-07-04). No bloquea el sello.
- Tareas derivadas: upgrade a Pro (~25$/mes -> leaked-password + backups diarios),
  formalizar role='manager' para Julia Ruiz, rate-limit en send-password-reset,
  guard `if(!INGEST_TOKEN) return 500` en tariffs-ingest-email.

## Fase 1 — ARRANQUE (siguiente chat)
Objetivo: 361 CUPS de renovaciones -> el "libro de ventas". Cargar/migrar renovaciones al CRM.
Al abrir el chat de Fase 1: seguir el PROTOCOLO DE INICIO (git pull, cat CLAUDE.md + docs/ESTADO.md,
ls .cowork/inbox .cowork/outbox, git log). Definir alcance exacto con Juan antes de tocar datos.
