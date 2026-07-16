# FASE 1 — CARGA A PRODUCCIÓN COMPLETADA (2026-07-05)

Con OK DE CARGA de Juan + CONFORME TOTAL del auditor (Fable 5) sobre staging certificado.

## Resultado
- 566 filas staging = 542 contratos + 24 rechazos. Cuadre exacto.
- Empresas: +215 (total 268, 237 'cliente'). CUPS: +349, 49 enriquecidos (total 453).
- Contratos F1: 542 (external_id LV:%). Renovaciones: 507 (crítica 24 / alta 456 / media 16 / baja 11), bandeja sin fecha 458, campaña "migración Esmiluz" 22, asignadas 286.
- Staging en BBDD: staging_fase1_libro + staging_fase1_veredicto (566+566, RLS sin políticas).
- Expediente completo en Drive/BACKUP CRM VALERE (informe validación, veredicto v2, anexo H2, snapshot, informe de cierre).

## Pendiente próxima sesión
1. Verificación frontend (criterio 4): /renovaciones con pipeline y prioridades; /suministros con los 453 CUPS.
2. Re-auditoría Fable 5 producción↔staging.
3. Filtro "Sin fecha" en RenovacionesPage (tarea pequeña frontend, rama claude/...).
4. docs/help: actualizar renovaciones/gestionar-renovaciones.md con bandeja sin fecha + campañas (regla RAG).
5. ⚠ Dos Carolinas: CARO/CAROLINA cargado como Carolina Aroca (316248c5). Si era Maciñeiras → 1 UPDATE.
6. CUPS M. López Guerrero (UPDATE 1 fila cuando Juan lo consiga) + NIF Juan Pascual Alcañiz.
7. Fusión 2 parejas CUPS duplicadas preexistentes (fix propio con plan y OK Juan).
8. Módulo comisiones/decomisiones + Holded (requisito capturado; canales en observaciones de momento).
