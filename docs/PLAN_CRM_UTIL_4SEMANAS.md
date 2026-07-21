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

## SEMANA 4 — DATO VIVO + PUSH (T5) [L2/L4/L5 + Z7]

PR-4.1 Curva en la pestaña Suministros: gráfica mensual + zoom diario desde
  datadis_consumptions; 🟡 si el backfill del CUPS está incompleto; botón
  descargar CSV (L5). CA: curva de CHEMTROL visible; CUPS sin datos = aviso
  honesto, no error.

PR-4.2 PUSH v1 — informe de los lunes: Edge Function + cron (07:00, patrón
  x-cron-secret): email al staff con renovaciones críticas del mes + incidencias
  Datadis. CA: email del lunes recibido y sus cifras cuadran con la UI (el
  auditor las compara).

PR-4.3 Velocidad percibida: skeletons + paginación en rutas principales, sin
  recargas completas. CA: paseo Chrome sin ningún spinner >2s.

GATE V4 — CIERRE DEL MES: Juan demuestra los 5 trabajos en vivo, cronometrados.
Retro de 30 min. Se abre el backlog v2 (lo que quedó fuera + energía S1/S2).

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
