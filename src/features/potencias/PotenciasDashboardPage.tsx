import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Clock, TrendingDown, Users, Zap,
  ChevronRight, ArrowDownCircle, CheckCircle2, FileText, Mail
} from 'lucide-react'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import type { Empresa } from '@/core/types/entities'

interface ExpRow {
  id: string; estado: string
  ciclos: { estado: string; numero_ciclo: number }[]
  empresas: { nombre: string } | null
  cups: { codigo_cups: string } | null
}
const RDL_CLOSE_DATE = new Date('2026-12-31')
function daysUntil(d: Date): number {
  const t = new Date(); t.setHours(0,0,0,0)
  return Math.max(0, Math.ceil((d.getTime()-t.getTime())/86_400_000))
}
const EC: Record<string,string> = {
  bajada_pendiente:'text-blue-700 bg-blue-50 border-blue-200',
  bajada_activa:'text-amber-700 bg-amber-50 border-amber-200',
  bajada_aprobada:'text-green-700 bg-green-50 border-green-200',
  subida_pendiente:'text-purple-700 bg-purple-50 border-purple-200',
  subida_activa:'text-orange-700 bg-orange-50 border-orange-200',
  completado:'text-emerald-700 bg-emerald-50 border-emerald-200',
}
function StatCard({icon,value,label,color='bg-blue-50 text-blue-600',href}:{icon:React.ReactNode;value:string|number;label:string;color?:string;href?:string}) {
  const inner = (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${color}`}>{icon}</div>
      <div><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
    </div>
  )
  return href ? <Link to={href}>{inner}</Link> : inner
}
function AlertDot({count,label,sublabel,dotClass,textClass}:{count:number;label:string;sublabel:string;dotClass:string;textClass:string}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-6 text-center">
      <div className={`mb-2 h-4 w-4 rounded-full ${dotClass}`} />
      <p className={`text-4xl font-bold ${textClass}`}>{count}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xs text-slate-400">{sublabel}</p>
    </div>
  )
}
export default function PotenciasDashboardPage() {
  const dr = useMemo(() => daysUntil(RDL_CLOSE_DATE), [])
  const { data: empresas } = useSupabaseQuery<Empresa>({ table:'empresas', filters:[{column:'deleted_at',op:'eq',value:null}] })
  const { data: cups } = useSupabaseQuery<{id:string}>({ table:'cups', filters:[{column:'deleted_at',op:'eq',value:null}] })
  const { data: exps } = useSupabaseQuery<ExpRow>({
    table:'expedientes', select:'id,estado,empresas(nombre),cups(codigo_cups),ciclos(estado,numero_ciclo)',
    filters:[{column:'estado',op:'eq',value:'activo'}], order:{column:'created_at',ascending:false},
  })
  const activos = useMemo(() => exps.map(e => {
    const u = [...(e.ciclos??[])].sort((a,b)=>b.numero_ciclo-a.numero_ciclo)[0]
    return {...e, us: u?.estado ?? 'sin_ciclo'}
  }), [exps])
  const urgente  = dr<=10 ? activos.length : 0
  const atencion = !urgente && dr<=15 ? activos.length : 0
  const preparar = !urgente && !atencion && dr<=21 ? activos.length : 0
  const bajApro  = activos.filter(e=>e.us==='bajada_aprobada')
  const compl    = exps.filter(e=>(e.ciclos??[]).some(c=>c.estado==='completado')).length
  const dist     = activos.reduce<Record<string,number>>((a,e)=>({...a,[e.us]:(a[e.us]??0)+1}),{})
  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-3 rounded-2xl bg-[#1e3a6e] px-6 py-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20"><Clock className="h-5 w-5"/></div>
          <div><p className="text-base font-bold">Cierre ventana RDL 7/2026</p><p className="text-sm text-blue-200">Cambios de potencia sin coste hasta el 31/12/2026</p></div>
        </div>
        <div className="text-left sm:text-right"><p className="text-4xl font-black">{dr}</p><p className="text-sm text-blue-200">dias restantes</p></div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5"/>}        value={empresas.length} label="Clientes activos"     color="bg-blue-50 text-blue-600"    href="/empresas"/>
        <StatCard icon={<Zap className="h-5 w-5"/>}          value={cups.length}     label="CUPS activos"         color="bg-purple-50 text-purple-600" href="/datos"/>
        <StatCard icon={<FileText className="h-5 w-5"/>}     value={activos.length}  label="Expedientes abiertos" color="bg-amber-50 text-amber-600"   href="/potencias/expedientes"/>
        <StatCard icon={<CheckCircle2 className="h-5 w-5"/>} value={compl}           label="Ciclos completados"   color="bg-green-50 text-green-600"   href="/potencias/expedientes"/>
      </div>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500"/>
          <h2 className="text-base font-semibold text-slate-800">Alertas RDL activas</h2>
          <span className="ml-auto text-xs text-slate-400">{dr} dias para el cierre</span>
        </div>
        <div className="flex gap-3">
          <AlertDot count={urgente}  label="URGENTE"  sublabel="10 dias o menos" dotClass="bg-red-500"    textClass="text-red-600"/>
          <AlertDot count={atencion} label="ATENCION" sublabel="15 dias o menos" dotClass="bg-orange-400" textClass="text-orange-500"/>
          <AlertDot count={preparar} label="PREPARAR" sublabel="21 dias o menos" dotClass="bg-yellow-400" textClass="text-yellow-500"/>
        </div>
        {(urgente>0||atencion>0||preparar>0) && (
          <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Hay {activos.length} expediente{activos.length!==1?'s':''} activo{activos.length!==1?'s':''} antes del 31/12/2026.
          </div>
        )}
      </div>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><ArrowDownCircle className="h-5 w-5 text-green-500"/><h2 className="text-base font-semibold text-slate-800">Bajadas aprobadas — pendientes de subida</h2></div>
          <Link to="/potencias/expedientes" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">Ver todos <ChevronRight className="h-4 w-4"/></Link>
        </div>
        {bajApro.length===0 ? <p className="text-sm text-slate-400">Sin expedientes en este estado.</p> : (
          <div className="divide-y divide-slate-100">
            {bajApro.slice(0,5).map(e=>(
              <div key={e.id} className="flex items-center justify-between py-2">
                <div><p className="text-sm font-semibold text-slate-900">{e.empresas?.nombre??'Sin nombre'}</p><p className="font-mono text-xs text-slate-400">{e.cups?.codigo_cups??''}</p></div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${EC['bajada_aprobada']}`}>Bajada aprobada</span>
                  <Link to={`/potencias/expedientes/${e.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Ver</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-blue-500"/><h2 className="text-base font-semibold text-slate-800">Expedientes por estado</h2></div>
        {activos.length===0 ? <p className="text-sm text-slate-400">No hay expedientes activos.</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(dist).map(([estado,count])=>(
              <div key={estado} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${EC[estado]??'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <span className="text-xs font-medium capitalize">{estado.replace(/_/g,' ')}</span>
                <span className="text-lg font-bold">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          {href:'/potencias/expedientes',    label:'Expedientes',   icon:<FileText className="h-5 w-5"/>},
          {href:'/potencias/comunicaciones', label:'Comunicaciones',icon:<Mail className="h-5 w-5"/>},
          {href:'/potencias/informes',       label:'Informes',      icon:<TrendingDown className="h-5 w-5"/>},
          {href:'/potencias/documentacion',  label:'Documentacion', icon:<Zap className="h-5 w-5"/>},
        ] as const).map(({href,label,icon})=>(
          <Link key={href} to={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
