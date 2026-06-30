# Handoff — Sprint domingo-noche · Fase 2 CIERRE

**Fecha**: 2026-06-12 (domingo noche, sesión autónoma)
**Agente**: Cowork (Claude Opus 4.7)
**Sprint paralelo**: cierre de la Fase 2 del generador de propuestas PPTX
**Documento de referencia**: `docs/FASE_2_CIERRE_2026-06-12.md`

## ✅ Completado

1. **Edge Function `generar-propuesta-pptx` desplegada en producción**
   - Proyecto Supabase: `gtphkowfcuiqbvfkwjxb`
   - ID: `07097299-5013-4993-be0b-670b6b7da59a`
   - Versión: 1 · Estado: **ACTIVE** · `verify_jwt`: true
   - Validación: HTTP 200, 332 KB en ~1 s, PPTX válido con 9 slides en cliente mínimo.

2. **Módulos condicionales completos en la EF**:
   - **FV** (autoconsumo, KPIs kWp y excedentes, tabla por punto)
   - **PPA** (precio €/MWh, plazo, cobertura, ventajas/riesgos)
   - **GAS** (puntos de gas + ranking) y **MULTI GAS** (comparativa por punto)
   - **MULTI ELÉCTRICO** (comparativa por punto eléctrico)
   - **INDEXADO** (análisis del contrato indexado actual + recomendación)
   - Dictamen dinámico que integra todos los módulos activos.

3. **Botón "Generar propuesta PPTX" en `/analisis`**
   - Estados loading/success/error · deshabilitado sin propuesta activa con tooltip.
   - Construye `cliente.json` con `buildClienteJson` desde el análisis vivo.
   - Llama vía `supabase.functions.invoke` (reutiliza JWT de la sesión).
   - Descarga el PPTX como Blob con el nombre que devuelve la EF.

4. **Contrato `ClienteJson` extendido (additive)**:
   - Nuevos campos opcionales: `puntosGas`, `opcionesGas`, `costeActualGasAnualEur`, `ppa`, `indexadoActual`.
   - Nuevos tipos: `TarifaGas`, `PuntoGas`, `OpcionGas`.
   - Auto-derivación de flags (`gas`, `multiGas`, `ppa`, `indexado`) + override manual.
   - **Tests existentes siguen pasando** (todos los cambios son aditivos).

5. **Validación E2E con 3 clientes sintéticos**:
   - **A — GIMNASIO HEALTH (FV)**: 10 slides ✅
   - **B — GRUPO INDUSUR (GAS + ELEC multi)**: 14 slides ✅
   - **C — CADENA SOL (3 puntos + indexado)**: 11 slides ✅
   - Los 3 `.pptx` están en `outputs/` para inspección visual.

## ⚠️ NO se commiteó (sandbox no puede escribir a .git/)

Hay que commitear desde el PowerShell de Juan. Comando sugerido:

```powershell
cd C:\Users\joliv\valere-v2
git status
git add src/core/propuestas/clienteJson.ts src/core/propuestas/buildClienteJson.ts src/features/analisis/AnalisisPage.tsx supabase/functions/generar-propuesta-pptx/index.ts docs/FASE_2_CIERRE_2026-06-12.md .cowork/outbox/2026-06-12T23-50-00-sprint-domingo-fase2-cierre.md
git commit -m "feat(fase2): cierre Fase 2 — modulos condicionales (FV/GAS/PPA/multi/indexado) + boton /analisis + EF desplegada"
git push origin main
```

Nota: la EF ya está en producción. El push solo refleja el código en el repo; **no es necesario re-desplegarla**.

## 🔜 Próximos pasos (pendientes de Juan)

### Inmediato

1. **Subir el logo PNG horizontal "Valere CONSULTORES"** (azul + verde sobre fondo transparente) a `public/logo-valere-horizontal.png` o a un bucket Storage público.
2. Una vez subido, abrir `src/features/analisis/AnalisisPage.tsx` y añadir `logoUrl: '/logo-valere-horizontal.png'` (o la URL pública del Storage) dentro del objeto pasado a `buildClienteJson(...)` en `generarPptx()`.
3. Validar visualmente con un cliente real que el logo aparece en portada y footer.

### Siguiente sprint

- **Storage `propuestas` + columna `proposals.pptx_url`**: persistir el PPTX en bucket privado y guardar la URL firmada (TTL 30 días).
- **`eurMwhEnergia` exacto**: refactorizar `runAnalysis` para devolver desglose energía/potencia y consumirlo en el botón (hoy es aproximado `0,7 × eurMwhTotal`).
- **Selector de modo SSAA por oferta** en AdminPanel (`incluidos_cap | no_incluidos | sin_cap_declarado | coste_real`).
- **UI para capturar PPA** desde el CRM (ahora `cliente.ppa` solo se inyecta programáticamente).
- **Tests Deno de la EF** que validen casos A/B/C.

## 🚫 Restricciones respetadas

- ❌ NO se tocaron `src/features/datos/`, `src/hooks/useDatadis*`, `src/features/dashboard/`, ni ESIOS/precios-mercado.
- ❌ NO se modificaron otras Edge Functions.
- ❌ NO se añadieron migraciones SQL.
- ✅ Lanes disjuntos con los otros 3 sprints paralelos respetados.

## 📂 Ficheros tocados

```
src/core/propuestas/clienteJson.ts                  — additivo
src/core/propuestas/buildClienteJson.ts             — additivo
src/features/analisis/AnalisisPage.tsx              — botón + handler + tipos
supabase/functions/generar-propuesta-pptx/index.ts  — reescrito con módulos condicionales (ya desplegada v1)
docs/FASE_2_CIERRE_2026-06-12.md                    — nuevo, doc maestro del cierre
.cowork/outbox/2026-06-12T23-50-00-sprint-domingo-fase2-cierre.md  — este handoff
```

Sin bloqueos. Fase 2 cerrada; siguiente paso humano es subir el logo y commitear.
