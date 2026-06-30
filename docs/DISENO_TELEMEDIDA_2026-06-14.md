# Diseño · Telemedida directa (Telegest · Linkener · CGNET)

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork, sesión de diseño — solo `.md`, sin tocar código)
> **Alcance:** diseño listo-para-construir de la ingesta de curvas de carga desde las pasarelas/plataformas
> de telemedida que Valere ya usa. **No ejecuta nada en Supabase.** SQL = propuestas.
> **Decisión de prioridad heredada (maestro):** telemedida = Fase 7, *detrás* de Datadis. Solo donde Datadis no llegue.

---

## 0. Principio rector (no negociable)

> **El CRM nunca habla IEC-102/DLMS directamente.** Ese protocolo necesita un colector con sesión TCP/serie
> dedicada, ventanas horarias y reintentos — incompatible con una Edge Function efímera.

Las plataformas de telemedida españolas (Enerclic, energyLogic, GISCE/PowERP, y por extensión Telegest, Linkener,
CGNET) ya hacen ese trabajo: hablan **IEC 870-5-102 y DLMS/COSEM** con los contadores por GSM/GPRS/TCP-IP, descargan
las curvas de carga diarias y las exponen en su portal. **El CRM consume la salida de la plataforma, no el contador.**

```
Contador (IEC 870-5-102 / DLMS-COSEM)
  └─ Pasarela GSM/GPRS/IP del proveedor              ← lo que Valere ya tiene desplegado
       └─ PLATAFORMA del proveedor (Telegest/Linkener/CGNET)   ← ya descarga y guarda la curva
            └─ INTERFAZ DE SALIDA (API REST / FTP / email / CSV)   ← AQUÍ engancha el CRM
                 └─ Colector ligero (EF o microservicio según interfaz)
                      └─ telemetry-ingest (EF, token x-ingest)        ← patrón idéntico a tariffs-ingest (ya en prod)
                           └─ tabla curvas_carga (cruda)
                                └─ agregación mensual → facturas(origen='telemedida')
```

---

## 1. Qué expone cada proveedor (verificado en web, 2026-06-14)

> **Aviso de fiabilidad:** las tres son plataformas de nicho del sector energético español. La documentación pública
> de sus APIs es limitada. Lo que sigue está marcado por nivel de certeza. **El agente técnico debe confirmar el
> método de salida real con cada proveedor antes de implementar su adaptador** (ver §6, decisiones que faltan).

| Proveedor | Naturaleza | Salida probable | Certeza | Adaptador recomendado |
|---|---|---|---|---|
| **Linkener** | Plataforma SaaS de gestión energética con IA. Tiene **"Linkener Hub"**, módulo declarado para conectar ERP/CRM por **WebServices**, y módulo Datadis | **API/WebService REST** (Linkener Hub) | **Alta** (lo anuncian explícitamente) | `LinkenerAdapter` vía REST |
| **Telegest** | Telegestión/telemedida (marca asociada a contadores ORBIS DOMOTAX y software de telegestión). Orientado a hardware + software de descarga de curvas | **Export CSV / FTP / email programado** de curvas; API menos probable | Media | `TelegestAdapter` vía fichero (FTP/email) o API si la hay |
| **CGNET** | Telemedida/telegestión por GSM. Software compatible IEC-102 + DLMS que descarga curvas y **envía informes por email automáticamente** | **CSV por email / FTP**; portal de descarga | Media-baja | `CgnetAdapter` vía fichero |

**Conclusión de arquitectura:** no asumir API REST para los tres. Diseñar un **patrón de adaptador con dos
familias de colector**: (a) *pull REST* (Linkener) y (b) *fichero* (Telegest/CGNET vía FTP o email→parser CSV).
Esto evita rehacer el diseño cuando se confirme que dos de los tres entregan CSV, no JSON.

---

## 2. Modelo de datos

### 2.1 Tabla nueva `curvas_carga` (cruda) — NO existe hoy
Verificado en Supabase: no hay tabla de curvas de telemedida. Se propone una, simétrica a `datadis_consumptions`
para que la agregación a `facturas` sea idéntica en ambos orígenes.

```sql
-- PROPUESTA (no ejecutar aquí)
CREATE TABLE IF NOT EXISTS public.curvas_carga (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cups_id      uuid NOT NULL REFERENCES public.cups(id) ON DELETE CASCADE,
  ts           timestamptz NOT NULL,          -- inicio del intervalo (horario o cuartohorario)
  intervalo_min smallint NOT NULL DEFAULT 60, -- 60 (curva horaria) o 15 (cuartohoraria tipo 1-2)
  kwh          numeric(12,3) NOT NULL,
  kwh_excedente numeric(12,3),                -- si hay generación
  kvarh        numeric(12,3),                 -- reactiva (componente 6 de la comparativa — ChatGPT §3)
  origen_plataforma text NOT NULL CHECK (origen_plataforma IN ('telegest','linkener','cgnet')),
  ingest_id    text,                          -- lote de ingesta para trazabilidad
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cups_id, ts, intervalo_min)         -- idempotencia: re-ingesta no duplica
);
CREATE INDEX IF NOT EXISTS idx_curvas_carga_cups_ts ON public.curvas_carga (cups_id, ts);
ALTER TABLE public.curvas_carga ENABLE ROW LEVEL SECURITY;
-- RLS por scope de empresa (vía cups_id → cups.empresa_id), igual que datadis_consumptions.
```

> **Reactiva (`kvarh`):** el doc de requisitos ChatGPT (§3, componente 6) pide energía reactiva en la comparativa.
> La telemedida es la mejor fuente de reactiva (Datadis la da limitada). Por eso se incluye en la curva cruda.

### 2.2 Maxímetros para optimización de potencia (diferenciador comercial — ChatGPT §2)
La telemedida es **la fuente de oro para los maxímetros** que pide el módulo de optimización de potencia del PDF.
Se derivan de `curvas_carga`, no se almacenan aparte (evita doble verdad):

```sql
-- PROPUESTA: vista derivada (security_invoker=true)
CREATE OR REPLACE VIEW public.v_maximetros_mensuales
WITH (security_invoker = true) AS
SELECT
  cups_id,
  date_trunc('month', ts) AS mes,
  max(kwh * (60.0/intervalo_min)) AS pot_max_kw,      -- potencia media del intervalo extrapolada a kW
  percentile_cont(0.95) WITHIN GROUP (ORDER BY kwh * (60.0/intervalo_min)) AS p95_kw
FROM public.curvas_carga
GROUP BY cups_id, date_trunc('month', ts);
```
> El análisis de potencia (potencia recomendada, ahorro, riesgo de exceso, confianza) lo hace el módulo de propuestas
> a partir de esta vista. Reglas de negocio en `REQUISITOS_CHATGPT_2026-06-12.md` §2.2 (no bajar potencia con excesos
> recientes; no proponer ahorro < 200 €/año; declarar siempre confianza y riesgo).

---

## 3. Colector y `telemetry-ingest`

### 3.1 `telemetry-ingest` (Edge Function nueva, patrón conocido)
Reutiliza el patrón **idéntico** a `tariffs-ingest` (ya en producción): endpoint con cabecera `x-ingest-token`,
valida, normaliza y hace UPSERT. Es el único punto de escritura a `curvas_carga`.

```
POST /functions/v1/telemetry-ingest
Headers: x-ingest-token: <secreto en Vault>
Body (normalizado, lo produce el colector):
{
  "origen_plataforma": "linkener",
  "lecturas": [
    { "cups": "ES0021...RK", "ts": "2026-06-01T00:00:00+02:00", "intervalo_min": 60, "kwh": 142.5, "kvarh": 12.1 },
    ...
  ]
}
→ resuelve cups → cups_id, UPSERT curvas_carga, devuelve {insertadas, ignoradas, errores}
```

### 3.2 Familia A — colector *pull REST* (Linkener Hub)
```
EF telemetry-pull-linkener (cron diario):
  1. auth contra Linkener Hub (credencial en Vault)
  2. por cada CUPS mapeado: GET curva del rango [ultimo_ts, hoy]
  3. normaliza al formato de telemetry-ingest
  4. POST a telemetry-ingest
```

### 3.3 Familia B — colector *fichero* (Telegest / CGNET)
Dos sub-opciones según lo que confirme cada proveedor:
- **B1 — FTP/SFTP:** microservicio o EF que lista el FTP del proveedor, descarga CSV nuevos, parsea, POST a ingest.
- **B2 — Email programado:** el proveedor ya envía CSV por email. Opciones:
  - reenviar ese email a un buzón conectado y parsearlo (escenario Make/n8n → ingest), o
  - subida manual del CSV en una pestaña del `/importador` (mínimo viable, cero infra nueva).

> **El MVP de telemedida puede ser la subida manual de CSV** (familia B2-manual) reusando el `/importador`.
> Demuestra el puente a `facturas` sin levantar FTP ni microservicios. La automatización viene después.

---

## 4. Puente a `facturas` (idéntico a Datadis — reutilizar)

La agregación mensual es **la misma función** que el puente Datadis (ver `DISENO_DATADIS_PUENTE_2026-06-14.md` §4),
parametrizada por origen:

```
agregar_consumo_mensual(cups_id, mes, fuente='telemedida'):
  curva = curvas_carga del CUPS en el mes
  mapea cada intervalo → periodo P1..P6 (periodos30TD.ts, ya testeado)
  UPSERT facturas(cups_id, año, mes) con consumption_p1..p6, surplus, kvarh, periodo_dias,
         origen='telemedida', es_estimada=(intervalos < esperados)
  Precedencia: 'manual' no se sobrescribe; 'telemedida' SÍ gana a 'datadis' y 'sips'
               (dato de contador propio > Datadis > SIPS).
```

> **Precedencia unificada (las 4 fuentes):** `manual` > `telemedida` > `datadis` > `sips`.
> Una sola regla para todo el CRM, implementada en el UPSERT de la función de agregación.

---

## 5. Plan de construcción y criterio de "hecho"

| Paso | Entregable | Hecho cuando |
|---|---|---|
| TM-1 | Migración `curvas_carga` + vista `v_maximetros_mensuales` + RLS | `tsc` 0, migración en rama, advisor OK |
| TM-2 | EF `telemetry-ingest` (token, normalizador, UPSERT) + secreto Vault | POST de prueba inserta una curva sintética sin duplicar al repetir |
| TM-3 | MVP fichero: pestaña CSV de telemedida en `/importador` (familia B2-manual) | Subes un CSV real de un proveedor y aparece en `curvas_carga` |
| TM-4 | Puente a `facturas` (reutiliza agregación Datadis con `origen='telemedida'`) | `/analisis` usa el consumo de telemedida de un CUPS sin teclear |
| TM-5 | Adaptador automatizado del proveedor confirmado (Linkener REST o FTP) | Curva entra sola cada noche para 1 CUPS piloto |
| TM-6 | Maxímetros en el módulo de propuestas (sección optimización de potencia) | El PDF muestra pot. actual / maxímetro / p95 / recomendada / ahorro / riesgo / confianza |

Reglas: rama `claude/telemedida-ingest` + PR, TSC 0, tests, ESTADO.md.

---

## 6. Mi opinión honesta y datos que faltan

**Honestamente, telemedida es la integración de menor prioridad de las tres** y el maestro ya lo coloca en Fase 7,
con razón: para el 90% de clientes, **Datadis da la misma curva horaria gratis y sin hardware**. La telemedida solo
compensa donde Datadis no llega o llega tarde:
- clientes de **alta tensión (tarifas 6.x, tipo 1-2)** donde queréis dato cuartohorario inmediato,
- sitios donde la distribuidora no publica curva en Datadis,
- y, sobre todo, como **fuente de reactiva y maxímetros** para el módulo de optimización de potencia (ahí sí aporta
  algo que Datadis da peor).

Dicho eso, el diseño es barato porque **reutiliza tres piezas ya probadas**: el patrón `tariffs-ingest`, el
normalizador de periodos `periodos30TD.ts`, y la agregación a `facturas` del puente Datadis. El MVP (CSV manual)
no necesita infraestructura nueva.

### Decisiones que necesito de ti
- **T1 (clave, determina el adaptador):** de Telegest, Linkener y CGNET, ¿cuál exponen como **API REST** y cuáles
  solo como **CSV/FTP/email**? Linkener parece tener API ("Linkener Hub"); confírmalo. Telegest y CGNET probablemente
  son fichero — necesito saberlo para elegir familia A o B por proveedor.
- **T2:** ¿qué proveedor cubre más CUPS hoy? Empiezo el adaptador automatizado por ese (el resto, CSV manual al principio).
- **T3:** ¿necesitáis cuartohorario (15 min) o basta horario? Afecta a `intervalo_min` y al volumen de `curvas_carga`.
- **T4:** ¿tenéis credenciales de API/FTP de estas plataformas, o hay que solicitarlas? (Linkener Hub suele requerir alta.)

---

*Fuentes externas (2026-06-14): [Linkener — plataforma y Hub](https://linkener.com/) · [Linkener — telemedida](https://linkener.com/telemedida/) · [Enerclic — telemedida GSM IEC-102/DLMS](https://enerclic.es/telemedida-contadores-gsm/) · [energyLogic — curvas de carga](http://www.energylogic.es/Telemedida.html) · [GISCE PowERP — telegestión](https://manuales.gisce.net/distri/telegestion/) · [Tarlogic — telegestión en España](https://www.tarlogic.com/es/blog/contadores-inteligentes-espana-telegestion/). Verificación interna: Supabase `gtphkowfcuiqbvfkwjxb` (no existe tabla de curvas de telemedida a 2026-06-14). Base: `REQUISITOS_CHATGPT_2026-06-12.md` §2-§4, `ANALISIS_ESTRATEGICO_2026-06-10.md` §4.3.*
