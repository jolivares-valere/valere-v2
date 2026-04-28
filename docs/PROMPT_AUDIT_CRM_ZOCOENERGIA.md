# Prompt — Auditoría CRM ZocoEnergía para gap-analysis vs Valere CRM

> **Objetivo**: lanzar al agente Browser (claude-in-chrome) una auditoría funcional exhaustiva del CRM de ZocoEnergía (competidor sector energético) para identificar funcionalidades, flujos y módulos que Valere CRM no tiene y que podrían incorporarse al roadmap.
>
> **Cómo usar este documento**:
> 1. Juan abre sesión en el CRM de ZocoEnergía con credenciales legítimas (cuenta propia de cuando trabajaba allí, demo, cliente, etc.).
> 2. Juan lanza una sesión nueva con agente Browser (`Claude in Chrome`).
> 3. Juan pega el bloque entre `<<<INICIO>>>` y `<<<FIN>>>` al agente.
> 4. El agente recorre el CRM, toma notas y produce el informe `docs/AUDIT_CRM_ZOCOENERGIA_YYYY-MM-DD.md`.
> 5. Cowork luego procesa el informe y propone roadmap de mejoras.

---

## Contexto que el agente debe conocer ANTES de auditar

### Estado actual de Valere CRM (lo que YA tenemos)

Valere CRM es una app React+Supabase desplegada en `valere-v2.pages.dev`. Cubre:

**Módulos CRM (`src/features/`)**:
- `empresas` — clientes B2B+B2C, NIF/CIF validado, dirección desglosada (calle/cp/ciudad/provincia/pais), tags, comercial_id asignado, soft delete.
- `contactos` — personas FK a empresas, decisor/firmante flags, email/móvil/teléfono, cargo, departamento.
- `contratos` — contratos energéticos asociados a CUPS, FK empresa, fechas inicio/fin, comercializadora actual.
- `cups` — puntos de suministro eléctrico/gas (73 hoy), tarifa, potencias contratadas P1-P6, consumos, FK empresa.
- `oportunidades` — kanban con etapas (`prospecto/contacto/propuesta/negociación/ganada/perdida`), valor estimado €, probabilidad %, fecha cierre prevista, ahorro_anual_estimado.
- `actividades` — polimórficas (entidad_tipo + entidad_id), llamadas/emails/reuniones/tareas, asignado_a, prioridad, estado_tarea, fecha_vencimiento.
- `dashboard` — KPIs comerciales: pipeline €, conversión, oportunidades por etapa, contratos por vencer.
- `importador` — CSV bulk import de empresas/CUPS/contratos.
- `propuestas` — propuestas comerciales generadas (PDF), tabla `propuestas` (canónica) + `proposals` (legacy).
- `incidencias` — reclamaciones/incidencias clientes (tabla creada, sin UI todavía).
- `renovaciones` — seguimiento de contratos próximos a renovar.
- `tareas` — tareas con asignación.
- `documentos` — polimórfico con `documentos_tipo_check` (factura/contrato/dni/poder/estudio_ahorro/email_enviado/otros), Storage adjuntos.
- `eventos` — calendario polimórfico (sin UI todavía).

**Calculadora ofertas energéticas (`src/features/`)**:
- `analisis` — captura facturas (PDF parsing → JSON), comparativa contra ofertas comercializadoras, simulación ahorro.
- `datos` — pantalla edición de datos del cliente para análisis.
- `propuestas-energia` — generación PDF de propuesta con análisis y oferta seleccionada.
- `tracking` — seguimiento del ciclo propuesta→firma→activación.
- `chat-ia` — widget chat con Gemini (deprecado, mover a Edge Function).
- `admin` — panel CRUD comercializadoras + ofertas + precios regulados BOE + config global.
- `asistente-crm` — widget RAG flotante con docs/help/ embebidos en pgvector.

**Auth & roles**:
- Roles canónicos: `master | manager | consultant | client`.
- Signup público con aprobación manual del master (ruta `/signup` → `/pending-approval`).
- AuthGuard que redirige usuarios no aprobados.
- Email notifications via Resend (`notify-admin-pending-user`, `notify-user-approval-decision`).

**Integraciones**:
- Datadis (lectura consumos eléctricos clientes — credenciales encriptadas pendiente sprint).
- Holded ERP (Fase 0+1 aplicada 2026-04-27, Fase 2-6 en roadmap).

**Stack técnico**: React 19 + TypeScript 5 + Vite 6 + Tailwind 4 + Supabase JS 2 + react-query 5 + react-hook-form + zod + Framer Motion + Recharts + Sonner toasts + shadcn/ui.

**Schema Supabase**: 43 tablas (22 CRM dominio + 14 Potencias unificadas Fase 2 + 7 mapping audit).

**Lo que NO tenemos hoy**:
- Calendario funcional (tabla `eventos` existe, sin UI).
- Calendarización drag-drop estilo Outlook/Google Calendar.
- Workflows / automatizaciones sin código (tipo Zapier/n8n).
- Chat interno entre comerciales / equipo.
- Notificaciones in-app (tabla `notificaciones` existe, sin push real-time).
- Integración email bidireccional (leer/enviar Gmail/Outlook desde CRM).
- Generación de propuestas con plantillas avanzadas (sólo formato fijo).
- Firma electrónica de contratos.
- Portal cliente (los `client` ven dashboard pero limitado).
- App móvil (sólo web responsive).
- Reporting/BI avanzado (sólo dashboard básico).
- Marketing automation (campañas email masivas, segmentación).
- Recolección leads automática desde web/landing.
- Integración WhatsApp Business.
- Workflows de aprobación (presupuestos > X € requieren OK manager).
- Roles personalizables por organización.
- Multi-tenant (un único tenant Valere).
- Importador desde otros CRMs (Salesforce/HubSpot/Zoho).
- Audit log de operaciones sensibles.
- Power BI / Looker connector.
- API pública para terceros.

---

## Contexto sobre ZocoEnergía

Competidor del sector energético español. Probablemente consultoría energética B2B con CRM propio (interno o licenciado tipo Zoho/Salesforce custom). Juan tiene/tuvo acceso a su CRM y quiere comparar funcionalidades.

> **Nota al agente**: si descubres que el CRM de ZocoEnergía es en realidad una instancia de un producto comercial (Zoho, Bitrix24, Salesforce, Pipedrive, HubSpot, etc.), repórtalo explícitamente al inicio del informe. Eso cambia el análisis: en lugar de "qué tiene Zoco" pasa a ser "qué features del producto X usan en este sector".

---

## Bloque para copiar al agente Browser

```
<<<INICIO>>>

ROL: Auditor de UX, funcionalidad, diseño visual y responsive de CRMs
en el sector de consultoría energética española. Tu trabajo es producir
un gap-analysis exhaustivo del CRM de ZocoEnergía comparado con Valere
CRM (consultoría energética competidora) cubriendo:
  (a) Funcionalidades y módulos.
  (b) Flujos completos de valor.
  (c) Diseño visual y design system.
  (d) Comportamiento responsive en mobile/tablet/desktop —
      colocación de botones, reorganización de UI, dead zones.
  (e) Roadmap de mejoras priorizadas para Valere.

CONTEXTO PREVIO QUE DEBES LEER ANTES DE EMPEZAR
- Lee primero `C:\Users\joliv\valere-v2\docs\PROMPT_AUDIT_CRM_ZOCOENERGIA.md`
  sección "Estado actual de Valere CRM" para entender qué tiene Valere ya
  y qué reconoce explícitamente como pendiente. Si no tienes acceso a esa
  ruta, pídeselo a Juan: te lo pegará en chat.
- El CRM de Valere es: React + Supabase + Cloudflare Pages, hospedado en
  https://valere-v2.pages.dev. NO necesitas auditar Valere — sólo
  ZocoEnergía. La info de Valere ya te la doy.

OBJETIVO DEL SPRINT
Producir UN único entregable: el archivo
`C:\Users\joliv\valere-v2\docs\AUDIT_CRM_ZOCOENERGIA_<YYYY-MM-DD>.md`
con la estructura definida en la sección ENTREGABLE más abajo.

ACCESO
- Juan ya tiene una pestaña abierta con el CRM de ZocoEnergía y sesión
  iniciada. Si no, pídele que la abra y te confirme cuando esté listo.
- Tú NO debes pedirle credenciales por chat. Si la sesión expira,
  Juan re-loguea manualmente.

REGLAS ÉTICAS Y DE SEGURIDAD (cumplimiento estricto)
1. SOLO LECTURA. No modifiques nada. No crees, edites, borres registros.
   Si por accidente abres un formulario de edición, cancélalo (Esc o
   botón Cancelar) sin guardar.
2. No descargues exports masivos de clientes ni pulses botones de tipo
   "Export CSV", "Download all", "Backup".
3. Las capturas que tomes deben ANONIMIZAR datos personales: nombres,
   emails, teléfonos, NIFs, importes específicos. Reemplaza por
   placeholders tipo `[CLIENTE_X]`, `[NIF_VALIDO]`, `[1.234,00 €]`.
   Si una pantalla tiene mucho dato real, prefiere describirla en
   prosa en lugar de capturarla.
4. No copies texto literal de la app que pueda ser propiedad
   intelectual del proveedor (eslogans, copy de marketing, plantillas
   de email del cliente). Sí puedes describir QUÉ hace cada pantalla.
5. NO uses la información para nada distinto de hacer este informe.
   Una vez entregado el informe a Juan, descarta cualquier dato
   intermedio.
6. Si encuentras información sensible expuesta (passwords visibles,
   datos médicos, datos de menores, etc.), repórtalo a Juan y NO
   lo incluyas en el informe. Es un hallazgo de seguridad, no de
   producto.
7. Si el CRM tiene tu nombre / sesión visible, recuerda que la
   actividad de auditoría queda registrada en logs del proveedor.
   Sé profesional.

PLAN DE TRABAJO PASO A PASO

FASE A — INVENTARIO DE NAVEGACIÓN (45 min)
A.1 Pide a Juan que te ponga la pestaña ZocoEnergía en primer plano.
A.2 Toma una captura del menú principal lateral / barra superior.
A.3 Lista TODOS los módulos de primer nivel visibles, en orden:
    - Nombre exacto del menú
    - Icono que usa (descripción)
    - Si requiere permisos especiales o sólo aparece para ciertos roles
A.4 Por cada módulo, anota cuántos sub-módulos / pestañas tiene.
A.5 Detecta el patrón de navegación:
    - ¿Sidebar fijo o colapsable?
    - ¿Breadcrumbs?
    - ¿Search global?
    - ¿Notificaciones in-app?
    - ¿Selector de organización / multi-tenant?
A.6 Identifica si es producto comercial (Zoho, Bitrix24, Salesforce,
    Pipedrive, HubSpot, Microsoft Dynamics, Odoo, etc.). Pista:
    revisa el favicon, el footer, el HTML source (View → Developer →
    View Source), errores de JavaScript en consola, URLs de assets.
    Si lo identificas, repórtalo al principio del informe.

FASE B — PROFUNDIZACIÓN POR MÓDULO (2-3h)
Por cada módulo de primer nivel, en orden:
B.1 Abre el módulo y lista las acciones principales disponibles
    (botones primarios visibles).
B.2 Toma una captura de la vista principal (lista/dashboard del módulo).
B.3 Si hay un registro de prueba abierto, toma captura del detalle
    SIN datos sensibles.
B.4 Identifica:
    - Campos que el formulario captura
    - Validaciones aparentes (formato NIF, email, etc.)
    - Relaciones FK con otros módulos (ej. contacto → empresa)
    - Filtros y vistas predefinidas
    - Acciones masivas (bulk select)
    - Exportaciones y reports
    - Workflows / automatizaciones disparadas desde este módulo
    - Historial / audit trail visible
B.5 Si el módulo tiene un kanban, calendario, mapa, gráfico, anótalo
    con detalle (eso es lo que probablemente Valere no tiene).
B.6 Compara MENTALMENTE contra Valere (referencia: la sección
    "Estado actual de Valere CRM" del prompt). Anota cada diferencia.

FASE C — FLUJOS COMPLETOS DE VALOR (1h)
Identifica y documenta paso a paso UNO de cada uno de estos flujos
si están presentes en ZocoEnergía:
C.1 Flujo "lead a cliente": cómo entra un lead, cómo se cualifica,
    cómo pasa a oportunidad, cómo se gana.
C.2 Flujo "oportunidad a contrato firmado": qué papeles se generan,
    cómo se firma (DocuSign? firma manual escaneada?), cómo se
    activa el contrato.
C.3 Flujo "renovación de contrato": cómo se detectan vencimientos,
    cómo se notifica al comercial, qué automatización hay.
C.4 Flujo "incidencia / reclamación cliente": cómo se registra,
    cómo se asigna, SLA, cierre.
C.5 Flujo "captura factura cliente": cómo se sube una factura del
    cliente actual y se transforma en datos analizables (consumos
    P1-P6, importe, periodo). ESTO es crítico para Valere.
C.6 Flujo "comparativa de ofertas": cómo se calcula el ahorro
    contra ofertas de comercializadoras. Esto es el corazón de
    Valere también.
C.7 Flujo "generación propuesta para cliente": template, branding,
    PDF, envío.

FASE D — INTEGRACIONES Y EXTENSIONES (30 min)
D.1 Busca página de "Integraciones", "Marketplace", "Apps", "Add-ons".
D.2 Lista qué se integra con qué (Mailchimp? WhatsApp? Datadis?
    Holded? Sage? alguna API energética del sector? OMIE? CNMC?).
D.3 Anota qué tipos de webhooks / APIs expone el CRM.

FASE E — UX, PERFORMANCE Y MOBILE (30 min)
E.1 Sensación general de UX: rápido / lento? bonito / dated?
    confuso / claro? Patrones de diseño usados (cards, tabs,
    drawers, modals).
E.2 Hay versión móvil? App nativa o responsive?
E.3 Hay modo oscuro? Idiomas? Accesibilidad (atajos de teclado,
    contraste)?
E.4 Mide tiempos de carga subjetivos en 3 pantallas distintas.

FASE E.bis — AUDITORÍA RESPONSIVE Y DESIGN SYSTEM (1h, IMPORTANTE)
Esta fase es CRÍTICA para Valere porque actualmente Valere CRM solo
está optimizado para desktop. Necesitamos saber cómo se comporta
ZocoEnergía en distintos dispositivos para tomar decisiones de
inversión en responsive/mobile-first.

Usa los tools del Chrome MCP para cambiar el tamaño del viewport:
  - mcp__claude-in-chrome__resize_window
  o las DevTools "Responsive Design Mode" del navegador.

E.bis.1 — Tres breakpoints obligatorios por cada pantalla clave
Para CADA UNO de estos 5 módulos (los más importantes para Valere):
  (a) Dashboard / home tras login
  (b) Listado de empresas / contactos / clientes
  (c) Detalle de un cliente (vista completa con tabs y subsecciones)
  (d) Formulario de creación / edición (el más completo que veas)
  (e) Vista de oportunidades / pipeline (kanban si existe)

Toma capturas a estos 3 viewports estándar:
  - Mobile:  375 × 812  (iPhone 13)
  - Tablet:  768 × 1024 (iPad portrait)
  - Desktop: 1440 × 900 (laptop estándar)

Por cada captura anota:
  - ¿El sidebar se colapsa en hamburguesa? ¿A qué breakpoint?
  - ¿Los botones primarios cambian de posición? (top, bottom,
    floating action button bottom-right, sticky, etc.)
  - ¿Las tablas se transforman en cards? ¿Mantienen scroll
    horizontal? ¿Se ocultan columnas?
  - ¿Los formularios pasan de 2 columnas a 1? ¿Se mueven labels?
  - ¿Aparece bottom-sheet o drawer en mobile?
  - ¿Hay swipe actions (deslizar para borrar/editar)?
  - ¿El kanban se transforma o sigue siendo columnas con scroll?
  - ¿El header / breadcrumbs / search bar se reorganiza?
  - ¿Aparece sticky bottom navigation en mobile?
  - ¿Los modals pasan a fullscreen en mobile?
  - Detecta DEAD ZONES: elementos que se rompen, se solapan, salen
    fuera del viewport, requieren scroll horizontal innecesario,
    botones inalcanzables con el pulgar (fuera del thumb-zone).

E.bis.2 — Design system inventory
Independientemente del responsive, audita el lenguaje visual:
  - Tokens de color: ¿qué paleta usan? Color primario (hex
    aproximado), secundarios, estados (success/warning/error/info),
    color del kanban por etapa.
  - Tipografía: ¿qué fuente? (inspecciona DevTools → font-family),
    tamaños base de body / titles / captions, line-height
    aparente.
  - Spacing: ¿usan rejilla 4px / 8px / otro? Padding interno de
    cards, margen entre secciones.
  - Componentes signature: chips, badges, progress bars, sparklines,
    timelines, avatares, tags. ¿Qué patrón usan más?
  - Iconografía: librería (Lucide, Heroicons, Font Awesome, custom
    SVGs)? Identifica al menos 3 iconos memorables.
  - Animaciones / micro-interacciones: ¿hay transiciones al
    cambiar de página? ¿Hover states? ¿Skeleton loading?
    ¿Optimistic UI updates?
  - Modo oscuro: ¿existe? ¿se persiste por usuario?
  - Branding intensity: ¿el logo es prominente o discreto? ¿La
    UI siente "marca fuerte" o "neutral SaaS"?
  - Vocabulario UI: ¿usan "Cliente" o "Empresa" o "Account"?
    ¿"Oportunidad" o "Deal" o "Pipeline item"? ¿En español o
    spanglish?

E.bis.3 — Comparación con Valere CRM (referencia)
Valere usa hoy:
  - Tailwind CSS 4 + shadcn/ui (Radix primitivos).
  - Tipografía display custom (`font-display`) + sans system.
  - Colores brand: `valere-blue-dark`, `valere-ink` (paleta corporativa).
  - Iconos lucide-react.
  - Sidebar fijo desktop, NO está optimizado para mobile.
  - Tablas de listado sin transformación responsive (scroll horizontal).
  - Formularios con react-hook-form + zod.
  - Toasts sonner.
  - Animaciones: framer-motion 12 en transiciones de página y kanban.
  - NO tiene modo oscuro.
  - NO tiene drawer mobile.

Para cada decisión de design system de Zoco que sea distinta y
mejor, anota en el informe:
  - Qué hace Zoco
  - Qué hace Valere
  - Qué se podría adoptar (con qué esfuerzo)
  - Qué se debería NO adoptar (porque rompe la marca Valere)

E.bis.4 — Patrón de responsive global
Resume en 1 párrafo: ¿Zoco está pensado mobile-first, desktop-first,
o es genuinamente responsive? Da una nota subjetiva del 1 al 10
sobre la calidad del responsive.

FASE F — ANÁLISIS COMPARATIVO Y RECOMENDACIONES (1h)
Cierra el navegador del CRM (el resto del trabajo es analítico).
F.1 Construye una tabla "Inventario módulos" con 3 columnas:
    | Módulo | Zoco | Valere | Gap |
    Marca con ✅ / ⚠️ (parcial) / ❌ cada celda.
F.2 Construye una tabla "Top 10 features que Valere NO tiene y
    que generan más valor", priorizada por:
    - Impacto en flujo comercial (alto/medio/bajo)
    - Esfuerzo de implementación estimado para Valere
    - Dependencia de Fase futura del roadmap
F.3 Construye una tabla "Top 5 features que Valere tiene MEJOR
    que Zoco" (fortalezas a mantener).
F.4 Identifica 3 patrones de UX concretos de Zoco que valdría la
    pena copiar/adaptar (no copia literal de diseño, sí inspiración
    en flujos).
F.5 Propón roadmap de mejoras priorizadas para Valere CRM en
    formato:
    - QUICK WINS (1-3 días persona)
    - MEDIO PLAZO (1-2 semanas)
    - LARGO PLAZO (1+ mes)
F.6 Roadmap específico de responsive y design system. Separa en
    3 ejes:
    - Mobile-first refactor de las 5 pantallas clave
      (estimación de horas por pantalla)
    - Tokens / design system a unificar (paleta, spacing, tipos)
    - Patrones interactivos a adoptar (drawer, FAB, swipe, etc.)
F.7 Tu opinión informada: ¿Valere CRM se puede pegar más a la
    estética y responsive de Zoco preservando branding propio,
    o tiene que ser rediseño desde cero? Da el veredicto en
    1 párrafo.

ENTREGABLE
Un único archivo Markdown:
`C:\Users\joliv\valere-v2\docs\AUDIT_CRM_ZOCOENERGIA_<YYYY-MM-DD>.md`

Estructura obligatoria:

# Auditoría CRM ZocoEnergía vs Valere CRM
## 0. Resumen ejecutivo (5-8 bullets)
## 1. Identificación del producto auditado (¿es Zoho/Bitrix/custom?)
## 2. Inventario de módulos (tabla)
## 3. Profundización módulo por módulo
   ### 3.1 [Nombre módulo]
   - Captura: `[anexos/captura-N.png]`
   - Funciones principales
   - Campos formulario
   - Diferencias vs Valere
   ### 3.2 ...
## 4. Flujos completos de valor
   ### 4.1 Lead a cliente
   ### 4.2 Oportunidad a contrato
   ### 4.3 Renovación
   ### 4.4 Incidencia
   ### 4.5 Captura factura
   ### 4.6 Comparativa ofertas
   ### 4.7 Generación propuesta
## 5. Integraciones detectadas
## 6. UX, performance y mobile (resumen general)
## 6.bis Auditoría responsive y design system
   ### 6.bis.1 Comportamiento responsive por pantalla clave
       Para cada uno de los 5 módulos auditados (dashboard,
       listado clientes, detalle cliente, formulario, kanban):
       Tabla con 3 columnas (Mobile 375 / Tablet 768 / Desktop 1440)
       y descripción de cómo se reorganiza la UI en cada breakpoint.
       Captura representativa por viewport.
   ### 6.bis.2 Patrones de adaptación detectados
       Sidebar colapsable, hamburguesa, FAB, bottom-sheet,
       drawers, swipe actions, sticky headers, scroll horizontal
       de tablas, transformación tabla→card, etc.
   ### 6.bis.3 Dead zones y problemas observados
       Lista de defectos visuales / UX detectados a cada breakpoint.
   ### 6.bis.4 Design system inventory
       Tabla:
       | Aspecto | Zoco | Valere | Adoptar? |
       Filas: paleta color, tipografía, spacing grid, iconos,
       animaciones, modo oscuro, vocabulario UI, branding intensity.
   ### 6.bis.5 Nota responsive global
       Calificación 1-10 + 1 párrafo explicación.
## 7. Tabla "Top 10 features que Valere no tiene"
   | # | Feature | Impacto | Esfuerzo | Fase Roadmap |
## 8. Tabla "Top 5 fortalezas de Valere vs Zoco"
## 9. 3 patrones UX a copiar/adaptar
## 10. Roadmap de mejoras propuesto
   ### 10.1 Quick wins
   ### 10.2 Medio plazo
   ### 10.3 Largo plazo
## 11. Hallazgos colaterales (security, RGPD, etc.)
## 12. Anexos: capturas anonimizadas

LÍMITES TEMPORALES
Sprint total: 5-6 horas máximo. Si te pasas, prioriza tener algo de
todas las fases A-F antes que profundidad excesiva en una sola fase.

CIERRE
Cuando termines, dile a Juan:
"Auditoría completa. Informe en docs/AUDIT_CRM_ZOCOENERGIA_<fecha>.md.
Top hallazgo: [una frase]. Roadmap recomendado: [3 quick wins en una
línea]. Listo para discusión con Cowork."

REGLAS DE STOP
- Si Juan te pide parar, paras inmediatamente y guardas lo que tengas.
- Si descubres que NO tienes acceso al CRM, paras y reportas a Juan.
- Si la actividad podría infringir términos del proveedor (ej. CRM
  comercial con cláusula anti-scraping), paras y reportas a Juan.

<<<FIN>>>
```

---

## Cómo lanzar la auditoría (instrucciones para Juan)

1. **Apertura**: abre el navegador y ve al CRM de ZocoEnergía. Loguéate con tu cuenta.

2. **Si tu acceso a ZocoEnergía es legítimo y vigente**: lanza una sesión nueva con el agente Browser (Claude in Chrome). Pega el bloque entre `<<<INICIO>>>` y `<<<FIN>>>`. El agente recorrerá el CRM y producirá el informe.

3. **Si tu acceso ya no es vigente** (cuenta cerrada, demo expirada, etc.): no podemos auditar directamente. Alternativas:
   - **Búsqueda pública**: lanza una sesión Cowork con prompt corto: *"Busca información pública sobre el CRM de ZocoEnergía: vídeos demo en YouTube, screenshots en LinkedIn de empleados, casos de éxito publicados, opiniones en G2/Capterra. Resume sus funcionalidades en `docs/AUDIT_CRM_ZOCOENERGIA_PUBLICO_<fecha>.md`."* — más limitado pero seguro.
   - **Demo solicitada**: pide demo comercial en su web. La auditoría se hace con el comercial enseñándote la pantalla.

4. **Cuando termine el agente**, lanza una sesión Cowork (esta misma o nueva) con: *"He cerrado la auditoría CRM ZocoEnergía. Lee `docs/AUDIT_CRM_ZOCOENERGIA_<fecha>.md`, prioriza los gaps detectados contra el roadmap actual de Valere y propón sprints concretos para los Quick Wins."* Cowork procesa el informe e integra recomendaciones en `docs/ROADMAP_FUSION.md` o crea un roadmap específico de mejoras.

---

## Restricciones del prompt (ya incluidas en el bloque)

- ✅ Sólo lectura, no modifica datos del competidor.
- ✅ Capturas anonimizadas (placeholders en lugar de datos reales).
- ✅ No copia texto literal con copyright.
- ✅ No descargas masivas.
- ✅ Stop si encuentra info sensible expuesta o términos del proveedor restrictivos.
- ✅ Output estructurado y reusable.
- ✅ Identifica si es producto comercial (cambia el análisis).

---

## Notas de versionado

- v1 (2026-04-27): primera redacción tras cierre Sprint Holded Fase 0+1.
- Mantener este prompt actualizado conforme Valere CRM evolucione: cada vez que se cierre una Fase Holded o un sprint mayor, actualizar la sección "Estado actual de Valere CRM" para que el agente pueda comparar con la versión más reciente.
