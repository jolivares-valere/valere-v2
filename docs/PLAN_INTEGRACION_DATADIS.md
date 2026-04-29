# Plan de Integración Datadis

> **Estado**: borrador inicial — 2026-04-28  
> **Autor**: Driver Cowork  
> **Sustituye**: C-04 del `docs/AUDIT_SEGURIDAD_2026-04-27.md` (passwords Datadis en cliente → eliminado por diseño)  
> **Pre-requisito paralelo**: trámite alta empresa en Datadis (Juan, ver sección 7)

---

## 1. Contexto y objetivo

Datadis es la plataforma española de acceso neutral a datos de consumo eléctrico, operada por las distribuidoras. Permite a terceros autorizados (consultoras energéticas como Valere) acceder a curvas horarias de consumo, potencias máximas y datos de cambio de comercializadora de sus clientes, siempre con consentimiento explícito del titular del CUPS.

**Objetivo**: integrar Datadis en el CRM Valere como servicio de backend (proxy seguro), eliminando cualquier almacenamiento de credenciales de clientes y resolviendo el hallazgo C-04 del audit de seguridad.

---

## 2. Arquitectura

```
CRM Frontend (React)
      │
      │ llamada autenticada
      ▼
Edge Function: datadis-proxy
      │
      │ credenciales master Valere (Vault)
      ▼
Datadis API (api-private)
      │
      │ respuesta JSON
      ▼
Postgres: datadis_consumos_cache  ←──── TTL 24h
      │
      │ datos frescos o cacheados
      ▼
CRM Frontend (gráfico consumo / análisis)
```

**Principios de diseño**:
- **Credenciales master, no por cliente**: Valere tiene 1 cuenta en Datadis. Los clientes autorizan el NIF de Valere, no comparten su contraseña. Nunca se almacenan passwords de clientes.
- **Cache 24h**: los datos de Datadis tienen latencia D-1/D-2. Cachear en Postgres evita rate limits y acelera la UI.
- **Consentimiento RGPD first**: ninguna consulta a Datadis se ejecuta sin registro de consentimiento firmado (CUPS + timestamp + IP + texto legal).
- **Edge Function desacoplada**: cambios en la API de Datadis solo afectan a la Edge Function, no al frontend ni al schema.

---

## 3. Endpoints Datadis a integrar

Base URL API privada: `https://datadis.es/api-private/api/`  
Autenticación: `POST /nikola-auth/tokens/login` → Bearer token (sesión ~1h)

| Endpoint | Método | Descripción | Parámetros clave |
|---|---|---|---|
| `get-supplies` | GET | Lista de suministros del NIF autorizado | `authorizedNif` |
| `get-consumption-data` | GET | Curva horaria consumo activo (Wh) | `cups`, `distributorCode`, `startDate`, `endDate`, `measurementType`, `pointType` |
| `get-max-power` | GET | Potencias máximas registradas | `cups`, `distributorCode`, `startDate`, `endDate` |
| `get-data-contract-detail` | GET | Datos cambio de comercializadora | `cups`, `distributorCode` |

Notas de la API:
- Datos disponibles: hasta 2 años histórico.
- Granularidad: horaria (activa). No reactiva.
- Latencia: D-1 o D-2 según distribuidora.
- Sin SLA oficial. Rate limits no documentados → implementar backoff exponencial.

---

## 4. Schema SQL

### 4.1 Tabla `consentimientos_datadis`

```sql
CREATE TABLE public.consentimientos_datadis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cups             TEXT NOT NULL,                         -- CUPS del suministro
  cliente_id       UUID REFERENCES empresas(id),          -- empresa en CRM (nullable si CUPS no vinculado aún)
  firmado_por_email TEXT NOT NULL,                        -- email del titular que firmó
  firmado_por_nombre TEXT,
  fecha_firma      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_firma         INET NOT NULL,                         -- IP del cliente en el momento de firma
  texto_legal      TEXT NOT NULL,                         -- texto íntegro del consentimiento firmado (inmutable)
  hash_texto       TEXT NOT NULL,                         -- SHA-256 del texto_legal (verificación)
  fecha_inicio_autorizacion TIMESTAMPTZ NOT NULL,
  fecha_fin_autorizacion    TIMESTAMPTZ NOT NULL,         -- máx 2 años desde firma (límite Datadis)
  revocado_at      TIMESTAMPTZ,                           -- NULL = vigente
  revocado_motivo  TEXT,
  created_by       UUID REFERENCES user_profiles(id),     -- comercial que solicitó el consentimiento
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.consentimientos_datadis ENABLE ROW LEVEL SECURITY;
-- SELECT: master/manager/consultant (solo su cartera)
-- INSERT: via Edge Function con SECURITY DEFINER (no directo desde cliente)
-- UPDATE: solo master (revocar)
-- DELETE: prohibido (inmutabilidad RGPD)

-- Índices
CREATE INDEX ON consentimientos_datadis (cups);
CREATE INDEX ON consentimientos_datadis (cliente_id);
CREATE INDEX ON consentimientos_datadis (fecha_fin_autorizacion) WHERE revocado_at IS NULL;
```

### 4.2 Tabla `datadis_consumos_cache`

```sql
CREATE TABLE public.datadis_consumos_cache (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cups             TEXT NOT NULL,
  periodo_inicio   DATE NOT NULL,
  periodo_fin      DATE NOT NULL,
  endpoint         TEXT NOT NULL,    -- 'consumos' | 'potencias_maximas' | 'cambio_comercializadora'
  payload          JSONB NOT NULL,   -- respuesta íntegra de Datadis
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  distributor_code TEXT,
  UNIQUE (cups, periodo_inicio, periodo_fin, endpoint)
);

-- RLS: solo lectura authenticated, solo Edge Function puede insertar/actualizar (SECURITY DEFINER)
ALTER TABLE public.datadis_consumos_cache ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX ON datadis_consumos_cache (cups, periodo_inicio, periodo_fin);
CREATE INDEX ON datadis_consumos_cache (ttl_expires_at);  -- para cleanup automático
```

### 4.3 Columna auxiliar en `cups` (CRM)

```sql
ALTER TABLE public.cups ADD COLUMN IF NOT EXISTS datadis_autorizado      BOOLEAN DEFAULT false;
ALTER TABLE public.cups ADD COLUMN IF NOT EXISTS datadis_autorizacion_id  UUID REFERENCES consentimientos_datadis(id);
ALTER TABLE public.cups ADD COLUMN IF NOT EXISTS datadis_ultimo_fetch     TIMESTAMPTZ;
```

---

## 5. Flujo UX — Solicitar y usar consentimiento

```
1. Comercial en CRM → vista detalle de CUPS
   └─ Badge "Datadis: sin consentimiento" (naranja)
   └─ Botón "Solicitar autorización al cliente"

2. CRM genera magic link de consentimiento (token firmado, 7 días TTL)
   └─ Email al contacto principal de la empresa con el link

3. Cliente hace clic → página pública /datadis/consent?token=<jwt>
   └─ Muestra: nombre empresa, CUPS, texto legal RGPD completo
   └─ Botón "Autorizar acceso a Valere Consultores"
   └─ Al confirmar: POST a Edge Function `datadis-consent` → INSERT en consentimientos_datadis

4. CRM actualiza badge → "Datadis: autorizado hasta [fecha]"
   └─ Botón "Obtener datos" disponible

5. Comercial pulsa "Obtener datos"
   └─ Edge Function datadis-proxy:
       a. Verifica consentimiento vigente en DB
       b. Comprueba cache (si < 24h → devuelve cache)
       c. Si cache expirado → llama Datadis API con credenciales master Vault
       d. Guarda resultado en datadis_consumos_cache
       e. Devuelve datos al frontend

6. Frontend renderiza gráfico de consumo horario (recharts)
```

**Alerta renovación**: cron job 30 días antes de `fecha_fin_autorizacion` envía email al comercial para que solicite renovación al cliente.

---

## 6. Cancelación de C-04 (audit seguridad)

El hallazgo C-04 del audit `docs/AUDIT_SEGURIDAD_2026-04-27.md` indicaba: "passwords de clientes Datadis almacenados en texto plano". Este plan elimina el problema por diseño:

- **No se almacenan passwords de clientes**. Los clientes autorizan el NIF de Valere en la plataforma Datadis directamente. Valere usa sus propias credenciales master.
- **Credenciales master de Valere** en Supabase Vault (`datadis_master_user`, `datadis_master_password`). Solo la Edge Function `datadis-proxy` las lee.
- **C-04 queda cancelado** al implementar Fase 1+2.

En `docs/BACKLOG_CRM.md` la entrada `[seguridad C-04]` ya está marcada como `❌ Cancelar este`.

---

## 7. Plan de fases

| Fase | Contenido | Estimación | Dependencia |
|---|---|---|---|
| **Fase D-1** | Schema SQL (tablas + RLS + cols en cups) + migration | 4h | — |
| **Fase D-2** | Edge Function `datadis-proxy` skeleton + auth Datadis + endpoint get-supplies | 1 día | D-1 + credenciales Vault |
| **Fase D-3** | Consentimiento RGPD: tabla + token + email + página pública `/datadis/consent` | 2 días | D-1 |
| **Fase D-4** | getConsumptionData + cache 24h + UI básica (lista consumos) | 2 días | D-2 + D-3 |
| **Fase D-5** | Gráfico consumo horario (recharts) en vista CUPS + badge estado Datadis | 1 día | D-4 |
| **Fase D-6** | getPotenciasMaximas + getDatosCambioComercializadora + exportación CSV | 2 días | D-4 |
| **Fase D-7** | Alerta renovación consentimiento (cron 30d antes caducidad) | 4h | D-3 |
| **Fase D-8** | QA integral + TSC 0 + tests + smoke prod | 1 día | todas |

**Estimación total desarrollo**: ~10-12 días persona  
**Pre-requisito admin (paralelo)**: alta empresa Valere en Datadis (ver sección 8) — no bloquea Fases D-1 a D-3

---

## 8. Trámite administrativo para Juan

### Qué necesita Valere para usar la API de Datadis

El modelo de Datadis para consultoras energéticas (no comercializadoras con contrato de suministro) es el de **"NIF autorizado por el cliente"**. No hay habilitación administrativa ante CNMC ni REE requerida para el caso de uso de Valere (análisis y consultoría de consumo).

**Pasos concretos**:

1. **Registrar Valere en Datadis** (1-2 días)  
   - Ir a https://datadis.es/registry  
   - Formulario con: NIF de Valere, nombre empresa, email corporativo, contraseña  
   - Confirmar email  
   - → Resultado: usuario + contraseña de empresa. **Meter en Vault inmediatamente**.

2. **Configurar Vault** (15 min, Juan + Cowork)  
   - `DATADIS_MASTER_USER` = NIF de Valere (o email registrado)  
   - `DATADIS_MASTER_PASS` = contraseña creada  
   - Nunca en el repo ni en el chat.

3. **Proceso con cada cliente** (workflow de consentimiento — lo automatiza el CRM en Fase D-3)  
   - El cliente debe tener cuenta en Datadis (o crearla) y autorizar el NIF de Valere  
   - Autorización válida hasta 2 años  
   - Datadis envía recordatorio antes de expirar  

**No se requiere**:
- Registro como comercializadora ante CNMC  
- Habilitación RITE para auditorías (es para auditorías energéticas de edificios, no para consultar consumos)  
- Certificado digital en esta fase (registro básico acepta usuario/contraseña)

**Tiempo estimado**: 1-2 días hábiles para el alta. No bloquea el desarrollo (Fases D-1 a D-3 son independientes de tener las credenciales).

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| API Datadis sin SLA, puede caer | Media | Alto | Cache 24h. Edge Function con retry exponencial. UI muestra "datos de hace Xh" |
| Rate limits no documentados | Alta | Medio | Cola tipo `holded_sync_queue`. Max 1 req/s. Backoff 1/2/4/8s |
| Datadis cambia API sin aviso | Baja | Alto | Edge Function desacoplada. Tests de contrato en CI |
| Cliente no tiene cuenta Datadis | Alta | Medio | Flow de ayuda inline: instrucciones para crear cuenta + autorizar NIF |
| Consentimiento caduca sin renovar | Media | Medio | Alerta cron 30 días antes. Badge "expira pronto" en UI |
| Datos D-2: no hay datos del día actual | Certeza | Bajo | Comunicar en UI ("datos disponibles hasta ayer") |
| Trámite admin tarda >4 sem | Baja | Bajo (dev no bloqueado) | Fases D-1 a D-3 son independientes; D-2 se puede testear con cuenta personal de test |

---

## 10. Secrets necesarios (nunca en repo)

| Secret | Vault key | Quién crea | Cuándo |
|---|---|---|---|
| Usuario Datadis de Valere | `datadis_master_user` | Juan, tras registro en datadis.es | Antes de Fase D-2 |
| Password Datadis de Valere | `datadis_master_pass` | Juan, tras registro en datadis.es | Antes de Fase D-2 |

Comando SQL para insertar en Vault (Juan ejecuta desde Supabase Dashboard > SQL Editor):
```sql
-- NO ejecutar desde este chat. Juan lo hace desde el Dashboard.
SELECT vault.create_secret('TU_USUARIO_DATADIS', 'datadis_master_user', 'Usuario master Valere en Datadis');
SELECT vault.create_secret('TU_PASSWORD_DATADIS', 'datadis_master_pass', 'Password master Valere en Datadis');
```

---

## 11. Referencias

- [Datadis — portal principal](https://datadis.es)
- [Datadis — registro](https://datadis.es/registry)
- [Manual API privada y agregada (ICAEN)](https://icaen.gencat.cat/web/.content/20_Energia/210_auditoriesenergetiques/enllacos/MANUAL-API-PRIVADA-Y-AGREGADA.pdf)
- `docs/AUDIT_SEGURIDAD_2026-04-27.md` — hallazgo C-04 (cancelado por este plan)
- `docs/BACKLOG_CRM.md` — Sprint C, entrada Datadis-as-a-Service
