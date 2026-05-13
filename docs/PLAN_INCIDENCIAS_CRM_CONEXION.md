# Plan: Conectar IncidenciasTab a tabla `incidencias` real

**Fecha**: 2026-05-13  
**Estado**: Documentado — pendiente implementar  
**Complejidad**: Media (2-3h) — los tipos no coinciden con el fixture actual, hay que reescribir el componente

---

## Situación actual

`IncidenciasTab` en `src/features/seguimiento-fv/components/IncidenciasTab.tsx` muestra datos del fixture `FIXTURE_INCIDENCIAS` (tipo `FxIncidencia`). El componente fue diseñado inicialmente para mostrar "incidencias FV" (alarmas técnicas de plantas solares).

La tab está en la ruta `/seguimiento-fv` bajo el label "Incidencias CRM" — el sufijo "CRM" ya es un indicador de que hay que conectarla a la tabla `incidencias` del CRM general.

---

## Schema real vs fixture

### Tabla `incidencias` en Supabase (21 columnas, 0 filas actualmente)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `empresa_id` | uuid NOT NULL | FK → empresas |
| `contrato_id` | uuid | FK → contratos (nullable) |
| `cups` | text | Código CUPS textual (legacy, nullable) |
| `cups_id` | uuid | FK → cups (nullable, moderno) |
| `titulo` | text NOT NULL | Título descriptivo |
| `descripcion` | text | Descripción detallada |
| `tipo` | ENUM | `facturacion`, `cambio_comercializadora`, `corte_suministro`, `potencia`, `acceso_red`, `otro` |
| `estado` | ENUM | `abierta`, `en_gestion`, `pendiente_cliente`, `pendiente_comercializadora`, `resuelta`, `cerrada` |
| `prioridad` | ENUM | `baja`, `media`, `alta`, `critica` |
| `asignado_a` | uuid | FK → user_profiles (nullable) |
| `fecha_apertura` | timestamptz | Default: now() |
| `fecha_limite` | timestamptz | Nullable |
| `fecha_resolucion` | timestamptz | Nullable |
| `importe_reclamado` | numeric | Nullable |
| `importe_recuperado` | numeric | Nullable |
| `notas_resolucion` | text | Nullable |
| `created_by` | uuid | FK → user_profiles (nullable) |
| `deleted_at` | timestamptz | Soft delete |

**RLS**: 4 policies activas (select/insert/update/delete) para `authenticated`.

### Tipo fixture `FxIncidencia` (actualmente en uso)

```typescript
interface FxIncidencia {
  id: string
  planta_id: string         // FV-específico — no existe en tabla real
  planta_nombre: string     // FV-específico
  empresa_nombre: string    // Necesita JOIN con empresas
  tipo: 'sin_datos' | 'alarma_critica' | 'descuadre_datadis' | 'credencial_error' | 'produccion_anomala'  // ≠ ENUM real
  severidad: 'critica' | 'mayor' | 'menor'  // → sustituir por prioridad
  descripcion: string
  detectada_en: string      // → fecha_apertura en tabla real
  resuelta: boolean         // → derivar de estado ('resuelta' | 'cerrada')
}
```

**Diferencias clave**:
1. Los valores del ENUM `tipo` son completamente distintos (fixture: FV-técnico, real: CRM-energético)
2. `severidad` → `prioridad` (distintos valores: baja/media/alta/critica vs critica/mayor/menor)
3. `empresa_nombre` no existe en la tabla — requiere JOIN con `empresas`
4. `planta_nombre` / `planta_id` no existen — la incidencia es por empresa/contrato/CUPS, no por planta FV
5. `detectada_en` → `fecha_apertura`
6. `resuelta` → derivar de `estado IN ('resuelta', 'cerrada')`

---

## Plan de implementación

### Paso 1: Tipo TypeScript real

En `src/core/types/entities.ts` (o al inicio de `api.ts` seguimiento-fv), añadir:

```typescript
export type TipoIncidencia = 'facturacion' | 'cambio_comercializadora' | 'corte_suministro' | 'potencia' | 'acceso_red' | 'otro'
export type EstadoIncidencia = 'abierta' | 'en_gestion' | 'pendiente_cliente' | 'pendiente_comercializadora' | 'resuelta' | 'cerrada'
export type PrioridadIncidencia = 'baja' | 'media' | 'alta' | 'critica'

export interface IncidenciaCRM {
  id: string
  empresa_id: string
  empresa_nombre: string      // de JOIN
  contrato_id: string | null
  cups: string | null
  cups_id: string | null
  titulo: string
  descripcion: string | null
  tipo: TipoIncidencia
  estado: EstadoIncidencia
  prioridad: PrioridadIncidencia
  asignado_a: string | null
  asignado_nombre: string | null  // de JOIN con user_profiles
  fecha_apertura: string
  fecha_limite: string | null
  fecha_resolucion: string | null
  importe_reclamado: number | null
  importe_recuperado: number | null
  notas_resolucion: string | null
  created_by: string | null
}
```

### Paso 2: Hook en `api.ts` seguimiento-fv

```typescript
export function useIncidenciasCRM(empresaId?: string) {
  return useQuery({
    queryKey: ['incidencias-crm', empresaId],
    queryFn: async (): Promise<IncidenciaCRM[]> => {
      let q = (supabase as any)
        .from('incidencias')
        .select(`
          *,
          empresas:empresa_id (nombre),
          asignado:asignado_a (nombre, apellidos)
        `)
        .is('deleted_at', null)
        .order('fecha_apertura', { ascending: false })

      if (empresaId) q = q.eq('empresa_id', empresaId)

      const { data, error } = await q
      if (error) throw error

      return (data ?? []).map((r: any) => ({
        ...r,
        empresa_nombre: r.empresas?.nombre ?? '—',
        asignado_nombre: r.asignado
          ? `${r.asignado.nombre ?? ''} ${r.asignado.apellidos ?? ''}`.trim()
          : null,
      }))
    },
  })
}
```

### Paso 3: Reescribir IncidenciasTab.tsx

El componente necesita ser reescrito para:
- Recibir `IncidenciaCRM[]` en vez de `FxIncidencia[]`
- Rediseñar `TIPO_CFG` para los 6 tipos CRM:

```typescript
const TIPO_CFG: Record<TipoIncidencia, { label: string; Icon: React.ElementType; color: string }> = {
  facturacion:              { label: 'Facturación',           Icon: FileText,     color: 'text-blue-500' },
  cambio_comercializadora:  { label: 'Cambio comercializ.',   Icon: GitBranch,    color: 'text-purple-500' },
  corte_suministro:         { label: 'Corte suministro',      Icon: WifiOff,      color: 'text-red-500' },
  potencia:                 { label: 'Potencia',               Icon: Zap,          color: 'text-yellow-600' },
  acceso_red:               { label: 'Acceso a red',           Icon: Network,      color: 'text-orange-500' },
  otro:                     { label: 'Otro',                   Icon: AlertTriangle, color: 'text-slate-500' },
}
```

- Rediseñar `PRIORIDAD_BADGE` (baja/media/alta/critica):

```typescript
const PRIORIDAD_BADGE: Record<PrioridadIncidencia, string> = {
  baja:    'bg-slate-100 text-slate-600 border-slate-200',
  media:   'bg-blue-100 text-blue-700 border-blue-200',
  alta:    'bg-orange-100 text-orange-800 border-orange-200',
  critica: 'bg-red-100 text-red-800 border-red-200',
}
```

- Añadir badge de `estado` (abierta/en_gestion/pendiente_xxx/resuelta/cerrada)
- Mostrar `titulo` en vez de `planta_nombre` (la incidencia es por empresa, no planta FV)
- Mostrar `importe_reclamado` / `importe_recuperado` cuando existen
- Los contadores del header:
  - Abiertas: `estado NOT IN ('resuelta', 'cerrada')`
  - Críticas/altas: `prioridad IN ('critica', 'alta') && !resuelta`
  - Pendientes comercializadora: `estado = 'pendiente_comercializadora'`
  - Resueltas: `estado IN ('resuelta', 'cerrada')`

### Paso 4: Conectar en SeguimientoFVPage.tsx

```typescript
// Reemplazar:
const incidencias = FIXTURE_INCIDENCIAS

// Por:
const { data: incidencias = [] } = useIncidenciasCRM()
```

Eliminar `FIXTURE_INCIDENCIAS` de los imports cuando la conexión esté probada.

### Paso 5: Añadir mutación "Crear incidencia"

Opcional pero muy útil: formulario para crear incidencias CRM directamente desde la tab. Campos mínimos:
- Empresa (select de `empresas`)
- Título
- Tipo (select ENUM)
- Prioridad (select ENUM)
- Descripción (textarea)
- Importe reclamado (opcional)
- Fecha límite (opcional)

---

## Notas de implementación

- **0 filas actualmente**: la tabla está vacía → el estado vacío "Sin incidencias abiertas — todo operativo" se verá siempre al principio. Hay que asegurarse de que el estado vacío es atractivo y que hay un botón "+ Nueva incidencia" visible.
- **IncidenciasTab ya no es FV-específico**: esta tab en realidad muestra incidencias CRM de todos los clientes (no solo los FV). Considerar a futuro si tiene sentido moverla al CRM general o si queda bien como "vista de incidencias" desde el panel FV.
- **`cups_id` vs `cups` (texto)**: la tabla tiene ambos. Para nuevas incidencias, preferir `cups_id` (FK tipada). El campo `cups` (texto) es legacy.
- **soft delete**: filtrar siempre con `.is('deleted_at', null)` — la tabla usa soft delete.

---

## Tiempo estimado

| Paso | Tiempo |
|---|---|
| Tipo + hook api.ts | 30 min |
| Reescribir IncidenciasTab | 60 min |
| Conectar en SeguimientoFVPage | 10 min |
| TSC check + test | 20 min |
| **Total** | **~2h** |

Opcional (formulario crear): +60 min adicionales.
