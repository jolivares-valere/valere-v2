# PROPUESTA DE TROCEO — MÓDULO DE INGRESOS (para aprobación de Juan + auditor)
Fecha: 2026-07-22 · Autor: Cowork · Insumo: 3 especs validadas en Drive (ENTREGABLES JUNIO)
ESTADO: ✅ APROBADO por auditor (22-jul) con 3 notas — y preaprobado en estructura
por Juan (detalle pendiente de su lectura). Nada arranca hasta cerrar el mes
(salvo A1 si cabe en semana 4). Migraciones siempre en repo; escrituras con OK.

NOTAS DEL AUDITOR (vinculantes):
1. C1: las transiciones esperada→retrasada→impagada se calculan ON-LOAD en fase 1
   (sin job nocturno; el cron llega en fase 2 si hace falta).
2. El orden C antes que D (o al revés) LO DECIDE JUAN — sin dependencia técnica.
3. B1 REQUIERE el campo "producto" de A1 conectado a las condiciones del catálogo
   (la retro se calcula sobre la condición vigente por producto) → A1 es prerequisito
   duro de B1, no solo orden recomendado.

## Lectura hecha
1. ESPEC PR — Cierre automático de contrato anterior + Retrocomisiones · v1
2. ANEXO — Conciliación de liquidaciones y control de cobro · v1
3. ANEXO 2 — Cuotas de servicios e ingresos directos de cliente · v1
Motor común de los tres: EXPECTATIVA generada por el sistema + CASADO + SEMÁFORO.
Caso origen: alta real NAGINI 90508 (JIMENEZ ROSALES, SILVER→NAGINI, CUPS …AQ0F).

## Troceo propuesto (7 PRs pequeños y paseables)

### PR-A1 — Cierre automático del contrato anterior + 5 fricciones del paseo
[SEMANA 4 SI CABE, o primer PR post-mes — único autorizado a arrancar tras el mes]
- Asistente paso 4: si el CUPS tiene contrato activo → aviso "se cerrará {COMERC}
  con fecha fin X−1 y su renovación pasará a perdido", casilla marcada desmarcable.
- Al crear: viejo→'baja' + fecha_fin=X−1; renovación vieja→'perdido' + nota
  "sustituido por contrato {COMERC_NUEVA} {numero}". Nuevo nace 'tramite'.
- Casos raros SIN cierre automático + incidencia: inicio nuevo < inicio viejo;
  >1 contrato activo en el CUPS (legacy).
- Fricciones del paseo (mismo PR): botón "← Anterior" visible en paso 4 + chips de
  pasos clicables hacia atrás · fix clic perdido tras seleccionar empresa (re-render)
  · campo "producto" en paso 3 (ej. NG FIJO TRIAL 15 v2601; conecta con condiciones
  por producto del catálogo) · etiquetas consistentes ("NAGINI (vía Zoco)" en todos
  los selectores o en ninguno) · "Crear venta completa" deshabilitado al primer clic
  (freeze ~30s = caso #5 del expediente PR-4.3).
- Sin esquema nuevo. CA de paseo: repetir el caso 90508 → el SILVER viejo queda baja
  con fin 20/07/2026 y su renovación 'perdido' trazada; los 5 tropiezos de Julia, muertos.
- Estimación: 1 sesión (~300 líneas) + paseo.

### PR-B1 — Retrocomisiones: esquema + apunte esperado
- Migración: comercializadora_condiciones + retro_aplica · retro_ventana_meses (12) ·
  retro_tipo (proporcional|total|sin_retro) · retro_notas.
- Migración: tabla apuntes_comision (id, contrato_id, comercializadora_condicion_id,
  tipo comision|retro, importe_esperado, importe_real, estado devengada|cobrada|
  retro_esperada|retro_aplicada|retro_no_aplicada, fecha_devengo, fecha_liquidacion,
  notas). RLS patrón catálogo (leer staff, escribir admin/master).
- Lógica en el cierre (PR-A1): contrato fijo con vida < ventana → apunte
  'retro_esperada' (proporcional o total según condición) + apunte 'devengada' de la
  comisión nueva + NETO del cambio mostrado en el aviso del asistente.
- Seed retro_* de las condiciones actuales: ¿Juan dicta qué comercializadoras aplican
  retro y de qué tipo? (pendiente de dictado, como las REGLAS v2).
- CA: caso simulado mes 9 de 12 → retro proporcional 3/12; caso 90508 real (17 meses)
  → sin retro. Estimación: 1 sesión + paseo.

### PR-C1 — Liquidaciones: esquema + generador de esperadas
- Migración: tabla liquidaciones (comercializadora_id, via, periodo, fecha_esperada,
  fecha_recepcion, importe_declarado, documento_id, estado esperada|recibida|casada|
  con_diferencias|retrasada|impagada, notas).
- Generador de expectativas por cadencia de comercializadora_condiciones (one-shot/
  mensual/trimestral); vía Zoco: esperar el NETO (−10%) antes del casado.
- Transiciones esperada→retrasada (+15d config) →impagada (+90d config): job nocturno
  (patrón cron datadis) o cálculo al cargar vista — decidir en diseño.
- Estimación: 1 sesión + cuadre auditor de las esperadas generadas vs realidad.

### PR-C2 — Casado manual + documento de liquidación
- UI administración: registrar liquidación recibida, casar línea a línea contra
  apuntes_comision (cobrada / sigue devengada / no esperada→alta manual o retro
  → retro_aplicada / con_diferencias + nota).
- Subida del PDF/excel de liquidación (mecánica PR-3.3). ⚠ Requiere ampliar el CHECK
  documentos.entidad_tipo (hoy: empresa|contrato|oportunidad|contacto|expediente|
  general) con 'liquidacion' — migración en este PR.
- Estimación: 1-1,5 sesiones + paseo con una liquidación real de Zoco.

### PR-C3 — Semáforo de cobro (vistas administración)
- a) semáforo por comercializadora/vía (al día · retrasada+días · impagada+importe,
  orden importe desc) · b) pendiente por contrato (devengadas con antigüedad) ·
  c) diferencias abiertas · d) retros esperadas vs aplicadas.
- CA = preguntas de gate del anexo (<30s): "¿cuánto nos deben TOTAL?" · "¿qué
  liquidaciones faltan este mes?" · "¿qué comisiones llevan +60 días sin pagar?".
- Estimación: 1 sesión + gate ante Juan (mismo formato V2).

### PR-D1 — Cuotas de cliente: esquema + esperados
- Migración: servicios_contratados (empresa_id, cups/contrato opcional, tipo_servicio
  catálogo abierto, importe, periodicidad unica|mensual|trimestral|anual, fechas,
  forma_cobro, documento_id, notas) + cobros_cliente (servicio_id, empresa_id,
  periodo, importe_esperado, fecha_esperada, fecha_cobro_real, importe_real, estado
  esperada|cobrada|retrasada|impagada|condonada).
- Generador por periodicidad + transiciones (mismo motor C1). CHECK entidad_tipo
  += 'servicio'. Alta de acuerdo desde ficha empresa.
- CA del caso dictado: cliente con 3 mensualidades impagadas = 3 cuotas en rojo en
  su ficha. Estimación: 1 sesión.

### PR-D2 — Semáforo de deuda de clientes + ficha 360º + previsión
- Lista "quién nos debe" (importe vencido, antigüedad, orden desc) · bloque
  "Servicios y cobros" en ficha empresa · previsión de ingresos directos del mes.
- CA (<30s): "¿qué clientes nos deben cuotas y cuánto?" · "¿cuánto facturamos en
  igualas este mes?" · "¿quién lleva 2+ cuotas sin pagar?". Estimación: 1 sesión.

## Orden propuesto y por qué
DECIDIDO POR JUAN (22-jul): D ANTES QUE C → A1 → B1 → D1 → D2 → C1 → C2 → C3
(~7 sesiones + paseos). Razonado: la morosidad de cuotas de clientes es sangría
directa y D estrena el motor expectativa+casado+semáforo en el caso más simple
(pagador=cliente, sin vía ni retenciones) antes de aplicarlo a liquidaciones.
[Propuesta original: A1 → B1 → C1 → C2 → C3 → D1 → D2.]
- A1 primero: invariante de datos + mata las fricciones vivas del gate de hoy.
- B1 antes que liquidaciones: sin apuntes esperados no hay nada que casar.
- C antes que D (decisión de negocio a confirmar): las liquidaciones de
  comercializadoras mueven más importe; D reutiliza el motor ya construido en C.
  Si Juan prefiere atacar antes la morosidad de clientes, D1+D2 pueden adelantarse
  a C2+C3 sin coste técnico (solo comparten patrón, no dependencias).
- FUERA de este troceo (fase 2 explícita en las especs): OCR/importación asistida de
  liquidaciones · sincronización Holded · reparto interno comercial/jefe (F4 red).

## Dictados pendientes de Juan antes de B1/C1
1. retro_* por comercializadora (¿quiénes aplican retro, tipo, ventana?).
2. Márgenes de retraso/impago (15/90 días propuestos en la espec — ¿confirmas?).
3. Día del periodo en que se espera cada liquidación (ej. Zoco: ¿día 10 del mes
   siguiente?) — necesario para fecha_esperada honesta.

## Compromisos
- Nada de esto arranca hasta cerrar el mes CRM ÚTIL (gate V3 + semana 4), salvo A1
  si cabe en semana 4. Cada PR con DoD completo: tsc + tests + doc RAG + paseo.
- Todo esquema por migración en repo. Escrituras en producción solo con OK de Juan.
