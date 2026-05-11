import { useState } from 'react'
import {
  Sun, LayoutDashboard, MapPin, BarChart2, ArrowLeftRight,
  AlertTriangle, KeyRound, UserX, FileText, FlaskConical,
} from 'lucide-react'
import { useTodasLasPlantas } from './api'
import {
  FIXTURE_PLANTAS, FIXTURE_PLANTAS_SIN_ASIGNAR, FIXTURE_KPI_DIARIO,
  FIXTURE_COMPARATIVA, FIXTURE_INCIDENCIAS, FIXTURE_CREDENCIALES, FIXTURE_INFORMES,
} from './fixtures'
import ResumenTab        from './components/ResumenTab'
import PlantasTab        from './components/PlantasTab'
import ProduccionTab     from './components/ProduccionTab'
import ExcedentesTab     from './components/ExcedentesTab'
import IncidenciasTab    from './components/IncidenciasTab'
import CredencialesTab   from './components/CredencialesTab'
import SinAsignarTab     from './components/SinAsignarTab'
import InformesTab       from './components/InformesTab'

type TabId =
  | 'resumen' | 'plantas' | 'produccion' | 'excedentes'
  | 'incidencias' | 'credenciales' | 'sin-asignar' | 'informes'

interface Tab {
  id: TabId
  label: string
  Icon: React.ElementType
  badge?: number
  badgeColor?: string
}

export default function SeguimientoFVPage() {
  const [tabActual, setTabActual] = useState<TabId>('resumen')

  const { data: plantasReales, isLoading } = useTodasLasPlantas()
  const usarFixtures = !isLoading && (!plantasReales || plantasReales.length === 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plantas: any[]  = usarFixtures ? FIXTURE_PLANTAS          : (plantasReales ?? [])
  const sinAsignar      = usarFixtures ? FIXTURE_PLANTAS_SIN_ASIGNAR : (plantasReales ?? []).filter((p: any) => !p.empresa_id)
  const kpiDiario       = FIXTURE_KPI_DIARIO
  const comparativa     = FIXTURE_COMPARATIVA
  const incidencias     = FIXTURE_INCIDENCIAS
  const informes        = FIXTURE_INFORMES

  const nIncidencias    = incidencias.filter(i => !i.resuelta).length
  const nCriticos       = comparativa.filter(c => c.estado === 'critico').length
  const nSinAsignar     = sinAsignar.length

  const tabs: Tab[] = [
    { id: 'resumen',      label: 'Resumen',              Icon: LayoutDashboard },
    { id: 'plantas',      label: 'Plantas',               Icon: MapPin,         badge: plantas.length },
    { id: 'produccion',   label: 'Producción',            Icon: BarChart2 },
    { id: 'excedentes',   label: 'Excedentes / Datadis',  Icon: ArrowLeftRight, badge: nCriticos  || undefined, badgeColor: 'bg-red-500' },
    { id: 'incidencias',  label: 'Incidencias',           Icon: AlertTriangle,  badge: nIncidencias || undefined, badgeColor: 'bg-red-500' },
    { id: 'credenciales', label: 'Credenciales',          Icon: KeyRound },
    { id: 'sin-asignar',  label: 'Sin asignar',           Icon: UserX,          badge: nSinAsignar || undefined, badgeColor: 'bg-slate-500' },
    { id: 'informes',     label: 'Informes',              Icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cabecera + tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-valere-blue-dark">
                  Seguimiento Plantas FV
                </h1>
                <p className="text-xs text-slate-500">Control operativo · producción · excedentes · Datadis</p>
              </div>
            </div>

            {usarFixtures && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
                <FlaskConical className="w-3.5 h-3.5" />
                Datos de demostración
              </span>
            )}
          </div>

          <nav className="flex gap-0.5 overflow-x-auto">
            {tabs.map(({ id, label, Icon, badge, badgeColor }) => {
              const active = tabActual === id
              return (
                <button
                  key={id}
                  onClick={() => setTabActual(id)}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium
                    border-b-2 transition-colors whitespace-nowrap shrink-0
                    ${active
                      ? 'border-valere-blue text-valere-blue'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {badge != null && badge > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ${badgeColor ?? 'bg-slate-400'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Sun className="w-8 h-8 animate-pulse" />
          </div>
        ) : (
          <>
            {tabActual === 'resumen'      && <ResumenTab      plantas={plantas} incidencias={incidencias} comparativa={comparativa} credenciales={FIXTURE_CREDENCIALES} />}
            {tabActual === 'plantas'      && <PlantasTab      plantas={plantas} />}
            {tabActual === 'produccion'   && <ProduccionTab   plantas={plantas} kpiDiario={kpiDiario} />}
            {tabActual === 'excedentes'   && <ExcedentesTab   comparativa={comparativa} />}
            {tabActual === 'incidencias'  && <IncidenciasTab  incidencias={incidencias} />}
            {tabActual === 'credenciales' && (
              <CredencialesTab
                fixtureCredenciales={usarFixtures ? FIXTURE_CREDENCIALES : undefined}
                fixturesPlantas={usarFixtures ? FIXTURE_PLANTAS as any : undefined}
              />
            )}
            {tabActual === 'sin-asignar'  && (
              <SinAsignarTab
                fixturasPlantas={usarFixtures ? FIXTURE_PLANTAS_SIN_ASIGNAR : undefined}
              />
            )}
            {tabActual === 'informes'     && <InformesTab     informes={informes} />}
          </>
        )}
      </div>
    </div>
  )
}
