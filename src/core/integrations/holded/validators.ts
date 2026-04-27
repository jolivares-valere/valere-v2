// ═══════════════════════════════════════════════════════════════════
// Validadores e identificación de NIF/CIF/NIE/VAT españoles
// ═══════════════════════════════════════════════════════════════════
//
// Implementación JS-side equivalente a las funciones SQL
// `public.normaliza_nif_cif`, `public.clasifica_nif_cif`, `public.valida_nif_cif`
// definidas en `supabase/migrations/20260427_holded_data_audit.sql`.
//
// Usadas por:
//  - Frontend: validar antes de guardar empresa (UX, no bloqueante).
//  - Edge Functions: cuando construyen payload para Holded.
//  - Tests Vitest: 100 % unitarios sin BD.
//
// Las funciones son puras y deterministas — apropiadas para tests.
// ═══════════════════════════════════════════════════════════════════

export type NifClass = 'NIF' | 'NIE' | 'CIF' | 'VAT' | 'INVALID' | 'EMPTY'

const LETRAS_NIF = 'TRWAGMYFPDXBNJZSQVHLCKE'
const LETRAS_CIF_CONTROL = 'JABCDEFGHI'

// Países UE/EEE aceptados como prefijo VAT intracomunitario.
const VAT_COUNTRY_PREFIXES = new Set([
  'ES','PT','FR','DE','IT','GB','NL','BE','AT','IE','LU',
  'DK','SE','FI','GR','PL','CZ','HU','RO','BG','HR','SI',
  'SK','EE','LV','LT','MT','CY',
])

const RE_VAT = /^[A-Z]{2}/
const RE_NIF = /^[0-9]{8}[A-Z]$/
const RE_NIE = /^[XYZ][0-9]{7}[A-Z]$/
const RE_CIF = /^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/
const RE_VAT_BODY = /^[0-9A-Z]{1,12}$/
const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Normaliza un NIF/CIF: uppercase, sin espacios, guiones ni puntos.
 * Devuelve `null` si el resultado es vacío.
 */
export function normalizaNifCif(input: string | null | undefined): string | null {
  if (input == null) return null
  const cleaned = input.toUpperCase().replace(/[\s\-\.]/g, '')
  return cleaned.length === 0 ? null : cleaned
}

/**
 * Clasifica un identificador fiscal por formato sintáctico.
 * NO valida dígito de control (eso es `validaNifCif`).
 */
export function clasificaNifCif(input: string | null | undefined): NifClass {
  const n = normalizaNifCif(input)
  if (!n) return 'EMPTY'
  if (RE_VAT.test(n) && n.length >= 4) return 'VAT'
  if (RE_NIF.test(n)) return 'NIF'
  if (RE_NIE.test(n)) return 'NIE'
  if (RE_CIF.test(n)) return 'CIF'
  return 'INVALID'
}

/**
 * Valida NIF/NIE/CIF español con dígito de control real.
 * Para VAT intracom sólo valida prefijo de país conocido + cuerpo razonable.
 */
export function validaNifCif(input: string | null | undefined): boolean {
  const n = normalizaNifCif(input)
  if (!n) return false

  const clase = clasificaNifCif(n)
  if (clase === 'EMPTY' || clase === 'INVALID') return false

  if (clase === 'VAT') {
    const prefix = n.slice(0, 2)
    if (!VAT_COUNTRY_PREFIXES.has(prefix)) return false
    const body = n.slice(2)
    return RE_VAT_BODY.test(body)
  }

  if (clase === 'NIF') {
    const num = parseInt(n.slice(0, 8), 10)
    const expected = LETRAS_NIF[num % 23]
    return n[8] === expected
  }

  if (clase === 'NIE') {
    const prefixDigit = ({ X: '0', Y: '1', Z: '2' } as Record<string, string>)[n[0]]
    const num = parseInt(prefixDigit + n.slice(1, 8), 10)
    const expected = LETRAS_NIF[num % 23]
    return n[8] === expected
  }

  if (clase === 'CIF') {
    const letraInicial = n[0]
    let parSum = 0
    let imparSum = 0
    for (let pos = 1; pos <= 7; pos++) {
      let digit = parseInt(n[pos], 10)
      if (pos % 2 === 1) {
        digit = digit * 2
        if (digit >= 10) digit = Math.floor(digit / 10) + (digit % 10)
        imparSum += digit
      } else {
        parSum += digit
      }
    }
    const total = parSum + imparSum
    const controlCalc = (10 - (total % 10)) % 10
    const controlReal = n[8]
    const letraCalc = LETRAS_CIF_CONTROL[controlCalc]

    if ('ABEH'.includes(letraInicial)) {
      return controlReal === String(controlCalc)
    }
    if ('KPQSNW'.includes(letraInicial)) {
      return controlReal === letraCalc
    }
    return controlReal === String(controlCalc) || controlReal === letraCalc
  }

  return false
}

/**
 * Enmascara NIF para logs / UI: B10759520 → B*******0.
 * Mantiene primer y último carácter, oculta el resto.
 */
export function maskNif(nif: string | null | undefined): string | null {
  if (!nif) return null
  const n = normalizaNifCif(nif)
  if (!n) return null
  if (n.length < 4) return '***'
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1]
}

/**
 * Enmascara IBAN: ES7621000418401234567891 → ES76****************7891.
 */
export function maskIban(iban: string | null | undefined): string | null {
  if (!iban) return null
  const n = iban.replace(/\s/g, '')
  if (n.length < 8) return '***'
  return n.slice(0, 4) + '*'.repeat(n.length - 8) + n.slice(-4)
}

/** Validador básico de email (no RFC pero suficiente para Holded). */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return RE_EMAIL.test(email.trim())
}
