# Skill: valere-session

Gestión automática de inicio y cierre de sesión para el proyecto Valere CRM v2.
Garantiza que ninguna sesión empiece sin contexto ni termine sin guardar el estado.

## Instrucciones de INICIO de sesión

Ejecutar estos comandos y leer el resultado COMPLETO antes de responder nada:

```bash
cd /ruta/al/repo/valere-v2

# 1. Sincronizar con remoto
git pull origin main

# 2. Leer contexto del proyecto
cat CLAUDE.md
cat docs/ESTADO.md

# 3. Ver mensajes de sesiones anteriores
ls .cowork/inbox/ 2>/dev/null && cat .cowork/inbox/*.md 2>/dev/null || echo "(inbox vacío)"

# 4. Ver historial reciente
git log --oneline -10

# 5. Ver rama actual y estado
git branch --show-current
git status --short
```

Después decir en voz alta:
"He leído el estado del proyecto. Estamos en: [resumen de 2 líneas de docs/ESTADO.md].
Rama actual: [rama]. Último commit: [hash y mensaje].
Mensajes del inbox: [resumen o 'ninguno']."

## Instrucciones de CIERRE de sesión

Ejecutar SIEMPRE al terminar, antes de despedirse:

### 1. Actualizar docs/ESTADO.md
Editar el archivo:
- Cambiar `> Última actualización:` a la fecha de hoy
- Añadir commits de esta sesión a la tabla de historial
- Marcar como ✅ las tareas completadas en "Pendientes"
- Añadir nuevas tareas a "Pendientes" si las hay

### 2. Crear resumen de sesión (si fue significativa — >30 min de trabajo)
```bash
# Crear archivo:
docs/SESIONES/YYYY-MM-DD-resumen.md
```
Con este contenido:
```markdown
# Sesión YYYY-MM-DD

## Qué se hizo
- [lista de lo implementado]

## Commits realizados
- [hash] [mensaje]

## Qué quedó pendiente
- [lista]

## Decisiones importantes tomadas
- [si las hay]

## Para la siguiente sesión
- [instrucciones específicas si son necesarias]
```

### 3. Dejar mensajes en outbox (si hay instrucciones para siguiente sesión)
```bash
# Crear archivo si hay algo importante que comunicar:
.cowork/outbox/YYYY-MM-DDTHH-MM-SS-descripcion.md
```

### 4. Mover inbox procesado a archivo
```bash
# Si había mensajes en inbox, moverlos a un subdirectorio de procesados:
mkdir -p .cowork/inbox/procesados/
mv .cowork/inbox/*.md .cowork/inbox/procesados/ 2>/dev/null || true
```

### 5. Commit y push del estado
```bash
git add docs/ESTADO.md docs/SESIONES/ .cowork/ 2>/dev/null
git add docs/SESIONES/ 2>/dev/null || true
git add docs/ESTADO.md

git commit -m "docs: actualizar ESTADO.md sesión $(date +%Y-%m-%d)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin $(git branch --show-current)
```

## Por qué es crítico

Si la sesión se cuelga o Claude pierde contexto, la próxima sesión lee `docs/ESTADO.md` como primera acción.
Si ese archivo está desactualizado, el agente siguiente trabajará con información obsoleta y puede:
- Duplicar trabajo ya hecho
- Pisar cambios recientes
- Ignorar pendientes importantes
- Usar puertos o rutas incorrectas

## Validación final de sesión

Antes de dar la sesión por cerrada, verificar:
- [ ] `docs/ESTADO.md` tiene fecha de hoy
- [ ] Los commits de esta sesión están pusheados
- [ ] El inbox está vacío o procesado
- [ ] No hay cambios sin commitear en `git status`
