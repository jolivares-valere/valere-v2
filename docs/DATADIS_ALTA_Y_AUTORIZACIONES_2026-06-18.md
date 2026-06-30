# Datadis · Cuenta de Valere dada de alta + vías de autorización + plan partner

> **Fecha:** 2026-06-18 · **Autor:** Claude (Cowork) con hallazgos de Claude Browser sobre la cuenta REAL de Valere.
> Hito: **VALERE CONSULTORES ASOCIADOS SL ya está dada de alta en datadis.es** (cuenta de empresa, CIF).
> Desbloquea el prerequisito que estaba pendiente en `DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md` §6.
> **No ejecuta nada.** Documenta estado + procedimiento.

---

## 0. Estado actual de la cuenta (verificado en la plataforma, 2026-06-18)

| Elemento | Estado |
|---|---|
| Empresa registrada | ✅ VALERE CONSULTORES ASOCIADOS SL (CIF) |
| Suministros propios | ✅ acceso activo |
| Suministros de terceros | **0 autorizaciones activas** (punto de partida) |
| API | Disponible, base `https://datadis.es/` |
| Acceso a la cuenta | Certificado de empresa (resuelto el error de "tras elegir certificado") |

---

## 1. Las dos vías de autorización — y por qué Valere necesita la VÍA 2

### VÍA 1 — Solicitud individual (disponible ya)
`Suministros de terceros → Autorizaciones → + Solicitar nueva autorización → "Solicitar a un usuario"`:
introduces NIF/CIF del cliente, vigencia, "todos los CUPS" o algunos → "Enviar autorización".
**El cliente recibe una notificación y debe ACEPTARLA desde SU cuenta de Datadis.**

> ⚠️ **Limitación crítica para Valere:** la Vía 1 exige que **el cliente tenga cuenta en Datadis** para aceptar.
> Como la mayoría de vuestros clientes **NO están dados de alta en Datadis**, esta vía **no os sirve** para ellos:
> no tienen dónde aceptar. Solo vale para los pocos clientes que ya tengan cuenta.

### VÍA 2 — "Soy partner" / empresa acreditada (autorizaciones masivas/agregadas) ⚠️ requiere acreditación
Permite gestionar autorizaciones **agregadas para múltiples clientes sin que cada uno acepte manualmente** —
con el documento firmado por el cliente como base. **Está restringida**: hay que acreditarse como empresa
partner/gestora escribiendo a **dpo@datadis.es**.

> ✅ **Esta es LA vía que necesita Valere**, exactamente por lo que Juan pidió: autorizaciones agregadas para
> clientes que no están de alta en Datadis. **Para el caso de Valere, la Vía 2 no es opcional: es el único camino
> que funciona a escala.** La Vía 1 es solo un parche para arrancar con los clientes que ya tengan cuenta.

Esto **confirma y refuerza** el flujo de `DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md`: documento firmado
por el cliente → Valere lo remite a Datadis → Datadis da de alta la autorización. El correo nº2 del diseño va, por
tanto, al canal partner.

---

## 2. API de Datadis confirmada (precisa el diseño técnico)

REST, **solo lectura** (salvo POST del token). Confirmado sobre la cuenta real:

| Endpoint | Método | Para qué |
|---|---|---|
| `/nikola-auth/tokens/login` | POST | Token (username = NIF de Valere, password). Devuelve Bearer |
| `/api-private/api/get-supplies` | GET | Suministros propios **y de terceros autorizados** (el sondeo de activación sale de aquí) |
| `/api-private/api/get-contract-detail` | GET | Detalle de contrato por CUPS |
| `/api-private/api/get-consumption-data` | GET | Consumos kWh por CUPS (la curva → puente a `facturas`) |
| `/api-private/api/get-max-power` | GET | Potencia máxima por CUPS (maxímetros / optimización potencia) |

> **Parámetro clave: `authorizedNif`** = NIF del cliente autorizado. El `datadis-sync` itera sobre los NIF
> autorizados (de `get-supplies`) y pide datos pasando `authorizedNif`. Esto **concreta el pseudocódigo del sync**
> de `DISENO_DATADIS_PUENTE_2026-06-14.md` §3: el bucle es "por cada authorizedNif → get-supplies → get-consumption".

> **Encaja con lo ya construido:** el `datadis-proxy` (v13, ACTIVE) ya habla con esta API. El sondeo del Paso 7 del
> expediente = llamar `get-supplies` y ver qué CUPS de terceros aparecen → promocionar esos expedientes a `activo`.

---

## 3. Plan de 3 fases

**Fase 0 — Acreditación partner (PRIMERO, es el desbloqueante real).**
Escribir a **dpo@datadis.es** solicitando acreditación como empresa gestora/asesora para autorizaciones agregadas.
Preguntar explícitamente (estas respuestas cierran los pendientes del diseño):
- Cómo acreditarse como empresa gestora autorizada (requisitos, documentación).
- **Procedimiento y modelo de documento** para autorizar CUPS de clientes **que NO tienen cuenta Datadis**.
- Si admiten **carga masiva/por lotes** (CSV/Excel de NIF+CUPS) y formato exacto.
- **Canal** para remitir los documentos firmados y **plazo** de alta.

**Fase 1 — Vía individual (en paralelo, solo clientes ya en Datadis).**
A los clientes que sí tengan cuenta, enviar la solicitud individual para ir acumulando CUPS desde hoy.

**Fase 2 — Operación masiva (cuando Datadis acredite a Valere).**
El CRM gestiona el expediente (doc firmado → email cliente → subida → remitir a Datadis por el canal partner)
y se cargan las autorizaciones en lote. Es el modelo profesional objetivo.

---

## 4. Impacto en el diseño del CRM (qué se actualiza)

1. El **expediente de consentimiento** (`DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md`) es correcto y ahora
   tiene confirmado su canal: la Vía 2 partner. El correo nº2 va al canal que indique dpo@datadis.es.
2. El **sync** usa `get-supplies` + `authorizedNif` (concretado en §2). Sondeo de activación = aparición del CUPS en `get-supplies`.
3. Añadir al expediente la posibilidad de **lote** (varios NIF/CUPS en una remesa) si Datadis lo admite (Fase 0 lo confirma).
4. Prerequisito de cuenta de empresa: **RESUELTO** (Valere ya está de alta). Queda solo la acreditación partner.

---

## 5. Pendientes (actualizado)

- [ ] **Enviar correo a dpo@datadis.es** (borrador en §6) — Fase 0.
- [ ] Confirmar respuesta de Datadis: modelo de documento, formato de lote, canal y plazo.
- [ ] Revisión legal del borrador de cláusula (`BORRADOR_DATADIS_TEXTOS_2026-06-14.md`).
- [ ] (Construcción) EC-1..EC-7 del expediente, cuando haya OK de procedimiento.
- [x] ~~Cuenta de empresa de Valere en datadis.es~~ ✅ HECHO (2026-06-18).
- [x] ~~Error de certificado al acceder~~ ✅ resuelto (acceso conseguido).

---

## 6. Borrador de correo a dpo@datadis.es (Fase 0)

> Borrador no vinculante. Ajustar datos y revisar antes de enviar.

```
Para: dpo@datadis.es
Asunto: Solicitud de acreditación como empresa gestora — autorizaciones agregadas (VALERE CONSULTORES ASOCIADOS SL)

Buenos días:

Somos VALERE CONSULTORES ASOCIADOS, S.L. (CIF {{valere_cif}}), consultora de asesoramiento energético, ya
registrada en datadis.es como empresa.

Gestionamos los contratos de energía de empresas clientes y, para prestarles nuestro servicio, necesitamos
acceder a sus datos de consumo en Datadis. La mayoría de nuestros clientes NO disponen de cuenta propia en
Datadis, por lo que la solicitud de autorización individual (que requiere que el cliente acepte desde su
cuenta) no es viable en nuestro caso.

Por ello, solicitamos información sobre el procedimiento para acreditarnos como empresa gestora/partner y poder
gestionar autorizaciones agregadas mediante documento de autorización firmado por el titular. En concreto,
agradeceríamos que nos indicaran:

 1. Requisitos y documentación para acreditarse como empresa gestora autorizada.
 2. Procedimiento y modelo oficial de documento de autorización para clientes sin cuenta en Datadis.
 3. Si admiten carga masiva / por lotes de autorizaciones (formato CSV/Excel de NIF y CUPS) y especificaciones.
 4. Canal por el que remitir los documentos firmados y plazo estimado de alta de las autorizaciones.

Quedamos a su disposición para aportar la documentación que precisen. Muchas gracias.

Un saludo,
{{remitente_nombre}}
VALERE CONSULTORES ASOCIADOS, S.L.
CIF {{valere_cif}} · {{remitente_email}} · {{remitente_telefono}}
```

---

*Fuentes: análisis de la cuenta real de Valere en datadis.es vía Claude Browser (2026-06-18). API confirmada sobre la
plataforma. Documentación de apoyo del sector en `DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md`. Canal partner:
dpo@datadis.es (indicado por la propia plataforma para acreditación de empresa gestora).*
