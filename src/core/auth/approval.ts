/**
 * Helpers para el flujo de aprobación de cuentas (sprint-domingo-auth-selfsignup).
 *
 * `is_approved` es la columna canónica añadida en la migration
 * 20260612000001_user_approval_flow.sql. `approved` se conserva como alias
 * legacy mientras quede código sin migrar. Ambas se mantienen sincronizadas
 * por trigger en BD, pero en el frontend leemos `is_approved` con fallback
 * a `approved` por si algún punto del flujo aún devuelve el campo viejo.
 */

import type { UserProfile } from '../types/entities'

/** Lista de dominios permitidos para signup público. Mantenerse en sync con
 *  la CHECK constraint `user_profiles_email_domain_whitelist` en la BD. */
export const ALLOWED_EMAIL_DOMAINS = ['valereconsultores.com', 'valere.com'] as const

/** Devuelve true si el perfil está aprobado (is_approved canónico, approved fallback). */
export function isProfileApproved(
  profile: Pick<UserProfile, 'is_approved' | 'approved'> | null | undefined,
): boolean {
  if (!profile) return false
  if (profile.is_approved === true) return true
  // Fallback legacy: si algún codepath aún devuelve approved pero no is_approved.
  if (profile.is_approved == null && profile.approved === true) return true
  return false
}

/** Normaliza un email a comparable (trim + lower) y devuelve el dominio. */
export function emailDomain(email: string): string {
  return (email.trim().split('@')[1] ?? '').toLowerCase()
}

/** Valida si el dominio del email pertenece a la whitelist Valere. */
export function isAllowedSignupEmail(email: string): boolean {
  const dom = emailDomain(email)
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(dom)
}

/** Mensaje canónico para mostrar al usuario cuando rechazamos un dominio. */
export const SIGNUP_DOMAIN_REJECTED_MESSAGE =
  `Solo aceptamos correos corporativos Valere (${ALLOWED_EMAIL_DOMAINS.join(', ')}). ` +
  `Si necesitas acceso desde otro dominio, contacta con el administrador.`
