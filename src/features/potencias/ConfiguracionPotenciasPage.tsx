import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings, Clock, AlertTriangle, CheckCircle2, Info,
  FileText, Mail, Zap, ExternalLink
} from 'lucide-react'

// ── Constantes RDL ────────────────────────────────────────────────────────────

const RDL_CLOSE = new Date('2026-12-31')

function daysUntil(date: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((date.getTime() - today.getTime()) / 86_400_000))
}

// ── Tipos y config de distribuidoras ──────────────────────────────────────────

interface Distribuidora {
  nombre: string
  zona: string
  plazo_dias: number
  email_referencia: string
  web: string
}

const DISTRIBUIDORAS: Distribuidora[] = [
  { nombre: 'Endesa Distribución', zona: 'Cataluña, Andalucía, Canarias, Baleares', plazo_dias: 20, email_referencia: 'servicio.clientes@endesa.es',   web: 'https://www.endesadistribucion.es' },
  { nombre: 'Iberdrola Distribución', zona: 'Norte, Castilla, Aragón, País Vasco, Navarra', plazo_dias: 21, email_referencia: 'atencionclientes@iberdrola.es', web: 'https://www.iberdrola.es' },
  { nombre: 'Naturgy / UFD', zona: 'Madrid, Galicia, Castilla-León (parcial)', plazo_dias: 20, email_referencia: 'atencionclientes@naturgy.com', web: 'https://www.naturgy.es' },
  { nombre: 'EDP Distribución', zona: 'Asturias, Extremadura, Castilla-León (sur)', plazo_dias: 20, email_referencia: 'clientes@edp.es', web: 'https://www.edp.es' },
  { nombre: 'Repsol / CIDE', zona: 'Comunitat Valenciana, Murcia (parcial)', plazo_dias: 21, email_referencia: 'distribucion@repsol.com', web: 'https://www.repsol.com' },
]

// ── Sección tarjeta ───────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Fila info ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConfiguracionPotenciasPage() {
  const dias = useMemo(() => daysUntil(RDL_CLOSE), [])

  const urgenciaLabel = useMemo(() => {
    if (dias <= 10)  return { label: 'URGENTE',  color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-4 w-4" /> }
    if (dias <= 15)  return { label: 'ATENCIÓN', color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="h-4 w-4" /> }
    if (dias <= 21)  return { label: 'PREPARAR', color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="h-4 w-4" /> }
    return { label: 'En plazo', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> }
  }, [dias])

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <Settings className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configuración</h1>
            <p className="text-sm text-slate-500">Parámetros y referencias de Gestión de Potencias</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* RDL 7/2026 */}
        <SectionCard title="Normativa RDL 7/2026" icon={<Clock className="h-4 w-4" />}>
          <div className="mb-4 flex items-center justify-between rounded-xl bg-[#1e3a6e] px-5 py-4 text-white">
            <div>
              <p className="text-base font-bold">Ventana regulatoria activa</p>
              <p className="text-sm text-blue-200">Cambios de potencia sin coste y sin límite de ciclos</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black">{dias}</p>
              <p className="text-sm text-blue-200">días restantes</p>
            </div>
          </div>
          <InfoRow label="Normativa" value="Real Decreto-Ley 7/2026" />
          <InfoRow label="Vigencia" value="Hasta el 31 de diciembre de 2026" />
          <InfoRow label="Beneficio" value="Cambios de potencia sin penalización ni cargo por ICP" highlight />
          <InfoRow label="Ciclos permitidos" value="Ilimitados durante el período" />
          <InfoRow
            label="Estado actual"
            value={
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgenciaLabel.color}`}>
                {urgenciaLabel.icon} {urgenciaLabel.label}
              </span>
            }
          />
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <p>
              Los expedientes iniciados antes del 31/12/2026 pero pendientes de completar <strong>podrían</strong> quedar fuera
              de la ventana. Se recomienda iniciar el proceso con suficiente antelación (mínimo 45 días antes del cierre).
            </p>
          </div>
        </SectionCard>

        {/* Flujo del proceso */}
        <SectionCard title="Flujo estándar de un expediente" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-2">
            {[
              { n: 1, estado: 'Bajada pendiente',  desc: 'Expediente creado. Preparar y enviar solicitud de bajada a la distribuidora.', color: 'bg-blue-500' },
              { n: 2, estado: 'Bajada activa',     desc: 'Solicitud enviada. Distribuidora la tramita (plazo estimado: 20-21 días hábiles).', color: 'bg-amber-500' },
              { n: 3, estado: 'Bajada aprobada',   desc: 'Distribuidora aprueba la bajada. ICP se reduce. Iniciar inmediatamente el proceso de subida.', color: 'bg-green-500' },
              { n: 4, estado: 'Subida pendiente',  desc: 'Preparar y enviar solicitud de subida de potencia a la distribuidora.', color: 'bg-purple-500' },
              { n: 5, estado: 'Subida activa',     desc: 'Solicitud de subida enviada. Distribuidora la tramita.', color: 'bg-orange-500' },
              { n: 6, estado: 'Completado',        desc: 'Ciclo completado. El cliente recupera su potencia original. Ahorro conseguido.', color: 'bg-emerald-500' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-3">
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${step.color}`}>
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.estado}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Distribuidoras */}
        <SectionCard title="Distribuidoras de referencia" icon={<Zap className="h-4 w-4" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-2 text-left">Distribuidora</th>
                  <th className="pb-2 text-left hidden md:table-cell">Zona</th>
                  <th className="pb-2 text-right">Plazo</th>
                  <th className="pb-2 text-right">Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {DISTRIBUIDORAS.map(d => (
                  <tr key={d.nombre}>
                    <td className="py-2.5">
                      <p className="font-medium text-slate-900">{d.nombre}</p>
                      <p className="text-xs text-slate-400 font-mono">{d.email_referencia}</p>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500 hidden md:table-cell max-w-[200px]">
                      {d.zona}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        ~{d.plazo_dias}d
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <a
                        href={d.web}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            Los plazos son estimaciones. Pueden variar según la carga administrativa de cada distribuidora.
          </div>
        </SectionCard>

        {/* Notificaciones */}
        <SectionCard title="Notificaciones automáticas" icon={<Mail className="h-4 w-4" />}>
          <div className="space-y-3">
            {[
              { label: 'Cambio de estado → notificación interna', desc: 'Se envía a jolivares@valereconsultores.com en cada transición de estado.', activo: true },
              { label: 'Bajada activa → email al cliente', desc: 'Cuando la solicitud de bajada es enviada a la distribuidora.', activo: true },
              { label: 'Bajada aprobada → email al cliente', desc: 'Cuando la distribuidora aprueba la bajada de potencia.', activo: true },
              { label: 'Subida activa → email al cliente', desc: 'Cuando la solicitud de subida es enviada a la distribuidora.', activo: true },
              { label: 'Completado → email al cliente', desc: 'Cuando el ciclo se completa y el cliente recupera su potencia.', activo: true },
            ].map(n => (
              <div key={n.label} className="flex items-start gap-3 rounded-lg border border-slate-100 px-4 py-3">
                <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${n.activo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{n.label}</p>
                  <p className="text-xs text-slate-400">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            Los emails se envían via Resend desde <code>noreply@valereconsultores.com</code>.
            El email del cliente se configura en el perfil de la empresa.
          </div>
        </SectionCard>

        {/* Accesos directos */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: '/potencias/expedientes',   label: 'Gestionar expedientes', icon: <FileText className="h-4 w-4" /> },
            { href: '/potencias/comunicaciones', label: 'Acciones pendientes',   icon: <Mail className="h-4 w-4" /> },
            { href: '/potencias/informes',       label: 'Ver informes',          icon: <Clock className="h-4 w-4" /> },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
