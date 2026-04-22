# ESTADO.md — Historial de fases y decisiones técnicas

> Actualizar al cerrar cada sesión de trabajo.
> Para el estado ACTUAL del proyecto ver `CLAUDE.md` en la raíz.

---

## Última actualización: 2026-04-22

### Lo que se hizo en esta sesión
- Diagnóstico del fallo de FASE 28.6: el script original referenciaba `is_manager_or_above()` inexistente
- Generación del script corregido `supabase/fase-28.6-rls-granular.sql` (idempotente, CREATE antes de DROP)
- Añadido `*.tsbuildinfo` a `.gitignore`
- Creados `CLAUDE.md` y `docs/ESTADO.md` como sistema de memoria entre sesiones
- PR #3 abierto (draft): https://github.com/jolivares-valere/valere-v2/pull/3

### Lo que está pendiente (por orden de prioridad)

1. **Ejecutar `supabase/fase-28.6-rls-granular.sql`** en Supabase SQL Editor
   - Ir a: https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/sql/new
   - Pegar el contenido del archivo y ejecutar
   - Verificar que devuelve 12 policies (4 por tabla)
   - ⚠️ NO ejecutar el script antiguo — usar solo `supabase/fase-28.6-rls-granular.sql`

2. **Merge PR #1 a main** desde GitHub UI con Squash and merge
   - URL: https://github.com/jolivares-valere/valere-v2/pull/1
   - Título: `feat: Valere v2 — CRM + Calculadora unificados (FASE 20-28)`
   - Tras el merge, borrar la rama `claude/valere-crm-architecture-2vvEV`

3. **Tag v2.0.0** tras el merge
   ```bash
   git checkout main && git pull origin main
   git tag -a v2.0.0 -m "Valere v2 — CRM + Calculadora unificados"
   git push origin v2.0.0
   ```

4. **Vercel deploy**: se dispara automático al mergear a main
   - Verificar que las env vars están configuradas en Vercel
   - Post-deploy checklist: login, dashboard, /admin, /calendario, F12 sin errores

---

## Historial de fases

### FASE 20.0–20.10 — Fusión CRM + Calculadora (arquitectura feature-based)
- Unificación de los dos productos en un solo repo
- Arquitectura por features bajo `src/modules/`
- Router con layout compartido (sidebar + header)
- Sistema de roles: master > admin > manager > jefe_equipo > comercial

### FASE 21.a–21.c — Pipeline energético
- Pipeline visual de oportunidades (kanban + lista)
- Alertas de vencimiento de contratos
- Timelines de seguimiento por cliente

### FASE 22 — Incidencias
- Módulo de registro y seguimiento de incidencias
- Estados: abierta, en curso, resuelta, cerrada
- Asignación por comercial y jefe de equipo

### FASE 23 — Renovaciones
- Gestión del ciclo de vida de contratos energéticos
- Alertas automáticas a N días del vencimiento
- Integración con pipeline

### FASE 24 — Documentos + Storage
- Subida y gestión de documentos por cliente/contrato
- Integración con Supabase Storage
- Políticas de acceso por rol

### FASE 25 — Notificaciones
- Sistema de notificaciones in-app
- Tabla `notificaciones` con RLS
- Policy `n_own` (ALL): `usuario_id = auth.uid() OR get_user_rol() = 'admin'`

### FASE 26 — Exportación CSV + Informes
- Exportación a CSV desde cualquier listado
- Generación de informes PDF con @react-pdf/renderer
- Filtros avanzados por período, comercial, estado

### FASE 27 — Calendario
- Vista de calendario (mensual/semanal/diaria)
- Integración con actividades, reuniones y vencimientos
- Filtros por comercial y tipo de evento

### FASE 28 ejes 1–3 — Custom fields, Dashboards, Automatizaciones
- **Eje 1**: Custom fields configurables por admin (tablas `custom_fields_schema` + `custom_fields_values`)
- **Eje 2**: Dashboards diferenciados por rol (master ve todo, comercial ve solo sus datos)
- **Eje 3**: Automatizaciones básicas (recordatorios, triggers de estado)

### FASE 28.1–28.5 — Hardening
- 28.1: Hardening SQL (índices, constraints, FK)
- 28.2: Unificación visual (design tokens, consistencia)
- 28.3: Accesibilidad (ARIA, keyboard nav, contraste)
- 28.4: DROP de tablas y funciones legacy
- 28.5: Auditoría de seguridad (RLS review)

### FASE 28.6 — RLS granular (PENDIENTE)
- Script corregido en `supabase/fase-28.6-rls-granular.sql`
- Crea `is_manager_or_above()` como wrapper de `get_user_rol()`
- Divide policies ALL en operaciones granulares SELECT/INSERT/UPDATE/DELETE
- Pendiente de ejecutar en Supabase

---

## Decisiones técnicas importantes

### Por qué `get_user_rol()` y no `auth.jwt()` directamente
- `get_user_rol()` lee de `public.user_profiles`, la tabla de roles de la app
- Es más flexible: permite cambiar el rol sin reemitir el JWT
- El helper tiene SECURITY DEFINER para evitar que RLS se llame a sí mismo recursivamente

### Por qué CREATE-antes-de-DROP en la fase 28.6
- Con RLS activo, si una tabla queda sin policies = acceso bloqueado para todos
- El orden seguro es: crear las nuevas policies → verificar → DROP de las antiguas
- Todo en la misma transacción BEGIN...COMMIT garantiza atomicidad

### Por qué el build de `main` falla en Vercel
- `main` tiene el código base inicial (pre-fase 20)
- El código completo (fases 20-28) está en el PR #1, aún no mergeado
- El error `TS2688: Cannot find type definition for 'vite/client'` es pre-existente en main
- Se resolverá al mergear el PR #1 que tiene el código correcto con todas las dependencias

---

## Roles de usuario y permisos

| Rol | Nivel | Puede hacer |
|---|---|---|
| `master` | 1 (máximo) | Todo. Configura otros masters. |
| `admin` | 2 | Gestión completa excepto crear masters |
| `manager` | 3 | Ver todos los clientes/datos de su equipo |
| `jefe_equipo` | 4 | Ver y editar su equipo |
| `comercial` | 5 | Solo sus propios clientes y actividades |

### Helper `is_manager_or_above()`
```sql
-- Devuelve TRUE para: admin, master, manager
SELECT public.get_user_rol() = ANY (ARRAY['admin', 'master', 'manager'])
```

---

## Contacto y accesos

- **Supabase dashboard**: https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb
- **GitHub repo**: https://github.com/jolivares-valere/valere-v2
- **Vercel proyecto**: https://vercel.com/valere-consultores/valere-v2
- **Usuario master**: jolivares@valereconsultores.com (rol asignado por trigger SQL)
