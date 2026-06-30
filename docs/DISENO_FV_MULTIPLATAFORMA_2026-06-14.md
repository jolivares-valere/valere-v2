# Diseño · Fotovoltaica multi-plataforma (FusionSolar · GoodWe · SolarEdge)

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork, sesión de diseño — solo `.md`, sin tocar código)
> **Alcance:** diseño listo-para-construir del patrón de adaptadores FV y del cruce de autoconsumo.
> **No ejecuta nada en Supabase.** SQL = propuestas. Fase 6 del maestro.

---

## 0. Punto de partida: ya tenéis la mitad hecha

Verificado en vivo (Supabase, 2026-06-14): el módulo FV es el **más maduro** de las integraciones.

| Tabla FV | Filas | Rol |
|---|---|---|
| `fv_planta` | **7** | Plantas (la columna `plataforma` ya discrimina proveedor) |
| `fv_kpi_diario` | 18 | KPI diario por planta (producción) |
| `fv_kpi_realtime` | 7 | Realtime |
| `fv_alarma` | 7 | Alarmas |
| `fv_informe_mensual` | 3 | Informes |
| `fv_sync_log` | 159 | Trazabilidad de sync |
| `fv_credenciales_secret` | 1 | Secretos (solo service_role — bien hecho) |
| `fv_planta_credencial`, `fv_resumen_semanal`, `fv_dispositivo`, `fv_sync_audit`, ... | varias | Soporte |

**Conclusión:** la arquitectura multi-plataforma **ya está preparada** (`fv_planta.plataforma` es el discriminante).
Hoy solo hay un proveedor implementado (FusionSolar). El trabajo es **extraer el patrón adaptador** y añadir GoodWe
y SolarEdge sin duplicar código.

> ⚠️ **Decisión heredada (requisitos ChatGPT §4):** el histórico de FusionSolar por scraping headless está **bloqueado
> por WAF (HTTP 503/500)**. Decisión ya tomada: **NO más headless**. Sync incremental diario (crece solo) +
> **importador CSV manual** para retrocarga. Este diseño lo respeta y lo generaliza a las tres plataformas.

---

## 1. El patrón: interfaz `FVAdapter`

Antes de añadir el segundo proveedor, **extraer la lógica de FusionSolar a una interfaz común**. Si no, GoodWe
duplicará el código de Huawei y en seis meses habrá tres copias divergentes.

```ts
// PROPUESTA de contrato (el técnico lo ubica en src/core/energia/fv/ o supabase/functions/_shared/)
interface FVAdapter {
  readonly plataforma: 'fusionsolar' | 'goodwe' | 'solaredge';
  authenticate(cred: FVCredential): Promise<FVSession>;       // login/token, con caché de sesión
  listPlants(s: FVSession): Promise<FVPlant[]>;               // → upsert fv_planta
  getDailyKpis(s: FVSession, plantId: string, range: DateRange): Promise<FVDailyKpi[]>; // → fv_kpi_diario
  getRealtime(s: FVSession, plantId: string): Promise<FVRealtime>;  // → fv_kpi_realtime
  getAlarms(s: FVSession, plantId: string): Promise<FVAlarm[]>;     // → fv_alarma
}
```

El worker de sync queda agnóstico:
```
para cada fv_planta:
  adapter = adapterFor(planta.plataforma)   // factory que enruta por el discriminante
  session = adapter.authenticate(credencialDesdeVault(planta))
  upsert fv_kpi_diario  ← adapter.getDailyKpis(...)
  upsert fv_alarma      ← adapter.getAlarms(...)
  log en fv_sync_log
```

> **Regla de extracción:** primero refactorizar FusionSolar a `FusionSolarAdapter` **sin cambiar comportamiento**
> (tests de regresión verdes), y solo después añadir GoodWe/SolarEdge. Refactor y feature nueva en PRs separados.

---

## 2. Lo que expone cada plataforma (verificado en web, 2026-06-14)

### 2.1 Huawei FusionSolar — ✅ ya implementado
- **Northbound/OpenAPI**, POST a `/thirdData/...`: `getStationList`/`station-list`, `getStationRealKpi`,
  `getKpiStationDay`.
- **Particularidades confirmadas:** rate limits **muy estrictos** por usuario; se recomienda **1 cuenta API por
  sistema** y **centralizar el token** (login único). El histórico `day-real-kpi` está tras WAF → no headless.
- **Estado Valere:** funcionando; `station-list` es la fuente estable (HTTP 200). Guard anti-contaminación de filas
  0.000 kWh ya implementado.

### 2.2 GoodWe SEMS — añadir (~1 semana)
- **OpenAPI** sobre HTTPS, **exclusiva para cuentas de organización SEMS** (no cuentas de planta sueltas).
- Devuelve datos de todos los equipos de la organización (estaciones, dataloggers, weather station, etc.).
- **No hay documentación pública completa**: la OpenAPI y sus credenciales se solicitan al equipo de servicio de GoodWe.
- **Prerequisito:** Valere necesita **cuenta de organización SEMS**. Con cuenta de planta normal NO se puede.

### 2.3 SolarEdge — añadir (~1 semana, el más limpio)
- **Monitoring API REST** bien documentada (PDF oficial). Auth por `api_key` como parámetro de URL.
- Endpoints clave: `GET /sites/list` (cuenta), `GET /site/{id}/energyDetails`, `GET /site/{id}/overview`.
- **Dos niveles de clave:** *Account Level API Key* (varias plantas) y *Site Level API Key* (una planta).
- **Aviso de seguridad oficial:** nunca poner la `api_key` en repos ni en JS de navegador → va a `fv_credenciales_secret`
  (Vault), las llamadas desde Edge Function. Encaja con cómo Valere ya guarda secretos FV.

| Plataforma | Protocolo | Auth | Prerequisito | Esfuerzo | Certeza docs |
|---|---|---|---|---|---|
| FusionSolar | Northbound POST | usuario+pass → token | hecho | — | Alta |
| GoodWe SEMS | OpenAPI HTTPS | cuenta organización | **solicitar cuenta org a GoodWe** | ~1 sem | Media (docs no públicas) |
| SolarEdge | REST | `api_key` (account/site) | generar api_key | ~1 sem | **Alta** (PDF oficial) |

> **Telegest/Linkener/CGNET NO van aquí.** Esas son telemedida de *consumo* (ver `DISENO_TELEMEDIDA_*`). Este doc es
> *generación* FV. El requisito ChatGPT lista FusionSolar como la plataforma FV; GoodWe y SolarEdge se añaden por
> ser las siguientes más comunes en el parque español. Confírmame cuáles tenéis realmente (§5, F1).

---

## 3. Modelo de datos: mínimos cambios

`fv_planta.plataforma` ya existe → casi todo se reutiliza. Solo conviene:

```sql
-- PROPUESTA: normalizar el enum de plataforma si hoy es texto libre
ALTER TABLE public.fv_planta
  ADD CONSTRAINT fv_planta_plataforma_chk
  CHECK (plataforma IN ('fusionsolar','goodwe','solaredge','generico'));
-- 'generico' = plantas sin API → carga CSV manual de producción mensual.
```
Para el **importador CSV** (retrocarga histórica y plantas sin API), reutilizar `excel_import_templates` (existe, 0 filas)
o una pestaña en `/importador` que escriba `fv_kpi_diario` con `origen='csv'`.

---

## 4. El cruce de oro: autoconsumo real (FV × Datadis × pool)

**Esta es la feature de fidelización que casi nadie en la competencia pequeña hace**, y las tres tablas ya existen:

```
fv_kpi_diario (producción)  ×  datadis_consumptions / curvas_carga (consumo)  ×  precios_pool_horarios (precio €)
   = informe mensual de AUTOCONSUMO REAL con ahorro en €
```

`precios_pool_horarios` tiene **105.776 filas** (ESIOS vivo) → el precio horario está disponible. El cálculo:

```
Por hora h del mes, por CUPS con FV:
  autoconsumo_h   = min(produccion_h, consumo_h)
  excedente_h     = max(0, produccion_h - consumo_h)
  red_h           = max(0, consumo_h - produccion_h)
  ahorro_h        = autoconsumo_h × precio_pool_h            (energía no comprada a red)
  + compensacion  = excedente_h × precio_compensacion        (según contrato; tope factura)
Mensual: sumas + ratio autoconsumo (%), cobertura FV (%), ahorro € total.
→ persiste en fv_informe_mensual (ya existe, 3 filas) o tabla derivada.
```

> **Por qué importa para el negocio:** este informe es **el motivo para que el cliente os pase el consentimiento
> Datadis** (lo necesitáis para tener su consumo horario). FV + Datadis se retroalimentan: el informe de autoconsumo
> vende el consentimiento, y el consentimiento alimenta el análisis de propuesta. Es un círculo virtuoso.

Y alimenta el **módulo M-FV del PDF de propuesta** (`DISENO_BASE_PROPUESTA_VALERE.md` §4): cuando un cliente tiene FV
o se le propone PPA, el informe de autoconsumo real entra como sección del estudio.

---

## 5. Plan de construcción y criterio de "hecho"

| Paso | Entregable | Hecho cuando |
|---|---|---|
| FV-1 | Refactor: extraer `FusionSolarAdapter` de la implementación actual a la interfaz `FVAdapter` | Tests de regresión FusionSolar verdes; comportamiento idéntico |
| FV-2 | `SolarEdgeAdapter` (REST, api_key en Vault) — el más limpio, primero | Una planta SolarEdge sincroniza KPI diario sin tocar código FusionSolar |
| FV-3 | Constraint `plataforma` + importador CSV (`generico` y retrocarga) | CSV histórico entra en `fv_kpi_diario` |
| FV-4 | `GoodWeAdapter` (tras conseguir cuenta organización SEMS) | Una planta GoodWe sincroniza |
| FV-5 | Cruce autoconsumo FV×Datadis×pool → `fv_informe_mensual` | Informe mensual de ahorro autoconsumo de 1 cliente real con FV |
| FV-6 | Sección M-FV del PDF alimentada por el cruce | La propuesta de un cliente con FV incluye autoconsumo real |

Reglas: refactor y features en PRs separados (`claude/fv-adapter`, `claude/fv-solaredge`, ...), TSC 0, tests, ESTADO.md.
Respetar rate limits (FusionSolar): centralizar token, backoff, no paralelizar llamadas por encima del límite.

---

## 6. Mi opinión honesta y datos que faltan

FV es donde **menos hay que construir y más diferenciación se gana**, pero con un matiz: el valor real no está en
"añadir más plataformas" sino en **el cruce de autoconsumo**. Tener 3 APIs FV sincronizando KPIs es bonito; el
informe de ahorro de autoconsumo real es lo que fideliza y lo que vende el consentimiento Datadis.

Por eso priorizaría así dentro de FV: **(1) extraer el adaptador** (deuda que crece con cada proveedor), **(2) el
cruce de autoconsumo con lo que ya tenéis** (FusionSolar + Datadis + pool, sin añadir plataformas), y solo
**(3) después** sumar SolarEdge/GoodWe según vuestro parque real de clientes. Añadir plataformas antes del cruce es
construir en anchura otra vez — el error que el análisis estratégico ya señaló.

GoodWe es el más caro de arrancar (cuenta de organización, docs no públicas). SolarEdge es el más fácil (REST + PDF
oficial). Si tenéis pocos clientes GoodWe, lo dejaría para el final o como CSV manual (`generico`).

### Decisiones que necesito de ti
- **F1:** ¿qué plataformas FV tienen vuestros clientes realmente, y en qué proporción? (Determina el orden FV-2/FV-4.)
- **F2:** ¿tenéis **cuenta de organización SEMS** de GoodWe, o solo cuentas de planta? La OpenAPI exige la de organización.
- **F3:** para SolarEdge, ¿gestionáis las plantas (tendríais *Account Level API Key*) o son del cliente (*Site Level* por planta)?
- **F4:** el cruce de autoconsumo necesita consumo horario del CUPS con FV → ¿esos clientes ya tienen consentimiento
  Datadis o telemedida? Sin consumo horario, el cruce no se puede calcular.

---

*Fuentes externas (2026-06-14): [Huawei FusionSolar Northbound API](https://support.huawei.com/enterprise/en/doc/EDOC1100440661/356f0ec1/fusionsolar-northbound-api-integration) · [FusionSolar getStationRealKpi rate limits — foro Huawei](https://forum.huawei.com/enterprise/en/how-to-solve-fusionsolar-api-getstationrealkpi-throw-http-500-error/thread/746507-100027) · [GoodWe API Introduction (comunidad)](https://community.goodwe.com/solution/API%20introduction) · [SolarEdge Monitoring API (PDF oficial)](https://knowledge-center.solaredge.com/sites/kc/files/se_monitoring_api.pdf). Verificación interna: Supabase `gtphkowfcuiqbvfkwjxb` (14 tablas `fv_*`, 7 plantas, 2026-06-14). Base: `ANALISIS_ESTRATEGICO_2026-06-10.md` §4.4, `REQUISITOS_CHATGPT_2026-06-12.md` §4.*
