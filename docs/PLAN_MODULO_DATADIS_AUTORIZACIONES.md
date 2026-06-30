# Plan — Módulo Datadis Autorizaciones (CRM Valere)

> **Fecha:** 2026-06-26 · **Autor:** Claude (Cowork) · **Estado:** plan aprobado, pendiente de implementar.
> **Contexto:** Valere acreditada como **Partner Datadis** (convenio firmado 2026-06-26, acceso verificado en plataforma).
> Ver `docs/SESIONES/2026-06-26-resumen.md`. Documento de autorización ya diseñado (PDF rellenable marca Valere,
> `Valere_Autorizacion_Datadis_v1_rellenable.pdf`). Este plan describe cómo automatizarlo en el CRM.
>
> **Decisiones tomadas (Juan, 2026-06-26):**
> - Firma: **email + PDF, firma fuera del CRM** en fase 1 (e-firma integrada queda para fase 2).
> - Envío a Datadis: **manual primero**, carga por lotes después (cuando se confirme el formato con el DPO).
> - Una autorización **por empresa titular (CIF)**; el mismo representante puede firmar varias. Datadis identifica por NIF (`authorizedNif`).
> - Defaults de premarcado al generar desde CRM: **"Autorizo TODOS los CUPS"** + **"Sí"**.

---

## 1. Objetivo

Automatizar el ciclo de vida completo de las autorizaciones de acceso a datos de consumo de Datadis: desde la
generación del documento autorrellenado con datos del CRM, hasta que la autorización está activa en Datadis y sus
datos se sincronizan y se usan en los módulos de análisis, propuestas y seguimiento FV.

---

## 2. Árbol de datos — de dónde sale cada campo del documento

| Campo del documento | Origen en el CRM | Estado |
|---|---|---|
| Empresa titular (razón social) | `empresas.nombre` | ✅ producción |
| CIF de la empresa titular | `empresas.nif` | ✅ producción |
| Dirección (referencia) | `empresas.direccion/cp/ciudad/provincia` | ✅ producción |
| Firmante (nombre y apellidos) | `contactos.nombre` + `contactos.apellidos` | ✅ producción |
| Calidad del firmante (titular / representante / apoderado) | `contactos.cargo` + nuevo campo (ver gap) | ⚠️ parcial |
| `es_firmante = true` | `contactos.es_firmante` | ✅ producción |
| **DNI del firmante** | — | ❌ **falta columna en `contactos`** |
| CUPS (anexo) | `cups.codigo_cups` filtrado por `empresa_id` | ✅ producción |
| Datos fijos de Valere (CIF, dirección, finalidad, email, texto oficial) | constante de configuración | fijo |
| PDF generado / firmado | `documentos` (polimórfico) + Storage bucket `documentos` | ✅ producción |
| Registro de la autorización y su ciclo de vida | **`datadis_autorizaciones`** | ❌ **tabla nueva a crear** |

**Conclusión:** la mayor parte de los datos ya existen en producción. Solo faltan dos piezas de datos:
1. **Columna DNI** en `contactos` (y opcionalmente un enum de "calidad" del firmante).
2. **Tabla `datadis_autorizaciones`** que registra cada autorización y su estado.

---

## 3. Flujo / ciclo de vida de una autorización

Estados propuestos (máquina de estados de `datadis_autorizaciones.estado`):

```
borrador → generada → enviada_cliente → firmada → enviada_datadis → activa
                                          │                            │
                                          └──────── rechazada          ├── revocada
                                                                       └── caducada (24m)
```

| Paso | Acción | Quién | Soporte CRM |
|---|---|---|---|
| 1 | Generar PDF autorrellenado desde la ficha de empresa | CRM | **nuevo** (adaptar generador existente) |
| 2 | Enviar el PDF al cliente para firma | CRM (email) | reutilizar Edge + Resend |
| 3 | El cliente firma y devuelve el PDF | Cliente (externo) | — |
| 4 | Subir el PDF firmado y archivarlo | Operador | reutilizar `documentos` + cambia estado |
| 5 | Enviar la autorización a Datadis (DPO o alta partner en plataforma) | Operador (manual fase 1) | registro de envío |
| 6 | Datadis propaga el acceso al CIF | Datadis (externo) | — |
| 7 | Marcar la autorización como activa (fecha, vigencia 24m, nº referencia) | Operador | cambia estado |
| 8 | Sincronizar datos: `get-supplies(authorizedNif)` → `cups` + `datadis_consumptions` | CRM | ✅ ya existe (`useDatadisSync`) |
| 9 | Usar los datos en análisis, propuestas, cruce factura/FV, incidencias | CRM | ✅ módulos existentes |

### Acciones transversales (no olvidar — antes no estaban reflejadas)

- **Revocación:** si el cliente revoca, comunicar a Datadis en **máx. 3 días**; estado → `revocada`.
- **Caducidad:** las autorizaciones caducan a los **24 meses**; aviso de renovación a los 22-24 meses; estado → `caducada`.
- **Auditorías Datadis (2/año):** mantener expediente de evidencias por autorización (PDF firmado + método de verificación de identidad + fechas). El módulo debe permitir exportar el expediente de un conjunto de CIF que Datadis seleccione.
- **Seguridad:** mover `authenticate()` de `src/core/services/datadis.ts` a una Edge Function (`datadis-proxy`/`datadis-auth`), las credenciales nunca en cliente.

---

## 4. Qué existe ya (no reinventar)

| Pieza | Ubicación | Estado |
|---|---|---|
| Tablas `datadis_tokens`, `datadis_consumptions`, `datadis_supply_price_terms` | `supabase/migrations/20260422_…`, `20260514_…` | ✅ aplicadas |
| Cliente HTTP Datadis (`authenticate`, `getSupplies`, `getContractDetail`, `getConsumptionData`) | `src/core/services/datadis.ts` | ✅ (auth en cliente ⚠️) |
| Hooks de sync (`useDatadisSync`, `useDatadisToken`, …) | `src/core/hooks/useDatadis.ts` | ✅ |
| Feature Datadis (visor 6 tabs, asociar CUPS a empresa) | `src/features/datadis/` | ✅ producción |
| Tabla `documentos` polimórfica + Storage bucket + signed URLs | `src/features/documentos/`, migr. `20260424_…` | ✅ producción |
| Edge Functions con Resend (`notify-admin-pending-user`, `notify-user-approval-decision`, `enviar-recordatorio`) | `supabase/functions/` | ✅ deployadas |
| `empresas`, `contactos` (`es_firmante`, `cargo`), `cups` (`codigo_cups`, `empresa_id`, campos `datadis_*`) | `src/features/*`, `src/core/types/entities.ts` | ✅ producción |

---

## 5. Qué falta (gaps a desarrollar)

### 5.1 Datos
- **`contactos.dni`** (TEXT, nullable) — nuevo campo. Opcional: `contactos.calidad_firmante` (enum: titular / representante_legal / apoderado).
- **Tabla `datadis_autorizaciones`** (nueva). Esquema propuesto:

```sql
CREATE TABLE public.datadis_autorizaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id),
  contacto_firmante_id  UUID REFERENCES contactos(id),
  alcance_cups          TEXT NOT NULL DEFAULT 'todos',   -- 'todos' | 'lista'
  cups_ids              UUID[] DEFAULT '{}',             -- si alcance = 'lista'
  estado                TEXT NOT NULL DEFAULT 'borrador',-- ver máquina de estados §3
  documento_id          UUID REFERENCES documentos(id),  -- PDF firmado archivado
  finalidad             TEXT,                            -- texto de finalidad usado
  fecha_generacion      TIMESTAMPTZ,
  fecha_envio_cliente   TIMESTAMPTZ,
  fecha_firma           DATE,
  fecha_envio_datadis   TIMESTAMPTZ,
  fecha_activacion      DATE,
  fecha_vencimiento     DATE,                            -- firma + 24 meses
  fecha_revocacion      DATE,
  metodo_verificacion   TEXT,                            -- 'cif_cups' | 'dni_cups' | 'firma_electronica'
  referencia_datadis    TEXT,                            -- nº autorización en Datadis (ej. A28429348)
  notas                 TEXT,
  creado_por            UUID REFERENCES user_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS: igual patrón que el resto (admin o comercial asignado a la empresa).
-- Índices: (empresa_id), (estado), (fecha_vencimiento) para avisos de caducidad.
```

### 5.2 Backend / Edge Functions
- **`datadis-generar-autorizacion`** (o generar en cliente con pdf-lib): produce el PDF autorrellenado con datos de empresa + contacto + cups, premarcando "todos los CUPS" + "Sí".
- **`datadis-enviar-autorizacion`**: email al cliente con el PDF adjunto (reutiliza patrón Resend). Cambia estado a `enviada_cliente`.
- **`datadis-proxy` / `datadis-auth`** (seguridad): mover `authenticate()` fuera del cliente.

### 5.3 Frontend
- Pestaña / sección **"Autorizaciones Datadis"** (en el módulo Datadis o en la ficha de empresa) con:
  - Botón "Generar autorización" (autorrellena desde la empresa).
  - Lista de autorizaciones con su estado (chips de color por estado).
  - Acciones por estado: enviar a cliente, subir firmado, marcar enviada a Datadis, marcar activa, revocar.
  - Vista de caducidades próximas (22-24 meses) y panel de expediente para auditorías.

### 5.4 Operativa
- Protocolo de auditorías (2/año) + organización del expediente (ya descrito en el email de onboarding a Julia).
- Cron de aviso de caducidad (reutilizar patrón pg_cron existente, p.ej. `cleanup_pending_users_daily`).

---

## 6. Fases de implementación propuestas

**FASE 1 — Generación + registro (núcleo).**
- ✅ **Migración aplicada en producción (2026-06-27)**: `contactos.dni` + tabla `datadis_autorizaciones` (RLS patrón `datadis_tokens`, trigger `set_updated_at`, 4 índices, CHECK de estados/alcance/calidad/método). Fichero: `supabase/migrations/20260627_datadis_autorizaciones.sql`. Aplicada vía conector MCP (plan gratuito, sin branch; `supabase db push` falló por desajuste de historial de migraciones — pendiente reparar historial aparte).
- ✅ **Edge Function `datadis-generar-autorizacion` desplegada (2026-06-30)**: genera el PDF autorrellenado desde la ficha de empresa (premarcado todos los CUPS + Sí; mapea cargo→calidad firmante; anexo con CUPS del CRM), con **validación bloqueante de datos críticos** (razón social, CIF, firmante+DNI, ≥1 CUPS → devuelve `faltan[]`).
- ✅ **Guarda el PDF en `documentos` (Storage bucket documentos) y crea el registro en `datadis_autorizaciones` (estado `generada`)**.
- ✅ **UI en ficha de empresa (2026-06-30)**: tab "Datadis" con botón "Generar autorización" + panel "Faltan datos" (enlaces a completar) + lista con estados (StatusBadge) + descarga PDF. Archivos: `src/features/datadis/autorizaciones.api.ts`, `src/features/datadis/components/DatadisAutorizacionesTab.tsx`. Rama `claude/datadis-autorizaciones`.
- ⏳ Pendiente: correr tests en terminal + commit frontend + PR.

**FASE 2 — Envío + archivo + ciclo de estados.**
- Edge Function de envío por email al cliente (Resend) → estado `enviada_cliente`.
- Subida del PDF firmado → estado `firmada`, archivo en `documentos`, `metodo_verificacion`.
- Transiciones manuales: `enviada_datadis`, `activa` (con `referencia_datadis`, `fecha_activacion`, `fecha_vencimiento`).
- Chips de estado y acciones contextuales en la UI.

**FASE 3 — Sincronización conectada a autorizaciones activas.**
- Al marcar `activa`, habilitar `useDatadisSync(authorizedNif = empresa.nif)` para esa empresa.
- Mover `authenticate()` a Edge Function (seguridad) — desbloquea `datadis-proxy`.
- Verificar que los datos pueblan `cups` + `datadis_consumptions` y se usan en análisis/propuestas/FV.

**FASE 4 — Operativa avanzada.**
- Cron de caducidad (avisos 22-24 meses) + flujo de revocación (aviso a Datadis en 3 días).
- Expediente de auditoría exportable por conjunto de CIF.
- (Opcional fase futura) Carga agregada por lotes a Datadis (CSV NIF+CUPS), tras confirmar formato con el DPO.
- (Opcional fase futura) Firma electrónica integrada (Signaturit/DocuSign).

---

## 7. Pendientes / decisiones abiertas

- [ ] Confirmar con `dpo@datadis.es` el **formato exacto de carga por lotes** (CSV/Excel NIF+CUPS) y si admiten multi-titular por representante (de momento: una por CIF).
- [ ] Decidir si la generación del PDF se hace **en cliente** (pdf-lib, ya probado) o en **Edge Function** (mejor para plantilla central y auditoría). Recomendado: Edge Function en fase 2-3.
- [ ] Definir `metodo_verificacion` por defecto para clientes empresa (`cif_cups`).
- [ ] Conectar `docs/help/datadis/` (RAG del CRM) con la documentación de uso del nuevo módulo al cerrar cada fase.

---

## 8. Referencias

- Documento diseñado: `Valere_Autorizacion_Datadis_v1_rellenable.pdf` (en carpeta del usuario).
- Modelo oficial Datadis: `20240724 modelo de autorización para DATADIS.docx` (verificado: el documento del CRM respeta el texto literal).
- Estado Partner: `docs/SESIONES/2026-06-26-resumen.md`, `docs/ESTADO.md`.
- Docs Datadis previos: `docs/DATADIS_BLUEPRINT_MODULO_CRM_VALERE.md`, `docs/DATADIS_ALTA_Y_AUTORIZACIONES_2026-06-18.md`, `docs/DATADIS_VERIFICACION_PLATAFORMA_2026-06-18.md`, `docs/PLAN_INTEGRACION_DATADIS.md`.
- Código existente: `src/features/datadis/`, `src/core/services/datadis.ts`, `src/core/hooks/useDatadis.ts`, `src/features/documentos/`.
