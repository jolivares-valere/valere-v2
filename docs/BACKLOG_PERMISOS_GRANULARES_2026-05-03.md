# Backlog — Permisos granulares por usuario en CRM Valere

> **Fecha:** 2026-05-03
> **Estado:** ⏸️ BACKLOG (NO implementar todavía)
> **Razón del aplazamiento:** directriz validada por ChatGPT — *"El modelo de datos ya soporta el flujo real. Lo siguiente no es más código, es uso real con el equipo."* Antes de añadir matriz de permisos hay que ver el flujo real funcionando ≥1 semana con los 4 usuarios, observar fricciones reales y diseñar permisos basados en evidencia, no en hipótesis.

---

## Petición original (Juan, 2026-05-03)

> *"Carolina Aroca solo debe ver del CRM lo justo para llamar, meter datos de posibles clientes, subir facturas en caso que la envíen para que quede en nuestra empresa (seguramente en Drive de Valere), y que pueda gestionar la parte de llamadas, emails a clientes con propuestas y cierres de clientes si aceptan propuestas y seguimiento de los clientes que ha enviado a los asesores para que hagan las visitas o cierres. Tendremos que plantear las opciones editables de lo que cada persona autorizada puede ver o editar del CRM Valere."*

Traducción técnica: matriz de permisos por **función** (no por user) que controle qué entidades/campos/acciones puede leer/escribir cada rol del flujo.

---

## Estado actual (qué SÍ existe ya)

### 1. Defensa de aprobación (auth)
- `user_profiles.approved` + `AuthGuard` redirige a `/pending-approval` si no aprobado.
- 4 usuarios reales aprobados: Juan, Antonio, Carolina Maciñeiras, Carolina Aroca.

### 2. Funciones por usuario (modelo de datos)
- Columna `user_profiles.funciones text[]` con 4 valores válidos: `admin`, `asesor_senior`, `telemarketing`, `analista`.
- Asignación actual:
  | Usuario | Funciones |
  |---|---|
  | Juan Olivares | `['admin', 'asesor_senior']` |
  | Antonio Rodriguez | `['asesor_senior']` |
  | Carolina Maciñeiras | `['analista']` |
  | Carolina Aroca | `['telemarketing']` |

### 3. Filtrado por bandeja (lectura selectiva)
- Vista `v_mis_oportunidades` con `security_invoker = true` filtra por `responsable_actual_id = auth.uid()`.
- Cada user solo ve las oportunidades donde es responsable AHORA.
- Sidebar condicional: items se muestran solo si el user tiene la función adecuada.

### 4. RLS permisivo (escritura sin restricción granular)
- Estado actual: cualquier `authenticated` puede CRUD cualquier tabla.
- Documentado en CLAUDE.md como deuda técnica conocida (FASE 20.9).

---

## Hueco que cubre este backlog

Lo que YA está cubierto: **qué oportunidades VE cada user** (vía `v_mis_oportunidades`).
Lo que **NO** está cubierto:
1. Qué **entidades** transversales puede ver/tocar cada función (empresas, contactos, contratos, propuestas, datadis, propuestas_energia, admin, importador…).
2. Qué **campos** de una entidad puede editar (ej: telemarketing puede meter contacto pero no editar `valor_estimado_eur`).
3. Qué **acciones** puede ejecutar (ej: solo asesor_senior puede cerrar `cerrado_ganada`/`cerrado_perdida`).
4. **Fuga lateral**: Carolina Aroca podría hoy abrir `/empresas/<id>` de un cliente que NO le pertenece y verlo todo. O peor, editarlo.

---

## Diseño propuesto (4 capas — NO implementar aún)

### Capa A — Visibilidad por menú (cosmético — ya parcialmente hecho)
Sidebar oculta items por función. Hoy:
- `telemarketing` → ve "Captación", "Empresas", "Contactos".
- `analista` → ve "Análisis facturas", "Empresas", "Contactos", "Datadis".
- `asesor_senior` → ve "Cartera senior", "Propuestas", "Contratos", "Empresas".
- `admin` → todo.

**Ampliar cuando llegue uso real.** Detalle por revisar tras 1 semana de uso.

### Capa B — Permisos por entidad (matriz funciones × tablas)
Matriz declarativa. Una sola tabla `func_permissions`:

| funcion | tabla | can_select | can_insert | can_update | can_delete |
|---|---|---|---|---|---|
| telemarketing | empresas | ✅ (suyas) | ✅ | ✅ (sus campos) | ❌ |
| telemarketing | contactos | ✅ (suyas) | ✅ | ✅ | ❌ |
| telemarketing | oportunidades | ✅ (responsable) | ✅ (etapas iniciales) | ✅ (sus campos) | ❌ |
| telemarketing | facturas | ✅ (suyas) | ✅ (subir) | ❌ | ❌ |
| telemarketing | contratos | ❌ | ❌ | ❌ | ❌ |
| analista | facturas | ✅ (recibidas) | ❌ | ✅ (decisión) | ❌ |
| analista | propuestas_energia | ✅ | ✅ | ✅ | ❌ |
| asesor_senior | oportunidades | ✅ (asignadas) | ✅ | ✅ (cerrar) | ❌ |
| asesor_senior | contratos | ✅ | ✅ | ✅ | ❌ |
| admin | * | ✅ | ✅ | ✅ | ✅ |

**Implementación**: políticas RLS por tabla que consultan `funciones` del user vs `func_permissions`. Migración aditiva, no rompe nada.

### Capa C — Permisos por campo (denylist)
Algunas columnas son sensibles: `oportunidades.valor_estimado_eur`, `oportunidades.ahorro_anual_estimado`, `propuestas_energia.precio_final`. Solo `asesor_senior` y `admin` deben editarlas. Telemarketing puede verlas pero no tocar.

**Implementación**: triggers `BEFORE UPDATE` que validan función del user antes de aceptar el cambio. Más complejo, requiere lista mantenida.

**Alternativa más simple**: dos vistas — `v_oportunidad_lectura_completa` (todos los campos) vs `v_oportunidad_edit_telemarketing` (solo subset editable). Frontend usa la que toca.

### Capa D — Acciones (RPC con check de función)
Acciones críticas como `cerrar_ganada(oportunidad_id)`, `asignar_a_senior(oportunidad_id, senior_id)`, `crear_propuesta(...)`, `subir_factura_drive(...)` se modelan como RPCs con check de función al inicio:

```sql
CREATE FUNCTION public.cerrar_ganada(p_id uuid) RETURNS void AS $$
BEGIN
  IF NOT public.user_has_funcion('asesor_senior') THEN
    RAISE EXCEPTION 'Solo asesores senior pueden cerrar oportunidades como ganadas';
  END IF;
  -- ... lógica
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Helper `public.user_has_funcion(text)` ya tendría sentido crear (pequeño, reusable).

---

## Casos críticos identificados (Carolina Aroca como ejemplo)

| Acción | Hoy | Esperado |
|---|---|---|
| Ver cualquier empresa de la BD | ✅ (PROBLEMA) | ❌ solo las suyas |
| Editar `valor_estimado_eur` de una oportunidad | ✅ (PROBLEMA) | ❌ solo asesor_senior |
| Borrar contactos | ✅ (PROBLEMA) | ❌ admin only |
| Subir factura | (sin UI todavía) | ✅ con guard de función |
| Ver propuesta enviada a su cliente | ✅ | ✅ |
| Cerrar oportunidad ganada | ✅ (PROBLEMA — debería pasar a senior) | ❌ |
| Ver Datadis | ✅ (PROBLEMA) | ❌ es de analista |
| Ver Importador CSV | ✅ (PROBLEMA) | ❌ admin only |
| Ver Admin/Pendientes | ✅ (PROBLEMA) | ❌ admin only |

**6 fugas reales** detectables con un walkthrough de 5 min logueado como Carolina Aroca.

---

## Trade-offs (qué NO hacer)

1. ❌ **No mezclar `role` vs `funciones`**. `role` ya existe (`master`, `consultant`, `client`) y se queda como está. Permisos van por `funciones`.
2. ❌ **No replicar permisos en frontend**. Frontend solo oculta por UX (defense in depth). El check real va en BD (RLS + RPC).
3. ❌ **No duplicar matriz en docs/JSON/admin UI hasta que el flujo se haya estabilizado** con uso real. Cambiar permisos por una migration es más predecible que por una UI configurable.
4. ❌ **No implementar capa C (campo) hasta confirmar fricción real**. Capa B (entidad) cubre el 80% del riesgo y es 10% del esfuerzo de implementación.

---

## Pre-requisitos para empezar (cuando llegue el momento)

1. ✅ MVP captación funcionando con 4 users reales (HOY: hecho)
2. ⏳ ≥1 semana de uso real con feedback de Carolina Aroca, Carolina Maciñeiras y Antonio
3. ⏳ Lista priorizada de fugas detectadas (qué SÍ ven que no deberían, qué SÍ tocan que no deberían)
4. ⏳ Decisión Juan: ¿permisos hardcoded en migrations o configurables vía Admin UI?

---

## Estimación cuando se desbloquee

| Capa | Esfuerzo | Prioridad |
|---|---|---|
| A. Sidebar/menú (cosmética) | 1-2h | ALTA (ya parcialmente) |
| B. RLS por entidad (matriz) | 6-8h | ALTA |
| C. Permisos por campo | 4-6h | MEDIA — solo si capa B insuficiente |
| D. RPCs con check de función | 4-5h por acción | ALTA para acciones críticas (cerrar, asignar) |

**Total razonable de un sprint dedicado**: ~3 días (1 dev) cuando esté maduro lo suficiente.

---

## Archivos relacionados

- `docs/ESTADO.md` — funciones validadas
- `docs/SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md` — schema multi-rol que sustenta este backlog
- `src/components/layout/Sidebar.tsx` — punto de implementación capa A
- `supabase/migrations/20260501_mvp_captacion_multi_rol_schema.sql` — base del modelo
- (futuro) `supabase/migrations/<fecha>_func_permissions_matrix.sql` — implementación capa B

---

## Frase guía (recordatorio)

> *El modelo de datos ya soporta el flujo real. El riesgo ya no está en el schema; está en empezar UI sin cerrar la deuda crítica.*
> — ChatGPT, dictamen final 2026-05-01

Aplicar esta frase también a los permisos: **el flujo real con 4 users es la deuda crítica que cerrar antes de añadir capas**.
