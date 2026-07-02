import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres').max(72)

type Phase = 'verifying' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let settled = false

    // Al llegar desde el email, Supabase (detectSessionInUrl) procesa el token
    // del hash y emite el evento PASSWORD_RECOVERY con una sesión temporal.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled = true
        setPhase('ready')
      }
    })

    // Cubre el caso en que el evento ya se disparó antes de suscribirnos.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true
        setPhase('ready')
      }
    })

    // Si en unos segundos no hay sesión de recuperación, el enlace es inválido
    // o ha caducado.
    const timer = setTimeout(() => {
      if (!settled) setPhase('invalid')
    }, 5000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = passwordSchema.safeParse(password)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Contraseña no válida')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Cerramos la sesión temporal para que entre de nuevo con la contraseña
      // nueva (confirma que funciona).
      await supabase.auth.signOut()

      toast.success('Contraseña actualizada. Ya puedes iniciar sesión.')
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña'
      if (/should be different|same as|different from the old/i.test(message)) {
        setError('La contraseña nueva no puede ser igual a la anterior.')
      } else {
        setError(message)
      }
      logError(err, 'ResetPasswordPage.onSubmit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Valere CRM</h1>
          <p className="text-sm text-slate-500">Nueva contraseña</p>
        </div>

        {phase === 'verifying' && (
          <p className="text-center text-sm text-slate-500">Verificando el enlace...</p>
        )}

        {phase === 'invalid' && (
          <>
            <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
              El enlace no es válido o ha caducado. Solicita uno nuevo desde
              «¿Olvidaste tu contraseña?».
            </p>
            <p className="text-center text-xs text-slate-500">
              <Link to="/forgot-password" className="font-medium text-slate-900 underline">
                Solicitar un enlace nuevo
              </Link>
            </p>
          </>
        )}

        {phase === 'ready' && (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña nueva</label>
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

            <div className="space-y-1">
              <label htmlFor="confirm" className="text-sm font-medium text-slate-700">Repite la contraseña</label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
