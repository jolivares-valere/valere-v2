# Datadis · Verificación sobre la plataforma real + contraste con el CRM + email a dpo

> **Fecha:** 2026-06-18 · **Autor:** Claude (Cowork) vía Claude in Chrome sobre la cuenta REAL de Valere en datadis.es
> (Juan introdujo las credenciales; Claude no las vio). Confirma el procedimiento navegando la plataforma.
> **No ejecuta nada en el repo.** Documenta hallazgos + email listo para enviar.

---

## 1. Lo confirmado en datadis.es (cuenta VALERE CONSULTORES ASOCIADOS SL)

### 1.1 Estado de autorizaciones
- Menú: Mis suministros · **Suministros de terceros** · Mis grupos · Mis informes · **API** · Centro de descargas · Ayuda · Contacto.
- En **Suministros de terceros → Autorizaciones**: **ya hay 1 autorización en curso**:
  > **A28429348 — CHEMTROL ESPAÑOLA SA · 14 CUPS · estado PENDIENTE**
  (alguien ya solicitó autorización a un cliente real; espera que el titular la acepte).

### 1.2 Las dos vías (pantalla "Nueva autorización", dos pestañas)
**Pestaña "Solicitar autorización" (Vía 1, individual) — DISPONIBLE.** Campos exactos del formulario:
- *NIF, CIF, DNI o NIE del usuario al que solicito autorización* (obligatorio).
- *Fecha de vigencia*: Fecha inicial + Fecha final (obligatorio).
- *¿Para qué CUPS quieres solicitar acceso?*: **"A todos los CUPS"** o **"Sólo a algunos CUPS"**.
- Botón **"Enviar autorizaciones"**.
- ⚠️ Requiere que el titular **acepte** la solicitud (necesita cuenta en Datadis).

**Pestaña "Soy partner" (Vía 2, agregada/masiva) — RESTRINGIDA.** Texto literal en pantalla:
  > ⚠️ *"Lo sentimos, pero este procedimiento está restringido. Tienes que legitimarte como empresa acreditada para
  > poder realizar autorizaciones agregadas. Escríbenos a **dpo@datadis.es** para obtener más información."*

> **CONCLUSIÓN DEFINITIVA:** la vía masiva/agregada (la que Valere necesita para clientes sin cuenta Datadis) está
> **bloqueada hasta acreditarse como partner** escribiendo a **dpo@datadis.es**. No hay forma de saltarlo en el panel.

### 1.3 Documentación de la API (sección "API" de la cuenta) — confirmada
- **URL base:** `https://datadis.es/`
- *"datos de suministros propios o de terceros que nos han autorizado **o datos agregados por zonas, sectores o
  potencias máximas**"* → la **API agregada existe** (va con la acreditación partner).
- REST, **solo lectura** (POST solo para token, GET para datos). *"las URL no están destinadas a navegadores web"* → backend.
- **Dos interfaces**: la clásica y una **"Nueva interfaz V2"** (Supplies, Contracts, ConsumptionsKWh, Max Power…).
- **Autenticación:** `POST https://datadis.es/nikola-auth/tokens/login` — `username` = NIF dado de alta, `password`.
- **`GET /api-private/api/get-supplies`** — parámetros: **`authorizedNif`** (*"buscar suministros de personas que hemos
  autorizado… con el NIF de las personas autorizadas"*) y **`distributorCode`** (se obtiene de `/get-distributors-with-supplies`).

---

## 2. Contraste con lo que YA tenemos programado en el CRM

Revisado `src/core/services/datadis.ts`, `src/features/datadis/api.ts`, migración `20260422_datadis_integracion.sql`.

| Documentación oficial Datadis | Implementado en el CRM | Estado |
|---|---|---|
| `POST /nikola-auth/tokens/login` (username=NIF, password) | `authenticate()` con esa URL exacta, token solo en memoria | ✅ alineado |
| `GET /api-private/api/get-supplies` + `authorizedNif` + `distributorCode` | `getSupplies(authorizedNif?)` con esos query params | ✅ alineado |
| `get-contract-detail`, `get-consumption-data`, `get-max-power` | `getContractDetail`, `getConsumptionData`, `getMaxPower` (todas con `authorizedNif`) | ✅ alineado |
| `/get-distributors-with-supplies` (para resolver distributorCode) | No implementado (códigos 1-8 cableados a mano) | ⚠️ añadir |
| Llamadas desde backend (no navegador) | Edge Function `datadis-proxy` v13 (token en Vault) | ✅ correcto |
| **Nueva interfaz V2** | No usada (usamos la clásica) | ℹ️ evaluar migrar |
| Tabla `cups` con `datadis_distribuidor_cod`, `datadis_consumptions` (1 fila/hora/CUPS) | Existen (migración 20260422) | ✅ |

**Veredicto:** el módulo API del CRM está **bien construido y alineado con la API real**. El parámetro `authorizedNif`
—la pieza para consultar CUPS de terceros— **ya está programado en todas las llamadas**. Mejoras menores:
1. Añadir `get-distributors-with-supplies` en vez de cablear los códigos.
2. Evaluar la **interfaz V2** (Datadis la marca como nueva; conviene saber si la clásica tiene fecha de retirada).
3. El `datadis-sync` (puente a `facturas`, aún por construir) iterará: `get-supplies(authorizedNif)` por cada cliente
   autorizado → `get-consumption-data` → agregación mensual → `facturas(origen='datadis')`.

---

## 3. Procedimiento correcto para Valere (definitivo, tras verificar)

**Paso 1 — Acreditarse como partner (DESBLOQUEANTE).** Enviar el email del §4 a **dpo@datadis.es**.
Sin esto, no hay autorizaciones agregadas para clientes sin cuenta Datadis.

**Paso 2 — Mientras llega la acreditación, Vía 1 para quien ya tenga cuenta.** Igual que la solicitud a CHEMTROL
(ya en curso): formulario → NIF + vigencia + CUPS → "Enviar autorizaciones" → el titular acepta.

**Paso 3 — Con acreditación partner:** autorizaciones agregadas vía documento firmado + API agregada. El CRM orquesta
el expediente (ver `DISENO_DATADIS_EXPEDIENTE_CONSENTIMIENTO_2026-06-14.md`) y la carga masiva por el canal que indique Datadis.

---

## 4. EMAIL COMPLETO a dpo@datadis.es (listo para enviar)

> Revisar los `{{datos}}` y enviar desde el correo corporativo de Valere. Adjuntar lo que proceda (CIF, escritura/poder).

```
Para:     dpo@datadis.es
Asunto:   Solicitud de acreditación como empresa partner para autorizaciones agregadas — VALERE CONSULTORES ASOCIADOS SL (CIF {{valere_cif}})

Estimado equipo de Datadis:

Somos VALERE CONSULTORES ASOCIADOS, S.L. (CIF {{valere_cif}}), consultora de asesoramiento energético, ya
registrada y operativa en datadis.es como empresa.

En el proceso de solicitud de autorización a suministros de terceros, dentro de la pestaña "Soy partner", se nos
indica que el procedimiento de autorizaciones agregadas está restringido y que debemos legitimarnos como empresa
acreditada escribiéndoles a esta dirección. Por ello les solicitamos información para completar dicha acreditación.

Nuestro caso de uso es el siguiente: gestionamos los contratos de energía de empresas clientes a las que asesoramos.
La mayoría de ellas NO disponen de cuenta propia en Datadis, por lo que la solicitud de autorización individual
—que requiere que el titular acepte desde su cuenta— no resulta viable a la escala que necesitamos. Disponemos del
consentimiento de los titulares mediante documento de autorización firmado.

Agradeceríamos que nos indicaran, en concreto:

  1. Requisitos y documentación necesarios para acreditarnos como empresa partner / gestora autorizada.
  2. Procedimiento y modelo oficial de documento de autorización para dar de alta el acceso a CUPS de clientes
     que no disponen de cuenta en Datadis, a partir de su autorización firmada.
  3. Si admiten carga agregada / por lotes de autorizaciones (por ejemplo, fichero CSV o Excel con NIF y CUPS) y,
     en su caso, el formato y los campos exactos requeridos.
  4. El canal por el que debemos remitir los documentos de autorización firmados y el plazo estimado de alta de
     las autorizaciones una vez recibidos.
  5. Las condiciones de uso de la API agregada asociada al perfil partner (endpoints, límites de consulta y
     vigencia de las autorizaciones).

Quedamos a su entera disposición para aportar cuanta documentación precisen (CIF, escrituras, poder de
representación, etc.) y agradecemos de antemano su ayuda.

Un cordial saludo,

{{remitente_nombre}}
{{remitente_cargo}}
VALERE CONSULTORES ASOCIADOS, S.L.
CIF {{valere_cif}}
{{remitente_email}} · {{remitente_telefono}}
C/ Astronomía S/N, Torre 4, Planta 1, Puerta 3 · 41015 Sevilla
```

---

## 5. Pendientes actualizados
- [ ] **Enviar el email del §4 a dpo@datadis.es** (Juan, desde correo corporativo).
- [ ] Seguir la autorización **CHEMTROL (14 CUPS, PENDIENTE)** — ¿el titular tiene cuenta y la aceptará, o reconducir a partner?
- [ ] (CRM, menor) añadir `get-distributors-with-supplies`; evaluar interfaz **V2**.
- [x] ~~Cuenta de empresa de Valere en datadis.es~~ ✅ · ~~Error certificado~~ ✅ · ~~Confirmar vía partner~~ ✅ (restringida → dpo).

---

*Verificado sobre datadis.es (área privada de Valere) el 2026-06-18 con Claude in Chrome. API contrastada con
`src/core/services/datadis.ts`. Texto "Soy partner" y formulario "Solicitar autorización" transcritos de la pantalla real.*
