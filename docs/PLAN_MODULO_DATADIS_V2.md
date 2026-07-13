# Plan de diseño — Módulo Datadis v2 (CRM Valere)

> Fecha: 2026-07-11 · Autor: sesión Cowork · Estado: PROPUESTA (pendiente de OK de Juan sobre alcance del Sprint 1)
>
> Objetivo de Juan: "solucionar el módulo de conexión de Datadis tal como aparece en el CRM y mejorar el diseño del contenido para tener un módulo con el que se pueda **trabajar** la información que da Datadis". Referencia: plataformas Linkener, Telegest y Segenet (para inspirarnos, no para contratar necesariamente).

---

## 1. Audiencia y visión por fases (según Juan)

1. **Fase A — Interno Valere** (asesores). Es lo que construimos primero.
2. **Fase B — Comerciales externos / canales**. Acceso con permisos, modelo white-label ("Valere sigue siendo la cara").
3. **Fase C — Portal del cliente**. El cliente entra y ve sus suministros con datos útiles: facturas, consumos, gráficas, informes, recomendaciones, plantas FV.

El diseño de datos se hace desde el día 1 pensando en las tres fases (RLS por rol, datos persistidos reutilizables), aunque solo construyamos la Fase A ahora.

---

## 2. Auditoría de plataformas de referencia (qué copiar)

Auditoría web realizada 2026-07-11. Fuentes al final.

### Linkener (linkener.com) — la más parecida a Valere
- **Partner oficial de Datadis**; arranca 100% software sin hardware (igual que nosotros).
- Panel **multi-CUPS / multi-empresa** para el asesor ("monitorizo todos mis clientes desde un sitio").
- **Validador de factura con IA** (compara Datadis vs lo facturado).
- **Gestor de penalizaciones** de potencia (recomienda potencia óptima).
- **Linkener Hub**: integra con ERP/CRM (Holded, SAP, Odoo, HubSpot, PowerBI…) vía API/CSV/sFTP.
- Todo **en euros**, no en kWh.

### Telegest (energygest.com) — industrial / white-label
- Multi-suministro (luz/gas/agua), multi-usuario, multi-acceso.
- Modelo **canal**: "Cliente final gestionado por mediación del profesional" (white-label explícito).
- Alarmas configurables, informes múltiples, estudios de optimización.

### Segenet (segenet.es) — la más cercana al PORTAL DEL CLIENTE (Fase C)
- Producto **"Segeapp"**: app personalizada para el cliente final.
- "**Entiende tu factura**" con gráficas sencillas; consumo en tiempo real; **comprobar y reclamar facturas**.
- **Optimizar consumo** (adaptar a franja más barata), **alertas por reactiva y exceso de potencia**, **informes mensuales** y **comparativas entre periodos**.
- Dos modos: **"Para mí"** (particular) y **"Para mis clientes"** (canal) → valida la visión de fases de Valere.
- Tiempo real vía **contador propio** (telemedida física).

### Gestinel (gestinel.net) — la más potente técnicamente
- **Verificación de factura línea a línea** (curva × OMIE × peajes ATR CNMC × ajustes REE).
- **Optimizador de potencia P1–P6** (metodología maxímetro ≤50 kW / perfil de carga >50 kW), coste actual vs óptimo, **export a Excel**.
- Panel FV con **Performance Ratio** real vs teórico.
- Asistente **IA** en lenguaje natural sobre consumos/facturas.

### Conclusión de la auditoría
El **~75% del valor** de estas plataformas se puede construir **solo con Datadis** (get-supplies, get-contract-detail, get-consumption-data, get-max-power) + tablas de precios regulados que Valere ya tiene (`boe_regulated_prices`, precios pool). Solo la telemedida en tiempo real (minuto/cuarto-horario sin retardo) y parte del FV intradía necesitan hardware o integración con estas plataformas.

---

## 3. Qué hay ya construido en el CRM (no rehacer)

- **`datadis-proxy`** (Edge Function) + caché + **normalizadores 30TD** (P1–P6) testeados (`src/features/datadis/normalizers.ts`, `periodos30TD.ts`, `holidays-es.ts`).
- **`datadis-sync`** (worker v8, partner authorizedNif, base20) que hoy trae CUPS + distribuidora + tipo de punto y escribe incidencias.
- **`SupplyDetailPage.tsx`**: pantalla de CUPS con pestañas ya esbozadas (Información, Contrato, Curva 24m, Cierres/potencias, Reactiva, Consumo) — **pero pide datos en vivo a Datadis (lento) y NO los persiste**.
- **`cups`**, **`empresas`**, **`contratos`**, **`facturas`** (con `consumption_p1..p6`, `surplus_p1..p6`), **`boe_regulated_prices`**, precios pool OMIE.
- Alarma de incidencias Datadis en Dashboard (hecha ayer).

**El hueco central:** los datos de consumo/potencia/contrato **no se guardan** → no se pueden "trabajar" (analizar, graficar rápido, informar, verificar factura).

---

## 4. Arquitectura objetivo del Módulo Datadis v2

```
Datadis (API partner)
  └─ worker datadis-sync (amplía): por CUPS autorizado trae y PERSISTE
       · get-contract-detail  → datadis_contratos
       · get-consumption-data → datadis_consumos (curva horaria)
       · get-max-power        → datadis_maximetro
  └─ agregación mensual → facturas(origen='datadis')  [reutiliza periodos30TD]
       └─ Frontend (rápido, desde BD):
            · Ficha de CUPS con pestañas (Consumo/Potencia/Contrato/Facturas/Alarmas)
            · Dashboard de cartera en €
            · Optimizador de potencia
            · Verificación de factura
            · (Fase C) Portal cliente estilo Segeapp
```

### Tablas nuevas propuestas
- **`datadis_consumos`** (`cups_id`, `ts` horario, `kwh`, `kwh_excedente`, `periodo` P1–P6, `origen`) — UNIQUE(cups_id, ts). Idempotente.
- **`datadis_maximetro`** (`cups_id`, `mes`/`fecha`, `periodo`, `potencia_max_kw`).
- **`datadis_contratos`** (`cups_id`, tarifa_acceso, comercializadora, potencias contratadas P1–P6, fechas).
- Puente a **`facturas`** (`origen='datadis'`, `periodo_dias` real para no estimar de más).

Precedencia de origen: `manual`/`telemedida` nunca se pisan; `datadis` gana a `sips`.

---

## 5. Funcionalidades priorizadas (valor/coste)

| # | Funcionalidad | Datos | Fase |
|---|---|---|---|
| 1 | Ficha de CUPS con pestañas colgando de empresa | Datadis | A |
| 2 | Curva de carga + comparador de periodos | Datadis | A |
| 3 | ⭐ Optimizador de potencia P1–P6 (ahorro €, export Excel) | Datadis | A |
| 4 | Detección de excesos de potencia (alerta) | Datadis | A |
| 5 | ⭐ Verificación/simulación de factura (deberías pagar vs te facturan) | Datadis + precios | A/B |
| 6 | Dashboard de cartera en € + ranking de instalaciones | Datadis | A/B |
| 7 | Alarmas configurables (exceso, reactiva, hueco de lectura, anómalo) | Datadis (+física para reactiva fina) | B |
| 8 | Comparador CUPS vs CUPS | Datadis | B |
| 9 | Asistente IA sobre consumos/facturas (reusa Gemini+RAG) | Datadis | B |
| 10 | Panel FV: producción, excedentes, Performance Ratio | Datadis excedentes + API inversor | B/C |
| 11 | Alta de suministro con autorrelleno SIPS | SIPS | transversal |
| 12 | Portal cliente estilo Segeapp (facturas, consumos, informes, recomendaciones) | Datadis | C |
| 13 | Telemedida física tiempo real | hardware / Linkener-Telegest-Segenet | futuro |

---

## 6. Principios de diseño / UX (copiados de la auditoría)

1. **Todo en euros, no en kWh** (Linkener, Gestinel).
2. Pantalla estrella: **factura "deberías pagar vs te facturan"** con el delta resaltado (Gestinel/Segenet "reclamar factura").
3. **Optimizador con coste actual vs óptimo por periodo** y botón exportar (Gestinel).
4. **Vista de cartera del gestor** con KPIs y ranking (Linkener), distinta de la vista del cliente.
5. **Asistente IA con preguntas sugeridas** (chips) — reusa `AsistentePanel`.
6. **White-label**: informes con marca Valere (Telegest/Segenet) — reusa `generar-propuesta-pptx`.
7. **Alertas accionables** ("qué pasó y qué hacer"), no genéricas.
8. **Gráficas sencillas** entendibles por el cliente (Segenet) para la Fase C.

---

## 7. SPRINT 1 propuesto (Fase A, interno)

Objetivo: que el módulo deje de pedir datos en vivo y pase a **trabajar datos persistidos**, con las 3 pantallas de mayor valor.

- **DV2-1** Migración: tablas `datadis_consumos`, `datadis_maximetro`, `datadis_contratos` + RLS + columnas puente en `facturas`.
- **DV2-2** Ampliar worker `datadis-sync`: por CUPS autorizado, traer y persistir contrato + curva (12–24 meses) + maxímetro. Idempotente, no-destructivo, batches.
- **DV2-3** Rediseñar `SupplyDetailPage` para leer de BD (rápido): pestañas Consumo (curva + comparador), Potencia (maxímetro), Contrato.
- **DV2-4** ⭐ Optimizador de potencia P1–P6 (coste actual vs óptimo, export). Alta visibilidad comercial.
- **DV2-5** Doc RAG + tests + PR.

Fuera de Sprint 1: verificación de factura (#5), dashboard cartera (#6), alarmas avanzadas, portal cliente (Fase C), telemedida física.

### Decisiones abiertas para Juan
- **Alcance Sprint 1**: ¿empezamos por Optimizador de potencia (#3) o por Verificación de factura (#5) como primera "estrella"?
- **Histórico de curva a guardar**: 12 vs 24 meses (Datadis da ~2 años).
- **Cuartohorario vs horario**: horario es suficiente para casi todo; el cuartohorario multiplica el volumen. Propuesta: horario.

---

## 8. Fuentes de la auditoría (2026-07-11)
- Linkener: https://linkener.com/ · /datadis/ · /gestor-de-penalizaciones/ · /integraciones/
- Telegest (Energygest): https://www.energygest.com/telegest/
- Segenet: https://segenet.es/ · https://segenet.es/segeapp/ · https://segenet.es/productos/
- Gestinel: https://gestinel.net/ · https://gestinel.net/gestinel_landing.html
- Diseño previo interno: docs/DISENO_DATADIS_PUENTE_2026-06-14.md, docs/DISENO_TELEMEDIDA_2026-06-14.md, docs/DISENO_FV_MULTIPLATAFORMA_2026-06-14.md
