import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

const emailSchema = z.string().email('Email no válido').max(120)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = emailSchema.safeParse(email.trim().toLowerCase())
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Email no válido')
      return
    }

    setSubmitting(true)
    try {
      // Enviamos el correo de recuperación a través de la Edge Function
      // `send-password-reset` (Resend), no del SMTP por defecto de Supabase.
      const { error: fnError } = await supabase.functions.invoke('send-password-reset', {
        body: { email: parsed.data },
      })

      if (fnError) {
        logError(fnError, 'ForgotPasswordPage.sendPasswordReset')
      }

      // No filtramos si el email existe o no (seguridad): siempre mostramos
      // el mismo mensaje de confirmación.
      setSent(true)
    } catch (err) {
      logError(err, 'ForgotPasswordPage.onSubmit')
      // Aun ante un error inesperado mostramos confirmación genérica para no
      // filtrar información. El log queda registrado para diagnóstico.
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Valere CRM</h1>
          <p className="text-sm text-slate-500">Recuperar contraseña</p>
        </div>

        {sent ? (
          <>
            <p className="rounded-xl bg-green-50 px-3 py-3 text-sm text-green-800">
              Si existe una cuenta con ese email, te hemos enviado un enlace para
              restablecer la contraseña. Revisa tu bandeja de entrada (y la carpeta
              de spam).
            </p>
            <p className="text-center text-xs text-slate-500">
              <Link to="/login" className="font-medium text-slate-900 underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600">
              Escribe tu email y te enviaremos un enlace para crear una contraseña
              nueva.
            </p>

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

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <p className="text-center text-xs text-slate-500">
              <Link to="/login" className="font-medium text-slate-900 underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
