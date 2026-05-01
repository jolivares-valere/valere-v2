import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useMisOportunidades, type VMisOportunidadesRow } from './api'
import BandejaCard from './components/BandejaCard'

export default function CarteraSeniorPage() {
  const { data: oportunidades = [], isLoading } = useMisOportunidades()

  const filterByEtapas = (etapas: string[]): VMisOportunidadesRow[] => {
    return oportunidades.filter(op => etapas.includes(op.etapa_operativa ?? ''))
  }

  const asignadosASenior = filterByEtapas(['asignada_a_senior'])
  const propuestasPreparacion = filterByEtapas(['propuesta_en_preparacion'])
  const seguimientosDirectos = filterByEtapas(['propuesta_enviada', 'seguimiento'])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Cargando cartera...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-valere-blue-dark font-display">
          Cartera senior
        </h1>
        <p className="text-slate-600 mt-1">
          Casos complejos asignados directamente
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="asignados" className="w-full">
        <TabsList>
          <TabsTrigger value="asignados">
            Asignados a mí ({asignadosASenior.length})
          </TabsTrigger>
          <TabsTrigger value="propuestas-preparacion">
            Propuestas en preparación ({propuestasPreparacion.length})
          </TabsTrigger>
          <TabsTrigger value="seguimientos">
            Seguimientos directos ({seguimientosDirectos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Asignados a mí */}
        <TabsContent value="asignados" className="mt-6">
          {asignadosASenior.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {asignadosASenior.map(op => (
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

        {/* Tab: Seguimientos directos */}
        <TabsContent value="seguimientos" className="mt-6">
          {seguimientosDirectos.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {seguimientosDirectos.map(op => (
                <BandejaCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
