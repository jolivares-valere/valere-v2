# Mensaje para próxima sesión Cowork

**Fecha:** 2026-05-05 (cierre tarde)
**De:** Cowork (jornada 5 sprints encadenados)
**Para:** próxima sesión Cowork / Code

---

## Estado al cierre

Todo desplegado en `main` y validado con smoke real Carolina. Último commit: `d0efcf6` (Fix2 RAG docs).

Sprints completados hoy:
- Sprint C — visibilidad post-handoff + comentarios (`8c38089`).
- Hotfix C — toast + drawer placeholder (`ffb3bfa`).
- Sprint D1 — helper + cards mejoradas (`b3c3d03`).
- Fix1 RAG — Edge Function v20 sin "Fuentes:".
- Fix2 RAG — docs/help al día (`d0efcf6`).

Asistente del CRM responde 5/5 sin "Fuentes:" ni rutas. Carolina puede priorizar leads desde la card sin abrir drawer (semáforo color + texto urgente).

## Orden de prioridad acordado

```
1. Sprint D2 — vista tabla
2. Filtros CRM restantes (Datadis, Renovaciones, Incidencias, Contratos)
3. Regenerar tipos Supabase + quitar 4 casts (supabase as any)
4. Decidir sobre alertas Dashboard (alucinación menor del RAG)
```

NO meter cosas nuevas hasta confirmar D2 con Carolina.

---

## 1. Sprint D2 — Vista tabla (próximo a arrancar)

### Scope cerrado

**Selector de vista en `/captacion`:**
- Posición: arriba a la derecha del header de la página o cerca del botón "+ Nuevo lead".
- Botones: `[Cards] [Tabla]`. Default: `Cards` (no romper uso actual).
- Persistencia: `localStorage.setItem('captacion:viewMode', 'cards' | 'table')` por usuario+ruta.

**Componente nuevo `<TablaCaptacion>`:**
- Layout `<table>` HTML estándar con thead + tbody.
- Click en fila → abre `OportunidadDrawer` (mismo que cards).
- Scroll horizontal en pantallas estrechas.

**Columnas mínimas (orden):**
1. Empresa
2. Teléfono
3. Email
4. Estado / etapa legible (usar `ETAPA_LABELS`)
5. Responsable actual (`responsable_actual_nombre` para "Todos mis casos", o user actual para bandejas operativas)
6. Vencimiento + semáforo (badge color usando `ESTADO_CLASSES`)
7. Siguiente acción (`siguienteAccionLead(etapa, fecha)` ya disponible en `utils/vencimiento.ts`)
8. Última actividad / `updated_at`
9. Origen

**Sort por prioridad:**
Orden por defecto: vencido → rojo → naranja → amarillo → sin_fecha → verde. Dentro de cada grupo, `updated_at` descendente.

**Tabs existentes intactos:**
"Por llamar / Esperando factura / Propuestas / Seguimientos / Todos mis casos" siguen funcionando igual. La vista tabla se aplica dentro de cada tab.

### Archivos a tocar
- `src/features/captacion/CaptacionPage.tsx` — añadir selector + estado de vista + render condicional.
- `src/features/captacion/components/TablaCaptacion.tsx` (NUEVO).
- Helper `siguienteAccionLead` y `ESTADO_CLASSES` ya disponibles desde `utils/vencimiento.ts`.

### NO incluir en D2
- Edición inline.
- Exportar Excel.
- Selección múltiple.
- Filtros avanzados (la prioridad ya viene del semáforo).
- Paginación (volumen actual ~30 casos por user).
- Aplicar a otros listados (Empresas, Contactos, Oportunidades CRM) — eso es scope nuevo si Carolina lo pide.

### Validación previa al commit
- TSC 0
- Tests 89/89 (no hay tests nuevos en D2 — UI puro)
- Build verde

### Smoke esperado tras D2
1. `/captacion` por defecto sigue siendo Cards (no romper).
2. Click en `[Tabla]` → tabla aparece con las columnas.
3. Click en fila → drawer abre.
4. Cerrar drawer + recargar página → conserva vista elegida (localStorage).
5. Cambiar a tab "Todos mis casos" → tabla respeta el filtro.
6. Volver a `[Cards]` → vista cards reaparece con badge semáforo y siguiente acción dinámica.

### Riesgos
- Volumen actual es ~7-10 casos en bandejas operativas y ~30 en "Todos mis casos". Sin paginación es sostenible. Si crece a >100 abrir scope para virtualizar.
- Móvil: `overflow-x-auto` en wrapper de tabla. Si Carolina usa portátil normal, no hay problema.

---

## 2. Filtros CRM restantes

ChatGPT lo identificó cuando hicimos Fase 2-3 pero no se cerró del todo. Verificar y cerrar:
- `src/features/datadis/...` — DatadisPage no debe mostrar prospectos.
- `src/features/renovaciones/RenovacionesPage.tsx` — solo contratos de clientes (probable que ya esté OK porque prospectos no tienen contratos).
- `src/features/incidencias/IncidenciasPage.tsx` — solo de empresas cliente.
- `src/features/contratos/ContratosPage.tsx` — verificar (también probable OK).

Patrón a aplicar: join con `empresa:empresas!inner(estado_relacion)` + `.eq('empresa.estado_relacion', 'cliente')`. Si tipos generados no incluyen `estado_relacion`, usar `(supabase as any)` (consistente con los 4 casts ya documentados).

---

## 3. Regenerar tipos Supabase + quitar casts

```bash
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts
```

Quitar los 4 casts `(supabase as any)` marcados con comentario `// Quitar este cast cuando se regeneren los tipos`:
- `src/features/empresas/api.ts:32`
- `src/features/oportunidades/api.ts:30`
- `src/features/dashboard/api.ts:51`
- `src/components/search/GlobalSearch.tsx:26`

Riesgo: regenerar puede arrastrar errores TSC en otros lugares con `Database = any`. Hacer en branch separada.

---

## 4. Alertas Dashboard (alucinación menor RAG)

En el smoke 5/5, P5 dijo: *"Naranja y Rojo aparecen en Dashboard como alertas"*. Esto NO está implementado. El asistente lo extrapoló.

Dos opciones:
- **A — Ajustar doc:** editar `vencimiento-y-semaforo.md` y quitar/precisar cualquier afirmación que pueda llevar a esa interpretación. Push → workflow regenera embeddings.
- **B — Implementarlo de verdad:** añadir card de alertas en `DashboardPage` que cuente prospectos con vencimiento ≤60 días.

Recomendación: B es scope propio. Empezar por A (rápido, una hora) y meter B en el sprint siguiente si Carolina lo pide.

---

## Notas técnicas

- **Cache Cloudflare:** patrón conocido. Si Carolina reporta UI extraña tras un deploy, primer paso es `Ctrl+Shift+R` y/o cerrar/abrir tab. Si persiste, verificar bundle hash en `View Source` y comparar con dist/ del último build.
- **Workflow embeddings:** funciona con DELETE + INSERT (no UPSERT). Mientras corre, la tabla queda vacía durante ~30-60s. No alarmarse si una query justo en ese momento devuelve 0 chunks.
- **Embeddings totales tras Fix2:** verificar con `SELECT count(*) FROM crm_help_embeddings` — debería ser >200 (los ~41 docs producen 5-12 chunks cada uno).

---

## Prompt de arranque sugerido

```
cd ~/valere-v2 && git pull origin main
cat CLAUDE.md docs/ESTADO.md
ls .cowork/outbox/
git log --oneline -10
Continúa desde donde quedó la sesión 2026-05-05. Próximo: Sprint D2 vista tabla.
```
