# Datadis Autorizaciones — Fase 1 implementada (2026-06-30)

Rama: claude/datadis-autorizaciones

## Estado
- Migración SQL aplicada en prod (commit ef012f6 en main): contactos.dni + tabla datadis_autorizaciones.
- Edge Function datadis-generar-autorizacion DESPLEGADA y ACTIVE (commit 379f84b en la rama).
- Frontend (api + tab Datadis en ficha empresa) SIN commitear aún. TSC 0 en sandbox.

## Para la siguiente sesión / terminal de Juan
1. npx tsc --noEmit  (debe dar 0)
2. npm test -- --run  (sandbox no pudo: falta binario rollup linux)
3. git add src/features/datadis/autorizaciones.api.ts src/features/datadis/components/DatadisAutorizacionesTab.tsx src/features/empresas/EmpresaDetailPage.tsx docs/
   git commit -m "feat(datadis): UI autorizaciones ficha empresa + docs fase 1"
   git push origin claude/datadis-autorizaciones
   -> abrir PR a main
4. Probar en local: empresa -> tab Datadis -> Generar -> completar firmante+DNI -> generar.

## Ojo
- EmpresaDetailPage.tsx fue truncado por el mount y restaurado desde main + cp. Verificar que en tu working copy está completo (367 líneas, cierra con `}`).
- Ninguna empresa tiene firmante con DNI todavía -> la validación lo exigirá (correcto).

## Siguiente: Fase 2 (ciclo de estados: enviar email cliente, subir firmado, marcar activa con referencia_datadis).
