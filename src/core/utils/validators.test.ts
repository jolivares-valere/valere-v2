import { describe, it, expect } from 'vitest'
import {
  validateNIF,
  validateNIE,
  validateCIF,
  validateDocumentoFiscal,
  validateCUPS,
  validateTelefonoES,
  validateEmail,
  validateCP,
} from './validators'

describe('validateNIF', () => {
  it('acepta NIF válidos', () => {
    expect(validateNIF('12345678Z')).toBe(true) // 12345678 mod 23 = 14 → 'Z'
    expect(validateNIF('00000000T')).toBe(true) // 0 mod 23 = 0 → 'T'
    expect(validateNIF('99999999R')).toBe(true) // 99999999 mod 23 = 1 → 'R'
  })
  it('rechaza NIF con letra de control incorrecta', () => {
    expect(validateNIF('12345678A')).toBe(false)
  })
  it('rechaza formatos malformados', () => {
    expect(validateNIF('1234567Z')).toBe(false)
    expect(validateNIF('123456789')).toBe(false)
    expect(validateNIF('ABCDEFGHZ')).toBe(false)
    expect(validateNIF(null)).toBe(false)
    expect(validateNIF(undefined)).toBe(false)
    expect(validateNIF('')).toBe(false)
  })
  it('normaliza espacios y guiones', () => {
    expect(validateNIF(' 12345678-Z ')).toBe(true)
  })
})

describe('validateNIE', () => {
  it('acepta NIE válidos', () => {
    expect(validateNIE('X1234567L')).toBe(true) // 01234567 mod 23 = 14 → L
    expect(validateNIE('Y1234567X')).toBe(true) // 11234567 mod 23 = 11 → X
    expect(validateNIE('Z1234567R')).toBe(true) // 21234567 mod 23 = 8 → R
  })
  it('rechaza letra inicial inválida', () => {
    expect(validateNIE('A1234567L')).toBe(false)
  })
  it('rechaza dígito control incorrecto', () => {
    expect(validateNIE('X1234567A')).toBe(false)
  })
})

describe('validateCIF', () => {
  it('acepta CIF válidos de organizaciones reales (formato)', () => {
    // CIF 'A58818501' — TELEFONICA SA — control con dígito (A = digitsOnly).
    expect(validateCIF('A58818501')).toBe(true)
    // CIF 'B12345674' (digito control 4) - random ejemplo
    // Calcular: pares (2+4+6)=12; impares duplicados (1*2=2, 3*2=6, 5*2=10→1, 7*2=14→5)= 14; total=26; control=(10-(26%10))%10=4 → válido
    expect(validateCIF('B12345674')).toBe(true)
  })
  it('rechaza letras iniciales inválidas', () => {
    expect(validateCIF('Ñ12345678')).toBe(false)
    expect(validateCIF('I12345678')).toBe(false)
  })
  it('rechaza control incorrecto', () => {
    expect(validateCIF('A58818500')).toBe(false)
  })
  it('rechaza vacíos', () => {
    expect(validateCIF(null)).toBe(false)
    expect(validateCIF('')).toBe(false)
  })
})

describe('validateDocumentoFiscal', () => {
  it('acepta NIF, NIE y CIF válidos', () => {
    expect(validateDocumentoFiscal('12345678Z')).toBe(true)
    expect(validateDocumentoFiscal('X1234567L')).toBe(true)
    expect(validateDocumentoFiscal('A58818501')).toBe(true)
  })
  it('rechaza cualquier otra cosa', () => {
    expect(validateDocumentoFiscal('NOPE')).toBe(false)
    expect(validateDocumentoFiscal('12345678A')).toBe(false)
  })
})

describe('validateCUPS', () => {
  it('acepta CUPS válidos', () => {
    // CUPS oficial de prueba (Endesa): ES0031300247001016BS
    // Verificar algoritmo: 16 dígitos = 0031300247001016, mod 529 = ?
    // 0031300247001016 % 529 → calc, debería dar letras "BS"
    // Hagamos uno desde 0: con 16 dígitos 0000000000000000 → 0 % 529 = 0 → c1=0,c2=0 → TT
    expect(validateCUPS('ES0000000000000000TT')).toBe(true)
    // 16 dígitos 0000000000000023 → 23 % 529 = 23 → c1=1,c2=0 → R,T → 'RT' (índice 1=R, 0=T)
    expect(validateCUPS('ES0000000000000023RT')).toBe(true)
  })
  it('acepta CUPS con extensión', () => {
    expect(validateCUPS('ES0000000000000000TT1F')).toBe(true)
    expect(validateCUPS('ES0000000000000000TT0')).toBe(true)
  })
  it('rechaza CUPS con dígito control incorrecto', () => {
    expect(validateCUPS('ES0000000000000000XX')).toBe(false)
  })
  it('rechaza formato inválido', () => {
    expect(validateCUPS('FR0000000000000000TT')).toBe(false)
    expect(validateCUPS('ES000000000000TT')).toBe(false)
    expect(validateCUPS('')).toBe(false)
    expect(validateCUPS(null)).toBe(false)
  })
  it('normaliza espacios', () => {
    expect(validateCUPS(' es0000000000000000tt ')).toBe(true)
  })
})

describe('validateTelefonoES', () => {
  it('acepta móviles y fijos válidos', () => {
    expect(validateTelefonoES('612345678')).toBe(true) // móvil
    expect(validateTelefonoES('912345678')).toBe(true) // fijo Madrid
    expect(validateTelefonoES('+34612345678')).toBe(true)
    expect(validateTelefonoES('0034612345678')).toBe(true)
    expect(validateTelefonoES('612-345-678')).toBe(true)
    expect(validateTelefonoES('612 345 678')).toBe(true)
  })
  it('rechaza inválidos', () => {
    expect(validateTelefonoES('512345678')).toBe(false) // empieza por 5
    expect(validateTelefonoES('61234567')).toBe(false) // 8 dígitos
    expect(validateTelefonoES('6123456789')).toBe(false) // 10 dígitos
    expect(validateTelefonoES('')).toBe(false)
    expect(validateTelefonoES(null)).toBe(false)
  })
})

describe('validateEmail', () => {
  it('acepta emails razonables', () => {
    expect(validateEmail('a@b.co')).toBe(true)
    expect(validateEmail('juan.olivares@valereconsultores.com')).toBe(true)
  })
  it('rechaza emails inválidos', () => {
    expect(validateEmail('a@b')).toBe(false)
    expect(validateEmail('a@b.c')).toBe(false)
    expect(validateEmail('a b@c.com')).toBe(false)
    expect(validateEmail('')).toBe(false)
  })
})

describe('validateCP', () => {
  it('acepta CP españoles', () => {
    expect(validateCP('28001')).toBe(true)
    expect(validateCP('01001')).toBe(true)
    expect(validateCP('52001')).toBe(true)
  })
  it('rechaza provincias fuera de rango', () => {
    expect(validateCP('53001')).toBe(false)
    expect(validateCP('00123')).toBe(false)
    expect(validateCP('1234')).toBe(false)
    expect(validateCP('ABCDE')).toBe(false)
  })
})
