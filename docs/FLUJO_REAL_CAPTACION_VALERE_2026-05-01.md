# Flujo real de captación Valere — modelo multi-rol con handoffs (1 mayo 2026)

> Tras descripción de Juan del flujo comercial real, aterrizamos lo que el CRM debe modelar. **Cambia profundamente** el diseño del MVP previo: no es CRM "1 vendedor → cliente", es **CRM multi-rol con handoffs explícitos** entre 4 personas con responsabilidades distintas.

---

## 1. El flujo narrado (en una página)

```
[Carolina Aroca] (telemarketing + envío + seguimiento)
   ├── Llama al lead
   ├── Pregunta por la persona con poder de decisión
   ├── Envía email con presentación de Valere
   └── Pide factura por teléfono

   ├── ❌ El cliente NO manda factura → cierre "no_envia_factura"
   │
   └── ✅ El cliente manda factura por email
              │
              ▼
[Handoff: factura recibida → Carolina Maciñeiras]
              │
              ▼
[Carolina Maciñeiras] (analista + decisora asignación + propuestas estándar)
   ├── Analiza la factura
   └── Decide complejidad / consumo del cliente

   ├── 🔵 Caso ESTÁNDAR
   │     ├── Carolina Maciñeiras hace propuesta estándar
   │     └── Pasa propuesta lista a Carolina Aroca
   │            │
   │            ▼
   │       [Handoff: propuesta lista → Carolina Aroca]
   │            │
   │            ▼
   │       [Carolina Aroca]
   │            ├── Envía email con propuesta al cliente
   │            ├── Llama de seguimiento
   │            ├── Si interesa → propone visita asesor
   │            ├── Si acepta → cierre ganada
   │            └── Si rechaza → cierre perdida
   │
   └── 🔴 Caso COMPLEJO / cliente alto consumo
         ├── Carolina Maciñeiras decide quién: Antonio o Juan
         ├── Indica a Carolina Aroca para que mande email al asesor designado
         │       │
         │       ▼
         │  [Handoff: cliente complejo → asesor senior]
         │       │
         │       ▼
         └── [Antonio o Juan] (asesor senior)
                ├── Contacta DIRECTAMENTE al cliente
                ├── Hace propuesta personalizada
                └── Cierra ganada / perdida sin volver a Carolina Aroca
```

---

## 2. Roles operativos identificados

Cuatro roles diferenciados, con responsabilidades sin solape:

| Rol | Persona | Función | Inputs | Outputs |
|---|---|---|---|---|
| **Telemarketing + Envío + Seguimiento** | Carolina Aroca | Captación inicial, envío de propuestas estándar, seguimiento | Lead nuevo / Propuesta estándar lista / Asignación complejos | Llamadas hechas, factura recibida (handoff), propuesta enviada, seguimiento, cierre ganada/perdida estándar |
| **Análisis + Asignación + Propuestas estándar** | Carolina Maciñeiras | Recibe factura, analiza, decide complejidad y a qué asesor asigna casos complejos, hace propuestas estándar | Factura recibida (handoff de Carolina Aroca) | Decisión estandar/senior, asesor asignado en complejos, propuesta lista (handoff a Carolina Aroca) |
| **Asesor senior** | Antonio | Atiende casos complejos, contacto directo con cliente, propuestas personalizadas | Cliente complejo asignado por Carolina Maciñeiras | Propuesta personalizada, cierre directo |
| **Asesor senior + admin** | Juan (master) | Idem Antonio + visión global | Idem | Idem + decisiones estratégicas |

Roles secundarios visibles en el flujo:
- **El cliente** (lead → cliente final).
- **Persona de decisión del cliente** (decisor energético dentro de la empresa cliente).

---

## 3. Etapas del workflow (el "estado" de cada lead/oportunidad)

El CRM actual tiene etapas macro (`prospecto` → `auditoria_consumo` → `oferta_presentada` → `negociacion` → `contrato_firmado` → `activo` → `cerrada_ganada` / `cerrada_perdida`).

**Hace falta una capa micro** que refleje el workflow operativo. Propongo añadir `etapa_operativa` además de `etapa`:

| etapa_operativa | descripción | quién es responsable | etapa macro asociada |
|---|---|---|---|
| `llamada_inicial` | Carolina Aroca llamó por primera vez | Carolina Aroca | prospecto |
| `decisor_identificado` | Sabemos quién decide en el cliente | Carolina Aroca | prospecto |
| `presentacion_enviada` | Email de presentación enviado | Carolina Aroca | prospecto |
| `factura_solicitada` | Carolina Aroca pidió la factura | Carolina Aroca | prospecto |
| `esperando_factura` | Cliente prometió enviarla | Carolina Aroca | prospecto |
| `factura_recibida` | PDF subido al CRM | Carolina Maciñeiras (handoff) | auditoria_consumo |
| `en_analisis_estandar` | Carolina Maciñeiras analizando | Carolina Maciñeiras | auditoria_consumo |
| `asignada_a_senior` | Carolina M. asignó a Antonio/Juan | Antonio o Juan (handoff) | auditoria_consumo |
| `propuesta_en_preparacion_estandar` | Carolina M. preparando propuesta | Carolina Maciñeiras | oferta_presentada |
| `propuesta_en_preparacion_senior` | Antonio/Juan preparando propuesta | Antonio o Juan | oferta_presentada |
| `propuesta_lista_estandar` | Lista para enviar | Carolina Aroca (handoff de M.) | oferta_presentada |
| `propuesta_enviada` | Email con propuesta enviado al cliente | Carolina Aroca (estándar) o asesor (senior) | oferta_presentada |
| `seguimiento_llamada` | Carolina Aroca llamó / asesor llamó tras envío | quien envió | negociacion |
| `visita_programada` | Asesor va a visitar al cliente | asesor designado | negociacion |
| `respuesta_recibida` | Cliente respondió (acepta / rechaza / pendiente) | quien recibió | negociacion |
| `cerrada_ganada` | Cliente firmó | comercial responsable | cerrada_ganada |
| `cerrada_perdida` | Cliente no firmó (con motivo) | comercial responsable | cerrada_perdida |

---

## 4. Modelo de datos propuesto

### 4.1 Cambios en `oportunidades`

```sql
-- Etapa operativa (workflow micro)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS etapa_operativa text;

-- Constraint: si la introducimos como ENUM, vinculamos check al ENUM.
-- De momento text + CHECK explícito.

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_operativa_check CHECK (
    etapa_operativa IS NULL OR etapa_operativa IN (
      'llamada_inicial','decisor_identificado','presentacion_enviada',
      'factura_solicitada','esperando_factura','factura_recibida',
      'en_analisis_estandar','asignada_a_senior',
      'propuesta_en_preparacion_estandar','propuesta_en_preparacion_senior',
      'propuesta_lista_estandar','propuesta_enviada',
      'seguimiento_llamada','visita_programada','respuesta_recibida',
      'cerrada_ganada','cerrada_perdida'
    )
  );

-- Quién es el responsable AHORA mismo (cambia con cada handoff)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS responsable_actual_id uuid
    REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_responsable_actual
  ON public.oportunidades(responsable_actual_id) WHERE deleted_at IS NULL;

-- Tipo de atención (decidido por Carolina Maciñeiras tras analizar factura)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS tipo_atencion text CHECK (tipo_atencion IN ('estandar','senior'));

-- Trazabilidad de hitos clave del flujo
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS factura_recibida_at timestamptz,
  ADD COLUMN IF NOT EXISTS factura_documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propuesta_documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propuesta_enviada_at timestamptz,
  ADD COLUMN IF NOT EXISTS visita_programada_at timestamptz;
```

### 4.2 Tabla nueva `oportunidad_handoffs`

Trazabilidad de cada cambio de responsable. Útil para auditoría y para entender el flujo real.

```sql
CREATE TABLE IF NOT EXISTS public.oportunidad_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  motivo text NOT NULL CHECK (motivo IN (
    'factura_recibida',
    'asignacion_a_senior',
    'propuesta_lista',
    'devuelta_para_revision',
    'reasignacion_manual',
    'otro'
  )),
  notas text,
  etapa_operativa_destino text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_handoffs_oportunidad
  ON public.oportunidad_handoffs(oportunidad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_handoffs_to_user
  ON public.oportunidad_handoffs(to_user_id, created_at DESC);

-- Trigger: cuando se inserta un handoff, actualizar responsable_actual_id en la oportunidad
CREATE OR REPLACE FUNCTION public.tg_oportunidad_handoff_apply()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.oportunidades
     SET responsable_actual_id = NEW.to_user_id,
         etapa_operativa = COALESCE(NEW.etapa_operativa_destino, etapa_operativa),
         updated_at = now()
   WHERE id = NEW.oportunidad_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_handoff_apply ON public.oportunidad_handoffs;
CREATE TRIGGER tg_handoff_apply
  AFTER INSERT ON public.oportunidad_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidad_handoff_apply();
```

### 4.3 Vista materializada (o regular) "Mis tareas"

Para que cada usuario vea solo lo que le toca AHORA:

```sql
CREATE OR REPLACE VIEW public.v_mis_oportunidades AS
SELECT
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.tipo_atencion,
  o.responsable_actual_id,
  o.factura_recibida_at,
  o.propuesta_enviada_at,
  o.created_at,
  o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
WHERE o.deleted_at IS NULL
  AND o.responsable_actual_id = auth.uid()
ORDER BY o.updated_at DESC;
```

Cada rol logueado verá:

- **Carolina Aroca** verá: leads para llamar (`llamada_inicial`/`esperando_factura`), propuestas listas (`propuesta_lista_estandar`), seguimientos pendientes (`propuesta_enviada`).
- **Carolina Maciñeiras** verá: facturas para analizar (`factura_recibida`), propuestas estándar para preparar (`en_analisis_estandar`).
- **Antonio / Juan** verán: clientes complejos asignados (`asignada_a_senior`), seguimientos directos.

### 4.4 Roles existentes en `user_profiles`

Roles ya soportados: `master | manager | consultant | client`.

Asignación propuesta:

| Persona | Role |
|---|---|
| Juan Olivares | `master` (ya) |
| Antonio | `manager` (asesor senior) |
| Carolina Aroca | `consultant` con sub-tag `comercial_telemarketing` |
| Carolina Maciñeiras | `consultant` con sub-tag `analista` |

**Pregunta**: ¿necesitamos sub-tags formales o basta con que el sistema sepa qué etapas operativas puede gestionar cada user? Mi propuesta: campo `funciones text[]` en `user_profiles`:

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS funciones text[] DEFAULT ARRAY[]::text[];

-- Valores posibles:
-- 'telemarketing'  → puede llamar leads y registrar primera fase
-- 'analista'       → puede analizar facturas y decidir complejidad
-- 'asesor_senior'  → puede llevar clientes complejos directamente
-- 'admin'          → master/manager con visibilidad total
```

Esto permite filtrar UI según funciones, no solo según role.

---

## 5. MVP ajustado al flujo real

El MVP previo (3-5 días, "Carolina trabaja con CRM") **no encaja con este flujo real**. Lo redimensiono:

### MVP v2 — captación multi-rol (5-7 días)

**Día 1 — Schema**
- Migration `etapa_operativa`, `responsable_actual_id`, `tipo_atencion`, `factura_recibida_at`, `factura_documento_id`, `propuesta_documento_id`.
- Tabla `oportunidad_handoffs` + trigger.
- Vista `v_mis_oportunidades`.
- ALTER `user_profiles` con campo `funciones text[]`.
- Crear users en `user_profiles` para Carolina Aroca, Carolina Maciñeiras, Antonio (si no existen).

**Día 2 — UI Carolina Aroca**
- Pantalla `/captacion` con tabs:
  - "Por llamar" (etapa_operativa IN llamada_inicial / esperando_factura).
  - "Propuestas para enviar" (propuesta_lista_estandar).
  - "Seguimientos" (propuesta_enviada).
- Botones acción rápida: "Marcar presentación enviada", "Marcar factura solicitada", "Subir factura recibida → pasa a Maciñeiras".

**Día 3 — UI Carolina Maciñeiras**
- Pantalla `/analisis` con tabs:
  - "Facturas pendientes" (etapa_operativa = factura_recibida).
  - "Propuestas en preparación" (en_analisis_estandar / propuesta_en_preparacion_estandar).
- Acciones:
  - Ver factura subida (link al documento).
  - Botón "Caso estándar — preparar propuesta" → cambia a `propuesta_en_preparacion_estandar`.
  - Botón "Caso senior — asignar" → modal selección Antonio/Juan + crea handoff.
  - Botón "Subir propuesta lista" → adjunta PDF + handoff a Carolina Aroca.

**Día 4 — UI Antonio / Juan**
- Pantalla `/cartera-senior` con tab:
  - "Asignados a mí" (responsable_actual_id = auth.uid() AND tipo_atencion = senior).
- Acciones:
  - Subir propuesta personalizada.
  - Marcar cierre directo (ganada/perdida con motivo).

**Día 5 — Subida documentos + acciones cross**
- Botón global "Subir factura" en cualquier oportunidad (acepta PDF, JPG escaneado).
- Botón global "Subir propuesta" en cualquier oportunidad.
- Visualización de documentos en ficha oportunidad (factura + propuesta lado a lado).

**Día 6 — Compliance básico + outcomes**
- Aviso LOPDGDD verbal (sin auditoría compleja todavía).
- Catálogo motivos de pérdida (FASE 30.x si no aplicado).
- Botón global "Cerrar como perdida" con motivo.

**Día 7 — QA + ajustes**
- Sesión con Juan + las 2 Carolinas + Antonio.
- Recorrer 1 lead end-to-end.
- Bugs y ajustes inmediatos.

**Total: 7 días para MVP que respeta el flujo real.**

---

## 6. Por qué este MVP es mejor que el anterior

| Aspecto | MVP v1 (3-5 días) | MVP v2 (7 días) |
|---|---|---|
| Modelo asumido | 1 vendedor → cliente | 4 roles con handoffs |
| Refleja realidad | ❌ no | ✅ sí |
| Carolina Aroca puede usarlo | parcial | sí completo |
| Carolina Maciñeiras integrada | no | sí |
| Antonio integrado | no | sí |
| Subida factura/propuesta | no | sí |
| Tracking handoffs | no | sí (tabla) |
| Filtrado por usuario | sí simple | sí por etapa_operativa |

El MVP v2 tarda 2 días más pero **es lo que el negocio realmente necesita**. El v1 habría sido un experimento fallido en simulación.

---

## 7. Cómo encaja con la simulación de uso real

La simulación de 1 semana propuesta sigue siendo válida, pero se observa con foco multi-rol:

**Métricas a recoger durante simulación:**

- Tiempo medio en cada etapa_operativa.
- Cuántos handoffs se hacen en total.
- Cuántos handoffs son "devueltos para revisión" (síntoma de fricción entre roles).
- Quién decide más rápido (Carolina M. con casos estándar vs senior).
- Cuántas facturas reciben vs cuántas se piden.
- Cuántas propuestas se envían vs facturas recibidas.

**Embudo real visible** tras 1 semana de simulación:

```
Llamadas hechas:                 X
  → Decisor identificado:        Y (% conversión)
    → Presentación enviada:      Z
      → Factura recibida:        W (% — el dato más valioso)
        → Análisis hecho:        V
          → Estándar:            E1   (Carolina M.)
          → Senior:              E2   (Antonio/Juan)
            → Propuesta enviada: P
              → Cierre ganada:   G
              → Cierre perdida:  L
```

Esta data NO la tiene Valere ahora. Tras 1 semana de uso real con MVP v2, la tendrá.

---

## 8. Lo que el MVP NO incluye (sigue diferido a Release 1 final)

```
✗ PDF diagnóstico inicial automático con SIPS+heurísticas (idea ChatGPT FASE 41)
✗ Plantilla email con Gmail draft auto
✗ Lead scoring HOT/WARM/COLD
✗ Cadencias semi-automáticas
✗ Dashboard supervisor para Juan
✗ Tracking apertura email (jamás antes de R3)
✗ Compliance LOPDGDD profundo (auditoria_contacto_comercial)
✗ Lista Robinson sincronización
✗ CTI Aircall
✗ OMIE precios diarios
✗ SIPS lookup
```

Estas se priorizan tras la simulación SOLO si los 3 roles las piden activamente.

---

## 9. Preguntas pendientes a Juan antes de empezar

1. **Criterio "alto consumo / cliente complejo"**: ¿hay regla concreta o es decisión cualitativa de Carolina Maciñeiras? Ejemplo: facturación cliente >€2k/mes? Potencia >50 kW? Tarifa 6.x? Múltiples CUPS? Sector industrial?
   - Si hay regla → automatizar la sugerencia.
   - Si es cualitativo → deja a Carolina M. decidir manualmente con campo `tipo_atencion`.

2. **Cuando Antonio/Juan se ponen directamente con el cliente**: ¿siguen pasando por Carolina Aroca para algo (envío email inicial al asesor, etc.) o el flujo se queda 100% en el asesor?
   - Tu mensaje: *"Carolina Aroca es la que comunica al asesor (manda email a Antonio o Juan)"*. Entendido: ese email es parte del handoff, queda registrado.
   - ¿Después de eso, Carolina Aroca participa en el seguimiento del caso senior o desaparece del caso?

3. **Formato de propuestas**: ¿la propuesta estándar de Carolina Maciñeiras es siempre PDF? ¿La hace en Word + exporta? ¿Tiene plantilla? ¿Excel? ¿Las propuestas senior de Antonio/Juan son distintas?

4. **Carolina Maciñeiras y Antonio en el sistema**: ¿están dados de alta en `user_profiles` hoy? Necesito sus emails para crear los users. Si no, los doy de alta yo mientras los esperas.

5. **Visita personal**: ¿quién la hace? ¿solo asesores senior (Antonio/Juan)? ¿Carolina Aroca puede ir también o solo agenda?

6. **Múltiples CUPS por cliente**: si un cliente tiene 5 CUPS, ¿se gestiona como 1 oportunidad con multi-CUPS, o como 5 oportunidades separadas? El flujo de Carolina M. + asesor analiza globalmente o por CUPS?

7. **Reasignaciones**: si Antonio empieza un cliente complejo y se va de vacaciones, ¿Juan toma el caso? ¿Cómo se trazan estas reasignaciones?

8. **Cuándo dejar de llamar a un lead que no manda factura**: ¿cuántos intentos hace Carolina Aroca antes de marcar como `cerrada_perdida` con motivo `no_envia_factura`? ¿2? ¿4? ¿Cadencia X días?

9. **Precio actual cliente conocido sin factura**: ¿podemos generar propuesta inicial sin factura usando heurísticas (idea modo diagnóstico de ChatGPT)? ¿O aquí Valere prefiere esperar a la factura siempre?

10. **Cliente que ya ha sido cliente en el pasado**: ¿hay flujo "recuperación" diferente al estándar?

Con respuestas a 1, 4 y 8 puedo empezar el MVP v2 mañana.

---

## 10. Impacto en roadmap

### Lo que cambia inmediato

- **MVP de captación pasa de 3-5 días a 7 días** para reflejar 4 roles + handoffs.
- **Modelo de datos amplía** con etapa_operativa + responsable_actual + tabla handoffs.
- **Dashboards** distintos por rol (Carolina A., Carolina M., asesor senior).

### Lo que se mantiene

- Regla "diseña → prueba → corrige → repite".
- Simulación 1 semana tras MVP.
- Decisiones post-simulación.
- FASES 31-33 después.

### Lo que se simplifica (paradójicamente)

- **Lead scoring** se vuelve aún más innecesario en MVP: la priorización viene del workflow (factura recibida hoy >> llamada antigua).
- **Cadencias automáticas** también: el handoff genera la siguiente acción de forma natural.
- El **dashboard supervisor** para Juan se reduce a "ver embudo end-to-end" — útil pero no urgente.

### Lo que se complica

- **Filtrado y permisos por rol** desde día 1: cada user solo ve lo suyo.
- **RLS granular** se vuelve casi necesaria para que cada user solo vea sus oportunidades activas (aunque con `WHERE responsable_actual_id = auth.uid()` en queries puede bastar mientras tanto).

---

## 11. Frase guía actualizada

> *El CRM tiene que reflejar cómo Valere realmente vende: 4 personas con roles distintos pasándose el lead unas a otras. Si el CRM no modela los handoffs, no sirve.*

---

## 12. Próximos pasos concretos

### Paralelo (Juan / Code en PowerShell)

1. Cerrar TSC sprint Potencias (2.5h).
2. Validar wizard contacto decisor — pero **revisándolo a la luz del flujo real**: ¿quién crea contactos? ¿solo Carolina Aroca? ¿Maciñeiras también?
3. Responder las 10 preguntas de la sección 9 (al menos 1, 4, 8).

### Cowork próxima sesión

Asumiendo respuestas a esas 3 preguntas:

1. Aplicar Schema MVP v2 vía MCP (1 día).
2. Empezar UI Carolina Aroca (1-2 días vía subagentes paralelos).

Si las preguntas no están resueltas: avanzar Schema con valores razonables por defecto + dejar marcador `// TODO Juan` en código.

— Cowork, 1 mayo 2026.
