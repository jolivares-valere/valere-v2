# Feedback uso real CRM Valere

> **Propósito**: registrar fricciones, bugs, sugerencias y momentos de confusión que el equipo (Juan, Antonio, Carolina M, Carolina A) detecte durante las primeras semanas de uso real del CRM.
>
> **Cómo se llena**: añade una entrada al final, con un bloque por fricción. **No edites entradas anteriores** (queda histórico de qué se reportó y cuándo).
>
> **Cómo se procesa**: cuando haya 3+ entradas con severidad media/alta o se acumulen 7 días, Cowork (o Code) revisa las entradas y propone un sprint correctivo (capa A del backlog de permisos, fixes UX puntuales, refactor de campo, etc.).

---

## Plantilla (copia este bloque para cada fricción nueva)

```markdown
### YYYY-MM-DD — <título corto>

- **Quién**: Juan / Antonio / Carolina M / Carolina A
- **Pantalla / ruta**: ej. `/captacion`, tab "Por llamar"
- **Qué intentaba hacer**: descripción en 1 frase
- **Qué pasó**: descripción en 1-2 frases
- **Qué esperaba**: descripción en 1 frase
- **Severidad**: baja / media / alta
  - baja: ruido visual, no bloquea
  - media: tengo que dar un rodeo, pero acabo haciéndolo
  - alta: no puedo terminar la tarea o pierdo datos
- **Notas adicionales**: opcional (screenshot, número de oportunidad, etc.)
```

---

## Categorías sugeridas para clasificar (no obligatorio en la entrada, las tagea Cowork al procesar)

- `[fuga]` — vio algo que no debería ver (ej. Carolina Aroca abrió Datadis)
- `[hueco]` — no puede hacer algo que sí debería poder (ej. no encuentra dónde subir factura)
- `[ux]` — el flujo es confuso o requiere más pasos de lo razonable
- `[bug]` — funcionalidad rota técnicamente (error, pantalla blanca, dato incorrecto)
- `[mejora]` — sugerencia de feature/cambio nuevo
- `[confianza]` — el dato visible no coincide con la realidad y genera duda

---

## Entradas

<!-- Añadir entradas debajo de esta línea -->

### 2026-05-04 (post-sprint) — Auditoría ChatGPT detecta bug bloqueante en handoffs

- **Quién**: ChatGPT (auditoría externa post-sprint Días 2-5)
- **Pantalla / ruta**: backend (`oportunidad_handoffs` CHECK constraint)
- **Qué intentaba hacer**: validar que el sprint completo es seguro para uso real
- **Qué pasó**: el código `useHacerHandoff` enviaba 3 valores de `motivo` que NO están en el CHECK constraint de la tabla (`pasar_a_analisis`, `pedir_visita`, `propuesta_lista_para_enviar`). Cualquier handoff habría fallado en producción.
- **Qué esperaba**: handoffs funcionando end-to-end
- **Severidad**: **alta** — bloquea el flujo principal
- **Notas**: corregido. Mapeo aplicado: `pasar_a_analisis → factura_recibida`, `pedir_visita → asignacion_a_senior`, `propuesta_lista_para_enviar → propuesta_lista`. Hotfix en `COMMIT_HOTFIX_HANDOFFS_2026-05-04.ps1`.
- **Tags**: `[bug]` `[backend]`

**Acción tomada**: hotfix preparado, pendiente ejecutar PS1. Plan de auditoría completo en `docs/AUDITORIA_SPRINT_CAPTACION_2026-05-04.md`. Smoke test runbook formal en `docs/SMOKE_TEST_RUNBOOK.md`.

---

### 2026-05-04 — Bandejas captación son solo lectura, no hay operativa

- **Quién**: Juan (revisión pre-onboarding)
- **Pantalla / ruta**: `/captacion`, `/analisis-captacion`, `/cartera-senior`
- **Qué intentaba hacer**: validar que Carolina Aroca puede operar end-to-end (crear lead → llamar → factura → propuesta → cierre)
- **Qué pasó**: las cards muestran datos pero no hay acciones. `onClick={console.log}`. No hay botón "+ Nuevo lead". No hay forma de cambiar etapa, registrar llamada, subir factura, marcar propuesta enviada, ni cerrar.
- **Qué esperaba**: poder hacer todo el ciclo desde la pantalla de Captación, sin tener que ir a Empresas/Contactos/Oportunidades por separado.
- **Severidad**: alta — bloquea uso real
- **Notas adicionales**: Juan también especifica que Carolina Aroca NO debe ver las pantallas globales (Empresas, Datadis, Importador, Potencias). Solo bloque Captación.
- **Tags**: `[hueco]` `[ux]` `[fuga]`

**Acción tomada**: desbloquear Sprint Operativo Captación (5 días). Plan completo en `docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md`. Onboarding al equipo pospuesto hasta cierre del sprint.


---

## Histórico de procesamientos (Cowork rellena)

| Fecha | Entradas procesadas | Acción tomada | Doc resultante |
|---|---|---|---|
| (pendiente) | — | — | — |
