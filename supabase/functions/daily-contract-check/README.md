# daily-contract-check

Edge Function que ejecuta el rollover diario del pipeline:
1. Marca contratos vencidos (estado=activo, fecha_fin < hoy)
2. Para los que vencen en menos de 60 dias y no tienen oportunidad de renovacion, crea una con etapa=prospecto
3. Genera tarea para el comercial (vencimiento = fecha_fin - 30d) y notificacion

## Deploy

Requiere Supabase CLI instalado. En PowerShell:

## Ejecucion automatica via pg_cron

En el SQL Editor de Supabase, una sola vez:
```sql
Set-Content -Path supabase\functions\daily-contract-check\README.md -Encoding UTF8 -Value @'
# daily-contract-check

Edge Function que ejecuta el rollover diario del pipeline.

Funciones:
- Marca contratos vencidos
- Crea oportunidades de renovacion (60 dias antes)
- Asigna tarea al comercial
- Envia notificacion

Deploy: npx supabase functions deploy daily-contract-check

Programar con pg_cron: ver instrucciones detalladas en el chat con Claude.
