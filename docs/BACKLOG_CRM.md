# Backlog CRM Valere

> **Lista viva** de mejoras pendientes. Última actualización: 2026-04-27.
>
> **Cómo añadir entrada (Juan)**: ve a la sección "🆕 Sin priorizar (entrada rápida)" al final y añade una línea con sintaxis `- [bug|feature|idea] <descripción> — <fecha>`. La próxima sesión Driver Cowork la procesa.
>
> **Cómo procesar (Driver Cowork)**: mueve entradas de "Sin priorizar" a la sección de prioridad apropiada (Esta semana / Próximo mes / Trimestre / Futuro / Descartado). Asigna estimación y dependencias.
>
> **Cómo cerrar (Implementador)**: marca el ítem con ✅ y mueve a sección "Hecho" al cerrar el PR. Cada 3 meses, archiva "Hecho" en `docs/BACKLOG_HISTORICO_<año>.md`.

---

## 🔥 Esta semana (Sprint actual)

> **Sprint A — Quick Wins post-auditoría ZocoEnergía** (decisión Juan 2026-04-27).
> Objetivo: 4 quick wins en 2 semanas, lanzados como 4 Implementadores en paralelo.

- [ ] **[feature] Vista Kanban Oportunidades con drag&drop** — etapas configurables (`prospecto/contacto/propuesta/negociación/ganada/perdida`), columnas con count + suma €, drop entre columnas actualiza `oportunidades.etapa`. `@dnd-kit/core` y `@dnd-kit/sortable` ya en `package.json`. Estimación: 1-2 sem. Rama sugerida: `claude/kanban-oportunidades`. Diferenciador inmediato vs Zoco. Origen: roadmap auditor sección 10.1 #2.
- [ ] **[feature] Importador XLSX de tarifas comercializadoras** — botón en `AdminPage` tab Comercializadoras, parseo con `sheet-js` (ya en stack), validación + bulk insert/upsert en `comercializadora_ofertas`. Estimación: 1 sem. Rama: `claude/importador-xlsx-tarifas`. Origen: roadmap auditor sección 10.1 #1.
- [ ] **[feature] Audit log básico de actividad** — tabla `audit_log` polimórfica (`entidad_tipo + entidad_id + accion + actor_id + payload jsonb + created_at`), triggers en tablas críticas (user_profiles cambios rol, empresas/contratos/oportunidades borrados), página `/admin?tab=auditoria` solo master. Estimación: 1 sem. Rama: `claude/audit-log`. Cierra M-03 del audit seguridad. Origen: roadmap auditor sección 10.1 #4 + audit seguridad M-03.
- [ ] **[feature] Botón "Atrás contextual" prominente en cabecera** — componente `<BackButton to="..." label="..." />` reutilizable, color marca (no rojo), prominente en pantallas de 2º+ nivel (detalles de empresa/oportunidad/contrato), texto inteligente "← Volver a Oportunidades". Estimación: 3 días. Rama: `claude/back-button-contextual`. Origen: roadmap auditor sección 10.1 #3 + patrón UX 9.3.

---

## 📅 Próximo mes (Sprint B + preparación Sprint C)

### Sprint B — Holded Fase 2 (catálogos)

- [ ] **[feature] Holded Fase 2 — pull catálogos** — 9 tablas espejo + Edge Function `holded-pull-catalogs` + cron diario 03:30 UTC + activar botón "Pull manual" del HoldedTab. Plan: `docs/PLAN_INTEGRACION_HOLDED.md` § Fase 2. Estimación: 5 h. Tasks #9-15 ya creadas en TodoList. Rama: `claude/holded-fase2`.
- [ ] **[feature] Holded Fase 3 — sync contactos bidireccional** — última fase planificada antes de la fase de documentos comerciales. Estimación: 3-4 días. Origen: `docs/PLAN_INTEGRACION_HOLDED.md` § Fase 3.

### Preparación Sprint C — Datadis-as-a-Service

- [ ] **[task] Redactar `docs/PLAN_INTEGRACION_DATADIS.md`** — mini-spec completo: arquitectura proxy, endpoints Datadis, Vault credenciales master, schema RGPD consentimiento, flujo solicitud al cliente final, mapeo a tablas Valere, plan de fases. Estimación: 1-2 h. Quién: Cowork.
- [ ] **[task admin] Trámite alta empresa habilitada Datadis** — Juan inicia papeleo con Datadis para alta como consultora energética. Pre-requisito bloqueante para implementación Datadis vía proxy. Tarda 2-4 semanas según info pública. Quién: Juan + asesoría legal si es necesario.

### Quick wins adicionales

- [ ] **[feature] Carpetas docs predefinidas por comercializadora** — extender `documentos_entidad_tipo_check` con `'comercializadora'`, UI tipo árbol en módulo Documentos con 16 carpetas seedeadas (Endesa, Naturgy, Iberdrola, Repsol, etc.). Estimación: 2-3 días. Origen: roadmap auditor sección 10.1 #5.
- [ ] **[feature] Patrón "headline + drill-down" en cards de oportunidad y contrato** — refactor de las cards en lista para mostrar 3 cifras destacadas (valor estimado / probabilidad % / fecha cierre) con chevron desplegable que muestra detalle completo. Estimación: 1 sem. Origen: roadmap auditor sección 10.1 #6 + patrón UX 9.2.
- [ ] **[feature] Empty states con ilustración + CTA** — componente `<EmptyState icon label cta />` reutilizable en todos los módulos sin datos. Estimación: 3-5 días. Origen: roadmap auditor sección 10.1 #7.

---

## 🌟 Trimestre actual (próximos 90 días)

### Sprint C — Motor energético (paquete crítico, paridad funcional con Zoco)

- [ ] **[feature crítica] Datadis-as-a-Service vía proxy backend** — Edge Function `datadis-proxy` con credenciales master en Vault, cache 24h en Postgres, consentimiento RGPD por CUPS. Sustituye y elimina C-04 del audit seguridad (no más passwords plain). Estimación: 4-6 sem dev + 2-4 sem trámite (paralelo). Depende de: trámite admin Datadis. Origen: roadmap auditor sección 10.2 #1 + C-04 audit seguridad.
- [ ] **[feature crítica] OCR de facturas eléctricas** — extracción 20+ campos (CUPS, tarifa, periodos, potencias, consumos, precios, excedentes, impuestos) + override manual completo (patrón 9.1). Posibles proveedores: Google Document AI, AWS Textract, Mindee, custom Tesseract + parser por comercializadora. Estimación: 6-8 sem. Origen: roadmap auditor sección 10.2 #2.
- [ ] **[feature crítica] Comparador multimarketer con desglose granular** — depende de Datadis y catálogo tarifas vivo. Reutiliza `AnalisisPage` actual + redesign con desglose Potencia/Energía/Excedentes/Impuestos + lista 8+ ofertas con cuota/total/ahorro. Estimación: 6-8 sem. Origen: roadmap auditor sección 10.2 #3.

### Cierre del funnel comercial

- [ ] **[feature] Generación PDF de propuesta con marca blanca** — plantilla configurable por usuario/agencia, datos del comparador inyectados automáticamente. Estimación: 2-3 sem. Origen: roadmap auditor sección 10.2 #4.
- [ ] **[feature] Conversión "oferta → contrato + contacto" en 1 click** — desde el comparador, botón que crea cuenta+contacto+contrato en una transacción. Estimación: 1-2 sem. Depende de: comparador rediseñado. Origen: roadmap auditor sección 10.2 #5 + patrón UX 4.7.
- [ ] **[feature] Workflow renovaciones automatizadas** — alertas X días antes vencimiento (configurable por contrato), escalado automático si comercial no actúa, plantillas comunicación cliente. Tabla `renovaciones` ya existe. Estimación: 2-3 sem. Origen: roadmap auditor sección 10.2 #6 + Valere ya tiene base. **Diferenciador vs Zoco** que no lo tiene.

### Diseño y UX

- [ ] **[feature] Dark mode + redesign design system** — tokens de color en CSS vars con dual mode, jerarquía tipográfica clara con tamaños distintos h1/h2/h3, microinteracciones. Estimación: 3-4 sem. Origen: roadmap auditor sección 10.2 #8.

### Otros

- [ ] **[feature] Modo Comparador multipunto** — para clientes B2B con varios CUPS simultáneos. Estimación: 2-3 sem. Origen: roadmap auditor sección 10.2 #9.
- [ ] **[feature] Sistema tickets/incidencias con SLAs** — tabla `incidencias` ya existe, falta UI + workflows + plantillas respuesta. Estimación: 4-6 sem. Permite vender módulo "Atención al cliente" como upgrade. Origen: roadmap auditor sección 10.2 #7.

---

## 🔭 Futuro (3-9 meses, expansión estratégica)

- [ ] [feature] Marketplace integraciones — eInforma, Axesor, Signaturit, WhatsApp Business, Mailchimp, Zapier
- [ ] [feature] Automatizaciones configurables tipo Zapier interno (triggers + actions sin código)
- [ ] [feature] Scoring leads y oportunidades con ML
- [ ] [feature] App móvil nativa (React Native) con escaneo factura desde cámara
- [ ] [feature] Booking público estilo Calendly
- [ ] [feature] API pública documentada + webhooks salientes
- [ ] [feature] Multi-tenant white-label (vender Valere a otros consultores)
- [ ] [feature] Reports/Analytics avanzados con builder dashboards custom
- [ ] [feature] Firma electrónica integrada (Signaturit / Validated ID)
- [ ] [feature] WhatsApp Business como canal cliente
- [ ] [feature] Módulo Feedback nativo en CRM con botón flotante + screenshot automático
- [ ] [feature] Honeypot defensivo para detectar scrapers (patrón Zoco)
- [ ] [feature] 2FA obligatorio en cuentas admin (M-01 audit seguridad)

---

## 🛡️ Seguridad y RGPD (pendientes audit 2026-04-27)

- [ ] **[seguridad C-03]** Decidir nomenclatura única de roles + migration unificar (`master/manager/consultant/client` vs `admin/jefe_equipo/comercial/visor`). 1 h decisión + 15 min código. Bloqueante para escalar permisos del CRM.
- [ ] **[seguridad C-04]** ❌ Cancelar este — sustituido por "Datadis-as-a-Service" del Sprint C. La nueva arquitectura elimina la necesidad de almacenar passwords cliente.
- [ ] **[seguridad M-01]** MFA obligatorio cuenta Supabase. 5 min Juan en Dashboard.
- [ ] **[seguridad M-02]** Network restrictions Supabase. 30 min análisis IPs + 5 min config.
- [ ] **[seguridad M-04]** Retención logs > 7 días (decisión upgrade Pro vs export propio a R2).
- [ ] **[seguridad M-05]** Backup offsite cifrado a Cloudflare R2. 1 día.
- [ ] **[seguridad M-07]** Revisión `crm_help_embeddings` — confirmar que no hay info sensible en docs/help.
- [ ] **[RGPD]** Política RGPD formal: registro tratamientos + Holded como sub-encargado + Datadis como sub-encargado + plan incident response. Bloqueante antes de activar sync live Holded (Fase 5+).

---

## 🧹 Deuda técnica conocida

- [ ] **[deuda]** Chat Gemini con API key expuesta en cliente — mover a Edge Function. Origen: CLAUDE.md decisión 4.
- [ ] **[deuda]** Tipos Calc en `src/types/database.ts` separados — integrar con `src/core/types/database.ts`. Origen: roadmap fusión Fase 20.7.
- [ ] **[deuda]** `proposals` (legacy Calc) y `propuestas` (canónica CRM) coexisten — consolidar bajo `propuestas`, drop `proposals`. Hoy ambas con 0 filas, momento ideal.
- [ ] **[deuda]** AdminPage 2 caminos para aprobar usuarios (tab "Usuarios" legacy + tab "Pendientes" con email) — consolidar en uno.
- [ ] **[deuda]** Cast `as any` en `src/features/admin/components/HoldedTab.tsx` — desaparece al regenerar `database.ts` con `supabase gen types`. Hacer al cierre Fase 2.
- [ ] **[deuda]** PR Holded Fase 1 abierto sin mergear — mergear a main para arrancar Fase 2 limpia. 30 s en GitHub.

---

## ⚙️ Tareas operativas pendientes

- [ ] **[operativo]** Verificar NIF correcto de **PAZ Y BIEN 5002AP** (Valencia) y actualizar desde UI. Detectado en audit datos pre-Holded. 5 min.
- [ ] **[operativo]** Smoke test UI Fase 2 unificación en `valere-v2.pages.dev/empresas` (5 min). Pendiente desde 2026-04-27.
- [ ] **[operativo]** Decisión cutover URL Potencias-app — pospuesta. Sprint dedicado cuando se decida cerrar el satélite.
- [ ] **[operativo]** Migrar PDFs Storage Potencias → CRM (~100 PDFs, 15 MB). 4 h.
- [ ] **[operativo]** Decisión Vercel 301 redirect — pendiente desde sprint de migración Cloudflare.
- [ ] **[operativo]** Sprint cutover URL Potencias views completas (3-5 sem) — `docs/PLAN_UNIFICACION_FASE_6_2026-04-26.md`.

---

## 🆕 Sin priorizar (entrada rápida)

> Juan añade aquí líneas en uso real. La próxima sesión Driver Cowork las procesa y mueve a la sección apropiada.

<!-- ejemplo:
- [bug] El selector de comercializadora se queda colgado al cargar +50 ofertas — 2026-04-28
- [feature] Quiero filtrar oportunidades por comercial en el Kanban — 2026-04-29
-->

---

## ✅ Hecho (en este trimestre)

> Cuando un Implementador cierra un PR mergeable, mueve el ítem aquí marcado con ✅ y la fecha del merge.

- ✅ **[2026-04-27] Sprint Holded Fase 0+1** — auditoría datos pre-Holded + infraestructura completa (5 tablas + 18 policies + cron + Edge Functions + UI tab). Aplicado en prod via agente Browser. Verificado smoke test end-to-end (HTTP 200 `{"processed":0}`).
- ✅ **[2026-04-27] Auditoría seguridad y hardening crítico** — C-02 + C-05 + M-08 cerrados via apply_migration. RLS hardening 8 tablas Potencias-side. C-01 resuelto (Juan reseteó passwords). M-06 decidido NO aplicar (requiere Pro plan).
- ✅ **[2026-04-27] Auditoría CRM ZocoEnergía completa** — informe en `docs/AUDIT_CRM_ZOCOENERGIA_2026-04-27.md`. 12 secciones, roadmap de 30+ items, calificación design system Zoco 5,3/10.
- ✅ **[2026-04-27] Fase 2 unificación Potencias** — 526 filas migradas Potencias → CRM con dedupe + 0 huérfanos.
- ✅ **[2026-04-26] Sprint signup-aprobación-manual** — flujo de alta pública con aprobación master desplegado en prod.
