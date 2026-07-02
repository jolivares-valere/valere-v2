import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

const signupSchema = z.object({
  email: z.string().email('Email no válido').max(120),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
  nombre: z.string().min(1, 'Nombre obligatorio').max(60),
  apellido: z.string().min(1, 'Apellido obligatorio').max(60),
})

const NOTIFY_ADMIN_FN = 'notify-admin-pending-user'

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = signupSchema.safeParse({ email, password, nombre, apellido })
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      setError(first?.message ?? 'Datos no válidos')
      return
    }

    setSubmitting(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email.trim().toLowerCase(),
        password: parsed.data.password,
        options: {
          data: {
            nombre: parsed.data.nombre.trim(),
            apellidos: parsed.data.apellido.trim(),
            full_name: `${parsed.data.nombre.trim()} ${parsed.data.apellido.trim()}`,
          },
        },
      })

      if (signUpError) {
        // Errores típicos: 'User already registered', rate limit
        throw signUpError
      }

      // Notificar al admin (best effort — si falla no rompemos signup)
      if (data.session?.access_token) {
        try {
          await supabase.functions.invoke(NOTIFY_ADMIN_FN, {
            body: { userId: data.user?.id },
          })
        } catch (notifyErr) {
          // No bloqueante — el alta queda registrada igualmente, el admin
          // verá el pendiente en el panel. Solo loggeamos.
          logError(notifyErr, 'SignupPage.notifyAdmin')
        }
      }

      toast.success('Solicitud enviada. Recibirás un email cuando esté aprobada.')
      // Si Supabase devuelve session inmediata (email confirm desactivado),
      // onAuthStateChange en useAuth ya redirige al dashboard, pero el
      // AuthGuard interceptará al usuario no aprobado y lo enviará a
      // /pending-approval. Si no hay session (email confirm activo), volvemos
      // al login con un mensaje.
      if (data.session) {
        navigate('/pending-approval', { replace: true })
      } else {
        navigate('/login', {
          replace: true,
          state: { from: '/dashboard' },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta'
      // Mensajes amigables para errores comunes
      if (/already registered|already exists|duplicate/i.test(message)) {
        setError('Este email ya está registrado. Si olvidaste la contraseña, usa «¿Olvidaste tu contraseña?» en la pantalla de inicio de sesión.')
      } else if (/rate limit/i.test(message)) {
        setError('Demasiados intentos en poco tiempo. Espera unos minutos y vuelve a probar.')
      } else {
        setError(message)
      }
      logError(err, 'SignupPage.onSubmit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-lg"
        noValidate
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Valere CRM</h1>
          <p className="text-sm text-slate-500">Solicitar acceso</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="nombre" className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              id="nombre"
              type="text"
              required
              autoComplete="given-name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="apellido" className="text-sm font-medium text-slate-700">Apellido</label>
            <input
              id="apellido"
              type="text"
              required
              autoComplete="family-name"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
          <p className="text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? 'Enviando solicitud...' : 'Solicitar acceso'}
        </button>

        <p className="text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline">
            Entrar
          </Link>
        </p>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed">
          Tu solicitud quedará pendiente de aprobación por un administrador.
          Recibirás un email cuando puedas acceder.
        </p>
      </form>
    </div>
  )
}
