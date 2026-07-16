# MEJORAS UI · Backlog — Módulos y Presentación

> Workstream permanente de mejora continua de UI (diseño, botones, opciones, presentación).
> Reglas: rama `claude/ui-<modulo>-<tema>` por paquete · 1 PR = 1 módulo/tema · cortafuegos H4 (diff contra origin/main de cada fichero antes de commit) · este workstream NO toca BBDD, SQL, RLS, Edge Functions, datos ni telemetry.ts.
> Ciclo: propuesta visual → OK Juan → código → checks verdes (tsc 0 + tests) → paseo preview Cloudflare → merge.

**Formato de entrada:** `[módulo] descripción · origen (Juan / telemetría / equipo) · tamaño (S/M/L) · estado`

**Estados:** 📥 backlog · 📦 en paquete · 🔨 en curso · 👀 en review/preview · ✅ mergeado · ❌ descartado

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
- [renovaciones] Búsqueda rápida + orden por encabezados + selector de empresa filtrable (código ya preparado en `APLICAR_RENOVACIONES_UX.ps1`, pendiente aplicar) · Juan · M · 📦

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

> Última actualización: 2026-07-06
