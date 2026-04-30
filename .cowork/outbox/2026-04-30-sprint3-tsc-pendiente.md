# Handoff 2026-04-30 → próxima sesión

## Estado al cierre

Rama: `claude/sprint2-lib-potencias` (sin push aún).

### Trabajo completado hoy
1. **Sprint 1 P0** ✅ — trigger `fn_calcular_alertas_solicitudes` + 41 fechas alerta + 31 expedientes huérfanos asignados (Julia Ruiz creada en CRM auth.users + reasignación).
2. **Auditoría exhaustiva** ✅ — `docs/AUDITORIA_POTENCIAS_VS_CRM.md` con 4 gaps identificados.
3. **Sprint 2** ✅ — 16/16 archivos copiados de musing-kalam (Drive Desktop) a CRM en estructura final.
4. **Sprint 3 primera pasada** ✅ — imports + nombres de tablas + tipos básicos.
5. **Sprint 3 segunda pasada** ⏳ pendiente — ~60 errores TSC documentados en `docs/SPRINT3_TSC_PENDIENTE.md` con plan paso a paso.

### Estado del CRM Supabase
- Advisors: 0 ERRORs / casi 0 WARNs (solo Pro plan + módulo FV/Holded sin tocar).
- 41/41 expedientes con created_by asignado.
- Trigger fn_calcular_alertas_solicitudes activo en `solicitudes_potencia`.
- Julia Ruiz operativa con role consultant.

## Prioridades para próxima sesión

### 🔴 Sprint 4 — completar TSC integration Potencias (~2.5h)

Seguir `docs/SPRINT3_TSC_PENDIENTE.md` por fases:

1. **Fase A** (30 min): npm install `@react-pdf/renderer pdf-lib` + añadir `formatFecha` a `@/core/utils/dates` + casts `Uint8Array → BlobPart` + tipar lambdas + fix export `generateEmailPresentacion`.
2. **Fase B** (15 min): sed `storage_path → ruta_storage`.
3. **Fase C** (30 min): manual cups/comercializadoras.
4. **Fase D** (1h): manual empresas (nombre_fiscal/cif/etc.). **Decidir destino de `gestor_id`** — recomendado añadir columna a empresas.
5. **Fase E**: TSC = 0, commit, PR.

### 🟡 Otros pendientes

- **Backup automático Drive de Valere** (tarea original del usuario).
- **Regenerar RESEND_API_KEY** (si no se hizo aún — la actual se expuso en chat).
- **Carpeta `CRM VALERE/` vacía** en `C:\Users\joliv\valere-v2\` — borrar.
- **Activar Pro plan Supabase** cuando se escale a clientes externos.

## Cosas que NO hacer
- No archivar proyecto `alesfvxqtwlrwlmkoosg` hasta que Sprint 4 esté completo.
- No mergear `claude/sprint2-lib-potencias` a main hasta que TSC = 0 (si no, CI bloquea futuros PRs).
- No usar sed masivo para `nombre_fiscal/cif/etc.` en pdf-fill.ts — esos son keys de schema interno, no columnas BD.

## Reglas aprendidas hoy
- Drive Desktop como dependencia es frágil. Cuando se pueda, sincronizar musing-kalam → GitHub completo (commit + push de los 14 archivos no commiteados).
- Decodificar 19 archivos vía base64 inline inunda el chat. Mejor usar Drive MCP para 3-5 archivos críticos y script PowerShell con Copy-Item para el resto.
- `cliente.nombre_fiscal` puede ser key de schema interno (no columna BD). Sed masivo rompe.
