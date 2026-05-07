# Mensaje para próxima sesión Cowork

**Fecha:** 2026-05-05 (cierre tarde)
**De:** Cowork (jornada 5 sprints + micro-fix RAG v21)
**Para:** próxima sesión Cowork / Code

---

## Estado al cierre

Todo desplegado en `main` y validado con smoke real Carolina. Último commit código: `d0efcf6` (Fix2 RAG docs). Edge Function `ask-crm-docs` versión **21** activa con micro-fix anti-alucinación.

Sprints completados:
- Sprint Fase 2-3 — separación CRM/Captación + vencimiento prospecto (`0260ae3`).
- Sprint C — visibilidad post-handoff + comentarios (`8c38089`).
- Hotfix C — toast bottom-right + drawer placeholder (`ffb3bfa`).
- Sprint D1 — helper vencimiento + cards mejoradas (`b3c3d03`).
- Fix1 RAG — Edge Function v20 sin "Fuentes:".
- Fix2 RAG — docs/help al día (`d0efcf6`).
- Micro-fix RAG — Edge Function v21 anti-alucinación (sin commit, deploy directo).

---

## REGLA #0 PARA LA PRÓXIMA SESIÓN

```
NO arrancar nada técnico hasta tener feedback REAL de Carolina.
```

ChatGPT lo firmó hoy: *"el riesgo ya no es técnico, es sobreconstruir sin escuchar uso real"*.

Carolina ni siquiera ha probado D1 a fondo todavía. Cualquier sprint nuevo sin feedback es sobreconstrucción.

---

## Orden firmado para próxima sesión

```
1. Recoger feedback real Carolina (sin código, sin SQL)
2. Si Carolina aporta fricción → fix prioritario por su feedback
3. Si Carolina no aporta nada nuevo → D2 vista tabla
4. Decisión Dashboard comercial (ver sección "Decisión pendiente")
5. Filtros CRM restantes (Datadis, Renovaciones, Incidencias, Contratos)
6. Regenerar tipos Supabase + quitar 4 casts (supabase as any)
```

---

## Cómo recoger feedback REAL (porque "¿qué tal el CRM?" no funciona)

Carolina NO va a decir "quiero un dashboard". Lo que hay que escuchar son frases tipo:

- *"no veo qué tengo que hacer hoy"* → necesita Acciones del día / Dashboard.
- *"tengo que abrir muchas cosas para decidir"* → necesita vista tabla (D2) o Dashboard.
- *"no sé qué es prioritario"* → necesita Dashboard.
- *"se me pasan oportunidades"* → necesita alertas / recordatorios.
- *"se ve raro / lento"* → bug / regresión / cache CF.
- *"no me deja hacer X"* → permisos / RLS.
- *"esto me confunde"* → UX / copy.

Anota frases literales, no las parafrasees. Las palabras exactas son lo que diferencia un dashboard que funciona de uno que se abandona.

---

## D2 — Vista tabla (próximo solo si Carolina no detecta nada más urgente)

### Scope cerrado

**Selector en `/captacion`:**
- Posición: arriba a la derecha del header.
- Botones: `[Cards] [Tabla]`. Default: `Cards`.
- Persistencia: `localStorage('captacion:viewMode', 'cards' | 'table')`.

**Componente `<TablaCaptacion>`:**
- `<table>` HTML con thead + tbody.
- Click en fila → abre `OportunidadDrawer`.
- `overflow-x-auto` para móvil.

**Columnas (orden):**
1. Empresa
2. Teléfono
3. Email
4. Estado / etapa legible (`ETAPA_LABELS`)
5. Responsable actual
6. Vencimiento + semáforo (badge `ESTADO_CLASSES`)
7. Siguiente acción (`siguienteAccionLead(etapa, fecha)` ya en `utils/vencimiento.ts`)
8. Última actividad (`updated_at`)
9. Origen

**Sort por defecto:** vencido → rojo → naranja → amarillo → sin_fecha → verde. Dentro de cada grupo `updated_at` desc.

**Tabs intactos:** "Por llamar / Esperando factura / Propuestas / Seguimientos / Todos mis casos" siguen funcionando igual; la tabla se aplica dentro de cada tab.

### NO incluir
Edición inline, exportar Excel, selección múltiple, filtros avanzados, paginación.

### Archivos a tocar
- `src/features/captacion/CaptacionPage.tsx` — selector + estado vista + render condicional.
- `src/features/captacion/components/TablaCaptacion.tsx` (nuevo).

### IMPORTANTE
D2 NO es mejora estética: es cambio de forma de trabajo. Necesita validación con Carolina, no solo TSC verde.

---

## Backlog estratégico — Agenda captación + calendario

ChatGPT entregó dictamen completo (cierre 2026-05-05) sobre estrategia de calendario operativo en captación: pestaña "Hoy", agenda interna con tabla `captacion_eventos`, integración Google Calendar en fase posterior, calendarios compartidos por rol.

**No se ejecutó.** Queda como backlog dedicado en:
`.cowork/backlog/agenda-captacion.md`

Trigger para arrancar: Carolina dice *"no sé a quién llamar hoy"* o se detectan leads sin tocar varios días o >20-30 prospectos activos por persona.

Si NO se da el trigger → no arrancar. La lógica base (semáforo, siguiente acción, vista cross-bandeja) ya está implementada, así que cuando llegue el momento será composición rápida, no invención.

**Scope estimado cuando se arranque:** 1-2 sesiones cowork. El 60% de lógica ya en código.

## Decisión pendiente — Dashboard comercial completo

ChatGPT entregó hoy una definición completa de Dashboard de dirección. **NO se ejecutó.** Queda como decisión estratégica, no como sprint listo.

### Trigger para arrancar Dashboard
Cuando detectes 2 de estos 4 síntomas en uso real:

1. Carolina abre muchas cards para decidir a quién llamar.
2. Pierde seguimiento de leads antiguos.
3. Pregunta literalmente "¿qué hago ahora?".
4. Tú (Juan) necesitas ver estado global sin entrar caso a caso.

Si no hay 2 de los 4 → NO arrancar. Es "nice to have", no necesidad.

### Scope del Dashboard cuando llegue el momento (referencia)

Estructura vertical:
1. **KPIs ejecutivos** (4-6 tarjetas): Pipeline total €, Oportunidades activas #, Ventana crítica ≤90 días, Riesgo de pérdida #, Conversión 30d %, Actividad equipo 7d.
2. **Alertas** (bloque más visible): rojo crítico (<30d, sin contacto >7d, factura no recibida, leads atascados), naranja alta (30-60d, sin decisor, sin siguiente acción), amarilla media (60-90d, seguimientos).
3. **Acciones del día** (lista): "📞 Llamar Herba — vence en 23 días", etc.
4. **Pipeline operativo** (tabla, no kanban): empresa, etapa, responsable, vencimiento, siguiente acción, última actividad, score. Sort por urgencia + inactividad + score.
5. **Rendimiento del equipo** por usuario: leads creados, activos, convertidos, actividad, ratio.
6. **Embudo (funnel)**: leads → contactados → factura prometida → analizados → propuesta → ganados.

Lógica clave (ya disponible parcialmente en el código):
- Riesgo de pérdida = `sin_actividad > 7d OR vencimiento < 30d`.
- Ventana crítica = `vencimiento <= 90d`.
- Conversión = `ganados / leads_creados (últimos 30d)`.
- Acciones del día = TOP N oportunidades por urgencia + inactividad.

**Ventaja clave:** la lógica de urgencia, siguiente acción, semáforo y pipeline ya está implementada en `utils/vencimiento.ts` y los hooks de captación. El Dashboard sería **composición**, no invención. Eso reduce riesgo a la mitad.

### Plan de implementación cuando se arranque
- Backend: vistas SQL agregadas para KPIs (count + sum + group by).
- Frontend: `DashboardPage.tsx` reescrito + hooks para cada KPI/bloque.
- Tests: como mínimo del helper de cálculo de "Riesgo de pérdida" y "Conversión".

---

## Filtros CRM restantes (cuando toque)

Auditar y aplicar `.eq('empresa.estado_relacion', 'cliente')`:
- `src/features/datadis/...`
- `src/features/renovaciones/RenovacionesPage.tsx`
- `src/features/incidencias/IncidenciasPage.tsx`
- `src/features/contratos/ContratosPage.tsx` (verificar que ya está OK).

Patrón: `(supabase as any).from(...).select(..., empresa:empresas!inner(estado_relacion)).eq('empresa.estado_relacion', 'cliente')`.

---

## Regenerar tipos Supabase

```bash
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts
```

Quitar después los 4 casts marcados con `// Quitar este cast cuando se regeneren los tipos`:
- `src/features/empresas/api.ts:32`
- `src/features/oportunidades/api.ts:30`
- `src/features/dashboard/api.ts:51`
- `src/components/search/GlobalSearch.tsx:26`

Hacerlo en branch separada por si arrastra errores TSC en otros sitios.

---

## Notas operativas para próxima sesión

- **Cache Cloudflare:** patrón conocido. Hard refresh + tab nuevo. Bundle hash en View Source para verificar versión cargada.
- **Workflow embeddings:** DELETE + INSERT. Mientras corre, tabla queda vacía 30-60s. Total tras Fix2: ~200+ chunks.
- **Edge Function:** versión 21 activa con anti-alucinación. Si vuelve a inventar features, refinar prompt en lugar de añadir reglas nuevas (el prompt ya es largo).

---

## Prompt arranque sugerido

```
cd ~/valere-v2 && git pull origin main
cat CLAUDE.md docs/ESTADO.md
ls .cowork/outbox/
git log --oneline -10

¿Tenemos feedback de Carolina? Si sí, pégamelo literal.
Si no, no arranco nada técnico todavía.
```
