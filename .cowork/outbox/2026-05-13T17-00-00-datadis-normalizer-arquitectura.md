# Datadis — Capa de normalización (decisión arquitectónica 2026-05-13)

## Contexto

Durante el debugging del módulo Datadis se descubrió que EDISTRIBUCIÓN devuelve
payloads heterogéneos según endpoint, con nombres de campo en español y estructuras
anidadas distintas:

| Endpoint        | Estructura real                          | Lo que esperaba el frontend |
|---|---|---|
| `get_contractual` | `{response: [{tarifaAcceso, comercializador, fechaInicio, potenciaContratada[]}]}` | `[{accessFare, marketer, startDate, contractedPowerkWP1..6}]` |
| `get_max_power`   | `{response: [{fechaMaximo, periodo, maximoPotenciaDemandada}]}`                    | `[{date, period, maxPower}]` |
| `get_reactive`    | `{response: {code, cups, energy: [{energyP1..6}]}}`                               | `[{date, energyP1..6}]` |
| `get_supplies`    | `[{distribuidora, tipoPunto, codigoProvincia, fechaVigenciaDesde}]`               | Mezcla de alias |

Hoy se parchearon los componentes React para absorber la heterogeneidad. Eso es frágil.

## Problema actual

```
Datadis API
   ↓
datadis-proxy (Edge Function) — devuelve raw sin normalizar
   ↓
Frontend React — normaliza con Array.isArray + alias chains
```

Consecuencias:
- Cada nueva distribuidora (I-DE, UFD, Viesgo…) rompe algo distinto
- Lógica de transformación duplicada en 3+ componentes
- `any` / `unknown` por todas partes
- Bugs silenciosos cuando el campo simplemente no existe

## Arquitectura correcta

```
Datadis API
   ↓
datadis-proxy → normalizeXxx() — devuelve DTO canónico
   ↓
Frontend React — solo consume DTOs tipados
```

## Trabajo a hacer (próxima sesión Datadis)

### 1. Crear `src/features/datadis/normalizers.ts`

```typescript
// Tipos raw (lo que devuelve Datadis, sin garantías)
interface RawContractualEdistrib { tarifaAcceso?: string; comercializador?: string; fechaInicio?: string; potenciaContratada?: number[]; tension?: string; fechaFin?: string }
interface RawContractualGeneric  { accessFare?: string; marketer?: string; startDate?: string; contractedPowerkWP1?: number; /* ... */ }

// DTO canónico (lo que consume el frontend)
export interface ContractDTO {
  tariff: string | null
  marketer: string | null
  distributor: string | null
  tension: string | null
  startDate: string | null
  endDate: string | null
  powers: number[]        // siempre array[6], 0 si no existe
}

export interface MaxPowerDTO {
  month: string           // 'YYYY-MM'
  period: number          // 1..6
  maxKw: number
}

export interface ReactiveDTO {
  month: string
  energyP1: number; energyP2: number; energyP3: number
}

// Normalizadores
export function normalizeContract(raw: unknown): ContractDTO { /* ... */ }
export function normalizeMaxPower(raw: unknown): MaxPowerDTO[] { /* ... */ }
export function normalizeReactive(raw: unknown): ReactiveDTO[] { /* ... */ }
```

### 2. Mover toda la lógica de alias de los componentes a normalizers.ts

Eliminar de `SupplyDetailPage.tsx`:
- Las chains `p['fechaMaximo'] ?? p.date`
- Los `Array.isArray(raw?.response) ? raw.response : []`
- Los `String(contract?.['tarifaAcceso'] ?? ...)`

Sustituir por:
```typescript
const contract = normalizeContract(contractData)
const maxPower = normalizeMaxPower(maxPowerData)
const reactive = normalizeReactive(reactiveData)
```

### 3. Opcionalmente: mover normalización al Edge Function `datadis-proxy`

Más correcto a largo plazo:
- El proxy recibe raw de Datadis
- Normaliza antes de cachear en `datadis_proxy_cache`
- El frontend recibe siempre DTOs limpios

Ventaja: el frontend no necesita saber que existe Datadis ni sus formatos.

### 4. Tipado fuerte en `api.ts`

Sustituir `DatadisContractualData` (con `[key: string]: unknown`) por
`ContractDTO` devuelto por el normalizador.

## Prioridad

PRIORIDAD 2 — después del CI auth fallback FusionSolar.

Si se añaden más tabs/pantallas sin esta capa, cada distribuidora nueva
seguirá rompiendo algo distinto.

## Estado de los parches actuales (2026-05-13)

Los fixes de hoy son correctos y están en producción. Funcionan para EDISTRIBUCIÓN.
Para I-DE, UFD y otras distribuidoras habrá que validar y posiblemente añadir más alias.
La capa de normalización eliminaría ese problema de raíz.
