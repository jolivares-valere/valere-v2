# Protocolo de Backup Diario — Valere CRM

> Creado: 2026-04-19. Actualizar si cambian las rutas o el proceso.

---

## Ubicaciones de los backups

| Tipo | Ubicacion | Descripcion |
|------|-----------|-------------|
| Estado del proyecto | docs/ESTADO.md | Estado en tiempo real |
| Resumen de sesion | docs/SESIONES/<fecha>-cowork-resumen.md | Memoria de sesion |
| Backup maestro | Google Drive | https://drive.google.com/drive/folders/1UCBqKFI0oTG1XrdThKTUhwNcwKkb0xIv |
| Bus mensajes outbox | .cowork/outbox/ | Claude Code → Cowork |
| Bus mensajes inbox | .cowork/inbox/ | Cowork → Claude Code |

---

## PROMPT DE INICIO DE SESION (copiar y pegar)

Pegar al inicio de cada sesion de Claude Cowork:

```
Trabajas en el proyecto Valere CRM v2.
Rama: claude/valere-crm-architecture-2vvEV
Repo: https://github.com/jolivares-valere/valere-v2

Lee estos archivos ANTES de hacer nada (en este orden):
1. https://raw.githubusercontent.com/jolivares-valere/valere-v2/refs/heads/claude/valere-crm-architecture-2vvEV/CLAUDE.md
2. https://raw.githubusercontent.com/jolivares-valere/valere-v2/refs/heads/claude/valere-crm-architecture-2vvEV/docs/ESTADO.md
3. https://raw.githubusercontent.com/jolivares-valere/valere-v2/refs/heads/claude/valere-crm-architecture-2vvEV/docs/SESIONES/2026-04-19-cowork-resumen.md
4. https://raw.githubusercontent.com/jolivares-valere/valere-v2/refs/heads/claude/valere-crm-architecture-2vvEV/docs/BACKUP_PROTOCOL.md

Luego comprueba si hay mensajes en .cowork/outbox/:
https://github.com/jolivares-valere/valere-v2/tree/claude/valere-crm-architecture-2vvEV/.cowork/outbox

Resume donde nos quedamos y pregunta que hacemos hoy.
```

---

## PROTOCOLO DE BACKUP AL FINALIZAR SESION

### Paso 1: Actualizar docs/ESTADO.md
Editar en GitHub web con los cambios del dia.

### Paso 2: Crear resumen de sesion
Crear docs/SESIONES/<fecha>-cowork-resumen.md con:
- Tareas ejecutadas y resultado
- Correcciones de schema descubiertas
- Decisiones tomadas
- Pendientes para Claude Code

### Paso 3: ACK en inbox (si hubo mensajes del outbox)
Crear .cowork/inbox/<timestamp>-ack-<topic>.md

### Paso 4: Actualizar Google Drive
URL: https://drive.google.com/drive/folders/1UCBqKFI0oTG1XrdThKTUhwNcwKkb0xIv
Documento: VALERE CRM — BACKUP MAESTRO
Actualizar secciones 2, 3 y 5 (historial).

### Paso 5: Commit y push
Desde GitHub web editor, commit a rama claude/valere-crm-architecture-2vvEV.
Mensaje: chore(backup): sesion <fecha> — <resumen>

---

## ATAJO PARA PEDIR EL BACKUP A CLAUDE

Al final de sesion, decir:

> "Antes de terminar, haz el backup completo: actualiza ESTADO.md,
> crea el resumen en docs/SESIONES/, ACK en .cowork/inbox/ si hubo mensajes,
> actualiza el Google Doc en Drive, y haz commit + push."

---

## REGLAS CRITICAS (inmutables)

1. NUNCA tocar rama main — solo claude/valere-crm-architecture-2vvEV
2. NUNCA force-push
3. NUNCA DROP de tablas sin confirmacion explicita del usuario
4. NUNCA aplicar FASE 20.9 (RLS) sin EXPLAIN ANALYZE previo
5. SIEMPRE DDL y DML en queries separadas (evita rollback en Supabase)
6. SIEMPRE verificar columnas reales antes de INSERT/UPDATE:
   SELECT column_name FROM information_schema.columns WHERE table_name = 'X'
7. SIEMPRE soft delete con deleted_at, nunca DELETE fisico
8. SIEMPRE RLS en tablas nuevas
9. GEMINI_API_KEY siempre server-side, nunca en bundle cliente

---

## HISTORIAL DE SESIONES (indice)

| Fecha | Tipo | Temas |
|-------|------|-------|
| 2026-04-18 | Claude Code | FASE 22, 23, 24 |
| 2026-04-18T19 | Cowork nocturna autonoma | FASE 20.7, 20.8, 20.9, 21.a |
| 2026-04-19T09 | Cowork manana | Fix cups 20.7.c, documentacion |
| 2026-04-19 | Cowork | Backup maestro + protocolo diario |
| 2026-04-19 | Claude Code | Sync con Cowork, limpieza ESTADO.md, backup script, ROADMAP 20.7-20.9 ✅ |
| 2026-04-19 tarde | Claude Code | FASE 27 Calendario, code-splitting, Vitest+16 tests, bundle 1515→253kB |

> Actualizar esta tabla al final de cada sesion.

---

## ARCHIVOS CLAVE DEL REPO

```
CLAUDE.md                 <- Leer SIEMPRE al arrancar
docs/ESTADO.md            <- Estado actual del proyecto
docs/ROADMAP_FUSION.md    <- Roadmap detallado con checklists
docs/BACKUP_PROTOCOL.md   <- Este fichero
docs/SESIONES/            <- Memorias de sesiones pasadas
.cowork/outbox/           <- Mensajes Claude Code → Cowork
.cowork/inbox/            <- ACKs Cowork → Claude Code
supabase/migrations/      <- Migraciones SQL
supabase/functions/       <- Edge Functions
src/features/             <- Modulos frontend por dominio
src/core/                 <- Codigo transversal
```
