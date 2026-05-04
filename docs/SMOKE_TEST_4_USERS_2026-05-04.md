# Smoke test 4 usuarios reales — 2026-05-04

> **Objetivo:** validar que el MVP captación está listo para 1 semana de uso real con los 4 usuarios. Detectar fugas de visibilidad/permisos a nivel BD, código y deploy ANTES de comunicarlo al equipo.
>
> **Método:** combinación de (a) consulta SQL objetiva sobre la BD prod, (b) auditoría del código de Sidebar/rutas, (c) verificación HTTP del deploy. NO se hizo login real con Chrome porque la BD y el código ya dan respuesta determinista.

---

## 0. Deploy verificado

`GET https://valere-v2.pages.dev/login` → **HTTP 200** OK. Sirve el último bundle `index-BTNwZ0KY.js`. CSP correcto. ✅

---

## 1. Bandeja por usuario (qué ve cada uno en `v_mis_oportunidades`)

Resultado real, simulando el filtrado `responsable_actual_id = auth.uid()`:

| Usuario | Funciones | Bandeja (v_mis_oportunidades) |
|---|---|---|
| Carolina Aroca | `[telemarketing]` | DEMO Industria Textil ABC SL [esperando_factura] |
| Carolina Maciñeiras | `[analista]` | DEMO Hostal del Pino SL [factura_recibida] |
| Antonio Rodriguez | `[asesor_senior]` | DEMO Frigorífica Norte SL [asignada_a_senior] |
| Juan Olivares | `[admin, asesor_senior]` | DEMO Bodega Mediterránea SL [asignada_a_senior] (creada 2026-05-04 para validación UI) |

**Veredicto:** ✅ Cada uno verá exactamente la oportunidad que le toca AHORA. El filtrado por responsable_actual_id funciona como diseñado.

**Demo Juan**: Bodega Mediterránea SL en Tarragona. Cliente complejo multi-CUPS (3), tarifa 6.1TD, bodega+oficinas+nave logística. Valor estimado 18.500€, ahorro anual 9.200€. Decisor identificado, factura recibida hace 4 días. Etiqueta `DEMO_MVP` en `external_id` para borrar fácil cuando lleguen datos reales.

---

## 2. Sidebar — qué items ve cada función (auditoría del código)

Revisado `src/components/layout/Sidebar.tsx`. Filtros aplicados:

### Lo que SÍ funciona ✅

- **Sección "Captación"** (3 items) filtra correctamente por funciones:
  - `/captacion` → solo `[telemarketing, admin]`
  - `/analisis-captacion` → solo `[analista, admin]`
  - `/cartera-senior` → solo `[asesor_senior, admin]`
- **Sección "Admin"** filtra por `role` (`master`, `manager`). Los 3 nuevos users son `consultant`, no la ven. ✅
- Carolina Aroca solo ve "Captación", Carolina M solo "Análisis facturas", Antonio solo "Cartera senior". ✅

### Fugas detectadas ⚠️

**A. Bloque "CRM Comercial" se muestra completo a todos** (sin filtro por función):
- 13 items: Dashboard, Empresas, Contactos, Actividades, Calendario, Contratos, Oportunidades, Informes, Incidencias, Renovaciones, **Importador**, Plantas FV, **Datadis**.
- Riesgo:
  - **Importador** y **Datadis** no son para telemarketing/analista — pero ambos los ven.
  - **Renovaciones**, **Plantas FV** son legado/poco usados — distrae sin función.
  - Empresas/Contactos/Oportunidades **sí** tienen sentido transversal pero sin filtrado por "qué empresas SUYAS" — hoy ven todas.

**B. Sección "Gestión de Potencias" se muestra completa a todos**:
- 9 items del módulo Potencias (otra app interna).
- Carolina Aroca, Carolina M, Antonio NO trabajan en Potencias y lo ven todo.

---

## 3. Rutas — protección por funciones (auditoría `App.tsx`)

`AuthGuard` solo acepta filtro por `roles=` (rol legacy), no por `funciones=`. Aplicación actual:

| Ruta | Guard | Comentario |
|---|---|---|
| `/admin` | `roles: ['master','manager']` | ✅ Bien protegida |
| **resto (45+ rutas)** | sin `roles=` | ⚠️ Cualquier user autenticado entra |

**Implicación práctica**: aunque Carolina Aroca **no vea** Datadis en el sidebar (no se lo ocultamos hoy, pero lo haremos), si **teclea** `/datadis` en la URL → entra y ve todo. Igual con `/importador`, `/potencias`, `/oportunidades` (sin filtro propio), etc.

---

## 4. RLS de las tablas — capacidad de escritura

CLAUDE.md ya documenta el estado: RLS permisivo, todo `authenticated` puede CRUD cualquier tabla. Concretado para los 4 users:

- Carolina Aroca puede **editar `valor_estimado_eur`** de cualquier oportunidad (no solo la suya). ⚠️
- Cualquier user puede **borrar contactos** o cualquier registro. ⚠️
- Cualquier user puede **cerrar una oportunidad** como ganada/perdida. ⚠️

Esto NO se va a tocar hoy (directriz: no más features hasta uso real con feedback). Documentado en `docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md` capa B (RLS por entidad) y D (RPCs con check de función).

---

## 5. Veredicto de aptitud para uso real

### LISTO para arrancar uso real ✅

- Las 3 bandejas funcionan (cada user verá su demo correcto).
- Las 3 nuevas rutas captación filtran sidebar por función.
- El deploy sirve sin errores.
- Master único Juan se aprueba auto.
- 4 usuarios aprobados con funciones correctas.

### Aceptado como deuda conocida (no bloquea uso real) ⚠️

| Fuga | Severidad | Acción |
|---|---|---|
| Sidebar CRM Comercial visible a todos | Baja (UX confuso) | Capa A backlog permisos |
| Sidebar Potencias visible a todos | Baja (UX confuso) | Capa A backlog permisos |
| Rutas sin guard `funciones=` | Media (acceso por URL directa) | Capa A backlog permisos |
| RLS permisivo | Media (cualquiera escribe cualquier dato) | Capa B+D backlog permisos |

**Razón de no fixear hoy**: directriz validada por ChatGPT — cerrar el flujo real con uso del equipo antes de añadir capas. Si en 1 semana de uso aparece una fricción que sí justifique adelantar capa A (por ej: Carolina Aroca pulsa por error en Importador y rompe algo), se desbloquea sprint.

### Recomendación inmediata para Juan

1. **Comunicar a los 3 users**: ven su bandeja, los demás items son legado y los ignoren. Confianza en el equipo > guard técnico restrictivo.
2. **Pedir feedback explícito** cuando topen con algo que no entienden o que no deberían ver.
3. **Asignarte una oportunidad demo propia** para validar la UI desde tu perfil (admin+asesor_senior) sin tener que crear datos.

---

## 6. Preparación recomendada antes de la primera sesión real

- [x] BD verificada (este documento)
- [x] Deploy verificado
- [ ] Onboarding email/Slack para los 3 nuevos users (próximo bloque del plan de hoy)
- [ ] Mecanismo de feedback (`docs/FEEDBACK_USO_REAL.md`)
- [ ] Carolina Aroca conoce su password temporal `Valere2026Temporal!` y va a resetearlo en primer login

---

## Apéndice: comando para reproducir el smoke BD

```sql
-- Qué ve cada user en su bandeja
WITH usuarios AS (
  SELECT id, email, full_name, funciones
  FROM public.user_profiles
  WHERE email IN (
    'jolivares@valereconsultores.com',
    'arodriguez@valereconsultores.com',
    'administracion@valereconsultores.com',
    'info@valereconsultores.com'
  )
)
SELECT
  u.full_name AS user_real,
  u.funciones,
  COALESCE(
    string_agg(e.nombre || ' [' || o.etapa_operativa || ']', ' / ' ORDER BY e.nombre),
    '— (vacío)'
  ) AS bandeja_total
FROM usuarios u
LEFT JOIN public.oportunidades o
  ON o.responsable_actual_id = u.id AND o.deleted_at IS NULL
LEFT JOIN public.empresas e ON e.id = o.empresa_id
GROUP BY u.id, u.full_name, u.funciones
ORDER BY u.full_name;
```
