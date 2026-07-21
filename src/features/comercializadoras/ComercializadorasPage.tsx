import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../core/hooks/useAuth'
import { useCatalogoConCondiciones, useUpdateCondicion } from './api'
import type { ComercializadoraCondicion } from '../../core/types/entities'

const TIPO_REGLA_LABEL: Record<string, string> = {
  pct_fee: '% sobre fee',
  pct_margen: '% sobre margen',
  fijo_tarifa: 'Fijo por tarifa',
  eur_kw: '€/kW',
  tramos: 'Tramos por volumen',
}
const COMPONENTE_LABEL: Record<string, string> = {
  energia: 'Energia',
  potencia: 'Potencia',
  periodo: 'Por periodo',
  servicio: 'Servicio',
}
const CADENCIA_LABEL: Record<string, string> = {
  one_shot: 'One-shot',
  mensual: 'Mensual',
  trimestral: 'Trimestral',
}
const VIA_LABEL: Record<string, string> = {
  directa: 'Directa',
  zoco: 'Via Zoco (Zoco retiene 10%)',
  xentia: 'Via Xentia (llega neto)',
}
const VIA_BADGE: Record<string, string> = {
  directa: 'bg-emerald-100 text-emerald-800',
  zoco: 'bg-amber-100 text-amber-800',
  xentia: 'bg-sky-100 text-sky-800',
}

function formatValor(c: ComercializadoraCondicion): string {
  if (c.valor == null) return '—'
  if (c.tipo_regla === 'eur_kw') return `${c.valor} €/kW`
  if (c.tipo_regla === 'fijo_tarifa') return `${c.valor} €`
  return `${c.valor}%`
}

function VigenciaCell({ hasta }: { hasta: string | null }) {
  if (!hasta) return <span className="text-slate-400">Sin caducidad</span>
  const fecha = new Date(hasta + 'T00:00:00')
  const dias = Math.ceil((fecha.getTime() - Date.now()) / 86400000)
  const fmt = fecha.toLocaleDateString('es-ES')
  if (dias < 0) return <span className="font-medium text-red-600">Caducada {fmt}</span>
  if (dias <= 60) return <span className="font-medium text-amber-600">⚠ Caduca {fmt} ({dias}d)</span>
  return <span className="text-slate-600">Hasta {fmt}</span>
}

function CondicionRow({ cond, puedeEditar }: { cond: ComercializadoraCondicion; puedeEditar: boolean }) {
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState(cond.valor == null ? '' : String(cond.valor))
  const [hasta, setHasta] = useState(cond.vigencia_hasta ?? '')
  const update = useUpdateCondicion()

  const guardar = async () => {
    const parsed = valor.trim() === '' ? null : Number(valor.replace(',', '.'))
    if (parsed !== null && Number.isNaN(parsed)) {
      toast.error('Valor no numerico')
      return
    }
    try {
      await update.mutateAsync({ id: cond.id, valor: parsed, vigencia_hasta: hasta || null })
      toast.success('Condicion actualizada')
      setEditing(false)
    } catch {
      toast.error('No se pudo guardar (permisos: solo admin)')
    }
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2 text-sm text-slate-700">{cond.producto ?? <span className="text-slate-400">Todos</span>}</td>
      <td className="px-3 py-2 text-sm text-slate-700">{TIPO_REGLA_LABEL[cond.tipo_regla] ?? cond.tipo_regla}</td>
      <td className="px-3 py-2 text-sm text-slate-700">{cond.componente ? COMPONENTE_LABEL[cond.componente] : '—'}</td>
      <td className="px-3 py-2 text-sm">
        {editing ? (
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            aria-label="Valor"
          />
        ) : (
          <span className="font-medium text-slate-900">{formatValor(cond)}</span>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-slate-700">{CADENCIA_LABEL[cond.cadencia] ?? cond.cadencia}</td>
      <td className="px-3 py-2 text-sm">{cond.comisiona_renovacion ? <span className="text-emerald-700">Si</span> : <span className="font-medium text-red-600">No</span>}</td>
      <td className="px-3 py-2 text-sm">
        {editing ? (
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            aria-label="Vigencia hasta"
          />
        ) : (
          <VigenciaCell hasta={cond.vigencia_hasta} />
        )}
      </td>
      <td className="max-w-[16rem] px-3 py-2 text-xs text-slate-500">{cond.notas ?? ''}</td>
      {puedeEditar && (
        <td className="px-3 py-2 text-right text-sm whitespace-nowrap">
          {editing ? (
            <>
              <button onClick={guardar} disabled={update.isPending} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60">Guardar</button>
              <button onClick={() => setEditing(false)} className="ml-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Cancelar</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Editar</button>
          )}
        </td>
      )}
    </tr>
  )
}

export default function ComercializadorasPage() {
  const catalogo = useCatalogoConCondiciones()
  const { user } = useAuth()
  const puedeEditar = user?.role === 'master' || (user?.funciones ?? []).includes('admin')

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Comercializadoras</h1>
        <p className="mt-1 text-sm text-slate-500">
          Catalogo maestro de canales de venta y sus condiciones de comision. Fuente: REGLAS DE
          COMISIONES Y CANALES v2. Los importes son pactos comerciales: editables por admin.
        </p>
      </div>

      {catalogo.isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}
      {catalogo.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error cargando el catalogo.{' '}
          <button onClick={() => catalogo.refetch()} className="underline">Reintentar</button>
        </div>
      )}
      {catalogo.data && catalogo.data.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No hay comercializadoras en el catalogo.
        </div>
      )}

      {catalogo.data?.map((com) => (
        <section key={com.id} className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{com.nombre_canonico}</h2>
            {com.via && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VIA_BADGE[com.via]}`}>
                {VIA_LABEL[com.via]}
              </span>
            )}
            {com.segmento && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{com.segmento}</span>
            )}
            {!com.activa && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Inactiva</span>
            )}
            {com.notes && <span className="ml-auto text-xs text-slate-400">{com.notes}</span>}
          </div>
          {com.comercializadora_condiciones.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Sin condiciones dictadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium">Regla</th>
                    <th className="px-3 py-2 font-medium">Componente</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Cadencia</th>
                    <th className="px-3 py-2 font-medium">Renueva</th>
                    <th className="px-3 py-2 font-medium">Vigencia</th>
                    <th className="px-3 py-2 font-medium">Notas</th>
                    {puedeEditar && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {com.comercializadora_condiciones.map((c) => (
                    <CondicionRow key={c.id} cond={c} puedeEditar={puedeEditar} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
