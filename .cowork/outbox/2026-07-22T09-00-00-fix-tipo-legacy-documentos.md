# FIX documentos_tipo_check (paseo alta NAGINI) — 2026-07-22

## Bug (cazado por el auditor en el paseo PR-3.3)
Al confirmar subida: "violates check constraint documentos_tipo_check".
Causa REAL verificada en BBDD: la columna LEGACY `tipo` tiene check en minusculas
('contrato','factura','documentacion','otro','autorizacion',...) y el codigo heredado
escribia la EXTENSION del fichero ('pdf') -> el upload estaba roto por partida doble
(tamanio en PR-3.3a + este check). El paseo lo destapo a la primera subida real.

## Fix
- documentos/api.ts: mapa TIPO_LEGACY (contrato->contrato, factura->factura,
  dni->'documentacion' [no existe 'dni' en el check legacy], otro->otro); el insert
  escribe `tipo` mapeado + `tipo_documento` (fuente de verdad). Se opto por mapear en
  vez de NULL para no romper consumidores existentes de `tipo`.
- Backlog: deuda de esquema anotada en docs/MEJORAS_UI_BACKLOG.md (unificar
  tipo -> tipo_documento + backfill + drop check legacy).
- Sin migracion: solo codigo.

## Guion PowerShell Juan (sin &&; guard de rama)
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/fix-pr33-tipo-legacy
git branch --show-current   # DEBE decir claude/fix-pr33-tipo-legacy; si no, PARAR
npx tsc --noEmit
npm test
git add src/features/documentos/api.ts docs/MEJORAS_UI_BACKLOG.md
git commit -m "fix(pr3.3): mapear tipo legacy de documentos (check en minusculas) - el codigo heredado escribia la extension y violaba documentos_tipo_check"
git push -u origin claude/fix-pr33-tipo-legacy
```

## Re-paseo
Repetir la subida del alta NAGINI (tipo contrato + comercializadora NAGINI):
- insert OK; en BBDD: tipo='contrato' Y tipo_documento='contrato'; nombre_archivo
  normalizado; abrir a 1 clic.
- Probar tambien tipo DNI -> en BBDD tipo='documentacion' + tipo_documento='dni'.
