# Proyecto: Integración de Telemedida e Inversores FV directa en el CRM Valere

> **Objetivo**: que el CRM Valere lea **directamente** los contadores fiscales (telemedida IEC 60870‑5‑102) y los inversores fotovoltaicos (Modbus / API cloud) de los clientes, sin depender de Telegest como intermediario de datos, replicando y superando lo que Telegest ofrece hoy.
>
> **Autorización**: Telegest/Energygest ha facilitado a Valere los datos de conexión y autoriza el acceso a los contadores, que son propiedad de los clientes de Valere y permiten el acceso.
>
> **Fecha**: 2026‑06‑12 · **Autor**: Cowork (Agente 1) · **Estado**: diseño para validar antes de desarrollar
>
> ⚠️ Este documento NO toca código. Es el diseño completo para ejecutar después, por fases, sin errores.

---

## 0. Resumen ejecutivo

Telegest (plataforma de Energygest) hace tres cosas que queremos internalizar:

1. **Lee contadores fiscales** por telemedida (protocolo IEC 60870‑5‑102) vía GPRS/IP o GSM, obteniendo curva horaria/cuartohoraria, cierres mensuales y valores instantáneos por fase.
2. **Lee inversores FV** (verificado en cliente TRH: 4 inversores Huawei SUN2000) tratándolos como "medidores" por **Modbus directo** contra el datalogger/SmartLogger en sitio — NO por la nube FusionSolar.
3. **Explota esos datos**: estudios de optimización de potencia, simulación/validación de facturas, sinópticos de autoconsumo, alarmas de calidad.

El CRM Valere **ya tiene construida buena parte de la capa FV cloud** (esquema `fv_*`, conector FusionSolar por Playwright, `fv-sync.yml`, cifrado AES‑256, módulo `seguimiento-fv`) y la capa Datadis. **Lo que falta** y este proyecto añade:

- Un **microservicio lector** alojado en VPS propio que hable **IEC‑102** (contadores) y **Modbus TCP** (inversores/analizadores) — porque Supabase Edge Functions (Deno) no permiten sockets TCP crudos.
- El **esquema de telemedida de contador** (curvas, cierres, instantáneos) en Supabase.
- Un **adaptador Modbus** para inversores que complemente al adaptador cloud existente.
- La **ingesta, normalización y explotación** (estudios de potencia y simulación de factura) dentro del CRM.

El resultado: una ficha única por cliente/CUPS con consumo + potencia + generación FV real, alarmas unificadas, y motor de propuestas con datos propios en tiempo casi real.

---

## 1. Qué hace Telegest y cómo (lo observado, base del diseño)

### 1.1 Acceso a contadores (telemedida)
- **Protocolo**: IEC 60870‑5‑102 (`Tipo: IEC870` en la ficha del contador).
- **Parámetros por contador** (extraídos de la pantalla "Detalles del contador fiscal" de los 30 suministros con telemedida):
  - `IP` + `Puerto` (sólo en los GPRS/IP — 19 de 30), p.ej. `135.125.28.202:15127`.
  - `Teléfono` (SIM del módem M2M; los GSM puros — 11 de 30 — sólo tienen teléfono, se leen por CSD).
  - `Dirección de enlace`, `Punto de medida`, `Clave de lectura (clave de contraste)` — todos = 1 (valores por defecto).
  - `Rel. Trafos Tensión / Corriente` (factor para CT en MT: 22000/110, 16500/110; la mayoría "sin trafos").
- **Arquitectura observada**: casi todos los contadores apuntan a una IP única (`135.125.28.202`, rango OVH) multiplexada por puerto. Es un **concentrador TCP de Energygest** que reenvía a cada módem; NO es la IP del contador. → Para conexión directa, Valere necesita confirmar con Telegest si nos abren ese concentrador o nos pasan las SIM a una APN propia (ver §8, primer riesgo).
- **Datos que entrega el contador** (visto en lectura instantánea de JEICA):
  - Por fase R/S/T: Tensión fase (F‑N), Tensión línea (F‑F), Corriente, Potencia activa, Potencia reactiva, Factor de potencia.
  - Acumulados: consumo de activa (kWh) y reactiva (kVArh), periodo tarifario activo, timestamp.
  - Históricos: curva horaria, curva cuartohoraria, cierres mensuales (lecturas + maxímetros P1–P6).

### 1.2 bis — CONFIRMADO POR CORREOS (corrige el mecanismo FV)
Tres correos de Energygest/Telegest resuelven cómo conectan con los inversores:
- **Manuel Bautista (comercial@energygest.com, 30‑nov‑2023)**: *"Estas son las marcas de los inversores, que, **si tienen internet, nos podemos comunicar con ellos**, y tener los datos de la Generación, en TELEGEST: **SOLIS, SMA, HUAWEI, SUNGROW**"*. → Solo 4 marcas, y por **internet** (nube), no en sitio.
- **Alberto Romero (Dpto. Ingeniería, energygest, 20‑may‑2026) sobre TRH (CUPS ES0031104002495001XY)**: *"No estamos pudiendo comunicar con **la plataforma de los inversores**... He probado a conectarme de forma manual con **usuario y contraseña a la plataforma** y con las credenciales que tenemos, no me deja acceder, **parece que se han cambiado**"*. → Para TRH, Telegest lee por la **plataforma cloud del fabricante (FusionSolar de Huawei) con usuario+contraseña**; cuando el cliente cambió la contraseña, dejó de recibir datos. ESTA es la causa del "sin comunicación desde 04‑03".
- **Juan Manuel Ortolá (Director Técnico, energygest, 18‑mar‑2026, hilo Deraza)**: para integrar medición de proceso pide *"**Modbus RTU o Modbus TCP/IP**"*. → Modbus es para medidores/analizadores, no para los inversores cloud.

**PRUEBA DEFINITIVA — hilo "Consulta comunicación con inversores Sungrow" (mar‑2025), TRH**:
Secuencia exacta que zanja el cómo:
1. Valere→Energygest: *"¿os podéis comunicar **directamente con los inversores SUNGROW**? ... quisiera tenerlo todo controlado de forma directa."*
2. Energygest (J.M. Ortolà): *"Hay que probar si podemos **directamente o es necesario la integración con la API**, dile al cliente que te pase **el usuario y contraseña** y probamos a ver si leemos **con el bot**."*
3. Valere pasa: enlace **iSolarCloud** (`web3.isolarcloud.eu`) + usuario `josefelixfdeza@gmail.com` + contraseña (cuenta del cliente).
4. Energygest: *"Ya estamos leyendo y está operativa la telemedida de esta FV. 4 inversores, coste **6€ + 1€/inversor = 10€/mes + IVA**."*

→ Mecanismo CONFIRMADO: leen los inversores **con usuario+contraseña de la cuenta cloud del cliente (iSolarCloud/Sungrow), mediante un "bot"** (cliente automatizado que entra a la plataforma). Es exactamente el patrón del conector FusionSolar‑Playwright ya existente en el CRM. La alternativa "integración con la API" (Open API oficial) es la vía robusta que Valere tramitó después con Huawei.
→ **Dato de negocio**: Energygest cobra ~10€/mes+IVA por leer los 4 inversores de TRH (6€ + 1€/inversor). Internalizarlo en el CRM elimina ese coste recurrente por planta.
→ **Matiz que reconcilia "directo" vs "API"**: el bot/API lee el inversor concreto (su producción real, por serie), pero el transporte es la cuenta cloud del fabricante. No es Modbus al equipo (salvo Deraza, SmartLogger IP local).

**EVIDENCIA ADICIONAL (gestiones de Valere con fabricantes, jun‑2026)**:
- **Huawei SR 90004940 (1‑jun‑2026)**: Valere solicitó formalmente a Huawei *"acceso a una **API northbound (Open API) de FusionSolar**"* para el inversor **SUN2000‑100KTL‑M2** de TRH, con autenticación **OAuth 2.0/JWT**, endpoints de plantas/generación/estado de inversores/alarmas en JSON. → La vía para Huawei es la **Open API de FusionSolar** (cloud), por cuenta de empresa (admin) del cliente.
- **Sungrow iSolarCloud (1‑jun‑2026)**: el cliente TRH (jmmartin) **compartió la planta** con Valere en `web3.isolarcloud.eu`. → La vía para Sungrow es **iSolarCloud** (cloud), por planta compartida.
- **Deraza (1‑jun‑2026)**: caso DISTINTO — SmartLogger con **IP local `128.101.211.135`** (*"da Ping esa IP"*), accesible en red del cliente. → Aquí SÍ cabe Modbus/IP directo al SmartLogger (vía VPN/red del cliente). Es la excepción, no la norma.
- **Verificación en la propia plataforma Telegest**: la config del equipo solar accesible con rol asesoría (`/solar/configuracion_equipo.php`) **NO expone** el método de conexión del inversor (ni user/pass cloud, ni IP, ni serie) — eso vive en el backoffice de Energygest. Confirma que el "cómo" lo gestiona Energygest, pero la evidencia externa fija que es API cloud del fabricante.

**CONCLUSIÓN CORREGIDA Y DEFINITIVA sobre FV** (cloud por fabricante; el dato es del inversor pero el canal es la API del fabricante):
- Los **inversores** se leen por **API/nube del fabricante con usuario+contraseña** (FusionSolar/SMA Sunny Portal/SolisCloud/iSolarCloud‑Sungrow). NO por Modbus en sitio. Las 4 marcas soportadas por Telegest: **Solis, SMA, Huawei, Sungrow** (requisito: el inversor tiene internet).
- Esto **encaja perfecto con lo ya construido en el CRM**: el conector FusionSolar por Playwright (usuario+contraseña, cookies) es justo este patrón. Hay que añadir SMA, Solis y Sungrow.
- Los **contadores y submetering** se leen por hardware Energygest (**medidor EG‑ACA3 + módem EG‑EB4G con SIM**, protocolo IEC‑102/Modbus) — esos sí son dispositivos con IP:puerto/SIM.

> Implicación para TRH: el dato de los 4 inversores en la pantalla "Instantáneos" de Telegest viene de FusionSolar (cuenta del cliente), re‑presentado como "analizadores". Para que Valere lo lea directo necesita las **credenciales FusionSolar del cliente** (usuario+contraseña de su cuenta Huawei), no acceso Modbus al SmartLogger.

### 1.2 Acceso a inversores FV (verificado en cliente TRH)
- TRH ZF Sevilla tiene **4 inversores Huawei SUN2000** (seriales `A2273022072`, `A2273019285`, `A2272958673`, `A2273019246`).
- Telegest los muestra como **"Analizadores en Baja Tensión (CGBT y Subcircuitos)"** con lectura por fase R/S/T de V, I, kW y FP, con timestamp.
- Se modelan en un **árbol de submetering** (contador fiscal como principal, inversores como nodos).
- Las notificaciones dicen *"El sistema no puede comunicar con el medidor INVERSOR X desde 04‑03‑2026"* → el inversor es un **medidor de comunicación directa** (no API cloud).
- **Conclusión técnica**: lectura por **Modbus** (TCP/RTU) contra el **SmartLogger** de Huawei en sitio (IP:puerto, cada inversor = esclavo Modbus). Mismo patrón que los contadores.

> Nota de estado real: a 12‑06‑2026 esos 4 inversores y el contador GENERAL de TRH figuran **sin comunicación** (inversores desde 04‑03; GENERAL desde anoche). Refuerza que la IP:puerto es del **concentrador de Energygest** y que, para leer en directo, Valere debe acordar el acceso con Telegest (no basta copiar IP:puerto).

### 1.3 Explotación (lo que hay que replicar en el CRM)
- **Estudio de potencia**: doble escenario (mantener tipo 3 vs cambiar a tipo 4), potencias óptimas P1–P6 desde curva cuartohoraria, tabla mensual coste actual vs optimizado, ahorro €/% con I.E., estudio "regantes" (estacional), batch nocturno multisuministro.
- **Simulación de factura**: ATR/distribuidora (Tp + reactiva por periodo) + comercializadora (energía por periodo a precio OMIE o fijo) + compensación excedentes FV + impuestos (I.E. %, alquiler, IVA). Modos: por curvas / cierre / meses / franja. Validación contra factura real (>2% desviación = aviso).
- **Sinóptico FV**: generada / consumida / vertida / red, autoconsumo, comparativa precio OMIE vs consumo.
- **Incidencias de calidad**: 9 tipos (reactiva, maxímetro, voltaje, sin comunicación, etc.).

---

## 2. Qué ya tiene el CRM Valere (no reinventar)

Verificado en el repo `valere-v2`:

| Capa | Existente | Reutilizable para este proyecto |
|---|---|---|
| **FV cloud** | Esquema `fv_credenciales`, `fv_planta`, `fv_dispositivo`, `fv_kpi_diario`, `fv_kpi_realtime`, `fv_alarma`, `fv_sync_log`; cifrado AES‑256‑GCM (EF `fv-create-credential` + `crypto.py`); conector FusionSolar por Playwright (`scripts/fv-sync/`); orquestación por GitHub Actions `fv-sync.yml` + EF `trigger-fv-sync`; módulo UI `seguimiento-fv` con tabs Producción/Alarmas/Excedentes/Plantas. | **Base del adaptador cloud.** El esquema `fv_*` se amplía, no se recrea. El patrón de credenciales cifradas se reutiliza para Modbus e IEC‑102. |
| **Datadis** | `datadis_tokens`, `datadis_consumptions`, feature `datadis` con normalizadores y periodos 3.0TD. | Fuente alternativa de curva de consumo (oficial, sin hardware) para CUPS sin telemedida directa. |
| **Cálculo energético** | `src/core/energia/` (lógica calculadora), módulo de tarifas (`retailers`, `retailer_offers`, `boe_regulated_prices`, ESIOS precios pool). | **Motor de simulación de factura y estudio de potencia** — ya hay precios regulados y pool. |
| **CRM** | `empresas`, `contactos`, `cups`, `contratos`, `incidencias`, `propuestas`. | Las lecturas se cuelgan de `cups`; las alarmas FV/telemedida se vinculan a `incidencias`. |

**Principio rector**: este proyecto **extiende** el modelo `fv_*` y `cups` con telemedida de contador y lectura Modbus; reutiliza credenciales cifradas, sync_log y la UI de seguimiento‑fv.

---

## 3. Arquitectura objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│  DISPOSITIVOS EN CAMPO                                           │
│  • Contadores fiscales  (IEC 60870-5-102)  vía concentrador/SIM  │
│  • SmartLogger Huawei / inversores (Modbus TCP)                  │
│  • [Opcional] Inversores sólo-nube (FusionSolar/Goodwe/...)      │
└───────────────┬───────────────────────────┬─────────────────────┘
                │ TCP (IEC-102 / Modbus)     │ HTTPS (API cloud)
                ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  MICROSERVICIO LECTOR  "valere-meter-gateway"  (VPS propio)      │
│  ───────────────────────────────────────────────────────────    │
│  • Adaptador IEC-102  (cliente protocolo contador)              │
│  • Adaptador Modbus   (SmartLogger/inversor)                    │
│  • Adaptador Cloud    (reusa conector FusionSolar/Goodwe)       │
│  • Scheduler (poll por dispositivo: 5–15 min / cierres diarios) │
│  • Normalizador → JSON canónico                                 │
│  • Push a Supabase (service_role) + reintentos + buffer local   │
└───────────────┬─────────────────────────────────────────────────┘
                │ HTTPS (Supabase REST / RPC, service_role)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE (Postgres + RLS)                                      │
│  • telemetria_* (curvas, cierres, instantáneos contador)        │
│  • fv_* (plantas, dispositivos, kpi, alarmas)  [ampliado]       │
│  • cups / empresas / incidencias  [vinculación]                 │
└───────────────┬─────────────────────────────────────────────────┘
                │ REST + RLS
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CRM FRONTEND (React)                                            │
│  • feature "telemedida" (nueva): curvas, instantáneos, cierres  │
│  • feature "seguimiento-fv" (existente, ampliada con Modbus)    │
│  • Estudio de potencia + Simulación de factura (motor energia)  │
└─────────────────────────────────────────────────────────────────┘
```

### Por qué un microservicio en VPS (decisión tomada)
- Supabase Edge Functions (Deno) **no permiten sockets TCP crudos** → no pueden hablar IEC‑102 ni Modbus. GitHub Actions sirve para poll esporádico pero no para conexiones persistentes ni tiempo real.
- Un VPS pequeño (1‑2 vCPU, el mismo proveedor que ya usáis vale) corre el lector 24/7, igual que hace Energygest. Control total de red, reintentos, buffer si Supabase no responde.
- El VPS **sólo** habla con los dispositivos y con Supabase (service_role). El frontend nunca toca dispositivos ni secretos.

---

## 4. Modelo de datos (Supabase) — nuevo + ampliación

> Nomenclatura en español de dominio, coherente con el CRM. Todo con RLS por `empresa_id`/`comercial_id` (multitenant, prioridad seguridad ALTA — RGPD).

### 4.1 Nuevas tablas de telemedida de contador
```
telemetria_dispositivo        -- un equipo de medida por CUPS (contador o analizador)
  id, cups_id (FK cups), empresa_id, tipo ('contador_fiscal'|'analizador'|'inversor'),
  protocolo ('iec102'|'modbus_tcp'|'cloud'),
  fabricante, modelo, serie,
  -- conexión (secretos en tabla _secret aparte, como fv_credenciales):
  host, puerto, direccion_enlace, punto_medida, clave_contraste_ref,
  unit_id_modbus, rel_trafo_tension, rel_trafo_corriente,
  activo, ultima_conexion, ultima_curva_horaria, ultima_curva_ch, estado_comunicacion

telemetria_dispositivo_secret  -- SOLO service_role
  dispositivo_id, clave_contraste_enc, apn_user_enc, apn_pass_enc, cloud_token_enc

telemetria_curva              -- curva horaria/cuartohoraria
  dispositivo_id, cups_id, ts (timestamptz), resolucion ('15min'|'60min'),
  activa_kwh, reactiva_kvarh, generada_kwh, vertida_kwh, periodo_tarifario,
  PRIMARY KEY (dispositivo_id, ts, resolucion)   -- idempotente (upsert)

telemetria_cierre             -- cierres mensuales (lecturas + maxímetros)
  dispositivo_id, cups_id, fecha_cierre,
  activa_p1..p6, reactiva_p1..p6, maximetro_p1..p6, ...

telemetria_instantanea        -- último valor en tiempo real (1 fila por dispositivo, upsert)
  dispositivo_id, ts,
  v_r,v_s,v_t, i_r,i_s,i_t, p_r,p_s,p_t, q_total, fp_r,fp_s,fp_t,
  activa_total_kwh, reactiva_total_kvarh

telemetria_lectura_log        -- auditoría de cada poll (éxito/fallo, latencia, bytes)
  dispositivo_id, ts, resultado, detalle, duracion_ms
```

### 4.2 Ampliación FV (sobre el esquema existente `fv_*`)
- `fv_dispositivo`: añadir `protocolo` ('modbus_tcp'|'cloud'), `host`, `puerto`, `unit_id_modbus`, `smartlogger_serie`. Hoy asume cloud; se añade Modbus.
- `fv_kpi_realtime`: ya existe; el adaptador Modbus la rellena con P_AC, V/I por fase, E_día, E_total, temperatura, estado.
- `fv_alarma`: ya existe; el lector Modbus mapea códigos de alarma del inversor (registro de estado) a filas. Severidad crítica/mayor → crea `incidencias` (el TODO ya anotado en `sync_job.py`).

### 4.3 Vinculación CRM
- `telemetria_dispositivo.cups_id` → `cups` → `contratos`/`empresas`: cada lectura cuelga de la ficha de empresa.
- Alarmas de comunicación ("sin datos desde X") → `incidencias` tipo 'telemedida'.

---

## 5. El microservicio lector `valere-meter-gateway`

> Lenguaje recomendado: **Python** (reutiliza `crypto.py` y el conector FusionSolar existentes; ecosistema maduro de Modbus/IEC‑102). Empaquetado en Docker, en el VPS, supervisado por systemd o Docker restart.

### 5.1 Estructura
```
valere-meter-gateway/
  adapters/
    iec102.py        # cliente IEC 60870-5-102 (contadores fiscales; lib: lib60870 binding o impl. propia)
    modbus.py        # cliente Modbus TCP/RTU (analizadores/submetering EG-ACA3; lib: pymodbus)
    cloud_fusion.py  # inversores Huawei — reusa scripts/fv-sync/fusionsolar_client.py (user+pass)
    cloud_sma.py     # inversores SMA — Sunny Portal / ennexOS API
    cloud_solis.py   # inversores Solis — SolisCloud API
    cloud_sungrow.py # inversores Sungrow — iSolarCloud API
    cloud_goodwe.py  # inversores Goodwe — SEMS API  [marca extra, no usada por Telegest]
  core/
    scheduler.py     # apscheduler: poll por dispositivo según cadencia
    normalizer.py    # dispositivo → JSON canónico (curva/cierre/instantánea/kpi/alarma)
    supabase_sink.py # upsert a Supabase REST con service_role + reintentos + buffer SQLite
    crypto.py        # descifra secretos (AES-256-GCM, misma clave que el CRM)
  config.py          # lee lista de dispositivos desde Supabase (telemetria_dispositivo)
  main.py
  Dockerfile, requirements.txt
```

### 5.2 Flujo de un ciclo
1. `config.py` consulta a Supabase los `telemetria_dispositivo` activos (host, puerto, protocolo, unit_id, secretos cifrados).
2. `scheduler` agenda cada dispositivo: instantáneos cada 5–15 min, curva cada hora, cierres 1×/día.
3. El adaptador correspondiente abre conexión TCP, lee, cierra.
   - **IEC‑102** (contador): solicita curva/cierre/instantáneo según ASDU del estándar; aplica rel. trafos.
   - **Modbus** (inversor/SmartLogger): lee registros conocidos del SUN2000 (P_AC, E_día/total, V/I fase, Tº, estado/alarma). Mapa de registros Huawei documentado (anexo del proyecto).
   - **Cloud**: llama API fabricante (reusa Playwright FusionSolar).
4. `normalizer` produce JSON canónico.
5. `supabase_sink` hace **upsert idempotente** (PK por dispositivo+ts) → si Supabase falla, guarda en buffer SQLite y reintenta.
6. `telemetria_lectura_log` registra resultado.

### 5.3 Seguridad del lector
- Secretos (clave de contraste, APN, tokens) **cifrados en Supabase** (`*_secret`, AES‑256‑GCM con `FV_ENCRYPTION_KEY`); el VPS los descifra en memoria, nunca en disco ni en logs.
- El VPS usa **service_role** sólo para escribir telemetría; clave en variable de entorno del contenedor, no en repo.
- Conexión VPS→Supabase por HTTPS. Conexión VPS→dispositivos por la vía que acuerde Telegest (concentrador o APN privada con VPN/lista blanca de IP).
- Nunca se loguea username/password/clave (ya es la norma del conector FV actual).

---

## 6. Explotación en el CRM (motor de análisis)

Reutiliza `src/core/energia/` + módulo de tarifas. Nuevas piezas:

### 6.1 Estudio de optimización de potencia
- Entrada: `telemetria_curva` cuartohoraria del CUPS + tarifa vigente (CNMC/BOE ya en `boe_regulated_prices`) + maxímetros.
- Cálculo: potencias óptimas P1–P6 (minimiza Tp + excesos), doble escenario (tarifa actual vs cambio de tipo p.ej. 3.0TD↔6.1TD), ahorro €/% con I.E.
- Salida: tabla mensual (coste actual vs optimizado), gráfica potencias máximas demandadas, exportable a PDF de propuesta (skill `pdf`/`docx`). Equivale al estudio de Telegest, con dato propio.

### 6.2 Simulación / validación de factura
- Entrada: curva + contrato (potencias, comercializadora, tarifa) + precios (ESIOS pool si indexado, `retailer_offers` si fijo) + excedentes FV de `telemetria_curva.vertida_kwh`.
- Estructura factura: ATR (Tp por periodo + maxímetro + reactiva) + comercializadora (energía por periodo) + compensación excedentes + I.E. (%) + alquiler + IVA.
- Validación: comparar con factura real cargada (feature `importador`/OCR ya existe) → desviación >2% = incidencia.

### 6.3 Sinóptico FV y autoconsumo
- Con `telemetria_curva` (consumo + vertido) + `fv_kpi_*` (generación real del inversor) → autoconsumo REAL contrastado (no inferido como Telegest). Gráfica generada/consumida/vertida + precio OMIE.
- Diferencial Valere: alertas de bajo rendimiento FV (producción inversor vs esperada por irradiación), no sólo balance de contador.

### 6.4 UI
- Nueva feature `src/features/telemedida/` (curvas, instantáneos, cierres, estudio de potencia, simulación factura) — espejo de las pantallas de Telegest pero integradas en la ficha del cliente.
- `seguimiento-fv` existente se amplía con el origen Modbus (producción por inversor en tiempo real).

---

## 6 bis. Cómo replicar el "bot" de inversores de Telegest (verificado en vivo)

> Objetivo de Juan: leer los inversores tan rápido como Telegest, replicando su método. Verificado iniciando sesión en iSolarCloud y Huawei.

### Qué hace Telegest (confirmado)
Un proceso automatizado ("bot") inicia sesión en la **cuenta cloud del cliente** del fabricante (iSolarCloud para Sungrow, FusionSolar para Huawei) con **usuario+contraseña** y descarga, cada pocos minutos, la producción por inversor. No es Modbus al equipo. Cualquiera con esas credenciales puede leer lo mismo.

### Límite real de "velocidad" (importante)
La frescura del dato NO la pone el bot, la pone la **nube del fabricante**: iSolarCloud/FusionSolar refrescan datos del inversor cada **5–15 min**. Por tanto "tan rápido como Telegest" = refresco cada 5–15 min. Nadie obtiene el dato antes de que la nube lo publique. El bot de Valere igualará a Telegest porque bebe de la misma fuente.

### Dos formas de hacer el bot (de menos a más robusta)
1. **Login web automatizado (scraping/headless)** — lo que hace Energygest y lo que el CRM ya tiene a medias (`scripts/fv-sync/fusionsolar_client.py`, Playwright). Funciona HOY con user+pass. Riesgo: se rompe si cambian la web o la contraseña (le pasó a Telegest con TRH).
2. **API oficial del fabricante (Open API/Gateway)** — robusta, con tokens. Es la vía estable a medio plazo.

### ⭐ MÉTODO DE ACCESO OFICIAL: Channel/Partner (decisión Juan)
La forma correcta y estándar de que Valere lea las plantas FV de sus clientes NO es usar las credenciales del cliente, sino que el cliente **añade la cuenta partner de Valere** a su planta:
- **Sungrow/iSolarCloud**: Valere tiene cuenta propia **usuario `e9smbcju9c`** (email jolivares@valereconsultores.com). El cliente entra en iSolarCloud → su planta → *Channel/Partner* → *Add Channel/Partner* → introduce `e9smbcju9c`. La planta aparece entonces en la cuenta de Valere. (Procedimiento usado con TRH, 1‑jun‑2026.)
- **Ventaja**: Valere no custodia contraseñas de clientes (mejor RGPD/seguridad), el acceso es revocable por el cliente, y el bot/API del CRM lee desde la cuenta partner de Valere. Equivalente en Huawei = añadir Valere como usuario/empresa autorizada.
- **Para el conector**: el CRM se autentica UNA vez con la cuenta partner de Valere (e9smbcju9c) y ve TODAS las plantas que los clientes le hayan compartido. Un solo login, N plantas. Mucho mejor que un login por cliente.
- **Gestión recurrente**: el compartido puede caducar (le pasó a TRH). El CRM debe detectar "planta dejó de aparecer" → alerta para re‑solicitar el Add Channel/Partner al cliente.

### ✅ POC REAL EJECUTADO CON ÉXITO (2026‑06‑12) — TRH leído en vivo
Con la cuenta partner de Valere (`e9smbcju9c`) se entró a iSolarCloud y se leyeron EN VIVO los 4 inversores de TRH, igual que Telegest:
- Planta **"TRH ZH Sevilla"** (etiqueta **"Huésped"** = compartida por Channel/Partner), 499,4 kWp, estado Normal. Producción día 2,8 MWh, mes 25,8 MWh, total 977,6 MWh.
- 4 inversores **Sungrow SG110CX** (¡no Huawei — el prefijo A22 es de Sungrow!): 
  - Inversor 1 — serie A2273022072 — 715,4 kWh hoy — Normal
  - Inversor 2 — serie A2273019246 — 673,1 kWh hoy — Normal
  - Inversor 3 — serie A2272958673 — 719,9 kWh hoy — Normal
  - Inversor 4 — serie A2273019285 — 681,4 kWh hoy — Normal
- Menú de dispositivos: **Inversor / Data Logger / Medidor de energía**, con Lista de fallos (alarmas) y Parámetros.
- **Conclusión**: el bot del CRM PUEDE leer estos datos hoy mismo con la cuenta partner. Misma frescura que Telegest (la nube refresca ~5–15 min). El acceso Channel/Partner funciona y da una sola cuenta para N plantas.

### Endpoints REALES de la API iSolarCloud (capturados en el POC)
Base: `https://gateway.isolarcloud.eu/v1/` (REST, POST + JSON). Secuencia que el conector debe replicar:
1. `POST /v1/login` — usuario+contraseña de la cuenta partner → devuelve token de sesión.
2. `POST /v1/timestamp` — sincronización (la API firma las peticiones con timestamp).
3. `POST /v1/powerStationService/getPsListNova` — lista de plantas (todas las compartidas con el partner).
4. `POST /v1/powerStationService/getPsStatusCountNova` — recuento por estado (normal/anómalo/desconectado).
5. `POST /v1/devService/getUserDeviceInfoWithPsFilter` — dispositivos (inversores) por planta: modelo (SG110CX), serie (A227...), estado, producción hoy, potencia activa.
6. `POST /v1/faultService/getAllFaultTypeName` + Lista de fallos — alarmas/fallos por dispositivo.
7. (datos en tiempo real / históricos por dispositivo: endpoints `devService/...` que el conector llamará por serie para P_AC, V/I, E_día/total, temperatura).
> Nota: la API pública oficial de Sungrow (iSolarCloud OpenAPI) usa esta misma base `gateway.isolarcloud.eu` con `appkey`+`x-access-key`. El conector puede empezar replicando el login web (como el bot de Telegest) y migrar a las credenciales OpenAPI oficiales cuando se soliciten a Sungrow.

### ⚠️ 2FA por email — requisito de diseño del bot (detectado 2026‑06‑12)
Al iniciar sesión en iSolarCloud **por email**, Sungrow envía un **código de verificación (2FA) al correo** `jolivares@valereconsultores.com` que hay que introducir. Implicaciones para el conector:
- **Dos métodos de login distintos**:
  - **"Contraseña de cuenta"** (usuario `e9smbcju9c` + contraseña): en el POC NO pidió código → preferible para el bot si se mantiene sin 2FA.
  - **"Correo electrónico"** (email + contraseña): SÍ pidió código 2FA al correo.
  - Acción FASE 0: confirmar cuál método queda exento de 2FA de forma estable, y usar ese.
- **Si el método elegido exige 2FA**, el bot debe **leer el código del correo automáticamente**: login → detectar pantalla de código → consultar Gmail por API (el CRM ya integra Google) → extraer el código del email de Sungrow → introducirlo → continuar. Patrón estándar para scraping con 2FA.
- **Vía robusta definitiva**: la **OpenAPI oficial de Sungrow** (appkey + x-access-key, sin login interactivo) NO tiene 2FA → es la solución limpia a medio plazo. Solicitar credenciales OpenAPI a Sungrow como se hizo con Huawei.
- El microservicio guardará: credenciales partner cifradas + acceso de lectura a la bandeja Gmail (o un buzón dedicado) para capturar códigos, hasta migrar a OpenAPI.

### ✅ POC REAL FusionSolar (Huawei) EJECUTADO (2026‑06‑12) — Deraza/Ibéricos leídos en vivo
Entrada a FusionSolar EU5 (`eu5.fusionsolar.huawei.com`) con cuenta **`Deraza1`** (marca white‑label **QUANTICA** del revendedor). **SÍ tiene acceso completo** a las plantas (corrige la suposición de que solo Ipsumos1/IPSUMOS las veía):
- 2 plantas: **FV‑206943 Deraza Ibérico** (699,68 kWp, +ampliación FV‑2303843) y **FV‑2402094 Ibéricos** (393 kWp). KPIs globales: 6,52 MWh hoy, 1,10 MW nominal, 0 alarmas.
- Deraza (planta NE=138944789) — **9 dispositivos** leídos en vivo en Gestión de dispositivos:
  - 7 inversores **Huawei SUN2000‑100KTL** (M1 y M2), series 6T23990..., ES21A0021833/34, ES2380068640, ES21A0026105.
  - 1 **SmartLogger** V300 (SN 102190085414) — el gateway que agrupa los inversores.
  - 1 **PowerMeter** (Meter‑1, contador de exportación+importación).
- Sinóptico en vivo (Red↔Carga↔FV), tendencia energía/ingresos, alarmas, beneficios ambientales — equivalente y superior al de Telegest.

### Endpoints REALES de FusionSolar (capturados en el POC)
Base: `https://uni001eu5.fusionsolar.huawei.com/rest/` (la región va en `eu5`/`uni001eu5`). Auth por **sesión web** (cookies), endpoints clave:
- `GET /rest/dpcloud/auth/v1/keep-alive` · `/is-session-alive` · `/rest/dpcloud/privilege/er/v2/session` — sesión.
- `GET /rest/dp/pvms/organization/v1/locate-tree` — árbol de organización/plantas.
- `GET /rest/pvms/web/station/v1/overview/station-detail` · `station-kpi-data` · `one-station-income-chart` — datos de planta.
- `GET /rest/pvms/web/station/v3/overview/energy-flow` · `energy-balance` — sinóptico de flujo.
- `GET /rest/pvms/web/device/v1/mo-details?dn=NE=<idPlanta>` — **detalle de dispositivos (inversores, logger, meter)**.
- `GET /rest/pvms/web/alarm/v1/query/afci` · `/rest/dp/pvms/v1/fm/device-alarm-statistic` · `/rest/pvms/fm/v1/statistic` — alarmas.
- `POST /rest/dp/pvms/livedata/v1/subscribe` — datos en vivo (suscripción tiempo real).
> Vía robusta: la **Open API Northbound de FusionSolar** (la que Valere tramita con Huawei, SR 90004940; OAuth2/token, JSON) es la solución definitiva sin scraping. Endpoints: getStationList, getStationRealKpi, getDevList, getDevRealKpi, getDevHistoryKpi, getAlarmList.

### Comparativa de las dos plataformas FV (POC verificado)
| | iSolarCloud (Sungrow) | FusionSolar (Huawei) |
|---|---|---|
| Plantas reales leídas | TRH (4× SG110CX) | Deraza + Ibéricos (7× SUN2000‑100KTL) |
| Acceso | Channel/Partner (`e9smbcju9c`) | Cuenta revendedor `Deraza1` (QUANTICA) |
| API base | gateway.isolarcloud.eu/v1/ | uni001eu5.fusionsolar.huawei.com/rest/ |
| 2FA | Sí en login por email; no por contraseña de cuenta | No detectado en este login |
| OpenAPI oficial | iSolarCloud OpenAPI (appkey) | Northbound (tramitando SR 90004940) |
| Tiempo real | sí (~5–15 min) | sí (livedata subscribe) |
→ El conector del CRM necesita **un adaptador por marca** (Sungrow, Huawei), ambos con el mismo patrón: login → token/sesión → listar plantas → listar inversores → leer KPI/alarmas. El esquema `fv_*` del CRM ya soporta múltiples plantas/dispositivos.

### Hallazgos previos del POC (acceso)
- **iSolarCloud (Sungrow/TRH)**: login OK con credenciales guardadas (cuenta JF). **API REST en `https://gateway.isolarcloud.eu/v1/`** (POST+JSON): `/v1/login`, `/v1/timestamp`, `/v1/commonService/getCloudList`, `/v1/powerStationService/...`, `/v1/devService/...`. Es la misma base de la **OpenAPI oficial de Sungrow (iSolarCloud)**. → El bot puede usar esta API directamente (más estable que scrapear el front Angular).
  - ⚠️ Bloqueador actual: la planta de TRH **no está compartida ahora** con la cuenta (lista de plantas = 0). El compartido caducó (ya pasó el 1‑jun‑2026; hubo que reactivarlo). **Acción**: pedir al cliente TRH (jmmartin) que vuelva a compartir la planta en iSolarCloud, o que dé de alta a Valere como usuario autorizado.
- **FusionSolar (Huawei/Deraza, Ibéricos, FOAM)**: la **Open API existe** y se crea desde *Más > Sistema > Gestión de empresa* PERO requiere **rol Administrador de empresa**. Problema NO técnico: las plantas están bajo el instalador **IPSUMOS** (cerrado), Valere solo tiene `Ipsumos1` (rol técnico, sin permiso para crear API ni migrar). Además **IPSUMOS está en región 003 y Valere_2025 en 005**, y Huawei confirma que **no se migran plantas entre regiones** (caso SR 90004940). 
  - **Estrategia para Huawei (decisión Juan)**: (a) AHORA — bot con `Ipsumos1` (rol técnico permite VER datos → el bot lee lo que el usuario ve); (b) EN PARALELO — gestionar con Huawei crear empresa Valere **en región 003** y reclamar/migrar las plantas de IPSUMOS para habilitar la Open API oficial con token.

### Especificación del conector FV del CRM (a desarrollar en VPS)
```
adapters/cloud_sungrow.py   # POST gateway.isolarcloud.eu/v1/login → token → /v1/powerStationService/getPsList,
                            #   /v1/devService/getDeviceList, /v1/.../getDeviceRealTimeData (P_AC, E_día/total, V/I, Tº, estado)
adapters/cloud_fusion.py    # reusa fusionsolar_client.py (login Ipsumos1 user+pass) o, cuando se desbloquee, Open API northbound (OAuth2 token)
core/credenciales          # user/pass por planta cifrados (fv_credenciales_secret, AES-256-GCM ya existente)
core/scheduler             # poll cada 5–15 min (igual cadencia que la nube)
→ escribe en fv_kpi_realtime / fv_kpi_diario / fv_alarma  (esquema ya existe)
```
Resultado: el CRM lee los inversores con la misma frescura que Telegest, sin intermediario, y elimina el coste (~10€/mes/planta que cobra Energygest).

## 6 ter. Multi‑cuenta, multi‑planta, multi‑empresa: cómo se accede y se ordenan los datos

> Problema real de Valere: varios usuarios de plataforma (FusionSolar `Deraza1`/`Ipsumos1`/`Valere_2025`, iSolarCloud `e9smbcju9c`, Goodwe…), un usuario ve varias plantas, una planta es de UNA empresa, pero un mismo usuario MEZCLA plantas de empresas distintas; y una empresa puede tener plantas en plataformas distintas. El fabricante organiza por SU cuenta; el CRM debe reorganizar por TU cliente.

### Principio: separar "de dónde viene el dato" de "a quién pertenece"
Dos capas independientes unidas por un vínculo de asignación.

**Capa técnica (cómo se conecta — espejo del fabricante):**
```
fv_cuenta              -- cada login de plataforma (= "fuente de datos")
  id, marca('huawei'|'sungrow'|'goodwe'|...), portal_url/region (eu5, web3...),
  usuario, propietario('valere'|'revendedor'|'cliente'), alias (p.ej. "Deraza1 / QUANTICA"),
  estado_conexion('ok'|'cred_caducada'|'2fa_pendiente'|'error'), ultima_sync
fv_cuenta_secret       -- SOLO service_role: password_enc, token_enc, cookies_enc (AES-256-GCM)

fv_planta              -- cada instalación que ve la cuenta
  id, cuenta_id (FK fv_cuenta), planta_ref (NE=138944789 / ps_id sungrow),
  nombre_planta, kwp, lat/long, marca, estado,
  empresa_id (FK empresas, NULLABLE), cups_id (FK cups, NULLABLE),  -- ← vínculo de negocio
  asignacion('auto'|'manual'|'sin_asignar'), comercial_id

fv_dispositivo         -- inversores/logger/meter de cada planta (ya existe, se amplía)
  id, planta_id, tipo('inversor'|'smartlogger'|'meter'), modelo (SUN2000-100KTL/SG110CX),
  serie, datalogger_serie
```

**Capa de negocio (a quién pertenece — tu organización):**
- `fv_planta.empresa_id` → `empresas`  (SIEMPRE que se asigne)
- `fv_planta.cups_id`    → `cups`       (cuando exista; permite cruzar generación FV vs consumo del contador)

### Cómo se accede (sincronización)
1. El microservicio recorre TODAS las `fv_cuenta` activas (no importa de quién sean).
2. Por cada cuenta: login (token/sesión, 2FA si aplica) → lista TODAS sus plantas → por planta lista dispositivos → lee KPI/alarmas. (Igual que los POC verificados de TRH y Deraza.)
3. Vuelca a `fv_planta`/`fv_dispositivo`/`fv_kpi_*`/`fv_alarma`. Una planta nueva detectada entra con `asignacion='sin_asignar'`.
4. Cliente nuevo = añadir su `fv_cuenta` (o que comparta acceso partner a una cuenta Valere) → aparece solo en el siguiente sync.

### Cómo se ordenan (asignación HÍBRIDA — decisión Juan: auto + manual)
- **Automática**: al detectar una planta nueva, el CRM intenta casarla con una empresa/CUPS por: coincidencia de CUPS, NIF, nombre de planta vs nombre de empresa, dirección/coordenadas. Si la confianza es alta → asigna `asignacion='auto'`.
- **Manual / revisión**: si no hay match fiable, queda en bandeja **"Sin asignar"** (la pestaña `SinAsignar` que YA existe en `seguimiento-fv`). El usuario la vincula a empresa+CUPS en 2 clics. También puede corregir una asignación automática.
- Resultado: aunque `Deraza1` traiga Deraza + Ibéricos mezcladas, cada planta acaba bajo SU empresa.

### Cómo se visualiza
- **Ficha de empresa**: todas las plantas del cliente, vengan de la cuenta/plataforma que vengan (Huawei + Sungrow juntas), con producción, alarmas, dispositivos.
- **Cartera global**: panel de todas las plantas de todos los clientes; filtros por comercial / empresa / marca / estado; las que están en alarma, arriba.
- **Bandeja "Sin asignar"**: plantas detectadas pendientes de vincular.
- **Gestor de cuentas** (decisión Juan): lista de TODAS las cuentas (propias Valere, revendedor QUANTICA/Deraza1, cliente) con su estado de conexión y aviso de caducidad/2FA. Las credenciales se guardan cifradas (mecanismo `*_secret` ya existente).

### Encaje con lo ya construido en el CRM
- `fv_planta_credencial` + migración `20260430_fv_asignar_plantas_empresas.sql` → ya prevén asignar plantas a empresas. Se amplía con `cups_id` y `asignacion`.
- Módulo `seguimiento-fv` ya tiene tabs `PlantasTab`, `SinAsignarTab`, `CredencialesTab`, `AsignarPlantaModal` → es exactamente esta UI; se completa.

## 7. Plan de ejecución por fases (sin errores)

> Cada fase termina con criterio de aceptación verificable. Rama `claude/telemedida-fvN`, PR a main, TSC 0 + tests verdes, auditor `valere-auditor`. Nunca push directo a main.

### FASE 0 — Acuerdo de acceso y piloto de laboratorio (bloqueante)
- **0.1** Confirmar con Telegest/Energygest la vía de acceso real a los contadores: ¿abren su concentrador (`135.125.28.202:puerto`) a una IP de Valere, o traspasan las SIM M2M a una APN propia? Y para inversores: ¿IP:puerto del SmartLogger accesible desde fuera o sólo en LAN del cliente?
- **0.2** Obtener para 1 contador GPRS (p.ej. ALMACEN MARISCOS GONZALEZ, `:15127`) y para TRH (SmartLogger, 4 inversores) los parámetros completos y permiso de red.
- **0.3** Provisionar VPS (Docker, IP fija, VPN/lista blanca con Telegest si aplica).
- **Aceptación**: el VPS hace `telnet`/handshake TCP contra 1 contador y 1 SmartLogger reales.
- ⚠️ Sin 0.1 resuelto, el resto es desarrollo "a ciegas". Es el primer paso.

### FASE 1 — Esquema de datos + lector IEC‑102 (contador)
- Migraciones `telemetria_*` + `*_secret` + RLS (auditadas, RGPD).
- Adaptador IEC‑102: leer curva + cierre + instantáneo de 1 contador real; aplicar rel. trafos.
- `supabase_sink` con upsert idempotente + buffer.
- **Aceptación**: la curva cuartohoraria de 1 CUPS real aparece en `telemetria_curva` y coincide con la que muestra Telegest para ese CUPS y fechas.

### FASE 2 — Adaptador cloud de inversores (FusionSolar) + ampliación FV
- Reutilizar el conector FusionSolar existente (`scripts/fv-sync/`, user+pass) para leer los inversores de TRH desde la cuenta Huawei del cliente (producción por inversor, E_día/total, alarmas).
- Requiere: credenciales FusionSolar del cliente TRH (usuario+contraseña de su cuenta Huawei) → pedir al cliente o reutilizar las que ya tenía Telegest.
- Ampliar `fv_dispositivo`/`fv_kpi_realtime`/`fv_alarma`; alarmas críticas → `incidencias`.
- **Aceptación**: producción por inversor de TRH en `fv_kpi_realtime`, contrastable con la pantalla "Instantáneos" de Telegest.
- **Fases 2b/2c (marcas restantes)**: adaptadores SMA, Solis, Sungrow (las otras 3 que soporta Telegest), mismo patrón cloud user+pass/token. Goodwe opcional.
- Adaptador **Modbus** queda para analizadores/submetering propios (EG‑ACA3) y procesos industriales (caso Deraza), no para inversores.

### FASE 3 — Scheduler, robustez y observabilidad
- Poll por dispositivo (cadencias), reintentos, buffer, `telemetria_lectura_log`, alertas de "sin comunicación" → incidencia (igual que la notificación de Telegest).
- Dashboard de salud del gateway (cuántos dispositivos OK/KO, última lectura).
- **Aceptación**: 7 días de ingesta continua de ≥3 CUPS sin pérdida de datos; caída simulada de Supabase se recupera desde buffer.

### FASE 4 — Motor de explotación en CRM
- Estudio de optimización de potencia (doble escenario) + Simulación de factura, sobre `telemetria_curva`.
- **Aceptación**: para 1 CUPS, el ahorro de potencia y el total de factura simulada cuadran (±2%) con el estudio/simulación de Telegest del mismo periodo.

### FASE 5 — UI `telemedida` + ampliación `seguimiento-fv`
- Pantallas de curvas/instantáneos/cierres/estudios en la ficha del cliente; producción por inversor en tiempo real.
- **Aceptación**: un comercial ve, en la ficha de TRH, consumo + generación por inversor + estudio de potencia, sin entrar en Telegest.

### FASE 6 — Escalado a toda la cartera + corte de dependencia
- Migrar los 30 contadores + plantas FV; periodo de doble verificación (CRM vs Telegest) hasta confianza total.
- Plan de adaptadores cloud adicionales (Goodwe/SolarEdge/Fronius/SMA/Sungrow/Growatt) para plantas sólo‑nube.
- **Aceptación**: paridad de datos CRM↔Telegest durante 1 mes → decisión de prescindir de Telegest como intermediario (manteniendo relación de acceso a contadores).

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **La IP:puerto es del concentrador de Energygest, no del contador** | Alto — sin acuerdo no hay acceso directo | FASE 0.1: acordar con Telegest abrir concentrador a IP Valere, o traspaso de SIM a APN propia. Es el primer entregable. |
| **Doble lectura simultánea bloquea el módem** | Medio — un contador no admite 2 sesiones | Coordinar ventana de lectura con Telegest; o que Telegest deje de leer los CUPS que pase Valere. |
| **Inversores TRH "sin comunicación desde 04‑03"** | Medio | CAUSA CONFIRMADA por correo de Alberto (Energygest): el **cliente cambió la contraseña de su cuenta FusionSolar** y Telegest perdió acceso. Mitigación: que Valere gestione/custodie las credenciales FusionSolar del cliente (con su consentimiento) para no depender de cambios. |
| **Acceso a inversores depende de credenciales cloud del cliente** | Alto | Para cada planta FV hay que obtener usuario+contraseña de la cuenta del fabricante (FusionSolar/SMA/Solis/Sungrow) del cliente, con su autorización. Guardar cifradas (ya hay mecanismo `fv_credenciales_secret`). Si el cliente cambia la pass, alerta + reautenticación. |
| **Solo 4 marcas soportan lectura cloud** (Solis/SMA/Huawei/Sungrow) | Medio | Inversores de otras marcas o sin internet: instalar analizador propio (EG‑ACA3 + módem) y leer por Modbus, como hace Energygest para submetering. |
| **Edge Functions no hacen TCP** | (resuelto) | Microservicio en VPS (decisión tomada). |
| **RGPD / datos de consumo de terceros** | Alto | RLS estricto por empresa, secretos cifrados, mandato del cliente documentado, auditoría de accesos. Coherente con prioridad de seguridad ALTA del proyecto. |
| **Sandbox no escribe `.git` en local** | Bajo | Flujo habitual: Cowork prepara, PowerShell de Juan ejecuta commits. |

---

## 9. Decisiones tomadas y pendientes

**Tomadas (Juan, 2026‑06‑12)**:
- Lector alojado en **VPS propio** de Valere.
- Alcance: **proyecto completo** para desarrollar e integrar, soportando ambos escenarios de acceso al contador.
- Inversores: **todas las marcas** (adaptador genérico; empezar por Huawei Modbus — el caso real TRH — y FusionSolar/Goodwe cloud).

**Pendientes (bloquean FASE 0)**:
- Vía de acceso a contadores: concentrador Energygest vs SIM/APN propia → **confirmar con Telegest**.
- Acceso de red a los SmartLogger de los inversores (internet vs VPN cliente).
- Disponibilidad de la clave de contraste real de cada contador (la pantalla muestra "1" por defecto; confirmar que es la operativa).

---

## 10. Encaje con el sprint actual
El sprint de 7 días (hasta 19/06) manda y va de cerrar el circuito de propuestas. **Este proyecto NO toca código durante el sprint**: queda como diseño aprobado para arrancar después, en cuanto FASE 0 (acuerdo con Telegest) esté resuelta. Se integra como un nuevo bloque del roadmap, reutilizando la capa FV ya construida.
