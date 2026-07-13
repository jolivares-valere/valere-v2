# Roadmap — Módulo de Energía v2 (CRM Valere)

> Fecha: 2026-07-13 · Basado en `docs/ANALISIS_PLATAFORMAS_ENERGIA_MEJORAS_CRM_2026-07.md` y `docs/PLAN_MODULO_DATADIS_V2.md`.
>
> Objetivo: llevar el CRM Valere al nivel de Linkener/Segenet en explotación del dato energético, manteniendo nuestra fortaleza comercial (oportunidades, renovaciones, comisiones). Rama de trabajo: `claude/datadis-modulo-v2`.

Leyenda de esfuerzo: **S** (1-2 días) · **M** (3-5 días) · **L** (1-2 semanas). Todo apoyado en Datadis (partner ya operativo) + precios que ya tenemos; la telemedida física y el portal cliente quedan para fases posteriores.

---

## Principios (transversales a todos los sprints)
- **Todo en euros**, no solo kWh.
- **Patrón único por módulo**: `SelectorCupsRango` (CUPS + rango de fechas) → cálculo → resultado guardable/exportable.
- **Datos persistidos** (por eso va rápido): nada de pedir a Datadis en vivo en la UI.
- **Resultados accionables**: cada estudio termina en un ahorro €, una recomendación o una **oportunidad** en el CRM.
- No tocar otras fases (libro de ventas, Potencias, comisiones): el worker sigue siendo no-destructivo.

---

## SPRINT 0 — Cimientos de datos (habilitador) · **L**
Sin esto no va nada. Es la capa que hoy falta.
- **S0.1** Migración: reutiliza `datadis_consumptions` (curva horaria ya existente) y añade `datadis_maximetro`, `datadis_contratos` + columnas `es_estimada` y `origen_ref` en `facturas` (ya tenía `origen` y `billed_days`). RLS. **[fichero creado y listo para aplicar: `supabase/migrations/20260713_energia_v2_capa_datos.sql`]** · **S**
- **S0.2** Ampliar worker `datadis-sync`: por CUPS autorizado traer y **persistir** contrato + curva (12–24 meses) + maxímetro. Idempotente, no-destructivo, batches. Incluye endurecimientos de la auditoría 2026-07-13: (B3) detectar colisión `base20` en ambos lados y emitir incidencia `base20_duplicado` en vez de sobrescribir; (B4) cambiar el refresco de incidencias de delete+insert a **upsert ON CONFLICT** sobre `uq_datadis_incidencias_dedupe`. · **M**
- **S0.3** Componente reutilizable **`SelectorCupsRango`** (CUPS + rango de fechas con presets) + hook base `useSerieCups`. · **S**
- **S0.4** Función de agregación mensual `agregar_consumo_mensual(cups, mes, origen)` → `facturas(origen='datadis')`, reutilizando `periodos30TD.ts`. · **M**
- **S0.5 — DECISIÓN FIJADA (Juan + auditor, 2026-07-13):** granularidad y retención de `datadis_consumptions`.
  - **Granularidad = HORARIA completa.** La curva horaria ES el producto (PPAs, propuestas indexadas, optimización); renunciar a ella amputaría el valor del módulo. NO se agrega a media diaria como dato primario.
  - **Ventana rodante de 24 meses por CUPS.** Se sincronizan los últimos 24 meses (lo que necesita un análisis de propuesta). Lo más antiguo: purga o agregado diario. Es lo que evita pagar plan cuando las autorizaciones crezcan a 200+ CUPS.
  - **Volumen:** 85 CUPS ≈ 50–100 MB/año → cabe en plan gratuito; la ventana rodante protege el crecimiento.
  - **Índice `(cups_id, fecha)` desde el día 1** (consulta típica: curva de un CUPS en un rango) — ya creado en la migración.
  - **RGPD:** consumos horarios de personas físicas = dato personal → minimización + retención definida (24 meses) documentada.
  - Implementación: el worker S0.2 sincroniza ventana de 24 meses; job de mantenimiento (cron) purga/agrega lo anterior a 24 meses. · **S**

## SPRINT 1 — Monitorización (la pieza que se ve) · **M**
- **S1.1** Ficha de CUPS con pestañas (Consumo / Potencia / Contrato / Facturas), leyendo de BD. · **M**
- **S1.2** Curva P1–P6 + **mapa de calor** día×hora + comparador de periodos (mes vs mes, laborable vs finde). · **M**
- **S1.3** Magnitudes: activa, **inductiva, capacitiva, cos phi**, potencia, potencia contratada. · **S**
- **S1.4** Export (CSV/Excel/PDF). · **S**

## SPRINT 2 — Potencia y reactiva (ahorro tangible) · **M**
- **S2.1** ⭐ **Optimizador de potencia P1–P6** (coste actual vs óptimo, export a Excel). · **M**
- **S2.2** Detección de excesos de potencia → alerta accionable. · **S**
- **S2.3** Estudio de reactiva / cos phi → aviso de penalización (recomendación batería condensadores). · **S**

## SPRINT 3 — Validación de factura (mayor gancho comercial) · **L**
- **S3.1** Motor de **simulación de factura** desde la curva (energía + potencia + excesos + reactiva + ajustes) usando `boe_regulated_prices` + precios pool. · **L**
- **S3.2** ⭐ **Validación de factura por OCR**: subir PDF → extraer importes reales → comparar con simulada → **Diferencia €/%**. · **L**
- **S3.3** Flujo de revisión ("Pendiente de revisar" → "Revisada") y **creación automática de oportunidad** cuando la diferencia supere un umbral. · **S**

## SPRINT 4 — Cartera y dashboards · **M**
- **S4.1** **Dashboard de cartera en €** con ranking de instalaciones por eficiencia/coste. · **M**
- **S4.2** Comparador **CUPS vs CUPS**. · **S**
- **S4.3** **Dashboards configurables por widgets** + plantillas por rol (telemarketing/analista/asesor) + botón **"Guardar gráfico como widget"**. · **M**
- **S4.4** **Informes programados/recurrentes** (cron + Resend, patrón esios/datadis-sync). · **M**

## SPRINT 5 — Organización, IA y hub · **M**
- **S5.1** **Agrupación jerárquica de CUPS** (grupos/centros) sobre empresa, con consolidación de consumo. · **M**
- **S5.2** **Asistente IA sobre el dato energético** (reutiliza `ask-crm-docs` + `ai-adapter`, nuevo contexto: consumos/potencias/facturas). · **M**
- **S5.3** **Hub "Herramientas"** unificado (agrupa comparadores, buscador de CUPS, optimizador, monitorización, creador de banner). · **S**

## FASES POSTERIORES (no comprometidas)
- **F-SIPS** — Alta de suministro con autorrelleno vía SIPS (retomar SIPS F1). · **M**
- **F-FV** — Panel FV: producción, excedentes, Performance Ratio; cruce autoconsumo FV × consumo × precio pool → informe de ahorro. · **L**
- **F-Canales** — "Mi red" de agentes + correo masivo + informes white-label. · **M**
- **F-Portal** — Portal del cliente estilo Segeapp (facturas, consumos, gráficas, informes, recomendaciones, FV). · **L**
- **F-Telemedida** — Telemedida física en tiempo real (contador propio o integración Linkener/Telegest/Segenet). · **L**

---

## Orden recomendado y dependencias
```
S0 (datos) → S1 (monitorización) → S2 (potencia) → S3 (validación factura)
                                   ↘ S4 (cartera/dashboards)
                                   ↘ S5 (organización/IA/hub)
Fases posteriores: SIPS, FV, Canales, Portal, Telemedida (según prioridad comercial)
```
S0 es requisito de todo. S1–S3 son la columna vertebral (monitorizar → optimizar → validar factura). S4–S5 son producto/escala. Las fases posteriores dependen de decisiones de negocio (hardware, portal cliente).

## Hito comercial mínimo (MVP vendible)
**S0 + S1 + S2.1 (optimizador)** ya permite: entrar en un CUPS, ver su curva y maxímetro al instante, y sacar un informe de ahorro de potencia. Es lo mínimo para demostrar valor a un cliente. La **validación de factura (S3)** es el segundo golpe de efecto.
