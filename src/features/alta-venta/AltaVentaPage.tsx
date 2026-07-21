import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { calcDiasVencimiento, calcPrioridad } from '../../core/utils/energy'
import { useComercializadorasCanal } from '../comercializadoras/api'
import {
  useBuscarEmpresas,
  useComisionaRenovacion,
  useCreateContratoAsistente,
  useCreateCups,
  useCreateEmpresaMin,
  useCreateRenovacionAsistente,
  useCupsDeEmpresa,
  vincularCupsAContrato,
} from './api'
import { periodosPorTarifa, TARIFAS_ASISTENTE } from './periodos'
import type { ContratoInsert, PrioridadRenovacion } from '../../core/types/entities'

const inputCls = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none'
const labelCls = 'mb-1 block text-sm font-medium text-slate-700'

const PRIORIDADES: PrioridadRenovacion[] = ['critica', 'alta', 'media', 'baja', 'ok']

interface Creados {
  empresaId: string | null
  cupsId: string | null
  contratoId: string | null
  renovacionId: string | null
}

export default function AltaVentaPage() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)

  // ── Paso 1: empresa ──
  const [busqueda, setBusqueda] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [nuevaEmpresa, setNuevaEmpresa] = useState(false)
  const [nifNuevo, setNifNuevo] = useState('')
  const [ciudadNueva, setCiudadNueva] = useState('')
  const sugerencias = useBuscarEmpresas(busqueda)

  // ── Paso 2: CUPS ──
  const [cupsId, setCupsId] = useState<string | null>(null)
  const [nuevoCups, setNuevoCups] = useState(false)
  const [codigoCups, setCodigoCups] = useState('')
  const [direccionCups, setDireccionCups] = useState('')
  const [tarifa, setTarifa] = useState<string>('2.0TD')
  const cupsExistentes = useCupsDeEmpresa(empresaId)

  // ── Paso 3: contrato adaptativo ──
  const canales = useComercializadorasCanal()
  const [comercializadoraId, setComercializadoraId] = useState('')
  const [tipoPrecio, setTipoPrecio] = useState<'fijo' | 'indexado'>('fijo')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [potencias, setPotencias] = useState<string[]>(Array(6).fill(''))
  const [energias, setEnergias] = useState<string[]>(Array(6).fill(''))
  const periodos = periodosPorTarifa(tarifa)

  // ── Paso 4: renovacion ──
  const diasVenc = fechaFin ? calcDiasVencimiento(fechaFin) : null
  const prioridadCalculada: PrioridadRenovacion = diasVenc == null ? 'alta' : calcPrioridad(diasVenc)
  const [prioridad, setPrioridad] = useState<PrioridadRenovacion | ''>('')
  const prioridadFinal = prioridad || prioridadCalculada
  const comisiona = useComisionaRenovacion(comercializadoraId || null)

  const [creados, setCreados] = useState<Creados>({ empresaId: null, cupsId: null, contratoId: null, renovacionId: null })
  const [creando, setCreando] = useState(false)
  const [hecho, setHecho] = useState(false)

  const crearEmpresa = useCreateEmpresaMin()
  const crearCups = useCreateCups()
  const crearContrato = useCreateContratoAsistente()
  const crearRenovacion = useCreateRenovacionAsistente()

  const canal = useMemo(
    () => canales.data?.find((c) => c.id === comercializadoraId) ?? null,
    [canales.data, comercializadoraId],
  )

  const num = (s: string): number | null => {
    const t = s.trim()
    if (t === '') return null
    const v = Number(t.replace(',', '.'))
    return Number.isNaN(v) ? null : v
  }

  const validarPaso = (): string | null => {
    if (paso === 1) {
      if (nuevaEmpresa) return empresaNombre.trim().length >= 2 ? null : 'Nombre de empresa obligatorio'
      return empresaId ? null : 'Selecciona una empresa o crea una nueva'
    }
    if (paso === 2) {
      if (!nuevoCups) return cupsId ? null : 'Selecciona un CUPS o crea uno nuevo'
      const cod = codigoCups.trim().toUpperCase()
      if (!/^ES\d{16}[A-Z]{2}\d?[A-Z]?$/.test(cod)) return 'CUPS no valido (ES + 16 digitos + letras de control)'
      return null
    }
    if (paso === 3) {
      if (!comercializadoraId) return 'Selecciona comercializadora del catalogo'
      if (!fechaInicio) return 'Fecha de inicio obligatoria'
      return null
    }
    return null
  }

  const siguiente = () => {
    const err = validarPaso()
    if (err) { toast.error(err); return }
    setPaso((p) => Math.min(4, p + 1))
  }

  const crearVenta = async () => {
    setCreando(true)
    try {
      // 1) empresa
      let eId = creados.empresaId ?? empresaId
      if (!eId) {
        const e = await crearEmpresa.mutateAsync({
          nombre: empresaNombre.trim(),
          nif: nifNuevo.trim() || null,
          ciudad: ciudadNueva.trim() || null,
        })
        eId = e.id
        setCreados((c) => ({ ...c, empresaId: eId }))
      }
      // 2) CUPS (periodos que no aplican -> null, nunca 0)
      let cId = creados.cupsId ?? cupsId
      if (!cId) {
        const extras: Record<string, number | null> = {}
        for (let i = 0; i < 6; i++) {
          extras[`p${i + 1}_kw`] = i < periodos.potencias ? num(potencias[i]) : null
          extras[`energia_p${i + 1}_kwh`] = i < periodos.energias ? num(energias[i]) : null
        }
        const c = await crearCups.mutateAsync({
          empresa_id: eId,
          codigo_cups: codigoCups.trim().toUpperCase(),
          direccion_suministro: direccionCups.trim() || null,
          tarifa_acceso: tarifa,
          estado: 'activo',
          ...extras,
        })
        cId = c.id
        setCreados((c2) => ({ ...c2, cupsId: cId }))
      }
      // 3) contrato
      let ctId = creados.contratoId
      const compania = canal?.nombre_canonico ?? ''
      if (!ctId) {
        const insert = {
          empresa_id: eId,
          comercializadora_id: comercializadoraId,
          compania,
          numero_contrato: numeroContrato.trim() || null,
          estado: 'activo',
          tipo_energia: 'electrica',
          tipo_precio: tipoPrecio,
          tarifa_acceso: tarifa,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin || null,
          observaciones: 'Alta con asistente (PR-3.2)',
        } as unknown as ContratoInsert
        const ct = await crearContrato.mutateAsync(insert)
        ctId = ct.id
        setCreados((c2) => ({ ...c2, contratoId: ctId }))
        await vincularCupsAContrato(cId, ctId, compania)
      }
      // 4) renovacion autogenerada (prioridad de negocio editable, leccion #77)
      if (!creados.renovacionId) {
        const r = await crearRenovacion.mutateAsync({
          contrato_id: ctId,
          empresa_id: eId,
          estado: 'detectada',
          prioridad: prioridadFinal,
          fecha_deteccion: new Date().toISOString().slice(0, 10),
          fecha_vencimiento_contrato: fechaFin || null,
          notas: 'Autogenerada por asistente de alta',
        })
        setCreados((c2) => ({ ...c2, renovacionId: r.id }))
      }
      setHecho(true)
      toast.success('Venta dada de alta completa')
    } catch (e) {
      toast.error('Fallo en el alta: puedes reintentar, lo ya creado no se duplica', {
        description: (e as Error).message,
      })
    } finally {
      setCreando(false)
    }
  }

  if (hecho) {
    const eId = creados.empresaId ?? empresaId
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-xl font-semibold text-slate-900">✅ Venta dada de alta</h1>
        <p className="text-sm text-slate-600">
          Empresa, CUPS, contrato y renovación creados. La renovación ya está en el pipeline
          con prioridad <span className="font-medium">{prioridadFinal}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/empresas/${eId}`} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Ver ficha de empresa</Link>
          <Link to={`/contratos/${creados.contratoId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">Ver contrato</Link>
          <Link to="/renovaciones" className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">Ver pipeline</Link>
          <button onClick={() => navigate(0)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">Nueva alta</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nueva venta</h1>
        <p className="mt-1 text-sm text-slate-500">Alta completa en 4 pasos: empresa → CUPS → contrato → renovación.</p>
      </div>

      <ol className="flex gap-2 text-xs" aria-label="Progreso del asistente">
        {['Empresa', 'CUPS', 'Contrato', 'Renovación'].map((t, i) => (
          <li
            key={t}
            className={`flex-1 rounded-full px-3 py-1 text-center font-medium ${
              paso === i + 1 ? 'bg-slate-900 text-white' : paso > i + 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      {paso === 1 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          {!nuevaEmpresa && (
            <>
              <label className="block">
                <span className={labelCls}>Buscar empresa (nombre o NIF)</span>
                <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setEmpresaId(null) }} className={inputCls} placeholder="CHEMTROL, B4501…" autoFocus />
              </label>
              {sugerencias.data && sugerencias.data.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {sugerencias.data.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => { setEmpresaId(e.id); setEmpresaNombre(e.nombre); setBusqueda(e.nombre) }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${empresaId === e.id ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        <span>{e.nombre}</span>
                        <span className="text-xs text-slate-400">{e.nif ?? 'Sin NIF'}{e.ciudad ? ` · ${e.ciudad}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {sugerencias.data && sugerencias.data.length === 0 && busqueda.trim().length >= 2 && (
                <p className="text-sm text-slate-500">Sin resultados para «{busqueda}».</p>
              )}
              <button onClick={() => { setNuevaEmpresa(true); setEmpresaId(null); setEmpresaNombre(busqueda.trim()) }} className="text-sm text-slate-600 underline">
                + Crear empresa nueva
              </button>
            </>
          )}
          {nuevaEmpresa && (
            <>
              <label className="block"><span className={labelCls}>Nombre *</span>
                <input value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} className={inputCls} autoFocus /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={labelCls}>NIF</span>
                  <input value={nifNuevo} onChange={(e) => setNifNuevo(e.target.value)} className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Ciudad</span>
                  <input value={ciudadNueva} onChange={(e) => setCiudadNueva(e.target.value)} className={inputCls} /></label>
              </div>
              <button onClick={() => setNuevaEmpresa(false)} className="text-sm text-slate-600 underline">← Volver a buscar</button>
            </>
          )}
        </section>
      )}

      {paso === 2 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          {!nuevoCups && empresaId && (
            <>
              {cupsExistentes.isLoading && <p className="text-sm text-slate-400">Cargando CUPS…</p>}
              {cupsExistentes.data && cupsExistentes.data.length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {cupsExistentes.data.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => { setCupsId(c.id); if (c.tarifa_acceso) setTarifa(c.tarifa_acceso) }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${cupsId === c.id ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        <span className="font-mono text-xs">{c.codigo_cups}</span>
                        <span className="text-xs text-slate-400">{c.tarifa_acceso ?? 'sin tarifa'}{c.direccion_suministro ? ` · ${c.direccion_suministro}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !cupsExistentes.isLoading && <p className="text-sm text-slate-500">Esta empresa no tiene CUPS todavía.</p>
              )}
            </>
          )}
          {(nuevoCups || !empresaId) && (
            <>
              <label className="block"><span className={labelCls}>Código CUPS *</span>
                <input value={codigoCups} onChange={(e) => setCodigoCups(e.target.value)} className={`${inputCls} font-mono`} placeholder="ES0031…" autoFocus /></label>
              <label className="block"><span className={labelCls}>Dirección de suministro</span>
                <input value={direccionCups} onChange={(e) => setDireccionCups(e.target.value)} className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Tarifa de acceso *</span>
                <select value={tarifa} onChange={(e) => setTarifa(e.target.value)} className={inputCls}>
                  {TARIFAS_ASISTENTE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></label>
            </>
          )}
          <button onClick={() => { setNuevoCups((v) => !v); setCupsId(null) }} className="text-sm text-slate-600 underline">
            {nuevoCups ? '← Elegir un CUPS existente' : '+ Crear CUPS nuevo'}
          </button>
        </section>
      )}

      {paso === 3 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block md:col-span-2"><span className={labelCls}>Comercializadora *</span>
              <select value={comercializadoraId} onChange={(e) => setComercializadoraId(e.target.value)} className={inputCls}>
                <option value="">— Selecciona del catálogo —</option>
                {canales.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_canonico}{c.via === 'zoco' ? ' (vía Zoco)' : c.via === 'xentia' ? ' (vía Xentia)' : ''}
                  </option>
                ))}
              </select></label>
            <label className="block"><span className={labelCls}>Tipo de precio</span>
              <select value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value as 'fijo' | 'indexado')} className={inputCls}>
                <option value="fijo">Fijo</option>
                <option value="indexado">Indexado</option>
              </select></label>
            <label className="block"><span className={labelCls}>Nº contrato</span>
              <input value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className={labelCls}>Fecha inicio *</span>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className={labelCls}>Fecha fin</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputCls} /></label>
          </div>

          {!cupsId && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Tarifa {tarifa}: {periodos.potencias} potencias + {periodos.energias} energías (el resto no aplica)
              </p>
              <div>
                <span className={labelCls}>Potencias contratadas (kW)</span>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {Array.from({ length: periodos.potencias }, (_, i) => (
                    <input key={i} value={potencias[i]} onChange={(e) => setPotencias((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                      className={inputCls} placeholder={`P${i + 1}`} aria-label={`Potencia P${i + 1}`} />
                  ))}
                </div>
              </div>
              <div>
                <span className={labelCls}>Energías anuales (kWh)</span>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {Array.from({ length: periodos.energias }, (_, i) => (
                    <input key={i} value={energias[i]} onChange={(e) => setEnergias((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                      className={inputCls} placeholder={`P${i + 1}`} aria-label={`Energía P${i + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {paso === 4 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Empresa</dt><dd className="font-medium">{empresaNombre || '—'}</dd>
            <dt className="text-slate-500">CUPS</dt><dd className="font-mono text-xs">{cupsId ? cupsExistentes.data?.find((c) => c.id === cupsId)?.codigo_cups : codigoCups.toUpperCase()}</dd>
            <dt className="text-slate-500">Comercializadora</dt><dd className="font-medium">{canal?.nombre_canonico ?? '—'}</dd>
            <dt className="text-slate-500">Vigencia</dt><dd>{fechaInicio || '—'} → {fechaFin || 'sin fecha fin'}</dd>
          </dl>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">Renovación autogenerada</p>
            <p className="mt-1 text-xs text-slate-500">
              {fechaFin
                ? `Vence en ${diasVenc}d → prioridad estimada «${prioridadCalculada}». Ajústala si el negocio manda otra cosa.`
                : 'Sin fecha fin: entra en la bandeja «Sin fecha» con la prioridad que elijas (por defecto alta).'}
            </p>
            <label className="mt-2 block"><span className={labelCls}>Prioridad</span>
              <select value={prioridadFinal} onChange={(e) => setPrioridad(e.target.value as PrioridadRenovacion)} className={inputCls}>
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}{p === prioridadCalculada ? ' (estimada)' : ''}</option>)}
              </select></label>
            {comisiona.data === false && (
              <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
                ⚠ {canal?.nombre_canonico} no comisiona renovación (tras 12 meses): renovarla es defensa de cartera, no ingreso.
              </p>
            )}
          </div>

          <button onClick={crearVenta} disabled={creando} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
            {creando ? 'Creando…' : 'Crear venta completa'}
          </button>
        </section>
      )}

      <div className="flex justify-between">
        <button onClick={() => setPaso((p) => Math.max(1, p - 1))} disabled={paso === 1 || creando} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40">← Anterior</button>
        {paso < 4 && (
          <button onClick={siguiente} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Siguiente →</button>
        )}
      </div>
    </div>
  )
}
