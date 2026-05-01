# Release 1 — Cabina de captación Carolina · plan ejecutable (1 mayo 2026)

> Tras la segunda crítica de ChatGPT al plan de captación profesional, este documento aterriza el **Release 1 mínimo viable**: 10-11 días, sin Gmail API automático, sin CTI, sin SIPS como pilar único, con compliance correcto desde día 1 y motivos de pérdida obligatorios.

---

## 1. Errores corregidos del plan anterior

ChatGPT hizo 4 correcciones acertadas que hago propias:

1. **SIPS tratado con ligereza.** El acceso programático a SIPS está regulado por CNMC y requiere acuerdos. No es "endpoint público gratuito". Datadis (que ya tenemos) sigue siendo el camino válido con consentimiento del titular. Los datos de SIPS se obtienen de forma indirecta vía eInforma/Axesor o pidiéndole al cliente la web de su distribuidora con sus credenciales. **Por tanto, SIPS deja de ser pilar y pasa a "modo opcional"**.

2. **Compliance ligero.** "Interés legítimo" no es carta blanca. Necesitamos desde día 1: base legal documentada, texto información inicial, mecanismo oposición, trazabilidad origen, retención.

3. **Sprint sobredimensionado mezclando cosas.** Mejor 3 releases que 1 sprint de 18-20 días.

4. **Motivos de pérdida obligatorios** — pieza clave que faltaba. En 60 días esta data te dice dónde está el cuello de botella real (¿es el lead frío? ¿es la propuesta? ¿es el precio? ¿es el sector?).

Y 4 decisiones tácticas que también acepto:

- **No Aircall/Ringover en R1**: botón `tel:` y copia teléfono. Medir 2 semanas antes de comprar CTI.
- **No Gmail API auto en R1**: el CRM genera el email, Carolina revisa y lo envía manualmente desde Gmail. Mejor para iterar tono.
- **No tracking pixel en R1**: complejidad legal supera valor. Medir respuestas reales (¿pidió reunión? ¿mandó factura?).
- **Lead scoring ultra-simple**: HOT/WARM/COLD por reglas, no fórmula multiplicativa con weights inventados.

---

## 2. Lo que Release 1 SÍ incluye (lista cerrada)

```
✓ Pantalla /captacion (lista priorizada por reglas simples)
✓ Ficha de llamada activa (sin CTI, con tel: link)
✓ Outcome 1-clic con motivos pérdida estructurados
✓ Próxima acción auto sugerida (NO ejecutada — Carolina confirma)
✓ Alta empresa+contacto+oportunidad desde 1 pantalla
✓ Generación email plantilla (copiar al portapapeles, NO envío auto)
✓ PDF diagnóstico simple basado en CUPS + sector + tarifa declarada
✓ Compliance LOPDGDD: texto inicial + opt-out + base legal + retención
✓ Dashboard mínimo Carolina + supervisor (Juan)
✓ Schema motivos de pérdida con análisis a 60 días
```

## 3. Lo que Release 1 NO incluye (explícitamente diferido)

```
✗ Gmail API send / sync (Release 3)
✗ Google Calendar create event (Release 3)
✗ Google Drive espejo PDFs (Release 3)
✗ Aircall/Ringover CTI (Release 3, condicional volumen)
✗ SIPS lookup automático (Release 2, depende acuerdo regulatorio)
✗ Cadencia automática (Release 3)
✗ Tracking apertura emails (Release 3)
✗ Lead scoring matemático (Release 3)
✗ Lista Robinson sincronización API (Release 2 — ahora lista manual)
✗ OMIE diario (Release 2)
✗ Heurísticas sectoriales avanzadas (Release 2)
✗ Generador propuesta avanzada (FASE 42, posterior)
```

---

## 4. Schema mínimo Release 1

Sólo 4 cambios sobre lo que ya hay:

```sql
-- 1. Origen del lead — para análisis canal
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS origen_canal text
    CHECK (origen_canal IN (
      'telemarketing','comercial','cartera','referido',
      'einforma','axesor','web','feria','partner','otro'
    ));

CREATE INDEX IF NOT EXISTS idx_empresas_origen_canal
  ON public.empresas(origen_canal) WHERE deleted_at IS NULL;

-- 2. Flag no llamar (compliance) + lista interna exclusión
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS no_llamar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_llamar_motivo text,
  ADD COLUMN IF NOT EXISTS no_llamar_fecha timestamptz;

-- 3. Motivos de pérdida estructurados (catálogo cerrado)
DO $$ BEGIN
  CREATE TYPE public.motivo_perdida AS ENUM (
    'no_contesta',
    'buzon_repetido',
    'numero_erroneo',
    'no_es_decisor',
    'decisor_no_disponible',
    'ya_tiene_consultor',
    'acaba_de_renovar',
    'satisfecho_comercializadora',
    'no_quiere_mover',
    'no_envia_factura',
    'no_autoriza_datadis',
    'precio_insuficiente',
    'contrato_con_penalizacion',
    'empresa_fuera_perfil',
    'insolvente',
    'cierre_empresa',
    'lista_robinson',
    'rgpd_eliminacion',
    'sector_excluido',
    'geografia_excluida',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS motivo_perdida_codigo public.motivo_perdida_enum,
  ADD COLUMN IF NOT EXISTS motivo_perdida_detalle text;

-- DECISIÓN FINAL (validada ChatGPT 1 mayo noche): la obligatoriedad de
-- motivo_perdida_codigo al cerrar como cerrada_perdida se gestiona en UI/backend,
-- NO con trigger BD. La BD solo define el ENUM, las columnas y la vista de análisis.
-- Razón: para MVP, evitar lógica SQL prematura. Simplifica debug y permite UX
-- guiada (mostrar dropdown obligatorio en el momento del cierre).
-- Aplicado en: supabase/migrations/20260501_mvp_captacion_fixes_post_audit_chatgpt.sql

-- 4. Auditoría consentimiento contacto comercial (LOPDGDD)
CREATE TABLE IF NOT EXISTS public.auditoria_contacto_comercial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  contacto_id uuid REFERENCES public.contactos(id) ON DELETE SET NULL,
  evento text NOT NULL CHECK (evento IN (
    'primer_contacto_informado',
    'oposicion_recibida',
    'baja_lopd',
    'rgpd_eliminacion',
    'reactivacion_consentimiento'
  )),
  canal text CHECK (canal IN ('telefono','email','whatsapp','linkedin','presencial','otro')),
  texto_informado text,
  registrado_por uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ip_origen text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_contacto_empresa
  ON public.auditoria_contacto_comercial(empresa_id, created_at DESC);

COMMENT ON TABLE public.auditoria_contacto_comercial IS
  'Trazabilidad LOPDGDD/GDPR de contactos comerciales con leads. Se rellena automáticamente desde la pantalla /captacion en cada outcome relevante.';
```

**Total cambios schema: 1 ENUM + 4 columnas en `empresas` + 2 columnas en `oportunidades` + 1 trigger + 1 tabla nueva.** Migración trivial, sin riesgo.

---

## 5. Pantalla `/captacion` Release 1 — wireframe definitivo

### 5.1 Vista lista (mañana de Carolina)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CAPTACIÓN · 47 leads activos · 8 propuestas en seguimiento              │
│  [Buscar empresa o CUPS...]  [+ Nuevo lead]  [↑ Importar]   Carolina A.▾ │
├──────────────────────────────────────────────────────────────────────────┤
│  TIPO   ESTADO        EMPRESA                  TELÉFONO     PRÓXIMA      │
├──────────────────────────────────────────────────────────────────────────┤
│  🔥HOT  Sin contactar Industria Textil ABC SL  91 555 0001  ahora        │
│  🔥HOT  Sin contactar Hostal del Pino SL       91 555 0002  ahora        │
│  🌡WAR  Esperando f.  Talleres Méndez SL       91 555 0003  +2d          │
│  🌡WAR  Propuesta env.Comercial Pérez SA       91 555 0004  +3d          │
│  ❄ COL  Sin contactar Pequeño Comercio SL      91 555 0005  ahora        │
│  ...                                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  CALLBACKS HOY (3)                                                        │
│  11:30 — Comercial Pérez SA · 2ª llamada                                 │
│  16:00 — Restaurante El Pino · decisión final                            │
│  17:30 — Industria Sello SL · fecha pactada                              │
└──────────────────────────────────────────────────────────────────────────┘
```

**Reglas de priorización Release 1 (sin matemática, solo reglas):**

```
HOT 🔥  empresa con CUPS conocido + sector intensivo (industria/hostelería) +
        tarifa 3.0TD/6.x + telefono o email válido + sin contactar últimos 7 días
WARM 🌡  empresa con contacto previo o follow-up programado o lead enviado
        propuesta + sin respuesta en cadencia
COLD ❄  resto (datos incompletos, sector poco intensivo, contactos viejos)
```

Sin fórmula, sin pesos. Solo SQL clasificación. Cuando haya 6 meses de datos históricos, se sustituye por scoring calculado.

### 5.2 Vista llamada activa

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📞 Industria Textil ABC SL · 91 555 0001     [✆ Marcar (tel:)]  ⏱ —    │
├────────────────────────────────────┬─────────────────────────────────────┤
│  DATOS                             │  GUIÓN APERTURA                     │
│                                    │                                      │
│  CUPS         (sin asignar)        │  "Hola, soy Carolina de Valere      │
│  CIF          B-XXXXXXXX           │   Consultores. Le llamo porque..."  │
│  Sector       Textil (CNAE 1310)   │                                      │
│  Empleados    ~25 (estimado)       │  ▶ AVISO LOPDGDD obligatorio        │
│  Origen lead  eInforma             │  "Sus datos profesionales nos       │
│                                    │   constan a través de [origen].     │
│  Estimación pago anual ~€38k-50k   │   Si prefiere no recibir más        │
│  Estimación ahorro     ~€2k-4k     │   comunicaciones, dígalo y le       │
│                                    │   excluimos. ¿Tiene 5 minutos?"     │
│  Contactado  primera vez           │                                      │
│  Notas hist. —                     │  OBJECIÓN: "Ya tengo consultor"     │
│                                    │  → "Le mando un análisis            │
│                                    │   comparativo gratuito en 30 seg"   │
├────────────────────────────────────┴─────────────────────────────────────┤
│  OUTCOME (obligatorio antes de cerrar):                                  │
│                                                                           │
│  [✓ Contactado interesado]  [✓ Buzón]   [✓ Llamada perdida]              │
│  [✓ Reunión agendada]       [✓ Propuesta enviada]                        │
│  [✗ No interesado]          [✗ Lista Robinson]                           │
│                                                                           │
│  Si NO interesado, motivo (obligatorio):                                  │
│  [Ya tiene consultor ▼]                                                   │
│                                                                           │
│  NOTAS                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ Habló con María, jefa compras. Ya tienen consultor pero...     │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  PRÓXIMA ACCIÓN  ☑ Email plantilla diagnóstico (copiar al portapapeles)  │
│                  ☑ Programar callback +3 días                             │
│                  ☐ Cerrar oportunidad                                     │
│                                                                           │
│           [Guardar y siguiente llamada ⏎]                                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Atajos teclado obligatorios:**
- `Esc` cerrar sin guardar (con confirmación si hay cambios).
- `Ctrl+Enter` guardar y siguiente.
- `1`-`7` botones outcome rápidos.
- `Ctrl+E` copiar email plantilla al portapapeles.
- `Ctrl+L` marcar Lista Robinson interna.

---

## 6. Catálogo de motivos de pérdida — versión profesional sector

20 valores estructurados. Los reagrupo en 4 familias para análisis:

### Familia A — Problema de contacto (no llegamos al decisor)
1. `no_contesta` — sin respuesta tras N intentos.
2. `buzon_repetido` — siempre buzón.
3. `numero_erroneo` — empresa cerrada, número mal.
4. `no_es_decisor` — habló con persona sin capacidad decisión.
5. `decisor_no_disponible` — decisor identificado pero no devuelve llamada.

### Familia B — Cliente con estatus comercial (compite)
6. `ya_tiene_consultor` — trabajaba con otra consultora.
7. `acaba_de_renovar` — contrato firmado recientemente.
8. `satisfecho_comercializadora` — sin dolor percibido.
9. `no_quiere_mover` — perfil conservador, fobia al cambio.

### Familia C — Bloqueo en el funnel (no avanza)
10. `no_envia_factura` — pidió, no envió.
11. `no_autoriza_datadis` — no firmó autorización.
12. `precio_insuficiente` — no le convence nuestra propuesta.
13. `contrato_con_penalizacion` — vinculado por cláusulas.

### Familia D — Fuera de perfil / razones externas
14. `empresa_fuera_perfil` — pequeña, sin potencial ahorro.
15. `insolvente` — no paga / impagados.
16. `cierre_empresa` — concurso / liquidación.
17. `lista_robinson` — registrado en Lista Robinson ADIGITAL.
18. `rgpd_eliminacion` — pidió derecho al olvido.
19. `sector_excluido` — política interna Valere (ej: porno, armas).
20. `geografia_excluida` — fuera de área cobertura.

### Análisis a 60 días (se construye solo)

```
Vista materializada `analisis_motivos_perdida_60d`:

  Familia                Total  %    Diagnóstico
  ─────────────────────  ─────  ──   ──────────────────────────────────
  A — Contacto              82  41%  cuello = falta acceso decisor
  B — Estatus               41  21%  cuello = competencia / timing
  C — Funnel                52  26%  cuello = nuestra propuesta o fricción
  D — Fuera perfil          25  12%  cuello = mala lista de leads
                          ─────
  Total                    200
```

**Acciones distintas según familia dominante:**

- **A dominante** → mejorar lista (eInforma con datos decisor) + script para preguntar por decisor + multi-touch.
- **B dominante** → segmentar por timing de contrato + cadencia "vuelvo en 6 meses cuando se acerque renovación".
- **C dominante** → revisar propuesta (precio, comparativa, pitch). Aquí está el dolor producto.
- **D dominante** → cambiar fuente leads / cualificar antes (filtros pre-llamada).

**Esta es la pieza que ChatGPT identificó y yo no había planteado. Vale más que 5 dashboards bonitos.**

---

## 7. Compliance Release 1 — texto modelo

### 7.1 Aviso LOPDGDD primer contacto telefónico (Carolina lo dice)

> *"Buenos días, soy Carolina Aroca de Valere Consultores. Le contactamos en su rol profesional como [cargo] de [empresa]. Hemos accedido a sus datos a través de [fuente: eInforma / referido / búsqueda profesional]. Si prefiere no recibir más comunicaciones, indíquemelo en cualquier momento y le excluiremos de nuestras comunicaciones futuras. ¿Tiene 5 minutos?"*

Si el lead dice que no o pide baja → registrar en `auditoria_contacto_comercial` con evento `oposicion_recibida` y poner flag `empresas.no_llamar=true`. Trigger SQL evita futuras llamadas.

### 7.2 Footer email obligatorio

```
─────────────────────────────────────────────────
Valere Consultores SL · CIF B-XXXXXXXX
[Dirección postal completa]
www.valereconsultores.com · 91 XXX XX XX

Sus datos profesionales se tratan bajo interés legítimo (art. 19 LOPDGDD)
para finalidades comerciales relacionadas con su rol profesional.
Para no recibir más comunicaciones, responda con asunto BAJA o escriba a
privacidad@valereconsultores.com. Sus datos se conservarán 1 año desde el
último contacto y luego serán eliminados o anonimizados.
─────────────────────────────────────────────────
```

### 7.3 Tabla `auditoria_contacto_comercial` — qué se registra cuándo

| Evento de Carolina | Evento auditoria | Campos |
|---|---|---|
| Outcome "Contactado" en 1ª llamada | `primer_contacto_informado` | canal=`telefono`, texto_informado=aviso LOPD |
| Cliente dice "bájame" en llamada | `oposicion_recibida` | canal=`telefono`, registrado_por=Carolina |
| Cliente responde email "BAJA" | `baja_lopd` | canal=`email` |
| Cliente envía email RGPD eliminación | `rgpd_eliminacion` | canal=`email` |
| Cliente reactiva consentimiento | `reactivacion_consentimiento` | canal=lo que sea |

### 7.4 Lista interna exclusión

Tabla `empresas` con flag `no_llamar=true`. Se respeta como filtro automático en pantalla `/captacion` (no aparecen). NO se llaman, NO se mailean.

Al exportar listas o crear cadencias, este flag es absoluto.

### 7.5 Lista Robinson en Release 1

**No automatizamos sincronización con ADIGITAL en R1.** En su lugar:

- Botón en cada empresa "Marcar Lista Robinson" → flag `no_llamar=true`, motivo `lista_robinson`.
- Carolina, antes de empezar campaña con lote nuevo, debe consultar manualmente la web de ADIGITAL (o pedir cotejo si suscritos).
- En R2 se evalúa suscripción y sincronización.

---

## 8. Plantilla email diagnóstico Release 1 (Gmail draft, no auto)

El CRM genera el texto. Carolina pulsa "Copiar al portapapeles" o "Abrir como draft Gmail" (link `mailto:`). **NO se envía automáticamente.**

```
Para: maria.compras@industriatextilabc.es
Asunto: Diagnóstico energético inicial — Industria Textil ABC

Hola María,

Como acabamos de hablar por teléfono, le mando el diagnóstico inicial
de su suministro eléctrico:

  Tarifa actual estimada    3.0TD
  Estimación pago anual     €38.000-50.000 (rango)
  Posible ahorro anual      €2.000-4.000 (preliminar)
  Periodo análisis          datos sectoriales empresas similares

⚠️ Esta es una estimación preliminar no vinculante basada en datos
    públicos y promedios sectoriales. Para validar el ahorro real con
    sus propios datos necesitamos:

    1. Una factura reciente, o
    2. Su autorización para acceder a Datadis (la plataforma del
       Ministerio para la Transición Ecológica que recoge sus
       consumos horarios).

Le adjunto el documento PDF con el detalle.

¿Podemos reservar 15 minutos esta semana o la próxima?

Un saludo,
Carolina Aroca
Valere Consultores · 91 XXX XX XX
www.valereconsultores.com

[footer LOPDGDD]
```

**Lenguaje prudente** (siguiendo recomendación ChatGPT): rangos no cifras puntuales, "estimación preliminar no vinculante", referencia a datos públicos.

### Mecánica Release 1 (sin Gmail API)

Botón "Copiar email + abrir Gmail" en pantalla `/captacion`:

1. Click → genera texto con plantilla rellenada.
2. Copia al portapapeles automáticamente.
3. Abre `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=email&su=asunto&body=...` en nueva pestaña.
4. Carolina ve el draft en su Gmail con todo prerellenado, **revisa y envía**.

Esto requiere 0 setup técnico Workspace. Funciona desde día 1.

---

## 9. PDF diagnóstico Release 1 — diseño con disclaimers

### Estructura una página A4

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO VALERE]                              Diagnóstico Energético   │
│                                                  Inicial Preliminar   │
│                                                                       │
│  Empresa:  Industria Textil ABC SL                                   │
│  CIF:      B-XXXXXXXX                                                 │
│  Fecha:    1 mayo 2026                                                │
│  Realizado por:  Carolina Aroca, Valere Consultores                  │
│                                                                       │
│  ────────────────────────────────────────────────────────────────    │
│                                                                       │
│  1. Datos del suministro (declarados/estimados)                      │
│                                                                       │
│     Tarifa de acceso estimada    3.0TD                               │
│     Sector (CNAE)                1310 — Industria Textil             │
│     Tamaño aproximado            25 empleados                         │
│     CUPS                         (pendiente confirmación)             │
│                                                                       │
│  2. Estimación de pago anual                                          │
│                                                                       │
│     Rango estimado:              €38.000 - €50.000 / año             │
│     Base de cálculo:             empresas similares mismo sector,    │
│                                  mismo tamaño, mismo perfil tarifario│
│                                                                       │
│  3. Oportunidad de ahorro identificada                                │
│                                                                       │
│     Rango preliminar:            €2.000 - €4.000 / año               │
│                                  (5-10% del pago anual)               │
│     Líneas de mejora habituales:                                      │
│       - Negociación de mejor precio energía y potencia                │
│       - Optimización de potencia contratada (P1-P6)                   │
│       - Detección de penalización por reactiva                        │
│                                                                       │
│  4. Próximos pasos recomendados                                       │
│                                                                       │
│     Para confirmar el ahorro real con sus datos concretos:           │
│       □ Aportar una factura reciente, o                               │
│       □ Autorizar acceso a Datadis (5 minutos)                        │
│                                                                       │
│  ────────────────────────────────────────────────────────────────    │
│                                                                       │
│  ⚠ AVISO IMPORTANTE                                                  │
│                                                                       │
│  Este diagnóstico es PRELIMINAR Y NO VINCULANTE. Los rangos          │
│  expresados son estimaciones basadas en datos públicos y promedios   │
│  sectoriales. NO constituyen una propuesta de servicio ni una        │
│  oferta económica concreta. Para una propuesta vinculante con cifras │
│  exactas se necesita acceder a los datos reales de consumo del       │
│  cliente vía factura o Datadis.                                      │
│                                                                       │
│  Valere Consultores SL · CIF B-XXXXXXXX                              │
│  www.valereconsultores.com · privacidad@valereconsultores.com        │
└──────────────────────────────────────────────────────────────────────┘
```

**Generador**: utilidad existente `src/core/pdf/` (la que ya genera autorización Datadis). Nueva plantilla `diagnostico-preliminar-pdf.tsx`.

---

## 10. Dimensionamiento día a día Release 1

| Día | Bloque | Tarea | Entregable |
|---|---|---|---|
| 1 | Schema | Migration motivos_perdida + origen_canal + auditoria_contacto + no_llamar | SQL aplicado en prod + espejo en repo |
| 2 | UI tabla | Pantalla `/captacion` lista priorizada con clasificación HOT/WARM/COLD por SQL | Ruta /captacion accesible |
| 3 | UI tabla | Búsqueda + filtros + atajos teclado | Carolina puede navegar lista con teclado |
| 4 | UI ficha | Pantalla llamada activa, datos lateral izq, guion lateral der | Vista detalle funcional |
| 5 | UI ficha | Panel outcomes + motivos pérdida desplegable + notas | Workflow llamada cerrable en 10s |
| 6 | UI alta | Wizard "+ Nuevo lead" con empresa + contacto + oportunidad en 1 form | Carolina puede crear lead nuevo en 1 minuto |
| 7 | PDF | Generador `diagnostico-preliminar-pdf.tsx` + integración utilidades existentes | Click "Generar PDF" funciona |
| 8 | Email | Plantillas + botón "Copiar al portapapeles + Abrir Gmail" | Email se abre en Gmail con todo |
| 9 | Compliance | Auditoría contacto comercial + flag no_llamar + lista exclusión interna | Trazabilidad LOPDGDD funcionando |
| 10 | Dashboard | KPIs Carolina personal + agregado supervisor (Juan) | 2 dashboards diferenciados |
| 11 | QA + ajustes | Sesión iterativa Carolina + bugfixes | Carolina valida antes de producción |

**Total: 11 días** (de 18-20 a 11). Realista para 1 dev parcial + Juan.

### Hitos de validación

- **Día 5**: prototipo funcional, Carolina puede registrar 1 llamada falsa de prueba.
- **Día 8**: Carolina puede hacer 5 llamadas reales con plantilla email saliendo de Gmail draft.
- **Día 11**: rollout, Carolina trabaja con CRM como herramienta principal.

---

## 11. KPIs Release 1 (mínimos, no vanity)

### Dashboard Carolina (vista personal cada mañana)

```
HOY
  Llamadas con outcome registrado:        12 / 60 objetivo
  Conversaciones útiles (= no buzón):       4
  Propuestas (PDF + email enviado):         2
  Tiempo medio cierre llamada:           0:43

ESTA SEMANA
  Llamadas:           67   (objetivo 300)
  Conversaciones:     22
  Propuestas:          9
  Cierres:             1
```

### Dashboard supervisor (Juan)

```
EQUIPO ÚLTIMO MES
  Carolina:    280 llamadas · 14 propuestas · 2 cierres

EMBUDO
  Llamadas → Conversaciones      30%
  Conversaciones → Cualificados  25%
  Cualificados → Propuestas      80%
  Propuestas → Cierres           14%
  Llamadas → Cierres totales     0.7%

DIAGNÓSTICO MOTIVOS PÉRDIDA (60 días, viene a partir del día 30)
  Familia A (Contacto):          41%
  Familia B (Estatus):           21%
  Familia C (Funnel):            26%
  Familia D (Fuera perfil):      12%

ORIGEN DE LEADS GANADOS
  eInforma:        2 (€8k facturación nueva)
  Referido:        0
  Web:             0
```

**Sin tracking minuto a minuto. Sin vigilancia agresiva.** Output, no input.

---

## 12. Criterios de éxito Release 1 → trigger Release 2

Release 1 es exitoso si tras 30 días en producción:

| Métrica | Threshold | Acción si NO se alcanza |
|---|---|---|
| % llamadas Carolina registradas en CRM | ≥ 80% | revisar fricción UI, NO Release 2 |
| Tiempo medio llamada → propuesta | ≤ 24h | revisar cuello (PDF, plantilla?), NO R2 |
| Llamadas/día promedio | ≥ 40 | rollback parcial, NO R2 |
| Motivos de pérdida estructurados | ≥ 90% (vs "otro") | revisar catálogo, NO R2 |
| Carolina prefiere CRM a Excel anterior | sí (cualitativo) | iterar, NO R2 |

Si estos 5 KPIs se cumplen, **arrancar Release 2** (SIPS opcional + heurísticas + OMIE básico).

Si no, iterar Release 1 hasta cumplirlos. **No avanzar al siguiente nivel de complejidad sin haber capturado el proceso real.**

---

## 13. Decisiones que necesito de Juan para arrancar mañana mismo

Reducidas a 4 (las otras 3 son posteriores):

1. **Origen leads actual de Carolina**: ¿lista comprada eInforma/Axesor, Excel heredado, búsqueda manual? **Necesario para configurar `origen_canal`**.
2. **¿Tienes el CIF, dirección y datos legales completos de Valere Consultores SL?** Para footer LOPDGDD del email/PDF.
3. **¿Existe `privacidad@valereconsultores.com` o equivalente?** Para canal de bajas LOPD.
4. **¿Carolina hace estas 11 días seguidos a tiempo completo o parcial mientras sigue llamando?** Decide si Release 1 es 11 días calendario o 22 días con dedicación 50%.

Con estas 4 puedo arrancar `apply_migration` del schema y subagentes UI mañana.

---

## 14. Cierre

ChatGPT tiene razón en lo importante. Mi plan original era una mini-plataforma SDR; lo que necesita Carolina es **una cabina simple que reduzca el ciclo llamada→propuesta a <24h** y empiece a capturar el proceso real para informar Releases 2 y 3.

La frase guía de ChatGPT que adopto:

> "No construir un call center; construir una máquina para que Carolina mande mejores propuestas más rápido."

Release 1 hace exactamente eso, en 11 días, sin tecnología cara, con compliance correcto desde día 1, y con la pieza que faltaba (motivos de pérdida estructurados) que en 60 días dirá dónde está el cuello de botella real del negocio.

— Cowork, 1 mayo 2026.
