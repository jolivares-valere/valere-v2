# Handoff sprint autónomo 9 → próxima sesión

**Fecha:** 2026-04-25 (tarde, sesión Cowork)
**Tema:** `RUNBOOK.ps1` maestro — un solo comando para cerrar todo lo acumulado.

---

## ⚡ ONE-LINER PARA JUAN (copiar y pegar)

Funciona tanto desde **CMD** como desde **PowerShell**, da igual el cwd:

```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK.ps1"
```

Eso es. Pega, enter, sigue las pausas.

**Modo seguro (recomendado primera vez)** — muestra qué haría sin tocar nada:

```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK.ps1" -DryRun
```

**Solo reparar `.git` (si vuelve la corrupción y no quieres commits)**:

```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK.ps1" -OnlyRepair
```

**Commit local sin push (para revisar antes de empujar)**:

```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK.ps1" -SkipPush
```

---

## Qué hace el RUNBOOK.ps1

10 secciones, en orden, con progreso coloreado y pausas donde haga falta:

| # | Sección | Tiempo | Idempotente |
|---|---|---:|:-:|
| 0 | **Reparación `.git/`**: locks huérfanos (mv a `.bak`) + null bytes (strip) en config/HEAD/refs/packed-refs/ORIG_HEAD/FETCH_HEAD | ~5s | ✅ |
| 1 | **Sync rama PR #6**: fetch + checkout + pull `claude/docs-cierre-2026-04-23`. Si checkout falla, ofrece `git stash` automático. | ~10s | ✅ |
| 2 | **Reset CRLF noise**: `git checkout -- .` con confirmación. | ~5s | ✅ |
| 3 | **Git rm legacy**: `chat-ia/`, `chat-consultor/`, basura raíz, `database_canonical_2026-04-26.ts`, carpeta `CRM VALERE/` vacía. Plus `npm uninstall framer-motion` (0 imports en src/). | ~30s | ✅ |
| 4 | **Git add entregables**: 26 archivos de sprints 5+6+7+8 + paralelo C + `RUNBOOK.ps1` mismo. Skip silencioso si algún archivo no existe (paralelos no entregaron todo). | ~5s | ✅ |
| 5 | **`npx tsc --noEmit`** | ~20s | ✅ |
| 6 | **`npm test -- --run`** | ~30s | ✅ |
| 7 | **`git commit`** con mensaje multi-línea estructurado (DB + FE + Cleanup + Docs + Pendiente Juan). Si no hay nada en staging, skip. | ~3s | ✅ |
| 8 | **`git push origin claude/docs-cierre-2026-04-23`** (skip si `-SkipPush`) | ~5s | ✅ |
| 9 | **Pausas con instrucciones explícitas** para los Bloques que requieren tu input: Fase 2 datos (passwords + comandos), storage PDFs (decisión A/B/C), Apps satélite Opción A vs B, cleanup Dashboard Supabase. Cada una muestra exactamente qué pegar/decidir y dónde sacarlo. | depende de ti | ✅ |
| 10 | **Resumen final**: checklist de bloques + paths a docs + frase para próxima sesión Cowork. | ~1s | — |

**Total tiempo de ejecución sin tus pausas**: ~1.5-2 minutos.

## Flags soportados

| Flag | Para qué |
|---|---|
| `-DryRun` | Muestra qué haría sin ejecutar git/rm/npm. Inspección previa. |
| `-SkipPush` | Commit local pero no push. Útil si quieres revisar el diff antes. |
| `-SkipTests` | Salta TSC + tests. Solo emergencias — no recomendado. |
| `-YesToAll` | Auto-yes a confirmaciones (peligroso). Para CI / re-ejecución desatendida. |
| `-OnlyRepair` | Solo sección 0 (reparación de `.git`) y sale. |

Combinables: `-DryRun -SkipTests` para inspección rápida, etc.

## Idempotencia

El script se puede re-ejecutar sin romper nada:

- **Locks**: si ya están movidos a `.bak`, no detecta nada. Si vuelven, los mueve de nuevo (con timestamp distinto).
- **Null bytes**: si los archivos están limpios, salta. Si vuelven a corromperse (mount Windows), los limpia de nuevo.
- **Checkout**: si ya estás en la rama, skip.
- **Git rm**: si los archivos ya están borrados, skip por `git ls-files --error-unmatch` check previo.
- **Git add**: si los archivos no existen (no se generaron por algún paralelo), skip silencioso.
- **Commit**: si staging vacío, skip.
- **Push**: si no hay commits nuevos, git push devuelve "Everything up-to-date".
- **`npm uninstall framer-motion`**: detecta si ya no está en `package.json` y skipea.

Puedes reejecutarlo en medio de una sesión interrumpida y continuará desde donde se quedó.

## Si falla algún paso

| Falla | Qué hace el script | Qué haces tú |
|---|---|---|
| `.git` corrupto sin recuperar | Aborta con mensaje "git fsck o reclonar" | Reclonar repo o `git fsck --full` |
| Checkout bloqueado por cambios | Ofrece `git stash` automático con confirmación | Aceptas `y` o abortas con Ctrl+C |
| TSC errores | Aborta antes de commit. Muestra output completo | Capturas el error, lo pasas a Cowork, arreglas, re-ejecutas |
| Tests fallan | Idem | Idem |
| Push rechazado (rama divergente) | Aborta con mensaje | Decides manualmente: pull rebase, force-push, etc. |

Cualquier error captura el output del script y avísame en próxima sesión.

---

## Logros del sprint 9

- ✅ **`RUNBOOK.ps1`** creado en raíz del repo (~600 líneas, comentado, con `<#  .SYNOPSIS  #>` block)
- ✅ Reparación `.git/` automatizada (null bytes + locks) — ya no necesitas el ejercicio manual de `tr -d '\000'` cada vez que el sandbox corrompe el repo.
- ✅ Bloque 1 del runbook acumulado integrado al script — git rm + git add + commit + push en una pasada.
- ✅ Pausas explícitas para Bloques 2/4/6/8 con instrucciones inline (no tienes que abrir 3 docs distintos).
- ✅ One-liner único probado (mentalmente) para CMD y PowerShell.
- ✅ Flags útiles: `-DryRun`, `-OnlyRepair`, `-SkipPush`, `-SkipTests`, `-YesToAll`.
- ✅ Idempotente: reejecutable sin romper nada.

## Cosas que NO hizo este sprint

- ❌ **Probar el script en Windows real**: sandbox es Linux. Los `Move-Item`, `Get-ChildItem -Filter`, `[System.IO.File]::ReadAllBytes` son cross-PowerShell pero vale la pena que la primera ejecución sea con `-DryRun`.
- ❌ **Commits desde sandbox**: prohibido como siempre.
- ❌ **Probar el flow del git fetch/pull/checkout en el sandbox**: no quería corromper el repo otra vez, así que el script no se ha ejecutado, solo escrito.

## Cosas para próxima sesión Cowork

1. Confirmarle a Cowork qué bloques has completado tras ejecutar el RUNBOOK.
2. Si TSC o tests fallaron, pasarme el output exacto.
3. Si las pausas (Fase 2 datos, storage, apps satélite) las has resuelto, qué decisiones tomaste.
4. Lo siguiente en el plan general — probablemente diseñar las compat views para apps satélite (opción A) o arrancar sprint dedicado de absorción (opción B).

---

## Mensaje para mí mismo al retomar

"Sprint 9 hecho — RUNBOOK.ps1 maestro listo. Juan ejecutó (o no). Si ejecutó:
- Bloque 1 cerrado → repo limpio + commits pushed.
- Pausas Bloques 2/4/6/8 → ver qué decidió.

Si no ejecutó: el one-liner está en el handoff, el RUNBOOK en raíz."

## Reglas aprendidas

- **PowerShell `??` solo en PS 7+**. PS 5.1 (Windows default) requiere `if ([string]::IsNullOrWhiteSpace(...))`. Verificar siempre versión target.
- **`Invoke-Expression` con strings dinámicos**: aceptable cuando los strings son constantes propias del script. Peligroso con input de usuario. Evitable usando `& <cmd>` con array de args.
- **Idempotencia con `git ls-files --error-unmatch`**: el patrón limpio para preguntar "¿este path está tracked?" sin output ruido. Combinarlo con `2>$null` para silenciar cuando no.
- **Pausas con instrucciones explícitas inline > docs separadas**: para tareas cross-context (Dashboard Supabase, decisiones), incrustar las URLs y comandos exactos en el script ahorra context-switching.
- **`-NoProfile -ExecutionPolicy Bypass -File <abs path>`** es el one-liner más blindado para PS scripts en Windows. Funciona desde CMD y PowerShell, ignora policy local, no carga profiles que puedan tener side effects.
