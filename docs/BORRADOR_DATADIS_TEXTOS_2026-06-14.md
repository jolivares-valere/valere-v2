# Borradores · Consentimiento Datadis (cláusula + 2 correos)

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork) · Acompaña a `DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md`
> ⚠️ **AVISO: BORRADORES NO VINCULANTES.** Esto NO es asesoramiento legal. La cláusula RGPD y el documento de
> autorización deben ser **revisados por un asesor legal** y **contrastados con el modelo oficial que acepte Datadis**
> antes de usarse con clientes reales. Son un punto de partida para no empezar de cero.
> Campos entre `{{...}}` los rellena el CRM automáticamente.

---

## 1. Documento de autorización (borrador de cláusula)

> Este es el documento que el cliente firma. Debe ajustarse al **modelo oficial de Datadis** (pendiente de confirmar
> cuál es exactamente). Estructura mínima que la documentación del sector exige:

```
AUTORIZACIÓN DE ACCESO A LOS DATOS DE CONSUMO EN DATADIS

REUNIDOS

De una parte, {{titular_nombre}}, con NIF/CIF {{titular_nif}}, en calidad de titular del/los punto(s)
de suministro identificado(s) por el/los CUPS:
   {{lista_cups}}

De otra parte, VALERE CONSULTORES ASOCIADOS, S.L., con CIF {{valere_cif}}, con domicilio en
C/ Astronomía S/N, Torre 4, Planta 1, Puerta 3, 41015 Sevilla (en adelante, "Valere").

AUTORIZA

PRIMERO. Que VALERE CONSULTORES ASOCIADOS, S.L. (NIF {{valere_nif_datadis}}) acceda, a través de la
plataforma DATADIS, a los datos de consumo eléctrico, potencia contratada, potencias máximas demandadas
y demás información disponible asociada al/los CUPS arriba indicado(s), de los que el firmante es titular.

SEGUNDO. Que la finalidad de este acceso es exclusivamente la elaboración de estudios de optimización
energética, análisis comparativo de ofertas y servicios de consultoría energética prestados por Valere
al titular.

TERCERO. Que esta autorización tiene una vigencia de VEINTICUATRO (24) MESES desde la fecha de firma,
pudiendo el titular revocarla en cualquier momento, sin coste ni penalización, comunicándolo a Valere o
directamente en la plataforma DATADIS.

CUARTO. Información básica de protección de datos:
 · Responsable: VALERE CONSULTORES ASOCIADOS, S.L.
 · Finalidad: prestación de servicios de consultoría y optimización energética.
 · Legitimación: consentimiento del interesado (art. 6.1.a RGPD).
 · Destinatarios: no se cederán datos a terceros salvo obligación legal.
 · Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad, dirigiéndose a
   {{valere_email_rgpd}}.

En {{lugar}}, a {{fecha}}.

Firma del titular:                              (sello/firma)
```

> **Pendiente legal:** validar finalidad, base de legitimación, plazo de conservación de datos, e identidad exacta
> del responsable de tratamiento. El **NIF de Valere a autorizar en Datadis** (`{{valere_nif_datadis}}`) debe ser el de
> la cuenta de empresa de Valere en datadis.es.

---

## 2. Correo nº1 — al CLIENTE (con el documento a firmar)

**Para:** `{{email_cliente}}`
**Asunto:** Autorización de acceso a tus datos de consumo (Datadis) — {{empresa_cliente}}

```
Estimado/a {{contacto_nombre}}:

Para poder elaborar tu estudio de optimización energética necesitamos acceder a tus datos de consumo
eléctrico a través de DATADIS, la plataforma oficial y gratuita de las distribuidoras.

Para autorizarnos, solo tienes que:

1. Revisar y firmar el documento de autorización adjunto.
2. Devolvérnoslo respondiendo a este correo con el documento firmado.

Con esa autorización, Valere podrá consultar tu curva de consumo y potencias directamente en Datadis,
sin que tengas que enviarnos facturas una a una. La autorización tiene una vigencia de 24 meses y puedes
revocarla cuando quieras, sin coste.

Si tienes cualquier duda, responde a este correo y te ayudamos.

Un saludo,
{{comercial_nombre}}
VALERE CONSULTORES ASOCIADOS, S.L.
{{comercial_email}} · {{comercial_telefono}}

[Adjunto: Autorizacion_Datadis_{{empresa_cliente}}.pdf]
```

---

## 3. Correo nº2 — a SOPORTE DE DATADIS (con el documento ya firmado)

> **Va como BORRADOR**: el CRM lo deja listo y un humano de Valere lo revisa y envía (decisión Juan).
> **Dirección de destino: PENDIENTE de confirmar** con Datadis (campo configurable en el CRM).

**Para:** `{{datadis_soporte_email}}` *(configurable — confirmar canal oficial)*
**Asunto:** Solicitud de alta de autorización a tercero — NIF {{valere_nif_datadis}}

```
Buenos días:

Adjuntamos documento de autorización firmado por el titular para el alta de acceso a tercero en la
plataforma DATADIS, conforme al procedimiento establecido.

Datos de la solicitud:
 · Titular: {{titular_nombre}} — NIF/CIF: {{titular_nif}}
 · CUPS autorizado(s): {{lista_cups}}
 · Empresa autorizada (tercero): VALERE CONSULTORES ASOCIADOS, S.L. — NIF {{valere_nif_datadis}}
 · Vigencia solicitada: 24 meses desde la fecha de firma ({{fecha_firma}})

Quedamos a la espera de la confirmación del alta de la autorización. Gracias por su gestión.

Un saludo,
{{remitente_nombre}}
VALERE CONSULTORES ASOCIADOS, S.L.
{{remitente_email}}

[Adjunto: Autorizacion_Datadis_FIRMADA_{{empresa_cliente}}.pdf]
```

---

## 4. Campos que rellena el CRM (referencia para el builder)

| Campo | Origen |
|---|---|
| `{{titular_nombre}}`, `{{titular_nif}}` | `empresas` |
| `{{lista_cups}}` | `cups` del expediente |
| `{{email_cliente}}`, `{{contacto_nombre}}` | `contactos` (decisor) |
| `{{comercial_nombre/email/telefono}}` | `user_profiles` del comercial |
| `{{valere_nif_datadis}}`, `{{valere_cif}}`, `{{valere_email_rgpd}}` | config singleton del CRM |
| `{{datadis_soporte_email}}` | config (PENDIENTE confirmar) |
| `{{fecha_firma}}` | subida del firmado (Paso 4) |

---

## 5. Pendiente antes de usar con clientes reales (checklist)

- [ ] **Revisión legal** de la cláusula §1 (asesor RGPD de Valere).
- [ ] **Modelo oficial de Datadis**: confirmar cuál acepta su soporte y ajustar §1 a él.
- [ ] **Dirección de email de soporte de Datadis** para el correo nº2 (§3).
- [ ] **NIF de la cuenta de empresa de Valere en datadis.es** (`{{valere_nif_datadis}}`).
- [ ] Confirmar **plazo real de alta** (los 2-3 días conocidos, verificar la primera vez).
```
