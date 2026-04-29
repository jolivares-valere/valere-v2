import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Zap, CheckCircle2, XCircle, AlertCircle, ExternalLink, RefreshCw, FilePlus } from 'lucide-react'
import { supabase } from '@/core/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SkeletonRow } from '@/components/ui/Skeleton'
import EmptyState from '@/core/components/EmptyState'
import NuevoExpedienteModal from './components/NuevoExpedienteModal'

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface SuministroRow {
  id: string
  codigo_cups: string
  tarifa_acceso: string | null
  estado: string
  distribuidor: string | null
  ciudad_suministro: string | null
  p1_kw: number | null
  p2_kw: number | null
  p3_kw: number | null
  datadis_sincronizado: boolean | null
  empresa_id: string
  empresa_nombre: string
  expedientes_activos: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function potenciaBadge(p1: number | null, tarifa: string | null) {
  if (p1 === null) return <span className="text-xs text-slate-400">—</span>
  const color =
    tarifa?.startsWith('6') ? 'bg-purple-50 text-purple-700' :
    tarifa?.startsWith('3') ? 'bg-blue-50 text-blue-700' :
    'bg-slate-50 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {Number(p1).toFixed(0)} kW
    </span>
  )
}

function datadisIcon(sincronizado: boolean | null) {
  if (sincronizado === true)
    return <span title="Sincronizado con Datadis"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></span>
  return <span title="Sin sincronizar"><XCircle className="w-4 h-4 text-slate-300" /></span>
}

function estadoBadge(estado: string) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize'
  if (estado === 'activo') return <span className={`${base} bg-emerald-50 text-emerald-700`}>{estado}</span>
  if (estado === 'baja') return <span className={`${base} bg-red-50 text-red-700`}>{estado}</span>
  return <span className={`${base} bg-slate-100 text-slate-600`}>{estado}</span>
}

// ─── Fetch ────────────────────────────────────────────────────────────────

async function fetchSuministros(): Promise<SuministroRow[]> {
  const { data, error } = await supabase
    .from('cups')
    .select(`
      id, codigo_cups, tarifa_acceso, estado, distribuidor,
      ciudad_suministro, p1_kw, p2_kw, p3_kw, datadis_sincronizado,
      empresa_id,
      empresas ( nombre ),
      expedientes ( estado )
    `)
    .is('deleted_at', null)
    .order('empresa_id', { ascending: true })
    .order('codigo_cups', { ascending: true })

  if (error) throw error

  const ESTADOS_CERRADOS = ['aprobada', 'rechazada', 'archivada']
  return (data ?? []).map((r: any) => ({
    ...r,
    empresa_nombre: r.empresas?.nombre ?? '—',
    expedientes_activos: (r.expedientes ?? []).filter(
      (e: any) => !ESTADOS_CERRADOS.includes(e.estado)
    ).length,
  }))
}

// ─── Página ───────────────────────────────────────────────────────────────

export default function SuministrosPotenciasPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [modalCups, setModalCups] = useState<{ empresaId: string; cupsId: string } | null>(null)

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suministros-potencias'],
    queryFn: fetchSuministros,
    staleTime: 60_000,
  })

  // Lista de empresas únicas para el filtro
  const empresas = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; nombre: string }[] = []
    for (const r of rows) {
      if (!seen.has(r.empresa_id)) {
        seen.add(r.empresa_id)
        list.push({ id: r.empresa_id, nombre: r.empresa_nombre })
      }
    }
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [rows])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return rows.filter(r => {
      const matchBusqueda =
        !q ||
        r.codigo_cups.toLowerCase().includes(q) ||
        r.empresa_nombre.toLowerCase().includes(q) ||
        (r.ciudad_suministro ?? '').toLowerCase().includes(q) ||
        (r.distribuidor ?? '').toLowerCase().includes(q)
      const matchEmpresa = !filtroEmpresa || r.empresa_id === filtroEmpresa
      return matchBusqueda && matchEmpresa
    })
  }, [rows, busqueda, filtroEmpresa])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Suministros</h1>
          <p className="text-valere-ink/50 mt-1">
            Puntos de suministro activos — {isLoading ? '…' : `${filtrados.length} de ${rows.length} CUPS`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          title="Actualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por CUPS, empresa, ciudad, distribuidor…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
              />
            </div>
            <select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 bg-white min-w-[180px]"
            >
              <option value="">Todas las empresas</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 py-3 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display text-valere-blue-dark">
                Puntos de suministro
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Gestiona potencias contratadas e integración Datadis
              </CardDescription>
            </div>
            <Link
              to="/datos"
              className="flex items-center gap-2 px-4 py-2 bg-valere-blue-dark text-white rounded-xl text-sm hover:bg-valere-blue-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              Nuevo CUPS
            </Link>
          </div>
        </CardHeader>

        {error ? (
          <div className="p-8 flex flex-col items-center gap-3 text-slate-500">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm">Error al cargar los suministros.</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-valere-blue-dark underline"
            >
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}</tbody>
          </table>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<Zap className="w-8 h-8" />}
            title="Sin suministros"
            description={busqueda || filtroEmpresa ? 'No hay CUPS que coincidan con los filtros.' : 'Aún no hay puntos de suministro registrados.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CUPS</TableHead>
                  <TableHead>Tarifa</TableHead>
                  <TableHead className="text-center">P1</TableHead>
                  <TableHead className="text-center">P2</TableHead>
                  <TableHead className="text-center">P3</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Exptes</TableHead>
                  <TableHead className="text-center">Datadis</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(r => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-800 max-w-[140px] truncate">
                      <Link
                        to={`/empresas/${r.empresa_id}`}
                        className="hover:text-valere-blue-dark hover:underline"
                        title={r.empresa_nombre}
                      >
                        {r.empresa_nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {r.codigo_cups}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{r.tarifa_acceso ?? '—'}</span>
                    </TableCell>
                    <TableCell className="text-center">{potenciaBadge(r.p1_kw, r.tarifa_acceso)}</TableCell>
                    <TableCell className="text-center">{potenciaBadge(r.p2_kw, r.tarifa_acceso)}</TableCell>
                    <TableCell className="text-center">{potenciaBadge(r.p3_kw, r.tarifa_acceso)}</TableCell>
                    <TableCell className="text-xs text-slate-500 capitalize">
                      {r.ciudad_suministro ?? '—'}
                    </TableCell>
                    <TableCell>{estadoBadge(r.estado)}</TableCell>
                    <TableCell className="text-center">
                      {r.expedientes_activos > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold w-5 h-5">
                          {r.expedientes_activos}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {datadisIcon(r.datadis_sincronizado)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/datos"
                          state={{ empresaId: r.empresa_id, cupsId: r.id }}
                          className="inline-flex items-center gap-1 text-xs text-valere-blue-dark hover:underline"
                          title="Ver facturas en Captura de Datos"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Datos
                        </Link>
                        {r.expedientes_activos === 0 && (
                          <button
                            onClick={() => setModalCups({ empresaId: r.empresa_id, cupsId: r.id })}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                            title="Crear expediente RDL para este CUPS"
                          >
                            <FilePlus className="w-3 h-3" />
                            Expte.
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      {/* Modal nuevo expediente desde CUPS */}
      {modalCups && (
        <NuevoExpedienteModal
          initialEmpresaId={modalCups.empresaId}
          initialCupsId={modalCups.cupsId}
          onClose={() => setModalCups(null)}
          onCreated={() => { setModalCups(null); refetch() }}
        />
      )}
    </div>
  )
}
