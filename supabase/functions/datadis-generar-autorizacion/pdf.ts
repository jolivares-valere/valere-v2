// ═══════════════════════════════════════════════════════════════════
// pdf.ts — Generador del PDF de autorización Datadis (diseño Valere)
//
// Porta el diseño validado (gen_final2.js) a Deno + pdf-lib.
// Plantilla central única: respeta el texto oficial de Datadis literal
// + cláusula RGPD de Valere. Campos de formulario (AcroForm) rellenables,
// pre-rellenados/premarcados con los datos que recibe.
//
// Una sola fuente de la verdad para el documento legal que Datadis audita.
// ═══════════════════════════════════════════════════════════════════

import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export interface CupsItem {
  codigo_cups: string
}

export interface AutorizacionPDFInput {
  empresaNombre: string
  empresaCif: string
  firmanteNombre: string          // nombre + apellidos ya concatenados
  firmanteDni: string
  calidadFirmante?: 'titular' | 'representante_legal' | 'apoderado' | null
  alcanceCups: 'todos' | 'lista'  // premarca casilla
  autoriza: boolean               // premarca Sí
  cupsList: string[]              // para el anexo (si alcance = 'lista')
  incluirAnexo: boolean
}

// Valere palette
const NAVY = rgb(0x1A / 255, 0x2B / 255, 0x5F / 255)
const GREEN = rgb(0x2D / 255, 0x6A / 255, 0x2D / 255)
const GREENBG = rgb(0xF4 / 255, 0xF7 / 255, 0xF2 / 255)
const GREENBORD = rgb(0xCF / 255, 0xE0 / 255, 0xC8 / 255)
const NAVYBG = rgb(0xFA / 255, 0xFB / 255, 0xFD / 255)
const NAVYBORD = rgb(0xC8 / 255, 0xD0 / 255, 0xE0 / 255)
const AMBERBG = rgb(0xFF / 255, 0xF8 / 255, 0xE8 / 255)
const AMBERB = rgb(0xD9 / 255, 0xB3 / 255, 0x5A / 255)
const FIELDBG = rgb(0xFF / 255, 0xFD / 255, 0xF5 / 255)
const GREY3 = rgb(0.33, 0.33, 0.33)
const GREY5 = rgb(0.40, 0.40, 0.40)
const GREY9 = rgb(0.60, 0.60, 0.60)
const LINEGREY = rgb(0.88, 0.88, 0.88)
const WHITE = rgb(1, 1, 1)
const AMBERTXT = rgb(0x9A / 255, 0x6B / 255, 0x08 / 255)

export async function generarAutorizacionPDF(input: AutorizacionPDFInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle('Autorizacion de acceso a datos de consumo - Datadis')
  pdf.setAuthor('VALERE CONSULTORES ASOCIADOS, S.L.')

  const W = 595.28, H = 841.89, M = 46, RIGHT = W - M, CW = RIGHT - M
  const page = pdf.addPage([W, H])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontI = await pdf.embedFont(StandardFonts.HelveticaOblique)
  const form = pdf.getForm()

  const T = (t: string, x: number, yy: number, s: number, f = font, c = rgb(0, 0, 0)) =>
    page.drawText(t, { x, y: yy, size: s, font: f, color: c })

  function P(t: string, x: number, yy: number, s: number, maxW: number, f = font, c = GREY5, lh = 1.32, draw = true) {
    const words = t.split(' ')
    let line = ''
    const lineH = s * lh
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (f.widthOfTextAtSize(test, s) > maxW && line) { if (draw) T(line, x, yy, s, f, c); yy -= lineH; line = w }
      else line = test
    }
    if (line) { if (draw) T(line, x, yy, s, f, c); yy -= lineH }
    return yy
  }

  function RW(runs: { t: string; b?: boolean }[], x: number, yy: number, s: number, maxW: number, lh: number, draw = true) {
    const lineH = s * lh
    let cx = x
    const tk: { t: string; b?: boolean }[] = []
    for (const r of runs) for (const p of r.t.split(/(\s+)/)) if (p.length) tk.push({ t: p, b: r.b })
    for (const t of tk) {
      const f = t.b ? fontB : font
      const w = f.widthOfTextAtSize(t.t, s)
      if (cx + w > x + maxW && t.t.trim() !== '') { yy -= lineH; cx = x }
      if (!(cx === x && t.t.trim() === '')) { if (draw) T(t.t, cx, yy, s, f, rgb(0.13, 0.13, 0.13)); cx += w }
    }
    return yy - lineH
  }

  function tf(name: string, x: number, yy: number, w: number, h: number, size: number, value = '') {
    const t = form.createTextField(name)
    t.setText(value)
    t.addToPage(page, { x, y: yy, width: w, height: h, backgroundColor: FIELDBG, borderColor: NAVY, borderWidth: 0.8 })
    t.setFontSize(size || 10)
    t.updateAppearances(font)
    return t
  }
  function cbx(name: string, x: number, yy: number, sz: number, col = NAVY, checked = false) {
    const c = form.createCheckBox(name)
    c.addToPage(page, { x, y: yy, width: sz, height: sz, borderColor: col, borderWidth: 1, backgroundColor: WHITE })
    if (checked) c.check()
    return c
  }
  function chip(num: string, x: number, yy: number) {
    page.drawRectangle({ x, y: yy - 2, width: 15, height: 13, color: GREEN })
    T(num, x + (15 - fontB.widthOfTextAtSize(num, 9)) / 2, yy + 1, 9, fontB, WHITE)
  }

  let y = H - 36
  // Header
  T('Valere', M, y, 17, fontB, NAVY)
  T(' CONSULTORES', M + fontB.widthOfTextAtSize('Valere', 17), y, 17, fontB, GREEN)
  const sub = 'Autorizacion de acceso a datos de consumo · Datadis'
  T(sub, RIGHT - font.widthOfTextAtSize(sub, 8), y + 3, 8, font, GREY9)
  y -= 9; page.drawRectangle({ x: M, y, width: CW, height: 1.6, color: GREEN }); y -= 20
  // Title
  T('AUTORIZACIÓN DE ACCESO A LOS DATOS DE CONSUMO EN DATADIS', M, y, 12.5, fontB, NAVY); y -= 15
  y = P('En cumplimiento del acuerdo de Partner formalizado entre VALERE CONSULTORES ASOCIADOS, S.L. (en adelante, el Partner) y Plataforma Datadis C.B.', M, y, 8.5, CW, font, GREY5, 1.32); y -= 10

  // SECTION 1
  const fieldX = M + 14, fieldW = CW - 28, colW = (fieldW - 16) / 2
  const cal = input.calidadFirmante
  function sec1(top: number, draw: boolean) {
    let iy = top - 34
    const lbl = (t: string, x: number, yy: number) => { if (draw) T(t, x, yy, 7.5, fontB, NAVY) }
    lbl('EMPRESA TITULAR DEL SUMINISTRO (RAZÓN SOCIAL)', fieldX, iy)
    if (draw) tf('titular', fieldX, iy - 20, fieldW, 16, 11, input.empresaNombre); iy -= 40
    lbl('CIF DE LA EMPRESA TITULAR', fieldX, iy)
    if (draw) tf('cif', fieldX, iy - 20, colW, 16, 11, input.empresaCif); iy -= 40
    lbl('FIRMANTE — NOMBRE Y APELLIDOS', fieldX, iy)
    lbl('DNI / NIE DEL FIRMANTE', fieldX + colW + 16, iy)
    if (draw) { tf('firmante_nombre', fieldX, iy - 20, colW, 16, 11, input.firmanteNombre); tf('firmante_dni', fieldX + colW + 16, iy - 20, colW, 16, 11, input.firmanteDni) }
    iy -= 40
    lbl('ACTÚA EN CALIDAD DE  ·  marque una opción', fieldX, iy); iy -= 15
    if (draw) {
      cbx('calidad_titular', fieldX, iy - 1, 10, NAVY, cal === 'titular'); T('Titular', fieldX + 14, iy, 8, font, GREY3)
      cbx('calidad_representante', fieldX + 78, iy - 1, 10, NAVY, cal === 'representante_legal'); T('Representante legal', fieldX + 78 + 14, iy, 8, font, GREY3)
      cbx('calidad_apoderado', fieldX + 230, iy - 1, 10, NAVY, cal === 'apoderado'); T('Apoderado', fieldX + 230 + 14, iy, 8, font, GREY3)
    }
    iy -= 20
    lbl('CUPS QUE AUTORIZA  ·  marque una opción', fieldX, iy); iy -= 15
    if (draw) {
      cbx('cups_todos', fieldX, iy - 1, 10, NAVY, input.alcanceCups === 'todos'); T('Autorizo TODOS los CUPS de la empresa titular', fieldX + 14, iy, 8, font, GREY3)
      cbx('cups_lista', fieldX + 250, iy - 1, 10, NAVY, input.alcanceCups === 'lista'); T('Solo los CUPS del ANEXO', fieldX + 250 + 14, iy, 8, font, GREY3)
    }
    iy -= 14
    if (draw) T('Una autorización por empresa titular (CIF). El mismo representante puede firmar las autorizaciones de varias empresas.', fieldX, iy, 6.8, fontI, GREY9)
    return iy - 4
  }
  const s1Top = y, s1End = sec1(s1Top, false), s1H = s1Top - s1End + 8
  page.drawRectangle({ x: M, y: s1Top - s1H, width: CW, height: s1H, color: GREENBG, borderColor: GREENBORD, borderWidth: 0.8 })
  chip('1', M + 12, s1Top - 20); T('RELLENE LOS DATOS', M + 34, s1Top - 19, 9.5, fontB, GREEN)
  sec1(s1Top, true)
  y = s1Top - s1H - 16

  // DATADIS official
  function datadis(top: number, draw: boolean) {
    let dy = top - 16
    if (draw) T('TEXTO OFICIAL DATADIS', M + 16, dy, 7.5, fontB, NAVY); dy -= 13
    dy = RW([{ t: '¿Autoriza a ' }, { t: 'VALERE CONSULTORES ASOCIADOS, S.L.', b: true },
      { t: ' a visualizar y descargar en sus propios sistemas los datos de su/s suministro/s, para que éste pueda consultar la información sobre su consumo eléctrico a través de la plataforma Datadis, con la finalidad de ' },
      { t: 'la prestación de servicios de consultoría y asesoramiento energético', b: true },
      { t: ' y con quien el Partner tiene debidamente formalizado un acuerdo de Partner?' }],
      M + 16, dy, 8.5, CW - 32, 1.32, draw); dy -= 6
    const amH = 24
    if (draw) {
      page.drawRectangle({ x: M + 16, y: dy - amH, width: CW - 32, height: amH, color: AMBERBG, borderColor: AMBERB, borderWidth: 0.8, borderDashArray: [3, 2] })
      T('MARQUE', M + 28, dy - 15, 8, fontB, AMBERTXT)
      cbx('autoriza_si', M + 90, dy - 18, 12, NAVY, input.autoriza === true); T('Sí', M + 90 + 17, dy - 15, 11, fontB, NAVY)
      cbx('autoriza_no', M + 160, dy - 18, 12, GREY5, input.autoriza === false); T('No', M + 160 + 17, dy - 15, 11, fontB, GREY3)
    }
    dy -= amH + 9
    dy = P('Esta autorización únicamente será válida durante 24 meses. Puede solicitar la cancelación de la misma en el momento que se desee sin ninguna contraprestación o penalización por parte del Partner. La solicitud de revocación de esta autorización se realizará por escrito a través del correo electrónico (soporte@valereconsultores.com). En el caso de que se ejercite la revocación de esta autorización, dicha revocación se pondrá en un plazo de tres días por el Partner en conocimiento de la Plataforma Datadis C.B., que quedará exonerada de toda responsabilidad si se incumple esta obligación.', M + 16, dy, 7.2, CW - 32, font, GREY5, 1.26, draw); dy -= 3
    dy = P('Sus datos personales identificativos serán tratados por Datadis para poder facilitar al Partner sus datos de consumo. Datadis únicamente almacenará datos personales identificativos y siempre que Ud no ejercite su derecho de supresión de sus datos.', M + 16, dy, 7.2, CW - 32, font, GREY5, 1.26, draw); dy -= 3
    dy = P('Con respecto al tratamiento efectuado por Datadis, puede ejercitar sus derechos en dpo@datadis.es así como ponerse en contacto con el delegado de protección de datos o contactar con la autoridad de control (Agencia Española de Protección de Datos) en el caso de que lo considere necesario. La base legitimadora para el tratamiento es su consentimiento. Puede obtener más información en la política de privacidad de Datadis.', M + 16, dy, 7.2, CW - 32, font, GREY5, 1.26, draw)
    return dy - 10
  }
  const dTop = y, dEnd = datadis(dTop, false), dH = dTop - dEnd
  page.drawRectangle({ x: M, y: dTop - dH, width: CW, height: dH, color: NAVYBG, borderColor: NAVYBORD, borderWidth: 0.8 })
  page.drawRectangle({ x: M, y: dTop - dH, width: 4, height: dH, color: NAVY })
  datadis(dTop, true)
  y = dTop - dH - 16

  // RGPD
  T('INFORMACIÓN DE PROTECCIÓN DE DATOS — VALERE CONSULTORES ASOCIADOS, S.L.', M, y, 8, fontB, NAVY); y -= 11
  const rows: [string, string][] = [
    ['Responsable', 'VALERE CONSULTORES ASOCIADOS, S.L. · CIF B10759520 · C/ Astronomía S/N, Torre 4, Planta 1, Puerta 3, 41015 Sevilla.'],
    ['Finalidad', 'Prestación de servicios de consultoría y asesoramiento energético: estudios de optimización, análisis comparativo de ofertas y gestión de los contratos de suministro del titular.'],
    ['Legitimación', 'Consentimiento del interesado (art. 6.1.a RGPD) y ejecución de la relación de servicios (art. 6.1.b RGPD).'],
    ['Destinatarios', 'No se cederán datos a terceros salvo obligación legal. El acceso a los datos de consumo se realiza a través de la plataforma Datadis conforme al acuerdo de Partner.'],
    ['Conservación', 'Durante la vigencia de la autorización (24 meses) y mientras lo exija la legislación aplicable.'],
    ['Derechos', 'Acceso, rectificación, supresión, oposición, limitación y portabilidad, dirigiéndose a soporte@valereconsultores.com. Puede reclamar ante la AEPD (www.aepd.es).'],
  ]
  const valX = M + 74, valW = RIGHT - valX
  for (const [k, v] of rows) {
    page.drawRectangle({ x: M, y, width: CW, height: 0.5, color: LINEGREY }); y -= 8
    T(k, M, y, 7, fontB, NAVY)
    const after = P(v, valX, y, 7, valW, font, GREY3, 1.22, true)
    y = Math.min(y - 8, after - 3)
  }
  page.drawRectangle({ x: M, y, width: CW, height: 0.5, color: LINEGREY }); y -= 16

  // SECTION 2
  const s2Top = y, s2H = 66
  page.drawRectangle({ x: M, y: s2Top - s2H, width: CW, height: s2H, color: GREENBG, borderColor: GREENBORD, borderWidth: 0.8 })
  chip('2', M + 12, s2Top - 20); T('FECHA Y FIRMA', M + 34, s2Top - 19, 9.5, fontB, GREEN)
  const halfW = (CW - 28 - 30) / 2, f2x = M + 14
  const labY = s2Top - 34, fldY = s2Top - 54
  T('LUGAR Y FECHA', f2x, labY, 7.5, fontB, NAVY)
  tf('lugar_fecha', f2x, fldY, halfW, 16, 10)
  const firmaX = f2x + halfW + 30
  T('FIRMA DEL TITULAR / REPRESENTANTE', firmaX, labY, 7.5, fontB, NAVY)
  const sig = form.createTextField('firma')
  sig.addToPage(page, { x: firmaX, y: fldY, width: halfW, height: 16, backgroundColor: FIELDBG, borderColor: NAVY, borderWidth: 0.8 })
  sig.setFontSize(10)

  const foot = 'VALERE CONSULTORES ASOCIADOS, S.L. · CIF B10759520 · C/ Astronomía S/N, Torre 4, Planta 1, Puerta 3, 41015 Sevilla · soporte@valereconsultores.com'
  page.drawRectangle({ x: M, y: 30, width: CW, height: 0.5, color: LINEGREY })
  T(foot, M + (CW - font.widthOfTextAtSize(foot, 6.3)) / 2, 21, 6.3, font, GREY9)

  // ANEXO p2
  if (input.incluirAnexo) {
    const p2 = pdf.addPage([W, H])
    let ay = H - 36
    const D = (t: string, x: number, yy: number, s: number, f = font, c = rgb(0, 0, 0)) => p2.drawText(t, { x, y: yy, size: s, font: f, color: c })
    D('Valere', M, ay, 17, fontB, NAVY); D(' CONSULTORES', M + fontB.widthOfTextAtSize('Valere', 17), ay, 17, fontB, GREEN)
    const s2b = 'Anexo · Relación de CUPS autorizados'; D(s2b, RIGHT - font.widthOfTextAtSize(s2b, 8), ay + 3, 8, font, GREY9)
    ay -= 9; p2.drawRectangle({ x: M, y: ay, width: CW, height: 1.6, color: GREEN }); ay -= 22
    D('ANEXO — RELACIÓN DE CUPS AUTORIZADOS', M, ay, 12.5, fontB, NAVY); ay -= 15
    {
      const t = 'Anexo a la autorización de acceso a datos de consumo en Datadis firmada por el titular. Los CUPS aquí relacionados quedan cubiertos por la firma de la autorización principal.'
      const words = t.split(' '); let line = ''; const lh = 8.5 * 1.32
      for (const w of words) { const tt = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(tt, 8.5) > CW && line) { D(line, M, ay, 8.5, font, GREY5); ay -= lh; line = w } else line = tt }
      if (line) { D(line, M, ay, 8.5, font, GREY5); ay -= lh }
    }
    ay -= 6
    D('TITULAR', M, ay, 7.5, fontB, NAVY)
    const tf2 = form.createTextField('anexo_titular'); tf2.addToPage(p2, { x: M + 50, y: ay - 4, width: CW - 50, height: 15, backgroundColor: FIELDBG, borderColor: NAVY, borderWidth: 0.8 }); tf2.setText(input.empresaNombre); tf2.setFontSize(10); tf2.updateAppearances(font)
    ay -= 26
    const ROWS = 40, cc = 2, perCol = ROWS / cc, rowH = 16, gap = 24, colW2 = (CW - gap) / cc, numW = 22, startY = ay
    for (let c = 0; c < cc; c++) {
      const cx = M + c * (colW2 + gap)
      p2.drawRectangle({ x: cx, y: startY - 13, width: colW2, height: 14, color: NAVY })
      D('Nº', cx + 5, startY - 10, 7.5, fontB, WHITE); D('CUPS', cx + numW + 4, startY - 10, 7.5, fontB, WHITE)
      for (let r = 0; r < perCol; r++) {
        const idx = c * perCol + r, ry = startY - 14 - (r + 1) * rowH
        if (r % 2 === 0) p2.drawRectangle({ x: cx, y: ry, width: colW2, height: rowH, color: rgb(0.97, 0.98, 0.96) })
        p2.drawRectangle({ x: cx, y: ry, width: colW2, height: 0.4, color: LINEGREY })
        D(String(idx + 1), cx + 5, ry + 5, 7.5, fontB, NAVY)
        const fld = form.createTextField('cups_' + (idx + 1))
        if (input.cupsList[idx]) fld.setText(input.cupsList[idx])
        fld.addToPage(p2, { x: cx + numW, y: ry + 1.5, width: colW2 - numW - 3, height: rowH - 3, backgroundColor: FIELDBG, borderColor: rgb(0.8, 0.84, 0.9), borderWidth: 0.5 })
        fld.setFontSize(8); fld.updateAppearances(font)
      }
    }
    const f2 = 'VALERE CONSULTORES ASOCIADOS, S.L. · CIF B10759520 · soporte@valereconsultores.com'
    p2.drawRectangle({ x: M, y: 30, width: CW, height: 0.5, color: LINEGREY })
    D(f2, M + (CW - font.widthOfTextAtSize(f2, 6.3)) / 2, 21, 6.3, font, GREY9)
  }

  for (const f of form.getFields()) { try { f.updateAppearances(font) } catch (_e) { /* noop */ } }
  return await pdf.save()
}
