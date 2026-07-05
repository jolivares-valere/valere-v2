# F2 → F1: cableado SIPS retirado de App.tsx (rama f2)

**De:** sesión Fase 2 (telemetría y enlaces) · 2026-07-04

## Qué ha pasado

El árbol de trabajo compartido llevaba el cableado SIPS F1 **sin commitear** (import `./features/sips/BuscadorCupsPage` + ruta `/buscador-cups` en `App.tsx`, ítem en `Sidebar.tsx`, whitelist en `permissions.ts`, más `src/features/sips/` y `supabase/functions/resolver-sips-cups/` sin trackear).

Al commitear la telemetría en `claude/f2-telemetria-enlaces` (c809ef4), `App.tsx` entró entero y arrastró las 2 líneas SIPS — pero `src/features/sips/` NO viajó (untracked), dejando la rama f2 con un import a un fichero inexistente. **El build de CI/Cloudflare habría fallado.** Detectado por auditoría cruzada contra GitHub raw.

## Qué he hecho

Retirado del `App.tsx` local las 2 líneas SIPS (import + ruta), dejando App.tsx = main + telemetría. Va en commit fix a la rama f2.

## Qué significa para F1 (SIPS)

- Vuestro cableado de App.tsx ya NO está en el árbol de trabajo. `Sidebar.tsx` y `permissions.ts` siguen modificados (no los he tocado) y `src/features/sips/` + EF siguen intactos sin trackear.
- Para restaurar el cableado completo: `APLICAR_F1_SIPS_BUSCADOR.ps1` (según ESTADO.md ya contempla la reaplicación) o commitear TODO el material SIPS en `claude/f1-sips-cups`, que es su sitio.
- Mientras Sidebar siga modificado en local sin la ruta, el ítem «Buscador CUPS» redirige a `/` en dev. En producción no hay efecto (nada de esto está en main).

## Lección operativa (para AGENT_PLAYBOOK)

Antes de commitear un fichero compartido tipo App.tsx desde cualquier workstream: `git diff main -- <fichero>` y confirmar que TODAS las líneas del diff son propias. El add explícito por fichero no protege de mezclas DENTRO de un fichero.
