# Mensaje para próxima sesión Claude

**De:** Cowork session 2026-05-04
**Para:** Próxima sesión (Cowork o Code)

## Estado al cierre

Pre-uso real cerrado. Smoke test + onboarding + feedback listos. Cero código nuevo.

**Demo añadida para Juan**: Bodega Mediterránea SL (asignada_a_senior, €18.500 / €9.200/año), con `external_id='DEMO_MVP'` para borrar fácil. Permite a Juan validar la bandeja Cartera Senior desde su perfil sin estar vacía.

Documentos clave producidos hoy (leerlos al abrir):
- `docs/SMOKE_TEST_4_USERS_2026-05-04.md` — auditoría BD + sidebar/rutas
- `docs/ONBOARDING_4_USERS_2026-05-04.md` — 3 borradores que Juan envía
- `docs/FEEDBACK_USO_REAL.md` — donde se registran fricciones

## Qué hacer al abrir próxima sesión

### Si Juan trae feedback (FEEDBACK_USO_REAL.md tiene entradas)

1. Leer todas las entradas del FEEDBACK desde la última procesada (ver tabla "Histórico de procesamientos" del propio doc).
2. Tagear cada entrada con categoría (`fuga`, `hueco`, `ux`, `bug`, `mejora`, `confianza`).
3. Si hay 3+ entradas con severidad media/alta o ≥7 días desde el último procesamiento:
   - Proponer sprint correctivo basado en evidencia.
   - Priorizar por severidad y por número de users afectados.
   - Estimar esfuerzo.
   - Pedir luz verde a Juan ANTES de implementar.
4. Actualizar tabla "Histórico de procesamientos" tras procesar.

### Si Juan NO trae feedback

NO abrir código. Posibles tareas valiosas:
- Asignar a Juan una oportunidad demo para que él pueda validar la UI desde su perfil (su bandeja sale vacía hoy).
- Revisar logs de Sentry / Cloudflare por si hay errores silenciosos.
- Proponer una mejora muy puntual al onboarding doc si Juan reporta que algún punto generó dudas.

### Lo que NO hacer (recordatorio)

- ❌ No implementar permisos granulares (capas B/C/D del backlog). Doc: `docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md`.
- ❌ No añadir features nuevas no priorizadas.
- ❌ No refinar schema multi-rol (CONGELADO).

## Estado técnico al cierre

- BD prod: 4 usuarios reales operativos + 3 demos asignados a responsables reales.
- Deploy: `valere-v2.pages.dev` HTTP 200, último bundle servido.
- TSC: no se tocó código, sigue a 0 errores (verificado en cierre sprint anterior).
- Tests: no se tocaron, siguen 39/39.
- Branch: `main` con docs nuevos commiteados.

## Verificación rápida BD al abrir

```sql
SELECT email, full_name, funciones, approved
FROM public.user_profiles
WHERE email IN ('jolivares@valereconsultores.com','arodriguez@valereconsultores.com','administracion@valereconsultores.com','info@valereconsultores.com')
ORDER BY email;
```

Debe devolver 4 filas con funciones correctamente asignadas.
