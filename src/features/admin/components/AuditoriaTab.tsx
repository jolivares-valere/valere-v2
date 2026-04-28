/**
 * AuditoriaTab — Visualización del audit_log para roles master/manager.
 * Muestra los últimos eventos con filtros por entidad, acción y fecha.
 */
import { useState, useEffect, useCallback } from 'react'
import { Shield, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../../core/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/core/components/EmptyState'
import { SkeletonRow } from '@/components/ui/Skeleton'

// ── Tipos ─────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  created_at: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

const PAGE_SIZE = 25

// ── Colores por acción ─────────────────────────────────────────────────────

function actionBadgeClass(action: string): string {
  switch (action.toUpperCase()) {
    case 'INSERT':  return 'bg-green-100 text-green-800'
    case 'UPDATE':  return 'bg-blue-100 text-blue-800'
    case 'DELETE':  return 'bg-red-100 text-red-800'
    case 'APPROVE': return 'bg-emerald-100 text-emerald-800'
    case 'REJECT':  return 'bg-orange-100 text-orange-800'
    case 'LOGIN':   return 'bg-purple-100 text-purple-800'
    case 'EXPORT':  return 'bg-amber-100 text-amber-800'
    default:        return 'bg-slate-100 text-slate-700'
  }
}

const ENTITY_LABELS: Record<string, string> = {
  empresas:       'Empresa',
  contratos:      'Contrato',
  oportunidades:  'Oportunidad',
  contactos:      'Contacto',
  user_profiles:  'Usuario',
  cups:           'CUPS',
  propuestas:     'Propuesta',
}

// ── Componente principal ───────────────────────────────────────────────────

export default function AuditoriaTab() {
  const [entries, setEntries]     = useState<AuditEntry[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)

  // Filtros
  const [filterAction, setFilterAction]     = useState('')
  const [filterEntity, setFilterEntity]     = useState('')
  const [filterActor, setFilterActor]       = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_log')
        .select('id, created_at, actor_email, action, entity_type, entity_id, old_values, new_values, metadata', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterAction) query = query.eq('action', filterAction.toUpperCase())
      if (filterEntity) query = query.eq('entity_type', filterEntity)
      if (filterActor)  query = query.ilike('actor_email', `%${filterActor}%`)

      const { data, count, error } = await query
      if (error) throw error
      setEntries((data ?? []) as AuditEntry[])
      setTotal(count ?? 0)
    } catch (e) {
      console.error('[AuditoriaTab] error:', e)
      setEntries([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, filterAction, filterEntity, filterActor])

  useEffect(() => {
    void fetchEntries()
  }, [fetchEntries])

  // Reset página al cambiar filtros
  const handleFilter = (setter: (v: string) => void) => (v: string) => {
    setPage(0)
    setter(v)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <Card className="border-none shadow-md bg-white mt-4 overflow-hidden">
      <CardHeader className="border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-display text-valere-blue-dark flex items-center gap-2">
              <Shield className="w-5 h-5" /> Auditoría de actividad
            </CardTitle>
            <CardDescription className="mt-1">
              Registro inmutable de cambios en el CRM · {total.toLocaleString('es-ES')} entradas totales
            </CardDescription>
          </div>
          <button
            onClick={() => { setPage(0); void fetchEntries() }}
            className="p-2 rounded-lg text-slate-400 hover:text-valere-blue-dark hover:bg-slate-50 transition-colors"
            aria-label="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Acción</label>
            <select
              value={filterAction}
              onChange={e => handleFilter(setFilterAction)(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Todas</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="LOGIN">LOGIN</option>
              <option value="EXPORT">EXPORT</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Entidad</label>
            <select
              value={filterEntity}
              onChange={e => handleFilter(setFilterEntity)(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Todas</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Actor (email)</label>
            <input
              type="text"
              value={filterActor}
              onChange={e => handleFilter(setFilterActor)(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
            </tbody>
          </table>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-8 h-8" />}
            title="Sin entradas de auditoría"
            description="Los cambios en empresas, contratos y usuarios aparecerán aquí automáticamente."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-bold text-valere-blue-dark uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-valere-blue-dark uppercase tracking-wide">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-valere-blue-dark uppercase tracking-wide">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-valere-blue-dark uppercase tracking-wide">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-valere-blue-dark uppercase tracking-wide">ID</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.map(e => {
                  const isExpanded = expanded === e.id
                  const fecha = new Date(e.created_at).toLocaleString('es-ES', {
                    dateStyle: 'short', timeStyle: 'medium'
                  })
                  return (
                    <>
                      <tr
                        key={e.id}
                        onClick={() => setExpanded(isExpanded ? null : e.id)}
                        className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">{fecha}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate">
                          {e.actor_email ?? <span className="italic text-slate-400">sistema</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${actionBadgeClass(e.action)}`}>
                            {e.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {ENTITY_LABELS[e.entity_type] ?? e.entity_type}
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono text-slate-400 max-w-[120px] truncate">
                          {e.entity_id ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {(e.old_values || e.new_values) ? '▸ ver diff' : ''}
                        </td>
                      </tr>

                      {isExpanded && (e.old_values || e.new_values) && (
                        <tr key={`${e.id}-detail`} className="bg-slate-50/70">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              {e.old_values && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Valores anteriores</p>
                                  <pre className="text-[10px] bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-40 text-slate-600 leading-relaxed">
                                    {JSON.stringify(e.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {e.new_values && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Valores nuevos</p>
                                  <pre className="text-[10px] bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-40 text-slate-600 leading-relaxed">
                                    {JSON.stringify(e.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Página {page + 1} de {totalPages} · {total} entradas
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-valere-blue-dark hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-valere-blue-dark hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
