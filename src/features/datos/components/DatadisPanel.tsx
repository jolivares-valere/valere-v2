/**
 * DatadisPanel.tsx — Panel de integración con Datadis para /datos
 *
 * Permite:
 *   1. Configurar credenciales Datadis de la empresa (NIF + contraseña)
 *   2. Lanzar sincronización manual → descarga datos técnicos del CUPS
 *      y consumos horarios → genera facturas mensuales automáticamente
 *   3. Ver estado de la última sincronización y errores
 *   4. Ver resumen de consumos descargados
 */

import React, { useState } from 'react'
import StatusBadge from '../../../core/components/StatusBadge'
import {
  useDatadisToken,
  useGuardarToken,
  useEliminarToken,
  useDatadisSync,
  useDatadisConsumptions,
} from '../../../core/hooks/useDatadis'
import type { Cups } from '../../../core/types/entities'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  cups: Cups
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatKwh(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kWh'
}

// ─── Subcomponente: formulario de credenciales ───────────────────────────────

function FormCredenciales({
  empresaId,
  usernameActual,
  onCancel,
}: {
  empresaId: string
  usernameActual?: string
  onCancel: () => void
}) {
  const [username, setUsername] = useState(usernameActual ?? '')
  const [password, setPassword] = useState('')
  const guardar = useGuardarToken(empresaId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    guardar.mutate({ username, password }, { onSuccess: onCancel })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          NIF / NIE / CIF del titular del suministro
        </label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value.toUpperCase())}
          placeholder="B12345678"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Es el mismo NIF/CIF con el que está registrado el cliente en Datadis.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contraseña de Datadis
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña del portal datadis.es"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="new-password"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          El cliente debe tener cuenta activa en{' '}
          <a
            href="https://datadis.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            datadis.es
          </a>{' '}
          y haber autorizado la consulta de sus datos.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardar.isPending}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar credenciales'}
        </button>
      </div>
    </form>
  )
}

// ─── Subcomponente: resumen de consumos ──────────────────────────────────────

function ResumenConsumos({ cupsId }: { cupsId: string }) {
  const hace3Meses = new Date()
  hace3Meses.setMonth(hace3Meses.getMonth() - 3)
  const fechaDesde = hace3Meses.toISOString().slice(0, 10)

  const { data: consumptions, isLoading } = useDatadisConsumptions(cupsId, fechaDesde)

  if (isLoading) {
    return (
      <div className="h-16 rounded-xl bg-slate-100 animate-pulse" aria-label="Cargando consumos" />
    )
  }

  if (!consumptions || consumptions.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No hay consumos descargados aún. Lanza la sincronización para obtenerlos.
      </p>
    )
  }

  const totalKwh = consumptions.reduce((s, c) => s + c.consumo_kwh, 0)
  const totalExc = consumptions.reduce((s, c) => s + c.excedente_kwh, 0)
  const diasUnicos = new Set(consumptions.map(c => c.fecha)).size

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl bg-blue-50 p-3 text-center">
        <p className="text-xs text-blue-600 font-medium">Consumo (3 meses)</p>
        <p className="text-lg font-bold text-blue-800">{formatKwh(totalKwh)}</p>
      </div>
      <div className="rounded-xl bg-green-50 p-3 text-center">
        <p className="text-xs text-green-600 font-medium">Excedentes (3 meses)</p>
        <p className="text-lg font-bold text-green-800">{formatKwh(totalExc)}</p>
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-center">
        <p className="text-xs text-slate-600 font-medium">Días con datos</p>
        <p className="text-lg font-bold text-slate-800">{diasUnicos}</p>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DatadisPanel({ cups }: Props) {
  const [editandoCredenciales, setEditandoCredenciales] = useState(false)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [fechaHasta, setFechaHasta] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [generarFacturas, setGenerarFacturas] = useState(true)

  const { data: token, isLoading: loadingToken } = useDatadisToken(cups.empresa_id)
  const eliminar = useEliminarToken(cups.empresa_id)
  const sync = useDatadisSync()

  function handleSync() {
    sync.mutate({
      cupsId: cups.id,
      codigoCups: cups.codigo_cups,
      empresaId: cups.empresa_id,
      fechaDesde,
      fechaHasta,
      generarFacturas,
    })
  }

  // ── Estado de sincronización del CUPS ─────────────────────────────────────
  const sincronizado = cups.datadis_sincronizado === true
  const ultimaSync = cups.datadis_ultima_sync

  return (
    <div className="space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Integración Datadis
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Importa automáticamente datos técnicos y consumos históricos para el CUPS{' '}
            <span className="font-mono font-medium text-slate-700">{cups.codigo_cups}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sincronizado ? (
            <StatusBadge variant="success">Sincronizado</StatusBadge>
          ) : (
            <StatusBadge variant="neutral">Sin sincronizar</StatusBadge>
          )}
        </div>
      </div>

      {/* ── Estado de credenciales ─────────────────────────────────────── */}
      {loadingToken ? (
        <div className="h-20 rounded-xl bg-slate-100 animate-pulse" aria-label="Cargando credenciales" />
      ) : editandoCredenciales ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">
            {token ? 'Actualizar credenciales' : 'Configurar credenciales Datadis'}
          </h4>
          <FormCredenciales
            empresaId={cups.empresa_id}
            usernameActual={token?.username}
            onCancel={() => setEditandoCredenciales(false)}
          />
        </div>
      ) : token ? (
        /* Credenciales ya configuradas */
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Cuenta Datadis configurada
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Usuario:{' '}
                <span className="font-mono font-medium">{token.username}</span>
                {' · '}
                {token.autorizado ? (
                  <span className="text-green-600">Autorizado ✓</span>
                ) : (
                  <span className="text-amber-600">Pendiente de verificar</span>
                )}
              </p>
              {token.ultimo_error && (
                <p className="mt-1 text-xs text-red-600">
                  Último error: {token.ultimo_error}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditandoCredenciales(true)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white"
              >
                Cambiar
              </button>
              <button
                onClick={() => eliminar.mutate()}
                disabled={eliminar.isPending}
                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sin credenciales */
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
          <div className="text-3xl mb-2">🔌</div>
          <p className="text-sm font-medium text-slate-700">
            Conecta con Datadis para importar datos automáticamente
          </p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Necesitas las credenciales del titular del suministro en datadis.es
          </p>
          <button
            onClick={() => setEditandoCredenciales(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Configurar credenciales
          </button>
        </div>
      )}

      {/* ── Opciones de sincronización (solo si hay credenciales) ────────── */}
      {token && !editandoCredenciales && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h4 className="text-sm font-medium text-slate-700">
            Opciones de sincronización
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                max={fechaHasta}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                min={fechaDesde}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generarFacturas}
              onChange={e => setGenerarFacturas(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Generar facturas mensuales automáticamente
            </span>
          </label>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {ultimaSync
                ? `Última sincronización: ${formatFecha(ultimaSync)}`
                : 'Nunca sincronizado'}
            </p>
            <button
              onClick={handleSync}
              disabled={sync.isPending}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              aria-label="Sincronizar datos desde Datadis"
            >
              {sync.isPending ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sincronizando…
                </>
              ) : (
                'Sincronizar ahora'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Resumen de consumos descargados ──────────────────────────────── */}
      {sincronizado && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">
            Consumos descargados (últimos 3 meses)
          </h4>
          <ResumenConsumos cupsId={cups.id} />
        </div>
      )}

      {/* ── Info pie ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
        <p className="text-xs text-blue-700">
          <strong>¿Qué importa Datadis?</strong> Distribuidor, tarifa de acceso, potencias contratadas,
          comercializadora actual, consumos horarios y energías anuales por período (P1–P6).
          Los datos se sincronizan sobre la información ya introducida manualmente.
        </p>
      </div>
    </div>
  )
}
