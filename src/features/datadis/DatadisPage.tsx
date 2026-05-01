import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  AlertTriangle, Building2, CheckCircle2, ChevronDown, ChevronUp,
  ChevronRight, Database, Eye, EyeOff, Info, Link2, Loader2,
  LogIn, MapPin, RefreshCw, User, Wifi, WifiOff, X, Zap,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useDatadisSupplies, type DatadisCreds, type DatadisSupply } from './api'
import AsociarEmpresaDialog from './components/AsociarEmpresaDialog'

// --- Helpers ---

const DISTRIBUTOR_NAMES: Record<string, string> = {
  // Códigos cortos (portal Datadis)
  '1': 'UFD (Gas Natural Fenosa)',
  '2': 'EDISTRIBUCIÓN (Endesa)',
  '3': 'I-DE (Iberdrola)',
  '4': 'UFD Distribución',
  '5': 'Viesgo / E.ON',
  '6': 'EOSA',
  '7': 'Eléctrica de Tentudía',
  '8': 'EREDES',
  // Códigos largos (legacy)
  '0021': 'I-DE (Iberdrola)',
  '0022': 'EDISTRIBUCIÓN (Endesa)',
  '0023': 'UFD (Gas Natural)',
  '0024': 'EDISTRIBUCIÓN (Naturgy)',
  '0031': 'EOSA',
  '0033': 'EREDES',
  '0029': 'UFD Distribución',
  '0026': 'Viesgo / E.ON',
}

function distributorLabel(supply: DatadisSupply): string {
  const nombre = supply['distribuidora'] as string | undefined
  if (nombre && typeof nombre === 'string' && nombre.length > 2) return nombre
  const code = String(supply['cod_disitribuidora'] ?? supply.distributor ?? '')
  return DISTRIBUTOR_NAMES[code] ?? (code || '---')
}

const TARIFF_COLORS: Record<string, string> = {
  '2.0TD': 'bg-emerald-100 text-emerald-700',
  '3.0TD': 'bg-blue-100 text-blue-700',
  '6.1TD': 'bg-purple-100 text-purple-700',
  '6.2TD': 'bg-purple-100 text-purple-700',
  '6.3TD': 'bg-purple-100 text-purple-700',
  '6.4TD': 'bg-purple-100 text-purple-700',
}

function tariffBadge(tariff?: string) {
  if (!tariff) return null
  const cls = TARIFF_COLORS[tariff] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {tariff}
    </span>
  )
}

const POINT_TYPE: Record<number, string> = {
  1: 'Telemedida',
  2: 'Telegestión',
  3: 'Tipo 3',
  4: 'Tipo 4 (BT)',
  5: 'Tipo 5',
}

// --- Panel de credenciales ---

interface CredsFormProps {
  onConnect: (creds: DatadisCreds) => void
  onDisconnect: () => void
  activeCreds?: DatadisCreds
}

function CredsForm({ onConnect, onDisconnect, activeCreds }: CredsFormProps) {
  const [open, setOpen]         = useState(false)
  const [user, setUser]         = useState('')
  const [pass, setPass]         = useState('')
  const [showPass, setShowPass] = useState(false)

  if (activeCreds) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">{activeCreds.username}</span>
        </div>
        <button
          type="button"
          onClick={onDisconnect}
          title="Volver a cuenta master Valere"
          className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
      >
        <User className="h-3.5 w-3.5" />
        Cuenta propia
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="mb-3 text-xs text-slate-500">
            Conecta con tu propia cuenta de Datadis para ver los suministros autorizados bajo tu NIF.
          </p>
          <div className="space-y-2">
            <div>
              <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Usuario Datadis
              </label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="usuario@empresa.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && user && pass) {
                      onConnect({ username: user, password: pass })
                      setOpen(false)
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 pr-8 text-xs text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={!user || !pass}
              onClick={() => {
                onConnect({ username: user, password: pass })
                setOpen(false)
              }}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogIn className="h-3.5 w-3.5" />
              Conectar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Fila de suministro (P1-B: Link para Ctrl+click, row onClick para UX) ---

interface SupplyRowProps {
  supply: DatadisSupply
  idx: number
  onOpenAsociar?: (supply: DatadisSupply) => void
}

function SupplyRow({ supply, idx, onOpenAsociar }: SupplyRowProps) {
  const navigate = useNavigate()
  const cups      = supply.cups ?? '---'
  const tariff    = String(supply['tarifa'] ?? supply.tariff ?? supply['tarifaCode'] ?? '')
  const province  = String(supply['provincia'] ?? supply.province ?? '')
  const munic     = String(supply['municipio'] ?? supply.municipality ?? '')
  const tipoPunto = Number(supply['tipoPunto'] ?? supply.pointType ?? supply['tipoPuntoMedida'] ?? 0)

  function handleClick() {
    if (supply.cups) navigate(`/datadis/${encodeURIComponent(supply.cups)}`)
  }

  function handleAsociarClick(e: React.MouseEvent) {
    e.stopPropagation()
    onOpenAsociar?.(supply)
  }

  return (
    <tr
      className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/50 ${
        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
      }`}
      onClick={handleClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
          </div>
          {/* P1-B: Link for Ctrl+click / accessibility */}
          <Link
            to={supply.cups ? `/datadis/${encodeURIComponent(supply.cups)}` : '/datadis'}
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs font-medium text-slate-800 hover:text-blue-600"
          >
            {cups}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-xs text-slate-700">{distributorLabel(supply)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {tariff ? tariffBadge(tariff) : (
          <span className="text-[11px] text-slate-300 italic">N/D</span>
        )}
      </td>
      <td className="px-4 py-3">
        {(province || munic) ? (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {munic && <span>{munic}</span>}
            {province && munic && <span>·</span>}
            {province && <span>{province}</span>}
          </div>
        ) : (
          <span className="text-xs text-slate-300">---</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">
          {POINT_TYPE[tipoPunto] ?? (tipoPunto ? `Tipo ${tipoPunto}` : '---')}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleAsociarClick}
          className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
          title="Asociar a empresa"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}

// --- Página principal ---

export default function DatadisPage() {
  const [activeCreds, setActiveCreds] = useState<DatadisCreds | undefined>()
  const [asociarDialogOpen, setAsociarDialogOpen] = useState(false)
  const [selectedSupplyForAsociar, setSelectedSupplyForAsociar] = useState<DatadisSupply | null>(null)

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } =
    useDatadisSupplies(activeCreds)

  const supplies          = data?.response ?? []
  const errorSupplies     = data?.errorSupplies ?? []
  const isPartialResponse = data?.CodError === '902'

  // Agrupar por distribuidora usando label legible
  const byDistributor = supplies.reduce<Record<string, number>>((acc, s) => {
    const label = distributorLabel(s)
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Datadis</h1>
              <p className="text-xs text-slate-500">
                {activeCreds
                  ? `Cuenta: ${activeCreds.username}`
                  : 'Suministros del NIF autorizado en la plataforma Datadis'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CredsForm
              activeCreds={activeCreds}
              onConnect={creds => setActiveCreds(creds)}
              onDisconnect={() => setActiveCreds(undefined)}
            />
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {isLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Conectando con Datadis...</span>
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <WifiOff className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Error al conectar con Datadis</p>
              <p className="text-xs text-red-600 mt-0.5">
                {error instanceof Error ? error.message : 'Error desconocido'}
              </p>
              {activeCreds && (
                <p className="mt-1.5 text-xs text-red-500">
                  Verifica que las credenciales de <strong>{activeCreds.username}</strong> sean correctas.
                </p>
              )}
            </div>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {isPartialResponse && errorSupplies.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Respuesta parcial de Datadis (CodError 902)</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Algunas distribuidoras no respondieron a tiempo. Los suministros de{' '}
                    <span className="font-semibold">
                      {errorSupplies.map(e => e.distributor ?? e.cups ?? '?').join(', ')}
                    </span>{' '}
                    pueden estar incompletos. Reintenta más tarde.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Suministros</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{supplies.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Distribuidoras</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{Object.keys(byDistributor).length}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">Sin respuesta</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{errorSupplies.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actualizado</p>
                <p className="mt-1 text-sm font-bold text-slate-700 flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  {lastUpdated ?? '---'}
                </p>
              </div>
            </div>

            {Object.keys(byDistributor).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Desglose por distribuidora
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byDistributor).map(([label, count]) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
                    >
                      <span className="font-semibold text-slate-700">{label}</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-px text-[10px] font-bold text-blue-700">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {supplies.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Listado de suministros</span>
                  <span className="text-[11px] text-slate-400">Haz clic en un suministro para ver su detalle</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">CUPS</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Distribuidora</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Tarifa
                          <span className="ml-1 text-slate-300 font-normal normal-case">(del contrato)</span>
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ubicación</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipo</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {supplies.map((supply, idx) => (
                        <SupplyRow
                          key={supply.cups ?? idx}
                          supply={supply}
                          idx={idx}
                          onOpenAsociar={(s) => {
                            setSelectedSupplyForAsociar(s)
                            setAsociarDialogOpen(true)
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <Database className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No se encontraron suministros</p>
                <p className="mt-1 text-xs text-slate-400">
                  {activeCreds
                    ? `Comprueba que ${activeCreds.username} tiene suministros autorizados en Datadis.`
                    : 'Comprueba que las credenciales Datadis están configuradas y que el NIF tiene suministros autorizados.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Asociar a empresa */}
      {selectedSupplyForAsociar && (
        <AsociarEmpresaDialog
          supply={selectedSupplyForAsociar}
          open={asociarDialogOpen}
          onClose={() => {
            setAsociarDialogOpen(false)
            setSelectedSupplyForAsociar(null)
          }}
          onSuccess={() => {
            void refetch()
          }}
        />
      )}
    </div>
  )
}
