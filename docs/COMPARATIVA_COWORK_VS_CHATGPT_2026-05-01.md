# Comparativa de análisis estratégico — Cowork vs ChatGPT (1 mayo 2026)

> Tras presentar a ChatGPT un prompt completo con el plan estratégico del CRM Valere, su respuesta se compara con la auditoría profesional que produjo Cowork. Documento de síntesis.

## 1. Valoración global del análisis de ChatGPT

**Es un análisis sólido, mejor que el mío en algunos aspectos críticos.** Específicamente, mejor en focalización comercial y en distinguir "lo que se dice en una consultora pequeña" vs "lo que se dice en un SaaS". Yo me incliné hacia roadmap completo y ChatGPT tira de la cuerda hacia foco. Su valoración global ("sólido pero con riesgo de sobreingeniería prematura y falta de foco comercial") es correcta y la hago mía.

## 2. Donde ChatGPT mejora mi análisis (3 puntos)

### 2.1 Modelo híbrido empresa/CUPS según dominio

Yo propuse "el CRM debe centrarse en el CUPS, no en la empresa". ChatGPT matiza:

> "CRM → empresa. Operaciones → CUPS."

**Tiene razón.** Mi formulación era demasiado absoluta. La cuenta comercial sigue siendo la empresa (es lo que se factura, lo que se renueva contractualmente, lo que tiene un decisor humano). El CUPS es la unidad operativa donde se mide consumo, ahorro, incidencias. **La solución correcta es vista dual** (`/empresas` y `/suministros`) con métricas que se agregan en ambas direcciones, no sustituir una por otra.

Lo incorporo al plan.

### 2.2 "Activar uso real interno" como prioridad #1

Yo no había puesto esto como prioridad. ChatGPT lo identifica con razón: **24 empresas, 1 contacto, 0 incidencias, 0 renovaciones reales**. Si el equipo no usa el CRM, todo lo demás es teoría.

**Sin embargo, donde discrepo es en cómo se resuelve.** ChatGPT propone "obligar a que todo se gestione en CRM". Eso suele fracasar. La razón por la que el equipo no usa el CRM ahora es probablemente porque **no aporta valor inmediato** (meter un contacto a mano cuesta 2 minutos y no desbloquea nada). La solución no es disciplina, es **construir el primer flujo donde el CRM sea más rápido que el alternativo**. Por ejemplo:

- Asociar un CUPS a empresa desde Datadis con 1 click → más rápido que copiar/pegar a Excel.
- Subir factura PDF y que el validador detecte un error → más rápido que validar manualmente con calculadora.
- Generar propuesta auto desde Datadis → más rápido que abrir Word.

**Mi matiz:** la adopción no se fuerza, se gana. El primer flujo donde "CRM > Excel" desbloquea cascada de adopción.

### 2.3 Modo diagnóstico primera reunión

**Esta es la mejor idea del análisis de ChatGPT y yo no la había considerado.** Su propuesta:

> "Introduces CUPS + sector + tamaño empresa. El sistema devuelve en 30 segundos: estimación consumo, posibles ineficiencias, rango ahorro, hipótesis de mejora. Sin Datadis completo ni facturas."

**Por qué es brutal:**
- Elimina la fricción del consentimiento Datadis (que toma días).
- Convierte la primera reunión comercial de "préstame tu factura" en "ya sé lo que pagas y dónde puedes ahorrar".
- Es el **arma comercial concreta** que yo describí en lo abstracto pero no aterricé.

Cómo se construye:
- SIPS lookup (titular + tarifa + comercializadora actual + potencias).
- Heurísticas por CNAE/sector + tamaño (consumo medio €/m²/empleado, mix horario típico industria/comercio/oficina).
- Comparativa con OMIE últimos 90 días.
- Output: PDF de 1 página con conclusión vendible ("estimamos que pagas €X, podrías ahorrar €Y").

**Lo añado como FASE prioritaria al plan.**

## 3. Donde discrepo de ChatGPT (3 puntos)

### 3.1 BOE no es opcional para el validador de facturas

ChatGPT recomienda *"OMIE + SIPS y para. No metas BOE scraper completo"*. **Estoy de acuerdo con la simplificación, pero discrepo en que el BOE sea descartable.**

Razón: el validador de facturas (que ChatGPT y yo coincidimos en priorizar) compara la factura del cliente contra los **peajes y cargos vigentes según resolución BOE**. Si el motor de reglas no tiene esos datos, el validador da resultados incorrectos en el primer cliente.

**Compromiso correcto:** no scraper automático mensual, sino **snapshot manual trimestral** del BOE cargado por admin. La frecuencia de cambios reales es 2-4/año, no necesita automatización inicialmente. Mantenemos la dependencia, evitamos sobre-ingeniería.

### 3.2 "Sobreinversión técnica vs caja" — distinguir tipos de inversión

ChatGPT critica genéricamente:

> "Estás construyendo como SaaS: Sentry, RAG, arquitectura compleja. Pero tus ingresos vienen de servicios."

**Es una crítica válida pero mete todo en el mismo saco.** Hay tres categorías muy distintas:

| Inversión técnica | Coste real | Justificación |
|---|---|---|
| **RAG asistente CRM** | Alto (embeddings, vectores, mantenimiento) | Cuestionable. ¿Cuánto se usa? Si no se usa, eliminar. |
| **Edge Functions Datadis** | Alto (proxy, auth, cache) | Justificada — es la palanca diferencial. |
| **Sentry lazy SDK** | Cero si no hay DSN | No es sobreinversión. Es opción futura preparada. |
| **Schema feature-based 25 features** | Alto (ya pagado) | Pagado, no es inversión incremental. |
| **Tests 3% cobertura** | Bajo (poca deuda) | Aceptable mientras no haya regresiones graves. |

**El RAG es el que merece la crítica de ChatGPT** — habría que medir uso real y eliminar si no aporta. Sentry y schema feature-based no son sobreinversión.

### 3.3 La inconsistencia interna en el análisis de ChatGPT

ChatGPT dice dos cosas en tensión:

- "Tu cuello de botella es comercial, no técnico" (sección 3.2).
- "Estás invirtiendo como si fueras SaaS" (sección 3.3).

Pero luego propone (correctamente) que el CRM sea **arma comercial** vía:
- Modo diagnóstico primera reunión.
- € recuperados como métrica de venta.
- Generador de propuesta automática.

**Esto es resolver el cuello de botella comercial CON producto técnico.** No son alternativas: el CRM bien construido **es** la solución parcial al cuello de botella comercial. La crítica de ChatGPT funciona si la lees como "no construyas como SaaS para clientes inexistentes" pero su propio plan revisado es construir CRM como herramienta comercial, lo cual requiere inversión técnica enfocada.

**Síntesis:** la crítica vale en intensidad de inversión y en orden de prioridades, no en abandonar la inversión.

## 4. Donde Cowork y ChatGPT coinciden plenamente

- Datadis + CUPS = moat estructural.
- "€ recuperados a clientes 12m" como métrica trofeo.
- Eliminar tabla `renovaciones` y filtrar oportunidades (ChatGPT añade el matiz útil de `auto_generated: bool`).
- Validador de facturas en arquitectura **híbrida** (LLM extrae JSON, reglas deterministas validan).
- Datadis profundo > Portal cliente en orden de prioridad.
- Empezar con **FV + CAEs** y descartar de momento CSRD/PPA/CER.
- Sobreingeniería prematura es el mayor riesgo.

## 5. Plan revisado — síntesis de los dos análisis

Reordenamiento de prioridades incorporando lo mejor de ambos:

### Sprint adopción interna (FASE 30.bis · 3 días)

Antes de seguir construyendo, asegurar adopción:
- **30.bis.1**: completar el cierre del Sprint A pendiente (30.2 + 30.3 + 30.7 cuando Juan apruebe).
- **30.bis.2**: definir KPI semanal de uso CRM por usuario (incidencias creadas, contactos añadidos, propuestas generadas). Muestra automática en dashboard admin.
- **30.bis.3**: identificar 1 flujo donde el CRM sea claramente más rápido que la alternativa actual (¿gestión incidencias? ¿generación propuesta?). Optimizar ese flujo. **Sin esto, todo lo demás muere.**

### Sprint sector mínimo (FASE 34-bis · 3 días — versión recortada según ChatGPT)

- **34-bis.1**: SIPS lookup. Edge Function `sips-lookup` consulta distribuidora correcta por código CUPS.
- **34-bis.2**: OMIE diario. Cron + tabla `omie_precios_horarios`.
- ❌ Posponer eSIOS factor emisiones (no urgente sin clientes CSRD).
- ❌ Posponer scraper BOE automático (snapshot manual trimestral en su lugar).

### Sprint modo diagnóstico (FASE 41 · 4 días — IDEA NUEVA de ChatGPT)

**Posición preferente.** Es el primer flujo "wow comercial" sin fricción Datadis.

- **41.1**: tabla `heuristicas_consumo_sector` con consumo medio kWh/m² o /empleado por CNAE.
- **41.2**: hook `useDiagnosticoRapido(cups, cnae, tamaño)` que combina SIPS + heurísticas + OMIE.
- **41.3**: generador PDF "Diagnóstico inicial — 30 segundos" con:
  - Datos SIPS (tarifa, comercializadora, potencia).
  - Estimación consumo y € pagados (heurística).
  - Comparativa OMIE últimos 90d.
  - Top 3 hipótesis de ahorro (fijo→indexado, optimización potencia, reactiva).
- **41.4**: pestaña en `/empresas/:id` "Diagnóstico inicial" — botón "Generar".

**Outcome:** Juan llega a la primera reunión con un PDF que dice "según mis datos, pagas €X, ahorrarías €Y". Cierra reunión con propuesta sin pedir autorización Datadis.

### Sprint generador de propuesta (FASE 42 · 3 días — IDEA NUEVA de ChatGPT)

Para cuando ya hay Datadis. Toma curva 12m + ofertas comparadas y genera propuesta PDF.

- **42.1**: hook `useGeneradorPropuesta(empresa_id)` que combina Datadis + ofertas comercializadoras + cálculo ahorro.
- **42.2**: PDF white-label con:
  - Resumen ejecutivo (€ ahorrado, plazo).
  - Curva de consumo del cliente.
  - Comparativa 3-5 ofertas.
  - Recomendación con justificación.
- **42.3**: vinculación a `propuestas` para tracking de aceptación.

### Sprint validador facturas v0 (FASE 36-bis · 5 días — versión recortada)

Solo 3 reglas críticas según ChatGPT:
- Concordancia consumo Datadis ↔ factura.
- Potencia contratada ↔ facturada (ojo a excesos).
- Reactiva no penalizable cuando cosφ ≥ 0.95.

Arquitectura híbrida: LLM extrae JSON estructurado → reglas deterministas validan. Guardar PDF + JSON + resultado validación para trazabilidad.

### Sprint € trofeo + dashboard estratégico (FASE 38-bis · 2 días)

- KPI principal home: "**€ recuperados a clientes en últimos 12m**" calculado desde `incidencias.importe_recuperado`.
- Vista nueva `/suministros` (CUPS-céntrica, complementaria a `/empresas`).

### Sprint servicios adyacentes (FASE 40-bis · sprint largo, posterior)

Solo 2 verticales según ChatGPT:
- **Autoconsumo FV**: calculador viabilidad PVGIS + propuesta + tracking.
- **CAEs**: detector de oportunidad + workflow certificación.

Diferidos: CSRD, CER, PPA, auditoría obligatoria RD 56/2016.

### Diferidos (igual que antes)

Firma digital, convergencia visual, tests, modo oscuro, mobile responsive.

## 6. Riesgos que ChatGPT identifica y debemos tomar en serio

1. **Dependencia Datadis** (caídas, límites, cambios API): añadir circuit breaker + cache 24h + fallback "no disponible" amigable.
2. **Riesgo legal validador facturas**: añadir disclaimer + nivel confianza por regla + revisión humana antes de generar reclamación. Nunca enviar reclamación sin OK manual.
3. **Falta disciplina operativa interna**: KPI semanal uso CRM como propuse arriba.
4. **Falta canal adquisición**: no es un problema técnico. Pregunta a Juan: ¿de dónde vienen las 24 empresas actuales? ¿hay canal repetible o cada lead llega por contacto personal? Si es lo segundo, el "modo diagnóstico" puede ser parte del go-to-market (LinkedIn, contenido, ferias).
5. **Sobreinversión técnica vs caja**: medir uso de RAG asistente CRM. Si <10 consultas/semana, eliminar y ahorrar mantenimiento.

## 7. Decisión recomendada

Mi recomendación final integrando lo mejor de ambos análisis:

**Próximas 4 semanas:**
1. Cerrar Sprint A (sub-fases pendientes con input Juan).
2. **Sprint adopción interna** (30.bis) — 3 días.
3. **Sprint sector mínimo** (SIPS + OMIE) — 3 días.
4. **Sprint modo diagnóstico** (FASE 41) — 4 días. **Esta es la nueva prioridad #1 según ChatGPT**.

**Mes 2:**
5. **Sprint generador propuesta** (FASE 42) — 3 días.
6. **Sprint validador v0 con 3 reglas** (36-bis) — 5 días.
7. **Sprint € trofeo + vista suministros** (38-bis) — 2 días.

**Mes 3+:**
8. FV + CAEs según demanda real de clientes.

**Total mes 1-2: ~25 días-persona.** Realista para Juan + 1 desarrollador parcial.

---

## Cierre

ChatGPT y Cowork llegamos a conclusiones similares pero con énfasis distintos. Yo tendí al roadmap completo (visión vertical madura), ChatGPT tiró hacia foco extremo (consultora pequeña, no SaaS). **El plan correcto está más cerca del de ChatGPT, con dos correcciones**:

- BOE manual snapshot trimestral (no descartar).
- Adopción interna se gana con valor inmediato, no se fuerza con disciplina.

Y una idea de ChatGPT que se incorpora íntegra al plan: **modo diagnóstico primera reunión** como FASE 41 prioritaria.

— Cowork, 1 mayo 2026.
