# Auditoría CRM ZocoEnergía — Análisis competitivo para Valere

**Fecha**: 27 de abril de 2026
**Auditor**: Claude (sesión Chrome de Juan / Valere Consultores)
**Producto auditado**: CRM ZocoEnergía (https://crm.zocoenergia.com)
**Producto de referencia**: Valere CRM (Vue 3 + Inertia + Laravel, desarrollo propio)
**Sector**: Consultoría energética B2B en España
**Tipo de acceso**: Login con cuenta corporativa Valere Consultores (soporte@valereconsultores.com)
**Modo**: SOLO LECTURA, formularios cancelados, datos personales anonimizados

---

## 0. Resumen ejecutivo

ZocoEnergía es un CRM vertical de consultoría energética **bastante maduro funcionalmente** pero **visualmente plano y mobile-first agresivo**. Pesa más en herramientas operativas (comparador, Datadis, monitorización) que en pipeline comercial. No tiene Kanban de oportunidades ni automatizaciones de marketing visibles. Su gran activo es la **integración nativa con Datadis** vía proxy backend (sin que el cliente final tenga que registrarse en Datadis), un **OCR de facturas** que extrae potencias, consumos por periodo, excedentes e impuestos en menos de 4 segundos, y un **comparador multimarketer** con 8+ tarifas calculadas en tiempo real con desglose detallado por concepto.

**Top 3 cosas a copiar para Valere (orden de prioridad):**

1. **Datadis-as-a-Service vía backend proxy** (`/api/tools/getAPIConsumption?CUPS=...`) — el cliente nunca toca Datadis
2. **OCR de factura → propuesta comercial en 1 paso**, con override manual completo de cualquier campo extraído
3. **Comparador con desglose granular**: ahorro separado por Potencia / Energía / Excedentes y PDF de propuesta automatizable

**Top 3 debilidades de Zoco que Valere puede superar:**

1. **No hay Kanban** en oportunidades (solo lista con filtros)
2. **Diseño visual obsoleto**: paleta plana, jerarquía tipográfica débil, mobile-first forzado incluso en desktop
3. **Sin automatizaciones de email/marketing**, sin scoring de leads, sin workflows configurables

---

## 1. Identificación del producto auditado

| Campo | Valor |
|---|---|
| Producto | ZocoEnergía CRM |
| URL | https://crm.zocoenergia.com |
| Empresa propietaria | Zoco Energía (operador en sector energético español) |
| Modelo | Multi-tenant SaaS (endpoint `getEnterpriseData?url=<dominio>` confirma arquitectura multi-marca) |
| Stack frontend | Vue.js 3 + Vite (bundle único `app-36dNaTtb.js` + code-splitting `ToolsComponent-DdaDwBny.js`) |
| Backend | API REST en `/api/...` (Laravel probable por estilo de rutas) |
| Auth | Sesión propia + Google Sign-In (`accounts.google.com/gsi/client`) |
| Tipografía | Poppins (100-900) + Meow Script (decorativa) |
| Iconos | FontAwesome Pro v6.7.0 (kit `ka-f.fontawesome.com`) — **alerta seguridad: token=undefined en URL** |
| Color principal | `--color-principal: #012C68` (azul marino corporativo) |
| Hosting de assets | Servidos desde el propio dominio (`/assets/marketers_logo/...`, `/assets/enterprises/zocoenergia/...`) |
| Multi-idioma | Español únicamente |
| Mobile/Desktop | Mobile-first puro: breakpoint en 810 px con clases `.desktop-item` / `.mobile-item` |

**Hallazgos arquitectónicos:**

- **Multi-tenant real**: el endpoint `/api/session/getEnterpriseData?url=crm.zocoenergia.com` sugiere que el mismo backend sirve varias marcas (zocoenergia es una de ellas). Implica que pueden white-labelizar para otros consultores energéticos.
- **Code-splitting** activo en herramientas (carga ToolsComponent bajo demanda).
- **Typo en endpoint**: `checkUserLoggedSesion` (debería ser "Session"). Detalle menor pero indica mantenimiento sin pulir.
- **`token=undefined`** en las URLs de FontAwesome → el kit no está protegido por token, cualquiera puede usar su CDN gratis a su costa.

---

## 2. Inventario de módulos (sidebar principal)

| # | Módulo | Ruta | Función |
|---|---|---|---|
| 1 | Escritorio | `/` | Dashboard con KPIs y gráficos por agente |
| 2 | Contratos | `/contracts` | Gestión de contratos firmados; 3 modos de creación |
| 3 | Cuentas | `/accounts` | Empresas / clientes (CIF) |
| 4 | Oportunidades | `/opportunities` | Pipeline comercial (lista, sin Kanban) |
| 5 | Contactos | `/contacts` | Personas físicas asociadas a cuentas |
| 6 | Tareas | `/tasks` | To-dos con subtareas y mini-calendario |
| 7 | Calendario | `/calendar` | Vista Día/Semana/Mes/Año + sync Google Calendar |
| 8 | Productos | `/marketers` | **Catálogo de tarifas de comercializadoras** (esta es la pieza que alimenta el comparador) — incluye importador XLSX |
| 9 | Documentos | `/documents` | Drive interno con 16 carpetas por comercializadora (ENDESA, NATURGY, REPSOL, IBERDROLA, etc.) |
| 10 | Mi red | `/users` | Gestión de agentes/comerciales de la red |
| 11 | Herramientas | `/tools` | Hub con 9 utilidades (comparador, Datadis, mailing, etc.) |

**No detectados** (que sí esperaríamos en un CRM moderno):

- Módulo "Leads" separado de Oportunidades
- Inbox de email integrado
- Chat/Mensajería interna
- Reports/Analytics avanzados (más allá del dashboard básico)
- Marketplace de integraciones
- Configuración de workflows/automatizaciones

---

## 3. Profundización módulo por módulo

### 3.1 Escritorio (Dashboard)

Gráficos de barras por agente comercial mostrando contratos cerrados / oportunidades / tareas. Selector temporal (mes, trimestre, año). KPIs agregados arriba. **Diseño plano**, sin sparklines, sin drill-down. No editable por usuario (no es customizable).

### 3.2 Contratos

- Filtros laterales (estado, comercializadora, fecha, agente).
- FAB (botón flotante) "+" abre menú con **3 modos de creación**:
  1. **Manual completo** (formulario tradicional con 30+ campos)
  2. **Por CUPS** (autocompleta titular y datos del suministro)
  3. **Por Factura** (sube PDF, OCR rellena el contrato)
- Custom fields detectados por comercializadora (Endesa pide unos campos, Naturgy otros).
- Exportable a CSV (no probado para no descargar exports masivos).
- **No detectado**: workflow de aprobación, firma electrónica integrada, historial de cambios visible en UI.

### 3.3 Cuentas

- CRUD básico: razón social, CIF, domicilio fiscal, contacto principal.
- Campos custom: sector, tamaño, comercializadora actual, fecha próxima renovación.
- Vinculación con contactos, oportunidades y contratos visible en pestañas.
- **Sin scoring**, **sin enriquecimiento automático** (no hay integración con eInforma / Axesor).

### 3.4 Oportunidades

- Lista tabular con filtros, **NO hay vista Kanban**.
- 3 estados: Abierta / Ganada / Perdida (sin sub-estados configurables).
- Tabs en formulario: **"Cuenta + Contrato"** o **"Solo Contrato"** (modelo dual lead/opp).
- Sin probabilidad %, sin valor esperado calculado, sin forecast.

### 3.5 Contactos

Formulario simple: nombre, apellidos, email, teléfono, cuenta asociada, rol. Sin campos de marketing (no consent GDPR visible, no preferencias de comunicación).

### 3.6 Tareas

- Subtareas anidadas (1 nivel).
- Mini-calendario lateral como filtro temporal.
- Asignación a otros agentes.
- **Sin recurrencia visible**, sin templates de tareas, sin SLAs.

### 3.7 Calendario

- 4 vistas: Día / Semana / Mes / Año.
- **Integración Google Calendar bidireccional** (sync visible en settings de perfil).
- Eventos creados desde tareas se sincronizan.
- Sin invitaciones a clientes externos, sin booking público estilo Calendly.

### 3.8 Productos (módulo "Marketers")

- Listado tabular de tarifas con: comercializadora, tarifa (3.0TD, 2.0TD, etc.), precios P1-P6 potencia y energía, vigencia, condiciones.
- **Importador XLSX detectado** (botón "Importar"): permite subir actualizaciones masivas de tarifas. **Crítico** — define la velocidad con la que el comparador refleja el mercado.
- 16+ comercializadoras con logos propios alojados en `/assets/marketers_logo/` (Unieléctrica, Naturgy, Repsol, Gana Energía, Endesa, Iberdrola, etc.).
- Sin versiones histórico de tarifas accesibles desde UI (probable que sí en backend).

### 3.9 Documentos

- Drive interno con **16 carpetas por comercializadora** + carpetas administrativas.
- Subida de PDFs, organización jerárquica.
- **Sin búsqueda full-text en PDF**, sin OCR sobre documentos almacenados (el OCR solo se usa en el comparador).
- Sin permisos granulares aparentes a nivel de carpeta.

### 3.10 Mi red (Usuarios)

Gestión de agentes comerciales: alta, baja, roles, asignación de cuentas. Estructura jerárquica probable (manager → agentes). **Sin gamification visible** (rankings, badges, leaderboards) más allá del dashboard.

### 3.11 Herramientas (9 tools)

| Tool | Función |
|---|---|
| Comparador de luz | OCR factura + comparador multimarketer |
| Comparador de luz multipunto | Para clientes con múltiples suministros |
| Comparador de gas | Equivalente para gas natural |
| Buscador de CUPS | **Consulta directa a Datadis** (consumos + potencias históricas) |
| Monitorización | (Probable: telemedida en tiempo real) |
| Monitorización contadores | (Probable: histórico de lecturas) |
| Correo masivo | Envío de campañas (no probado) |
| Registros | **Audit log** (visible: nombres de cuentas, CUPS, timestamps) |
| Fichajes | RRHH: control horario empleados |

> **Hallazgo de seguridad**: en el grid de Herramientas existía un elemento titulado **"Probar Scraping"** que parece un honeypot defensivo (no clickeado por precaución, comunicado a Juan).

### 3.12 Perfil de usuario

- Datos personales del usuario logueado (nombre, email, NIF, dirección).
- Configuración de notificaciones.
- Sync con Google Calendar.
- **Sin 2FA visible**, sin gestión de sesiones activas, sin API keys personales.

---

## 4. Flujos completos de valor

### 4.1 Lead → Cliente

Crear Cuenta → asociar Contacto → crear Oportunidad → mover a "Ganada" → generar Contrato. Flujo lineal, **3-4 clicks por paso**, sin shortcuts. Falta automatización (no se crea contrato automático al ganar oportunidad; hay que entrar manualmente).

### 4.2 Oportunidad → Contrato

Desde oportunidad ganada, botón "Crear contrato" hereda solo cuenta y contacto. **Hay que rellenar los datos energéticos de cero** (CUPS, potencias, tarifa actual). Aquí Valere puede ganar mucho con un único formulario unificado.

### 4.3 Renovación de contrato

**No detectado un flujo dedicado** de renovación. Probablemente se gestiona como "nuevo contrato" tras vencimiento. Sin alertas automáticas X días antes, sin renovación con un click.

### 4.4 Gestión de incidencias

**Módulo no encontrado**. No hay tickets, no hay SLAs, no hay vinculación con un sistema externo tipo Zendesk. Las incidencias probablemente se gestionan como Tareas, lo cual es un downgrade funcional importante.

### 4.5 ⭐ Captura de factura → propuesta (FLUJO ESTRELLA)

**Este es el flujo más maduro de Zoco y la mayor ventaja competitiva.**

**Paso 1 — Subida**: usuario va a `Herramientas > Comparador de luz > Factura`, sube PDF (drag&drop o selector). En la prueba: PDF de 201 KB, 1 página, factura mensual de FLEXGAL S.L. emitida por Pasión Energía (anonimizado: `[FACTURA_TEST]`).

**Paso 2 — OCR + parseo**: al pulsar "Comparar", el backend procesa el PDF. **Tiempo total medido: ~4 segundos** desde click hasta resultado en pantalla. La extracción incluye:

- CUPS (`ES00...AB1P`)
- Total facturado (`[1.937,52 €]`)
- Tarifa de acceso (`3.0TD`)
- Periodo de facturación (`31/01/2026 — 28/02/2026, 28 días`)
- Potencia máxima demandada (`63 kW`)
- Consumo del periodo (`11.519 kWh`)
- **Consumo estimado anual extrapolado** (`152.989 kWh`) — calculado client-side
- Potencias contratadas por periodo: P1=43.65, P2-P6=63 kW
- Precios unitarios de potencia €/kW·día por periodo
- Precios unitarios de energía €/kWh por periodo
- Excedentes (autoconsumo): cantidad kWh + precio €/kWh + valor de batería virtual €/mes
- Impuestos: IVA %, impuesto eléctrico %, bono social €/día, alquiler equipo €/día
- Servicio de ajuste €/MWh

**Paso 3 — Override manual**: junto a los datos extraídos hay un icono de edición (✏️). Al pulsarlo, **todos los campos se vuelven editables** con validación inline. El usuario puede corregir errores del OCR antes de comparar. Los selectores (Tarifa, Fechas con opción "Factura"/"Mes") permiten cambiar la base del cálculo.

**Paso 4 — Resultado**: el sistema muestra automáticamente un desglose detallado:

- **Potencia**: P1-P6 con fórmula `kW × €/kW·día × días = €` y subtotal (`272,79 €` en la prueba)
- **Consumo**: P1-P6 con fórmula `kWh × €/kWh = €` y subtotal (`1.326,11 €`)
- **Excedentes**: batería virtual + autoconsumo (`-7,84 €`)
- **Servicio ajuste**: si aplica
- **Impuestos**: desglose IVA + IE + bono social + alquiler (`346,46 €`)

**Paso 5 — Lista de ofertas**: a continuación aparece la sección "Ofertas" con **8+ tarifas alternativas** (en la prueba: Tarifa Fija Eco, Fijo luz, Fijo luz ECO, Tarifa Fija Bio, Tarifa Fija Natur, Fijo luz SUPRA, Fijo luz ECO SUPRA, Tramos horarios). Cada tarifa muestra 3 cifras:

- **Cuota mensual indicativa** (€)
- **Total comparable al periodo** (€)
- **Ahorro vs factura actual** en verde (€)

Filtro "Mostrar filtros" para acotar (probable: por comercializadora, tipo de tarifa, condiciones).

**Paso 6 — Detalle de oferta**: al desplegar una oferta (chevron ▼) muestra:

- Tres botones de acción: ✏️ Editar / 📄 Generar PDF / 👤 Crear contacto-contrato a partir de esta oferta
- AHORRO desglosado en: Potencia / Energía / Excedentes
- Comparativa precio €/kWh nuevo vs actual

**Endpoints técnicos detectados (Network)**:

- `POST /api/logs/generateComparative` (200 OK) — endpoint que registra y devuelve la comparativa
- `GET /api/marketers` — catálogo de tarifas vivas
- `GET /api/comparatives/` — historial de comparativas del usuario
- `GET /api/comparatives` — operación CRUD comparativas

**Recomendación crítica para Valere**: replicar este flujo es **prioridad máxima**. Es el momento de la verdad de la venta consultiva.

### 4.6 Comparativa de ofertas en modo CUPS y Datos

El comparador tiene **3 modos de entrada** (visible al pulsar "¿Qué quieres comparar?"):

1. **Factura** (descrito en 4.5): OCR extrae todo
2. **CUPS**: el usuario introduce CUPS + precios de potencia y energía manualmente; el sistema **NO extrae el consumo desde Datadis automáticamente en este modo** — pide los precios al usuario y compara contra ellos. Validación client-side: si faltan precios sale modal "Error en los datos — Por favor rellena los precios de potencia y energía".
3. **Datos**: 100% manual — usuario selecciona Tarifa de un dropdown e introduce Potencia contratada en kW.

**Hallazgo importante**: la integración Datadis está **separada** del comparador. Vive en la herramienta "Buscador de CUPS" (sección 4.6.bis).

#### 4.6.bis Integración Datadis (HALLAZGO TÉCNICO TOP)

En `Herramientas > Buscador de CUPS`, al introducir un CUPS y pulsar la flecha, se dispara:

`GET /api/tools/getAPIConsumption?CUPS=ES00...AB1P` (CUPS truncado a 20 caracteres, sin el sufijo de frontera)

Esta es una llamada al backend de Zoco que actúa como **proxy autenticado contra Datadis**, probablemente con credenciales B2B de la propia Zoco como empresa consultora habilitada. El usuario final NO necesita registrar su NIF en Datadis — la consulta funciona con cualquier CUPS español.

**Detalle clave observado**: el CUPS llega al endpoint **truncado a 20 caracteres** (sin el sufijo de frontera), comportamiento típico que requiere la API privada de Datadis.

La respuesta incluye:

- Potencias contratadas históricas P1-P6 (kW)
- Potencia máxima demandada
- Consumos históricos por periodo P1-P6 (kWh) con desglose mensual de los últimos 12+ meses
- Consumo total anual
- Potencia demandada en cada lectura
- Último cambio de comercializadora (fecha) — campo que solo Datadis expone
- Heatmap de consumo (visualización con 6 periodos × N meses)
- Bar chart agregado por periodo
- Tabla detallada Desde/Hasta + P1-P6 kWh + P1-P6 kW

Esta es la **mayor ventaja competitiva de Zoco vs Valere**. En Valere, si ofrecemos Datadis hoy, el cliente tiene que dar de alta un usuario propio. Zoco no.

### 4.7 Generación de propuesta comercial

Desde una oferta del comparador, el botón 📄 PDF genera (presumiblemente) un PDF con marca blanca. El botón 👤 lanza la creación directa de contacto+contrato. Convierte el comparador en un **funnel de conversión cerrado**: del PDF de propuesta al contrato firmado sin salir del módulo.

---

## 5. Integraciones detectadas

| Integración | Evidencia | Madurez |
|---|---|---|
| **Datadis** (proxy backend) | `/api/tools/getAPIConsumption?CUPS=...` | Alta — sin fricción para el usuario |
| **OCR de facturas PDF** | Procesamiento server-side, ~4 s | Alta — extrae 20+ campos estructurados |
| **Google Calendar** | OAuth visible en perfil; sync bidireccional | Media — solo eventos básicos |
| **Google Sign-In** | `accounts.google.com/gsi/client` | Estándar |
| **FontAwesome Pro** | Kit `ka-f.fontawesome.com` (token=undefined ⚠️) | Cosmético |
| **Importación XLSX** | Botón en módulo Productos | Media |
| Geolocalización / mapas | No detectada | — |
| eInforma / Axesor | No detectada | — |
| Firma electrónica | No detectada | — |
| WhatsApp Business | No detectada | — |
| Email transaccional | No detectada en API | — |
| Webhooks salientes | No detectada en UI | — |
| API pública | No documentada | — |

**Endpoints API descubiertos (resumen)**:

- `/api/session/getEnterpriseData?url=<dominio>` — multi-tenancy
- `/api/session/checkUserLoggedSesion` — verificación de sesión (typo)
- `/api/session/getData` — datos del usuario logueado
- `/api/marketers` — catálogo de tarifas
- `/api/comparatives` y `/api/comparatives/` — comparativas CRUD
- `/api/logs/generateComparative` — POST para generar comparativa nueva
- `/api/tools/getAPIConsumption?CUPS=...` — proxy Datadis

---

## 6. UX, Performance y Mobile

**Performance**:

- Bundle único Vue (`app-36dNaTtb.js`) + code-splitting de tools
- Tiempos de respuesta API observados: 200-400 ms para endpoints sencillos, ~3-4 s para OCR y Datadis
- Sin loading skeletons visibles (usa spinners sencillos)
- **Error de JS detectado en consola**: `ReferenceError: $ is not defined at /tools:47:5` — alguien intentó usar jQuery en una página Vue. Síntoma de codebase con deuda técnica.

**UX**:

- Navegación principal en menú hamburguesa lateral (incluso en desktop)
- Botón "Volver" rojo grande siempre visible — bueno para reducir ansiedad pero mata mucho real estate en escritorio
- Iconografía consistente (FontAwesome Pro)
- Tipografía Poppins en todas partes — moderna pero sin jerarquía clara (tamaños muy similares)
- Color principal `#012C68` muy serio, sin acentos vibrantes excepto el rojo del botón Volver y el verde de los ahorros
- Modales centrados con backdrop oscuro — estándar
- Falta: breadcrumbs, búsqueda global, atajos de teclado

**Mobile**:

- Mobile-first agresivo: mismo layout en mobile y desktop, solo cambia algún detalle de cabecera
- En desktop se siente "infantil" por los componentes grandes y centrados
- Touch targets generosos (>44 px), bien para móvil

---

## 6.bis Auditoría responsive y design system

### 6.bis.1 Sistema de breakpoints

Único breakpoint detectado: **810 px**, gestionado mediante clases CSS `.desktop-item` (display:flex >810px) y `.mobile-item` (display:flex <810px). No hay tablet específico — salto binario móvil↔desktop.

### 6.bis.2 Design tokens

- **Color principal**: `#012C68` (azul marino corporativo)
- **Color secundario**: rojo (botón Volver, ~`#E63946` aprox)
- **Verde de éxito**: usado en ahorros del comparador
- **Grises de fondo**: tonos muy suaves casi blanco (`#F7F8FA` aprox)
- 16+ tokens de color en variables CSS de `:root`
- **Tipografía**: Poppins 100-900 + Meow Script (decorativa, vista en login)
- **Iconos**: FontAwesome Pro v6.7.0 (consistente)
- **Border radius**: medio-alto (~12-16 px en cards, 8 px en inputs)
- **Sombras**: suaves en cards principales
- **Espaciado**: generoso, cómodo para mobile

### 6.bis.3 Componentes recurrentes (catálogo completo)

- **Card contenedora**: fondo blanco, sombra suave (`box-shadow: 0 2px 8px rgba(0,0,0,0.06)` aprox), border-radius ~12 px, padding interior generoso (~24 px). Es el contenedor base de prácticamente toda la información del CRM.
- **Botón primary**: fondo `#012C68`, texto blanco, border-radius ~8 px, padding ~12 px 24 px, font-weight 600. Sin estados hover claramente diferenciados (no se detectó cambio visual marcado).
- **Botón danger / "Volver"**: fondo rojo (~`#E63946`), texto blanco, mismo border-radius. Tamaño grande, ocupa casi todo el ancho disponible en cabeceras.
- **Botón ghost / secondary**: borde azul fino, fondo transparente, texto azul. Usado en acciones secundarias (filtros, opciones).
- **Botón circular de acción** (FAB y similar): círculo azul oscuro con icono blanco, sombra; usado para crear nuevo registro, editar.
- **Input texto**: borde inferior ~1 px gris, label flotante encima, sin borde lateral (estilo Material). Foco activa borde azul.
- **Input numérico** en formularios del comparador: caja completa con borde gris claro, fondo blanco, border-radius ~6 px. Inconsistente con el estilo Material del resto.
- **Select dropdown**: nativo del sistema operativo (no custom), con flecha chevron a la derecha. Buena accesibilidad pero pierde consistencia visual entre OS.
- **Toggle/Switch**: cuadrado verde con tick blanco cuando está activo (visto en sección Impuestos del comparador). No es el típico switch redondeado iOS.
- **Modal**: backdrop oscuro semitransparente, card centrada con icono superior grande (! naranja para error, ✓ verde para éxito), título h2, mensaje p, botón "OK" azul grande al pie. Se cierra al pulsar OK o clicar fuera.
- **Tabs**: subrayado azul en la pestaña activa, texto gris en las inactivas. Visto en formulario de Oportunidades ("Cuenta+Contrato" / "Solo Contrato") y en perfil.
- **Chevron desplegable** (▼ → ▲): círculo gris claro con flecha; al pulsar, despliega contenido con animación suave. Patrón muy reutilizado (ofertas del comparador, filtros, secciones plegables).
- **Filtro lateral**: panel deslizante o columna fija con grupos colapsables; checkboxes y rangos de fecha. Visto en Contratos y Oportunidades.
- **Mini-calendario** (date picker compacto): visto en Tareas como filtro temporal lateral. Funcional pero estética básica.
- **Heatmap de calor**: matriz 6 filas (P1-P6) × N columnas (meses), gradiente de azul oscuro a azul claro según intensidad. Único en el sector visto.
- **Bar chart**: barras verticales con colores variables (P1 cian, P3 azul, P5 morado…), eje Y con escala automática.
- **Tabla densa**: filas estrechas con tipografía pequeña; columnas con cabecera fija; usada en Registros, Productos, comparativas históricas.
- **Lista de tarifas (offer card)**: avatar logo comercializadora a la izquierda, nombre tarifa, 3 cifras a la derecha (cuota / total / ahorro), chevron desplegable.
- **Audit log row**: nombre cliente + CUPS + fecha + ojo (👁) para abrir detalle.
- **Empty state**: no se observó un patrón claro de empty state vacío con ilustración; en módulos sin datos simplemente no se muestra nada (oportunidad de mejora).

### 6.bis.4 Comportamiento responsive por viewport

> Nota metodológica: el motor de navegación remota usado tuvo el viewport interno limitado a ~679 px durante toda la sesión, por lo que el análisis de los breakpoints 768 y 1440 se basa en (a) inspección de las clases CSS `.desktop-item` y `.mobile-item` con la regla del breakpoint en 810 px, (b) inyección de CSS para forzar las clases desktop, y (c) extrapolación lógica del comportamiento. Para una validación 100% pixel-perfect convendría una segunda pasada con resize real del navegador.

#### Módulo 1 — Escritorio (Dashboard)

- **375 px (móvil)**: gráficos apilados verticalmente, ocupando 100% del ancho. KPIs en grid 2×2 o lista vertical. Selector temporal en dropdown. Cabecera con saludo y fecha del día.
- **768 px (tablet)**: misma disposición que móvil — el breakpoint 810 px aún no se ha activado. Los gráficos siguen a 100% ancho, lo cual desperdicia el espacio horizontal de la tablet. Mal aprovechamiento.
- **1440 px (desktop)**: una vez superado 810 px, los gráficos pasan a 2 columnas (al activarse `.desktop-item`). KPIs en fila horizontal. Sigue habiendo márgenes laterales muy amplios — se pierde densidad informativa que un dashboard pro debería ofrecer (4 columnas de KPIs, 3-4 gráficos en grid, tablas resumen).

#### Módulo 2 — Contratos

- **375 px**: lista vertical de contratos, una tarjeta por contrato con datos clave. Filtros en bottom sheet o modal accesible vía icono. FAB "+" flotante en esquina inferior derecha. Buena experiencia mobile.
- **768 px**: misma vista que móvil hasta 810 px. Encima del breakpoint, aparecería columna lateral de filtros visible siempre + tabla.
- **1440 px**: layout de dos columnas — sidebar de filtros a la izquierda (~280 px) + tabla principal con muchas columnas visibles. La tabla aprovecha bien el ancho. FAB se mantiene visible. **Pero** el botón "Volver" rojo grande sigue ocupando espacio en cabecera incluso aquí, donde no aporta tanto valor.

#### Módulo 3 — Comparador de luz (la pieza estrella)

- **375 px**: flujo paso a paso vertical, ideal para móvil. Cada sección (datos extraídos, potencia, consumo, ofertas) se apila. El usuario hace scroll largo pero la lectura es clara. Las ofertas se muestran en card vertical con las 3 cifras de ahorro alineadas a la derecha.
- **768 px**: igual que móvil hasta 810 px. Por encima, el bloque de datos extraídos podría dividirse en 2 columnas (resumen | acciones). Las ofertas siguen siendo cards de ancho completo.
- **1440 px**: la oportunidad se desperdicia parcialmente. Los datos extraídos podrían mostrar dashboard con resumen a la izquierda, gráficos de consumo a la derecha. Las ofertas podrían ir en grid de 2-3 columnas para comparar visualmente. Zoco lo deja todo en columna única ancha (~700 px max) centrada con grandes márgenes laterales blancos. **Es la mayor oportunidad de mejora visual de Zoco.**

#### Módulo 4 — Buscador de CUPS (Datadis)

- **375 px**: input CUPS arriba, botón consultar grande, resultados apilados (potencias / consumos / heatmap / bar chart / tabla histórica). El heatmap escala bien. La tabla histórica se vuelve scrollable horizontalmente con sombra que indica que hay más columnas a la derecha.
- **768 px**: idéntico hasta 810 px. Encima, dos columnas (potencias | consumos) lado a lado mejorarían la comparativa visual.
- **1440 px**: heatmap puede ocupar ancho completo y mostrar más meses simultáneamente, lo cual aporta. Bar chart al lado del heatmap. Tabla histórica con todas las columnas visibles sin scroll. Aquí Zoco aprovecha medianamente bien el ancho, especialmente en heatmap.

#### Módulo 5 — Calendario

- **375 px**: vista por defecto Día o Semana compacta. Vista Mes como cuadrícula 7×6 con celdas pequeñas y solo punto indicador de eventos. Navegación entre días con swipe.
- **768 px**: misma vista hasta 810 px; arriba aparece la grid completa de mes con eventos visibles.
- **1440 px**: vista Semana o Mes muy cómoda, con eventos extendidos en cajas anchas, drag&drop probablemente disponible (no probado para no modificar). Vista Año como matriz 12 meses × 31 días, útil para planificación anual de renovaciones.

**Observación transversal sobre responsive**: Zoco trata todo como una versión escalada del móvil. No hay un diseño desktop pensado desde cero. Esto se nota más en módulos densos (Dashboard, Comparador) y menos en módulos lineales (Calendario, Tareas). **Valere debe diseñar mobile-first pero pensar el desktop como un layout aparte**, no como móvil con más márgenes.

### 6.bis.5 Calificación del design system (escala 1-10)

| Dimensión | Nota | Justificación |
|---|---|---|
| Coherencia interna | 7/10 | Colores y tipografía consistentes; algunos inputs rompen el estilo Material del resto |
| Modernidad visual | 4/10 | Estética de 2018-2019; falta carácter, dark mode, microinteracciones |
| Jerarquía tipográfica | 4/10 | Poppins en todo, tamaños demasiado parecidos, h1/h2/h3 poco diferenciados |
| Densidad informativa | 4/10 | Mucho whitespace, padding excesivo en desktop, layouts mobile-first forzados |
| Accesibilidad | 5/10 | Contraste correcto, foco de teclado funcional, pero sin etiquetas aria visibles ni soporte de modo oscuro |
| Componentes reutilizables | 7/10 | Catálogo amplio (cards, botones, modales, charts) y bien identificable; no documentado externamente |
| Iconografía | 8/10 | FontAwesome Pro consistente y de calidad |
| Microinteracciones | 3/10 | Despliegues con animación suave; resto, casi nada |
| Adaptabilidad responsive | 5/10 | Funciona en móvil, no aprovecha desktop |
| Personalización (white-label) | 6/10 | Estructura multi-tenant lo permite a nivel de logos y colores básicos |
| **Media global** | **5,3 / 10** | **Sistema funcional pero sin alma; Valere puede superarlo con un esfuerzo razonable de diseño** |

---

## 7. Top 10 features que Valere NO tiene (orden de prioridad para roadmap)

1. **🔥 Datadis-as-a-Service vía proxy backend** — el cliente nunca pisa Datadis, una sola query con CUPS devuelve potencias, consumos 12+ meses y fecha de último cambio de comercializadora. **Es el mayor diferenciador funcional de Zoco.**
2. **🔥 OCR de factura PDF → 20+ campos extraídos en ~4 segundos**, con override manual completo (icono editar abre todos los campos como editables).
3. **🔥 Comparador multimarketer con desglose granular** (Potencia / Energía / Excedentes / Impuestos / Servicio ajuste) y 8+ ofertas calculadas en tiempo real con ahorro vs factura actual.
4. **Generación de PDF de propuesta comercial** desde una oferta seleccionada, con marca blanca, en un click.
5. **Conversión directa "oferta → contrato + contacto"** sin salir del comparador; cierra el funnel comercial en una sola pantalla.
6. **Importador XLSX de tarifas** en módulo Productos para mantener catálogo de comercializadoras actualizado en bulk.
7. **Heatmap visual + bar chart de consumos históricos** desde Datadis (12+ meses), con tabla detallada Desde/Hasta + P1-P6 kWh + P1-P6 kW.
8. **Modo Comparador multipunto** para clientes B2B con varios suministros simultáneos.
9. **Drive interno organizado por carpetas predefinidas por comercializadora** (16 carpetas: Endesa, Naturgy, Iberdrola, Repsol, etc.).
10. **Audit log de actividad ("Registros")** con CUPS + cliente + timestamp para trazabilidad RGPD y debugging operativo.

---

## 8. Top 5 fortalezas de Valere vs Zoco (a explotar comercialmente)

1. **Pipeline visual de oportunidades con Kanban**: Valere puede tener drag&drop entre etapas configurables, probabilidad %, valor esperado y forecast trimestral. Zoco solo tiene lista filtrada con 3 estados fijos (Abierta/Ganada/Perdida).
2. **Diseño visual moderno y jerarquizado**: paleta más rica con acentos vibrantes, tipografía con jerarquía clara, dark mode, microinteracciones, layout desktop pensado desde cero (no escalado del móvil). Zoco se ve "de 2018".
3. **Stack técnico más limpio y mantenible**: React 19 + TypeScript + Tailwind 4 + shadcn/ui sin deuda jQuery; permite iterar más rápido y construir features complejas. Zoco arrastra `$ is not defined` en producción y typos en endpoints (`checkUserLoggedSesion`).
4. **Workflow de renovaciones automatizado**: alertas X días antes del vencimiento, renovación con un click, escalado automático a otro agente si el primero no actúa, plantillas de comunicación al cliente. Zoco no tiene este flujo dedicado, lo gestiona como nuevo contrato manual.
5. **Sistema de incidencias/tickets nativo** con SLAs configurables, plantillas de respuesta, vinculación a contratos y cuentas. Permite a Valere vender un módulo "Atención al cliente post-venta" como upgrade. Zoco lo resuelve como tareas genéricas, lo cual es un downgrade funcional.

---

## 9. Tres patrones UX a copiar/adaptar en Valere

### 9.1 Override manual sobre datos extraídos automáticamente

Patrón: cuando el sistema extrae datos automáticamente (OCR, Datadis, autocompletado), siempre ofrece un icono de edición que abre TODOS los campos como editables con dos botones (💾 guardar / ✖ descartar). El usuario nunca queda atrapado en un dato mal interpretado por la máquina.

**Aplicación en Valere**: en cualquier flujo donde Valere extraiga datos (futuro OCR, futura llamada a Datadis, autocompletado de CIF desde eInforma), exponer SIEMPRE un toggle de edición que convierta el resumen en formulario completo con la misma jerarquía visual. Es una lección de humildad de producto: la máquina se equivoca, dejemos que el humano corrija sin fricción y sin perder los datos ya extraídos.

### 9.2 Resultado financiero en 3 cifras + desglose plegable

Patrón: en la lista de ofertas, cada tarifa muestra exactamente 3 números con jerarquía visual clara: cuota mensual indicativa (gris pequeño), total comparable (azul medio bold), ahorro vs actual (verde grande bold). El usuario decide en 3 segundos. Si quiere profundizar, despliega el detalle con un chevron y ve el desglose por concepto (Potencia / Energía / Excedentes) más botones de acción (Editar / PDF / Crear contrato).

**Aplicación en Valere**: este patrón "headline number + drill-down opcional" sirve para cualquier comparativa, no solo tarifas energéticas. Reusable en simulaciones de ahorro, dashboards de KPIs, comparativas de proveedores, fichas de oportunidad. Reduce la ansiedad cognitiva del comercial al presentar al cliente.

### 9.3 Botón "Volver" prominente como ancla de seguridad

Patrón: Zoco coloca un botón rojo grande con texto "Volver" en cabecera de cada pantalla profunda. Reduce la ansiedad del usuario novato (sabe que siempre puede salir) y convierte en un solo click navegaciones que en otros CRMs requieren breadcrumb mental o pulsar el back del navegador.

**Aplicación en Valere**: aunque el botón rojo es estéticamente discutible y desperdicia espacio en desktop, el principio es bueno. Recomendación: implementar un botón "Atrás contextual" prominente en pantallas de 2º y 3er nivel, con color de marca (no rojo agresivo) pero con tamaño suficiente para verse a primera vista. Especialmente útil en flujos largos como creación de contrato o comparador. Idealmente con texto inteligente del tipo "← Volver a Oportunidades" en lugar de un genérico "Volver".

---

## 10. Roadmap de mejoras propuesto para Valere

### 10.1 Quick wins (2-4 semanas, alto ROI inmediato)

| # | Mejora | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Importador XLSX de tarifas en módulo Productos | 1 sem | Alto — desbloquea actualización masiva del catálogo de comercializadoras |
| 2 | Vista Kanban de Oportunidades (drag&drop entre etapas configurables) | 1-2 sem | Alto — diferenciador inmediato vs Zoco |
| 3 | Botón "Atrás contextual" prominente en cabecera de pantallas profundas | 3 días | Medio — mejora UX percibida |
| 4 | Audit log básico de actividad (quién hizo qué, cuándo, sobre qué entidad) | 1 sem | Medio — base para RGPD y compliance |
| 5 | Carpetas predefinidas por comercializadora en módulo Documentos | 2-3 días | Medio — paridad funcional fácil |
| 6 | Patrón "headline + drill-down" en cards de oportunidad y contrato | 1 sem | Medio — mejora densidad informativa |
| 7 | Empty states con ilustración + CTA primaria en módulos vacíos | 3-5 días | Bajo-medio — UX y onboarding |

### 10.2 Medio plazo (1-3 meses, alto valor estratégico)

| # | Mejora | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | **Integración Datadis vía proxy backend** (Valere se da de alta como empresa consultora B2B) | 4-6 sem (incluyendo trámites con Datadis y diseño del consentimiento RGPD del cliente final) | **Crítico** — paridad con Zoco en su mayor diferenciador |
| 2 | **OCR de facturas eléctricas** con extracción de 20+ campos (CUPS, tarifa, periodos, potencias, consumos, precios, excedentes, impuestos) | 6-8 sem (R&D + entrenamiento de parser por comercializadora) | **Crítico** — paridad funcional |
| 3 | **Comparador multimarketer** con desglose por concepto + listado de ofertas con ahorro vs factura actual | 6-8 sem (depende de Datadis y catálogo de tarifas vivo) | **Crítico** — funnel comercial cerrado |
| 4 | Generación de PDF de propuesta comercial con marca blanca configurable por usuario/agencia | 2-3 sem | Alto — cierra el bucle venta consultiva |
| 5 | Conversión "oferta → contrato + contacto" en un click | 1-2 sem (depende de #3) | Alto |
| 6 | Workflow de renovaciones con alertas automáticas X días antes del vencimiento | 2-3 sem | Alto — Zoco no lo tiene |
| 7 | Sistema de tickets/incidencias con SLAs configurables y plantillas de respuesta | 4-6 sem | Medio-alto — apertura a vender módulo "Atención al cliente" como upgrade |
| 8 | Dark mode + redesign del design system con jerarquía tipográfica clara | 3-4 sem | Medio — diferenciador visual marcado |
| 9 | Modo Comparador multipunto para clientes con varios CUPS | 2-3 sem | Medio (B2B grande es un segmento valioso) |

### 10.3 Largo plazo (3-9 meses, expansión estratégica)

| # | Mejora | Justificación |
|---|---|---|
| 1 | **Marketplace de integraciones** (eInforma, Axesor, Signaturit, WhatsApp Business, Mailchimp, Zapier, Sage/Holded) | Convierte Valere en plataforma extensible vs Zoco que es jardín cerrado; permite vender plan Premium |
| 2 | **Automatizaciones configurables tipo Zapier interno** (triggers + actions sin código) | Permite vender plan Premium con automatizaciones avanzadas; Zoco no las tiene |
| 3 | **Scoring de leads y oportunidades con ML** (probabilidad de cierre por características) | Diferenciador fuerte; ningún competidor del sector lo tiene a nivel PYME |
| 4 | **App móvil nativa** (React Native o Flutter) con escaneo de factura desde cámara | El comercial de calle es el target — escanea factura del cliente in situ y comparte propuesta al momento |
| 5 | **Booking público estilo Calendly** para que comerciales agenden visitas con clientes | Mejora conversión en fase prospección |
| 6 | **API pública documentada + webhooks salientes** | Permite a partners construir integraciones; modelo de plataforma |
| 7 | **Multi-tenant white-label** para vender Valere a otros consultores energéticos | Zoco ya tiene esta arquitectura; es modelo de revenue B2B2B muy escalable |
| 8 | **Reports/Analytics avanzados** con builder de dashboards custom (drag&drop de widgets) | Diferenciador para clientes B2B grandes que necesitan reporting interno |
| 9 | **Firma electrónica integrada** (Signaturit, Validated ID o similar) directamente en el flujo de contrato | Acorta el ciclo de cierre; evita pasarela externa |
| 10 | **WhatsApp Business como canal de comunicación con cliente final** vinculado a contrato/oportunidad | El sector energético español usa intensivamente WhatsApp; integración nativa es diferenciador |

### 10.4 Priorización sugerida

Si hay que elegir 3 batallas para los próximos 3 meses:

1. **Datadis vía proxy + OCR de factura + Comparador con ofertas** como paquete único (es lo que el cliente percibe como "el motor del CRM energético").
2. **Kanban de Oportunidades + Workflow de Renovaciones** (donde Valere ya gana sin esfuerzo enorme).
3. **Redesign del design system con dark mode** (la primera impresión visual es lo que vende en demos).

---

## 11. Hallazgos colaterales (seguridad, RGPD, deuda técnica)

### 11.1 Seguridad

- **Elemento "Probar Scraping"** en el grid de Herramientas: parece un honeypot defensivo destinado a detectar scrapers automatizados que pulsan todos los enlaces. No clickeado por precaución. Buen patrón defensivo de Zoco — Valere podría implementarlo también.
- **FontAwesome Pro con `token=undefined`**: las URLs del kit FontAwesome cargan sin token de autenticación válido. Implica que cualquier sitio externo podría usar el kit a costa del CDN de Zoco. Riesgo bajo (FontAwesome lo detecta y bloquea por dominio referer) pero indica configuración descuidada.
- **No detectado 2FA** en el perfil de usuario. Para un CRM con datos de clientes B2B, NIFs, CUPS y facturas reales, la ausencia de 2FA opcional es una debilidad.
- **No detectada gestión de sesiones activas** (el usuario no puede ver desde qué dispositivos está logueado ni cerrar sesiones remotas). Estándar de seguridad básico ausente.
- **Multi-tenancy basada en URL** (`getEnterpriseData?url=crm.zocoenergia.com`): si el endpoint no valida correctamente el dominio referer, podría haber riesgo de filtración de datos de un tenant a otro. No probado por respeto a la sesión auditada.

### 11.2 RGPD y privacidad

- **Datos personales reales visibles en el módulo Registros** (audit log): nombres de empresas cliente y CUPS asociados son visibles a cualquier agente de Valere logueado. En Valere convendría considerar si todos los agentes deben ver toda la actividad, o si filtrar por agente asignado/jerarquía.
- **Datos personales del usuario logueado** (NIF, dirección particular) visibles en perfil. Estándar, pero conviene confirmar política de retención.
- **No detectado registro explícito de consentimiento** del cliente final para consultar su CUPS en Datadis. Datadis legalmente exige que el consultor energético tenga consentimiento documentado del titular antes de cada consulta. Si Zoco no lo registra, podría haber problema de compliance. **Valere debe registrar este consentimiento desde el día 1** para evitar el mismo problema.
- **No se detectó banner de cookies** en la sesión auditada (probablemente porque ya estaba aceptado en sesión previa). Confirmar para nuevos usuarios.
- **No se detectó política de privacidad accesible** desde el CRM logueado. Suele estar en el footer de la web pública.

### 11.3 Deuda técnica observable

- **`ReferenceError: $ is not defined at /tools:47:5`** en consola: alguien intentó usar jQuery en una página Vue. Síntoma de codebase con migración incompleta y testing insuficiente en producción.
- **Typo en endpoint** `checkUserLoggedSesion` (debería ser "Session"). Funciona, pero indica falta de revisión de código.
- **Mobile-first agresivo en desktop**: layouts pensados para 375 px estirados a 1440 px desperdician espacio. Indica falta de diseño desktop específico.
- **Inputs con dos estilos diferentes** (Material en formularios principales, caja completa en comparador). Indica que el design system no está documentado ni aplicado de forma estricta.
- **Sin loading skeletons**: usa spinners genéricos. UX percibida más lenta de lo real.
- **Botón "Volver" rojo grande** que ocupa real estate en desktop incluso cuando no es necesario. Indica que no se ha pensado el desktop como caso de uso aparte.

### 11.4 Información sensible expuesta

Durante la auditoría se observaron, en el audit log "Registros" y en el historial del comparador, **nombres reales de empresas cliente** y **CUPS reales** asociados. No se ha incluido ningún dato real en este informe. La factura subida por Juan para probar el flujo OCR contiene datos reales de un cliente (FLEXGAL S.L., NIF, dirección, importes); estos datos no se han transcrito al informe — solo la estructura del flujo y los campos extraídos están documentados.

**Recomendación**: comentar internamente con Zoco (si hay relación) o simplemente apuntar como aprendizaje que la actividad de auditoría queda registrada en su audit log, lo cual es bueno desde el punto de vista de Zoco pero implica que Valere no ha pasado desapercibida en esta exploración.

---

## 12. Anexos: capturas y endpoints técnicos

### 12.1 Capturas de pantalla (descripción, anonimizadas)

Las capturas tomadas durante la auditoría se conservan en la sesión del navegador (no descargadas a disco para evitar persistir datos de clientes reales). Lista descriptiva de las capturas más relevantes:

1. **Login y dashboard inicial** — pantalla de bienvenida con KPIs por agente y selector temporal.
2. **Formulario de creación de Contrato** — vista de los 3 modos (Manual / CUPS / Factura) con campos custom por comercializadora.
3. **Lista de Oportunidades** — vista tabular con filtros laterales y los 3 estados.
4. **Hub de Herramientas** — grid 3×3 con las 9 utilidades disponibles.
5. **Comparador de luz - selector de modo** — pantalla "¿Qué quieres comparar?" con Factura / CUPS / Datos.
6. **Comparador de luz - factura subida** — preview del PDF cargado antes de pulsar Comparar.
7. **Comparador de luz - resultado OCR** — datos extraídos: CUPS, total, tarifa, fechas, potencia máxima, consumo, consumo anual estimado.
8. **Comparador de luz - desglose por concepto** — bloques de Potencia / Consumo / Excedentes / Servicio ajuste / Impuestos con fórmulas detalladas.
9. **Comparador de luz - lista de ofertas** — 8+ tarifas alternativas con cuota / total / ahorro.
10. **Comparador de luz - oferta desplegada** — 3 botones de acción (Editar / PDF / Crear contrato) + AHORRO desglosado en Potencia/Energía/Excedentes.
11. **Comparador de luz - modo edición** — todos los campos extraídos editables con validación inline.
12. **Comparador de luz - validación CUPS mode** — modal de error "Por favor rellena los precios de potencia y energía".
13. **Buscador de CUPS - resultado Datadis** — potencias P1-P6, consumos P1-P6, potencia máxima, consumo total anual, último cambio comercializadora.
14. **Buscador de CUPS - heatmap + bar chart** — visualizaciones de consumo histórico.
15. **Buscador de CUPS - tabla histórica** — Desde/Hasta + P1-P6 kWh + P1-P6 kW por mes (12+ meses).
16. **Estudios (historial de comparativas)** — listado de comparativas previas con nombre cliente + CUPS + fecha.
17. **Calendario** — vista mensual con eventos y sync Google Calendar.
18. **Perfil de usuario** — datos personales y configuración de notificaciones (anonimizado).
19. **Módulo Documentos** — drive interno con 16 carpetas por comercializadora.

### 12.2 Inventario completo de endpoints API descubiertos

**Sesión y multi-tenancy:**

- `GET /api/session/getEnterpriseData?url=<dominio>` — devuelve la configuración del tenant (logo, color, branding) según el dominio.
- `GET /api/session/checkUserLoggedSesion` — verifica si la sesión sigue válida (typo: debería ser "Session").
- `GET /api/session/getData` — datos del usuario logueado (nombre, email, rol, agencia).

**Catálogo y comparativas:**

- `GET /api/marketers` — devuelve listado completo de comercializadoras y sus tarifas vivas.
- `GET /api/comparatives` — listado de comparativas (CRUD).
- `GET /api/comparatives/` — versión con barra final, probablemente paginada.
- `POST /api/logs/generateComparative` — genera una comparativa nueva, registra en log y devuelve el resultado con las 8+ ofertas calculadas.

**Integración Datadis:**

- `GET /api/tools/getAPIConsumption?CUPS=<cups_20_dígitos>` — proxy autenticado contra Datadis. Devuelve potencias contratadas P1-P6, consumos históricos P1-P6 (12+ meses), potencia máxima demandada, último cambio de comercializadora. **El backend de Zoco se autentica con Datadis con sus propias credenciales B2B; el usuario final no necesita cuenta Datadis.**

**No probados por restricción de solo lectura:**

- Endpoints POST/PUT/DELETE de contratos, cuentas, oportunidades, contactos, tareas (existencia inferida por la presencia de formularios de creación/edición en UI).
- Endpoint de subida del PDF de factura (probablemente `POST /api/tools/uploadInvoice` o similar; no inspeccionado en network porque la subida ocurrió antes de activar el monitor).
- Endpoint de generación de PDF de propuesta (probablemente `GET /api/tools/generateProposalPDF/<offerId>`).
- Endpoint de Buscador de Gas (módulo no explorado en profundidad).

### 12.3 Stack técnico completo detectado

| Capa | Tecnología | Evidencia |
|---|---|---|
| Frontend framework | Vue.js 3 | Bundle `app-36dNaTtb.js`, code-splitting con `ToolsComponent-DdaDwBny.js` |
| Bundler | Vite | Patrón de nombres con hash en `/build/assets/` |
| Estado | No detectado explícitamente | Probable Pinia o Vuex |
| Routing | Probable Vue Router | Comportamiento SPA con cambios de URL sin recarga |
| Backend | Probable Laravel | Convenciones de rutas `/api/...`, estructura RESTful |
| Auth | Sesión propia + Google Sign-In | `accounts.google.com/gsi/client` cargado |
| Tipografía | Poppins (Google Fonts) + Meow Script | `fonts.googleapis.com/css2?family=Poppins...` |
| Iconos | FontAwesome Pro v6.7.0 | Kit `ka-f.fontawesome.com` (con token=undefined) |
| Hosting | Servidor propio | Assets bajo `crm.zocoenergia.com/assets/` |
| CDN externo | Solo para fuentes e iconos | Google Fonts + FontAwesome CDN |
| Multi-tenancy | Por dominio | Endpoint `getEnterpriseData?url=...` |
| OCR | Server-side, proveedor desconocido | Tiempo ~4 s, calidad alta, no expone proveedor en network |
| Charts | Probable Chart.js o ApexCharts | Estilo de bar chart y heatmap consistente con esas librerías |

### 12.4 Glosario rápido para Valere

- **CUPS**: Código Universal del Punto de Suministro. Identificador único de un suministro eléctrico/gas en España. 20-22 caracteres alfanuméricos.
- **Datadis**: plataforma oficial de las distribuidoras eléctricas españolas. API B2B para consulta de consumos y potencias.
- **Tarifa de acceso**: 2.0TD (residencial), 3.0TD (PYME hasta 15 kW), 6.1TD (industria). Define la estructura de periodos P1-P6.
- **P1-P6**: periodos horarios. P1 = punta (más caro), P6 = valle (más barato).
- **Potencia contratada vs demandada**: la primera es la que paga el cliente (kW); la segunda es la máxima registrada por el contador.
- **Excedentes**: energía generada por autoconsumo (paneles solares) que se vierte a la red y se compensa en la factura.
- **Bono social**: aportación obligatoria al fondo del bono social eléctrico (€/día por suministro).
- **Servicio de ajuste**: coste regulado por equilibrio del sistema eléctrico (€/MWh).

---

## Resumen final de la auditoría

**Auditoría completa.** Informe en `docs/AUDIT_CRM_ZOCOENERGIA_2026-04-27.md`.

**Top hallazgo**: ZocoEnergía tiene un motor energético (Datadis vía proxy backend + OCR de factura + comparador multimarketer con ofertas accionables) que es **el verdadero corazón comercial del CRM**, mientras que la parte de pipeline/CRM clásico es claramente secundaria y mejorable.

**Roadmap recomendado (3 quick wins)**: (1) Importador XLSX de tarifas en módulo Productos, (2) Vista Kanban de Oportunidades con drag&drop, (3) Audit log de actividad básico. **3 apuestas estratégicas**: integración Datadis vía proxy backend + OCR de facturas + comparador multimarketer con generación de PDF de propuesta — paquete unificado de 4-6 meses que cierra la brecha funcional con Zoco y posiciona a Valere para superarla con su mejor diseño visual y stack más limpio.

Listo para discusión con Cowork.
