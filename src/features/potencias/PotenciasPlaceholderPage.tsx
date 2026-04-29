import { Construction } from 'lucide-react'

interface Props {
  titulo: string
  descripcion?: string
}

export default function PotenciasPlaceholderPage({ titulo, descripcion }: Props) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Construction className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
        <p className="text-sm text-slate-500">
          {descripcion ?? 'Esta sección está en desarrollo y estará disponible próximamente.'}
        </p>
      </div>
    </div>
  )
}
