import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useMisOportunidades, type VMisOportunidadesRow } from './api'
import BandejaCard from './components/BandejaCard'

export default function AnalisisPage() {
  const { data: oportunidades = [], isLoading } = useMisOportunidades()

  const filterByEtapas = (etapas: string[]): VMisOportunidadesRow[] => {
    return oportunidades.filter(op => etapas.includes(op.etapa_operativa ?? ''))
  }

  const facturasPendientes = filterByEtapas(['factura_recibida'])
  const enAnalisis = filterByEtapas(['en_analisis'])
  const propuestasPreparacion = filterByEtapas(['propuesta_en_preparacion'])

  // Tab default: primero con datos.
  const defaultTab =
    facturasPendientes.length > 0 ? 'facturas-pendientes'
    : enAnalisis.length > 0 ? 'en-analisis'
    : propuestasPreparacion.length > 0 ? 'propuestas-preparacion'
    : 'facturas-pendientes'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Cargando bandeja...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-valere-blue-dark font-display">
          Análisis de facturas
        </h1>
        <p className="text-slate-600 mt-1">
          Bandeja de análisis — recibes facturas, decides estándar/senior y preparas propuestas.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="facturas-pendientes">
            Facturas pendientes ({facturasPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="en-analisis">
            En análisis ({enAnalisis.length})
          </TabsTrigger>
          <TabsTrigger value="propuestas-preparacion">
            Propuestas en preparación ({propuestasPreparacion.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Facturas pendientes */}
        <TabsContent value="facturas-pendientes" className="mt-6">
          {facturasPendientes.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {facturasPendientes.map(op => (
                <BandejaCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: En análisis */}
        <TabsContent value="en-analisis" className="mt-6">
          {enAnalisis.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enAnalisis.map(op => (
                <BandejaCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Propuestas en preparación */}
        <TabsContent value="propuestas-preparacion" className="mt-6">
          {propuestasPreparacion.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {propuestasPreparacion.map(op => (
                <BandejaCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
