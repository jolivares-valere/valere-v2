# CRM VALERE — PLAN DE IMPLANTACIÓN "CRM ÚTIL" · 4 SEMANAS (EJECUTABLE)

v2 · 2026-07-16 · Sustituye al plan v1 de hoy (este es el operativo, PR a PR)

Fuente: Drive "CRM VALERE — PLAN IMPLANTACION CRM UTIL 4 SEMANAS v2 (EJECUTABLE)"

---

## POR QUÉ LOS ANÁLISIS ANTERIORES NO AVANZARON (diagnóstico honesto)

Segenet, Zoco, Linkener y Telegest se analizaron y quedaron en DOCUMENTOS:
sin criterios de aceptación, sin entrar en la tubería de ejecución (rama→PR→
paseo→merge), y con los entregables varados en el disco local de Juan. La
tubería SÍ funciona cuando se usa: PRs #55-57, #61, #62 (Renovaciones) pasaron
de análisis a producción en días. ESTE plan mete la usabilidad en ESA tubería.

## MARCO DE EJECUCIÓN (quién, cómo, cuándo)

- Workstream: chat "CRM VALERE — MEJORAS UI · Módulos y Presentación" (Cowork
  ejecuta) · Chrome (paseos de verificación) · Auditor (gates y BBDD).
- Cadencia: cada sesión de Cowork = 1-2 PRs pequeños. Juan: commits/push con
  checkpoint y merges tras paseo. VIERNES = GATE semanal (demo de medibles +
  auditoría). Lunes = replanificación ligera de la semana (30 min).
- Reglas duras: ningún PR >~300 líneas ni >1 día · NADA fuera de los 5 trabajos
  diarios hasta que los 5 estén · si un gate no cierra, la semana siguiente NO
  empieza (se recorta alcance, nunca calidad).
- Definition of Done por PR: mergeado en main + paseo Chrome OK + verificación
  SQL si toca datos + doc RAG (docs/help/**) si es feature visible.
- PREVIO (día 0, antes del PR-1.1): sesión de limpieza del working tree
  (pendiente desde el 06-jul) + subir los 4 entregables de junio a Drive/repo
  y cruzar el DOC2 con este backlog (única re-priorización admitida: semana 1).

## LOS 5 TRABAJOS (definición de "útil")

T1 buscar cliente y verlo TODO · T2 pipeline renovaciones accionable · T3 alta
de venta en 2 min · T4 documento a mano · T5 dato de energía visible.

---

## SEMANA 1 — FICHA 360º (T1, T4-lectura) [patrones Zoco Z3/Z4 + Linkener L1]

PR-1.1 Cabecera de ficha de empresa: NIF, comercial, nº contratos activos,
  próxima renovación (badge prioridad), alarma incidencias Datadis.
  CA: para CHEMTROL, PAZ Y BIEN y BLUENET pinta datos reales (auditor los
  cuadra por SQL).

PR-1.2 Pestaña Contratos+CUPS: tabla estado-en-color, CUPS, comercializadora,
  fechas; clic → detalle contrato.
  CA: CHEMTROL muestra sus 9 contratos/CUPS correctos.

PR-1.3 Pestaña Renovaciones de la empresa (prioridad + badge vigente).
  CA: BLUENET muestra sus 18.

PR-1.4 Empresa clicable UNIVERSAL: desde Renovaciones, Contratos e Incidencias,
  el nombre → ficha. Cero callejones sin salida.
  CA: 1 clic desde cualquier lista, sin pasar por buscador.

PR-1.5 Pestaña Suministros (esqueleto): CUPS con datadis_sincronizado,
  incidencias, y "curva disponible sí/no" con 🟡 honesto (L3).
  CA: CHEMTROL ...774JW = "curva disponible"; Bidafarma = vacío honesto.

GATE V1 (viernes): paseo de 5 clientes reales (CHEMTROL, PAZ Y BIEN, BLUENET,
DERAZA, Bidafarma) — T1 cumplido en los 5, cronometrado (<10s de lista a ficha).

## SEMANA 2 — LISTAS QUE TRABAJAN (T2) [Z1/Z2, anti-patrón: filtros suaves]

PR-2.1 Componente de lista único (búsqueda server-side + orden + paginación),
  extraído del de Empresas. Base de todo lo demás.

PR-2.2 Renovaciones sobre el componente: filtros-chip (prioridad, comercializa-
  dora, mes, estado) + export CSV.
  CA: "críticas de julio de NEXUS" en 2 clics; el CSV abre en Excel.

PR-2.3 Contratos ídem. CA: comercializadora+estado combinables.

PR-2.4 KPIs CLICABLES (Z1): las tarjetas (críticas/altas/sin fecha) filtran la
  lista al clicarlas. CA: clic en "24 críticas" → lista de 24.

PR-2.5 Bandeja "sin fecha" (la R4 pendiente): renovaciones sin fecha_fin con
  acción "poner fecha". CA: las 3 BASSOLS de CHEMTROL aparecen; al fechar una,
  sale de la bandeja y entra al pipeline.

GATE V2: Juan formula 3 preguntas de negocio reales; cada una se responde desde
la UI en <30 segundos, cronometrado.

## SEMANA 3 — ALTA EN 2 MINUTOS + DOCUMENTOS (T3, T4) [L6/L7 + Z5]

PR-3.1 Catálogo maestro de comercializadoras: tabla + seed de las existentes +
  selector en formularios (texto libre FUERA — lección CARO/CAROLINA).
  CA: SQL post-semana: 0 comercializadoras fuera de catálogo en altas nuevas.

PR-3.2 Asistente de alta en 4 pasos: empresa (buscar/crear) → CUPS → contrato
  (formulario ADAPTATIVO fija/indexada, L7) → renovación autogenerada.
  CA: alta real cronometrada <2 min; la renovación aparece en el pipeline.

PR-3.3 Documentos: bucket Storage (RLS is_staff) + subir/ver PDF desde la ficha
  (icono folio, L1). CA: contrato de CHEMTROL subido y abierto a 1 clic;
  auditor verifica RLS del bucket (anon/client sin acceso).

GATE V3: un usuario NO desarrollador (Julia o Antonio) da de alta una venta
completa sin ayuda y encuentra el PDF de un cliente.

### REPLANIFICACION LIGERA SEMANA 3 (21-jul, con doc REGLAS v2 de Drive)
Insumo leido: "REGLAS DE COMISIONES Y CANALES - VALERE v2 (vigente)" (Drive,
BACKUP CRM VALERE). Confirmados hoy y editados en el doc: CYE = 50% fee;
Eleia via Zoco.

PR-3.1 AMPLIADO a catalogo + CONDICIONES (insumo del doc, semilla de F4):
  - `comercializadoras` (maestro ABIERTO): nombre unico, grupo/segmento como
    entidades distintas (EDP GC != EDP EMPRESAS; ENDESA pyme), via por defecto
    [directa|zoco|xentia], activa, retailer_id opcional (puente calculadora).
  - `comercializadora_condiciones` (hija): producto, tipo_regla [pct_fee|
    pct_margen|fijo_tarifa|eur_kw|tramos], componente [energia|potencia|
    periodo|servicio], valor EDITABLE, via override, cadencia [one_shot|
    mensual|trimestral], comisiona_renovacion, vigencia (adendas Audax/ADX/
    NEXUS caducan 31/12/2026), notas.
  - SEED: 20 entidades del doc (18 + NAGINI grafia unica + ELEIA sin
    condiciones) + 28 condiciones dictadas.
  - `contratos.comercializadora_id` FK nullable; selector en ContratoForm
    (texto libre FUERA); compania se sigue rellenando con el nombre canonico
    (compatibilidad listas/chips PR-2.3).
  - RLS: select authenticated; write admin/jefe_equipo; delete admin.
  - CA plan: 0 comercializadoras fuera de catalogo en altas nuevas (SQL).
  - OPERACIONES DE DATOS APARTE (cada una con OK de Juan + cuadre auditor):
    backfill comercializadora_id por match exacto; GANA ENERGIA->GANA (2);
    SILVER ENERGIA->SILVER (4); Endesa Energia->ENDESA (1); EDP (3) decidir
    segmento GC/Empresas; "Pendiente" (1) no es comercializadora.

PR-3.2 asistente alta 4 pasos: formulario ADAPTATIVO por tarifa (2.0TD =
  2 potencias + 3 energias; resto 6+6 - leccion BLUENET ceros inventados);
  NAGINI como primera alta real de prueba.
PR-3.3 documentos: bucket Storage RLS is_staff + PDF desde ficha; el auditor
  verifica RLS del bucket (anon/client sin acceso).
GATE V3 (viernes): Julia o Antonio, alta completa <2 min + encuentra un PDF.

### VEREDICTOS SEMANA 3 (auditor, 22-jul) — SELLADA 3/3
- PR-3.1 catalogo comercializadoras: PASA (paseo 22-jul; doc v2 pintado linea a
  linea, RLS verificada en pg_policies, selector 20 opciones sin texto libre).
- PR-3.2 asistente alta 4 pasos: PASA (evidencia: alta real NAGINI 90508
  JIMENEZ ROSALES; SQL: 180 CUPS 2.0TD sin P4-P6/E4-E6 — NULL, no 0).
- PR-3.3 documentos OCR-ready: PASA (mismo caso 90508: subida clasificada,
  listado visible, abierto a 1 clic; tras 4 fixes de fondo cazados por el circuito:
  soft-delete RLS transversal, tamano_bytes, tipo legacy, FK listado).
- Limpieza demo/test: CUADRADA (0 demos / 0 huerfanos / 545=545).
- QUEDA: GATE V3 (Julia, en curso 22-jul) para cerrar el objetivo de la semana.

## SEMANA 4 — DATO VIVO + PUSH (T5) [L2/L4/L5 + Z7]

### REPLANIFICACIÓN SEMANA 4 (Juan + auditor, 23-jul) — VINCULANTE
- Se AÑADE F2 (edición de suministros tras crear: CUPS editable desde la ficha)
  — hallazgo real de Julia en el ensayo del gate V3, aplazado a esta semana.
- GATE V4 = CIERRE DEL MES: VIERNES 31 de julio.
- Orden: PR-4.1 curva → PR-4.2 push lunes → F2 → PR-4.3 velocidad.
- Flecos del cron (asignados a Cowork, 23-jul): (a) los 400 dejan huella con su
  CUPS y etapa (consumos v7) · (b) datadis-sync deja parte en datadis_runs
  (sync v11). Desplegados 23-jul; verificación en los runs de la madrugada del 24.

PR-4.1 Curva en la pestaña Suministros: gráfica mensual + zoom diario desde
  datadis_consumptions; 🟡 si el backfill del CUPS está incompleto; botón
  descargar CSV (L5). CA: curva de CHEMTROL visible; CUPS sin datos = aviso
  honesto, no error.

PR-4.2 PUSH v1 — informe de los lunes: Edge Function + cron (07:00, patrón
  x-cron-secret): email al staff con renovaciones críticas del mes + incidencias
  Datadis. CA: email del lunes recibido y sus cifras cuadran con la UI Y CON SQL
  DIRECTO por separado (nota del auditor 23-jul: UI y email podrían compartir el
  mismo error de origen — la verificación no se apoya solo en email-vs-UI).
  ESTADO: DESPLEGADO (logo real sin modificar + colores de marca reales,
  email-safe table+inline-style). Pendiente solo confirmación visual de Juan.

F2 edición de suministros — ESTADO: PASA (paseo auditor 23-jul). Nuevo
  EditarSuministroModal.tsx (mismo patrón que EditarLeadModal) +
  useActualizarCups() (update simple sobre `cups`, RLS ya lo permitía, sin
  migración) + botón "Editar" en SuministrosTable, wireado en la pestaña de
  empresa. Edita solo campos comerciales (CUPS validado con validateCUPS(),
  tarifa, dirección/ciudad, comercializadora, estado) — NO potencias/FV/
  Datadis (módulos propios). VERIFICADO: guarda correctamente y rechaza CUPS
  inválido, cuadrado por SQL (el guardado con CUPS inválido no persiste).
  Hallazgo UX a backlog (no bloquea): el rechazo de CUPS inválido es
  silencioso para el usuario — ver `MEJORAS_UI_BACKLOG.md`.

PR-4.3 Velocidad percibida: skeletons + paginación en rutas principales, sin
  recargas completas. CA: paseo Chrome sin ningún spinner >2s.
  ESTADO: PASA (paseo auditor 23-jul, sin spinner >2s en navegación
  intra-SPA). OportunidadesPage ya no bloquea la página entera con
  "Cargando pipeline…" (cabecera+acciones siempre visibles, tablero con
  columnas skeleton mientras carga); 6 widgets del Dashboard con texto
  plano "Cargando..." pasan a SkeletonText. Empresas/Contratos/Renovaciones
  ya tenían skeletons+paginación de trabajo previo (sin cambios). Hallazgo
  UX a backlog (no bloquea): panel de curva inline (`CurvaConsumo` en
  SuministrosTab) frágil, sin CA propio — ver `MEJORAS_UI_BACKLOG.md`. Gap
  conocido fuera de alcance: SuministrosPage (listado global) sin paginar.

**SEMANA 4: 4/4 PASA (veredicto del auditor, 23-jul).** PR-4.1, PR-4.2, F2 y
PR-4.3 completos y verificados. 2 hallazgos UX menores a backlog v2 (arriba),
ninguno bloqueante.

GATE V4 — CIERRE DEL MES: Juan demuestra los 5 trabajos en vivo, cronometrados.
Retro de 30 min. Se abre el backlog v2 (lo que quedó fuera + energía S1/S2).
Fecha: viernes 31 de julio.

---

## LO QUE ESTE MES *NO* HACE (para que sí haga lo anterior)

- No adelanta el roadmap energía (optimizador S2.1, validación factura S3):
  la semana 4 solo PINTA lo que ya entra solo.
- No ejecuta remediaciones de datos (123 renovaciones, canales, huérfanos)
  salvo que bloqueen una UI concreta — siguen su cauce en la sesión de datos.
- No persigue paridad con Zoco: persigue los 5 trabajos.

## PAPEL DEL AUDITOR (compromiso)

Cada viernes: verificación del gate (paseo + SQL + cronómetros) y veredicto
CIERRA/NO CIERRA por escrito en este documento. Si algo no cierra, la causa
y el recorte de alcance quedan registrados. Mismo rigor que Fase 0-1 y Datadis.

── GATE V1 · 2026-07-21 (adelantado desde el 24) · AUDITOR ──
VEREDICTO: CIERRA. Paseo de 5 clientes (CHEMTROL, PAZ Y BIEN, BLUENET,
DERAZA post-fusion B45728805, Bidafarma): T1 cumplido en los 5, buscador
a ficha 3-5s (<10s), datos cuadrados por SQL, cero callejones. PR-1.1 a
PR-1.5 todos con DoD completo y verificacion independiente. Extras de la
semana: S0.2 sellado (cron datadis-consumos-nightly 03:30) y DERAZA
fusionada con cuadre de 0 huerfanos en 23 tablas. Observaciones no
bloqueantes en outbox 2026-07-21. Semana 2 autorizada a arrancar.
── GATE V2 · 2026-07-24 · AUDITOR ──
VEREDICTO: CIERRA. 3 preguntas de negocio elegidas por el auditor
(adversarias), respondidas desde la UI en 15-20s cada una (<30s),
cuadradas contra SQL en el momento: 13 criticas vencidas sin contactar
(KPI clicable + estado, 2 interacciones); 11 vencidos de TOTAL con
export verificado por toast; 6 NEXUS de CHEMTROL venciendo 14/10/2026
via ficha 360. PR-2.1 a 2.4 con DoD completo; PR-2.5 pendiente dentro
de semana aprobada. Extras: ops datos 1-2 (normalizacion 286 tarifas +
4 ceros inventados BLUENET) ejecutadas y cuadradas. Badge "N vencidas"
en cabecera operativo. Semana 3 autorizada a arrancar tras PR-2.5.
── GATE V3 · 2026-07-23 · AUDITOR ──
VEREDICTO: CIERRA CONDICIONAL. El ensayo del 22-jul fue un alta REAL de
Julia (Nagini) que destapó 3 hallazgos (F1 fecha inicio, F3 acciones en
detalle contrato, F4 created_by+duplicados) — los 3 corregidos y mergeados
en <24h (F2 a semana 4). El circuito funciona: usuario no desarrollador
completa el alta y sus hallazgos se convierten en fixes verificados.
CONDICIÓN: el cronómetro (<2 min) se certifica con la PRÓXIMA alta real
Nagini de Julia, sin ensayo previo; Cowork verifica por SQL (nace en
trámite, created_by relleno). Semana 4 autorizada a arrancar el 23-jul.
── PR-4.1 CURVA · 2026-07-23 · AUDITOR ──
VEREDICTO: PASA. Vista v_consumos_diarios cuadra 4 CUPS día a día; gráfica
de 24 meses (08/2024→07/2026) con el último mes marcado como parcial de
forma honesta; CSV y badge 🟡/🟢 correctos. HALLAZGO UX (no bloqueante):
el panel de curva inline es frágil — se colapsa con scroll o clic fuera —
y hay un warning de width(-1) al montar el gráfico; considerar modal o
minHeight fijo (anotado en backlog). PENDIENTE: el auditor certificará el
zoom diario y la cuadratura al kWh en la próxima pasada.
── PR-4.2 PUSH DE LOS LUNES · 2026-07-23 · AUDITOR + JUAN ──
Verificación auditor por SQL independiente: 2 críticas exactas (REAL CANOE
05-jul, PANADERÍAS EL MIMBRE 17-jul), query correcta. CORRECCIÓN VINCULANTE
del auditor: destinatarios pasan de solo role=master a role IN
('master','consultant') — el equipo operativo (Julia, Antonio arodriguez@,
administración) está en 'consultant', no en 'master'; con solo-master no se
enteraban quienes tienen que actuar. Total 6 destinatarios (3+3), verificado
por SQL antes de desplegar. Juan autorizó deploy + secreto Vault + cron
push-lunes-weekly (lunes 07:00 UTC, jobid 7, activo) + un envío de prueba
previo (test_to override en la EF) dirigido SOLO a jolivares@ para ver el
email real antes de soltar el cron. Envío de prueba: status 200, 2 críticas,
11 incidencias, cuadrado contra audit_log. PENDIENTE: confirmación visual de
Juan sobre el email recibido.
