# Backup del proyecto Valere v2

## Resumen

Tienes 3 opciones, de más simple a más automática. Elige la que te cuadre.

El script ya está creado: `scripts/backup.sh`. Genera un `.tar.gz` con todo
el código, docs, conversaciones y migraciones (sin `node_modules`). 2.5 MB.

---

## Opción 1 — Drive Desktop sincronizado (más simple)

**Qué necesitas**: tener Google Drive para escritorio instalado y una
carpeta local sincronizada con tu Drive.

**Pasos**:

1. Instala Google Drive Desktop si no lo tienes ya:
   https://www.google.com/drive/download/
2. Sincroniza tu carpeta Drive localmente (normalmente en `~/Google Drive/`
   o `G:\Mi unidad\` en Windows).
3. Ejecuta:

   ```bash
   # Linux/Mac
   ./scripts/backup.sh ~/"Google Drive/Mi unidad/Valere Backups"

   # Windows (PowerShell)
   bash scripts/backup.sh "/mnt/g/Mi unidad/Valere Backups"
   ```

4. El tarball aparece en la carpeta y Drive lo sube solo.

**Programarlo automático (Linux/Mac)**: añade al crontab con
`crontab -e`:

```
0 */6 * * * cd ~/valere-v2 && ./scripts/backup.sh ~/"Google Drive/Mi unidad/Valere Backups"
```

Eso hace un backup cada 6 horas.

**Programarlo automático (Windows)**: abre Task Scheduler → Create Task →
Trigger cada 6 horas → Action `bash /mnt/c/.../scripts/backup.sh "/mnt/g/Mi unidad/Valere Backups"`.

---

## Opción 2 — rclone (más profesional, sin Drive Desktop)

**Qué necesitas**: rclone instalado (`brew install rclone` en Mac,
`apt install rclone` en Linux, o https://rclone.org/downloads/).

**Configuración inicial** (una vez):

```bash
rclone config
# → n (new remote)
# → name: drive
# → type: 15 (Google Drive)
# → client_id: (vacío o crea uno propio)
# → scope: 1 (full access)
# → root_folder_id: 1UCBqKFI0oTG1XrdThKTUhwNcwKkb0xIv   # tu carpeta
# → autenticación vía navegador
```

**Uso**:

```bash
./scripts/backup.sh
rclone copy ~/valere-backups/valere-v2_*.tar.gz "drive:/"
```

O todo en uno: descomenta la sección B en `scripts/backup.sh` y se sube solo.

---

## Opción 3 — Hook de Claude Code (backup automático al cerrar sesión)

Añade al `.claude/settings.json` de este proyecto:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/backup.sh ~/'Google Drive/Mi unidad/Valere Backups'"
          }
        ]
      }
    ]
  }
}
```

Cada vez que yo (Claude Code) termine una respuesta, se ejecuta el backup.
Si usas rclone, cambia el comando.

⚠️ Ten cuidado: si se ejecuta en cada respuesta puede ser excesivo.
Mejor usar `SessionEnd` en lugar de `Stop` si tu versión de Claude Code
lo soporta (backup solo al cerrar la sesión completa).

---

## Opción 4 — Ya tienes todo en Git (backup "gratis")

No olvides que `git push` es en sí un backup. El repo ya está en GitHub.
Si aún quieres Drive **además**, usa cualquiera de las opciones 1-3.

Para clonar en otro sitio y recuperar todo:

```bash
git clone https://github.com/jolivares-valere/valere-v2.git
cd valere-v2
git checkout claude/valere-crm-architecture-2vvEV
npm install
```

Recuperas 100% del estado (código + docs + conversaciones + bus Cowork).

---

## ¿Qué incluye el backup?

```
valere-v2/
├── src/                    ← código fuente
├── public/                 ← assets estáticos
├── supabase/migrations/    ← migraciones SQL
├── supabase/functions/     ← Edge Functions
├── docs/                   ← ESTADO, ROADMAP, SESIONES (conversaciones)
├── .cowork/                ← bus de mensajes entre Claudes
├── .claude/                ← configuración de agentes y hooks
├── CLAUDE.md               ← contexto del proyecto
├── package.json            ← dependencias
├── .git/                   ← historial completo
└── configs                 ← tsconfig, vite, tailwind, etc.
```

**Excluye** (no hace falta backup):
- `node_modules/` (se regenera con `npm install`)
- `dist/` (se regenera con `npm run build`)
- `.env*` (secrets — nunca a Drive)
- `*.log`
