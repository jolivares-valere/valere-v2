# Diseño · Expediente de consentimiento Datadis (flujo end-to-end en el CRM)

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork, sesión de diseño — solo `.md`, sin tocar código)
> **Reemplaza/concreta** la sección de consentimiento de `DISENO_DATADIS_PUENTE_2026-06-14.md` §2.
> Decisiones de Juan (2026-06-14) incorporadas. **No ejecuta nada en Supabase.** SQL = propuestas.

---

## 0. Corrección importante respecto al diseño anterior

Una sesión previa asumió que **a Datadis no se le comunica nada** y que el único camino era que el cliente
autorizara el NIF de Valere dentro de datadis.es. **Eso era incompleto.** La documentación oficial y de proveedores
del sector confirma que **existe una vía por email a soporte de Datadis**, que es la que usan muchas asesorías y la
que Juan ha confirmado como flujo de Valere:

> *"Los clientes pueden enviar directamente un mensaje al equipo de soporte de Datadis con un archivo modelo para
> que se cree el registro y se autorice el acceso a los datos a la empresa tercera."*

Es decir: **el documento de autorización firmado SÍ tiene valor frente a Datadis.** No se sube por API: se remite por
email a su soporte, y es Datadis quien da de alta la autorización manualmente (de ahí el plazo de ~2-3 días).

**Datos confirmados (documentación Datadis/sector, 2026-06-14):**
- Validez de la autorización: **24 meses** desde la firma. Revocable por el cliente en cualquier momento sin penalización.
- Existe **modelo/archivo oficial** de autorización que Datadis acepta.
- Plazo de alta: **no publicado oficialmente**; el procesamiento es manual → del orden de **días** (consistente con los 2-3 días que conocen las asesorías). ⚠️ **Confirmar canal y plazo exactos con soporte de Datadis la primera vez.**

---

## 1. El flujo, como lo quiere Valere (decisión Juan 2026-06-14)

**El CRM orquesta el expediente completo, con dos correos distintos y subida manual del firmado en medio.**

```
┌─ Paso 1 · SUBIR PLANTILLA / GENERAR DOC ────────────────────────────────────┐
│ Valere genera (desde plantilla guardada en el CRM) el documento de           │
│ autorización con los datos del cliente ya rellenos (titular, NIF, CUPS,       │
│ NIF de Valere, vigencia 24m).                                                 │
│ → expediente_consentimiento: estado 'generado'                               │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Paso 2 · CORREO Nº1 → AL CLIENTE ──────────────────────────────────────────┐
│ El CRM redacta y envía un email AL CLIENTE con el documento a firmar.         │
│ → estado 'enviado_cliente' (guarda enviado_cliente_at)                        │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Paso 3 · EL CLIENTE DEVUELVE (fuera del CRM) ──────────────────────────────┐
│ El cliente firma y lo devuelve al correo de Valere Consultores.              │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Paso 4 · SUBIDA MANUAL DEL FIRMADO ────────────────────────────────────────┐
│ Valere sube manualmente al CRM el documento firmado.                          │
│ → se guarda en Storage vinculado al expediente, con hash.                     │
│ → estado 'firmado_cliente' (guarda firmado_at, ruta_firmado, hash_firmado)    │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Paso 5 · CORREO Nº2 → A DATADIS (distinto del nº1) ────────────────────────┐
│ El CRM redacta un correo DIFERENTE, dirigido a soporte de Datadis,            │
│ adjuntando el documento firmado, para que lo validen y den de alta.          │
│ ►► Se genera como BORRADOR para que un humano lo revise y pulse enviar        │
│    (decisión Juan: va a un tercero, mejor con control).                       │
│ → al enviarse: estado 'enviado_datadis' (guarda enviado_datadis_at)           │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Paso 6 · DATADIS VALIDA (~2-3 días) ───────────────────────────────────────┐
│ Datadis procesa el documento y autoriza el NIF de Valere sobre el/los CUPS.   │
│ → estado 'pendiente_validacion' mientras tanto                               │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Paso 7 · CONFIRMACIÓN AUTOMÁTICA (sondeo) ─────────────────────────────────┐
│ datadis-sync pregunta a la cuenta de Valere "¿qué CUPS tengo autorizados?".   │
│ Si el CUPS aparece → autorización confirmada.                                 │
│ → estado 'activo' (guarda activado_at, caduca_at = firma + 24m)               │
│ → a partir de aquí se trae la curva de consumo → puente a facturas            │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **Robustez:** el estado `activo` no se fía solo de "enviamos el correo a Datadis". Lo confirma el **sondeo** contra
> la cuenta de Valere (Paso 7). Si Datadis no ha dado de alta aún, el expediente sigue en `pendiente_validacion` y la
> UI lo muestra. Nada se da por bueno sin verificación contra la fuente.

---

## 2. Modelo de datos

### 2.1 La tabla actual `consentimientos_datadis` (verificada hoy)
Columnas reales: `id, cups, cliente_id, firmado_por_email, firmado_por_nombre, fecha_firma, ip_firma, texto_legal,
hash_texto, fecha_inicio_autorizacion, fecha_fin_autorizacion, revocado_at, revocado_motivo, created_by, created_at, updated_at`.

Es un buen modelo de **registro de firma**, pero está pensado para firma electrónica en pantalla (`ip_firma NOT NULL`)
y **le falta el ciclo de expediente** (los 7 estados, los dos correos, las rutas de documentos, el vínculo a empresa).
Dos opciones:

- **Opción A (recomendada):** crear `expediente_consentimiento_datadis` para el ciclo, y dejar
  `consentimientos_datadis` como el **registro final inmutable** de la autorización concedida (una fila cuando llega
  a `activo`). Separa "proceso" de "hecho jurídico".
- **Opción B:** ampliar `consentimientos_datadis` con todas las columnas de expediente. Más simple, pero mezcla
  proceso y registro, y obliga a hacer `ip_firma` nullable (vuestra firma es documental, no hay IP de firma en pantalla).

> Recomiendo **A**. Abajo el esquema. El técnico decide A/B según prefiera; ambos válidos.

### 2.2 Tabla nueva propuesta `expediente_consentimiento_datadis`
```sql
-- PROPUESTA (no ejecutar aquí)
CREATE TABLE IF NOT EXISTS public.expediente_consentimiento_datadis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cups_id         uuid REFERENCES public.cups(id) ON DELETE CASCADE,  -- null = "todos los CUPS de la empresa"
  cups            text,                          -- redundante para trazabilidad / multi-CUPS
  nif_titular     text NOT NULL,
  email_cliente   text NOT NULL,                 -- a dónde va el correo nº1
  estado          text NOT NULL DEFAULT 'generado'
    CHECK (estado IN ('generado','enviado_cliente','firmado_cliente',
                      'enviado_datadis','pendiente_validacion','activo','caducado','revocado','error')),
  -- documentos
  ruta_doc_generado  text,                        -- Storage: PDF generado para firmar (Paso 1)
  ruta_doc_firmado   text,                        -- Storage: PDF firmado subido (Paso 4)
  hash_doc_firmado   text,                        -- integridad del firmado
  -- hitos temporales
  generado_at        timestamptz DEFAULT now(),
  enviado_cliente_at timestamptz,
  firmado_at         timestamptz,                 -- fecha de firma (inicio de los 24m)
  enviado_datadis_at timestamptz,
  activado_at        timestamptz,
  caduca_at          timestamptz,                 -- firmado_at + 24 meses
  -- auditoría
  ultimo_error       text,
  created_by         uuid REFERENCES public.user_profiles(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE public.expediente_consentimiento_datadis ENABLE ROW LEVEL SECURITY;
-- RLS: por scope de empresa (rol + is_approved), igual que empresas/cups.
```

### 2.3 Reutilizar `documentos` (108 filas, polimórfica) para los PDFs
La tabla `documentos` ya es polimórfica (`entidad_tipo` + `entidad_id` + `ruta_storage`). Los dos PDFs (generado y
firmado) se guardan ahí con `entidad_tipo='expediente_consentimiento'`, evitando columnas de Storage sueltas si se prefiere.
(Las columnas `ruta_doc_*` de §2.2 pueden ser solo punteros, o delegar del todo en `documentos`. Decisión del técnico.)

### 2.4 Plantilla del documento
Guardar la **plantilla** del documento de autorización (el modelo que Datadis acepta) como asset versionado:
`email_templates` (ya existe, 2 filas) o `excel_import_templates`/Storage. El CRM la rellena con los datos del cliente.

---

## 3. Los dos correos (entidades y disparo)

| | Correo nº1 | Correo nº2 |
|---|---|---|
| **Destinatario** | Cliente (`email_cliente`) | Soporte de Datadis (**dirección configurable** — confirmar, ver §6) |
| **Adjunto** | Documento de autorización a firmar (generado) | Documento de autorización **ya firmado** |
| **Disparo** | Al pulsar "Enviar al cliente" (Paso 2) | Se genera **borrador** al subir el firmado; **humano revisa y envía** (Paso 5) |
| **Provider** | Resend (ya configurado en el CRM) | Resend |
| **Efecto** | estado → `enviado_cliente` | al enviar: estado → `enviado_datadis` |

Textos redactados en `BORRADOR_DATADIS_TEXTOS_2026-06-14.md` (correo cliente, correo Datadis, cláusula RGPD).

> **Nota técnica:** el correo nº2 a Datadis es a un **tercero externo**, por eso va como borrador con revisión humana
> (decisión Juan). Patrón: reutilizar `proposal_email_drafts` o una cola de borradores similar; el envío real lo
> dispara un usuario, no el sistema.

---

## 4. Guarda en `datadis-proxy` y sondeo de activación

- **Guarda (Paso 7 / consultas):** el `datadis-proxy` (v13, ya desplegado) **no debe devolver datos de un CUPS sin
  expediente `activo` y no caducado/revocado**. Añadir esa comprobación. Hoy no la hace.
- **Sondeo (confirmación):** el `datadis-sync` (nueva EF del puente, ver doc puente §3) llama al endpoint de
  "suministros autorizados" de la cuenta de Valere y promociona a `activo` los expedientes cuyo CUPS aparezca.
- **Caducidad:** cron diario marca `caducado` los expedientes con `caduca_at < now()` y avisa con antelación
  (p. ej. 30 días antes) para renovar — la autorización Datadis dura 24 meses.

---

## 5. Plan de construcción y criterio de "hecho"

| Paso | Entregable | Hecho cuando |
|---|---|---|
| EC-1 | Tabla `expediente_consentimiento_datadis` + RLS (o ampliar `consentimientos_datadis`) | Migración en rama, TSC 0, advisor OK |
| EC-2 | Plantilla del doc + generación del PDF con datos del cliente (Paso 1) | Se genera un PDF de autorización relleno desde una empresa real |
| EC-3 | UI expediente en ficha empresa: estados, botones, subida manual del firmado | Se ve el ciclo y se puede avanzar de estado |
| EC-4 | Correo nº1 al cliente (Resend) | El cliente recibe el documento a firmar |
| EC-5 | Correo nº2 a Datadis como **borrador revisable** + envío por humano | Tras subir el firmado, queda un borrador listo para enviar a Datadis |
| EC-6 | Guarda en `datadis-proxy` + sondeo de activación en `datadis-sync` | Un CUPS sin expediente activo no devuelve datos; uno autorizado pasa a `activo` solo |
| EC-7 | Caducidad + aviso de renovación (cron) | Expediente caduca a los 24m y avisa antes |

Reglas: rama `claude/datadis-consentimiento` + PR, TSC 0, tests, ESTADO.md. Sin push directo a main.

---

## 6. Tarea operativa para Juan (no es código)

- **Confirmar con soporte de Datadis:** (a) la **dirección de email** a la que se remite el documento firmado
  (correo nº2), (b) el **modelo oficial** de documento que aceptan, (c) el **plazo real** de alta. Se cablea como
  configuración del CRM (`global_config` o `holded_config`-style singleton). Hasta confirmarlo, el canal es un campo editable.
- **Confirmar la cuenta de empresa de Valere en datadis.es** (prerequisito del sondeo del Paso 7): el NIF de Valere
  debe ser el que los clientes autorizan. Sin esa cuenta, no hay nada que sondear.

---

## 7. Mi opinión honesta

Este flujo (vía email a soporte de Datadis) es **mejor para vuestro caso** que obligar al cliente a navegar datadis.es:
le pedís solo una firma, que es lo que un cliente sí hace. El coste es el plazo de 2-3 días y que **el correo nº2 es
semi-manual** (alguien de Valere revisa y envía a Datadis) — pero eso es correcto: va a un tercero y conviene control.

El diseño es barato porque reutiliza piezas que ya tenéis: `documentos` (polimórfica) para los PDFs, Resend para los
correos, `datadis-proxy` para consultar, y el puente a `facturas` ya diseñado. Lo único nuevo de verdad es la **máquina
de estados del expediente** y la **subida manual del firmado**.

Lo que de verdad lo desbloquea no es técnico: es **confirmar el canal de Datadis y tener la cuenta de empresa de Valere
operativa** (§6). En cuanto eso esté, un cliente real recorre los 7 estados y se demuestra el circuito entero.

---

*Fuentes externas (2026-06-14): [Datadis — Aelec](https://aelec.es/datadis/) · [Obtener datos de DATADIS — Spacewell/Dexma](https://support.dexma.com/hc/es/articles/4402996091666-Obtener-datos-de-DATADIS) · [Proceso de alta y autorización (REDcoop)](https://www.rascafria.org/wp-content/uploads/2025/09/1.2.-DATADIS_Proceso-de-Alta-ORGANIZACION-by-REDcoop.pdf) · modelos de autorización publicados (ITE, herencia.es PYMES). Verificación interna: Supabase `gtphkowfcuiqbvfkwjxb` — tabla `consentimientos_datadis` (columnas reales), `datadis-proxy` v13 activa, `documentos` 108 filas. Plazo exacto de alta: PENDIENTE confirmar con soporte Datadis.*
