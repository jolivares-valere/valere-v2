/**
 * Banner visual permanente que se muestra cuando VITE_DEMO_MODE=true.
 *
 * Diseño: barra naranja fija en la parte superior de la página, no intrusiva
 * (24 px de alto), con texto centrado y una mini-leyenda con las credenciales
 * demo y la advertencia de que los datos son ficticios.
 *
 * Si VITE_DEMO_MODE no está activo, el componente renderiza null.
 */

import { IS_DEMO, DEMO_DEFAULT_EMAIL, DEMO_DEFAULT_PASSWORD } from './index'

export function DemoBanner() {
  if (!IS_DEMO) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg,#fb923c 0%,#f97316 100%)',
        color: '#1e293b',
        fontFamily:
          'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        fontSize: '12px',
        fontWeight: 600,
        textAlign: 'center',
        padding: '4px 12px',
        borderBottom: '1px solid #c2410c',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        minHeight: '24px',
      }}
    >
      <span aria-hidden="true">⚠️</span>
      <span>
        MODO DEMO — datos ficticios. NO conectado a Supabase real.
      </span>
      <span style={{ opacity: 0.8, fontWeight: 400 }}>
        Login: <code style={{ background: '#fed7aa', padding: '0 4px', borderRadius: 2 }}>{DEMO_DEFAULT_EMAIL}</code>{' '}
        / <code style={{ background: '#fed7aa', padding: '0 4px', borderRadius: 2 }}>{DEMO_DEFAULT_PASSWORD}</code>
      </span>
    </div>
  )
}

/**
 * Spacer para que el contenido no quede cubierto por la barra fija. Usar
 * inmediatamente después de DemoBanner cuando se monte como hermano del
 * contenido principal.
 */
export function DemoBannerSpacer() {
  if (!IS_DEMO) return null
  return <div style={{ height: '28px' }} aria-hidden="true" />
}
