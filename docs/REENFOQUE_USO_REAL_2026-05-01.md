# Reenfoque pre-producto: MVP de validación + simulación de uso real (1 mayo 2026)

> Tras tercera respuesta de ChatGPT al handoff, el diagnóstico estratégico cambia. No es problema de adopción — es producto en construcción con datos heredados. Pero el riesgo real es **diseñar sin datos de uso**. Este documento aterriza la estrategia corregida: MVP en 3-5 días, simulación 1 semana, decisiones post-simulación.

---

## 1. El reenfoque que ChatGPT corrige (y acepto)

### Diagnóstico corregido

**Lo que decíamos antes:** "el equipo no usa el CRM, hay que forzar adopción".

**Lo que es cierto:** el CRM **está en construcción con datos heredados**. La cartera vacía (1 contacto, 4 oportunidades, 0 incidencias) **no es síntoma de adopción fallida**, es **estado natural de pre-producto**.

**Implicación**: el plan de "Sprint adopción interna" pierde sentido. No hay nada que adoptar todavía. **Hay que validar antes de construir más**.

### El riesgo real (que sí persiste)

> *"Estás diseñando el CRM SIN datos reales de uso."*

Esta afirmación es la que tomo en serio. El proyecto tiene:
- 63 tablas
- 8 Edge Functions
- Pipeline RAG
- Cron jobs
- 24 features

...pero NO tiene validado el flujo más básico:

> Carolina llama → genera propuesta → cliente firma → Valere factura.

Estamos haciendo arquitectura de producto maduro **sin haber probado el caso de uso primario**.

### El orden correcto (que estaba invertido)

ChatGPT lo formula limpio:

```
ORDEN CORRECTO:
  1. Flujo comercial básico (humano)
  2. Datos (Datadis, contratos, etc.)
  3. Automatización
  4. Optimización

ORDEN ACTUAL DE VALERE:
  2 (Datadis, Potencias, FV) → 3 (cron, automatizaciones) → 1 (flujo Carolina)
```

Es defendible que datos (2) fuera primero porque **es lo que diferencia a Valere de un CRM genérico**. Pero la conclusión sigue siendo válida: **la fase 1 (flujo humano) ha quedado relegada y hay que sacarla adelante ya**.

### La regla nueva

> *Diseña → prueba → corrige → repite.*

Operativizada para Valere:
- Diseño: 20% del tiempo.
- Uso real: 60%.
- Corrección guiada por uso: 20%.

Esto reemplaza la regla anterior "70% nueva funcionalidad / 30% depuración". La depuración sigue siendo importante pero **se mete en el 20% de corrección post-uso**.

---

## 2. Donde matizo a ChatGPT

### "Release 1 en 3 días" es demasiado optimista

ChatGPT propuso "redefinir Release 1 en 3 días en lugar de 11". Discrepo en la formulación pero **no en el espíritu**.

**El espíritu correcto**: en 3-5 días, lo MÍNIMO que Carolina necesita para registrar llamadas, contactos, propuestas y outcomes. Sin PDF, sin email auto, sin compliance complejo. Solo el esqueleto usable.

**Lo que NO cabe en 3-5 días**: el Release 1 completo de 11 días (PDF diagnóstico, plantilla email, compliance LOPDGDD pulido, lead scoring, motivos de pérdida estructurados, dashboard).

**La propuesta correcta**:
- **3-5 días** → MVP usable mínimo.
- **1 semana de uso real** → Carolina trabaja con el MVP, observamos.
- **4-6 días post-simulación** → completar Release 1 SOLO con lo que Carolina demanda.

Total: **12-15 días con validación intermedia** vs 11 días "a ciegas" del plan original. La diferencia es que ahora **construimos con confianza, no por suposición**.

### "Estado natural de pre-producto" no es excusa para no validar

ChatGPT dice "no es fallo, es estado natural". Es cierto técnicamente. Pero **estratégicamente sigue siendo problema**: cada día que pasa sin validar uso real es un día más de arquitectura sin contraste.

El reenfoque no es "tranquilo, está bien estar vacío". Es: **"está bien estar vacío AHORA, pero hay que llenarlo con uso real YA"**.

---

## 3. MVP de captación — alcance mínimo viable (3-5 días)

### Lo que entra

```
✓ Pantalla /captacion lista priorizada (sin scoring, solo orden manual + filtro estado)
✓ Ficha de llamada activa (datos, notas, outcome)
✓ Outcomes con motivos de pérdida (catálogo cerrado, sin profundidad)
✓ Botón "tel:" para marcar (sin CTI)
✓ Alta empresa+contacto+oportunidad desde 1 form simple
✓ Schema mínimo (origen_canal, motivos_perdida, no_llamar)
✓ Aviso LOPDGDD básico en primer contacto (sin auditoría sofisticada)
```

### Lo que NO entra (pero está en Release 1 completo)

```
✗ PDF diagnóstico inicial          → solo si Carolina lo pide tras simulación
✗ Plantilla email + Gmail draft    → solo si Carolina lo pide
✗ Compliance LOPDGDD profundo      → básico inicialmente, profundo si Carolina llega lejos
✗ Lead scoring (HOT/WARM/COLD)     → no en MVP, puede ser priorización manual
✗ Dashboard supervisor (Juan)      → no en MVP
✗ Cadencias y próxima acción auto  → no en MVP
✗ Tracking apertura email          → nunca antes de Release 3
✗ Vista materializada lead_scoring → no en MVP
```

### Schema mínimo MVP (1 día)

```sql
-- Mínimo para MVP captación
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS origen_canal text CHECK (origen_canal IN (
    'telemarketing','comercial','cartera','referido','einforma','axesor',
    'web','feria','partner','otro'
  )),
  ADD COLUMN IF NOT EXISTS no_llamar boolean NOT NULL DEFAULT false;

-- Motivos de pérdida estructurados (solo el ENUM, sin auditoría compleja)
DO $$ BEGIN
  CREATE TYPE public.motivo_perdida AS ENUM (
    'no_contesta','buzon_repetido','numero_erroneo','no_es_decisor',
    'decisor_no_disponible','ya_tiene_consultor','acaba_de_renovar',
    'satisfecho_comercializadora','no_quiere_mover','no_envia_factura',
    'no_autoriza_datadis','precio_insuficiente','contrato_con_penalizacion',
    'empresa_fuera_perfil','insolvente','cierre_empresa','lista_robinson',
    'rgpd_eliminacion','sector_excluido','geografia_excluida','otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS motivo_perdida_codigo public.motivo_perdida,
  ADD COLUMN IF NOT EXISTS motivo_perdida_detalle text;
```

**Sin tabla `auditoria_contacto_comercial` todavía** — la añadimos en R1 final si Carolina llega a tener volumen real. Mientras tanto, el aviso LOPDGDD se da verbalmente y se anota en el campo `notas` de la actividad.

### Cronograma MVP (3-5 días)

| Día | Tarea | Coste |
|---|---|---|
| 1 | Schema MVP (migration + cierre Sprint A pendiente) | 1d |
| 2 | UI lista `/captacion` simple + atajos teclado básicos | 1d |
| 3 | UI ficha llamada activa + outcomes + alta unificada | 1d |
| 4 | QA + ajustes finos + sesión inicial con Carolina | 1d |
| 5 (buffer) | Imprevistos / fix bugs detectados sesión 4 | 1d |

**Outcome día 5**: Carolina puede entrar al CRM mañana siguiente y trabajar.

---

## 4. Simulación de uso real — 1 semana

### Setup

- Carolina trabaja con el MVP **5 días laborables**.
- Usa sus leads habituales (los que ya tiene en su Excel actual).
- **No le pedimos** que registre todas las llamadas en CRM (es arena movediza). Le pedimos que **intente** y si algo le frena, lo skipea y nos lo cuenta.
- Juan / Cowork / Code observan **sin intervenir** (NO arreglar a mitad de jornada — anotar y arreglar al final del día).
- Llamada/sesión diaria 15 min al final del día con Carolina.

### Métricas que recogemos durante la simulación

**Métricas de uso (qué hace en el CRM):**
- Llamadas registradas/día.
- Empresas creadas/día.
- Contactos creados/día.
- Oportunidades creadas/día.
- Outcomes registrados/día.
- Tiempo medio en cerrar una llamada (desde que empieza la ficha hasta "guardar y siguiente").

**Métricas de fricción (lo que NO hace):**
- Llamadas hechas pero NO registradas en CRM (preguntar a Carolina al final del día).
- Campos que deja vacíos sistemáticamente.
- Outcomes que selecciona "otro" en lugar del valor estructurado.
- Pantallas a las que entra pero nunca completa.

**Métricas cualitativas (qué siente):**
- 1-5: ¿es más rápido que tu Excel anterior?
- 1-5: ¿la pantalla te bloquea o te ayuda?
- ¿Qué te falta para hacerlo el doble de rápido?
- ¿Qué te sobra de lo que pusimos?

**Métricas de output (lo que importa al final):**
- Propuestas enviadas al cliente esta semana.
- Tiempo medio llamada → propuesta.
- Conversaciones útiles vs llamadas totales.

### Lo que NO medimos (anti-vigilancia)

- Tiempo entre llamadas.
- Pausas.
- Productividad minuto a minuto.
- Comparativa con compañeros.

ChatGPT y mi propio análisis previo coinciden: **medir input minuto a minuto destruye la confianza y el experimento**. Output sí, input agregado sí, vigilancia no.

---

## 5. Decisiones post-simulación

Tras los 5 días de simulación, sesión de revisión 1-2h con Juan + Carolina + Cowork. Decisiones a tomar:

### Decisión 1 — ¿Carolina puede trabajar con esto 8h/día?

Si SÍ:
- Avanzar al **Release 1 final** (4-6 días más) añadiendo SOLO lo que pidió en simulación.

Si NO:
- Iterar el MVP otra semana hasta que SÍ.
- No pasar a Release 1 final.

### Decisión 2 — ¿Qué partes del Release 1 original necesita?

Lista cerrada de candidatos a añadir post-simulación, priorizados según demanda real:

- A. PDF diagnóstico inicial.
- B. Plantilla email (Gmail draft).
- C. Lead scoring HOT/WARM/COLD.
- D. Dashboard supervisor para Juan.
- E. Compliance LOPDGDD profundo (auditoría tabla).
- F. Cadencias semi-automáticas (sugerir próxima acción).
- G. Tracking apertura email.

**Solo se construyen las que Carolina pida activamente o las que el equipo identifique como bloqueantes**.

### Decisión 3 — ¿Hay flujos rotos no previstos?

Posibles descubrimientos durante simulación:
- "El CRM no me deja escalar a otro contacto" → necesidad nueva.
- "No sé dónde apuntar las llamadas que nadie coge" → outcome `intento_fallido` que no estaba.
- "Tengo que copiar/pegar entre pestañas" → caso de uso no contemplado.

Estos descubrimientos se priorizan por encima del backlog Release 1.

### Decisión 4 — ¿Qué fases del roadmap general se ajustan?

Según resultados:

- **Si MVP es viable**: roadmap sigue, Release 1 final se ajusta.
- **Si MVP necesita iteración**: FASE 31-33 retrasan 1-2 semanas.
- **Si MVP es radicalmente distinto a lo planeado**: replantear todo el módulo `/captacion` y aprovechar lo aprendido para el resto del producto.

---

## 6. Cómo afecta esto al roadmap general

### Lo que se mantiene

- **FASE 30 (Sprint A)**: cerrar pendientes 30.2 / 30.3 / 30.7 / 30.9 según estaba.
- **FASE 31-32-33** después del MVP + simulación + R1 final.
- **Auditoría profesional sectorial**: válida como visión a 6-12 meses.

### Lo que se pospone

- **Release 1 completo de 11 días**: NO se construye a ciegas. Se construye en 2 partes con simulación intermedia.
- **FASE 41 modo diagnóstico** (idea ChatGPT): solo si Carolina lo pide tras simulación.
- **Sentry DSN real**: hasta tener tráfico real.

### Lo que se añade

- **Bloque MVP + Simulación**: nuevo concepto, ~10 días total (5 MVP + 5 simulación).
- **Regla "diseña → prueba → corrige → repite"** sustituye a la regla 70/30 anterior (que se subsume).

### Cronograma ajustado próximas 4 semanas

```
Semana 1
  L-M    Cierre TSC + commit Sprint A + decisiones 30.2/30.3 (saneamiento, ya en plan)
  X-V    Construcción MVP captación (3 días core)

Semana 2
  L-V    Simulación uso real Carolina + observación sin intervenir

Semana 3
  L      Sesión revisión + decisiones post-simulación
  M-V    Release 1 final (subset que Carolina pidió, ~4 días)

Semana 4
  L-V    Sprint B (FASE 31 modelo energético) o pivot según aprendizajes
```

Total: ~3-4 semanas hasta tener Release 1 validado por uso real.

---

## 7. Compromisos del equipo durante simulación

### Juan
- Asignar a Carolina horas concretas con CRM (mínimo 2-3h/día).
- No pedir métricas de input minuto a minuto.
- Sesión 15 min final del día con Carolina.
- Escribir 5 líneas resumen al final del día en `docs/SESIONES/SIMULACION_CAROLINA_DIA_X.md`.

### Carolina
- Usar el CRM con honestidad: si bloquea, dejarlo y avisar.
- No "salvar la herramienta" — su trabajo es vender, no validar el CRM.
- Anotar en sticky notes / móvil lo que le frena en el momento.

### Cowork (yo, próximas sesiones)
- NO construir features adicionales durante la simulación.
- NO arreglar bugs reportados a mitad del día (esperar al cierre del día).
- Sí estar disponible para preguntas técnicas.
- Recopilar feedback en `docs/SIMULACION_CAROLINA_FEEDBACK.md` cada noche.

### Code (PowerShell)
- Cerrar TSC sprint Potencias antes del MVP (pre-requisito).
- Aplicar las migrations del MVP cuando Cowork las tenga listas.
- Disponible para hot-fix si hay error bloqueante 24h.

---

## 8. Criterios de éxito de la simulación

La simulación es exitosa si **al menos 3 de estos 5 KPIs** se cumplen al final de la semana:

| KPI | Threshold éxito |
|---|---|
| Carolina logra 4+ horas continuas con CRM 1 día concreto | sí/no |
| Tiempo medio cerrar llamada en CRM | < 60 segundos |
| Llamadas registradas en CRM / llamadas reales hechas | ≥ 50% |
| Carolina dice cualitativamente "es mejor que mi Excel" | sí/no |
| Al menos 1 propuesta enviada que provenga del CRM | sí/no |

Si 3+ se cumplen → Release 1 final adelante.
Si 2 se cumplen → iterar MVP otra semana.
Si <2 se cumplen → replantear desde cero el módulo `/captacion`.

---

## 9. Riesgos de este plan

### Riesgo 1: Carolina no quiere participar

Probabilidad: media. Si Carolina considera que el CRM le hace ir más lento que su Excel, abandonará el experimento.

**Mitigación**: pedirle que la primera mañana solo registre 5 llamadas. No 50. Que sienta el flow sin presión. Si el flow es bueno, irá adoptando más.

### Riesgo 2: la simulación detecta que el modelo de datos es incorrecto

Probabilidad: alta. Es bastante posible que descubramos que (por ejemplo) "oportunidad" no es la unidad mental de Carolina, sino "lead" + "propuesta" como dos cosas distintas.

**Mitigación**: si esto pasa, MEJOR descubrirlo ahora que tras gastar 11 días en Release 1 completo. **Es exactamente para esto la simulación**.

### Riesgo 3: descubrimientos no encajan con el resto del CRM

Probabilidad: media. Si Carolina necesita campo X que no existe en `oportunidades` actual, o flujo Y que rompe modelo Datadis, tendremos que decidir si adaptar o crear feature paralela.

**Mitigación**: priorizar que Carolina sea productiva, aceptar deuda técnica controlada en `/captacion` si hace falta.

### Riesgo 4: el equipo cae en la tentación de seguir construyendo en paralelo

Probabilidad: alta para mí (Cowork). Soy una IA y mi instinto es generar entregables.

**Mitigación**: durante la semana de simulación, mi rol cambia a observador + recopilador de feedback. NO ABRO features nuevas. Si Juan me pide "avanza el FV calculator", le recuerdo este compromiso y lo difiero hasta tras simulación.

---

## 10. Cierre

ChatGPT tiene razón: no estamos optimizando adopción, estamos sobre-diseñando sin uso real. El reenfoque correcto es **simular uso real ya** con un MVP pelado.

Pero "Release 1 en 3 días" es slogan, no plan. La forma correcta es:
- 3-5 días MVP pelado.
- 1 semana simulación.
- 4-6 días R1 final ajustado al feedback.
- Total ~3-4 semanas con validación.

Esto es **más lento aparentemente** que el Release 1 de 11 días planeado, pero **más rápido en realidad** porque construyes con datos, no con suposiciones.

Frase guía actualizada (sustituye a las anteriores):

> *Construir el siguiente paso pequeño, ponerlo en manos de Carolina, observar lo que pasa, decidir el siguiente paso con esa información.*

— Cowork, 1 mayo 2026.
