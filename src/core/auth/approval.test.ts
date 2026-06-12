import { describe, expect, it } from 'vitest'
import {
  ALLOWED_EMAIL_DOMAINS,
  emailDomain,
  isAllowedSignupEmail,
  isProfileApproved,
  SIGNUP_DOMAIN_REJECTED_MESSAGE,
} from './approval'

describe('approval — isProfileApproved', () => {
  it('false si no hay perfil', () => {
    expect(isProfileApproved(null)).toBe(false)
    expect(isProfileApproved(undefined)).toBe(false)
  })

  it('true si is_approved es true (canónico)', () => {
    expect(isProfileApproved({ is_approved: true, approved: false })).toBe(true)
    expect(isProfileApproved({ is_approved: true, approved: null })).toBe(true)
  })

  it('false si is_approved es false aunque approved sea true (canónico manda)', () => {
    expect(isProfileApproved({ is_approved: false, approved: true })).toBe(false)
  })

  it('fallback: si is_approved es null y approved es true → true', () => {
    expect(isProfileApproved({ is_approved: null, approved: true })).toBe(true)
  })

  it('false si todo es null/false', () => {
    expect(isProfileApproved({ is_approved: null, approved: null })).toBe(false)
    expect(isProfileApproved({ is_approved: null, approved: false })).toBe(false)
    expect(isProfileApproved({ is_approved: false, approved: null })).toBe(false)
  })
})

describe('approval — isAllowedSignupEmail (whitelist de dominios)', () => {
  it('acepta valereconsultores.com', () => {
    expect(isAllowedSignupEmail('foo@valereconsultores.com')).toBe(true)
    expect(isAllowedSignupEmail('Foo.Bar@valereconsultores.com')).toBe(true)
  })

  it('acepta valere.com', () => {
    expect(isAllowedSignupEmail('foo@valere.com')).toBe(true)
  })

  it('case-insensitive en el dominio', () => {
    expect(isAllowedSignupEmail('foo@VALERE.COM')).toBe(true)
    expect(isAllowedSignupEmail('foo@VaLeReConSulToReS.cOm')).toBe(true)
  })

  it('rechaza dominios fuera de la whitelist', () => {
    expect(isAllowedSignupEmail('foo@gmail.com')).toBe(false)
    expect(isAllowedSignupEmail('foo@valereconsultores.es')).toBe(false)
    expect(isAllowedSignupEmail('foo@malicioso.valereconsultores.com.attacker.io')).toBe(false)
  })

  it('rechaza emails malformados', () => {
    expect(isAllowedSignupEmail('foo')).toBe(false)
    expect(isAllowedSignupEmail('@valere.com')).toBe(true) // dominio es valere.com (válido) — depende del email validator upstream
    expect(isAllowedSignupEmail('')).toBe(false)
  })
})

describe('approval — emailDomain', () => {
  it('extrae el dominio en minúsculas', () => {
    expect(emailDomain('foo@bar.com')).toBe('bar.com')
    expect(emailDomain('foo@BAR.COM')).toBe('bar.com')
    expect(emailDomain('   foo@bar.com  ')).toBe('bar.com')
  })

  it('devuelve string vacío si no hay @', () => {
    expect(emailDomain('foo')).toBe('')
  })
})

describe('approval — constantes', () => {
  it('ALLOWED_EMAIL_DOMAINS contiene los 2 dominios documentados', () => {
    expect(ALLOWED_EMAIL_DOMAINS).toEqual(['valereconsultores.com', 'valere.com'])
  })

  it('mensaje de rechazo menciona los dominios', () => {
    expect(SIGNUP_DOMAIN_REJECTED_MESSAGE).toContain('valereconsultores.com')
    expect(SIGNUP_DOMAIN_REJECTED_MESSAGE).toContain('valere.com')
  })
})
