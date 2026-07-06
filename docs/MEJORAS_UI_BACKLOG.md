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
- [empresas] Filtro por comercial en el listado (desplegable «Todos los comerciales» / comercial concreto / «Sin asignar»), export respeta el filtro · Juan · S · 📦 v1.1
- [empresas] DATOS: backfill de `tipo` en clientes existentes según conocimiento de carpetas · Juan · M · 🔀 derivada a workstream datos
- [empresas] DATOS: backfill de `ciudad` desde facturas/documentación · Juan · M · 🔀 derivada a workstream datos
- [empresas] Concepto "canal" como asignable (además de comerciales): no existe en el esquema actual — pendiente decisión de modelado · Juan · L · ❓ pendiente aclarar
- [empresas] Alta de empresa con subida de PDF/Excel (facturas, CIF, listados): extraer datos y prerrellenar el formulario automáticamente, campos siempre editables antes de guardar · Juan · L · 📥 ⚠️ la extracción necesitará backend (Edge Function IA) → parte derivada

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
