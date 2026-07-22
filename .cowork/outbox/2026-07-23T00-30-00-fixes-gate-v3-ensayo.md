# Fixes del ensayo gate V3 (F1+F3+F4) CODIFICADOS — 2026-07-22/23
Origen: reporte de Julia por email (confirma los 3 hallazgos del ensayo) + F4 del
auditor (created_by NULL + duplicado 90508). OK de Juan y auditor: F1+F3+F4 en una
rama; F2 (edicion de suministros) a replanificacion de semana 4.

## F1 — Fecha de inicio NO obligatoria (el flujo real del negocio)
- Asistente: fecha inicio opcional ("si se conoce"); SIN fecha el contrato nace
  EN TRAMITE (adelanta la espec A1); banner informativo en paso 4 y nota en paso 3.
- ContratoForm: superRefine — estado ACTIVO exige fecha de inicio ("dejalo en
  tramite si aun no la sabes"). El flujo de Julia queda: alta sin fecha -> tramite;
  ATR activa -> Editar -> fecha + Activo.

## F3 — Editar/Eliminar desde el detalle del contrato
- ContratoDetailPage: botones Editar (modal ContratoForm + useUpdateContrato) y
  Eliminar (ConfirmDialog + RPC soft_delete via useDeleteContrato, navigate back).
- Era el hueco real: el camino natural (ficha empresa -> pestaña Contratos ->
  detalle) no tenia NINGUNA accion; solo existian en la lista global.

## F4 — Trazabilidad + aviso de duplicado
- created_by: el asistente lo rellena en empresa y contrato (auth.getUser); el
  modal ContratoForm tambien (created_by en alta, updated_by siempre).
- Aviso NO bloqueante de nº contrato duplicado: al pasar del paso 3, si el nº ya
  existe vivo -> banner ambar en paso 4 ("Ya existe N contrato(s) vivo(s) con el
  nº X"). NOTA: el fix de fondo del robo de CUPS del ensayo es la Parte A de la
  espec (cierre automatico del contrato anterior) — este aviso es el puente.

## Docs RAG actualizadas
- ventas/alta-venta-2-minutos.md (fecha opcional + seccion "nace en tramite").
- contratos/gestionar-contratos.md (editar/eliminar desde detalle + regla de estados).

## Guion PowerShell Juan (sin &&; guard de rama)
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/fix-gate-v3-ensayo
git branch --show-current   # DEBE decir claude/fix-gate-v3-ensayo; si no, PARAR
npx tsc --noEmit
npm test
git add src/features/alta-venta src/features/contratos docs/help/ventas/alta-venta-2-minutos.md docs/help/contratos/gestionar-contratos.md
git commit -m "fix(gate-v3): fecha inicio opcional (nace en tramite) + editar/eliminar desde detalle de contrato + created_by y aviso de duplicado"
git push -u origin claude/fix-gate-v3-ensayo
```

## Paseo del auditor (post-merge/deploy)
1. Alta sin fecha de inicio -> paso 3 no bloquea, banner "nacera en tramite",
   contrato en BBDD estado=tramite y created_by=uid de quien lo creo.
2. Editar ese contrato -> poner estado Activo SIN fecha -> el formulario lo impide;
   con fecha -> pasa a activo.
3. Detalle de contrato desde ficha de empresa: Editar cambia un campo; Eliminar
   pide confirmacion y soft-borra (RPC).
4. Alta con nº repetido (p.ej. 90508) -> banner ambar de duplicado en paso 4.
5. Reparacion del duplicado del ensayo: la cuadra el auditor (re-apuntar AQ0F al
   contrato bueno + soft-delete del alta de ensayo) — Cowork verifica el cuadre.

## Gate V3 FORMAL: viernes
Julia da de alta un Nagini real (PDF que le pasa Juan) SIN fecha de inicio -> debe
nacer en tramite sin pelearse con el formulario; segundo ejercicio: encontrar el
PDF que le diga el auditor. Cronometro y veredicto formal.
