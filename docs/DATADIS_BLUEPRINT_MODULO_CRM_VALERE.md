# Blueprint técnico: Módulo Datadis en CRM Valere

> **Versión**: 1.0  
> **Fecha**: 2026-05-13  
> **Autor**: Sesión Cowork + auditoría Claude in Chrome (51 pasos sobre plataforma real)  
> **Propósito**: Blueprint de referencia para desarrollar el módulo energético del CRM. No replicar la UI de Datadis — absorber sus datos, normalizarlos y convertirlos en inteligencia comercial.

---

## Regla de oro — Protocolo de normalización

> **Ningún endpoint Datadis se normaliza sin payload real capturado y documentado.**

Orden obligatorio antes de implementar cualquier normalizador:

1. Capturar payload real (Claude Browser o logs de proxy)
2. Guardar ejemplo en `docs/datadis/payloads/<endpoint>_<distributor>_<date>.json`
3. Escribir DTO raw basado en ese payload (campos exactos, no asumidos)
4. Escribir normalizador
5. Validar numéricamente contra los datos capturados
6. Solo entonces: UI

**Payloads capturados y verificados:**

| Endpoint | Distribuidora | Archivo |
|---|---|---|
| `get_contractual` | EDISTRIBUCIÓN | — (pendiente documentar) |
| `get_max_power` | EDISTRIBUCIÓN | — (pendiente documentar) |
| `get_reactive` | EDISTRIBUCIÓN | — (pendiente documentar) |
| `get_consumption` | EDISTRIBUCIÓN | `docs/datadis/payloads/get_consumption_EDISTRIBUCION_2026-05-13.json` |

Por qué esta regla: `tsc --noEmit = 0` solo verifica que el código compila con los tipos declarados.
No verifica que los campos existan en el payload real. El error puede estar en la premisa de datos, no en la sintaxis.

---

## Lección crítica de la sesión 2026-05-13

Antes de cualquier diseño de dashboards, hay que leer esta lección:

> Datadis SÍ tenía todos los datos. El CRM los descartaba silenciosamente porque el frontend
> no sabía interpretar los shapes distintos que devuelve la API según la distribuidora:
>
> - `{ response: [...] }` en lugar de `[...]` directo
> - `{ response: { energy: [...] } }` para reactiva (objeto anidado, no array)
> - Campos en español (`fechaMaximo`, `maximoPotenciaDemandada`, `tarifaAcceso`)
>   mezclados con campos en inglés según el endpoint
> - `codigoProvincia` en EDISTRIBUCIÓN vs `codProvincia` en otros portales

**Consecuencia arquitectónica obligatoria**: todos los datos de Datadis deben pasar por una capa de normalización en el backend antes de llegar al frontend. El frontend solo consume DTOs canónicos tipados.

---

## Arquitectura objetivo

```
Datadis API (EDISTRIBUCIÓN / i-DE / UFD / Viesgo / Naturgy...)
        ↓
datadis-proxy (Edge Function Supabase)
  → normalizeContract()
  → normalizeMaxPower()
  → normalizeReactive()
  → normalizeConsumption()
  → normalizeSupply()
        ↓
Tablas de caché Supabase (DTOs canónicos, con timestamp)
  datadis_contract_cache
  datadis_maxpower_cache
  datadis_reactive_cache
  datadis_consumption_cache
  datadis_sync_audit
        ↓
Frontend CRM Valere
  → solo consume interfaces tipadas
  → cero lógica de aliasing
  → cero Array.isArray() defensivos
```

El modelo a perseguir a largo plazo:

```
Datadis / FusionSolar / REE / OMIE
        ↓
Provider layer (Edge Functions)
        ↓
Normalización → DTOs canónicos
        ↓
Energy Data Hub VALERE (BD)
        ↓
CRM, facturas, comparativas, alertas, informes
```

---

## Parte 1: Inventario completo de datos disponibles en Datadis

Datos verificados sobre la plataforma real datadis.es mediante auditoría de 51 pasos (mayo 2026).

### 1.1 Sección Consumo

#### Vista Diaria
- Consumo total diario (kWh) — ej. 50,8 kWh
- Consumo medio horario (kWh) — ej. 2,12 kWh
- Distribución por períodos tarifarios P1-P6 (donut)
- Granularidad horaria: 24 valores/día (00:00 a 23:00)
- Selector de fecha exacta (calendario)
- Navegación día anterior / día siguiente

#### Vista Mensual
- Consumo total mensual (kWh)
- Distribución por períodos P1-P6
- Comparativa mes a mes
- Tooltip: `"2105,764 kWh Ene 2026"`

#### Vista Anual
- Consumo total anual (kWh) — ej. 22.243,19 kWh
- Consumo medio mensual (kWh) — ej. 1.853,6 kWh
- Distribución por 6 períodos tarifarios (donut)
- Gráfico de barras mensuales en dos modos:
  - **Apiladas**: suma con segmentos por período
  - **Agrupadas**: barras separadas por período

#### Comparativa Geográfica (disponible en vista Diaria)
- Consumo total diario del CUPS (kWh) — ej. 176,61 kWh
- Consumo medio diario de la Comunidad Autónoma (kWh)
- Tres niveles de comparación: Comunidad Autónoma / Provincia / Municipio

### 1.2 Sección Energía Reactiva
- Energía reactiva en kVArh (valores negativos = capacitiva)
- Solo vista Anual disponible
- Selector de año y navegación año anterior/siguiente
- Gráfico de barras mensual descompuesto por períodos tarifarios
- Códigos de color por período (P4 amarillo, P5, P6...)
- Tooltip: `"May 2026 - P4: -134,276 kVArh"`
- **Importancia técnica**: detectar penalizaciones por reactiva, eficiencia cos φ — crítico en tarifas industriales (3.0TD, 6.1TD)

### 1.3 Sección Potencias Máximas
- Selector de período (P1 a P6)
- Tarjeta comparativa:
  - Potencia contratada (barra naranja)
  - Potencia máxima demandada (barra amarilla)
- Gráfico: "Potencia máxima demandada anualmente (kW)" — ej. 50,3 kW
- Año seleccionable
- **Uso comercial**:
  - Si demanda_max < contratada: potencial ahorro por bajada de potencia
  - Si demanda_max ≈ contratada: riesgo de penalizaciones por excesos

### 1.4 Sección Contrato
- CUPS (identificador único)
- Fecha inicio y fin de contrato (fin = 9999/01/01 significa indefinido)
- Fecha último cambio de comercializadora
- Tarifa de acceso (2.0TD, 3.0TD, 6.1TD, BAJA TENSION Y POTENCIA > 15 kW...)
- Tensión de conexión (baja / media tensión)
- Potencias contratadas por período P1-P6 (kW) — ej. 17,1 kW en los 6 períodos
- Modo de control de potencia (Maxímetro / ICP)
- Discriminación horaria (sí/no)
- Potencia máxima de la instalación
- Dirección completa (provincia, municipio, código postal, calle)
- Empresa titular

### 1.5 Otras secciones de la plataforma
- **Mis Suministros**: lista de CUPS, filtros por CUPS/provincia/municipio/CP/dirección/distribuidora, gestión de autorizaciones de terceros, botón de refresco
- **Mis Grupos**: agrupaciones de CUPS para análisis consolidado de múltiples suministros
- **Mis Informes**: reportes adhoc personalizados y automatizados programables
- **Centro de Descargas**: formatos CSV, JSON, XML para cada gráfico
- **API REST privada**: acceso programático a todos los datos anteriores; también da acceso a datos agregados por zona, sector y potencia

---

## Parte 2: Shapes reales de la API Datadis (lección del 2026-05-13)

Esta sección documenta los formatos reales observados en producción. Son diferentes de lo que la documentación oficial implica.

### get_contractual (EDISTRIBUCIÓN)
```json
{
  "response": [
    {
      "tarifaAcceso": "3.0TD",
      "comercializador": "ENDESA ENERGIA SA",
      "fechaInicio": "2002/12/18",
      "fechaFin": "9999/01/01",
      "potenciaContratada": [17.1, 17.1, 17.1, 17.1, 17.1, 17.1],
      "tension": "1"
    }
  ]
}
```
Nota: `potenciaContratada` es un array de 6 valores (P1..P6), no 6 campos separados.

### get_max_power (EDISTRIBUCIÓN)
```json
{
  "response": [
    {
      "fechaMaximo": "2026/01/15 08:00",
      "periodo": 1,
      "maximoPotenciaDemandada": 42.3
    }
  ]
}
```

### get_reactive (EDISTRIBUCIÓN)
```json
{
  "response": {
    "code": 200,
    "cups": "ES0031104950142010SA0F",
    "energy": [
      {
        "date": "2026/01",
        "energyP1": 0,
        "energyP2": 0,
        "energyP3": 0,
        "energyP4": -134.276,
        "energyP5": 0,
        "energyP6": 0
      }
    ]
  }
}
```
Nota: `response` es un objeto, no un array. Los datos están en `response.energy[]`.

### get_supplies
```json
[
  {
    "cups": "ES0031104950142010SA0F",
    "distribuidora": "EDISTRIBUCION REDES DIGITALES SLU",
    "tipoPunto": "1",
    "codigoProvincia": "41",
    "fechaVigenciaDesde": "2002/12/18"
  }
]
```
Nota: usa `codigoProvincia`, no `codProvincia` ni `cod_provincia`.

---

## Parte 3: Modelo de datos canónico (DTOs)

Estos son los tipos que el frontend debe consumir. Nunca los shapes raw de Datadis.

```typescript
// ─── DTOs canónicos ───────────────────────────────────────────────

export interface ContractDTO {
  cups: string
  tariff: string | null          // "3.0TD", "2.0TD", "6.1TD"...
  marketer: string | null        // Comercializadora
  distributor: string | null     // Distribuidora
  tension: string | null         // "1" = BT, "2" = MT
  startDate: string | null       // YYYY-MM-DD o YYYY/MM/DD
  endDate: string | null         // null si 9999/01/01 → indefinido
  powers: number[]               // Array[6] P1..P6 en kW; 0 si no existe
  controlMode: string | null     // "Maxímetro" | "ICP"
  maxInstalledPower: number | null
}

export interface MaxPowerDTO {
  cups: string
  month: string                  // YYYY-MM
  period: number                 // 1..6
  contractedKw: number           // Potencia contratada en ese período
  maxKw: number                  // Máxima demandada
  maxTimestamp: string | null    // Momento exacto del máximo
  utilizationPct: number         // maxKw / contractedKw * 100 (calculado)
}

export interface ReactiveDTO {
  cups: string
  month: string                  // YYYY-MM
  energyP1: number               // kVArh (puede ser negativo: capacitiva)
  energyP2: number
  energyP3: number
  energyP4: number
  energyP5: number
  energyP6: number
  totalKvarh: number             // suma P1..P6 (calculado)
  cosFiEstimated: number | null  // calculado si hay consumo activo del mismo mes
  penaltyApplicable: boolean     // reactiva > consumo * 0.33
}

export interface ConsumptionHourlyDTO {
  cups: string
  timestamp: string              // ISO 8601
  consumptionKwh: number
  surplusKwh: number             // Excedente (autoconsumo); 0 si no aplica
  period: number                 // 1..6
  isEstimated: boolean           // Lectura estimada vs real
}

export interface ConsumptionMonthlyDTO {
  cups: string
  month: string                  // YYYY-MM
  totalKwh: number
  byPeriod: Record<`P${1|2|3|4|5|6}`, number>  // Consumo por período
  surplusTotalKwh: number        // Excedentes del mes (autoconsumo)
}

export interface GeoBenchmarkDTO {
  cups: string
  date: string                   // YYYY-MM-DD
  cupsKwh: number
  ccaaAvgKwh: number
  provinciaAvgKwh: number
  municipioAvgKwh: number
  deviationFromCcaaPct: number   // (cupsKwh - ccaaAvgKwh) / ccaaAvgKwh * 100
}

export interface SupplyDTO {
  cups: string
  distribuidora: string
  provinciaCode: string
  municipio: string
  cp: string
  direccion: string
  tipoAcceso: string
  fechaVigenciaDesde: string | null
}
```

---

## Parte 4: Normalizers obligatorios

Archivo a crear: `src/features/datadis/normalizers.ts`

```typescript
// ─── Tipos raw (input sin garantías, cualquier distribuidora) ──────

type RawContractualEdistrib = {
  tarifaAcceso?: string; comercializador?: string
  fechaInicio?: string; fechaFin?: string
  potenciaContratada?: number[]; tension?: string
}

type RawContractualGeneric = {
  accessFare?: string; marketer?: string
  startDate?: string; endDate?: string
  contractedPowerkWP1?: number; contractedPowerkWP2?: number
  contractedPowerkWP3?: number; contractedPowerkWP4?: number
  contractedPowerkWP5?: number; contractedPowerkWP6?: number
}

// ─── Normalizers ──────────────────────────────────────────────────

export function normalizeContract(raw: unknown): ContractDTO | null {
  if (!raw) return null
  const r = raw as any
  // Extraer si viene envuelto en { response: [...] }
  const item = Array.isArray(r) ? r[0]
    : Array.isArray(r?.response) ? r.response[0]
    : r
  if (!item) return null

  const powers = (() => {
    if (Array.isArray(item.potenciaContratada)) return item.potenciaContratada
    return [
      item.contractedPowerkWP1 ?? 0,
      item.contractedPowerkWP2 ?? 0,
      item.contractedPowerkWP3 ?? 0,
      item.contractedPowerkWP4 ?? 0,
      item.contractedPowerkWP5 ?? 0,
      item.contractedPowerkWP6 ?? 0,
    ]
  })()

  return {
    cups: item.cups ?? '',
    tariff: item.tarifaAcceso ?? item.accessFare ?? null,
    marketer: item.comercializador ?? item.marketer ?? null,
    distributor: item.distribuidora ?? item.distributor ?? null,
    tension: item.tension ?? null,
    startDate: item.fechaInicio ?? item.startDate ?? null,
    endDate: (() => {
      const d = item.fechaFin ?? item.endDate ?? null
      return (d === '9999/01/01' || d === '9999-01-01') ? null : d
    })(),
    powers: Array.from({ length: 6 }, (_, i) => powers[i] ?? 0),
    controlMode: item.modoControlPotencia ?? item.controlMode ?? null,
    maxInstalledPower: item.potenciaMaxInstall ?? item.maxInstalledPower ?? null,
  }
}

export function normalizeMaxPower(raw: unknown, contractedKw = 0): MaxPowerDTO[] {
  if (!raw) return []
  const r = raw as any
  const arr: any[] = Array.isArray(raw) ? raw
    : Array.isArray(r?.response) ? r.response
    : []
  return arr.map(p => {
    const maxKw = Number(p.maximoPotenciaDemandada ?? p.maxPower ?? 0)
    const contracted = contractedKw || Number(p.potenciaContratada ?? 0)
    return {
      cups: p.cups ?? '',
      month: String(p.fechaMaximo ?? p.date ?? '').slice(0, 7).replace(/\//g, '-'),
      period: Number(p.periodo ?? p.period ?? 1),
      contractedKw: contracted,
      maxKw,
      maxTimestamp: p.fechaMaximo ?? p.date ?? null,
      utilizationPct: contracted > 0 ? Math.round(maxKw / contracted * 100) : 0,
    }
  })
}

export function normalizeReactive(raw: unknown): ReactiveDTO[] {
  if (!raw) return []
  const r = raw as any
  const arr: any[] = Array.isArray(raw) ? raw
    : Array.isArray(r?.response?.energy) ? r.response.energy
    : Array.isArray(r?.response) ? r.response
    : []
  return arr.map(p => {
    const vals = [1,2,3,4,5,6].map(i => Number(p[`energyP${i}`] ?? 0))
    const total = vals.reduce((a, b) => a + b, 0)
    return {
      cups: p.cups ?? '',
      month: String(p.date ?? '').slice(0, 7).replace(/\//g, '-'),
      energyP1: vals[0], energyP2: vals[1], energyP3: vals[2],
      energyP4: vals[3], energyP5: vals[4], energyP6: vals[5],
      totalKvarh: total,
      cosFiEstimated: null,     // requiere consumo activo del mismo mes para calcular
      penaltyApplicable: false, // calcular con los datos de consumo activo
    }
  })
}

export function normalizeConsumption(raw: unknown): ConsumptionMonthlyDTO[] {
  if (!raw) return []
  const r = raw as any
  const arr: any[] = Array.isArray(raw) ? raw
    : Array.isArray(r?.response) ? r.response
    : []
  return arr.map(p => {
    const byPeriod = {
      P1: Number(p.consumptionP1 ?? p.consumoP1 ?? 0),
      P2: Number(p.consumptionP2 ?? p.consumoP2 ?? 0),
      P3: Number(p.consumptionP3 ?? p.consumoP3 ?? 0),
      P4: Number(p.consumptionP4 ?? p.consumoP4 ?? 0),
      P5: Number(p.consumptionP5 ?? p.consumoP5 ?? 0),
      P6: Number(p.consumptionP6 ?? p.consumoP6 ?? 0),
    }
    return {
      cups: p.cups ?? '',
      month: String(p.date ?? p.fecha ?? '').slice(0, 7).replace(/\//g, '-'),
      totalKwh: Number(p.consumo ?? p.totalConsumption ?? Object.values(byPeriod).reduce((a,b) => a+b, 0)),
      byPeriod: byPeriod as ConsumptionMonthlyDTO['byPeriod'],
      surplusTotalKwh: Number(p.surplusEnergyKWh ?? p.excedente ?? 0),
    }
  })
}
```

---

## Parte 5: Tablas de caché y sincronización

Las tablas ya existentes en Supabase son el proxy cache. A largo plazo deben ampliarse:

```sql
-- Estado actual (existente):
-- datadis_proxy_cache: caché genérica clave-valor

-- Estructura objetivo (por fases):

-- Fase 2:
CREATE TABLE datadis_contract_cache (
  cups TEXT NOT NULL,
  raw JSONB NOT NULL,
  dto JSONB NOT NULL,          -- ContractDTO normalizado
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cups)
);

CREATE TABLE datadis_maxpower_cache (
  cups TEXT NOT NULL,
  year INT NOT NULL,
  raw JSONB NOT NULL,
  dto JSONB NOT NULL,          -- MaxPowerDTO[] normalizado
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cups, year)
);

CREATE TABLE datadis_reactive_cache (
  cups TEXT NOT NULL,
  year INT NOT NULL,
  raw JSONB NOT NULL,
  dto JSONB NOT NULL,          -- ReactiveDTO[] normalizado
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cups, year)
);

-- Fase 3 (histórico real):
CREATE TABLE datadis_consumption_monthly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cups TEXT NOT NULL,
  month DATE NOT NULL,         -- primer día del mes
  total_kwh NUMERIC(10,3),
  surplus_kwh NUMERIC(10,3) DEFAULT 0,
  by_period JSONB,             -- {P1:0, P2:0, ...P6:0}
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cups, month)
);

CREATE TABLE datadis_consumption_hourly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cups TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  kwh NUMERIC(8,4) NOT NULL,
  surplus_kwh NUMERIC(8,4) DEFAULT 0,
  period SMALLINT,
  is_estimated BOOLEAN DEFAULT false,
  UNIQUE (cups, ts)
);
-- Índice crítico para queries de rango:
CREATE INDEX idx_consumption_hourly_cups_ts ON datadis_consumption_hourly (cups, ts DESC);
```

**Volumen estimado para 70 CUPS**:
- Horario (5 años): 70 × 24 × 365 × 5 ≈ 3,07M filas — manejable con índices
- Mensual (5 años): 70 × 60 ≈ 4.200 filas — trivial

---

## Parte 6: Dashboards a implementar

Los dashboards listados por orden de prioridad para el equipo de desarrollo.

### Dashboard 1 — Vista ejecutiva del cliente (Empresa)
Agrupa todos los CUPS de una empresa. KPIs:
- Consumo total anual (suma de todos los CUPS)
- Coste estimado (aplicando precio medio del mercado si no hay factura real)
- Reactiva total (alerta si aplica penalización)
- CUPS con potencia sobredimensionada (demanda < 85% contratada)
- CUPS con riesgo de exceso (demanda > 95% contratada)
- Eficiencia vs CCAA (posición relativa)

### Dashboard 2 — Detalle de CUPS
Tabs individuales por tipo de dato:
- **Consumo**: gráfico interactivo día/semana/mes/año; barras apiladas y agrupadas por P1-P6
- **Contrato**: tarifa, comercializadora, potencias contratadas, fechas
- **Cierres**: potencia máxima demandada vs contratada por mes y período
- **Reactiva**: kVArh por período, detección de penalización
- **Comparativa geográfica**: CUPS vs CCAA/Provincia/Municipio
- **Excedentes**: generación y vertido (solo si tiene autoconsumo)

### Dashboard 3 — Optimización energética
Análisis automatizado para uso comercial:
- Detección de potencias mal dimensionadas
- Alertas de exceso en demanda máxima
- Recomendaciones de bajada de potencia (si demanda < 85% durante 3+ meses consecutivos)
- Análisis de reactiva y proyección de penalizaciones
- Simulación de coste con tarifa alternativa

### Dashboard 4 — Revisión de facturas
- Conciliación: lectura Datadis vs lectura en factura
- Detección de anomalías (lecturas no coincidentes)
- Cálculo independiente del coste teórico vs facturado
- Histórico de desviaciones por comercializadora

### Dashboard 5 — Generación y excedentes (autoconsumo)
Solo para CUPS con instalación FV registrada:
- Energía generada (kWh)
- Autoconsumo efectivo (kWh)
- Excedente vertido a red (kWh)
- Ratio de autoconsumo (%)
- Valoración del excedente (€)

---

## Parte 7: Sistema de alertas

```typescript
// Definición de alertas energéticas para el CRM
// Disparadas por el job de sincronización tras procesar los DTOs

const ALERTAS = [
  {
    id: 'exceso_potencia',
    condicion: 'maxKw > contractedKw * 1.05',
    severidad: 'alta',
    accion: 'notificar_comercial_y_cliente',
    descripcion: 'Exceso de potencia detectado: riesgo de penalización en factura',
  },
  {
    id: 'potencia_sobredimensionada',
    condicion: 'maxKw < contractedKw * 0.85 durante 3+ meses consecutivos',
    severidad: 'media',
    accion: 'oportunidad_comercial',
    descripcion: 'Potencia sobredimensionada: posible ahorro por revisión de potencias',
  },
  {
    id: 'anomalia_consumo',
    condicion: 'consumo_mes > promedio_3meses * 1.30',
    severidad: 'media',
    accion: 'alerta_investigacion',
    descripcion: 'Consumo anormalmente alto este mes respecto al histórico',
  },
  {
    id: 'penalizacion_reactiva',
    condicion: 'abs(totalKvarh) > consumo_activo_kwh * 0.33',
    severidad: 'alta',
    accion: 'oportunidad_comercial',
    descripcion: 'Penalización por reactiva aplicable: batería de condensadores recomendada',
  },
  {
    id: 'renovacion_proxima',
    condicion: 'endDate < TODAY + 90 days',
    severidad: 'alta',
    accion: 'trigger_workflow_comercial',
    descripcion: 'Contrato próximo a vencer: iniciar proceso de renovación',
  },
  {
    id: 'datos_no_sincronizados',
    condicion: 'synced_at < TODAY - 3 days',
    severidad: 'tecnica',
    accion: 'revision_tecnica',
    descripcion: 'CUPS sin sincronizar en los últimos 3 días',
  },
]
```

---

## Parte 8: Frecuencias de sincronización

| Dato | Frecuencia | Motivo |
|---|---|---|
| Lista de CUPS / contratos | Diaria | Cambios de cartera y comercializadora |
| Consumo horario | Diaria (D-1) | Datadis publica con 1 día de retraso mínimo |
| Consumo mensual agregado | Mensual | Disponible tras cierre de facturación |
| Potencias máximas | Mensual | Solo disponibles tras cierre mensual |
| Energía reactiva | Mensual | Solo disponibles tras cierre mensual |
| Comparativas geográficas | Mensual | Datos agregados oficiales |

**Rate limiting**: Datadis limita peticiones por IP y por cuenta. Implementar cola con reintentos exponenciales. Recomendado: máximo 1 petición por CUPS cada 15 minutos.

---

## Parte 9: Consideraciones técnicas obligatorias

**Fechas**: Datadis usa `YYYY/MM/DD`. `9999/01/01` en fecha fin = contrato indefinido → guardar como `NULL` en BD.

**Períodos tarifarios variables según tarifa**:
- 2.0TD: P1-P3 (3 períodos)
- 3.0TD: P1-P6 (6 períodos)
- 6.1TD: P1-P6 (6 períodos)
- Siempre normalizar a array de 6 con 0 en los que no apliquen.

**Valores de reactiva negativos**: capacitiva (cos φ adelantado). No filtrar — guardar tal cual y mostrar con signo.

**Excedentes / autoconsumo**: el campo `surplusEnergyKWh` solo aparece en CUPS con instalación de autoconsumo registrada en la distribuidora. Si no aparece, guardar 0.

**Autorizaciones de terceros**: el CRM gestionará CUPS de clientes que no son directamente del usuario de la cuenta Datadis. Hay que gestionar el flujo de autorización de terceros de la plataforma. Estos CUPS autorizados tienen los mismos endpoints pero requieren pasar el NIF del titular.

**Datos estimados**: algunos registros horarios son estimados (no lectura real). El campo `isEstimated` debe persistirse en BD y mostrarse en UI con un indicador visual.

**Múltiples distribuidoras**: el shape de la respuesta varía por distribuidora. Los normalizers deben cubrir al menos: EDISTRIBUCIÓN, i-DE, UFD, Viesgo, Naturgy. Añadir tests por distribuidora antes de ampliar la cartera de clientes.

---

## Parte 10: Roadmap de implementación (orden correcto)

El roadmap debe ir de backend a frontend. No construir dashboards sobre datos sin normalizar.

**Fase 1 — Normalización (Semanas 1-2)**
- Crear `src/features/datadis/normalizers.ts` con los 4 normalizers
- Tests unitarios por shape de distribuidora
- Integrar normalizers en el Edge Function `datadis-proxy`
- Eliminar toda la lógica de aliasing del frontend

**Fase 2 — Caché tipada (Semanas 2-3)**
- Crear tablas `datadis_contract_cache`, `datadis_maxpower_cache`, `datadis_reactive_cache`
- El proxy guarda DTOs normalizados, no raw
- El frontend consume DTOs; cero `Array.isArray()` defensivos

**Fase 3 — Histórico de consumo (Semanas 3-5)**
- Crear tablas `datadis_consumption_monthly` y `datadis_consumption_hourly`
- Job de sincronización diaria con rate limiting
- Auditoría de sincronización (`datadis_sync_audit`)

**Fase 4 — Dashboards básicos (Semanas 5-7)**
- Vista ejecutiva por empresa (todos los CUPS)
- Detalle de CUPS: contrato, consumo, potencias, reactiva
- Gráficos interactivos con recharts

**Fase 5 — Análisis avanzado (Semanas 7-10)**
- Comparativas geográficas
- Detección de anomalías y alertas
- Conciliación de facturas
- Workflows comerciales automáticos

**Fase 6 — Inteligencia energética (Semanas 10-14)**
- Predicción de consumo (mínimo 12 meses de histórico)
- Recomendaciones automáticas de tarifa con ROI estimado
- Análisis de excedentes y autoconsumo
- Informes ejecutivos exportables (PDF)

---

## Referencias

- Auditoría plataforma: sesión 2026-05-13, 51 pasos, CUPS `ES0031104950142010SA0F`
- Fixes aplicados: commits `75e7d11` y `c7b3044`
- Arquitectura normalización: `.cowork/outbox/2026-05-13T17-00-00-datadis-normalizer-arquitectura.md`
- Estado CRM: `docs/ESTADO.md`
