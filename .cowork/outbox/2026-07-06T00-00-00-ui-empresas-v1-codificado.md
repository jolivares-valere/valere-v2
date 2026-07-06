# UI Empresas v1 — codificado, pendiente commit/PR

Workstream MEJORAS UI (nuevo, permanente). Paquete v1 EMPRESAS escrito en el working tree,
SIN commit (sandbox no toca .git). Juan debe ejecutar `APLICAR_UI_EMPRESAS_V1.ps1`
(rama claude/ui-empresas-presentacion, H4 interactivo, tsc+tests, add selectivo, push).

Ficheros del paquete (SOLO estos entran al commit):
- src/core/components/Pagination.tsx (nuevo)
- src/features/empresas/tipos.ts (nuevo)
- src/features/empresas/EmpresasPage.tsx
- src/features/empresas/api.ts (hook useComerciales)
- src/features/empresas/components/EmpresaForm.tsx
- src/core/types/entities.ts ⚠️ COMPARTIDO: diff debe ser solo TipoEmpresa += 'residencial'
- docs/help/empresas/listado-empresas.md (nuevo)
- docs/MEJORAS_UI_BACKLOG.md (nuevo)
- docs/ESTADO.md + docs/SESIONES/2026-07-06-resumen-ui-empresas.md + este outbox

Derivadas para otros workstreams:
1. SQL: ampliar CHECK empresas.tipo con 'residencial' (hasta entonces, guardar ese tipo dará error controlado).
2. Datos: backfill empresas.tipo y empresas.ciudad (fuentes: staging fase1, facturas, carpetas).
3. Modelado "canales" asignables (no existen en esquema; Juan no aclaró aún qué son).

El working tree tiene además restos de SIPS F1 (src/features/sips/, APLICAR_F1_SIPS_BUSCADOR.ps1) — NO son de este paquete.
