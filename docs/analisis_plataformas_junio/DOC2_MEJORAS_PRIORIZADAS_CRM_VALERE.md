# DOC 2 — Propuesta priorizada de mejoras para el CRM Valere

> **Objetivo**: traducir lo aprendido de las 4 plataformas (Telegest, Linkener, Segenet, Zocoenergía) en mejoras concretas para el CRM Valere, priorizadas por impacto y esfuerzo.
>
> **Fecha**: 2026-06-13 · **Autor**: Cowork (Agente 1) · Base: `DOC1_COMPARATIVO_PLATAFORMAS.md`, `notas_*.md`, estado real del repo `valere-v2`.
>
> ⚠️ Este documento NO toca código. El sprint de 7 días vigente (hasta 19/06, cerrar circuito de propuestas) manda; estas mejoras se planifican para después salvo las que ya encajan en el sprint.

---

## 0. Cómo leer esta propuesta

Cada mejora lleva: **qué es**, **de dónde la copiamos**, **qué hay ya en el CRM** (no reinventar), **impacto**, **esfuerzo** y **dependencias**. Las prioridades:

- **P0 — Paridad rápida**: alto impacto, esfuerzo bajo/medio, base ya existente. Cierran la brecha con Zoco casi de inmediato.
- **P1 — Diferenciador**: alto impacto, esfuerzo medio/alto. Nos ponen por delante.
- **P2 — Mejora**: impacto medio, cuando haya hueco.
- **P3 — Estratégico**: el proyecto grande (telemedida/FV directa) — ya tiene su propio plan (DOC 3).

---

## 1. Tabla resumen (priorizada)

| # | Mejora | Origen | Prioridad | Impacto | Esfuerzo |
|---|---|---|---|---|---|
| 1 | **Autorrelleno por CUPS (SIPS + Datadis)** | Zoco | **P0** | Muy alto | Medio |
| 2 | **Buscador de CUPS** (luz/gas, standalone) | Zoco | **P0** | Alto | Bajo |
| 3 | **Alta de contrato por factura (OCR)** | Zoco/Segenet | **P0** | Alto | Bajo-medio |
| 4 | **Recordatorios de renovación + bandeja "Pendientes de renovación"** | Zoco | **P0** | Alto | Bajo |
| 5 | **Rentabilidad €/% por cartera** en dashboard | Zoco | **P0** | Medio | Bajo |
| 6 | **Motor de comisiones + Liquidaciones (PDF/Excel)** | Zoco | **P1** | Muy alto | Alto |
| 7 | **Red de agentes multinivel (organigrama)** | Zoco/Linkener | **P1** | Alto | Medio-alto |
| 8 | **Comparadores** (luz / multipunto / gas) integrados | Zoco/Segenet | **P1** | Alto | Medio |
| 9 | **Optimización de potencia multi-tarifa + automática mensual** | Segenet/Telegest | **P1** | Alto | Medio-alto |
| 10 | **Simulación de factura con pérdidas + coseno φ** | Segenet | **P1** | Alto | Medio |
| 11 | **Verificación de contrato por llamada grabada (Twilio) + SMS** | Zoco | **P1** | Medio-alto | Medio |
| 12 | **Asistente IA por "agentes" sobre datos del cliente** | Linkener | **P2** | Medio | Medio |
| 13 | **Estados de contrato configurables + auditoría de acciones** | Zoco | **P2** | Medio | Bajo-medio |
| 14 | **Mapa de calor de consumo + rankings** en dashboard | Segenet | **P2** | Medio | Bajo |
| 15 | **Validación de factura (real vs simulada/telemedida)** | todas | **P2** | Medio | Medio |
| 16 | **Teleactuación de contador** (cortar/reconectar) | Linkener | **P3** | Bajo (futuro) | Alto |
| 17 | **Telemedida + FV directa** (contador IEC-102 + inversores) | Telegest | **P3** | Muy alto | Muy alto |
| — | **Hardening de seguridad** (a raíz de fallos vistos en Zoco) | Zoco (anti-ejemplo) | **transversal** | Alto | Bajo-medio |

---

## 2. Detalle por mejora

### P0 — Paridad rápida (cerrar brecha con Zoco)

**1. Autorrelleno por CUPS (SIPS + Datadis)**
- **Qué**: al introducir un CUPS en alta de contrato / oportunidad / ficha de empresa, el CRM rellena solo: titular (CIF/NIF), tarifa de acceso, consumo P1-P6, potencia contratada y maxímetros, curva de facturación de los últimos ~12 ciclos, fecha del último cambio de comercializadora.
- **De dónde**: Zoco (`getAPIConsumption`, `getCIFByCUPS`, `getAPIDataForInvoice`). El "cómo": SIPS oficial de las distribuidoras + Datadis, consultado en backend y cacheado.
- **Qué hay ya**: el CRM tiene módulo `datadis` (tokens, consumos, normalizadores 3.0TD) y SIPS a medias. Falta el endpoint unificado "dame todo por CUPS" + el cacheo + el autorrelleno en el formulario.
- **Impacto**: muy alto — es la función estrella de Zoco y la que más acelera el trabajo comercial. **Esfuerzo**: medio. **Dependencia**: acceso a una fuente SIPS (Datadis con autorización del cliente, o un agregador SIPS). Decidir proveedor de SIPS.

**2. Buscador de CUPS standalone**
- **Qué**: herramienta suelta (luz/gas) donde pegas un CUPS y ves potencia/consumo por periodo + gráfica mensual 12 meses, sin crear nada. Para prospección rápida.
- **De dónde**: Zoco (Herramientas → Buscador de CUPS).
- **Qué hay ya**: una vez exista #1, esto es una pantalla fina encima.
- **Impacto**: alto (prospección). **Esfuerzo**: bajo.

**3. Alta de contrato por factura (OCR)**
- **Qué**: subir el PDF de la factura → OCR rellena titular, CUPS, tarifa, consumos, comercializadora actual.
- **De dónde**: Zoco ("Creación por factura"), Segenet ("comprobar facturas").
- **Qué hay ya**: el CRM tiene importador/OCR de facturas (módulo calculadora). Falta conectarlo al alta de contrato y a la creación de oportunidad.
- **Impacto**: alto. **Esfuerzo**: bajo-medio.

**4. Recordatorios de renovación + bandeja "Pendientes de renovación"**
- **Qué**: marcar "recordatorio de renovación a X meses de la activación"; dashboard con tarjeta "Pendientes de renovación"; aviso automático (notificación + email) cuando se acerca.
- **De dónde**: Zoco (flag "11 meses tras activación" + estado dedicado).
- **Qué hay ya**: el CRM tiene módulo `renovaciones` y `notificaciones`. Falta el recordatorio temporal automático y la tarjeta de dashboard.
- **Impacto**: alto (retención de cartera). **Esfuerzo**: bajo.

**5. Rentabilidad €/% por cartera en dashboard**
- **Qué**: KPI de comisión total vs coste, y % de rentabilidad de la cartera de contratos, con desglose por comercializadora/agente.
- **De dónde**: Zoco (Contratos: "Rentabilidad 10.227 € / 98%").
- **Qué hay ya**: dashboards por rol (Fase 28). Falta el cálculo de rentabilidad (requiere comisiones — ver #6).
- **Impacto**: medio. **Esfuerzo**: bajo (una vez exista el dato de comisión).

### P1 — Diferenciadores

**6. Motor de comisiones + Liquidaciones**
- **Qué**: por cada contrato, comisión del asesor y de la empresa según producto/comercializadora; informes de liquidación por agente/comercializadora/fecha con estado liquidado/no; export PDF y Excel.
- **De dónde**: Zoco (Liquidaciones + Productos con fees por tramo de consumo).
- **Qué hay ya**: nada estructurado — Valere lo lleva en Excel. Hay `propuestas`/`contratos` donde colgar la comisión.
- **Impacto**: muy alto (es el corazón del negocio de la asesoría). **Esfuerzo**: alto (modelo de comisiones por comercializadora + liquidación). **Dependencia**: catálogo de productos/comisiones (#8 comparte catálogo).

**7. Red de agentes multinivel (organigrama)**
- **Qué**: jerarquía de agentes/subagentes; comisión del captador y override del superior; permisos por nivel. Idealmente organigrama visual.
- **De dónde**: Zoco (Mi red) + Linkener (organigrama visual drag&drop).
- **Qué hay ya**: roles/auth (`user_profiles`, `useAuth`). Falta la jerarquía y el cálculo en cascada.
- **Impacto**: alto. **Esfuerzo**: medio-alto. **Dependencia**: #6 (comisiones).

**8. Comparadores integrados (luz / multipunto / gas)**
- **Qué**: cargar factura o CUPS → comparar contra catálogo de comercializadoras → tarifa más rentable → propuesta PDF. Multipunto para carteras.
- **De dónde**: Zoco (comparadores) + Segenet (4 métodos de carga: sistema/Excel/SIPS/distribuidora).
- **Qué hay ya**: la calculadora de ofertas del CRM (`retailers`, `retailer_offers`, `boe_regulated_prices`, motor energía) — es justo esto, a falta de unificar con SIPS (#1) y OCR (#3).
- **Impacto**: alto. **Esfuerzo**: medio.

**9. Optimización de potencia multi-tarifa + automática mensual**
- **Qué**: cálculo de potencias óptimas P1-P6 para 2.0TD/3.0TD/6.XTD (no solo 3.0TD como Zoco), doble escenario (cambio de tipo), y **job mensual automático** que recalcula toda la cartera y avisa de ahorros.
- **De dónde**: Telegest (doble escenario, regantes) + Segenet (automático mensual).
- **Qué hay ya**: motor energía + precios CNMC/BOE. Falta el optimizador completo y el job.
- **Impacto**: alto. **Esfuerzo**: medio-alto. **Dependencia**: curva (Datadis #1 o telemedida #17).

**10. Simulación de factura con pérdidas + coseno φ**
- **Qué**: simulación ATR + comercializadora + excedentes + impuestos, con **pérdidas de red por periodo** y **coseno φ** (reactiva) — más fina que el resto.
- **De dónde**: Segenet.
- **Qué hay ya**: calculadora de ofertas (estructura de factura). Falta pérdidas y coseno φ.
- **Impacto**: alto (precisión de propuesta). **Esfuerzo**: medio.

**11. Verificación de contrato por llamada grabada (Twilio) + SMS**
- **Qué**: lanzar llamada de verificación grabada desde el CRM, guardar el audio en el contrato, estado "Firmado-Llamada verificada"; SMS al cliente.
- **De dónde**: Zoco (Twilio: `startCall`, `downloadNaturgyCall`, `send-sms`).
- **Qué hay ya**: nada. Integración nueva (Twilio).
- **Impacto**: medio-alto (cumplimiento normativo de la venta). **Esfuerzo**: medio.

### P2 — Mejoras

**12. Asistente IA por "agentes" sobre datos del cliente** — ampliar el asistente RAG actual (`ask-crm-docs`) a agentes que respondan sobre suministros/contratos/facturación de un cliente concreto (origen: Linkener Link·IA). Impacto medio, esfuerzo medio. Base ya existe (RAG).

**13. Estados de contrato configurables + auditoría de acciones** — estados personalizables por la asesoría + log de quién hizo qué (origen: Zoco "Configuración de estados" + "Registros"). Refuerza trazabilidad/RGPD. Esfuerzo bajo-medio.

**14. Mapa de calor de consumo + rankings** en dashboard (origen: Segenet). Detecta patrones y da vista comercial. Esfuerzo bajo (con la curva ya disponible).

**15. Validación de factura (real vs simulada / telemedida)** — contrastar factura cargada con la simulación; desviación >2% = incidencia (origen: las cuatro). Esfuerzo medio.

### P3 — Estratégico

**16. Teleactuación de contador** (cortar/reconectar remoto) — origen Linkener. Capacidad avanzada, requiere acceso de control al contador (no solo lectura). Futuro lejano. Esfuerzo alto.

**17. Telemedida + FV directa** (contador IEC-102 + inversores cloud) — **el proyecto grande**, ya con plan propio y POCs reales. Ver **DOC 3 / `PLAN_TELEMEDIDA_FV_DIRECTA_CRM_VALERE.md`**. Es lo que de verdad pone a Valere por delante de TODAS las plataformas (ninguna combina dato físico + administrativo + CRM). Bloqueado por FASE 0 (acuerdo de acceso con Telegest).

### Transversal — Hardening de seguridad (aprendido de los fallos de Zoco)
A raíz de lo visto en Zoco (APP_DEBUG=true en producción con stack traces, posible IDOR multitenant en `/api/enterprises/:id`, catálogo de comisiones expuesto, sin HSTS/X-Frame-Options), reforzar en el CRM Valere — coherente con la prioridad de seguridad ALTA (RGPD):
- **RLS estricto por `empresa_id`/`comercial_id`** en TODA tabla nueva (telemetría, comisiones, etc.) — nunca confiar en filtrado de frontend (ya es regla del proyecto, aplicarla sin excepción al crecer).
- Producción sin modo debug; errores sin stack trace al cliente.
- Cabeceras **HSTS + X-Frame-Options + CSP**.
- No exponer catálogos completos (comisiones, productos) a cualquier usuario autenticado — filtrar por permisos.
- 2FA para roles admin.
- **Esfuerzo**: bajo-medio. **Impacto**: alto (evita la brecha que Zoco sí tiene).

---

## 3. Hoja de ruta sugerida (después del sprint actual)

**Bloque A — "Igualar a Zoco" (P0, ~2-3 semanas)**: #1 SIPS+Datadis por CUPS → #2 Buscador de CUPS → #3 Alta por factura (OCR) → #4 Renovaciones → #5 Rentabilidad. Cierra la brecha con el SaaS que Valere paga hoy.

**Bloque B — "Superar a Zoco" (P1)**: #6 Comisiones + #7 Red multinivel (juntos) → #8 Comparadores unificados → #9 Optimización potencia + #10 Simulación fina → #11 Twilio. Convierte el CRM en la herramienta comercial completa.

**Bloque C — "Diferencial único" (P3)**: #17 Telemedida + FV directa (DOC 3), en cuanto FASE 0 (Telegest) esté acordada. Es lo que ninguna plataforma tiene.

**Transversal y continuo**: hardening de seguridad en cada incremento.

> Prioridad inmediata real: **no romper el sprint de 7 días**. De estas mejoras, las que encajan en "cerrar el circuito de propuestas" (comparadores #8, simulación #10, rentabilidad #5) pueden alinearse; el resto entra después.
