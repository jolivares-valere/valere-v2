# DOC 4 — Roadmap de implantación y mejora del CRM Valere por fases

> **Objetivo**: plan de ejecución por fases para implantar en el CRM Valere las mejoras derivadas del análisis de Telegest, Linkener, Segenet y Zocoenergía (DOC 1 y DOC 2) y el proyecto de telemedida/FV directa (DOC 3), sin romper lo existente.
>
> **Fecha**: 2026-06-13 · **Autor**: Cowork (Agente 1).
>
> ⚠️ NO toca código todavía. El **sprint de 7 días vigente (hasta 19/06)** manda y va de cerrar el circuito de propuestas; este roadmap arranca **después** de ese sprint. Cada fase: rama `claude/<descripcion>`, PR a main, TSC 0 + 39/39 tests, auditor `valere-auditor`, RLS estricto (RGPD), nunca push directo a main.

---

## 0. Principios del roadmap

1. **Reutilizar, no reinventar**: el CRM ya tiene Datadis, calculadora/ofertas, renovaciones, notificaciones, dashboards por rol, asistente RAG, esquema `fv_*`, cifrado AES-256. Cada fase EXTIENDE lo existente.
2. **Valor primero, hardware después**: la capa administrativa (SIPS/Datadis, comparadores, comisiones) da valor inmediato sin depender de acuerdos externos. La telemedida física (contadores/inversores) es el diferencial estratégico pero está bloqueada por FASE 0 (acuerdo Telegest) → va en paralelo, sin frenar lo demás.
3. **Seguridad transversal**: RLS por `empresa_id`/`comercial_id`, secretos cifrados, sin debug en prod, cabeceras seguras. En cada fase, no al final.
4. **Cada fase entrega algo usable** por el comercial, con criterio de aceptación verificable.

---

## 1. Vista general de fases

| Fase | Nombre | Bloque | Duración aprox. | Depende de |
|---|---|---|---|---|
| **F0** | Cierre del sprint actual (circuito de propuestas) | En curso | hasta 19/06 | — |
| **F1** | Capa SIPS/Datadis por CUPS + autorrelleno | Paridad | 2-3 sem | F0 |
| **F2** | Comparadores unificados + OCR de factura | Paridad/Dif. | 2 sem | F1 |
| **F3** | Renovaciones automáticas + rentabilidad + dashboard | Paridad | 1 sem | F1 |
| **F4** | Motor de comisiones + Liquidaciones + Red multinivel | Diferenciador | 3-4 sem | F1 |
| **F5** | Optimización de potencia + simulación de factura fina | Diferenciador | 2-3 sem | F1 |
| **F6** | Verificación por llamada (Twilio) + estados + auditoría | Diferenciador | 2 sem | F4 |
| **F7** | Asistente IA por agentes + heatmap/rankings | Mejora | 2 sem | F1 |
| **F8** | Telemedida directa de contadores (IEC-102) | Estratégico | 4-6 sem | FASE 0 Telegest |
| **F9** | Lectura directa de inversores FV (cloud/Modbus) | Estratégico | 3-4 sem | F8 |
| **F10** | Explotación unificada + corte de dependencia | Estratégico | continuo | F8, F9 |

> Las fases F8-F10 son el **proyecto de telemedida/FV directa** (DOC 3 / `PLAN_TELEMEDIDA_FV_DIRECTA`), aquí integradas en el roadmap global. Numeración propia interna en ese plan (FASE 0-6).

---

## 2. Detalle por fase

### F0 — Cierre del sprint actual (EN CURSO, hasta 19/06)
No es parte de esta propuesta, pero la condiciona. Cerrar circuito propuestas: merge PR #11, deploy, verificación; unificación `proposals`→`propuestas`; limpieza tipos; 3.0TD; menú Energía; alta de incidencias. **Hasta que F0 no cierre, este roadmap no arranca.**

### F1 — Capa SIPS/Datadis por CUPS + autorrelleno  ⭐ ARRANQUE
**Qué**: con solo el CUPS, el CRM resuelve titular (CIF), tarifa, consumo P1-P6, potencias/maxímetros, curva de facturación 12 meses, último cambio de comercializadora. Autorrelleno en alta de contrato/oportunidad/ficha de empresa + Buscador de CUPS standalone (luz/gas).
**Cómo**: Edge Function "resolver SIPS por CUPS" (HTTPS puro, no necesita VPS) sobre Datadis (ya integrado a medias) + cacheo en `sips_cache`/`datadis_consumptions`. Decidir proveedor SIPS (recomendado: Datadis primero; valorar agregador comercial para prospección sin autorización).
**Reutiliza**: módulo `datadis`, normalizadores 3.0TD.
**Entrega**: el comercial pega un CUPS y ve todo, sin Zoco.
**Aceptación**: para 5 CUPS reales, los datos coinciden con los que muestra Zoco (±0). Buscador de CUPS funcional luz+gas.
**Mejoras DOC 2 cubiertas**: #1, #2.

### F2 — Comparadores unificados + OCR de factura
**Qué**: comparador de luz / luz multipunto / gas: cargar factura PDF (OCR) o CUPS (F1) → comparar contra catálogo de comercializadoras → tarifa más rentable → propuesta PDF. Alta de contrato "por factura".
**Cómo**: unificar la calculadora de ofertas existente (`retailers`, `retailer_offers`, `boe_regulated_prices`, motor energía) con la entrada SIPS (F1) y el OCR existente. Conectar OCR al alta.
**Reutiliza**: calculadora/ofertas, importador/OCR, skill `pdf`.
**Aceptación**: subir una factura real → propuesta con ahorro correcto (±2% vs cálculo manual); multipunto con ≥3 CUPS.
**Mejoras DOC 2 cubiertas**: #3, #8.

### F3 — Renovaciones automáticas + rentabilidad + dashboard
**Qué**: recordatorio de renovación a X meses de activación (notificación + email automáticos); tarjeta "Pendientes de renovación" en dashboard; KPI de rentabilidad €/% por cartera.
**Cómo**: extender módulos `renovaciones` + `notificaciones` con job temporal; añadir cálculo de rentabilidad (requiere dato de comisión — básico ahora, completo tras F4).
**Reutiliza**: renovaciones, notificaciones, dashboards por rol (Fase 28).
**Aceptación**: un contrato a 11 meses dispara aviso; dashboard muestra pendientes y rentabilidad.
**Mejoras DOC 2 cubiertas**: #4, #5.

### F4 — Motor de comisiones + Liquidaciones + Red multinivel  ⭐ DIFERENCIADOR
**Qué**: comisión por contrato (asesor + empresa) según producto/comercializadora; informes de liquidación por agente/comercializadora/fecha con estado liquidado; export PDF/Excel; red de agentes jerárquica con override del superior; organigrama.
**Cómo**: nuevo modelo `comisiones`/`liquidaciones` + catálogo de productos con fees por tramo (espejo de `marketers` de Zoco); jerarquía sobre `user_profiles`. Organigrama visual (inspiración Linkener).
**Reutiliza**: `contratos`, `propuestas`, auth/roles.
**Aceptación**: liquidación mensual de un agente cuadra con el Excel actual de Valere; export PDF/Excel correcto.
**Mejoras DOC 2 cubiertas**: #6, #7.

### F5 — Optimización de potencia + simulación de factura fina
**Qué**: optimizador de potencias P1-P6 multi-tarifa (2.0/3.0/6.X TD), doble escenario (cambio de tipo), job mensual automático que recalcula la cartera y avisa de ahorros; simulación de factura con pérdidas de red + coseno φ.
**Cómo**: motor energía + precios CNMC/BOE + curva (de F1 Datadis, o de F8 telemedida cuando exista). Job programado mensual.
**Reutiliza**: motor energía, precios regulados/pool.
**Aceptación**: para 1 CUPS, ahorro de potencia y factura simulada cuadran (±2%) con el estudio de Telegest/Segenet del mismo periodo.
**Mejoras DOC 2 cubiertas**: #9, #10.

### F6 — Verificación por llamada (Twilio) + estados configurables + auditoría
**Qué**: llamada de verificación grabada desde el CRM, audio guardado en el contrato, estado "Firmado-Llamada verificada"; SMS; estados de contrato personalizables; log de acciones de usuario.
**Cómo**: integración Twilio (nueva); estados configurables; tabla de auditoría.
**Aceptación**: lanzar llamada de prueba, grabarla, adjuntarla al contrato; estado cambia; acción queda en el log.
**Mejoras DOC 2 cubiertas**: #11, #13.

### F7 — Asistente IA por agentes + heatmap/rankings
**Qué**: ampliar el asistente RAG actual a "agentes" que respondan sobre suministros/contratos/facturación de un cliente; mapa de calor de consumo y rankings en dashboard.
**Cómo**: extender `ask-crm-docs`; heatmap con la curva de F1/F8.
**Reutiliza**: asistente RAG, dashboards.
**Aceptación**: el asistente responde "¿cuánto consumió el CUPS X en P1 el último trimestre?" con dato real; heatmap visible.
**Mejoras DOC 2 cubiertas**: #12, #14, #15.

### F8 — Telemedida directa de contadores (IEC-102)  ⭐ ESTRATÉGICO
= FASE 0+1 del `PLAN_TELEMEDIDA_FV_DIRECTA`. **Bloqueada por acuerdo con Telegest** (acceso a concentrador/SIM). Microservicio lector en VPS, esquema `telemetria_*`, adaptador IEC-102, ingesta idempotente.
**Aceptación**: curva cuartohoraria de 1 CUPS real en `telemetria_curva`, coincide con Telegest.

### F9 — Lectura directa de inversores FV (cloud/Modbus)
= FASE 2 del plan. Adaptadores cloud (Sungrow/Huawei ya con POC; SMA/Solis después) + Modbus (caso Deraza). Amplía `fv_*`.
**Aceptación**: producción por inversor de TRH en `fv_kpi_realtime`, contrastable con Telegest.

### F10 — Explotación unificada + corte de dependencia
= FASES 3-6 del plan. Scheduler/robustez, motor de explotación sobre telemedida, UI `telemedida`, escalado a 30 contadores + plantas FV, doble verificación CRM↔Telegest, y decisión de prescindir de intermediarios.
**Aceptación**: paridad de datos CRM↔Telegest 1 mes → corte de dependencia.

---

## 3. Dos carriles en paralelo

```
CARRIL A (administrativo, sin bloqueos externos):
  F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7
  (valor comercial inmediato; iguala y supera a Zoco)

CARRIL B (físico, bloqueado por acuerdo Telegest):
  FASE 0 acuerdo Telegest → F8 → F9 → F10
  (diferencial único; arranca cuando Telegest confirme acceso)
```
Los dos carriles convergen: la curva de F8 alimenta el optimizador de F5 y el heatmap de F7; la ficha única muestra SIPS (F1) + telemedida (F8) + FV (F9) + comercial (F4) juntos.

---

## 4. Hitos de negocio

- **Hito 1 (fin F1-F3)**: "Valere ya no necesita el SIPS de Zoco" — autorrelleno por CUPS, comparadores, renovaciones automáticas. Paridad con el SaaS que se paga hoy.
- **Hito 2 (fin F4-F6)**: "El CRM gestiona el negocio completo" — comisiones, liquidaciones, red de agentes, verificación de venta. Se puede plantear dejar Zoco.
- **Hito 3 (fin F8-F10)**: "Diferencial único en el mercado" — dato físico directo (contador + inversor) combinado con administrativo y comercial. Ninguna plataforma lo tiene. Se reduce/elimina dependencia de Telegest/Segenet/Zoco.

---

## 5. Riesgos y dependencias

| Riesgo | Mitigación |
|---|---|
| Proveedor SIPS (Datadis requiere autorización del cliente) | Empezar con Datadis (ya integrado); valorar agregador comercial para prospección. Decisión en F1. |
| F0 (sprint) se alarga | El roadmap no arranca hasta cerrar circuito de propuestas; respetar prioridad. |
| Acuerdo Telegest bloquea Carril B | Carril A avanza independiente; F8 espera sin frenar valor comercial. |
| Modelo de comisiones complejo (multi-comercializadora) | F4 con catálogo tipo `marketers` de Zoco como referencia; iterar por comercializadora. |
| Seguridad (RGPD, datos de consumo de terceros) | RLS estricto en cada fase, secretos cifrados, sin debug en prod, cabeceras seguras. Auditor en cada PR. |
| Git local corrupto (entorno Juan) | Flujo habitual: Cowork prepara, PowerShell de Juan ejecuta commits/push. |

---

## 6. Siguiente acción concreta
Cuando cierre el sprint (F0), arrancar **F1** con la decisión de proveedor SIPS. Es la fase de mayor relación valor/esfuerzo y desbloquea casi todo el Carril A. En paralelo, gestionar la **FASE 0 de Telegest** (acceso a contadores) para poder lanzar el Carril B sin esperar.

> Documentos relacionados: `DOC1_COMPARATIVO_PLATAFORMAS.md`, `DOC2_MEJORAS_PRIORIZADAS_CRM_VALERE.md`, `PLAN_TELEMEDIDA_FV_DIRECTA_CRM_VALERE.md`, `notas_*.md`.
