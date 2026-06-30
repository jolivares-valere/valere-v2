# Outbox 2026-06-13 — Análisis plataformas (Zoco) + 4 entregables

## Qué se hizo
Análisis en vivo del CRM **Zocoenergía** (competidor directo que Valere usa hoy) y cierre del estudio de plataformas. Resuelto el "cómo se conecta con SIPS" que preguntaba Juan: el backend de Zoco consulta **SIPS oficial + Datadis** y cachea; autorrelleno por CUPS (titular/CIF, consumo P1-P6, potencias, tarifa, curva facturación 12m, último cambio comercializadora). Endpoints verificados en vivo.

## Entregables (en C:\Users\joliv\.claude\analisis_plataformas_telemedida\)
- `notas_zocoenergia.md` — análisis módulo a módulo + API + integraciones (SIPS/Datadis/Segenet/OCR/Twilio) + seguridad.
- `DOC1_COMPARATIVO_PLATAFORMAS.md` — comparativa Telegest/Linkener/Segenet/Zoco.
- `DOC2_MEJORAS_PRIORIZADAS_CRM_VALERE.md` — 17 mejoras P0-P3 + hardening.
- `PLAN_TELEMEDIDA_FV_DIRECTA_CRM_VALERE.md` — ampliado con §11 (capa SIPS/Datadis).
- `DOC4_ROADMAP_IMPLANTACION_CRM_VALERE.md` — roadmap por fases F0-F10, dos carriles.

## Seguridad (Zoco, solo documentado — NO actuar sobre Zoco)
APP_DEBUG=true en prod, posible IDOR multitenant en /api/enterprises/:id, catálogo de comisiones expuesto, sin HSTS/X-Frame. Lección: endurecer RLS/cabeceras en CRM Valere.

## Pendiente / próxima sesión
- F0: cerrar sprint de propuestas (hasta 19/06) ANTES de arrancar roadmap.
- F1 (primera fase del roadmap, tras sprint): decidir proveedor SIPS — Datadis (ya integrado) vs agregador comercial. Es la fase de mayor valor/esfuerzo.
- Carril B (telemedida física): gestionar FASE 0 de acceso con Telegest.
- Limpiar fichero vacío `_w.tmp` en la carpeta de análisis (el sandbox no pudo borrarlo) — borrar por PowerShell.

## Nota técnica
NO se tocó código del repo (decisión de no implementar hasta diseño depurado). Git local sigue corrupto → commit de docs lo ejecuta Juan por PowerShell.

---
## ACTUALIZACIÓN: arranque F1 (capa SIPS/Datadis)
Implementada la F1 del roadmap (código, sin commitear por repo corrupto):
- EF `supabase/functions/resolver-sips-cups/index.ts` (orquesta datadis-proxy).
- `src/features/sips/api.ts` + `BuscadorCupsPage.tsx` + ruta `/buscador-cups` + menú.
- Limpiados 1209 bytes nulos en Sidebar.tsx.
BLOQUEADOR: `npx tsc` da ~1948 errores en archivos NO tocados → el checkout local está corrupto. Reparar con `git checkout -B claude/f1-sips-cups origin/main`, reaplicar los 5 archivos (backup en `analisis_plataformas_telemedida/f1_sips/`), TSC 0, test 39/39, desplegar EF, PR. Pasos detallados en `F1_ENTREGA_SIPS_LEEME.md`.
Pendiente: enganchar `sipsToAutofill()` en ContratoForm; decidir proveedor SIPS.

---
## DIAGNÓSTICO REPO + SCRIPT DE REPARACIÓN (2026-06-13 cont.)
Causa raíz del bloqueador identificada (NO eran 1948 archivos rotos de verdad):
- `.git/index` corrupto + ref `refs/heads/main` apunta a 0000… (por eso git pull falla).
- Rama actual `claud` = rama sin commits creada por error.
- 99 archivos de src/ tienen BYTES NULOS inyectados en el working tree local; **origin/main los tiene SANOS**.
Reparación SIN re-clonar: `REPARAR_REPO_Y_F1_2026-06-13.ps1` (en carpeta análisis) borra el index, arregla la ref de main, restaura el working tree desde origin/main, reaplica F1 (incl. helper Node `aplicar_ruta_menu_f1.cjs` para ruta+menú), y deja todo listo para TSC 0 + deploy EF + PR. Hace backup completo antes de tocar nada.
