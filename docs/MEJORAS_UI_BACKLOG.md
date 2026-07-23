# MEJORAS UI · Backlog — Módulos y Presentación

> Workstream permanente de mejora continua de UI (diseño, botones, opciones, presentación).
> Reglas: rama `claude/ui-<modulo>-<tema>` por paquete · 1 PR = 1 módulo/tema · cortafuegos H4 (diff contra origin/main de cada fichero antes de commit) · este workstream NO toca BBDD, SQL, RLS, Edge Functions, datos ni telemetry.ts.
> Ciclo: propuesta visual → OK Juan → código → checks verdes (tsc 0 + tests) → paseo preview Cloudflare → merge.

**Formato de entrada:** `[módulo] descripción · origen (Juan / telemetría / equipo) · tamaño (S/M/L) · estado`

**Estados:** 📥 backlog · 📦 en paquete · 🔨 en curso · 👀 en review/preview · ✅ mergeado · ❌ descartado

---

## CRUCE DOC2 ↔ BACKLOG (2026-07-17 · única re-priorización admitida, semana 1)

Cruce de `docs/analisis_plataformas_junio/DOC2_MEJORAS_PRIORIZADAS_CRM_VALERE.md` con este backlog y el plan `PLAN_CRM_UTIL_4SEMANAS.md`. **Veredicto: la lista de la semana 1 queda CERRADA como está en el plan (PR-1.1 → PR-1.5), sin ampliaciones.**

| DOC2 | Encaje en el mes CRM ÚTIL | Decisión |
|---|---|---|
| #1 Autorrelleno por CUPS (SIPS+Datadis) | Autorrelleno ya diferido a Suministros it. 2; SIPS F1 aparcado en rama `claude/f1-sips-cups` | Backlog v2 (post-mes) |
| #2 Buscador de CUPS standalone | YA CABLEADO en rama aparcada `claude/f1-sips-cups` | No entra; retomar la rama en backlog v2 |
| #3 Alta por factura (OCR) | Candidato auditor: **semilla del asistente PR-3.2** (semana 3). El importador OCR de la calculadora ya existe; PR-3.2 puede añadir "empezar desde factura" como paso 0 opcional SI cabe en <300 líneas; si no, backlog v2 | Anotado en PR-3.2, sin ampliar su CA |
| #4 Recordatorios renovación + bandeja | CUBIERTO por semana 2 (PR-2.2/2.4/2.5) y semana 4 (PR-4.2 push lunes) | Ya en plan, sin duplicar |
| #5 Rentabilidad €/% cartera | Depende de #6 comisiones (workstream comisiones/Holded propio) | Backlog v2, tras módulo comisiones |
| #6-#11 (P1) | Fuera del alcance del mes por definición del plan | Backlog v2 |
| #12-#15 (P2) | Ídem; #14 mapa de calor conecta con PR-4.1 (curva) pero NO se adelanta | Backlog v2 |
| #16-#17 (P3) | Planes propios (telemedida DOC3) | Sin cambio |
| Hardening transversal | Ya regla del proyecto (RLS estricto en toda tabla nueva); aplica a PR-3.3 (RLS bucket) y PR-4.2 | Sin PR propio |

**Candidatos del auditor (paseo Zoco 16-jul):**
- Buscador global multi-entidad → **ya existe** (`src/components/search/GlobalSearch.tsx`: empresas, contactos, contratos por CUPS, oportunidades). Mejora incremental (añadir renovaciones/incidencias, buscar contrato por nombre de empresa, revisar filtro `estado_relacion='cliente'`) → entrada nueva 📥 abajo, **backlog v2** — semana 1 no va sobrada (día 1).
- Alta por factura → semilla anotada en PR-3.2 (ver tabla), no toca semana 1.

---

## Entradas

- [empresas] Quitar columna Segmento del listado (mantener en export/form) · Juan · S · ✅ PR #58
- [empresas] Ordenación por columna clicando encabezado (asc/desc, indicador visual) — API ya soporta `sort` · Juan · M · ✅ PR #58
- [empresas] Etiquetas legibles de Tipo en tabla y filtro (hoy sale el valor raw `comunidad_propietarios`); renombrar "Comunidad" → "CCPP" · Juan · S · ✅ PR #58
- [empresas] Añadir tipo "Residencial" al filtro y formularios · Juan · S · ✅ PR #58 (UI) ⚠️ CHECK BBDD pendiente → derivada
- [empresas] Columna "Comercial" con desplegable editable inline (lista de `user_profiles`), guarda en `empresas.comercial_id`, sincroniza vía invalidación react-query en todo el CRM · Juan · M · ✅ PR #58
- [empresas] Paginación completa (⏮⏭, números con elipsis, salto directo) — componente `core/components/Pagination.tsx` reutilizable · Juan · S · ✅ PR #58
- [empresas] Filtro por comercial en el listado (desplegable «Todos los comerciales» / comercial concreto / «Sin asignar»), export respeta el filtro · Juan · S · ✅ PR #59
- [empresas] DATOS: backfill de `tipo` en clientes existentes según conocimiento de carpetas · Juan · M · 🔀 derivada a workstream datos
- [empresas] DATOS: backfill de `ciudad` desde facturas/documentación · Juan · M · 🔀 derivada a workstream datos
- [empresas] Concepto "canal" como asignable (además de comerciales) · Juan · L · 🔀 RESUELTO por auditoría → workstream datos: 7 canales como `user_profiles` rol `channel` sin login (plan `docs/PLAN_FASE1_2_CANALES.md`)
- [empresas] Alta de empresa con subida de PDF/Excel (facturas, CIF, listados): extraer datos y prerrellenar el formulario automáticamente, campos siempre editables antes de guardar · Juan · L · 📥 ⚠️ la extracción necesitará backend (Edge Function IA) → parte derivada
- [renovaciones] Mostrar el **código CUPS** en cada fila del listado. Hoy sólo se ve el nombre de empresa, que se repite en empresas multi-sede (ej. BLUENET = 18 CUPS, REAL CANOE = varios) y PARECE duplicado sin serlo. Verificado en BBDD: 0 duplicados de CUPS enlazado; son puntos distintos + histórico de rotación · Juan · M · 📥
- [renovaciones] Para renovaciones sin CUPS visible (rotación/enlace perdido): mostrar "sin CUPS" o el nº de contrato como identificador, para que nunca haya dos filas indistinguibles · Juan · S · 📥
- [renovaciones] (Opcional) Agrupar por empresa con las sedes/CUPS desplegables (estilo árbol): BLUENET ocupa 1 fila que despliega sus 18 · Juan · L · 📥
- [renovaciones] Búsqueda rápida + orden por encabezados + selector de empresa filtrable (código ya preparado en `APLICAR_RENOVACIONES_UX.ps1`, pendiente aplicar) · Juan · M · ✅ cubierta por PR-2.2 (useListParams + chips); el script APLICAR_* queda obsoleto
- [renovaciones] ⏳ **CADUCIDAD del patrón de carga completa** (decisión (a) semana 2, condición del auditor 21-jul-2026): cuando `renovaciones` supere **~2.000-3.000 filas vivas**, la opción (b) deja de ser opcional — vista SQL con el cálculo Vigente/Histórico base-20 + filtros y paginación server-side. Hoy ~504 vivas y creciendo despacio. Nota gemela en código: `RenovacionesPage.tsx`, junto a `LISTA_PAGE_SIZE` · auditor · L · 📥 dormida hasta el umbral (revisar en cada gate mensual)
- [search] Buscador global multi-entidad v2: añadir renovaciones e incidencias Datadis a `GlobalSearch`, buscar contratos por nombre de empresa, revisar filtro `estado_relacion='cliente'` (hoy excluye leads) · auditor (paseo Zoco 16-jul) · M · 📥 backlog v2
- [empresas] Cabecera: fallback del chip Comercial al comercial dominante de los contratos cuando `empresas.comercial_id` es nulo (estilo "heredado"), o alternativa: acción rápida "asignar comercial" desde el propio chip · auditor (cuadre PR-1.1) · S · 📥 pendiente decisión Juan en paseo PR-1.1
- [empresas] Cabecera: el chip de renovación debe contar lo URGENTE, no solo lo próximo — añadir aviso compacto "⚠ N vencidas" (renovaciones con fecha pasada no gestionadas, caso PAZ Y BIEN: badge "13/04/2027 · Baja" sobre 4 críticas vencidas) y tratar el caso BLUENET "— · 18 sin fecha" · auditor (paseo PR-1.3) · S · 📥 decidir tras verlo pintado
- [empresas] Ficha: hacer explícita la persistencia de pestaña entre fichas sincronizándola a `?tab=` en la URL (hoy funciona por accidente de React Router — aceptado como decisión en paseo PR-1.1; el sync además haría los enlaces compartibles) · auditor · S · 📥
- [contratos] Detalle: unificar fuente de prioridad — leer renovación viva con fallback "estimada" · auditor (paseo PR-1.2) · S · ✅ PR #69
- [contratos] Detalle: no pintar "(0d)" cuando fecha_fin es null (línea 52 ContratoDetailPage, sufijo incondicional) · auditor (paseo PR-1.2) · S · ✅ PR #69
- [contratos] Detalle: tabla CUPS junta visualmente Estado y Dirección ("…EB1Factivo") — falta padding/separación entre columnas · auditor (paseo PR-1.3) · S · 📥 cosmética mínima
- [infra] **Cache-busting tras deploy**: /renovaciones sirvió bundle viejo tras el deploy de PR-2.2 (pantalla en blanco hasta hard reload; un usuario normal no sabe hacer Ctrl+Shift+R). Revisar headers/cache de Cloudflare Pages (_headers con no-cache para index.html) y/o recarga automática ante chunk 404 (evento `vite:preloadError`) · auditor (paseo PR-2.2, 22-jul) · S · 📥
- [rendimiento] 4ª congelación del renderer (~30s) al clicar chips en /renovaciones — mismo patrón lista→transición que los 3 casos previos. Expediente PR-4.3 (semana 4); capturar profile de Performance en PR-2.3 si sale barato · auditor (paseo PR-2.2) · — · 📥 expediente PR-4.3 (4 casos)
- [contratos] Alta por factura (OCR) como paso 0 del asistente PR-3.2 — reutilizar importador calculadora · auditor/DOC2 #3 · M · 📥 anotado en PR-3.2 (semana 3), si no cabe → backlog v2

---

## Paquetes

### v1 — EMPRESAS · presentación (rama prevista: `claude/ui-empresas-presentacion`)
Alcance: quitar Segmento · ordenación por encabezados · etiquetas Tipo legibles + CCPP + opción Residencial · columna Comercial editable inline · paginación completa (componente `core/components/Pagination.tsx` reutilizable).
Estado: ✅ **MERGEADO — PR #58 (squash 5fbfa90, 2026-07-06)**. Checks 5/5, H4 limpio (12 ficheros). Pendiente: paseo funcional en producción.
Fuera de este paquete: subida PDF/Excel con extracción (propuesta aparte, necesita Edge Function).

### Tareas derivadas (fuera de este workstream)
1. **SQL**: ampliar CHECK `empresas.tipo` para incluir `'residencial'` (migración).
2. **Datos**: backfill `tipo` y `ciudad` de empresas existentes (staging Fase 1 / documentación como fuente).
3. **Modelado**: decidir cómo representar "canales" (¿user_profiles con rol canal? ¿tabla nueva?).

---

## Fuentes de prioridad
- Peticiones directas de Juan (este chat).
- Telemetría en producción (`client_telemetry`): route_change → módulos más usados primero; errores → fricciones reales.
- Feedback del equipo.

> Última actualización: 2026-07-22b (paseo PR-2.2 PASA: derivadas cache-busting + 4ª congelación)


## Deuda de esquema (añadido 22-jul-2026, paseo PR-3.3)
- [M] `documentos.tipo` (legacy, check propio con 'documentacion', 'autorizacion', etc.)
  convive con `documentos.tipo_documento` (nuevo, contrato/factura/dni/otro, OCR-ready).
  Hoy el frontend escribe ambas (mapa TIPO_LEGACY en documentos/api.ts; dni→documentacion).
  UNIFICAR: migrar consumidores de `tipo` a `tipo_documento` + backfill + drop del check
  legacy. Cazado por el auditor en el alta NAGINI (documentos_tipo_check violado: el
  codigo heredado escribia la EXTENSION 'pdf' en `tipo`).


## App Gastos Valere (añadido 22-jul-2026, EF `gastos` creada por sesión paralela)
- [S] Endurecer RLS de gastos_tarjeta/justificantes_gasto: authenticated→true actual
  permite a cualquier logueado (futuro role client) leer/escribir gastos de empresa.
- [S] Webhook Make en claro en el HTML público de la PWA → spameable; mover a EF con secret.
- [S] Commitear el fuente de la EF gastos al repo (hoy solo existe desplegada).

## Semana 4 — F2/PR-4.3 (añadido 23-jul-2026, paseo auditor gate V4 — semana 4 4/4 PASA)
- [suministros] Panel de curva inline frágil (`CurvaConsumo` dentro de
  `SuministrosTab`): el auditor lo marcó como punto débil de UX en el paseo
  de PR-4.1/PR-4.3, sin CA propio que lo cubra. Revisar robustez del panel
  (estados de carga/error, comportamiento con curva incompleta) · origen
  auditor · S · 📥 backlog.
- [suministros] `EditarSuministroModal` rechaza CUPS inválido de forma
  silenciosa: el auditor cuadró por SQL que el guardado con CUPS inválido NO
  persiste (correcto), pero el modal no da al usuario una señal clara del
  motivo del rechazo más allá del error de validación del campo — mejorar
  feedback (toast explícito o resaltado más visible) · origen auditor · S ·
  📥 backlog.
