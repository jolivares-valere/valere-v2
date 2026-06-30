# Diseño · Puente Datadis → facturas → análisis

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork, sesión de diseño — solo `.md`, sin tocar código)
> **Alcance:** diseño listo-para-construir del flujo de negocio Datadis. NO sustituye al técnico de protocolo,
> que ya existe: `PLAN_INTEGRACION_DATADIS.md` (28/04, arquitectura proxy) y `DATADIS_BLUEPRINT_MODULO_CRM_VALERE.md`
> (13/05, normalizadores con payloads reales). **Este documento cierra lo que a ambos les falta: el puente al negocio.**
> **No ejecuta nada en Supabase.** Los `CREATE TABLE`/`ALTER` son propuestas; los aplica el agente técnico tras tu OK.

---

## 0. Por qué este documento

El análisis estratégico (10/06) y la auditoría funcional (10/06) coinciden en el diagnóstico:
**la técnica de Datadis funciona, pero el dato no llega al sitio donde genera dinero.**

Estado vivo verificado hoy (Supabase `gtphkowfcuiqbvfkwjxb`, lectura directa):

| Tabla | Filas | Lectura |
|---|---|---|
| `datadis_proxy_cache` | **44** | El proxy funciona y cachea respuestas reales |
| `datadis_provincias` | 52 | Catálogo cargado |
| `datadis_supply_price_terms` | 5 | Términos de precio capturados |
| `datadis_consumptions` | **0** | **No se persiste la curva de consumo** |
| `datadis_consumos_cache` | 0 | Sin uso |
| `consentimientos_datadis` | **0** | **El flujo de consentimiento nunca se ha ejercitado** |
| `datadis_tokens` | 0 | Sin uso (token vive en proxy/Vault) |
| `facturas` | **0** | **Destino final vacío — con 73 CUPS y 53 empresas dadas de alta** |

El patrón es inequívoco: hay cañería (proxy + caché + normalizadores) pero **los dos extremos están desconectados**:
no entra el *consentimiento* (principio) y no sale a *facturas* (final). Este diseño construye esos dos extremos
y el tramo intermedio (sync programado).

```
[1] CONSENTIMIENTO        [2] SYNC PROGRAMADO            [3] PUENTE A NEGOCIO
EmpresaDetail                pg_cron diario                 datadis_consumptions
 → solicitar acceso     →    datadis-sync (EF)         →    → agregación mensual
 → consentimientos_*         → getConsumption/getMaxPower    → facturas(origen='datadis')
                             → datadis_consumptions          → /analisis funciona sin teclear
```

---

## 1. Modelo de datos — qué hay y qué falta

### 1.1 Reutilizar (ya existen)
- `consentimientos_datadis` — existe vacía. **Verificar/ampliar columnas** (§1.3).
- `datadis_consumptions` — existe vacía. Es el destino de la curva horaria.
- `datadis_proxy_cache` — caché del proxy. Se mantiene como está (TTL del proxy).
- `cups` (73 filas) — clave de cruce. El CUPS es la unión Datadis ↔ CRM.
- `facturas` — destino final. Ya tiene `consumption_p1..p6` y `surplus_p1..p6` (FASE 20.0.1).

### 1.2 Columna nueva propuesta en `facturas` — trazabilidad de origen
La auditoría pide distinguir de dónde viene cada consumo (manual / SIPS / Datadis / telemedida).
Es el campo que permite que `/analisis` sepa qué fiabilidad tiene el dato y que el dashboard mida cobertura.

```sql
-- PROPUESTA (no ejecutar aquí). Idempotente.
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'manual'
    CHECK (origen IN ('manual','sips','datadis','telemedida')),
  ADD COLUMN IF NOT EXISTS origen_ref text,          -- id de sync / nombre de fichero SIPS
  ADD COLUMN IF NOT EXISTS es_estimada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS periodo_dias int;          -- días reales facturados (clave anti-bug C2)
```

> **`periodo_dias` es crítico.** El bug C2 de la auditoría (ahorros "-32,8%" en verde) nace de comparar
> 1-2 meses contra coste anual. Si cada fila de `facturas` lleva sus días reales, `/analisis` puede anualizar
> bien. Datadis da el rango exacto, así que aquí se rellena solo. (El cálculo es del módulo análisis, no de este puente.)

### 1.3 Ampliación propuesta de `consentimientos_datadis`
Debe modelar el ciclo de vida de la autorización de terceros en datadis.es.

```sql
-- PROPUESTA. Ajustar a las columnas que ya tenga la tabla (verificar antes con \d).
ALTER TABLE public.consentimientos_datadis
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cups_id uuid REFERENCES public.cups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS nif_titular text NOT NULL,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'solicitado'
    CHECK (estado IN ('solicitado','activo','caducado','revocado','error')),
  ADD COLUMN IF NOT EXISTS fecha_solicitud timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fecha_activacion timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_caducidad timestamptz,        -- Datadis caduca autorizaciones (~1 año)
  ADD COLUMN IF NOT EXISTS ultimo_sync timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_error text;
```

> **RGPD (prioridad ALTA del proyecto):** el consentimiento es la base jurídica para tratar la curva de un CUPS de
> persona física. Esta tabla ES el registro de consentimiento. Nunca sincronizar un CUPS sin fila `estado='activo'`.
> El `datadis-sync` debe filtrar por ese estado de forma defensiva (no confiar solo en la UI).

### 1.4 Vista nueva de cobertura (alimenta dashboard y bloqueos de análisis)
```sql
-- PROPUESTA
CREATE OR REPLACE VIEW public.v_cobertura_consumos
WITH (security_invoker = true) AS   -- respeta RLS del consultante (lección advisor: no SECURITY DEFINER)
SELECT
  c.id              AS cups_id,
  c.cups,
  c.empresa_id,
  count(f.*) FILTER (WHERE f.fecha >= now() - interval '12 months') AS meses_12m,
  max(f.fecha)      AS ultimo_mes,
  bool_or(f.origen = 'datadis') AS tiene_datadis,
  bool_or(f.origen = 'sips')     AS tiene_sips
FROM public.cups c
LEFT JOIN public.facturas f ON f.cups_id = c.id
GROUP BY c.id, c.cups, c.empresa_id;
```
Widget de dashboard: "X CUPS sin datos de consumo (de 73)" → enlace accionable a cada ficha.

---

## 2. Flujo [1] — Consentimiento (autorización de terceros)

**Quién:** comercial/analista desde la ficha de empresa. **Dónde:** `EmpresaDetailPage`, pestaña CUPS/suministros.

```
Botón "Solicitar acceso Datadis" (por CUPS o por empresa)
  → inserta consentimientos_datadis(empresa_id, cups_id, nif_titular, estado='solicitado')
  → invoca EF notify-datadis-consent (nueva, patrón de las notify-* de auth):
       email Resend al titular con instrucciones EXACTAS para autorizar el NIF de Valere
       en datadis.es (Mi perfil → Autorizaciones → autorizar a un tercero)
  → estado queda 'solicitado'; el comercial ve un badge ámbar "Pendiente de autorización del cliente"
```

**Activación (no es instantánea):** cuando el cliente autoriza en datadis.es, la autorización aparece en la cuenta
de empresa de Valere. El `datadis-sync` nocturno detecta el CUPS autorizado (lista de suministros autorizados que
ya devuelve la API privada) y promociona el consentimiento a `estado='activo'`, fijando `fecha_caducidad`.

> **Decisión que necesito de ti (D1):** ¿Valere ya tiene **cuenta de empresa en datadis.es** capaz de recibir
> autorizaciones de terceros? La auditoría dice que `/datadis` opera con cuenta propia, pero el flujo por CUPS
> en `/datos` pedía credenciales del titular (mal). Confirmar que existe la cuenta de empresa con el NIF de Valere;
> es el prerequisito de todo este flujo.

---

## 3. Flujo [2] — Sincronización programada (`datadis-sync`)

**Nueva Edge Function** `datadis-sync` que reutiliza la lógica del `datadis-proxy` existente (no duplica el login).

**Disparo:** `pg_cron` diario (p. ej. `0 4 * * *`, tras el pico de carga; los datos de Datadis tienen retardo de
días, así que la hora exacta no es crítica). Idempotente: re-ejecutar no duplica filas (upsert por clave natural).

```
Pseudocódigo datadis-sync:
─────────────────────────
1. token = getToken(credenciales master Valere desde Vault)      // ya implementado en proxy
2. autorizados = getAuthorizedSupplies(token)                     // suministros que clientes han autorizado
3. promociona consentimientos: para cada CUPS en autorizados con estado='solicitado'
      → UPDATE estado='activo', fecha_activacion=now(), fecha_caducidad=now()+interval '1 year'
4. para cada consentimiento estado='activo' y no caducado:
      a. consumo = getConsumptionData(cups, distribuidora, desde=ultimo_sync||-12m, hasta=hoy)
      b. potencias = getMaxPower(cups, distribuidora, ...)
      c. UPSERT datadis_consumptions  (clave: cups_id + timestamp_horario)   // curva horaria cruda
      d. UPDATE consentimiento.ultimo_sync = now()
   Manejo de error parcial (Datadis devuelve CodError 902 / fallo por distribuidora):
      → no abortar el lote; registrar consentimiento.ultimo_error y estado='error', seguir con el siguiente
5. dispara la agregación mensual (Flujo [3]) para los CUPS tocados
```

> **Reutilizar lo capturado:** el blueprint (13/05) ya tiene normalizador 30TD validado contra payload real
> (`get_consumption_EDISTRIBUCION_2026-05-13.json`). El sync usa ESE normalizador. Antes de añadir otra
> distribuidora, capturar su payload (regla de oro del blueprint: nada se normaliza sin payload real).

---

## 4. Flujo [3] — Puente a `facturas` (el tramo que cierra el negocio)

Es **el puente que falta**. Convierte curva horaria → fila mensual por periodo, que es lo que `/analisis` consume.

```
Agregación (en datadis-sync o función SQL agregar_consumo_mensual(cups_id, mes)):
──────────────────────────────────────────────────────────────────────────────
Entrada:  datadis_consumptions del CUPS para el mes M (curva horaria, cada hora con su kWh)
Mapeo:    cada hora → periodo P1..P6 según calendario tarifario 30TD/61TD
          (reutilizar periodos30TD.ts — ya existe y está testeado)
Salida:   UPSERT facturas (clave natural: cups_id + año + mes), con:
            consumption_p1..p6  = suma de kWh por periodo en el mes
            surplus_p1..p6      = suma de excedentes por periodo (si CUPS con FV)
            periodo_dias        = días reales del mes con dato
            origen              = 'datadis'
            origen_ref          = '<sync_id>'
            es_estimada         = (días con dato < días del mes)   // marca meses incompletos
```

**Regla de precedencia de origen** (qué hacer si ya hay una factura manual del mismo mes):
- `manual` y `telemedida` **nunca** se sobrescriben por `datadis` (el dato tecleado o de contador manda).
- `datadis` sobrescribe `sips` (Datadis es dato real medido; SIPS es referencia anual).
- Implementar como condición en el UPSERT (`ON CONFLICT ... WHERE facturas.origen NOT IN ('manual','telemedida')`).

> **Resultado de negocio:** tras este puente, un analista abre `/analisis` de un cliente con consentimiento activo
> y **los 12 meses de consumo por periodo ya están**, sin teclear. Eso es exactamente la "rapidez" del objetivo de Juan.

---

## 5. Seguridad y RLS (RGPD)

- `consentimientos_datadis`, `datadis_consumptions`, `facturas`: RLS por `empresa_id`/scope de comercial
  (alinear con la 1ª tanda de RLS del sprint: `user_profiles`, `empresas`, `contactos`, `cups`).
- La curva horaria es dato personal si el titular es persona física → **solo accesible a roles con scope sobre esa empresa**.
- `datadis-sync` corre como `service_role` (escribe saltándose RLS, correcto para un job). Las **lecturas** del frontend
  van por RLS.
- Las credenciales master de Valere para Datadis **siguen en Vault** (nunca en tabla, nunca en cliente). Ya es así.
- Vista `v_cobertura_consumos` con `security_invoker=true` (no filtra dato de empresas fuera de scope).

---

## 6. Plan de construcción (para el agente técnico) y criterio de "hecho"

| Paso | Entregable | Hecho cuando |
|---|---|---|
| DS-1 | Migración: columnas `origen/periodo_dias/...` en `facturas` + ampliar `consentimientos_datadis` + vista cobertura | `tsc` 0, migración aplicada en rama, advisor sin nuevos WARN |
| DS-2 | UI consentimiento en ficha empresa (botón + estados + badge) + EF `notify-datadis-consent` | Se solicita acceso y llega el email al titular |
| DS-3 | EF `datadis-sync` + `pg_cron` + promoción de consentimientos | Un CUPS autorizado pasa a `activo` y su curva entra en `datadis_consumptions` |
| DS-4 | Función de agregación mensual → `facturas(origen='datadis')` con precedencia | `/analisis` de un cliente real muestra 12 meses sin teclear |
| DS-5 | Widget cobertura en dashboard | "X CUPS sin consumo" visible y accionable |

Cada paso: TSC 0, tests verdes, sin push directo a main (rama `claude/datadis-puente` + PR), ESTADO.md actualizado.

---

## 7. Mi opinión honesta

Datadis es **la integración con mejor coste/beneficio de todo el roadmap**, por encima de telemedida y FV, porque:
1. La parte difícil (proxy, login, caché, normalizador 30TD) **ya está hecha y verificada**.
2. Da la misma curva horaria que un contador de telemedida, **sin hardware ni protocolo IEC-102**, para el ~90% de clientes.
3. Cierra el extremo de *entrada* del circuito de propuesta, que es el cuello de botella nº1 junto al PDF.

Lo único que lo bloquea es operativo, no técnico: **el flujo de consentimiento nunca se ha ejercitado** (0 filas).
En cuanto un cliente real autorice el NIF de Valere y el sync vuelque a `facturas`, se demuestra el circuito entero.

**Lo pondría justo después del módulo de propuestas (Fase 2)**: primero que el CRM produzca el documento que vende
(con datos pegados a mano si hace falta), luego que esos datos entren solos por Datadis. Es el orden del maestro.

### Datos que me faltan
- **D1 (bloqueante):** ¿existe ya la cuenta de empresa de Valere en datadis.es para autorizaciones de terceros?
- **D2:** ¿qué retención de curva horaria queréis guardar? (Datadis da hasta ~2 años; a más histórico, más coste de almacenamiento.)
- **D3:** ¿la caducidad real de las autorizaciones de terceros en datadis.es es 1 año? Confirmar para fijar `fecha_caducidad` y el aviso de renovación.

---

*Fuentes externas: [Datadis](https://datadis.es/) · proyecto interno verificado en vivo (Supabase `gtphkowfcuiqbvfkwjxb`, 2026-06-14). Documentos base: `PLAN_INTEGRACION_DATADIS.md`, `DATADIS_BLUEPRINT_MODULO_CRM_VALERE.md`, `ANALISIS_ESTRATEGICO_2026-06-10.md` §4.1.*
