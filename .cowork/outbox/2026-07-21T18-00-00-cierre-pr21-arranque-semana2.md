# Cierre PR-2.1 (1/5 semana 2) + arranque "Listas que trabajan" — 2026-07-21

## Gate V1
- CIERRA (veredicto del auditor commiteado en `docs/PLAN_CRM_UTIL_4SEMANAS.md`, commit 11756ab). Semana 1 sellada 5/5 con 3 días de adelanto.

## Replanificación semana 2 (cerrada con el auditor, <30 min)
- Los 5 PRs del plan sin ampliar: PR-2.1 componente lista único → PR-2.2 Renovaciones (filtros-chip + CSV) → PR-2.3 Contratos → PR-2.4 KPIs clicables → PR-2.5 bandeja "sin fecha".
- **Decisión (a)** para Renovaciones: mantiene carga completa (~504 filas) + componente único; server-side solo filtros+CSV. **Condición de caducidad** (auditor): anotar en código (PR-2.2, junto a `LISTA_PAGE_SIZE`) y en `docs/MEJORAS_UI_BACKLOG.md` que el patrón caduca a ~2.000-3.000 filas vivas — ahí la vista SQL con el cálculo Vigente/Histórico base-20 deja de ser opcional.
- Mejoras del gate coladas donde tocan, sin ampliar PRs: "⚠ N vencidas" (badge cabecera) → PR-2.4; "— · N sin fecha" → PR-2.5.
- CA anotados: CSV de PR-2.2 exporta el conjunto **filtrado**, no la página visible (error clásico); KPIs de PR-2.4 = "las tarjetas = el SQL del día" (el auditor re-cuadra contra BBDD en el gate, no contra la foto 504/503/20/1); las 4 críticas VENCIDAS de PAZ Y BIEN en 'detectada' deben quedar visibles arriba en la bandeja, nunca ocultas; las 3 BASSOLS sin fecha de CHEMTROL son la semilla del PR-2.5.

## PR-2.1 — MERGEADO (#72, squash 4f36b7d)
- Regresión pura de Empresas (el CA más auditable): NUEVOS `src/core/hooks/useListParams.ts` (116 líneas — URL única q/sort/dir/page/filtros, debounce 300ms cancelable, reset a pág 1, whitelist de campos de orden), `src/core/components/SortableTh.tsx` (39) y `src/core/components/TableStateRows.tsx` (51 — cargando/error con reintento/vacío honesto). `EmpresasPage.tsx` 325→272 líneas consumiendo las tres piezas.
- Único cambio intencionado: el debounce ahora **cancela** el timer anterior (el código previo encolaba escrituras obsoletas). Garantía correcta para el paseo: ninguna escritura de URL por pulsación; UNA por cada pausa ≥300ms (tecleo de corrido = una sola actualización).
- Verificación Juan: tsc 0 · 195 tests · `git status` con SOLO los 4 ficheros. Sin doc RAG (sin feature visible — y aun así el paseo NO se salta: las regresiones silenciosas viven en los refactors "que no cambian nada").
- Encoding respetado: CRLF (+BOM en EmpresasPage, que ya lo tenía).

## PENDIENTE
- [x] Paseo independiente del auditor: PASA (21-jul tarde, veredicto abajo). Guion era: búsqueda con debounce (Network/historial como testigo), orden 5 columnas con `sort`+`dir` en URL, URL compartible que restaura estado exacto en pestaña nueva, paginación con total, estados vacío/error honestos. Cero diferencias fuera del debounce = PASA.
- [ ] PR-2.2 Renovaciones sobre el componente único (siguiente sesión): migrar búsqueda/orden a `useListParams` + filtros-chip (prioridad, comercializadora, mes, estado) + export CSV del conjunto filtrado + nota de caducidad en código y backlog.
- [x] Veredicto del paseo PR-2.1 anotado aquí y en ESTADO.md.

## Datos de contexto para PR-2.2 (niveles de madurez detectados)
- Empresas: patrón server-side completo (ya canónico, base extraída).
- Renovaciones: carga 1.000 filas client-side (`LISTA_PAGE_SIZE`), estado/prioridad ya en URL; badge Vigente/Histórico requiere conjunto completo por CUPS (por eso decisión (a)).
- Contratos: `useContratos()` sin paginación, filtro estado client-side — el más crudo, se moderniza en PR-2.3.

GATE V2 (viernes 24-jul): 3 preguntas de negocio reales de Juan respondidas desde la UI en <30 segundos cada una, cronometradas por el auditor.

## VEREDICTO DEL PASEO PR-2.1 (auditor, 21-jul tarde) — PASA
- Búsqueda + debounce: "DERAZA" → 1 resultado; la URL escribió solo el término final (`?q=DERAZA&page=1`), sin estados intermedios (el cambio intencionado funciona como se anotó). ✓
- Orden por columna: clic en NIF → flecha y orden aplicados; resto de columnas con indicador neutro. ✓
- URL compartible (testigo fuerte): apertura en frío de `?sort=nombre&dir=desc&page=2` restaura estado exacto (Nombre desc, página 2: TEATRO → SURGLASS → SOCOESREMA…, 235 en total, buscador vacío). ✓
- Total y paginación correctos. De regalo: DERAZA aparece UNA sola vez en la lista global — la fusión también se ve limpia desde la UI. ✓
- Conclusión: 1/5 de semana 2 con DoD completo; los 4 PRs siguientes se montan sobre piezas ya auditadas en regresión → sus paseos se centran en lo nuevo (chips, CSV, KPIs clicables, bandeja).
