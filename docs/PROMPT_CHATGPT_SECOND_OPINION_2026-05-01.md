# Prompt para ChatGPT — segunda opinión sobre el plan estratégico CRM Valere

> Copia desde la línea siguiente hasta el final. El prompt es autocontenido: ChatGPT no necesita contexto previo.

---

# ROL Y OBJETIVO

Actúa como **consultor senior de producto digital** con experiencia en **software vertical B2B en sectores regulados**, especialmente **energía**. Has trabajado en o con productos como Linkener, SegeNet, Ledecom, Iberdrola Smart Solutions, Schneider EcoStruxure, plataformas de eficiencia energética industrial. Conoces el mercado eléctrico español (RDL 17/2021, RD 1955/2000, RD 244/2019, RD 56/2016, RDL 14/2022 — CAEs, RD 1075/2014 — peajes, regulación CNMC), la práctica diaria de una consultora energética B2B y la diferencia entre un CRM "para el sector" y un CRM "del sector".

**Quiero tu segunda opinión crítica sobre el plan estratégico que hemos construido hoy para un CRM de consultoría energética llamado Valere.**

REGLAS:
- **No me halagues**. Si algo está mal pensado, dilo claramente.
- **Detecta puntos ciegos**: cosas que damos por hecho que no deberíamos.
- Si nos falta una palanca importante, señálala con justificación.
- Si una de nuestras prioridades es errónea, propón alternativa concreta.
- **Sé concreto y propositivo**. Frases tipo "deberíais considerar..." sin ejemplo no aportan.
- Si ves errores factuales sobre el sector eléctrico español, corrígelos.
- Razona como si estuvieras invirtiendo dinero propio en el éxito de Valere.

---

# 1. CONTEXTO DEL NEGOCIO

**Valere Consultores** es una **consultora energética española B2B**, pequeña-mediana. Cartera actual: **~24 empresas cliente, ~72 CUPS gestionados, 2 contratos vivos en BD, 4 oportunidades en pipeline, 1 contacto registrado**. Equipo: socio-fundador (Juan, ingeniero) + colaboradores comerciales/administrativos.

**Servicios actuales:**
- Auditoría energética y diagnóstico inicial.
- Negociación con comercializadoras eléctricas.
- Gestión continua: validación facturas, alertas, gestión incidencias.
- Renovaciones de contratos.
- Seguimiento de plantas fotovoltaicas (instaladas vía partners).
- Integración con Holded (ERP/contabilidad).

**Posicionamiento:** consultora local con relación de confianza, no un SaaS masivo. Margen apretado (1-3% del consumo del cliente típico). Quiere diferenciarse vía **producto digital propio (CRM Valere)** que sea argumento comercial.

**Activos diferenciadores:**
- **Integración Datadis funcional desde 2026-04-30**: 14 suministros sincronizados de un cliente piloto industrial (CHEMTROL), con curva horaria, potencias, reactiva.
- **Módulo de Plantas FV propio** con sync a FusionSolar (Huawei), gestión multi-credencial y de mantenimiento.
- **Módulo Potencias** (RDL 17/2021): gestión de expedientes para optimización potencias contratadas industriales.

**Competencia identificada:** Linkener, SegeNet, Ledecom (todos con validador de facturas y portal cliente, todos con datos parciales).

---

# 2. STACK TÉCNICO

- **Frontend**: React 19 + TypeScript 5 + Vite 6 + Tailwind 4 + shadcn/ui + react-router-dom + tanstack-query 5 + react-hook-form + zod 4 + recharts.
- **Backend / BD**: Supabase (Postgres 17.6, Edge Functions Deno, Auth, Storage, pg_cron, pg_net, pgvector).
- **Hosting**: Cloudflare Pages (`valere-v2.pages.dev`). Migrado desde Vercel (cuenta suspendida abril 2026).
- **CI**: GitHub Actions.
- **IA**: Edge Function `chat-consultor` (Gemini), `ask-crm-docs` (RAG sobre `docs/help/` con embeddings).
- **Repo**: monorepo único `valere-v2` con frontend + supabase migrations + functions + docs.

**Schema Supabase clave (22 tablas):**

CRM core: `user_profiles` (master/manager/consultant/client), `empresas`, `contactos`, `contratos`, `cups` (con campos Datadis y FV), `oportunidades` (con etapas energéticas tras FASE 21.a), `actividades` (polimórfica), `propuestas`, `incidencias`, `renovaciones` (vacía), `notificaciones`, `documentos` (polimórfica + bucket Storage), `eventos` (calendario), `custom_fields_*`.

Calculadora energética: `clients` (legacy → migrar a `empresas`), `supply_points` (legacy → `cups`), `facturas` (con `consumption_p1..p6`, `surplus_p1..p6`, FK a `cups`), `retailers`, `retailer_offers`, `proposals` (legacy → `analisis_comparativo` futuro), `global_config`, `boe_regulated_prices`.

Datadis: `datadis_consumos_cache`, `consentimientos_datadis`, `datadis_provincias` (52 INE), columnas `datadis_*` en `cups`. Edge Function `datadis-proxy` v4 funcional (5 endpoints: get_supplies, get_consumption, get_max_power, get_contractual, get_reactive).

Plantas FV: `fv_planta` (multi-credencial), `fv_planta_credencial` (N:M), `fv_credenciales`, `fv_kpi_diario`, `fv_alarma`, `fv_actuacion`, `fv_mantenimiento`, `fv_empresa_mantenimiento`, `fv_config_informe`, `fv_informe_mensual`.

Módulo Potencias: `solicitudes_potencia`, `expedientes_potencia`, otros.

Asistente RAG: `crm_help_embeddings` con función `match_crm_help` (pgvector).

**Edge Functions activas (8):** `chat-consultor`, `ask-crm-docs`, `notify-admin-pending-user`, `notify-user-approval-decision`, `holded-worker`, `notify-integration-error`, `notify-expediente-estado`, `datadis-proxy`.

**Cron jobs (3 tras hoy):** `cleanup_pending_users_daily` (03:00 UTC, borra usuarios pendientes >7d), `holded_worker_5min`, `daily_contract_check` (04:00 UTC, recién creado hoy).

**Estado actual del frontend:** ~25 features bajo `src/features/`, arquitectura feature-based. Cobertura de tests bajísima: 6 ficheros .test, 33 invocaciones it/test, ~3% del dominio.

**Deuda técnica documentada:**
- 111 `as never` legados en BD calls.
- TSC roto en rama `claude/sprint2-lib-potencias` (~60 errores) — bloquea merge a main.
- RLS granular escrita pero NO aplicada en producción (sigue permisivo `all_authenticated`).
- Sin observabilidad remota (Sentry recién añadido base hoy, sin DSN).
- Dos escuelas visuales conviven (CRM rounded-md vs Calculadora rounded-xl).

---

# 3. TRABAJO REALIZADO HOY (SESIÓN 2026-05-01)

Una sesión de Claude (Cowork mode) ha producido tres entregables encadenados:

## 3.1 Auditoría técnica (`AUDIT_2026-05-01_MEJORAS_CRM.md`)

Verificación rigurosa contra el código real de un análisis estratégico que hizo Juan desde el browser. Distingue:
- ✅ Resuelto en código (aunque la app vacía no lo refleje porque no hay datos).
- 🟡 Esqueleto sin cablear (existe SQL/feature pero no hay automatización ni UI).
- ❌ No existe.

**Hallazgos clave:**
- Pipeline energético existe (FASE 21.a) pero migración a medias: etapas legacy aún vivas.
- Edge Function `daily-contract-check` deployed**ya** existía pero **sin programar pg_cron** — la automatización de renovaciones no se ejecutaba (corregido hoy).
- Datadis aislado del CRM: ningún flujo asocia los 72 CUPS bajados con las 24 empresas.
- RLS granular FASE 20.9 escrita pero no aplicada — bloquea portal cliente por dependencia.
- `incidencias.cups` es TEXT (no FK uuid).
- 0 incidencias, 0 renovaciones, 1 contacto en 24 empresas: el CRM está vacío de relaciones.
- Validador de facturas y portal cliente: inexistentes.

## 3.2 Sprint A autónomo aplicado (6 sub-fases)

### Aplicado en BD producción (vía MCP Supabase):

**FASE 30.1 — pg_cron daily-contract-check**
- Decisión de diseño: replicar la lógica del Edge Function en plpgsql en lugar de llamar HTTP. Más atómico, sin gestión de secretos. La Edge Function queda como referencia.
- Función `public.run_daily_contract_check()` SECURITY DEFINER.
- Cron `0 4 * * *`, programado.
- REVOKE EXECUTE de anon/authenticated tras detectar warnings advisor.

**FASE 30.8 (aditiva) — incidencias.cups_id**
- ALTER ADD column `cups_id uuid REFERENCES cups(id)` + index parcial + populate.
- Columna `cups: text` mantenida por compatibilidad (DROP en 30.8b cuando frontend migre).

### Frontend modificado (pendiente TSC + commit):

**FASE 30.4 — Importes en Kanban**: KanbanCard muestra `valor_estimado_eur` y `ahorro_anual_estimado` en EUR. KanbanColumn suma por etapa.

**FASE 30.5 — Wizard contacto decisor**: EmpresasPage convertido a wizard 2 pasos en CREATE. Paso 1 empresa → Paso 2 ContactoForm con `es_decisor=true` precargado. ConfirmDialog para abandonar.

**FASE 30.6 — Asociar Datadis↔Empresa**: Modal `AsociarEmpresaDialog.tsx` con búsqueda debounced. Hook `useAsociarSuministroAEmpresa()` con upsert por `codigo_cups`. Botón en cada fila de DatadisPage.

**FASE 30.10 — Sentry SDK base**: `@sentry/react@^10` + wrapper lazy `sentry.ts`. Init en `main.tsx` (createRoot React 19 con `reactErrorHandler`). `setSentryUser()` tras login en useAuth. `logError` en logger reenvía a Sentry. `.env.example` documentado. Si DSN no presente, no carga el SDK (zero coste).

### Sub-fases pendientes (con razón):
- **30.2 Consolidar `renovaciones` vs `oportunidades.tipo='renovacion'`** → necesita decisión Juan.
- **30.3 Cerrar etapas legacy en oportunidades** → destructivo, verificar antes con SELECT.
- **30.7 Vinculación masiva Datadis por NIF** → requiere Edge Function nueva.
- **30.9 Aplicar RLS granular FASE 20.9** → mejor en sesión coordinada con observación tabla a tabla.

## 3.3 Auditoría profesional sector (`AUDIT_2026-05-01_PROFESIONAL_SECTOR.md`)

Lente de profesional del sector consultoría energética B2B. **Tres conclusiones estructurales:**

1. **El CRM hoy es un CRM general aplicado a energía, no un CRM vertical**. El objeto central debe ser el **suministro/CUPS**, no la empresa. Justificación: una empresa puede tener 20 CUPS, las renovaciones son por CUPS, el ahorro se calcula por CUPS, las incidencias se generan por CUPS, las facturas son por CUPS-período.

2. **5 fuentes públicas gratuitas no consumidas** que cambiarían el producto:
   - **SIPS** (Sistema Información Puntos Suministro de cada distribuidora): das un CUPS y tienes titular + comercializadora actual + tarifa + potencias en 5 segundos. Cierra primera reunión sin pedir factura.
   - **OMIE**: precios horarios mercado mayorista. Validar contratos indexados, proponer cambios fijo↔indexado según tendencia.
   - **REE/eSIOS**: factor emisiones del mix español. Reporting CSRD automático.
   - **BOE**: peajes y cargos vigentes (cambian 2-4 veces/año). Sin esto el validador de facturas es incorrecto.
   - **CNMC**: resoluciones que afectan a contratos.

3. **La oportunidad de monetización mayor está en servicios adyacentes**, no en consultoría pura:
   - Autoconsumo FV (comisión 5-15% del CAPEX, ticket €3-12K por proyecto típico).
   - CAEs (Certificados de Ahorro Energético, RDL 14/2022): margen 15-30% sobre valor.
   - Comunidades Energéticas Locales (RD 244/2019): consultoría inicial €5-15K.
   - Auditoría obligatoria RD 56/2016 (~1.500 empresas obligadas en España): €3-15K cada 4 años.
   - Reporting CSRD/CBAM (cliente grande): €2-10K anual.
   - PPA (Power Purchase Agreements): 0.5-2% del notional como intermediación.

**El documento incluye:**
- 10 reglas concretas para el validador de facturas profesional.
- 14 alertas inteligentes (operativas Datadis + mercado OMIE/BOE + comerciales CRM).
- 10 KPIs estratégicos faltantes en dashboard, incluyendo "**€ recuperados a clientes 12m**" como métrica trofeo.
- 5 workflows operativos del sector que no están instrumentados (RFP comercializadoras, switching, autorización Datadis, optimización potencia, auditoría inicial).
- Schema vertical propuesto: `tarifas_acceso_vigentes`, `omie_precios_horarios`, `comercializadoras_contactos`, `proyectos_fv`, `caes`, `comunidades_energeticas`, etc.
- Roadmap ampliado FASE 34-40 con sprints sectoriales.

---

# 4. ROADMAP CONSOLIDADO

## Sprint A (FASE 30) — "Cablear lo que ya existe" — 5 días
6/10 sub-fases aplicadas hoy. Pendientes: 30.2, 30.3, 30.7, 30.9.

## Sprint B (FASE 31) — "Ampliar el modelo energético" — 5 días
- 31.1: Precios P1-P6 €/kWh y €/kW·año en `contratos`.
- 31.2: Detalle económico en `oportunidades` (consumo_anual_kwh, precio_actual, precio_ofertado, fee_valere_pct, plazo_meses).
- 31.3: Tabla `oportunidad_cups` (N:M).
- 31.4: `historial_precios_contrato` con trigger snapshot.
- 31.5: Subsegmento + tamaño + consumo estimado en `empresas`.
- 31.6: `rol_energetico` y `canal_preferido` en `contactos`.
- 31.7: Hook `useAhorroEstimado(oportunidad_id)` calculando contra Datadis.
- 31.8: 5 informes energéticos (ahorro generado 12m, distribución tarifaria, top consumidores, vencimientos vs OMIE, reactiva mensual).

## Sprint C (FASE 32) — "Diferenciar el servicio" — 5 días
- 32.1: Edge Function `datadis-incidencias-detector` cron diario.
- 32.2: Validador de facturas v0.
- 32.3: Portal cliente v0 (depende de 30.9 RLS).
- 32.4: Generador autorización Datadis desde CRM.

## Sprint sector A (FASE 34) — Datos públicos — 3-4 días
SIPS lookup, OMIE diario, eSIOS factor emisiones, scraper BOE.

## Sprint sector B (FASE 35) — Auditoría inicial automatizada — 5 días
Hook `useAuditoriaCUPS` + generador PDF informe ejecutivo + workflow auto al asociar CUPS.

## Sprint sector C (FASE 36) — Validador facturas profesional — 8-10 días
10 reglas, motor configurable, plantilla reclamación legal pre-rellenada.

## Sprint sector D (FASE 37) — Alertas inteligentes — 5 días
14 reglas (Datadis, mercado, comercial), Edge Function cron horario.

## Sprint sector E (FASE 38) — Dashboard estratégico ampliado — 3 días
KPIs CAC/LTV/NRR, "€ recuperados", heatmap churn, vista `/suministros`.

## Sprint sector F (FASE 39) — Reporting cliente automatizado — 4 días
PDF mensual + envío automático + visión en portal cliente.

## Sprint sector G (FASE 40) — Servicios adyacentes — sprint largo
Calculador FV, detector CAE, auditoría obligatoria, CSRD, PPA simulator.

## Diferidos (FASE 33+)
Firma digital, convergencia visual, tests a 30%, modo oscuro, mobile responsive.

---

# 5. LAS 3 PRIORIDADES PROPUESTAS PARA 60 DÍAS

1. **Cerrar bucle Datadis**: vincular los 72 CUPS bajados a empresas + auditoría inicial automatizada (FASE 30.6/30.7 + 35).
2. **Validador de facturas v0**: subida PDF + 3-4 reglas críticas + plantilla reclamación (FASE 36 simplificado).
3. **Cifra trofeo "€ recuperados a clientes 12m"** en home + material comercial (FASE 38.2).

Argumento: las tres no son tecnología nueva, son cablear y exponer lo que ya existe. La cuarta (FASE 31, modelo energético) puede ir en paralelo cuando haya datos reales que justifiquen los campos.

---

# 6. DECISIONES PENDIENTES — DONDE QUIERO TU OPINIÓN ESPECÍFICA

## 6.1 ¿Eliminar tabla `renovaciones` o mantenerla como vista filtrada?

Hoy `renovaciones` está vacía (0 rows). El cron `daily_contract_check` crea **oportunidades tipo='renovacion'** (no rows en `renovaciones`). Mi propuesta: eliminar la tabla y refactorizar `/renovaciones` para que sea una vista filtrada de oportunidades. ¿Acertado o pierdo flexibilidad?

## 6.2 ¿Cuál es el orden óptimo de los próximos sprints?

Mi recomendación es:
1. Cerrar Sprint A (sub-fases pendientes con input Juan).
2. **Saltar Sprint B (modelo energético) y empezar Sprint sector A (FASE 34)**, porque desbloquea features visibles para el cliente más rápido. El modelo energético se construye cuando los datos reales lo exijan.
3. Después Sprint sector B (auditoría inicial) + C (validador facturas).

¿Es razonable? ¿O hay un argumento para hacer primero el modelo energético?

## 6.3 ¿Cómo construir el validador de facturas?

Tengo dos opciones para la extracción del PDF:
- **A**: pdf-parse (Deno) o pdfplumber (Python en lambda) + reglas determinísticas. Privado, sin LLM, robusto en formatos conocidos, frágil con formatos nuevos.
- **B**: LLM (Claude Haiku, Gemini Flash, GPT-4o-mini) con prompt estructurado para extraer JSON. Robusto en cualquier formato, requiere DPA con proveedor.
- **C**: Híbrido — LLM extrae JSON, motor de reglas determinístico valida. Mejor de ambos mundos.

¿Cuál recomiendas para una consultora pequeña con presupuesto limitado pero que quiere imagen sólida?

## 6.4 ¿Los servicios adyacentes son una distracción o una palanca?

Mi audit profesional dice: la consultoría energética pura tiene márgenes apretados. El dinero está en FV + CAEs + auditorías obligatorias + CSRD. Pero Valere es pequeña (Juan + colaboradores). **¿Es realista que una consultora pequeña intente abarcar tantos servicios o debería especializarse en 1-2?** ¿Cuáles serían los 1-2 más rentables para empezar dado el contexto?

## 6.5 Datadis profundo vs portal cliente

Tengo dos diferenciaciones posibles para los próximos 6 meses:
- **Datadis nativo y profundo** (auditoría automatizada, alertas, validador facturas) = competir con Linkener/SegeNet en su terreno con mejor dato.
- **Portal cliente moderno con reporting excelente** = competir en experiencia. Requiere RLS granular antes.

Sólo se puede hacer uno bien en 6 meses con un equipo pequeño. ¿Cuál priorizar y por qué?

## 6.6 ¿Está bien que el CRM sea CUPS-céntrico?

El audit profesional propone que el objeto central pase de "empresa" a "CUPS". Es un cambio de modelo mental grande. ¿Es esto realmente la diferencia entre un CRM general y un CRM vertical de este sector, o estoy sobrediseñando?

---

# 7. LO QUE ESPERO DE TU RESPUESTA

Quiero una respuesta estructurada con:

1. **Tu valoración global del plan en una frase** (sólido / mediocre / equivocado).
2. **3 cosas que detectes que estamos haciendo bien** (sé estricto, sólo si lo crees).
3. **3 cosas que detectes que estamos haciendo mal o son puntos ciegos**, con justificación.
4. **Tu respuesta a cada una de las 6 decisiones pendientes** (sección 6).
5. **Una recomendación de prioridades alternativa**, si la nuestra no te convence.
6. **Riesgos no identificados**: qué podría hacer fracasar este plan en 6-12 meses.
7. **Una idea diferenciadora que no hayamos considerado** (puede ser técnica, de producto, de modelo de negocio o de go-to-market).

Si necesitas más contexto sobre algún aspecto, pídelo en lugar de inventar. Si crees que los datos de mercado que doy son incorrectos (precios CAE, comisiones FV, número empresas RD 56/2016, etc.), corrige y cita fuente.

Gracias.

---

> **Fin del prompt para ChatGPT.**

---

## Notas de uso (no copiar)

- El prompt está calibrado para GPT-4 / Claude. Si lo pegas en un modelo más pequeño, simplifica.
- Si el modelo se queda corto en la respuesta, pide continuación con "sigue donde te quedaste, especialmente la parte de [X]".
- Para iterar: cuando ChatGPT responda, podrás pedirme aquí que comparemos su análisis con el nuestro y veamos puntos donde diferimos.
