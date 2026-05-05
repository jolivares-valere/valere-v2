import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'
import { calcularSemaforoVencimiento, type FuenteVencimiento } from '../api'

interface Props {
  fecha: string
  fuente: FuenteVencimiento | ''
  notas: string
  onChange: (val: { fecha: string; fuente: FuenteVencimiento | ''; notas: string }) => void
  idPrefix?: string
}

const FUENTES: Array<{ value: FuenteVencimiento; label: string }> = [
  { value: 'cliente_llamada', label: 'Cliente lo dijo en llamada' },
  { value: 'factura', label: 'Aparece en la factura' },
  { value: 'email', label: 'Email del cliente' },
  { value: 'estimado', label: 'Estimado por nosotros' },
  { value: 'desconocido', label: 'Desconocido' },
]

/**
 * Bloque para fecha vencimiento del contrato actual del prospecto.
 * Muestra semáforo en vivo (verde >90d, amarillo ≤90d, naranja ≤60d, rojo ≤30d).
 * NO es contrato CRM. Es info comercial de captación.
 */
export default function VencimientoContratoForm({
  fecha, fuente, notas, onChange, idPrefix = 'venc',
}: Props) {
  const sem = calcularSemaforoVencimiento(fecha)
  const colorClasses: Record<typeof sem.color, string> = {
    verde:    'bg-green-50 border-green-200 text-green-800',
    amarillo: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    naranja:  'bg-orange-50 border-orange-300 text-orange-800',
    rojo:     'bg-red-50 border-red-300 text-red-800',
    vencido:  'bg-slate-100 border-slate-300 text-slate-700',
    sin_dato: 'bg-slate-50 border-slate-200 text-slate-500',
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`${idPrefix}_fecha`}>Fecha vencimiento contrato</Label>
          <Input
            id={`${idPrefix}_fecha`}
            type="date"
            value={fecha}
            onChange={e => onChange({ fecha: e.target.value, fuente, notas })}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}_fuente`}>Fuente del dato</Label>
          <Select
            value={fuente || 'desconocido'}
            onValueChange={v => onChange({ fecha, fuente: ((v ?? 'desconocido') as FuenteVencimiento), notas })}
          >
            <SelectTrigger id={`${idPrefix}_fuente`}>
              <SelectValue>
                {FUENTES.find(f => f.value === fuente)?.label ?? 'Desconocido'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FUENTES.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {fecha && sem.color !== 'sin_dato' && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${colorClasses[sem.color]}`}>
          {sem.label}
        </div>
      )}

      <div>
        <Label htmlFor={`${idPrefix}_notas`}>Notas vencimiento (opcional)</Label>
        <Textarea
          id={`${idPrefix}_notas`}
          rows={2}
          value={notas}
          onChange={e => onChange({ fecha, fuente, notas: e.target.value })}
          placeholder="Observaciones, condiciones, penalización por cancelación, etc."
        />
      </div>
    </div>
  )
}
