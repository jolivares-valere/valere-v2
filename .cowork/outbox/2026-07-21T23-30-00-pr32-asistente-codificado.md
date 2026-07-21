# Cierre PR-3.2 (codificado) — asistente de alta en 4 pasos — 2026-07-21 (noche)

## Contexto
PR-3.1 MERGEADO (#78) + PASEO DEL AUDITOR: PASA (1/3 semana 3, acta en Drive).

## PR-3.2 CODIFICADO (pendiente tsc+tests+commits Juan + paseo)
Nueva feature src/features/alta-venta/:
- periodos.ts + periodos.test.ts (+4 tests): regla 2.0TD = 2 potencias + 3 energias,
  resto 6+6; tolerante a mayusculas/espacios; desconocida/null -> 6+6.
  Leccion BLUENET aplicada: periodos que no aplican -> NULL, nunca 0.
- api.ts: useBuscarEmpresas (nombre/NIF, limit 8), useCupsDeEmpresa,
  useComisionaRenovacion (lee comercializadora_condiciones; null si no hay dictadas),
  useCreateEmpresaMin, useCreateCups, useCreateContratoAsistente,
  useCreateRenovacionAsistente, vincularCupsAContrato (contrato_id + comercializadora_actual).
- AltaVentaPage.tsx: wizard 4 pasos con barra de progreso.
  P1 empresa: buscador con sugerencias o alta minima (nombre/NIF/ciudad).
  P2 CUPS: lista de CUPS vivos de la empresa o alta nueva (validacion formato ES+16+letras).
  P3 contrato ADAPTATIVO: selector catalogo PR-3.1 (cero texto libre), tipo precio,
  fechas; si CUPS nuevo, inputs de potencias/energias SEGUN TARIFA (2/3 o 6/6).
  P4 renovacion: prioridad estimada por dias (calcPrioridad PR-1.3) EDITABLE
  (la prioridad es de negocio, leccion #77); sin fecha fin -> bandeja "Sin fecha"
  con default alta; AVISO ambar si la comercializadora no comisiona renovacion
  (Naturgy/Endesa/Plenitude — doc REGLAS v2).
  Orquestacion resiliente: ids creados se guardan en estado -> reintento NO duplica.
  Pantalla final con enlaces a ficha/contrato/pipeline.
- Wiring: ruta /alta-venta + menu "Nueva venta" (PlusCircle, encima de Empresas) +
  permiso asesor_senior.
- Doc RAG: docs/help/ventas/alta-venta-2-minutos.md.

## Guion PowerShell Juan (sin &&; guard de rama)
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/pr-3-2-asistente-alta-venta
git branch --show-current   # DEBE decir claude/pr-3-2-asistente-alta-venta; si no, PARAR
npx tsc --noEmit
npm test
git add src/features/alta-venta src/App.tsx src/components/layout/Sidebar.tsx src/core/auth/permissions.ts docs/help/ventas
git commit -m "feat(pr3.2): asistente de alta en 4 pasos - empresa, CUPS, contrato adaptativo por tarifa y renovacion autogenerada"
git push -u origin claude/pr-3-2-asistente-alta-venta
```

## Guion de paseo del auditor (referencia dictada de antemano)
1. /alta-venta con CUPS nuevo tarifa 2.0TD -> el paso 3 pinta EXACTAMENTE 2 potencias + 3 energias.
2. Cambiar a 3.0TD -> pasa a 6+6. Verificar en BBDD que P4-P6 de un alta 2.0TD son NULL (no 0).
3. ALTA REAL NAGINI (primera de las 7 via Zoco): cronometrar <2 min; renovacion aparece
   en /renovaciones con la prioridad elegida; CUPS vinculado al contrato.
4. Alta con comercializadora NATURGY -> aviso "no comisiona renovacion" en paso 4.
5. Reintento: cortar a mitad (p.ej. sin fecha inicio en paso 3 no deja avanzar) y
   verificar que un fallo simulado no duplica empresa/CUPS al reintentar.
6. CA del gate V3: Julia o Antonio completan el flujo sin ayuda.

## Pendientes
- PR-3.3 documentos (bucket Storage RLS is_staff + PDF desde ficha).
- Gate V3 viernes. Pendientes de datos que no caducan: sin cambios.
