# Bloque 1 Módulo Tarifas y Propuestas — APROBADO por ChatGPT (v1.1)

**Fecha:** 2026-05-27 (actualizado tras análisis de formatos y aprobación de ChatGPT)
**Para:** próxima sesión de Cowork / Claude Code / Juan

## Qué dejamos hecho (v1.1)

Bloque 1 del módulo Tarifas y Propuestas cerrado y **APROBADO POR CHATGPT** con 3 matices integrados. Tres documentos en `docs/`:

- `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md` — inventario veraz del repo (12 secciones).
- `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` — **v1.1**, 15 secciones (8 fases técnicas + 2 negocio + §14 matices ChatGPT + §15 commit ajustado).
- `docs/ANALISIS_FORMATOS_TARIFAS.md` — **NUEVO**: análisis de 8 archivos reales de la carpeta Drive `TARIFAS_VIGENTES`. Modifica el alcance de Fase 1.

`docs/ESTADO.md` y `docs/SESIONES/2026-05-27-resumen.md` actualizados con el addendum.

## Hallazgo crítico del análisis de formatos

El esquema actual de `comercializadora_ofertas` es **insuficiente** para la realidad. Pasamos de 6 migraciones SQL planificadas a 8 (~25 columnas nuevas + 2 sub-tablas: PyS + precios mensuales gas). Razones (resumen — detalle en `ANALISIS_FORMATOS_TARIFAS.md`):

- 3 unidades distintas de potencia (€/kW·año, día, mes).
- Multi-zona (Península/Baleares/Canarias/CeutaMelilla/ExtraPeninsular).
- Vigencias múltiples por producto.
- Precios mes a mes para gas.
- Descuentos no normalizables a campo numérico.
- PyS (catálogo paralelo de servicios opcionales).
- Visalia = PDF imagen (sólo Gemini visual lo lee).
- Variantes por umbral de potencia P1.
- Conceptos: telemedida, promo/no-promo, eventual/temporal, sin SSAA/CAD, etc.

## Matices de ChatGPT integrados en §14 del PLAN

1. **Verificar SQL fase 28.6** antes de re-ejecutar (puede estar ya aplicado).
2. **Refactor casteo JSONB→numeric[]** en RPC con `jsonb_array_elements_text(...) with ordinality`.
3. **Declarar `status_v2` como temporal** con plan de consolidación posterior.

## Hallazgo clave (TENERLO PRESENTE)

**El módulo está al ~70% ya construido.** No partimos de cero. El delta real son:
1. Capa ingesta (`tariffs-ingest` Edge Function + tabla `tariff_documents`)
2. Capa extracción IA (`tariffs-extract` Edge Function + tabla `tariff_extractions`)
3. Versionado de ofertas (extensión `comercializadora_ofertas` + RPC `publish_oferta_with_versioning`)
4. Bandeja "Tarifas pendientes" (nuevo tab en `AdminPage`)
5. Generador PDF (Fase 5, bloqueado por NEG-B)
6. Email aprobación (Fase 6)
7. Logo comercializadora (campo `logo_url` no existe)

## Trampa de nomenclatura — IMPORTANTE

`src/core/types/database_canonical_2026-04-26.ts` muestra `retailers/retailer_offers` (nombres antiguos). Las tablas reales en BD y todo el código vivo usan **`comercializadoras/comercializadora_ofertas` (en español)**. Cualquier código o doc nuevo del módulo debe usar los nombres en español.

## Qué tiene que hacer Juan ANTES de continuar

### Aprobación
~~Pendiente~~. ✅ ChatGPT ya aprobó con 3 matices que están en §14 del PLAN. Juan puede arrancar Fase 0 directamente.

### Fase 0 — Saneamiento (Juan en PowerShell)

**Paso 0a — Commit del Bloque 1 (sin migraciones SQL todavía)**
```powershell
cd C:\Users\joliv\valere-v2

git add docs/ESTADO.md `
        docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md `
        docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md `
        docs/ANALISIS_FORMATOS_TARIFAS.md `
        docs/SESIONES/2026-05-27-resumen.md `
        .cowork/outbox/2026-05-27T23-00-00-modulo-tarifas-bloque1-listo.md

git status   # verificar que solo estos 6 archivos están stageados
git commit -m "docs(tarifas): bloque 1 modulo tarifas y propuestas v1.1 (auditoria + plan + analisis formatos + matices ChatGPT)"
git push origin main
```

**Paso 0b — Saneamiento Fase 0**
```powershell
cd C:\Users\joliv\valere-v2

# 1) Verificar commits locales sincronizados
git status
git log origin/main..main --oneline   # debe estar vacío tras paso 0a

# 2) Crear rama de trabajo del módulo
git checkout -b claude/modulo-tarifas-propuestas

# 3) Verificar TSC + tests verdes
npx tsc --noEmit
npm test -- --run

# 4) Regenerar tipos Supabase (necesita Supabase CLI)
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts

# 5) Verificar de nuevo
npx tsc --noEmit
npm test -- --run

# 6) Push rama
git push -u origin claude/modulo-tarifas-propuestas
```

**Paso 0c — SQL fase 28.6** (en Supabase Dashboard, SQL editor):

⚠️ ChatGPT señala posible contradicción: puede estar ya aplicado. **Verificar PRIMERO** con:
```sql
select polname, schemaname, tablename
  from pg_policies
 where polname ilike '%fase28%' or polname ilike '%cleanup%';
```
- Si aparece algo del 28.6 → **NO ejecutar**, marcar como aplicado en ESTADO.md.
- Si no aparece → ejecutar `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql`.

### Material no técnico que Juan debe reunir en paralelo

**Bloquea Fase 3 (NEG-A AMPLIADO tras análisis de formatos):**
- ✅ PDFs/Excels reales en `TARIFAS_VIGENTES` (ya están).
- ⏳ **Renombrar archivos genéricos** (`Tarifas Resumen.pdf`, `Tarifas marzo 2026.pdf`, `Tarifas Preciario agentes.xlsx`, etc.) añadiendo la comercializadora al nombre.
- ⏳ **Catálogo de productos canónicos** por comercializadora, especialmente MET (BASE/METROPOLI 1/2/3/METRIX 1/2/3) e Iberdrola (50+ productos). Estructura: 1 comercializadora → N familias → M variantes.
- ⏳ **Confirmar el manejo de Visalia**: ¿hay canal alternativo (CRM, Excel descargable) o dependemos del PDF imagen + Gemini visual?
- ⏳ **2-3 emails con tarifa en el cuerpo** (no encontrado en la carpeta — sólo PDFs y Excels). Sin estos, el prompt para procesar cuerpo de email no se calibra.

**Bloquea Fase 5 (NEG-B):**
- Logo Valere alta resolución (PNG + SVG)
- Colores corporativos (hex)
- Tipografía oficial
- Propuesta de referencia que le guste a Juan

## Qué tiene que hacer la próxima Cowork (cuando Juan vuelva)

**Si Juan vuelve con Fase 0 hecha y ejemplos de NEG-A:**
Preparar **briefing concreto para Claude Code** con las 6 migraciones SQL aditivas listas para crear archivos, usando:
- Fecha real del día como prefijo (`YYYYMMDD_modulo_tarifas_*.sql`).
- Nombres de tabla en español (`comercializadoras`, `comercializadora_ofertas`).
- Mensaje commit pre-redactado (§9 del PLAN).
- Verificaciones pre-commit obligatorias.

**Si Juan vuelve sin haber hecho Fase 0:**
Recordarle el orden estricto. No preparar briefing de Fase 1 hasta que `git status` esté limpio y tipos regenerados.

**Si Juan trae feedback de ChatGPT que pide ajustes al PLAN:**
Iterar AUDITORIA/PLAN antes de tocar nada. La Fase 0 NO arranca hasta que ambos docs estén aprobados.

## Riesgos a vigilar

1. **El sandbox de Cowork (Linux mount) NO puede hacer `git push` ni borrar archivos en valere-v2.** Cualquier commit/push lo ejecuta Juan en PowerShell. Cowork solo prepara los archivos.
2. **NO mezclar `calculateInvoiceEstimate` con `calculateSimulatedInvoice`.** Son motores distintos para usos distintos (ver §3 AUDITORIA).
3. **NO renombrar `comercializadora_ofertas` a inglés "para limpiar".** El código vivo usa español; renombrar rompería el comparador.
4. **Las migraciones de Fase 1 son TODAS aditivas** (ADD COLUMN). Cualquier ALTER/RENAME requiere replantearse antes.
5. **`gemini-2.0-flash-exp` del chat-consultor puede no leer PDFs nativo.** Verificar al implementar `tariffs-extract` si conviene `gemini-2.5-flash-lite` o equivalente.

## Tests y CI

- TSC debe estar a 0 errores antes de cualquier commit (regla del repo).
- 39/39 tests deben pasar (regla del repo).
- CI en GitHub Actions (`.github/workflows/`) — verificar que sigue verde tras la regeneración de tipos.

## Cómo enlazar este mensaje con el siguiente paso

Cuando próxima Cowork lea este outbox, debe:
1. `cat .cowork/inbox/2026-05-27T23-00-00-modulo-tarifas-bloque1-listo.md` (este archivo, movido por Juan o por bus).
2. Leer `docs/ESTADO.md` para confirmar estado.
3. Leer `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` para tener el plan en contexto.
4. Preguntar a Juan: "¿Has hecho Fase 0?" — si no, ese es el bloqueo.

Sin Fase 0 hecha, **no avanzamos**.
