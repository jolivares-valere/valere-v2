#!/usr/bin/env bash
# Backup del proyecto Valere v2.
#
# Uso:
#   ./scripts/backup.sh              # backup a ~/valere-backups/
#   ./scripts/backup.sh /ruta/custom # backup a ruta custom (ej. carpeta Drive)
#
# Genera un .tar.gz con:
#   - Código fuente (src/, public/, index.html, package.json, configs)
#   - Documentación (docs/, CLAUDE.md, README)
#   - Mensajes Cowork (.cowork/)
#   - Migraciones SQL (supabase/)
#   - Historial git (.git)
# Excluye: node_modules, dist, .env*, .DS_Store
#
# Si tienes Google Drive Desktop sincronizado, pásale la ruta de tu carpeta
# de Drive y el backup irá directo ahí. Ejemplo:
#   ./scripts/backup.sh ~/"Google Drive/Mi unidad/Valere Backups"
#
# Si prefieres rclone: ver sección al final de este script.

set -euo pipefail

STAMP=$(date +%Y-%m-%d_%H-%M-%S)
DEST="${1:-$HOME/valere-backups}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_NAME="valere-v2_${STAMP}.tar.gz"
BACKUP_PATH="${DEST}/${BACKUP_NAME}"

mkdir -p "$DEST"

echo "📦 Generando backup..."
echo "   Origen:  $PROJECT_ROOT"
echo "   Destino: $BACKUP_PATH"

cd "$(dirname "$PROJECT_ROOT")"

tar --exclude='valere-v2/node_modules' \
    --exclude='valere-v2/dist' \
    --exclude='valere-v2/.env' \
    --exclude='valere-v2/.env.local' \
    --exclude='valere-v2/.env.*.local' \
    --exclude='valere-v2/.DS_Store' \
    --exclude='valere-v2/**/.DS_Store' \
    --exclude='valere-v2/**/*.log' \
    -czf "$BACKUP_PATH" \
    valere-v2/

SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo "✅ Backup creado: $BACKUP_PATH ($SIZE)"

# Rotación: conservar solo los 10 backups más recientes.
cd "$DEST"
ls -1t valere-v2_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -v --
echo "🧹 Rotación completada (conservados los 10 más recientes)."

# ─────────────────────────────────────────────────────────────────────────
# OPCIONES AUTOMÁTICAS (descomenta la que uses):
# ─────────────────────────────────────────────────────────────────────────
#
# A) Google Drive Desktop sincronizado — no hace falta nada más,
#    el propio Drive sube el tarball cuando le pases la carpeta sincronizada.
#
# B) rclone con Google Drive:
#       rclone copy "$BACKUP_PATH" "drive:Valere Backups/"
#    (requiere: rclone config → new remote tipo "drive")
#
# C) gdrive CLI (github.com/glotlabs/gdrive):
#       gdrive files upload --parent 1UCBqKFI0oTG1XrdThKTUhwNcwKkb0xIv "$BACKUP_PATH"
#    (requiere autenticar con OAuth la primera vez)
