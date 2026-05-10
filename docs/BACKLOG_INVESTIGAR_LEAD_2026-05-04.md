# Backlog — "Investigar lead" semiautomático supervisado

> **Fecha:** 2026-05-04
> **Estado:** ⏸️ BACKLOG (NO implementar ahora)
> **Origen:** propuesta de Juan + dictamen ChatGPT 2026-05-04 — añadir asistente que ayude a Carolina A a recopilar datos de contacto y contexto comercial de una empresa antes/después de crear lead.
> **Razón del aplazamiento:** acabamos de cerrar el sprint Captación y los 2 P0 del primer login real. Pendiente onboarding del equipo y ≥1 semana de uso real antes de añadir features.

---

## Frase guía aplicada

> *El CRM ya puede ejecutar el flujo. Ahora hay que demostrar que el equipo lo puede usar sin volver a WhatsApp, Excel o email suelto.*
> — ChatGPT, dictamen 2026-05-01 + 2026-05-04

Aplica también aquí: **antes de añadir herramienta de investigación, hay que ver si el equipo usa lo básico**. Si Carolina A no llega a usar el flujo (lead → factura → análisis), el "Investigar lead" no resuelve el problema real.

---

## Propuesta validada (cuando llegue el momento)

### Qué SÍ hace el MVP semiautomático

Botón **"Investigar empresa"** en el drawer del lead. Al pulsar, un agente hace:

1. Busca web oficial.
2. Busca teléfono general.
3. Busca email general.
4. Busca formulario de contacto.
5. Busca dirección/sedes públicas.
6. Busca sector/actividad pública.
7. Busca posibles cargos objetivo (responsable de operaciones, director financiero, gerente).
8. Busca indicios energéticos públicos (industria, frío, hornos, FV, sostenibilidad).

Devuelve resultado clasificado:
- **VERIFICADO** (con fuente/URL/fecha)
- **INFERIDO** (con explicación lógica)
- **DESCONOCIDO** (con cómo obtenerlo: factura/Datadis/llamada/contrato/autorización)

Genera además:
- Contacto objetivo recomendado
- Guion breve de llamada
- Email borrador
- Score comercial 0-100 con explicación
- Siguiente acción recomendada

El resultado **se guarda como actividad/nota en timeline**. El usuario decide manualmente qué datos copiar al lead.

### Qué NO hace (reglas estrictas)

- ❌ No inventa datos
- ❌ No crea leads automáticamente
- ❌ No envía emails
- ❌ No llama
- ❌ No modifica datos críticos sin aprobación humana
- ❌ No infiere comercializadora actual
- ❌ No infiere vencimiento contrato
- ❌ No infiere CUPS
- ❌ No infiere precio
- ❌ No infiere consumo exacto
- ❌ No infiere potencia contratada exacta
- ❌ No usa email personal no verificado
- ❌ No hace scraping agresivo
- ❌ No compra bases de datos

---

## Por qué se difiere

1. **Regla "no más features"**: validada por ChatGPT 2026-05-01 y reaplicada ahora.
2. **Riesgo de distracción**: si añado esto ahora, Carolina A juega con el agente en lugar de hacer las primeras 20 llamadas reales.
3. **Datos para diseño futuro**: tras 1 semana de uso real sabremos:
   - ¿Cuántos leads se crean al día sin datos de contacto?
   - ¿Cuánto tiempo dedica Carolina a buscar datos en Google?
   - ¿Qué tipo de datos faltan más?
4. **Regla "primero robustez operativa"**: el flujo end-to-end aún no se ha probado con uso real continuo.

## Pre-requisitos para empezar (cuando se desbloquee)

1. ✅ Smoke 7/7 OK (hecho)
2. ✅ 2 P0 primer uso resueltos (modal scroll + editar lead — hecho)
3. ⏳ Onboarding al equipo enviado
4. ⏳ ≥1 semana de uso real con feedback en `FEEDBACK_USO_REAL.md`
5. ⏳ ≥3 entradas de feedback que mencionen "no encuentro contacto" o "tardo mucho buscando datos"
6. ⏳ Decisión Juan: ¿este es el siguiente sprint o hay otra fricción más urgente?

---

## Diseño técnico cuando se desbloquee

### Frontend

- Botón **"Investigar empresa"** en cabecera del drawer (junto a "Editar"), solo visible para `telemarketing` y `admin`.
- Modal de resultado con secciones colapsables: Verificado / Inferido / Desconocido / Contactos / Guion / Email borrador / Score.
- Botón "Copiar al lead" por sección con vista previa antes de aplicar.
- Botón "Guardar como nota" → registra todo el resultado en timeline.

### Backend

- Edge Function nueva `investigar-lead` (tipo `ask-crm-docs` actual):
  - Input: `oportunidad_id` + `empresa_nombre` + opcional `web` y `ubicacion`
  - Llama a Gemini con prompt estricto + tool de web search
  - Devuelve JSON con la estructura validada
- Sin tabla nueva al principio: registrar en `actividades.descripcion` como JSON.
- Si el uso real lo justifica, crear `lead_investigacion` table con campos del prompt.

### Prompt del agente (validado con ChatGPT)

```
Investiga esta empresa para Valere Consultores.

Empresa: {{empresa}}
Ubicación opcional: {{ubicacion}}
Sector opcional: {{sector}}

Devuelve SOLO información clasificada como:

1. DATOS VERIFICADOS
Incluye fuente y URL.

2. DATOS INFERIDOS
Explica la lógica. No afirmes como hecho.

3. DATOS DESCONOCIDOS
Incluye cómo obtenerlos: factura, Datadis, llamada,
contrato o autorización.

Nunca inventes:
- comercializadora
- vencimiento
- CUPS
- precio
- consumo exacto
- responsable personal
- email personal

Genera:
- contacto objetivo recomendado
- teléfono/email general si existen
- guion de llamada
- email borrador
- score 0-100
- siguiente acción comercial
```

---

## Estimación cuando llegue el momento

| Bloque | Esfuerzo |
|---|---|
| Edge Function `investigar-lead` con prompt + tool search | 3-4h |
| Frontend modal + botón en drawer | 2-3h |
| Tests unitarios + smoke | 1h |
| Doc help/ + ajustes asistente RAG | 30 min |

**Total**: ~7-9h (1 sprint corto).

---

## Decisión

Documentado y diferido. Cuando llegue el momento:
1. Revisar `FEEDBACK_USO_REAL.md` — ¿hay 3+ entradas pidiendo esto?
2. Confirmar con Juan: ¿prioridad ahora o hay otra fricción?
3. Si SÍ → sprint dedicado siguiendo el diseño de arriba.
4. Si NO → seguir esperando.

---

## Frase guía actualizada

> *Antes de añadir herramienta de investigación, hay que ver si el equipo llega a usar lo básico. La feature más útil del mundo no sirve si quien la necesita no entra al sistema.*

---

## Anexo — Prompt completo "Agente de Prospección Energética B2B Valere"

**Origen:** ChatGPT 2026-05-04, generado a petición de Juan tras conversación sobre necesidad de investigación de leads.

**Estado:** referencia técnica completa para CUANDO se construya. **NO usar tal cual ni siquiera entonces** — ChatGPT mismo recomendó en el dictamen anterior empezar por MVP semiautomático supervisado, no agente autónomo. Este prompt sirve como visión completa y reglas energéticas; el MVP solo implementaría el subset de "investigación supervisada" descrito arriba.

**Reglas energéticas que SÍ se mantienen del prompt** (correctas y aplicables al MVP):
- Clasificación VERIFICADO / INFERIDO / DESCONOCIDO con fuente.
- Tarifas eléctricas TD: 2.0TD (≤15kW BT), 3.0TD (>15kW BT), 6.1TD (1kV-30kV), 6.2TD+ (>30kV o gran industria).
- Peajes gas RL: RL.4 (50-300 MWh/año), RL.5 (300-1.500), RL.6 (1.500-5.000), RL.7 (5.000-15.000), RL.8 (15.000-50.000).
- Datos prohibidos sin fuente: comercializadora, vencimiento, CUPS, precio, consumo exacto, potencia exacta, email/teléfono personal sin verificar.
- Tono email Valere: directo, sin frases vacías ("líderes en soluciones innovadoras"), argumentos concretos (revisión contratos, optimización potencias, FV, descarbonización).

**Lo que NO se debe implementar del prompt (al menos no en el MVP)**:
- Tablas BD nuevas para `informacion_energetica`, `lead_investigacion` con 30+ campos.
- Auto-creación de leads sin aprobación humana.
- Estados de lead nuevos ("Investigado", "Pendiente de validar") — usar `etapa_operativa` existente.
- Generación automática de actividad sin acción explícita del user.
- Integración con LinkedIn / mensajería externa.

**Implementación recomendada del MVP** (cuando se desbloquee):

1. Edge Function `investigar-lead` (1 endpoint)
2. Botón "Investigar empresa" en drawer (visible a telemarketing/admin)
3. Resultado se guarda como **una sola fila en `actividades`** con:
   - `tipo = 'nota'`
   - `titulo = 'Investigación: [nombre empresa]'`
   - `descripcion = JSON.stringify(resultado)` con la estructura de salida del prompt
   - `metadata` (si añadimos columna) con `score`, `prioridad`, `fuentes`
4. Modal de visualización del resultado con secciones colapsables.
5. Botones "Copiar al lead" por sección — el usuario decide qué se copia.

**Estimación con este alcance**: ~7-9h. (vs. 1-2 semanas del agente completo del prompt monstruo).

### Prompt completo de referencia (NO ejecutar ahora)

[Pegar aquí el prompt completo de ChatGPT cuando llegue el momento — está en el chat de Juan-Cowork del 2026-05-04. Resumen: 20 secciones cubriendo objetivo, principio antialucinación, fuentes, datos por bloque, reglas energéticas TD/RL, contactos objetivo, scoring, salida estructurada, integración CRM (5 tablas), reglas de actualización, autonomía permitida, estados lead, fiabilidad dato, protección errores, ejemplo Ebro Foods, email generado, requisitos técnicos, entregables, criterios éxito.]

**Nombre propuesto del producto** (cuando exista): "Agente de Prospección Energética B2B Valere".
