import { useAuth } from '../../core/hooks/useAuth'

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth()

  const onLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow-lg text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Tu cuenta está pendiente</h1>
          <p className="text-sm text-slate-600">
            Hemos recibido tu solicitud de acceso al CRM de Valere Consultores.
            Un administrador la revisará en breve.
          </p>
          {user?.email && (
            <p className="text-xs text-slate-500">
              Solicitud para: <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-left">
          <p className="text-xs font-semibold text-slate-700 mb-1">¿Y ahora qué?</p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Recibirás un email cuando tu cuenta sea aprobada.</li>
            <li>Si no se aprueba en 7 días, la solicitud se retira automáticamente.</li>
            <li>Puedes cerrar esta ventana mientras tanto.</li>
          </ul>
        </div>

        <button
          onClick={onLogout}
          className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
