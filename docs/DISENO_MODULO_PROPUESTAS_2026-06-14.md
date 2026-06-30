# Diseño · Módulo de Propuestas (de factura/SIPS/Excel → documento de marca)

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork, sesión de diseño — solo `.md`, sin tocar código)
> **Alcance:** diseño del módulo de propuestas como **circuito de datos**, no del generador PPTX (eso ya está cerrado).
> **No duplica:** `DISENO_BASE_PROPUESTA_VALERE.md` (identidad visual + 14 slides LOWFIT) ni
> `PLAN_FASE2_PROPUESTAS_PPTX.md` (arquitectura EF + `cliente.json`). **Los presupone y construye lo que les falta:**
> la entrada de datos, la unificación de la entidad, y los componentes de comparativa que aún no están (maxímetros,
> reactiva, optimización de potencia).
> **No ejecuta nada en Supabase.** SQL = propuestas.

---

## 0. Dónde está el corte

El generador de PPTX está diseñado (Fase 2) y validado contra LOWFIT. Pero produce un documento solo si **le llegan
los datos completos**. Hoy faltan dos cosas para que circule de verdad:

1. **La entrada:** `facturas` está a **0 filas**. El generador no tiene de dónde sacar el consumo por periodo.
   → lo resuelven los puentes Datadis/telemedida/SIPS (docs hermanos) volcando a `facturas`.
2. **La entidad de propuesta está duplicada y vacía:** `proposals` (0) y `propuestas` (0) coexisten. Hay que
   unificar **ahora que ambas están vacías** (coste cero) antes de que tengan datos.

Y faltan **componentes de la comparativa** que el PDF LOWFIT ya muestra pero el motor aún no calcula del todo:
término de potencia con margen, **maxímetros/p95 y optimización de potencia**, y **reactiva**.

```
ENTRADA            ANÁLISIS                 PROPUESTA (entidad)        DOCUMENTO
facturas(origen)   calculateSimulated...    propuestas (unificada)    cliente.json → EF → PPTX
 ↑ Datadis/SIPS/   8 fases + potencia +     persiste resultado +      (diseño LOWFIT ya cerrado)
   telemedida/man. maxímetros + reactiva    snapshot inmutable
```

---

## 1. Unificar la entidad de propuesta (decisión Juan ya tomada: canónica = `propuestas`)

El sprint 7d (decisión Juan 12/06) fija: **unificar en `propuestas`**, migrar las features que usan `proposals`.
Verificado hoy: ambas a 0 filas → migración trivial, sin pérdida de datos.

### 1.1 Modelo objetivo de `propuestas`
```sql
-- PROPUESTA (no ejecutar aquí). Columnas que la propuesta unificada necesita:
-- (verificar las que ya existen en `propuestas` antes de añadir)
ALTER TABLE public.propuestas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'energetica'
    CHECK (tipo IN ('energetica','comercial')),        -- absorbe el doble uso histórico
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id),
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','generada','enviada','vista','aceptada','rechazada','caducada')),
  ADD COLUMN IF NOT EXISTS comparison_results jsonb,     -- snapshot del ranking/matrices (insumo del PPTX)
  ADD COLUMN IF NOT EXISTS cliente_json jsonb,           -- el contrato de datos exacto que se mandó al generador
  ADD COLUMN IF NOT EXISTS pptx_url text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS ahorro_anual_eur numeric,     -- desnormalizado para listados/tracking
  ADD COLUMN IF NOT EXISTS ahorro_pct numeric,
  ADD COLUMN IF NOT EXISTS valida_hasta date,            -- validez de la oferta (recuadro rojo del PDF)
  ADD COLUMN IF NOT EXISTS enviada_at timestamptz,
  ADD COLUMN IF NOT EXISTS vista_at timestamptz;         -- webhook Resend de apertura
```

> **`cliente_json` y `comparison_results` se guardan como snapshot inmutable.** Una propuesta enviada a un cliente
> debe poder regenerarse **idéntica** aunque cambien las ofertas de mercado después. Nunca recalcular una propuesta
> ya enviada: se guarda lo que se mandó. (Lección de credibilidad: el cliente no puede recibir dos PDFs distintos
> con el mismo número de propuesta.)

### 1.2 Migración de features
Las 3 features que apuntan a `proposals` (auditoría: `/analisis` guarda, `/propuestas-energia` lista, `/tracking`)
pasan a `propuestas`. Como `proposals` está a 0 filas, no hay `INSERT ... SELECT`: solo cambiar el nombre de tabla
en `api.ts` de cada feature. Tras verificar, `DROP TABLE proposals` (o dejar como vista de compatibilidad temporal).

### 1.3 Vínculos que la auditoría señaló rotos (datos que no fluyen)
```sql
-- PROPUESTA: cerrar los vínculos del circuito
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS propuesta_id uuid REFERENCES public.propuestas(id),  -- propuesta → contrato
  ADD COLUMN IF NOT EXISTS comercializadora_id uuid REFERENCES public.comercializadoras(id); -- FK, no texto libre
```
Y en la **ficha de empresa**, la pestaña "Propuestas" (hoy placeholder) lista `propuestas WHERE empresa_id = ...`.
Esto resuelve A2/A3 de la auditoría sin tabla nueva.

---

## 2. Contrato `cliente.json` — refinado y completo

`PLAN_FASE2` define la estructura base. Aquí se concreta el **mapeo desde las tablas vivas** y se añaden los bloques
que el diseño LOWFIT necesita y que faltaban:

```jsonc
{
  "cliente":   { /* empresas + contacto decisor (contactos) */ },
  "puntos": [{                                  // por cada cups del grupo
    "cups": "ES...", "tarifa": "3.0TD",
    "potencias_kw": [p1..p6],                   // cups.potencias (3.0TD = 6 — ya corregido)
    "kwh_periodo": [k1..k6],                     // agregado de facturas por periodo (12 meses)
    "kwh_anual_sips": 1243835,                  // referencia SIPS si existe
    "maximetros": { "p_max_kw": .., "p95_kw": .. },  // ← NUEVO, de v_maximetros (telemedida/datadis)
    "reactiva_kvarh": ..,                        // ← NUEVO (componente 6 comparativa)
    "fv": { "tiene": true, "kwp": 100, "autoconsumo_pct": .. }  // del cruce FV (doc FV §4)
  }],
  "opciones": [{                                 // por cada comercializadora_ofertas evaluada
    "nombre": "VISALIA",
    "coste_anual_eur": 152962,                   // FINAL (base + fee ya integrado)
    "eur_mwh_energia": 101.08, "eur_mwh_total": 122.98,
    "precios_periodo_finales": [..],             // matrices 3.0TD / 6.1TD
    "ssaa": { "tipo": "incluidos_cap", "cap_eur_mwh": 12.39 },
    "potencia": { "estrategia": "coste_boe|margen_bajo|margen_alto", "tp_periodo": [..] }, // ← NUEVO (ChatGPT §2.1)
    "condiciones": { "permanencia": .., "preaviso": .., "revision": .. }
  }],
  "optimizacion_potencia": {                     // ← NUEVO bloque (sección PDF obligatoria, ChatGPT §2.3)
    "por_punto": [{
      "cups": "..", "actual_kw": [..], "maximetro_kw": .., "p95_kw": ..,
      "recomendada_kw": [..], "ahorro_anual_eur": .., "riesgo_exceso": "bajo|medio|alto", "confianza": 0.0
    }]
  },
  "modulos": { "ssaa": true, "multi": true, "fv": false, "pot": true, "comp": false, "index": false, "faq": false },
  "fee_interno_eur_mwh": 0,                       // INTERNO. NUNCA aparece en el documento de salida.
  "salida": { "formato": "pptx", "nombre": "Propuesta_<cliente>_<mes>.pptx" }
}
```

> **Regla de fee invisible (QA en CI):** el `fee_interno` se usa solo para calcular precios finales; **nunca viaja al
> render**. Test automático: el contenido del PPTX no contiene `/fee|margen|comisi[oó]n/i` → 0 coincidencias. (Ya en PLAN_FASE2 §5.)

---

## 3. Componentes de comparativa que faltan en el motor (los 8 — ChatGPT §3)

El motor actual (`calculator.ts`, 8 fases) cubre energía, potencia básica, SSAA, fee, excedentes, IEE+IVA. **Faltan**
para que la comparativa sea la completa del PDF:

| # | Componente | Estado motor | Acción |
|---|---|---|---|
| 1 | Energía por periodo P1-P6 | ✅ | — |
| 2 | Potencia por periodo | ⚠️ básico | Añadir **margen de potencia** por oferta (coste_boe vs margen) y `estrategia` |
| 3 | SSAA (incluidos/no/parcial) | ✅ | — (homogeneización 12,39 €/MWh) |
| 4 | Fee Valere configurable interno | ✅ | — (invisible) |
| 5 | Excesos de potencia | ❌ | Derivar de maxímetros vs potencia contratada |
| 6 | **Reactiva** | ❌ | Nuevo: leer `kvarh` de telemedida/factura |
| 7 | Condiciones contractuales | ⚠️ | Estructurar permanencia/preaviso/revisión por oferta |
| 8 | **Optimización de potencia (maxímetros)** | ❌ | Nuevo módulo (§4) — diferenciador comercial |

> Estos son trabajo del **motor de cálculo** (código del agente técnico), no de este documento. Aquí se especifica
> qué debe producir para alimentar `cliente.json`. **Recordatorio de la lección 3.0TD:** cualquier dato regulatorio
> (TP regulado BOE por periodo, IEE, etc.) se verifica contra fuente actual, nunca de memoria.

---

## 4. Módulo de optimización de potencia (el diferenciador — ChatGPT §2)

Sección obligatoria del PDF: **"Análisis del coste de potencia y optimización de potencias contratadas"**.
Insumo: `v_maximetros_mensuales` (de telemedida o, en su defecto, de la curva Datadis). Reglas de negocio:

```
Por cada CUPS:
  maximetro = max(potencia registrada últimos 12m)
  p95       = percentil 95 de la demanda
  recomendada_p = ajuste por periodo respetando p95 + margen de seguridad
  ahorro = (TP_actual − TP_recomendada) anualizado
  REGLAS (ChatGPT §2.2):
    - NO recomendar bajada si hubo excesos recientes (riesgo_exceso='alto')
    - NO recomendar cambio si ahorro < 200 €/año
    - SIEMPRE declarar confianza (según meses de dato) y riesgo
  RD-ley 7/2026 (módulo M-POT): ventana de modificación de potencia sin penalización → si está abierta, destacarlo
```

> Conecta con el módulo Potencias existente (`expedientes`, `solicitudes_potencia`, `savings_calculations` — 41 filas).
> ⚠️ **Atención a la doble verdad:** `savings_calculations` (Potencias) calcula ahorro en paralelo al `calculator`.
> **Una sola fórmula de ahorro de potencia** para todo el CRM. Converger hacia el `calculator`; `savings_calculations`
> queda como histórico o se recalcula con el motor unificado. (Ya señalado en análisis estratégico §2.3.)

---

## 5. Resultado negativo (regla de honestidad — diseño base §3.8)

Si **ninguna** oferta ahorra, el documento NO recomienda sobrecoste. El dictamen pasa a modo "no cambiar / esperar /
complementar con FV / optimizar potencia". Esto **también arregla el bug C2 de la auditoría** (ahorros negativos
presentados en verde como "mejor oferta"): el módulo de propuestas hereda la normalización temporal del análisis
(anualizar por `periodo_dias`) y el sentido/color correcto del ahorro.

---

## 6. Plan de construcción y criterio de "hecho"

| Paso | Entregable | Hecho cuando |
|---|---|---|
| PR-1 | Unificar `propuestas` (columnas + migrar 3 features de `proposals`) + vínculos contrato/empresa | Una sola tabla; ficha empresa muestra sus propuestas; TSC 0 |
| PR-2 | `buildClienteJson(propuesta)` con todos los bloques (§2) + snapshot inmutable | Test: el JSON de un caso real cuadra con el PDF LOWFIT |
| PR-3 | Motor: componentes 2,5,6,7 (margen potencia, excesos, reactiva, condiciones) + tests | Comparativa cubre los 8 componentes |
| PR-4 | Módulo optimización de potencia (§4) + sección PDF | El PDF muestra maxímetro/p95/recomendada/ahorro/riesgo/confianza por CUPS |
| PR-5 | Resultado negativo + normalización temporal (arreglo C2) | Cliente sin ahorro → dictamen "no cambiar", nunca verde engañoso |

(El generador PPTX en sí — EF, bucket, botón — es F2.1-F2.6 de `PLAN_FASE2_PROPUESTAS_PPTX.md`; este módulo lo alimenta.)
Reglas: rama `claude/propuestas-modulo` + PR, TSC 0, tests, ESTADO.md.

---

## 7. Mi opinión honesta y datos que faltan

El módulo de propuestas **es el corazón del producto** y donde el orden importa más:

1. **Primero unificar `propuestas`** (PR-1). Es gratis hoy y carísimo en 3 meses. No tocar nada más de propuestas
   hasta que haya una sola tabla.
2. **El generador PPTX (Fase 2) puede salir ya** con datos pegados a mano, porque el diseño LOWFIT está cerrado y
   validado. No esperéis a Datadis para enseñar el documento: con que el analista pegue un SIPS, ya sale el PPTX.
3. **Los componentes nuevos (maxímetros, reactiva, optimización de potencia) son diferenciadores reales**, pero
   dependen de tener curva horaria (telemedida/Datadis). Hasta entonces, el PDF los marca como "no disponible —
   requiere datos de telemedida/Datadis", no inventa.

El riesgo principal no es técnico: es **construir más comparativa antes de cerrar el circuito básico**. La auditoría
ya avisó. El camino corto a la adopción es: una tabla de propuestas + el PPTX saliendo de `/analisis` con datos SIPS.
Todo lo demás (los 8 componentes completos, maxímetros) enriquece, pero no bloquea la primera demo vendible.

### Datos que me faltan
- **P1:** confirmar las columnas reales actuales de `propuestas` (para que el `ALTER` de §1.1 no choque).
- **P2:** el **logo horizontal oficial** (definido por Juan 12/06) sigue **pendiente de subir** a una carpeta conectada
  para cablearlo en el generador. Sin él, el PPTX sale con el logo redondo incorrecto (hallazgo LOWFIT). Bloquea la calidad del documento.
- **P3:** el cuestionario de módulos (§8 del planteamiento maestro): ¿pantalla en el CRM o se infiere? Propongo inferir
  lo posible y preguntar solo lo ambiguo (mismo patrón ya acordado).
- **P4:** ¿queréis DOCX/PDF además de PPTX como salida secundaria, o PPTX basta para presentar?

---

*Fuentes internas (verificadas en vivo 2026-06-14): Supabase `gtphkowfcuiqbvfkwjxb` (`propuestas` 0, `proposals` 0, `facturas` 0, `comercializadora_ofertas` 29, `savings_calculations` 41). Base de diseño: `DISENO_BASE_PROPUESTA_VALERE.md` (estándar de oro LOWFIT), `PLAN_FASE2_PROPUESTAS_PPTX.md`, `REQUISITOS_CHATGPT_2026-06-12.md` §2-§3, `AUDITORIA_FUNCIONAL_2026-06-10.md` (C1/C2/A2/A3).*
