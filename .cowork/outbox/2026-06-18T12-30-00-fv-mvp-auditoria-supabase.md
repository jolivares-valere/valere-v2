# CIERRE SESION -- FV MVP operativo: auditoria Supabase + migracion notas (2026-06-18)

## Resultado
Auditoria real del esquema Supabase completada. El modulo FV esta mejor preparado de lo previsto:
- `fv_kpi_diario` ya es la tabla de produccion diaria.
- `fv_informe_mensual` ya existe.
- `fv_alarma` ya existe y sirve para alarmas gestionables.
- `fv_planta_nota` era lo unico nuevo necesario para notas por planta.

## Migracion aplicada en produccion via MCP
`fv_planta_nota` creada con:
- RLS activa;
- policies read/insert/update/delete;
- trigger `actualizado_en`;
- funcion trigger corregida con `SET search_path = ''`.

Pendiente de repo:
- copiar/versionar SQL en `supabase/migrations/20260618_fv_mvp_notas_rls.sql`.

## Bug principal de mock
En `src/features/seguimiento-fv/SeguimientoFVPage.tsx`, las pestanas:
- Excedentes/Datadis;
- Incidencias;
- Informes;

usan `FIXTURE_COMPARATIVA`, `FIXTURE_INCIDENCIAS`, `FIXTURE_INFORMES` de forma incondicional. Hay que conectarlas a Supabase real o mostrar empty state honesto.

## Decision RLS notificaciones
No abrir INSERT para `authenticated`.
Las notificaciones FV automaticas las crea sync/backend con service_role.
Frontend solo lee/actualiza. Para creacion manual futura: RPC/Edge Function validada.

## Duda plantas resuelta
- `jolivares`: 5 plantas.
- `JOLIVARES`: 7 plantas.
Son credenciales distintas; ambos datos son correctos.

## Proxima accion
1. Versionar migracion en repo.
2. Lanzar prompt MVP en Desktop.
3. Implementar Fase 1 sin esperar a Huawei:
   quitar mock, Centro Operaciones, alarmas gestionables, detalle planta + notas, frescura y KPIs reales.

## Bloqueos paralelos
- `energy-balance HTTP 500`: consumo/autoconsumo/excedente.
- `day-real-kpi 503/WAF`: curva intradia.
- Datadis completo depende de CUPS + energy-balance.
