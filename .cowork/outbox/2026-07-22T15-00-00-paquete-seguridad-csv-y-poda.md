# PAQUETE SEGURIDAD + LIMPIEZA — CSV credenciales y poda de ramas — 2026-07-22
ESTADO: PREPARADO, NADA EJECUTADO. Ejecuta Juan en PowerShell, en este orden.

## PARTE 1 — CSV DE CREDENCIALES: FALSA ALARMA VERIFICADA (22-jul, con Juan)
AUDITORIA HECHA EN VIVO: el fichero docs/CREDENCIALES_1PASSWORD.csv es IDENTICO en
todo su historial (2 commits, 24/25-abr) y NUNCA contuvo una contrasena real — todos
los campos password son anotaciones de accion (REGENERAR_EN_..., SECRETA_VERIFICAR_...,
REVOCAR_PROBABLE_HUERFANA, GUARDADA_TRAS_ROTACION_2026-...). Es un INVENTARIO saneado.
La entrada "SERIO: 14 contrasenas en main" de actas/memoria queda CORREGIDA.

### Acciones que SI quedan (mucho mas ligeras)
1. [ ] Retirar el fichero del repo de todos modos (es un mapa de cuentas de Valere =
       valor de reconocimiento; su sitio es 1Password):
       git rm docs/CREDENCIALES_1PASSWORD.csv + commit. SIN filter-repo (el historial
       no contiene secretos; reescribir historia ya no compensa el riesgo).
2. [ ] Del propio inventario, pendientes reales de abril:
       - Revocar las 2 claves Gemini marcadas "REVOCAR_PROBABLE_HUERFANA"
         (aistudio.google.com/apikey) y verificar el secret GEMINI_API_KEY de las EF.
       - "Datadis - integracion: VERIFICAR..." — revisar que quedo en Vault (S0.2).
3. [ ] Higiene de tokens Supabase (opcional, sin urgencia): Juan tiene 7 access tokens
       (5x cli_..., CRM VALERE CONSULTORES, valere-cli). Revocar los cli_ antiguos que
       no se usen. ⚠ NO revocar "CRM VALERE CONSULTORES" ni el token que alimente el
       conector MCP de esta sesion sin crear antes el sustituto.

## PARTE 2 — PODA DE RAMAS REMOTAS (81 borrables de 86)
Analisis: solo 4 ramas se conservan — main · claude/energia-v2-s0 (energia S0 activo) ·
claude/f1-sips-cups (SIPS aparcado) · claude/holded-integration (trabajo sin mergear).
El resto son PRs ya squash-mergeados o trabajo superseded (mismo criterio que la poda
local del dia 0, que dejo esas mismas 4).

```powershell
cd C:\Users\joliv\valere-v2
git fetch --prune origin
git push origin --delete claude/audit-log claude/back-button-contextual claude/datadis-borrar-y-fixes claude/datadis-fix-dni-contacto claude/datadis-fix-tipo-documento claude/datadis-incidencias claude/diag-fv-energy-balance-variantes claude/docs-actualizacion-previa-desktop claude/docs-auditoria-y-roadmap-fv claude/docs-checklist-revision-fase1
git push origin --delete claude/docs-cierre-2026-04-23 claude/docs-cierre-2026-06-14 claude/docs-cierre-2026-06-14-v2 claude/docs-cierre-datadis claude/docs-cierre-energy-balance-resuelto claude/docs-cierre-fase1-tarea1 claude/docs-cierre-fv-20260615 claude/docs-cierre-fv-fase3-20260615 claude/docs-cierre-fv-mvp-auditoria-20260618 claude/docs-cierre-fv-zona-20260617
git push origin --delete claude/docs-plan-fv-mvp-20260617 claude/docs-prompt-mvp-fv-v3-coherente claude/fase1-piezas-energia claude/fase2-clientejson claude/fase3-fv-sync claude/fase4-fv-energy-balance claude/fase4-panel-produccion claude/fase5-login-directo claude/fase5-login-robusto claude/faseA-captura-facturas
git push origin --delete claude/fix-fv-credenciales claude/fix-fv-doble-browser-asyncio claude/fix-fv-energy-balance-timezonestr claude/fix-fv-energy-balance-v1 claude/fix-fv-host-postlogin claude/fix-fv-zona-dinamica claude/fix-login-cors claude/fix-login-usuario claude/fix-login-usuario2 claude/fix-pr25-prioridad-no-degrada
git push origin --delete claude/fix-pr33-listado-huerfanos claude/fix-pr33-tipo-legacy claude/fix-soft-delete-rls claude/fix-sync-asyncio-thread claude/fix-useauth-strictmode-X1P82 claude/fv-cookies-popup claude/fv-delegar-storagestate claude/fv-fase1-conectar-pestanas claude/fv-mvp-prompt-y-migracion claude/importador-xlsx-tarifas
git push origin --delete claude/mcp-setup claude/mvp-captacion-bandejas claude/potencias-sidebar-section claude/pr-1-1-cabecera-ficha claude/pr-1-2-contratos-cups claude/pr-1-3-renovaciones-empresa claude/pr-1-4-empresa-clicable claude/pr-1-5-suministros-curva claude/pr-2-1-lista-unica claude/pr-2-2-renovaciones-filtros
git push origin --delete claude/pr-2-3-contratos-lista claude/pr-2-4-kpis-clicables claude/pr-2-5-bandeja-sin-fecha claude/pr-3-1-catalogo-comercializadoras claude/pr-3-2-asistente-alta-venta claude/pr-3-3-documentos-ocr-ready claude/resume-valere-v2-pzzQ7 claude/setup-project-memory-GYN0g claude/signup-aprobacion-manual claude/sips-f1
git push origin --delete claude/sprint-a-cowork claude/sprint2-lib-potencias claude/suministros-comercial claude/ui-empresas-export-xlsx claude/ui-empresas-filtro-comercial claude/ui-empresas-presentacion claude/ui-renovaciones-cups claude/ui-renovaciones-r1r3 claude/valere-crm-architecture-2vvEV feature/demo-audit-mode
git push origin --delete feature/fv-operational-redesign
git fetch --prune origin
git branch -r | Measure-Object -Line   # esperado: ~5 lineas (4 ramas + HEAD)
```
Si GitHub rechaza alguna por proteccion, apuntarla y seguir.

## Verificacion final (me la pides y la hago yo)
- CSV fuera de main; claves Gemini huerfanas revocadas.
- Ramas remotas = 4 + main.
