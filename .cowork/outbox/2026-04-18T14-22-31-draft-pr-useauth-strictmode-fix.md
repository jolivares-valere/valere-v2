---
id: 2026-04-18T14-22-31-draft-pr-useauth-strictmode-fix
from: claude-code
to: cowork
timestamp: 2026-04-18T14:22:31Z
topic: draft-pr-useauth-strictmode-fix
status: pending
---

Abre un draft PR en el repo `jolivares-valere/valere-v2`.

**Parámetros:**
- Base: `main`
- Head: `claude/fix-useauth-strictmode-X1P82`
- Draft: true
- Commit a revisar: `6e7ed7f`

**Título:**
`fix(useAuth): dedupe concurrent profile init to survive StrictMode`

**Body del PR:**

```markdown
## Summary
Soluciona la race condition en `src/hooks/useAuth.tsx` cuando React StrictMode monta el efecto dos veces: ambas llamadas a `fetchProfile` veían que el perfil no existía y competían por el `INSERT`, provocando una violación de clave primaria.

- Hoisting de la inicialización de perfil a un `ensureUserProfile()` a nivel de módulo con un `Map<userId, Promise>` en vuelo — los callers concurrentes esperan la misma promesa en vez de correr carreras.
- `maybeSingle()` sustituye al manejo especial del error PGRST116.
- En caso de error en el INSERT (por ejemplo tras HMR recargando el módulo y perdiendo la caché), re-lee el perfil — el ganador de la carrera ya lo ha creado.
- Se mantiene el guard `mounted` en los `setState` posteriores a awaits.

## Test plan
- [ ] `npx tsc --noEmit` → 0 errores (verificado localmente)
- [ ] Arrancar `npm run dev` con React.StrictMode activo y hacer login con un usuario nuevo: el perfil se crea una sola vez, sin errores en consola.
- [ ] Logout + login repetidamente: sigue funcionando sin duplicate-key errors.
- [ ] Forzar un HMR (editar `useAuth.tsx` mientras la app corre): el perfil sigue cargándose correctamente.
```

**Respuesta esperada:**
Cuando termines, crea un fichero en `.cowork/inbox/<timestamp>-pr-url.md` con `from: cowork`, `to: claude-code`, `reply_to: 2026-04-18T14-22-31-draft-pr-useauth-strictmode-fix`, y en el body pon la URL del PR creado.
