# Análisis estratégico y auditoría — Valere CRM v2

> **Fecha:** 2026-06-10 · **Autor:** Claude (Fable 5, sesión Cowork) · **Solicitado por:** Juan
> **Alcance:** auditoría técnica completa (repo + Supabase en vivo), diagnóstico de utilidad, diseño de integraciones (Datadis, SIPS, telemedida, plataformas FV), reestructuración y roadmap práctico.

---

## 1. Resumen ejecutivo — mi opinión sin filtros

**El problema del CRM Valere no es falta de desarrollo. Es falta de circulación de datos y de cierre de circuitos.**

Tras auditar los 206 archivos TS/TSX (~53.000 líneas), las 83 tablas de Supabase en producción y los 14 Edge Functions desplegados, la conclusión es contraintuitiva: **el CRM está mucho más construido de lo que percibes**. Tienes 24 features funcionales, un motor de cálculo energético production-ready, integración Datadis con proxy y caché, módulo FV sincronizando 7 plantas FusionSolar (113 kWp), pipeline de tarifas por email, integración Holded, RBAC testeado, auditoría inmutable y RLS en todas las tablas.

**Entonces, ¿por qué lo percibes "poco útil"? Porque los datos no fluyen y los circuitos no cierran:**

| Síntoma | Evidencia en producción |
|---|---|
| No se generan propuestas | `proposals`: **0 filas**. `propuestas`: **0 filas**. `proposal_email_drafts`: **0 filas** |
| No hay facturas cargadas | `facturas`: **0 filas** (¡con 73 CUPS y 53 empresas dadas de alta!) |
| Datadis no vuelca consumos | `datadis_consumptions`: **0 filas**, `consentimientos_datadis`: **0 filas** (el proxy funciona: 44 entradas en caché) |
| El análisis no persiste | `/analisis` calcula y compara, pero **no guarda** en `proposals` ni genera PDF |
| Pipeline tarifas sin uso | `tariff_staging`, `tariff_extractions`, `tariff_sources`: **0 filas** |
| Módulos fantasma | `incidencias`, `renovaciones`, `eventos`, `notificaciones`, `tareas`, `alertas`: **0 filas** |

El patrón es claro: **se ha construido infraestructura en anchura (muchos módulos) en vez de cerrar en profundidad el flujo que genera dinero**: `dato de consumo → análisis → propuesta → documento presentable → envío → firma → contrato → seguimiento`. Hoy ese flujo está roto en 3 puntos: la entrada (consumos no entran solos), el medio (el análisis no se convierte en propuesta) y la salida (no existe generador de documento de propuesta).

**Mi recomendación central: congelar la apertura de módulos nuevos durante 6-8 semanas y dedicar todo el esfuerzo a cerrar el circuito de propuesta de punta a punta.** Es exactamente la "dirección más práctica" que pides. El detalle está en las secciones 5-7.

---

## 2. Auditoría técnica — estado real

### 2.1 Salud del código: 8/10

Lo bueno (verificado, no asumido):

- Arquitectura limpia: solo `src/features/` + `src/core/`, sin carpetas prohibidas, sin imports rotos, **cero** `as any`/`as never` salvo 1 cast acotado en `DatosPage.tsx:268`, **cero** TODOs/FIXMEs.
- `src/core/energia/calculator.ts`: motor de 8 fases (potencia, energía regulada BOE, energía libre fija/indexada, SSAA, fee Valere, baterías, excedentes, IEE+IVA), endurecido contra null/undefined. **Production-ready.**
- RBAC (`src/core/auth/permissions.ts`) con cobertura de tests excelente.
- 105.296 filas de precios pool horarios (ESIOS) cacheadas en `precios_pool_horarios` — la base del cálculo indexado está alimentada y viva.

Lo malo:

| # | Hallazgo | Gravedad | Detalle |
|---|---|---|---|
| F1 | **Generación de PDF fantasma** | 🔴 Crítico | `proposals.pdf_url` existe en schema, `@react-pdf/renderer` y `pdf-lib` están instalados, pero **ningún código los usa**. El botón "Descargar PDF" solo abre una URL que nunca se rellena. |
| F2 | **`/analisis` no persiste** | 🔴 Crítico | Calcula comparativas y grafica, pero no tiene botón "Guardar como propuesta". `/propuestas-energia` y `/tracking` listan una tabla que siempre estará vacía. |
| F3 | **Doble entidad de propuestas** | 🔴 Crítico | `proposals` (calculadora, EN) y `propuestas` (CRM, ES) coexisten, ambas a 0 filas. Nadie sabe cuál es la canónica. Hay que fusionarlas YA, antes de que tengan datos. |
| F4 | Cobertura de tests ~12% | 🟡 Media | El núcleo está testeado pero `calculateSimulatedInvoice()` (la función más importante del negocio) **no tiene test**. Tampoco datadis ni seguimiento-fv. |
| F5 | Features huérfanas | 🟡 Media | `chat-ia` (panel sin ruta), `documentos/` (API stub sin UI a pesar de 108 docs en BD), `notificaciones` (API sin disparadores). |
| F6 | Tipos dinámicos `consumption_p1..p6` | 🟢 Leve | Cast a `Record<string, number>` — frágil si cambia el schema. |

### 2.2 Salud de Supabase: 6/10 — aquí sí hay deuda seria

El advisor de seguridad devuelve **83 avisos**. Resumen priorizado:

| Prioridad | Aviso | Afecta a | Acción |
|---|---|---|---|
| 🔴 ERROR | `security_definer_view` | `retailer_offers`, `fv_credenciales_safe`, `fv_sync_health_latest` | Las vistas SECURITY DEFINER **saltan el RLS** del consultante. Revisar y pasar a `security_invoker = true` o justificar por escrito. |
| 🔴 ALTA | `anon_security_definer_function_executable` (27 funciones) | `admin_reject_user`, `editar_campo_empresa`, `crear_lead_captacion`, `fv_upsert_planta`, etc. | **El rol `anon` puede ejecutar funciones SECURITY DEFINER de escritura.** `REVOKE EXECUTE FROM anon` en todas y `FROM authenticated` en las administrativas, con `GRANT` selectivo. Para un CRM con RGPD y prioridad seguridad ALTA, esto es lo primero. |
| 🟠 MEDIA | `function_search_path_mutable` (16 funciones) | `valida_nif_cif`, `holded_mask_iban`, `fv_is_admin`... | Añadir `SET search_path = public, pg_temp` a cada una (riesgo de hijacking de schema). |
| 🟠 MEDIA | `auth_leaked_password_protection` desactivado | Auth global | Activar en Dashboard → Auth → Settings. 2 minutos. |
| 🟡 BAJA | RLS sin policies | `fv_credenciales_secret` + 3 tablas `*_backup_20260511` | `fv_credenciales_secret` es correcto (solo service_role). Las backup de mayo: **eliminar**. |
| 🟡 BAJA | `rls_policy_always_true` | `alertas`, `datadis_supply_price_terms` | Endurecer cuando se activen esos módulos. |

### 2.3 Higiene de datos

- **7 tablas `_migration_*_map`** siguen en producción desde abril. Archivar (export CSV a `documentos`) y eliminar.
- **3 tablas `*_backup_20260511`** — eliminar tras verificar.
- `savings_calculations` (41 filas, módulo Potencias) calcula ahorros **en paralelo** al calculator de energía. Dos motores de ahorro = dos verdades. Converger a medio plazo.
- Desalineación documental: `CLAUDE.md` describe 22 tablas; producción tiene **83**. La documentación de schema está 2 meses por detrás de la realidad (los módulos potencias, FV, Datadis, Holded, captación no están reflejados). Esto degrada a todos los agentes que trabajan en el repo.

---

## 3. Diagnóstico de utilidad — por qué "no sirve" todavía

Visto desde el flujo de trabajo real de Valere (consultoría energética que vive de comparar, proponer y renovar):

1. **El dato de consumo entra a mano o no entra.** `/datos` exige teclear factura a factura. Datadis está integrado a nivel técnico pero el circuito de consentimiento del cliente (autorización de tercero en datadis.es) nunca se ha ejercitado (`consentimientos_datadis` = 0). Y no hay importador de Excel SIPS, que es como trabajáis hoy.
2. **El análisis es un callejón sin salida.** Carolina o un analista pueden simular ofertas en `/analisis`, ver el gráfico... y nada más. Para presentar al cliente tienen que rehacer todo en otro sitio (probablemente en el Excel/diseño de "comparativas comercializadoras" que estás trabajando en el otro proyecto). **El CRM compite contra vuestro propio Excel y pierde.**
3. **No hay documento de salida.** Una consultora vende un documento bonito con su marca. El CRM no lo produce. Mientras no lo produzca, el equipo no tiene motivo para meter los datos en él.
4. **La percepción de "poco desarrollado" es en realidad "poco conectado".** Las piezas existen (motor, ofertas, pool, Datadis, FV) pero como islas. Conectarlas cuesta semanas, no meses, porque ya están construidas.

---

## 4. Diseño de integraciones clave

### 4.1 Datadis (corto plazo — la vía con mejor coste/beneficio)

**Estado actual:** Edge Function `datadis-proxy` desplegada (v13), caché persistente funcionando (44 entradas), feature `/datadis` completa con detalle por CUPS, normalizador 30TD testeado. **Falta el flujo de negocio, no la técnica.**

Datadis permite que el titular autorice a un tercero (Valere, con su NIF) a consultar sus datos; la API privada de autorizados expone suministros, contratos, consumos horarios y potencias máximas por CUPS.

**Diseño propuesto (Fase D1–D3):**

```
D1. Flujo de consentimiento
    EmpresaDetailPage → botón "Solicitar acceso Datadis"
    → genera email (plantilla Resend) con instrucciones para que el cliente
      autorice el NIF de Valere en datadis.es (autorización de terceros)
    → registra en consentimientos_datadis (estado: solicitado/activo/caducado)

D2. Sincronización programada
    pg_cron diario → Edge Function datadis-sync (nueva, reutiliza datadis-proxy)
    → por cada consentimiento activo: getConsumptionData + getMaxPower
    → upsert en datadis_consumptions (curva horaria)
    → agregación mensual → upsert en facturas (consumption_p1..p6 vía periodos30TD.ts)
    ⚠️ ESTE ES EL PUENTE QUE FALTA: datadis_consumptions → facturas.
       Con él, /analisis funciona sin teclear nada.

D3. Salud del dato
    Vista v_cobertura_consumos: por CUPS, % de meses con dato (manual/datadis/sips)
    Widget en dashboard: "X CUPS sin datos de consumo" → accionable
```

### 4.2 SIPS (corto plazo — realismo regulatorio)

La base SIPS de la CNMC y su API de consulta individualizada (`api.cnmc.gob.es/verticales/v1/SIPS/consulta/...`) **solo es accesible para comercializadoras autorizadas por la CNMC** — una consultora no puede acceder directamente ni revender el contenido.

Opciones reales, en orden recomendado:

1. **Importador Excel SIPS (hacer YA).** Es lo que pides y lo más práctico: seguís sacando SIPS por vuestros canales actuales y el CRM lo ingiere. Nueva pestaña en `/importador`: parser del formato SIPS estándar (CSV/XLSX de columnas CNMC: CUPS, tarifa, potencias contratadas P1-P6, consumos anuales por periodo, fecha último cambio comercializadora...) → upsert `cups` + crea filas de consumo de referencia en `facturas` (marcadas `origen='sips'`). La tabla `excel_import_templates` ya existe (0 filas) — está pensada exactamente para esto.
2. **Acuerdo con comercializadora colaboradora** que os pase consultas individualizadas bajo su acceso (habitual en el sector, pero el dato no se puede almacenar masivamente — revisar contrato).
3. **Proveedores de datos comerciales** (APIs de terceros del sector que ya gestionan el acceso). Evaluar coste vs. volumen.

> Nota RGPD: el dato SIPS/Datadis de un CUPS es dato personal si el titular es persona física. El flujo de consentimiento (D1) os cubre también jurídicamente. Registrarlo siempre.

### 4.3 Telemedida directa (medio plazo — solo donde aporte)

Para contadores tipo 3 (y 1-2 si la distribuidora no os da curva), la lectura directa usa **IEC 60870-5-102** sobre pasarelas IP/GPRS — y dices que ya tenéis puertas de enlace de los proveedores.

**Principio de diseño: el CRM nunca habla IEC-102 directamente.** Ese protocolo requiere un colector con sesión serie/TCP dedicada, reintentos, ventanas horarias. Arquitectura:

```
Contador (IEC 60870-5-102)
  └─ Pasarela IP/GPRS del proveedor (ya la tenéis)
       └─ COLECTOR: 3 opciones según pasarela
          a) El software/cloud del proveedor de la pasarela ya expone API/FTP/email
             → conector ligero (Edge Function o escenario Make) que recoge y normaliza
          b) Pasarela "tonta" (solo túnel TCP) → microservicio Python con librería
             iec870-5-102 en un VPS pequeño, cron cada 6-24h, igual que el sync FV
          c) Plataformas tipo Circutor/Enerclic/ResEnergie con servicio de telemedida
             → consumir su API
       └─ Edge Function `telemetry-ingest` (token x-ingest, patrón idéntico a
          tariffs-ingest que ya tenéis funcionando)
            └─ tabla `curvas_carga` (cups_id, timestamp, kwh, origen)
                 └─ misma agregación mensual → `facturas` (origen='telemedida')
```

**Decisión clave que te pido (sección 8):** qué pasarelas/fabricantes tenéis exactamente. El conector cambia por completo según sean Circutor, Satel, Enerclic u otra.

**Prioridad honesta:** para el 90% de vuestros clientes, Datadis da la misma curva horaria sin hardware ni protocolo. La telemedida directa solo compensa para clientes de alta tensión tipo 1-2 donde necesitéis dato cuartohorario inmediato o donde Datadis falle. La pondría detrás de Datadis y SIPS en el roadmap.

### 4.4 Plataformas fotovoltaicas (FusionSolar ya está — replicar el patrón)

**Lo que ya tienes y funciona:** módulo `seguimiento-fv` completo (15 archivos), 14 tablas `fv_*`, credenciales cifradas en `fv_credenciales_secret` (solo service_role — bien hecho), sync con log y auditoría, 7 plantas FusionSolar con KPIs diarios e informes mensuales. La columna `fv_planta.plataforma` ya es discriminante: **la arquitectura multi-plataforma está preparada.**

Plan de extensión por adaptadores:

| Plataforma | API | Particularidades | Esfuerzo |
|---|---|---|---|
| **Huawei FusionSolar** | Northbound/OpenAPI | ✅ Hecho. Ojo: límites de rate estrictos y 1 sesión de login — centralizar el token | — |
| **GoodWe SEMS** | OpenAPI (cuenta organización SEMS) + API tiempo real | Requiere solicitar cuenta de organización a GoodWe; devuelve datos de todos los equipos de la organización | ~1 semana |
| **SMA / Sungrow / otros ("seems" → SEMS de GoodWe)** | Sunny Portal API / iSolarCloud OpenAPI | Mismo patrón: credencial por integrador → plantas → KPI diario | ~1 semana c/u |
| **Genérico** | — | Para marcas menores: import CSV manual de producción mensual | 2 días |

Diseño: interfaz `FVAdapter { listPlants(), getDailyKpis(), getAlarms() }` en el worker de sync; cada plataforma una implementación; `fv_planta.plataforma` enruta. **Antes de añadir GoodWe, definir el adaptador extrayendo lo de FusionSolar** — si no, el segundo proveedor duplicará el código del primero.

**Cruce de oro (nadie en vuestra competencia pequeña lo hace):** `fv_kpi_diario` (producción) × `datadis_consumptions` (consumo) × `precios_pool_horarios` (precio) = **informe mensual automático de autoconsumo real con ahorro en €**. Las tres tablas ya existen. Es la feature de fidelización perfecta y un motivo para que el cliente os pase el consentimiento Datadis.

---

## 5. El circuito de propuestas — la prioridad nº 1

Flujo objetivo, con lo que ya existe marcado:

```
ENTRADA          ✅ /datos (manual) + 🔨 SIPS Excel + 🔨 Datadis sync + (⏳ telemedida)
                     ↓ (todas convergen en `facturas` con campo `origen`)
ANÁLISIS         ✅ /analisis (motor 8 fases, 29 ofertas reales, pool ESIOS vivo)
                     ↓ 🔨 botón "Generar propuesta" (NO EXISTE — es el corte principal)
PROPUESTA        🔨 unificar `proposals`+`propuestas` → una sola tabla
                 🔨 generador de documento con el diseño de "comparativas
                    comercializadoras" (tu otro proyecto Cowork) como plantilla
                    Recomendación técnica: HTML+CSS de marca → PDF en Edge Function
                    (más fiel al diseño que @react-pdf; se reaprovecha como vista web)
ENVÍO            ✅ Resend ya configurado · ✅ proposal_email_drafts ya existe (0 filas)
                 🔨 envío con tracking de apertura (webhook Resend → estado propuesta)
SEGUIMIENTO      ✅ /tracking + sprint Carolina (SLA 3d/5d) — conectar al estado real
CIERRE           ✅ /contratos + ✅ /renovaciones (vacíos hoy; se llenan solos cuando
                    el flujo anterior funcione)
```

Sobre el diseño de "comparativas comercializadoras": **necesito que me lo pases** (PDF de ejemplo, HTML o capturas) para convertirlo en plantilla. Es el dato que más me falta (sección 8).

---

## 6. Reestructuración y consolidación del CRM

1. **Unificar propuestas** (`proposals` + `propuestas` → `propuestas`, con `tipo: 'energetica'|'comercial'`). Hacerlo ahora que ambas están a 0 filas es gratis; en 3 meses será una migración dolorosa.
2. **Navegación por rol, no por inventario.** Hoy el menú expone ~30 rutas a todo el mundo. Carolina necesita 4 (captación, hoy, actividades, calendario); un analista otras 4 (datos, análisis, propuestas, datadis); tú lo ves todo. El RBAC ya existe (`puedeAccederRuta`) — falta aplicarlo al menú y agrupar: **Comercial** (captación, oportunidades, propuestas) / **Datos** (datos, datadis, importador) / **Operación** (contratos, renovaciones, incidencias, potencias, FV) / **Admin**.
3. **Matar o terminar las features huérfanas:** `chat-ia` (decidir: o ruta visible o borrar), `documentos` (la BD tiene 108 docs y la UI no existe — terminar la UI, es útil), `notificaciones` (conectar a los disparadores del sprint Carolina que ya envían recordatorios).
4. **Saneamiento Supabase:** REVOKEs de la sección 2.2, borrar `_migration_*` y `*_backup_*`, activar leaked password protection, `search_path` en las 16 funciones.
5. **Documentación = realidad:** regenerar la sección de schema de `CLAUDE.md` (83 tablas, módulos potencias/FV/datadis/holded) y regenerar tipos TS (`supabase gen types`) para eliminar los casts pendientes del sprint Carolina.
6. **Tests donde duele:** `calculateSimulatedInvoice()` con casos reales (2.0TD, 3.0TD, 6.1TD, indexado, excedentes) — es la función que pone números delante de un cliente. Un error ahí cuesta credibilidad, no un bug.

---

## 7. Roadmap práctico (sprints de 1-2 semanas, con criterio de "hecho")

| Sprint | Contenido | "Hecho" cuando... |
|---|---|---|
| **S1 — Seguridad y limpieza** | REVOKEs anon/authenticated, search_path, leaked password, borrar backups/_migration_, unificar tabla propuestas | Advisor sin ERRORs ni WARNs críticos; una sola tabla de propuestas |
| **S2 — Importador SIPS Excel** | Parser SIPS → `cups` + `facturas(origen='sips')`, pestaña en /importador, validación + preview | Subes un Excel SIPS real y /analisis funciona con esos CUPS sin teclear nada |
| **S3 — Circuito propuesta (núcleo)** | Botón "Generar propuesta" en /analisis → persiste en `propuestas` + plantilla HTML→PDF con diseño comparativas + descarga | De factura a PDF de propuesta con marca Valere en < 5 min |
| **S4 — Envío y tracking** | Envío Resend desde el CRM, webhook estados, conexión con SLA del sprint Carolina | Una propuesta enviada aparece en tracking con su estado real |
| **S5 — Datadis end-to-end** | Flujo consentimiento + cron sync + puente a `facturas` + widget cobertura | 1 cliente real autorizado y sus consumos entran solos cada noche |
| **S6 — FV multi-plataforma** | Refactor FVAdapter + conector GoodWe SEMS + informe autoconsumo (FV × Datadis × pool) | Una planta GoodWe sincroniza; informe mensual de ahorro autoconsumo generado |
| **S7+ — Telemedida** | Conector según pasarelas disponibles (decisión pendiente) | Curva de un contador tipo 3 entra vía telemetry-ingest |

Cada sprint termina con: TSC 0 errores, tests verdes, ESTADO.md actualizado, auditoría (skill valere-auditor) y **una demo usable por el equipo** — la adopción de Carolina y los analistas es la métrica real, no los commits.

---

## 8. Datos que me faltan / decisiones tuyas

1. **Diseño "comparativas comercializadoras":** pásame el documento/plantilla de tu otro proyecto Cowork (PDF ejemplo, HTML o capturas). Sin él no puedo hacer S3 con tu diseño.
2. **Excel SIPS de muestra:** un fichero real (anonimizado si quieres) del formato exacto que descargáis, para que el parser de S2 sea correcto a la primera.
3. **Pasarelas de telemedida:** ¿qué fabricante/modelo son las puertas de enlace que ya tenéis (Circutor, Satel, Enerclic, otras)? ¿Exponen API/portal o solo túnel TCP? Define la opción a/b/c de la sección 4.3.
4. **NIF autorizado en Datadis:** ¿Valere tiene ya cuenta de empresa en datadis.es para recibir autorizaciones de terceros? Si no, créala — es el prerequisito de S5.
5. **GoodWe SEMS:** ¿tenéis ya cuenta de organización SEMS o solo cuentas de planta? La OpenAPI exige cuenta de organización (se solicita a GoodWe).
6. **Prioridad S2 vs S3:** yo haría S2 (SIPS) antes que S3 (propuesta) solo si hoy tenéis un tapón de datos; si ya tenéis los consumos en Excels listos, S3 primero para enseñar resultado cuanto antes. Tu llamada.
7. **Visalia backfill** (dry_run aprobado el 04/06) sigue pendiente — ¿lo ejecuto en la próxima sesión o lo despriorizamos frente a este plan?

---

## 9. Veredicto

Tienes un proyecto técnicamente sano (8/10 de código) con un problema de **producto** (3/10 de circuito cerrado) y una deuda de seguridad en Supabase abordable en un sprint. No necesitas más módulos: necesitas que un analista pueda coger un Excel SIPS o un consentimiento Datadis, pulsar dos botones y salir con un PDF con tu diseño para el cliente. Todo lo demás —FV, telemedida, Holded, RAG— suma, pero ese circuito es el negocio. 6-8 semanas de foco lo cierran.

*Fuentes externas consultadas: [Datadis](https://datadis.es/) · [API SIPS consulta individualizada — CNMC](https://sede.cnmc.gob.es/documentacion/sistemas-verticales/sips-sistema-de-informacion-de-puntos-de-suministro-de-gas-y-electricidad/api-de-consulta-individualizada) · [FusionSolar Northbound API — Huawei](https://support.huawei.com/enterprise/en/doc/EDOC1100440661/356f0ec1/fusionsolar-northbound-api-integration) · [GoodWe API Introduction](https://community.goodwe.com/static/images/2022-11-08281223.pdf) · [Telemedida IEC 60870-5-102 — Circutor](https://circutor.com/articulos/la-instalacion-de-un-contador-fiscal-con-telemedida/) · [Cambio telemedida a IP — Matrix](https://www.matrix.es/novedades-y-formacion/cambio-de-telemedida-de-la-red-electrica-a-comunicaciones-ip-para-lecturas-del-protocolo-iec-870-5-102)*
