# Sprint Carolina — backend listo, pendiente integración frontend

**De:** Cowork sesión 2026-05-19
**Para:** próxima sesión Cowork / Code
**Estado al cierre:** backend en prod, frontend base en disco, TSC verde, commit pendiente vía PS1.

---

## Lo que está LISTO

### Backend (aplicado en prod vía SQL Editor + CLI)

- 3 vistas SQL: `v_captacion_historico_completo`, `v_captacion_enviados_en_seguimiento`, `v_mis_llamadas`.
- 3 RPCs: `editar_campo_oportunidad`, `editar_campo_empresa`, `recordar_a_responsable`.
- Edge Function `enviar-recordatorio` desplegada (Resend + JWT verify).

### Frontend (en disco, sin commitear)

- 6 hooks en `src/features/captacion/api.ts`.
- 6 componentes en `src/features/captacion/components/`: SelectorVista, BuscadorCaptacion, CeldaEditable, ChipsFiltros, PaginacionIncremental, TablaCaptacion.
- Util `src/core/utils/exportToExcel.ts`.

### Bonus

- DashboardPage.tsx limpiado del sprint OMIE inacabado. TSC vuelve a 0 errores.

---

## Acción inmediata Juan al volver

```powershell
cd C:\Users\joliv\valere-v2
.\COMMIT_SPRINT_CAROLINA_2026-05-19.ps1
```

El script hace:
1. Pull main
2. TSC --noEmit (debe pasar)
3. Tests (deben pasar)
4. Build
5. Stage de los 14 archivos del sprint
6. Commit con mensaje detallado
7. Push origin main

Tras el push, Cloudflare Pages despliega en ~2 min: https://valere-v2.pages.dev

---

## Lo que queda en próxima sesión

Una sesión más para cerrar el sprint completo:

### 1. Componente MisLlamadasView (1h)

Tab nuevo en `/captacion`. Log cronológico de actividades tipo `llamada` con:
- Selector rango (7d / 30d / 90d / personalizado).
- Selector resultado (todos / contestó / no contesta / no decisor / pospuesto).
- Toggle "Solo mías" vs "Equipo" (Juan/senior ven todo).
- Texto libre de búsqueda por empresa.
- Botón export Excel.

Hook ya existe: `useMisLlamadas(filters)`.

### 2. Integración CaptacionPage.tsx (1.5h)

Reescritura del header + tabs:

```
[ Captación        ] [ Buscador ] [ Vista: Tabla ▼ ] [ + Nuevo ]
[Por llamar] [Esperando] [Propuestas] [Enviados ←nuevo] [Histórico] [Mis llamadas ←nuevo]
```

- Eliminar tab "Seguimientos".
- Añadir tab "Enviados" usando `useCaptacionEnviados`.
- Renombrar "Todos mis casos" → "Histórico".
- Render condicional Cards (BandejaCard actual) vs Tabla (TablaCaptacion).
- Si Tabla, mostrar `BuscadorCaptacion` + `ChipsFiltros` arriba.
- Persistir modo Vista con `loadViewMode()` / `saveViewMode()`.

### 3. BandejaEnviadosCard (30 min)

Variante de `BandejaCard` para la pestaña Enviados:
- Badge destinatario (→ Análisis / → Senior).
- "Enviado hace Xd".
- SLA color (verde/amarillo/rojo) del backend.
- Botón "🔔 Recordar" que abre modal.

### 4. Modal RecordarResponsable (30 min)

Textarea + botón confirmar → dispara `useRecordarAResponsable.mutate()`.

### 5. Tests (1h)

- `CeldaEditable.test.tsx` — Enter guarda, Esc cancela, error muestra toast.
- `ChipsFiltros.test.tsx` — toggle + contadores + aplicarChips.
- `TablaCaptacion.test.tsx` — sort + paginación.

### 6. Regenerar tipos TS (15 min)

```powershell
cd C:\Users\joliv\valere-v2
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts
npx tsc --noEmit
```

Después limpiar `(supabase as any)` en `api.ts` (hooks nuevos).

---

## Cosas que NO hacer

- ❌ NO arrancar Hallazgo #1 (Google Calendar) en esta sesión. Necesita OAuth credentials Google Cloud Console — Juan debe configurarlo primero.
- ❌ NO retomar sprint OMIE/PrecioPool ahora. Está en git history; foco en Carolina.
- ❌ NO añadir features nuevas que Carolina no haya pedido literal.

---

## Frases-trigger que escuchar si Carolina vuelve a probar

- "no veo qué tengo que hacer hoy" → pestaña "Hoy" del backlog `.cowork/backlog/agenda-captacion.md`.
- "no encuentro X" → fix de copy/iconografía.
- "se ve raro/lento" → bug o cache Cloudflare.
- "no me deja hacer Y" → permisos/RLS.

---

## Notas operativas aprendidas en esta sesión

1. **Pegar SQL grande en Supabase**: si la migración entera falla con "syntax error at end of input", dividir en 3 bloques pequeños y aplicar uno a uno. Los caracteres especiales del español a veces revientan codificación al pegar.
2. **Heredoc grande con `cat <<EOF >> archivo`** en bash: si el contenido es muy largo (>1000 líneas), puede truncarse. Mejor usar Write/Edit tool.
3. **Cuando TSC da error en archivo ajeno** (DashboardPage), comprobar primero si era preexistente antes de tocar. En este caso lo era — sprint OMIE quedó a medias.
4. **El proyecto tenía TSC roto en main desde hace tiempo**. Antes de cada cierre de sprint, ejecutar `npx tsc --noEmit` aunque parezca innecesario.

---

— Cowork, 2026-05-19 22:00.
