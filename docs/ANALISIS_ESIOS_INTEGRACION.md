# Análisis técnico: Integración API ESIOS en Valere CRM

> **Creado:** 2026-06-01  
> **Autor:** Claude Cowork (sesión de análisis)  
> **Estado:** Propuesta — pendiente de decisión de arquitectura  
> **Relacionado con:** `docs/BRIEFING_FASE2_TARIFFS_INGEST.md`, `src/core/services/datadis.ts`, `src/core/energia/calculator.ts`

---

## 1. Qué es ESIOS y por qué es relevante para Valere

**ESIOS** (e·sios) es el portal de transparencia del operador del sistema eléctrico español (REE — Red Eléctrica de España). Su API REST proporciona acceso programático a todos los datos que REE publica: precios de mercado, servicios de ajuste, generación, demanda, etc.

Valere tiene token de API personal (solicitado a `consultasios@ree.es`). Con ese token, el acceso es gratuito y sin coste por llamada.

**Por qué importa para el negocio:**  
Valere analiza facturas energéticas de empresas y genera propuestas de cambio de comercializadora. El diferenciador clave en el mercado es la precisión del cálculo. Hoy el motor (`calculator.ts`) usa precios BOE estáticos para la parte regulada y precios planos de comercializadoras para la energía. Con ESIOS, podemos añadir el **precio real de mercado hora a hora**, lo que permite:

- Calcular el coste real de un cliente con tarifa indexada (PVPC o pool+spread)
- Comparar "lo que pagó realmente" vs "lo que habría pagado" con otra tarifa
- Proyectar el ahorro futuro con escenarios de precio realistas

---

## 2. Arquitectura de la API

### Autenticación

```
Header: x-api-key: "{tu_token_personal}"
Header: Accept: application/json; application/vnd.esios-api-v1+json
Header: Content-Type: application/json
```

No hay OAuth, no hay renovación de token. El token es permanente hasta que se revoque. **El token NUNCA debe ir al frontend** — solo a variables de entorno de la Edge Function.

### Endpoint principal para Valere

```
GET https://api.esios.ree.es/indicators/{id}
  ?start_date={ISO8601}
  &end_date={ISO8601}
  &time_trunc={hour|day|month}
  &time_agg={sum|average}
  &geo_ids={3}          ← geo_id=3 es la Península Ibérica
```

### Estructura de respuesta

```json
{
  "indicator": {
    "name": "Precio mercado spot España",
    "id": 600,
    "values": [
      {
        "value": 85.43,
        "datetime": "2026-05-31T23:00:00.000+02:00",
        "datetime_utc": "2026-05-31T21:00:00Z",
        "geo_id": 3,
        "geo_name": "España"
      }
    ]
  }
}
```

Cada item en `values[]` es una hora. `value` está en la unidad propia del indicador (ver tabla siguiente). `datetime` es hora local española (con DST); `datetime_utc` es UTC.

---

## 3. Mapa de indicadores relevantes para Valere

### Indicadores prioritarios (usar desde Fase 2)

| ID | Nombre | Unidad | Granularidad | Uso en Valere |
|---|---|---|---|---|
| **600** | Precio mercado spot España (OMIE) | €/MWh | Horaria | Coste energía para tarifas indexadas. **El más importante.** |
| **1001** | PVPC — Término de energía (2.0TD) | €/kWh | Horaria | Precio regulado para clientes PVPC residencial/PYME |
| **10211** | PVPC — Precio total (2.0TD) | €/kWh | Horaria | PVPC completo (energía + peajes + cargos) |
| **1739** | Precio compensación excedentes (PVPC) | €/kWh | Horaria | Ahorro real FV — compensación simplificada |
| **10349** | Factor de emisiones CO₂ | gCO₂/kWh | Horaria | Huella carbono en propuestas (diferenciador ESG) |

### Indicadores secundarios (Fase 3+, clientes grandes 3.0TD/6.xTD)

| ID | Nombre | Unidad | Granularidad | Uso en Valere |
|---|---|---|---|---|
| **634** | Regulación secundaria — banda | €/MW·h | Horaria | Servicios de ajuste en facturas grandes |
| **686** | Regulación terciaria — subir | €/MWh | Horaria | Ídem |
| **687** | Regulación terciaria — bajar | €/MWh | Horaria | Ídem |
| **1692** | Restricciones técnicas | €/MWh | Horaria | Ídem |
| **2134** | Interrumpibilidad | €/MW | Diaria | Solo clientes con servicio de interrumpibilidad |
| **805** | Desvíos — subir | €/MWh | Horaria | Penalizaciones por desvío de previsión |

### Indicadores de contexto (dashboard)

| ID | Nombre | Uso |
|---|---|---|
| **1293** | Generación solar fotovoltaica | Contexto renovable en tiempo real |
| **10034** | Demanda eléctrica prevista | Predictor de precio (correlación alta) |
| **10033** | Demanda eléctrica real | — |
| **372** | Precio CO₂ (derechos de emisión) | Impacta precio pool — útil en dashboard |

---

## 4. Rate limits y consideraciones operativas

La documentación oficial no publica límites explícitos, pero la práctica habitual con tokens personales es:

- **~1.000 peticiones/día** sin restricción conocida para datos históricos
- **Sin coste por llamada** (el token es gratuito)
- **Ventana de datos disponibles:** desde 2011 hasta D+0 (día actual), publicación a las ~21:00 CET del día anterior para el precio spot del día siguiente (OMIE publica D+1)
- **Latencia típica:** 200-800ms por llamada (CloudFront CDN de AWS)
- **Datos en tiempo real:** disponibles con retardo de ~15 min para algunos indicadores

**Implicación de arquitectura:** no hay que consultar ESIOS en cada carga de página. El patrón correcto es una Edge Function que cachee en Supabase (tabla `precios_pool_horarios`) y que el frontend lea de Supabase.

---

## 5. Arquitectura de integración propuesta

### Diagrama de flujo

```
ESIOS API
    │
    ▼ (nightly job, Edge Function)
Supabase tabla: precios_pool_horarios
    │
    ├─► calculator.ts (cálculo de propuestas)
    ├─► AnalisisPage (comparador histórico)
    └─► Dashboard widget (precio hoy)
```

### Tabla nueva en Supabase

```sql
-- Migration: 20260601_esios_precios_pool.sql
create table if not exists public.precios_pool_horarios (
  id            uuid primary key default gen_random_uuid(),
  hora_utc      timestamptz not null,
  indicador_id  integer not null,           -- ID del indicador ESIOS
  indicador_nom text not null,              -- Nombre legible
  valor         numeric not null,           -- En unidad original del indicador
  unidad        text not null,              -- 'EUR_MWh', 'EUR_kWh', 'gCO2_kWh'
  geo_id        integer not null default 3, -- 3 = Península
  fuente        text not null default 'esios',
  created_at    timestamptz default now(),
  unique (hora_utc, indicador_id, geo_id)
);

create index idx_precios_pool_hora on public.precios_pool_horarios(hora_utc);
create index idx_precios_pool_indicador on public.precios_pool_horarios(indicador_id, hora_utc);

-- RLS: solo usuarios aprobados pueden leer
alter table public.precios_pool_horarios enable row level security;
create policy precios_pool_read_approved
  on public.precios_pool_horarios for select
  to authenticated
  using (exists (
    select 1 from public.user_profiles
    where id = auth.uid() and approved = true
  ));
-- Solo service_role puede insertar (desde Edge Function)
create policy precios_pool_insert_service
  on public.precios_pool_horarios for insert
  to service_role with check (true);
```

### Servicio `src/core/services/esios.ts` (nuevo)

Modelo análogo a `datadis.ts`:

```typescript
// esios.ts — Cliente para la API de ESIOS (REE)
// IMPORTANTE: el token NUNCA se usa desde el frontend en producción.
// En producción, las llamadas van desde la Edge Function esios-price-cache.
// Este módulo es útil para scripts de backfill y tests.

const ESIOS_BASE = 'https://api.esios.ree.es'

export const ESIOS_INDICATORS = {
  PRECIO_SPOT:           600,   // €/MWh — precio mercado diario OMIE
  PVPC_ENERGIA_2TD:     1001,   // €/kWh — término energía PVPC
  PVPC_TOTAL_2TD:      10211,   // €/kWh — PVPC total
  COMPENSACION_FV:      1739,   // €/kWh — excedentes FV compensación simplificada
  FACTOR_CO2:          10349,   // gCO₂/kWh — factor emisiones
  REG_SECUNDARIA:        634,   // €/MW·h — servicio ajuste
  REG_TERCIARIA_UP:      686,   // €/MWh — regulación terciaria subir
  REG_TERCIARIA_DOWN:    687,   // €/MWh — regulación terciaria bajar
} as const

export interface EsiosValue {
  value: number
  datetime: string       // hora local España (con DST)
  datetime_utc: string   // UTC ISO8601
  geo_id: number
  geo_name: string
}

export interface EsiosIndicatorResponse {
  indicator: {
    id: number
    name: string
    values: EsiosValue[]
  }
}

export async function fetchIndicator(
  indicatorId: number,
  startDate: string,   // ISO8601: '2026-05-01T00:00:00Z'
  endDate: string,     // ISO8601: '2026-05-31T23:59:59Z'
  timeTrunc: 'hour' | 'day' | 'month' = 'hour',
  apiKey: string       // Desde env var ESIOS_API_KEY — NUNCA hardcodear
): Promise<EsiosValue[]> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    time_trunc: timeTrunc,
    time_agg: 'average',
    geo_ids: '3',  // Península Ibérica
  })

  const url = `${ESIOS_BASE}/indicators/${indicatorId}?${params}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json; application/vnd.esios-api-v1+json',
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  })

  if (!res.ok) {
    throw new Error(`ESIOS API error: ${res.status} ${res.statusText} — indicator ${indicatorId}`)
  }

  const data: EsiosIndicatorResponse = await res.json()
  return data.indicator.values
}
```

### Edge Function `esios-price-cache` (nueva)

Se integra en el mismo despliegue que `tariffs-ingest` (Fase 2). Corre como cron job nightly a las 21:30 CET (cuando OMIE ya ha publicado el precio del día siguiente):

```
Schedule: 30 20 * * *  (UTC — equivale a 21:30 CET en invierno, 22:30 en verano)
```

Lógica:
1. Calcular rango: ayer 00:00 UTC → mañana 23:59 UTC (3 días de ventana para garantizar solapamiento)
2. Para cada indicador en `[600, 1001, 10211, 1739, 10349]`, llamar `fetchIndicator()`
3. Upsert en `precios_pool_horarios` (ON CONFLICT en `hora_utc + indicador_id + geo_id`)
4. Registrar en log cuántas filas insertadas/actualizadas

Secret necesario en Supabase: `ESIOS_API_KEY`.

---

## 6. Integración en `calculator.ts`

### Hoy (antes de ESIOS)

El motor calcula la parte de energía multiplicando `consumo_kWh_periodo × precio_energía_oferta`. El precio de energía viene de `retailer_offers.energy_prices[]` — un precio plano por periodo tarifario.

### Con ESIOS — tarifas indexadas

Para clientes con tarifa indexada (PVPC o pool+spread), el coste real hora a hora es:

```
coste_hora = consumo_kWh_hora × (precio_pool_hora_€/MWh / 1000 + spread_€/kWh)
```

Esto requiere cruzar **consumos horarios de Datadis** (que ya tenéis en `facturas.consumos_horarios` tras la Fase 1) con **precios horarios de ESIOS** (nueva tabla).

La función nueva en `calculator.ts`:

```typescript
export async function calculateIndexedInvoice(
  consumosHorarios: Array<{ hora_utc: string; kwh: number }>,
  preciosPool: Array<{ hora_utc: string; precio_eur_mwh: number }>,
  spreadEurKwh: number
): Promise<{ costeTotal: number; desglose: Array<{ hora: string; coste: number }> }> {
  // Join por hora_utc, calcular coste hora a hora
  // Devuelve suma total + array para visualización de curva
}
```

---

## 7. Casos de uso en UI

### A. Widget "Precio pool hoy" (Dashboard)

Un card pequeño en el dashboard que muestra el precio medio del mercado spot del día en curso vs la media del mes anterior. Dato: leer de `precios_pool_horarios` donde `indicador_id = 600` y `hora_utc > hoy 00:00`. No necesita llamar a ESIOS en tiempo real — lee de Supabase.

### B. Comparador histórico real (AnalisisPage)

Al analizar una factura de un cliente con tarifa indexada, mostrar:
- Coste real (usando precios ESIOS del periodo)
- Coste alternativo con tarifa fija (usando precio plano de la mejor oferta)
- Diferencia y ahorro/sobrecoste

Hoy el comparador usa precios estimados. Con ESIOS, el dato es exacto.

### C. Ahorro real FV en propuestas

Para clientes con instalación fotovoltaica, el indicador `1739` (precio de compensación de excedentes) permite calcular el ahorro real por inyección a red hora a hora (cruzado con la curva de generación FV estimada).

### D. Propuestas con escenario de precio

Al generar una propuesta PDF, añadir una página "Contexto de mercado" con el histórico del precio pool de los últimos 12 meses + proyección (media móvil). Datos de ESIOS.

---

## 8. Plan de implementación (encaje con Fase 2)

El plan propuesto es **integrar ESIOS en el mismo sprint que `tariffs-ingest`** para no abrir tres ramas paralelas:

| Tarea | Responsable | Estimación |
|---|---|---|
| Crear `src/core/services/esios.ts` | Cowork | 2h |
| Migration SQL `precios_pool_horarios` | Cowork | 1h |
| Edge Function `esios-price-cache` (cron nightly) | Claude Code | 4h |
| Backfill histórico 24 meses | Claude Code (script) | 2h |
| Widget dashboard "Precio pool hoy" | Cowork | 3h |
| Integración en `calculator.ts` para indexadas | Claude Code | 4h |
| Tests | Claude Code | 2h |

**Total estimado: ~18h de trabajo técnico**, distribuible en Fase 2 (Edge Function + migration) y Fase 3 (integración calculator + UI).

---

## 9. Decisiones abiertas

1. **¿Backfill de cuántos meses?** Para que el comparador sea útil, necesitamos al menos 24 meses de precio spot (2024-2025). La API de ESIOS tiene histórico desde 2011. Un backfill completo de 24 meses × 24 horas × 5 indicadores = ~87.600 filas — perfectamente manejable en Supabase.

2. **¿Indicador 600 (pool €/MWh) o 1001 (PVPC €/kWh)?** Para clientes PVPC, usar `1001`; para clientes con tarifa indexada a pool (mayoría de empresas medianas-grandes), usar `600` y convertir MWh→kWh. Ambos deberían cachearse.

3. **¿Servicios de ajuste (IDs 634, 686, 687)?** Solo relevantes para clientes 3.0TD/6.xTD grandes. Dejar para Fase 3+ para no complicar el MVP.

4. **¿Almacenar `valor` en unidad original o normalizar a €/kWh?** Recomendación: guardar en unidad original y hacer la conversión en el código TypeScript, para no perder resolución numérica y poder cambiar la lógica sin remigrar.

---

## 10. Secretos necesarios

| Variable | Dónde configurar | Quién la usa |
|---|---|---|
| `ESIOS_API_KEY` | Supabase Edge Function Secrets | `esios-price-cache` (Edge Function) |
| `ESIOS_API_KEY` | `.env.local` (solo dev/scripts) | Scripts de backfill locales |

**Nunca** incluir el token en el frontend ni en el repo.

---

## Referencias

- [Documentación API ESIOS](https://api.esios.ree.es/)
- [Solicitar token](mailto:consultasios@ree.es)
- [OMIE — Mercado diario](https://www.omie.es/es/datos-del-mercado)
- Datadis (consumos horarios): `src/core/services/datadis.ts`
- Motor de cálculo: `src/core/energia/calculator.ts`
- Módulo tarifas Fase 1: `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md`
