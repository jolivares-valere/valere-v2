# Informe — repo `valere-gestion-energetica`

> Generado: 2026-04-24 por Cowork.

## Conclusiones

1. **No tiene proyecto Supabase asociado en la organización VALERE CONSULTORES.**
   Verificado vía Supabase MCP (`list_projects` + `list_organizations`): la organización `VALERE CONSULTORES` (`luvkvsihgucimbqmqarf`) tiene **únicamente 2 proyectos**:
   - `PROYECTO VALERE` (`gtphkowfcuiqbvfkwjxb`, eu-west-1) — backend del CRM `valere-v2`.
   - `valere-gestion-potencias` (`alesfvxqtwlrwlmkoosg`, eu-central-1) — backend de Potencias + Excedentes.

2. Por tanto, las 3 hipótesis sobre `valere-gestion-energetica` son:
   - **(a)** El repo no usaba Supabase (puede haber usado SQLite, JSON files, o alguna otra DB).
   - **(b)** El repo usaba un proyecto Supabase que ya fue borrado.
   - **(c)** El repo apuntaba a un proyecto Supabase fuera de la org `VALERE CONSULTORES` (cuenta personal, otro org).

3. **No hay riesgo Supabase activo** asociado a este repo en este momento.

## Verificación pendiente (NO hecha aquí, requiere acceso al repo)

Para cerrar el caso al 100%:

1. Abrir el repo `jolivares-valere/valere-gestion-energetica` en GitHub.
2. Inspeccionar:
   - `.env.example` o `.env.production.example` — qué env vars declara.
   - `package.json` — qué stack usa (¿`@supabase/supabase-js`? ¿`firebase`? ¿`prisma`?).
   - `README.md` — descripción del proyecto.
   - Carpeta de migrations o schema SQL si existe.
   - Fecha del último commit y autor.
3. Si **declara `VITE_SUPABASE_URL` o similar** y aquí ya no existe → la BBDD está borrada, sin riesgo.
4. Si **usa otra cuenta** (Google personal, otro proveedor) → identificar y revocar credenciales.

## Recomendación

**Opción A (segura)** — archivar el repo en GitHub:

- Settings del repo → Archive this repository.
- Esto lo deja read-only, indica claramente que no se mantiene, y no se puede modificar accidentalmente.
- Reversible si se quiere recuperar.

**Opción B (limpieza total)** — eliminar el repo:

- Solo si Juan confirma que no aporta nada que ya no esté en CRM/Potencias/Excedentes.
- Irreversible (hay que clonar localmente antes por si acaso).

**Recomendación final**: archivar (no borrar) tras confirmar punto 4 del checklist. Cero coste, máxima seguridad.

## Estado del repo en GitHub

- Detectado al conectar Vercel el 2026-04-23 (según handoff).
- No investigado aún.
- Sospecha original de Juan: "primer intento de app, hay que ver si hay algo rescatable".
