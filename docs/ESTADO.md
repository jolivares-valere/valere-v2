# Estado actual del proyecto Valere v2

> **Última actualización: 2026-07-23i — 🟢 FASE PUENTE ★ CERRADA: ESPEJO DOCUMENTAL A DRIVE OPERATIVO. Pivote de autenticación: la cuenta de servicio de Google Cloud quedó bloqueada por la política de organización `iam.disableServiceAccountKeyCreation` (baseline "secure by default" de Google en valereconsultores.com) — en vez de pedir a Juan que abriera una excepción de política de seguridad, se optó por OAuth 2.0 con su cuenta personal (jolivares@valereconsultores.com). Completado con Juan haciendo los pasos sensibles (login, consentimiento, clic en "Crear") y Cowork rellenando el resto vía browser automation: proyecto GCP `valere-espejo-documental`, Drive API habilitada, pantalla de consentimiento OAuth (Interno), cliente OAuth de escritorio, `refresh_token` obtenido. Credenciales (client_id/secret/refresh_token + 4 folder IDs) en Supabase Vault, nunca en el repo. Edge Function `espejo-documental` desplegada (`verify_jwt=false` + x-cron-secret, patrón push-lunes) con lógica de reconciliación (lista bucket `documentos` vía RPC `espejo_drive_listar_objetos`, compara contra tabla de control `espejo_drive_log`, sube lo que falte vía Drive API v3 multipart, nunca borra). PRUEBA END-TO-END REAL (no ficticia): dry_run detectó 27/27 pendientes → pasada real subió 27/27 sin fallos → segunda pasada confirmó 0 pendientes (idempotencia) → verificado por API de Drive que las 3 carpetas tienen exactamente 20+2+5=27 ficheros, cuadra con el bucket. `pg_cron` diario 06:00 UTC activo (`espejo-documental-daily`). Migraciones documentadas en `supabase/migrations/_MANUAL_cron_espejo_documental.sql`. Detalle completo: `docs/DISENO_ESPEJO_DOCUMENTAL_DRIVE.md`. SIGUIENTE: retomar GATE V4 (cierre del mes, viernes 31 de julio) según el planning original.**

> **Estado previo: 2026-07-23h — 🏆 SEMANA 4: 4/4 PASA (veredicto del auditor). F2 verificado: guarda correctamente y RECHAZA CUPS inválido — cuadrado por SQL (el guardado con CUPS inválido no persiste). PR-4.3 verificado: paseo Chrome sin spinner >2s en navegación intra-SPA. 2 HALLAZGOS UX a backlog (`docs/MEJORAS_UI_BACKLOG.md`, sección "Semana 4 — F2/PR-4.3"): (1) panel de curva inline (`CurvaConsumo` en `SuministrosTab`) frágil, sin CA propio que lo cubra; (2) `EditarSuministroModal` rechaza CUPS inválido de forma silenciosa — falta señal clara al usuario del motivo del rechazo más allá del error de campo. Ninguno de los dos bloquea el gate. Nota técnica menor: quedan varios `.git/index.lock.stale_*` sueltos en `.git/` de la sesión autónoma anterior (0 bytes, inofensivos) — los borra Juan cuando quiera, sin urgencia. **LISTOS PARA GATE V4 (cierre del mes) el viernes 31 de julio.**

> **Estado previo: 2026-07-23g — 🤖 TRABAJO AUTÓNOMO (Juan ausente, autorización explícita): F2 + PR-4.3 CODIFICADOS Y COMMITEADOS (3/4 y 4/4 de semana 4), PENDIENTE SOLO `git push` DE JUAN. F2 (hallazgo real de Julia en el ensayo del gate V3, edición de suministros tras crear): nuevo `EditarSuministroModal.tsx` (mismo patrón que EditarLeadModal — react-hook-form+zod+shadcn, `validateCUPS()` para el CUPS) + `useActualizarCups()` en suministros/api.ts (update simple sobre `cups`, RLS ya lo permitía, sin migración) + botón "Editar" en SuministrosTable, wireado en la pestaña de empresa (SuministrosTab). Edita solo campos comerciales (CUPS, tarifa, dirección/ciudad, comercializadora, estado) — NO toca potencias/FV/Datadis (módulos propios). PR-4.3 (velocidad percibida, CA: paseo Chrome sin spinner >2s): OportunidadesPage ya NO bloquea toda la página con "Cargando pipeline…" (cabecera y acciones siempre visibles; el tablero kanban muestra columnas skeleton mientras carga) + 6 widgets del Dashboard con texto plano "Cargando..." pasan a SkeletonText. Empresas/Contratos/Renovaciones ya tenían skeletons+paginación de trabajo previo, sin cambios. VERIFICACIÓN: tsc --noEmit limpio (0 errores) en las 6 ficheros tocados, cada transferencia al repo real verificada byte a byte por SHA-256. vitest NO pudo ejecutarse en el entorno device_bash (falta el binario nativo `@rollup/rollup-linux-x64-gnu` para Linux — el mismo `node_modules` está instalado para Windows; limitación de entorno, no del código) — Juan debe correr `npm test` en su máquina. GIT: commit local `988e6c8` hecho (6 ficheros exactos, nada más — verificado con `git status --porcelain` antes y después); el `.git/index.lock` reaparecía en cada operación de escritura (device_bash no puede borrar ficheros — límite documentado de la herramienta) y se resolvió cada vez con `mv` a un nombre distinto (no con `rm`, que falla) antes del siguiente comando. `git push` FALLÓ con 403 del proxy: **device_bash no tiene acceso de red** (documentado, no es un fallo mío) — por eso los pushes siempre los ha hecho Juan desde su propia terminal, con red real. PENDIENTE ÚNICO: Juan ejecuta `git push` (el commit ya existe local, nada que añadir ni resolver — los 486 ficheros con line-endings CRLF/LF que vuelven a aparecer en `git status` son el mismo ruido de siempre, NO tocados, NO los añadas). Detalle: `.cowork/outbox/2026-07-23T18-00-00-f2-pr43-autonomo-pendiente-push.md`.**

> **Estado previo: 2026-07-23f — 🟢 PR-4.2 PUSH DE LOS LUNES DESPLEGADO (2/4 de semana 4, pendiente confirmación visual). EF push-lunes ACTIVA (verify_jwt=false, patrón x-cron-secret) + RPC check_push_cron_secret + secreto push_cron_secret en Vault + cron push-lunes-weekly (jobid 7, lunes 07:00 UTC, ACTIVO). CORRECCIÓN DEL AUDITOR aplicada: destinatarios role IN ('master','consultant') — NO solo master; el equipo operativo (Julia/Antonio/administración) está en consultant. 6 destinatarios verificados por SQL. Envío de PRUEBA (test_to override) a jolivares@ únicamente: status 200, 2 críticas del mes (REAL CANOE 05-jul, PANADERÍAS EL MIMBRE 17-jul), 11 incidencias Datadis — cuadrado contra audit_log. NOTA: los ficheros de código se escribieron primero en el sandbox de la nube por error (no llegaban al mount real) — corregido, ya están en el repo local de Windows listos para commit. PENDIENTE: Juan confirma que el email de prueba se ve bien → entonces el cron queda operativo sin más pasos (ya está activo, la prueba es la última verificación antes del primer lunes real). Comandos de commit en `.cowork/outbox/2026-07-23T16-00-00-pr42-push-lunes-desplegado.md`.**

> **Estado previo: 2026-07-23e — ✅ PR-4.1 CURVA MERGEADO A MAIN (1/4 de semana 4). Rama claude/pr-4-1-curva-consumo: curva mensual + zoom diario + CSV + 🟡 backfill honesto en pestaña Suministros; tsc 0 + 206 tests (+7 curva); fix de última hora: tipado formatters Tooltip recharts (fdfd243); doc RAG ver-suministros.md con sección «Ver la curva» (los embeddings se regeneran con el push a main). Vista v_consumos_diarios aplicada y cuadrada (23d). PENDIENTE: paseo del auditor (aviso + guion con datos cuadrados en `.cowork/outbox/2026-07-23T15-00-00-pr41-mergeado-aviso-paseo.md`; recordar hard reload por cache-busting) → veredicto en el plan. SIGUIENTE: PR-4.2 push de los lunes (EF + cron 07:00 x-cron-secret). Verificación runs v7/v11: madrugada del 24 (recordatorio 07:45).**

> **Estado previo: 2026-07-23d — 🟢 SESIÓN 13: VISTA DE LA CURVA APLICADA EN PRODUCCIÓN (OK Juan) — PR-4.1 DESBLOQUEADO. `v_consumos_diarios` creada (migración 20260723_pr41, security_invoker) + FLECO cazado en el cuadre: default privileges daban escrituras a authenticated sobre la vista → revocadas (queda authenticated:SELECT exacto, anon nada; fichero del repo actualizado = producción, patrón Fase 0.3b). CA CHEMTROL cuadrado por SQL: …774JW 713 días (hasta 14-jul) + …SA0F 712 días (hasta 13-jul); máx 721 filas/CUPS (≤800 del limit); 4 CUPS con curva. PENDIENTE JUAN (comandos listos en outbox 14-00): borrar `.git/index.lock` (lo dejó un git status del sandbox; regla nueva: solo lecturas con GIT_OPTIONAL_LOCKS=0) · bloque A commit flecos+docs a main · bloque B rama claude/pr-4-1-curva-consumo + PR (tsc + 206 tests antes). VERIFICACIÓN MADRUGADA DEL 24 PROGRAMADA (recordatorio 07:45): los runs con v7/v11 son esta noche, no esta mañana (el run 03:30 de hoy fue v6: ok, 95 candidatos, 17.302 filas, con 4×400 anónimos del CUPS flag=true). Tras merge PR-4.1: paseo auditor (guion en outbox 13-00). Detalle: `.cowork/outbox/2026-07-23T14-00-00-s13-vista-aplicada-comandos-commit.md`.**

> **Estado previo: 2026-07-23c — 🚀 SEMANA 4 ARRANCADA (OK Juan + auditor) + FLECOS DEL CRON DESPLEGADOS. GATE V3: CIERRA CONDICIONAL (veredicto en el plan): el alta real de Julia FUE el ensayo; los 3 hallazgos → fixes mergeados en <24h; condición = cronómetro con la PRÓXIMA Nagini real (Cowork verifica por SQL: nace en trámite + created_by). REPLANIFICACIÓN S4 escrita en el plan: PR-4.1 curva → PR-4.2 push lunes → F2 edición suministros → PR-4.3 velocidad; GATE V4 = cierre del mes VIERNES 31. FLECOS CRON RESUELTOS Y DESPLEGADOS: datadis-consumos v7 (cada 400 deja huella con su CUPS y etapa → esta noche sabremos QUÉ CUPS con flag=true rebota) · datadis-sync v11 (deja parte en datadis_runs: el run de las 05:15 ya no será invisible). Verificación: runs de la madrugada del 24. Fuentes en el repo (commit pendiente de Juan). SIGUIENTE: PR-4.1 curva en pestaña Suministros. Detalle: `.cowork/outbox/2026-07-23T12-00-00-arranque-semana4-flecos-cron.md`.**

> **Estado previo: 2026-07-23b — 🌅 AMANECERES VERIFICADOS (re-cuadre Cowork): S0.2-ter FUNCIONA. Run 03:30: 95 candidatos por flag + **17.302 filas ingeridas** (backfill 23m completo de …XY0F) + parte honesto (ok=true con 400s parciales). Run 05:15: 101 autorizados / 0 revocados + **DERAZA RECUPERADA automáticamente** (el diseño autocurativo, demostrado en vivo: ayer fue fallo puntual de Datadis) + incidencias estables 11. REPARACIÓN DUPLICADO 90508 re-cuadrada por Cowork: 1/1b5f44fd/1/1 exacto. Derivada de vigilancia: 1 CUPS con flag=true dio 400 en sus 4 llamadas — si repite esta noche, sonda. Propuesto al auditor: SELLO de S0.2-ter. QUEDA HOY: replanificación semana 4 · viernes gate V3. Detalle: `.cowork/outbox/2026-07-23T08-00-00-verificacion-amaneceres-s02ter.md`.**

> **Estado previo: 2026-07-23 — 📝 ENSAYO GATE V3 PROCESADO: JULIA CONFIRMA POR EMAIL LOS 3 HALLAZGOS + F4 DEL AUDITOR → F1+F3+F4 MERGEADOS (rama claude/fix-gate-v3-ensayo, commit 60ef521, tsc 0 + 199 tests; squash a main). Pendiente: paseo del auditor (5 puntos en outbox) + su reparación del duplicado AQ0F (Cowork verifica el cuadre). F1: fecha inicio OPCIONAL en asistente (sin fecha nace EN TRÁMITE, adelanta espec A1; ContratoForm impide Activo sin fecha) — era el flujo real: al firmar no se sabe cuándo activa el ATR. F3: Editar/Eliminar en el DETALLE del contrato (el camino ficha→pestaña→detalle no tenía acciones). F4: created_by en altas del asistente y del modal + aviso no bloqueante de nº contrato duplicado (el fix de fondo del robo de CUPS = Parte A de la espec). F2 (edición suministros) → replanificación semana 4. REPARACIÓN del duplicado del ensayo (re-apuntar AQ0F + soft-delete alta de Julia): la ejecuta el auditor con OK de Juan; Cowork verifica el cuadre. GATE V3 FORMAL: VIERNES con cronómetro sobre un Nagini real sin fecha de inicio. Detalle: `.cowork/outbox/2026-07-23T00-30-00-fixes-gate-v3-ensayo.md`.**

> **Estado previo: 2026-07-22m — 🔍 ALERTA DEL AUDITOR RESUELTA: EF `gastos` = APP LEGÍTIMA DE JUAN (creada hoy con OTRA sesión de Claude; confirmado en chat). PWA "Gastos Valere" (justificantes de tarjeta Juan/Antonio → bucket privado + tablas RLS → envío a Carolina vía Make). Análisis Cowork: verify_jwt=false correcto (solo sirve HTML estático, cero secretos); 3 peros a backlog (RLS laxa authenticated→true, webhook Make en claro, fuente sin commitear). SEGUNDA falsa alarma de intrusión del día muerta por verificación (CSV, gastos). LECCIÓN de protocolo: toda sesión que despliegue debe dejar parte en outbox/ESTADO — también las laterales. REGISTRADA COMO APP SATÉLITE OFICIAL EN CURSO, con 3 encargos al chat que la construye: fix trimestre fijo 2026-T2 (estamos en T3) · subir fuente al repo · diseño de integración futura con módulo de ingresos vía Holded (gastos_tarjeta ↔ conciliación). Detalle: `.cowork/outbox/2026-07-22T21-00-00-ef-gastos-identificada.md`.**

> **Estado previo: 2026-07-22l — ✅ TANDA DE DATOS Y REPO CERRADA POR EL CIRCUITO (verificada por Cowork en BBDD): hallazgo A ejecutado (0 contratos con coma) · grupo 1 ejecutado (17 CUPS sin tarifa = 16 sin fuente + AERCAL) · RLTB dictado y migrado (canónica RLTB.x: 51 cups + 58 contratos) · PODA verificada contra GitHub (quedan exactamente las 4 ramas previstas; 81 borradas) · orden módulo ingresos DECIDIDO: D antes que C (A1→B1→D1→D2→C1→C2→C3). CORRECCIÓN al resumen del auditor: S0.2-ter NO está pendiente — desplegado (sync v10 + consumos v6) y commiteado en c2b30f6; verificación en los runs de esta madrugada. ✅ GEMINI ROTADO Y VERIFICADO: Juan creó clave nueva + actualizó secret + revocó las viejas (solo en Google AI Studio); Cowork probó el globo en vivo (ask-crm-docs 200 con respuesta y fuentes → embeddings y generación OK, cubre también chat-consultor y tariffs-ingest-email); mapa completo de claves revisado — Resend/ESIOS/Make/FV/Datadis intactos. CERO pendientes de seguridad. Externos: reporte Julia (gate V3) + verificación runs madrugada.**

> **Estado previo: 2026-07-22k — 🔧 S0.2-ter EJECUTADO (encargo auditor tras run 03:30 con 8/8 llamadas 400 contado como limpio). CAUSA RAÍZ verificada en datadis_runs: datadis_sincronizado es PEGAJOSO (nunca se desmarca al revocar) → CUPS revocados entran primeros al lote y queman el presupuesto en 400s; datadis_autorizado existía sin poblar ni usar. FIX: flag poblado por SQL (95 true / 3 false=revocados) · datadis-sync v10 DESPLEGADO (mantiene el flag fresco + flag_autorizado en el parte) · datadis-consumos v6 DESPLEGADO (candidatos por flag + 400 masivo = run FALLIDO con aborto temprano). BONUS: el fuente de datadis-consumos no estaba en el repo — añadido. VERIFICACIÓN: runs de la madrugada del 23 (03:30 debe ingerir con ~95 candidatos; 05:15 debe reportar flag_autorizado). Derivada: identificar los 3 CUPS revocados y decidir re-tramitación. Detalle: `.cowork/outbox/2026-07-22T18-00-00-s02ter-flag-autorizacion.md`.**

> **Estado previo: 2026-07-22j — 🏆 SEMANA 3 SELLADA 3/3 POR EL AUDITOR (veredictos añadidos al plan). PR-3.2 PASA y PR-3.3 PASA con evidencia del alta real 90508 + SQL (180 CUPS 2.0TD sin P4-P6/E4-E6 = NULL, no 0). Limpieza demo/test CUADRADA (0/0/545). TROCEO DE INGRESOS APROBADO con 3 notas vinculantes: C1 transiciones on-load en fase 1 · orden C/D lo decide Juan · B1 requiere el campo producto de A1 conectado a condiciones (prerequisito duro). datadis-sync v9 ACTIVE verificada; el cron de las 03:30 corrió — mañana el auditor revisa incidencias_zombis_purgadas. MARCADOR DEL MES: 13/16 PRs · 2/4 gates (V3 en curso con Julia) · quedan semana 4 + gate V4. PENDIENTE: reporte Julia · OK Juan a hallazgo A (438 tarifas coma en contratos) + grupo 1 CUPS · dictado RLTB · poda ramas · orden C/D.**

> **Estado previo: 2026-07-22i — 🤖 BARRIDO AUTÓNOMO COMPLETADO (a expensas del reporte de Julia). (1) datadis-sync v9 DESPLEGADO (S0.2-bis barrido de zombis; el cron nocturno lo verificará con el campo incidencias_zombis_purgadas). (2) 22 CUPS sin tarifa ANALIZADOS → hoja de decisión en outbox: 5 deterministas desde contrato (SQL listo, espera OK) · 1 inferible (AERCAL, confirmar) · 16 sin fuente (aparcar a factura/SIPS). (3) HALLAZGO A: contratos.tarifa_acceso con 438 filas en grafía de coma (la normalización solo tocó cups) — SQL listo, espera OK+cuadre. (4) HALLAZGO B (corrige memoria): la EF resolver-sips-cups NO está desplegada (solo en rama aparcada). (5) RLTB: pregunta de canónica formulada (¿RLTB.5≡RL5?) — dictado de Juan. PENDIENTE DE OTROS: reporte gate V3 (Julia) · poda 81 ramas + Gemini huérfanas (Juan) · veredictos 3.2/3.3 y aprobación troceo ingresos (auditor). Detalle: `.cowork/outbox/2026-07-22T17-00-00-hoja-decision-cups-tarifa.md`.**

> **Estado previo: 2026-07-22h — 🧹 LIMPIEZA DEMO/TEST EJECUTADA Y CUADRADA (OK Juan+auditor) + CSV CREDENCIALES = FALSA ALARMA VERIFICADA. (1) CSV: idéntico en todo su historial, NUNCA contuvo secretos (inventario con placeholders) — retirado del repo con git rm (0c2184f), SIN filter-repo; quedan del inventario: revocar 2 Gemini huérfanas + higiene tokens. (2) Limpieza: 7 empresas demo/test + 4 oportunidades + 1 contacto + 6 docs (+Storage 6/6) + 3 contratos huérfanos (corrección del auditor, verificados) + renovación y CUPS de prueba. RE-CUADRE VERDE: 545 vivos = 545 con empresa viva · 0 sin FK (CA PR-3.1 perfecto) · 0 demos · 0 huérfanos. Derivada backlog: borrar empresa no cascadea a hijos (cascada en RPC vs aviso bloqueante — PR pequeño). (3) Poda 81 ramas: script en outbox pendiente de ejecutar Juan. (4) Gate V3 lanzado (email a Julia con contrato NAGINI); esperando reporte. Detalle: `.cowork/outbox/2026-07-22T16-00-00-limpieza-demo-test-cuadrada.md`.**

> **Estado previo: 2026-07-22g — 📐 ENCARGO MÓDULO DE INGRESOS: 3 ESPECS LEÍDAS + TROCEO PROPUESTO (PENDIENTE APROBACIÓN JUAN+AUDITOR, NADA EJECUTADO). Especs de Drive (cierre automático+retros · conciliación liquidaciones · cuotas de cliente; motor común expectativa+casado+semáforo; caso origen alta real NAGINI 90508 JIMENEZ ROSALES SILVER→NAGINI). Propuesta: 7 PRs — A1 cierre automático contrato anterior + 5 fricciones del paseo de hoy [ÚNICO candidato a semana 4] → B1 retros (esquema apuntes_comision + retro_* en condiciones) → C1 liquidaciones+esperadas → C2 casado manual+documento (⚠ ampliar CHECK entidad_tipo) → C3 semáforo cobro → D1 cuotas cliente (servicios_contratados+cobros_cliente) → D2 semáforo deuda+ficha 360º. ~7 sesiones. Dictados pendientes de Juan: retro_* por comercializadora, márgenes 15/90d, día esperado de cada liquidación. TAMBIÉN esta sesión: gate V3 preparado y lanzado con Julia (guion+email con contrato NAGINI adjunto; globo de ayuda verificado al día — ingesta RAG 59 docs anoche) · S0.2-bis CODIFICADO (barrido de zombis en datadis-sync v9, deploy pendiente de OK; hallazgo: las de DERAZA se autolimpiaron hoy al procesarse la canónica — el agujero era para empresas fuera del conjunto). Detalle: `.cowork/outbox/2026-07-22T14-00-00-propuesta-troceo-modulo-ingresos.md`.**

> **Estado previo: 2026-07-22f — 🏁 SEMANA 3 COMPLETA EN PRODUCCIÓN Y VERIFICADA DE PUNTA A PUNTA. Último PR mergeado (fix listado documentos + compensatorio + guard). Falsa alarma final aclarada: la "doble subida" era el listado FUNCIONANDO por primera vez (mostraba el PDF superviviente del paseo + el nuevo); Juan borró uno desde la UI y ese clic fue el paseo involuntario de la RPC soft_delete en documentos + limpieza de Storage → cuadre 1 fila + 1 objeto. MARCADOR SEMANA 3: PR-3.1 catálogo SELLADO · PR-3.2 asistente (#79, alta real NAGINI ejecutada) · PR-3.3 documentos + 4 FIXES de fondo cazados por el circuito (soft-delete RLS transversal · tamanio · tipo check · FK listado de nacimiento) · 199 tests · 2 ops de datos cuadradas (backfill 543 + purga huérfanos). PENDIENTE: veredictos formales del auditor (paseos 3.2/3.3 con los fixes) → sellado 3/3 en el plan · GATE V3 VIERNES: Julia o Antonio, alta completa <2 min + encuentran un PDF. Pendientes que no caducan: decisión 5 fichas demo/test (+contrato "Pendiente" Empresa Test) · 22 CUPS tarifa null · RLTB canónica · S0.2-bis · CSV credenciales · poda ramas · cache-busting · PR-4.3 · deuda esquema tipo→tipo_documento. Detalle: outbox de 21/22-jul (5 ficheros).**

> **Estado previo: 2026-07-22e — 🐛🐛🐛→✅ RE-PASEO PR-3.3: TERCER BUG DE NACIMIENTO CAZADO Y RESUELTO. La subida ya grababa (VERDE) pero el listado seguía vacío: documentos_subido_por_fkey apuntaba a auth.users → el embed user_profiles del listado devolvía 400 DESDE SIEMPRE, y el estado vacío se comía el error. La feature Documentos estaba rota de nacimiento en 3 capas (tamanio · tipo check · FK embed) — nunca había funcionado de punta a punta. FIXES: FK re-apuntado a user_profiles (migración aplicada, embed verificado 200) · estado de error honesto con Reintentar · borrado compensatorio de Storage si el insert falla · guard doble-click (creaba filas duplicadas: eran 2 FILAS, no 1). PURGA con OK (corrección al auditor: 381f47dc NO era huérfano, era la fila del doble-click): soft-delete fila 00:21 + 3 objetos via Storage API → CUADRE VERDE 1 fila + 1 objeto. PENDIENTE: Juan rama claude/fix-pr33-listado-huerfanos+commit+PR; re-re-paseo (listado visible + doble-click = 1 fila + borrar documento con la RPC). Detalle: `.cowork/outbox/2026-07-22T10-30-00-fix-listado-documentos-huerfanos.md`.**

> **Estado previo: 2026-07-22d — ✅ LOS DOS FIXES MERGEADOS (soft-delete RLS + tipo legacy documentos; conflicto en documentos/api.ts resuelto con --ours conservando ambos, verificado por grep). SEMANA 3 EN PRODUCCIÓN COMPLETA: PR-3.1 sellado · PR-3.2 #79 · PR-3.3 · fix soft-delete · fix tipo-legacy. PENDIENTE VERIFICACIÓN: re-paseo subida NAGINI (tipo='contrato'+tipo_documento='contrato' en BBDD, DNI→'documentacion', abrir a 1 clic) + paseo soft-delete (borrar "prueba para borrar" desde UI — sigue viva a propósito) + paseo PR-3.2 completo si el auditor no lo dio ya por visto en el alta NAGINI. GATE V3 viernes: Julia o Antonio, alta completa <2 min + encuentran un PDF. Detalle fixes: outbox 2026-07-22T01-30 y 2026-07-22T09-00.**

> **Estado previo: 2026-07-22c — 🐛→✅ FIX documentos_tipo_check (cazado en el paseo del alta NAGINI): el código heredado escribía la EXTENSIÓN ('pdf') en la columna legacy `tipo`, cuyo check exige minúsculas de una lista cerrada → upload roto por partida doble (tamanio + este). Fix: mapa TIPO_LEGACY (dni→'documentacion') manteniendo `tipo_documento` como fuente de verdad; deuda de esquema (unificar tipo→tipo_documento) anotada en MEJORAS_UI_BACKLOG.md. Solo código, sin migración. Rama: claude/fix-pr33-tipo-legacy. Re-paseo: repetir subida NAGINI + caso DNI. Detalle: `.cowork/outbox/2026-07-22T09-00-00-fix-tipo-legacy-documentos.md`.**

> **Estado previo: 2026-07-22b — 🐛→✅ BUG TRANSVERSAL CAZADO Y ARREGLADO: SOFT-DELETE BLOQUEADO POR RLS. PR-3.3 MERGEADO antes (ver estado previo). Juan intentó borrar la empresa de prueba del asistente y saltó 42501: las policies de lectura USING (deleted_at IS NULL) invalidan la fila al ponerle deleted_at → NADIE podía borrar NADA en NINGUNA tabla desde el endurecimiento RLS (nunca paseado). Diagnóstico en vivo (Chrome con su sesión + SQL emulado). FIX elegido por Juan: RPC soft_delete SECURITY DEFINER (whitelist 8 tablas, permisos espejo de las policies de delete, revoke anon) — migración APLICADA — + 8 hooks de borrado migrados a la RPC (policies de lectura intactas). Verificado con sesión emulada (rollback; "prueba para borrar" sigue viva como material del paseo). PENDIENTE: Juan rama claude/fix-soft-delete-rls+commit+PR; paseos auditor 3.2 + 3.3 + fix. Detalle: `.cowork/outbox/2026-07-22T01-30-00-fix-soft-delete-rls.md`.**

> **Estado previo: 2026-07-22 — 🟢 SEMANA 3 COMPLETA EN CÓDIGO: PR-3.3 DOCUMENTOS CODIFICADO (+ BBDD aplicada). HALLAZGO GORDO: la pestaña Documentos ya existía pero el upload estaba ROTO en producción (insert con `tamanio`, columna real `tamano_bytes` — nunca paseado) → FIX en este PR. Migración aplicada con OK: documentos + tipo_documento (contrato/factura/dni/otro) + comercializadora_id (FK catálogo) — nota OCR-ready del auditor+Juan cumplida: (a) metadatos ✓ (b) nombres normalizados fecha_tipo_slug ✓ (c) EF service_role bypasea RLS ✓ sin SQL extra. UI: panel de clasificación al subir (tipo premarcado en detalle contrato + comercializadora opcional del catálogo) + chip de tipo en lista. Policies del bucket verificadas (anon sin acceso). PENDIENTE: Juan rama claude/pr-3-3-documentos-ocr-ready+commit+PR; paseos auditor PR-3.2 (alta real NAGINI <2 min) y PR-3.3 (CA: contrato CHEMTROL subido y abierto a 1 clic). MARCADOR SEMANA 3: 3.1 SELLADO · 3.2 mergeado #79 · 3.3 codificado → GATE V3 viernes con todo el material. Detalle: `.cowork/outbox/2026-07-22T00-30-00-pr33-documentos-codificado.md`.**

> **Estado previo: 2026-07-21 (noche b) — 🟢 PR-3.1 SELLADO (paseo auditor PASA, 1/3) + PR-3.2 CODIFICADO. Paseo PR-3.1: doc v2 pintado línea a línea en /comercializadoras, RLS verificada en pg_policies, selector con exactamente 20 opciones y cero texto libre («la lección CARO/CAROLINA tiene su vacuna estructural»). PR-3.2 asistente de alta en 4 pasos CODIFICADO (feature alta-venta: wizard empresa→CUPS→contrato ADAPTATIVO por tarifa [2.0TD=2+3, resto 6+6, NULL nunca 0]→renovación autogenerada con prioridad editable y aviso "no comisiona renovación" para Naturgy/Endesa/Plenitude; orquestación con reintento sin duplicados; +4 tests periodos; ruta /alta-venta + menú "Nueva venta" + permiso asesor_senior + doc RAG ventas/). MERGEADO: PR #79 (squash 2591032, tsc 0 + 199 tests [+4 periodos] + CI 5/5). PENDIENTE: paseo auditor con ALTA REAL NAGINI cronometrada <2 min (guion dictado en outbox); tras PASA -> 2/3 y PR-3.3 documentos. Detalle: `.cowork/outbox/2026-07-21T23-30-00-pr32-asistente-codificado.md`.**

> **Estado previo: 2026-07-21 (noche) — 🟢 SEMANA 3 ARRANCADA: PR-3.1 CATÁLOGO COMERCIALIZADORAS — BBDD APLICADA + CÓDIGO LISTO (pendiente commits Juan + paseo). Lectura obligada hecha (doc REGLAS DE COMISIONES v2 en Drive) y doc editado: CYE=50% fee y Eleia vía Zoco (confirmados 21-jul). Replanificación ligera commiteada al plan. HALLAZGO: `comercializadoras` ya existía (maestro REAL de la calculadora; `retailers` es una VISTA sobre ella) → DECISIÓN con OK de Juan: EXTENDER esa tabla (un solo maestro; name/vista intactos). MIGRACIÓN APLICADA (20260721_pr31_catalogo_comercializadoras.sql): + nombre_canonico único/grupo/segmento/via [directa|zoco|xentia]/es_canal_venta + NUEVA comercializadora_condiciones (tipo_regla [pct_fee|pct_margen|fijo_tarifa|eur_kw|tramos], componente, valor EDITABLE, cadencia, comisiona_renovacion, vigencia — RLS select authenticated/write admin+master) + contratos.comercializadora_id FK. Seed: 10 filas existentes mapeadas + 10 nuevas = 20 canales · 28 condiciones · 3 adendas 31/12/2026 (aviso ámbar) · ELEIA sin condiciones (pendiente dictar). OP DE DATOS con OK: unificaciones GANA ENERGIA→GANA (2), SILVER ENERGIA→SILVER (4), Endesa Energía→ENDESA (1), EDP→EDP GRANDES CUENTAS (3, S.A.T. PEREGRIN, decisión Juan) + backfill FK → CUADRE: 544 vivos = 543 con FK + 1 "Pendiente" (Empresa Test SA, demo, fuera a propósito). ⚠ DISCREPANCIA para el acta: encargo decía 542 vivos, BBDD 544. FRONTEND codificado: feature comercializadoras (página /comercializadoras: catálogo con vías, condiciones legibles, edición inline valor/vigencia solo admin) + ContratoForm con SELECTOR del catálogo (texto libre FUERA — CA del plan) + ruta/menú/permisos + tipos + doc RAG. MERGEADO: PR #78 (commit 0c20ea8, tsc 0 + 195 tests + CI 5/5). CUADRE DE DATOS DEL AUDITOR: VERDE (28 condiciones fila a fila, vías 13/6/1, unificaciones sin rastro; 542 del encargo era foto vieja → mandan los 544 de BBDD). PENDIENTE: paseo del auditor en producción (guion en outbox; selector debe tener EXACTAMENTE 20 opciones — los 4 legacy calculadora quedan fuera por es_canal_venta). SIGUIENTE: PR-3.2 asistente alta 4 pasos (NAGINI primera alta real) → PR-3.3 documentos → GATE V3 viernes (Julia/Antonio <2 min + PDF). Detalle: `.cowork/outbox/2026-07-21T22-00-00-cierre-pr31-catalogo.md`.**

> **Estado previo: 2026-07-27 — 🎯 SEMANA 2: 5/5 — PR-2.5 MERGEADO (#76, squash 9968fa8). PENDIENTE SOLO EL PASEO PARA SELLARLA. Bandeja "sin fecha": 5ª tarjeta KPI clicable "📥 Sin fecha" (458 vivas, calculada sobre el conjunto completo = cuadra con la lista por construcción; activa mes=sin-fecha + estado=activas en URL) + opción en desplegable de mes + ACCIÓN "poner fecha" inline (campo date ámbar en columna Vencimiento de filas sin fecha; al fechar: PATCH fecha + prioridad recalculada con calcPrioridad unificado PR-1.3 — verificado en BBDD que el único trigger solo toca updated_at, la app recalcula) → la fila sale de bandeja al pipeline. Dentro de bandeja, desempate por prioridad: críticas arriba. Cabecera empresa: "· N sin fecha" ámbar (BLUENET "— · 18 sin fecha"). 2 docs RAG. tsc 0 + 195 tests. DATO para el acta: la bandeja real son 458 sin fecha vivas (cuadra con Fase 1), no ~330 como se citó en el encargo. CA verificados por SQL: CHEMTROL 3 BASSOLS en bandeja; BLUENET 18. Paseo del auditor pendiente: fechar una BASSOLS → sale de bandeja, prioridad según días; contador tarjeta = lista; URL fría. PASEO PR-2.5: PASA CONDICIONAL (27-jul) → FIX MERGEADO (#77-fix, squash ca8cdfa): el paseo cazó que fechar la BASSOLS …XL0F degradó su prioridad de negocio (alta→baja) — el recálculo aplicaba la escala "estimada" de contratos sobre la prioridad CANÓNICA de renovaciones (asignación de negocio, deliberadamente divergente de los días, PR-1.3). REGLA CORREGIDA: "fechar nunca degrada" — se conserva la más urgente entre la canónica y la estimada por días; la fecha solo puede subir urgencia. Fila …XL0F restaurada a alta con OK de Juan (1 fila). Doc RAG corregida. ✅ RE-PASEO (27-jul tarde): PASA — …EB1F fechada desde UI conserva "alta"; bandeja 456; CHEMTROL 1 sin fecha (…HZ0F); SQL confirma 2 fechadas·alta + 1 sin fecha·alta. **SEMANA 2 SELLADA 5/5** (como la 1: 5 PRs DoD completo + gate CIERRA + fix de calidad cazado por verificación cruzada). MARCADOR DEL MES: 10/16 PRs · 2/4 gates · S0.2 sellado · 6 empresas fantasma saneadas. SEMANA 3 LISTA PARA ARRANCAR (replanificación con deberes ya identificados por el auditor: catálogo PR-3.1 con atributos de comisiones —¿REGLAS dictadas por Juan?—, NAGINI como primera alta real, regla de periodos por tarifa en el asistente, gate V3 con Julia o Antonio de examinadores) (como la 1) y SEMANA 3 AUTORIZADA (alta en 2 min + documentos: PR-3.1 catálogo comercializadoras, PR-3.2 asistente 4 pasos, PR-3.3 documentos Storage; gate V3 = alta completa por usuario no desarrollador). Pendientes de datos: decisión 5 fichas demo/test · 22 CUPS tarifa null · RLTB canónica · bug generador incidencias Datadis (S0.2-bis). Detalle: `.cowork/outbox/2026-07-27T10-00-00-cierre-pr25.md`.**

> **Estado previo: 2026-07-24b — 🏁 GATE V2: CIERRA ✅ + OPS DATOS 1-2 EJECUTADAS Y CUADRADAS. Gate V2 (3 preguntas adversarias del auditor, cronometradas, cuadradas contra SQL en el momento): P1 críticas vencidas sin contactar → tarjeta Críticas + estado Detectada, ~15s/2 interacciones, 13 vencidas en 6 empresas ✓; P2 vencidos de TOTAL a Excel → chips TOTAL+Vencido+Exportar, ~15s/3 clics, 11 filas con toast ✓; P3 qué vence en 2026 del cliente con curva → buscador→CHEMTROL→Contratos, ~20s, 6 NEXUS 14/10/2026 ✓. Paseo PR-2.4 embebido en el gate: KPI clicable vía URL usado en P1; badge cabecera operativo (PAZ Y BIEN "13/04/2027 · Baja ⚠ 4 vencidas" — la honestidad parcial del V1 está muerta; CHEMTROL sin aviso, correcto). Veredicto commiteado en el plan. OPS DE DATOS con OK de Juan: (1) normalización tarifas 286 filas (170+79+29+7+1), foto post exacta (2.0TD 180 · 3.0TD 131 · 6.1TD 67 · RL4 12 · RL3 5, cero variantes residuales; RLTB y 22 null intactos); (2) BLUENET 0→NULL en 4 CUPS, query de anómalos = 0. Ambas cuadradas por el auditor. ✅ OPS 3-4 EJECUTADAS con OK de Juan (24-jul tarde): JEICA 3 cascarones soft-deleted (pre-check 0 en 24 tablas; canónica B41012592 intacta 7/22/22) y AERCAL fusionada (solape negativo, repunte 1+1+1 a A41466574 → 5/7/7, soft-delete 575, 0 huérfanos) — ✅ CUADRE FORMAL AUDITOR: VERDE (canónicas 7/22/22 y 5/7/7 exactas, 5 fichas borradas a cero, 0 huérfanos; 3 fantasmas-múltiple saneados: DERAZA+JEICA+AERCAL = 9 fichas → 3 canónicas sin perder una relación). QUEDA decisión 5 fichas demo/test · BUG PEQUEÑO detectado por el auditor: las 2 incidencias Datadis obsoletas de DERAZA siguen pintadas tras el sync nocturno → generador no limpia (S0.2-bis, workstream Datadis). SEMANA 2: 4/5 con gate CERRADO EN VIERNES; PR-2.5 (bandeja sin fecha) dentro de semana aprobada — al mergear, paseo y 5/5. Semana 3 autorizada tras PR-2.5. Detalle: `.cowork/outbox/2026-07-24T18-00-00-gate-v2-cierra.md`.**

> **Estado previo: 2026-07-24 — 🟢 SEMANA 2: PR-2.4 MERGEADO (#75, squash 6a1dcb4) — 4/5 + SESIÓN DE DATOS EN CURSO. (1) PR-2.4 KPIs clicables: las 4 tarjetas de /renovaciones filtran la lista al clic con la semántica EXACTA de v_renovaciones_kpi (leída con pg_get_viewdef; valor virtual estado=activas ∉ {renovado,perdido} en URL y desplegable "Activas (en curso)"); toggle al re-clic, borde activo, aria-pressed. useListParams gana updateParams (multi-param atómico — dos updateParam seguidos se pisaban). Cabecera de empresa: "⚠ N vencidas" rojo en el chip de renovación (query nueva en useEmpresaCabecera: fecha pasada + estado vivo; caso PAZ Y BIEN = 4). CA cumplido: tarjeta Críticas + chip NEXUS = "críticas de NEXUS" en 2 clics; tarjeta=SQL del día por construcción. 2 docs RAG. tsc 0 + 195 tests. PENDIENTE paseo auditor. (2) SESIÓN DE DATOS post-gate (solo lectura hecha, escrituras esperando OK de Juan): (a) tarifa_acceso: 2,0TD→2.0TD (170), 3,0TD→3.0TD (79), 6,1TD→6.1TD (29), RL.4→RL4 (7), RL.3→RL3 (1); RLTB.5 (15) y RLTB.4 (1) NO se tocan (familia gas consistente, canónica desconocida — decidir); 22 CUPS tarifa null listados para revisión manual. (b) 4 CUPS "anómalos" 2.0TD: todos BLUENET, P4/P5/P6 = 0 inventado (no consumo real); tarifa CORRECTA → corrección propuesta 0→NULL en los 4. (c) CHECKSUM CIF masivo (SQL DNI/NIE/CIF): 9 inválidos = 5 demo/test (B-DEMOMVP*, B99887766, B12345678) + patrón DERAZA confirmado en 2 clústeres: AERCAL A41466574 ✅ (4/6/6) vs A41466575 fabricado (1/1/1 → repunte+soft-delete) y JEICA B41012592 ✅ (7/22/22) + 3 cascarones vacíos 593/594/595 (soft-delete trivial). Orden propuesto: tarifas → BLUENET NULL → JEICA → AERCAL → demos, cada uno con OK explícito + cuadre auditor antes/después. QUEDA PR-2.5 bandeja sin fecha (último de la semana). Detalle: `.cowork/outbox/2026-07-24T12-00-00-cierre-pr24-datos.md`.**

> **Estado previo: 2026-07-22b — 🟢 SEMANA 2: PR-2.3 MERGEADO (#74, squash 74af092) — 3/5. Contratos sobre el componente único con el patrón server-side COMPLETO de Empresas. HALLAZGO GORDO arreglado: la lista global mostraba solo 20 contratos de ~542 (pageSize 20 por defecto SIN paginación, "20 contratos vigentes") — truncamiento silencioso → ahora paginación honesta de 20 con total real en contador. Chips de Estado (7 del enum; mismo param ?estado= → enlaces Dashboard H1 intactos y con chip activo) + chips de Comercializadora (hook nuevo useComercializadorasDeContratos, filtro compania_eq EXACTO para que "NEXUS" no arrastre "NEXUS RENOVABLES"), COMBINABLES; orden server-side por Compañía/CUPS/Fin/Estado en URL; columna Compañía + EstadoBadge nuevos; estados cargando/error/vacío honestos; export server-side con los filtros activos (conjunto FILTRADO completo). "Próximos a vencer" y panel resumen intactos. Doc RAG filtrar-por-estado.md reescrita. Smoke test actualizado (mock del hook nuevo — 1 fallo detectado y corregido antes del commit). Diff real ~317 líneas (sobre el ~300 blando; lo justifica el fix del truncamiento — valorado por el auditor en su paseo). tsc 0 + 195 tests. PENDIENTE: paseo del auditor (chips combinables+contador, URL fría, export filtrado, regresión Próximos a vencer y enlaces Dashboard) + PETICIÓN: profile Performance al clicar chip para el expediente congelaciones; dato diagnóstico: si /contratos (20 filas) no congela pero /renovaciones (1.000) sí, se acota PR-4.3. SIGUIENTE: PR-2.4 KPIs clicables (+ "⚠ N vencidas") → PR-2.5 bandeja sin fecha. GATE V2 VIERNES 24-jul. Detalle: `.cowork/outbox/2026-07-23T10-00-00-cierre-pr23.md`.**

> **Estado previo: 2026-07-22 — 🟢 SEMANA 2: PR-2.2 MERGEADO (#73, squash 319ee6e) — 2/5. Renovaciones sobre el componente único: página migrada a `useListParams` (búsqueda debounce + orden + filtros EN LA URL, compartible), filtros-chip de Prioridad y Comercializadora (derivadas de datos reales) + desplegables de Mes de vencimiento y Estado, todos combinables. Export Excel ahora saca el conjunto FILTRADO completo en el orden visible (antes re-consultaba servidor ignorando búsqueda/cia/mes). NOTA DE CADUCIDAD escrita en código (junto a LISTA_PAGE_SIZE) y en MEJORAS_UI_BACKLOG.md: patrón carga completa caduca a ~2.000-3.000 filas vivas → vista SQL base-20 obligatoria. Doc RAG actualizada (sección Filtros-chip y export). CAMBIOS INTENCIONADOS declarados al auditor: (1) filtros estado/prioridad pasan a client-side sobre el conjunto completo — ARREGLA inconsistencia: el badge Vigente/Histórico se calculaba sobre el conjunto filtrado, ahora siempre sobre el total; (2) Limpiar resetea también el orden; (3) búsqueda a la URL con debounce 300ms. El filtro de mes INCLUYE vencidas de ese mes (las 4 de PAZ Y BIEN no desaparecen). tsc 0 + 195 tests + solo 3 ficheros. ✅ PASEO DEL AUDITOR: PASA (22-jul, cuadre completo en actas Drive) — 2/5 CON DoD COMPLETO. DERIVADAS del paseo: (1) cache-busting: /renovaciones sirvió bundle viejo tras deploy (blanco hasta hard reload) → entrada S en backlog (headers Cloudflare Pages / versionado chunks Vite); (2) 4ª congelación renderer ~30s al clicar chips, mismo patrón lista→transición → expediente PR-4.3 (4 casos); capturar profile barato en PR-2.3 si sale gratis. SIGUIENTE: PR-2.3 Contratos ídem (el más crudo: useContratos sin paginación, filtro estado client-side). GATE V2 viernes 24-jul. Detalle: `.cowork/outbox/2026-07-22T15-30-00-cierre-pr22.md`.**

> **Estado previo: 2026-07-21b — 🟢 SEMANA 2 "LISTAS QUE TRABAJAN" ARRANCADA: GATE V1 CIERRA + PR-2.1 MERGEADO (#72, squash 4f36b7d). (1) Gate V1 CIERRA (veredicto del auditor commiteado en el plan, 11756ab): T1 en los 5 clientes, 3-5s, cero callejones; semana 1 sellada 5/5 con 3 días de adelanto. (2) Replanificación ligera cerrada con el auditor: semana 2 = PR-2.1→2.5 sin ampliar; decisión (a) para Renovaciones (mantiene carga completa ~504 filas + componente único) con CONDICIÓN DE CADUCIDAD escrita: el patrón caduca a ~2.000-3.000 filas vivas → vista SQL con cálculo base-20 obligatoria (anotar en código en PR-2.2 + backlog); mejoras del gate coladas sin ampliar: "⚠ N vencidas" → PR-2.4, "— · N sin fecha" → PR-2.5; CA auditor: CSV de PR-2.2 exporta el conjunto FILTRADO (no la página), KPIs PR-2.4 = "tarjetas = el SQL del día", 4 críticas VENCIDAS de PAZ Y BIEN en 'detectada' visibles en la bandeja, 3 BASSOLS sin fecha de CHEMTROL semilla de PR-2.5. (3) PR-2.1 componente de lista único MERGEADO como regresión pura de Empresas: NUEVOS src/core/hooks/useListParams.ts (URL única q/sort/dir/page/filtros, debounce 300ms cancelable, reset a pág 1), src/core/components/SortableTh.tsx y TableStateRows.tsx (cargando/error con reintento/vacío honesto); EmpresasPage 325→272 líneas consumiendo las 3 piezas, cero cambios de comportamiento (único intencionado: debounce ahora cancela timers — una escritura de URL por pausa ≥300ms). tsc 0 + 195 tests + solo 4 ficheros en el diff. Sin doc RAG (no hay feature visible). ✅ PASEO DEL AUDITOR: PASA (21-jul, tarde) — búsqueda DERAZA con URL solo término final (?q=DERAZA&page=1); orden por NIF OK; URL en frío ?sort=nombre&dir=desc&page=2 restaura estado exacto (235 empresas en total); DERAZA UNA sola vez en la lista global (fusión limpia también desde UI). PR-2.1 con DoD COMPLETO: 1/5 de semana 2. SIGUIENTE: PR-2.2 Renovaciones sobre el componente (filtros-chip + export CSV + nota de caducidad). GATE V2 viernes 24-jul: 3 preguntas de negocio de Juan respondidas desde la UI en <30s, cronometradas.**

> **Estado previo: 2026-07-21 — ✅ SEMANA 1: 5/5 SELLADA + FUSIÓN DERAZA + GATE V1 HOY. (1) PR-1.5 mergeado (#71, cd5ca54) y paseado → semana 1 COMPLETA con 3 días de adelanto. (2) S0.2 sellado por el auditor: cron `datadis-consumos-nightly` (jobid 6, 03:30 UTC, Vault); SQL de referencia en `supabase/migrations/_MANUAL_cron_datadis_consumos.sql`; queda S0.2-bis no bloqueante. (3) FUSIÓN DERAZA ejecutada con OK de Juan: 3 fichas con NIF correlativos 805/806/807 — checksum CIF válido SOLO B45728805; repunte 2 CUPS+2 contratos+2 renov a canónica, nombre con tilde, soft-delete de las 2 fabricadas; post: 5 CUPS/10 contratos/10 renov/2 incid. DERIVADA workstream datos: auditar `empresas` por NIFs con checksum inválido (la carga Fase 1 pudo fabricar más). (4) Juan decide: GATE V1 ADELANTADO A HOY — paseo 5 clientes cronometrado por el auditor, veredicto por escrito en el plan. Detalle: `.cowork/outbox/2026-07-21T14-00-00-fusion-deraza-gate-hoy.md`.**

> **Estado previo: 2026-07-20 — 📅 SEMANA 1 CRM ÚTIL: PR-1.5 CODIFICADO (el último, 5/5 al mergear). (1) Auditoría previa de curvas: la fuente REAL es `datadis_consumptions` (42.923 filas, 3 CUPS con curva: CHEMTROL …774JW hasta 14-jul-26 🟢, …SA0F hasta 13-jul-26 🟢, PAZ Y BIEN …DG0F hasta 31-jul-25 🟡 parcial — el del cron); `datadis_consumos_cache` vacía; vista `v_datadis_consumos_cursor` SIN grant a authenticated (no usable desde frontend, no hizo falta); RLS OK para authenticated select. (2) PR-1.5 (~105 líneas, AMPLÍA, no crea): `fetchCurvaUltimaFecha` en `suministros/api.ts` (1 query ligera por CUPS, solo pestaña de empresa), columna "Curva" opcional en `SuministrosTable` (🟢 al día ≤45d / 🟡 parcial con fecha / "—" honesto), `SuministrosTab` reescrito (curva + panel rojo de incidencias Datadis reutilizando `useDatadisIncidencias` + skeleton), doc RAG `ver-suministros.md`. CA: CHEMTROL …774JW 🟢; Bidafarma 34 CUPS todos "—". (3) HALLAZGOS: ⚠️ DERAZA TRIPLICADA en empresas (con/sin tilde; 3+2+0 CUPS, 2 incidencias) y es cliente del gate del viernes → decidir canónica ANTES; seguridad: `anon` con grants completos en `datadis_consumptions` (RLS bloquea, pero revocar grants como Fase 0.3b). (4) Vacuna git aplicada: `git config pull.ff only` tras 4º atasco vim. PENDIENTE Juan: tsc+tests, rama `claude/pr-1-5-suministros-curva`, commits+PR. GATE V1: viernes 24-jul.**

> **Estado previo: 2026-07-17 — 📅 SEMANA 1 CRM ÚTIL, DÍA 1: CRUCE DOC2↔BACKLOG CERRADO + PR-1.1 CODIFICADO. (1) Cruce DOC2 (sección nueva en `docs/MEJORAS_UI_BACKLOG.md`): semana 1 queda CERRADA como en el plan (PR-1.1→1.5, sin ampliar). Buscador global multi-entidad → YA EXISTE (`GlobalSearch.tsx`); mejora incremental a backlog v2. Alta por factura → anotada como semilla del asistente PR-3.2 (semana 3). Resto DOC2: #4 cubierto por semanas 2/4, #1/#2 con la rama SIPS aparcada, P1/P2 a backlog v2. (2) PR-1.1 cabecera ficha 360º CODIFICADO (~170 líneas): hook `useEmpresaCabecera` en `src/features/empresas/api.ts` (contratos activos, próxima renovación+prioridad, incidencias Datadis, comercial — 4 queries paralelas, solo lectura), componente `components/EmpresaCabecera.tsx` (chips + skeleton + alarma roja que abre tab Suministros), cableado en `EmpresaDetailPage.tsx`, doc RAG `docs/help/empresas/cabecera-ficha-empresa.md`. (3) CA verificado por SQL en producción: CHEMTROL A28429348 / 9 activos / renov 2026-10-14 media / 0 incid; PAZ Y BIEN G41065566 / Juan Olivares / 32 activos / 2027-04-13 baja / 6 incidencias; BLUENET A91144360 / 18 activos / sin renovación futura ("—" honesto) / 0 incid. (4) TARDE: PR-1.1 CERRADO — PR #67 mergeado (squash 8c96177), tsc 0 + 195 tests, CI 4/4, Cloudflare desplegado, paseo formal INDEPENDIENTE del auditor PASA (cronómetro 3-4s < 10s del gate). **1/5 de la semana.** 3 observaciones menores registradas en outbox (congelación puntual→PR-4.3; persistencia de pestaña=accidente aceptado como decisión+mejora S backlog; "Sin tipo" dato maestro). (5) PR-1.2 CODIFICADO (~110 líneas): hook `useContratosPorEmpresa` (contratos+CUPS embebidos) en `contratos/api.ts`, `empresas/components/ContratosTab.tsx` (tabla comercializadora/CUPS/EstadoBadge/fechas, fila→/contratos/:id, skeleton+vacío honesto), wire tab en `EmpresaDetailPage`, doc RAG `docs/help/empresas/pestana-contratos.md`. CA cuadrado por SQL: CHEMTROL 9 activos = 6 NEXUS (fin 14/10/2026) + 3 BASSOLS SIN fecha_fin (deben pintar "—"), 1 CUPS cada uno. (6) PR-1.2 CERRADO — PR #68 mergeado (2f0b220), paseo formal independiente PASA, **2/5**; 4 anotaciones del paseo verificadas en código y registradas (`.cowork/outbox/2026-07-17T13-00-00-cierre-pr12-anotaciones.md`). (7) PR-1.3 CODIFICADO (~205 líneas): `useRenovacionViva` en `renovaciones/api.ts`, `empresas/components/RenovacionesTab.tsx` (prioridad de `renovaciones.prioridad` FUENTE ÚNICA, badge Vigente/Histórico por rotación regla base-20, fila→contrato), tab en `EmpresaDetailPage`, UNIFICACIÓN en `ContratoDetailPage` (lee renovación viva; fallback calcPrioridad etiquetado "estimada"; fix "(0d)" con fecha null), doc RAG `docs/help/empresas/pestana-renovaciones.md`. CA cuadrado doble (Cowork+auditor): BLUENET 18 alta/detectada/"—"; CHEMTROL 6 media 14/10/2026 + 3 alta sin fecha. (8) PR-1.3 CERRADO — PR #69 mergeado (6fe99e0), tsc 0 + 195 tests, paseo formal independiente PASA en los 6 puntos (BLUENET 18, CHEMTROL 6+3, PAZ Y BIEN 36 con 4 críticas vencidas arriba, discrepancia de prioridad MUERTA: NEXUS Baja→Media y BASSOLS Crítica→Alta, "estimada" OK, "(0d)" extinto, días negativos honestos "-100d"). **3/5 A JUEVES.** Nuevas anotaciones: 3ª congelación renderer (~30s, SIEMPRE en transición lista→detalle — expediente PR-4.3 con 3 casos); cosmética tabla CUPS del detalle (Estado+Dirección juntos) a backlog; "⚠ N vencidas" en chip cabecera CONFIRMADO como mejora tras verlo pintado (backlog S). Hallazgo datos: 4 críticas vencidas de PAZ Y BIEN en "detectada" sin gestionar → cauce remediación 123 renovaciones. QUEDAN: PR-1.4 (empresa clicable universal) + PR-1.5 (suministros esqueleto) → gate V1 viernes 24-jul (5 clientes: CHEMTROL, PAZ Y BIEN, BLUENET, DERAZA, Bidafarma). Incidencias git del día (2 vim por pull en rama vieja + locks): añadido `git checkout main` explícito al checkpoint estándar. (9) PR-1.4 CODIFICADO (~40 líneas): empresa clicable universal — `Link` a `/empresas/:id` en Renovaciones (tabla+tarjeta móvil) e Incidencias (tabla+tarjeta); Contratos YA enlazaba (verificado, sin tocar). Doc RAG: líneas añadidas a `gestionar-renovaciones.md` y `registrar-incidencia.md`. H4 verificado limpio en ambos ficheros. (10) PR-1.4 CERRADO — mergeado y desplegado, paseo formal independiente PASA: **4/5 A JUEVES**. Verificaciones: Renovaciones→ficha OK (1 clic, sin buscador), regresión Contratos OK (SURGLASS, cabecera 360º con "Sin NIF" honesto), Incidencias ✓ por código (tabla con 0 filas en prod, no hay enlace paseable), tarjeta móvil ✓ por código (resize no forzó layout). Circuito completo cronometrado: buscador→ficha 3-4s, pestaña 2s, fila→contrato 3s — muy bajo el umbral <10s del gate. KPIs /renovaciones cuadran con BBDD: 504/503 activas/20 críticas/1 perdida. QUEDA: **PR-1.5 Suministros esqueleto** (datadis_sincronizado, incidencias, "curva disponible sí/no" 🟡 honesto; CA: CHEMTROL ...774JW "curva disponible", Bidafarma vacío honesto) → semana cerrada antes del gate V1 del viernes.**

> **Estado previo: 2026-07-16 — 🧹 DÍA 0 DEL MES "CRM ÚTIL": LIMPIEZA COMPLETA + PLAN COMMITEADO. (1) Working tree a CERO: paquete SIPS F1 (feature+EF+cableado menú/permisos+doc RAG) commiteado a rama `claude/f1-sips-cups` (dff0ece, pusheada, actualizada a main); docs/outbox/backlog/draft SQL canales a main (5001b2f); scripts APLICAR_*.ps1 obsoletos borrados. (2) PODA de ramas locales: de ~74 a 4 — quedan `main`, `claude/energia-v2-s0` (energía S0.2 activo), `claude/f1-sips-cups` (SIPS aparcado) y `claude/holded-integration` (única con trabajo no mergeado, se conserva para módulo comisiones). Resto verificado como squash-merged o cascarón y borrado. (3) Plan del mes commiteado: `docs/PLAN_CRM_UTIL_4SEMANAS.md` (6ef9de3) — 4 semanas, 5 trabajos (T1-T5), gates de viernes. (4) Entregables junio al repo: `docs/analisis_plataformas_junio/` DOC1+DOC2+DOC4+PLAN_TELEMEDIDA (d3e27d4). SIGUIENTE: cruzar DOC2 con el backlog (única re-priorización admitida) y arrancar PR-1.1 (cabecera ficha 360º).**

> **Estado previo: 2026-07-10 — 🔧 DATADIS: FIX EMPAREJAMIENTO CUPS + ALARMA DE INCIDENCIAS EN DASHBOARD. Auditoría completa: de 246 empresas, 18 están autorizadas a Valere en Datadis; 83 CUPS sincronizados en 18 empresas. (1) BUG corregido en `datadis-sync` (v8): emparejaba CUPS por 22 chars y fallaba cuando el CRM guardaba el código con frontera (p.ej. REAL CANOE, DERAZA). Ahora empareja por los 20 chars BASE → REAL CANOE y el CUPS de DERAZA ya sincronizan; queda permanente para nuevos clientes. (2) NUEVA tabla `datadis_incidencias` (migración `20260710_datadis_incidencias.sql`, RLS) que el worker rellena en cada run (autorreparable): `cups_falta_en_crm` (Datadis autoriza un CUPS que el CRM no tiene) y `cups_no_coincide` (empresa autorizada pero ningún CUPS del CRM cuadra, p.ej. SOCOESREMA). (3) NUEVA alarma en Dashboard `IncidenciasDatadisCard` (roja/naranja, persistente hasta corregir) → al pinchar lleva a `/empresas/:id?tab=suministros`. Ficheros: `src/features/datadis/incidencias.api.ts`, `src/features/dashboard/components/IncidenciasDatadisCard.tsx`, wire en `DashboardPage.tsx`, `EmpresaDetailPage.tsx` (abre pestaña vía `?tab=`). Doc RAG `docs/help/datadis/incidencias-datos.md`. Estado incidencias vivas: 11 CUPS por dar de alta + 1 no coincide (SOCOESREMA). PENDIENTE Juan: `npx tsc --noEmit` + `npm test` en su terminal (el mount del sandbox sirve copias obsoletas y da falsos errores), commit + PR. Detalle: `.cowork/outbox/2026-07-10T09-00-00-datadis-fix-cups-y-alarma-incidencias.md`.**

> **Estado previo: 2026-07-09b — ✅ DATADIS SINCRONIZACIÓN PARTNER CERRADA EN PRODUCCIÓN. PR #63 MERGEADO a main (worker `datadis-sync` v7, modelo authorizedNif). Función temporal `datadis-diag-temp` borrada del dashboard. Cron nocturno 05:15 UTC operativo con la cuenta partner de Valere (B10759520): 75 CUPS en 13 empresas sincronizados, integridad auditada (0 vínculos rotos, campos comerciales protegidos). Los clientes con 403/404 se incorporan solos al firmar su autorización. Reconciliación pendiente (no urgente): CUPS autorizados en Datadis que el CRM no tiene → reportados en `sin_match_en_crm`, alta con staging. Detalle: `.cowork/outbox/2026-07-09T07-00-00-datadis-partner-resuelto.md`.**

> **Estado previo: 2026-07-09 — 📡 DATADIS SINCRONIZACIÓN PARTNER RESUELTA. Juan cambió los secrets a la cuenta partner de Valere (B10759520). Descubierto y verificado en vivo: el modelo correcto es BUCLE POR NIF (`get-supplies?authorizedNif=<NIF>`), NO el agregado (que devuelve "No supplies" porque Valere no posee CUPS propios). `authorizedNif` ahora funciona (antes 403 por usar cuenta CHEMTROL). Worker `datadis-sync` REESCRITO al modelo authorizedNif (batches de 4, dry_run default, x-cron-secret vía RPC), desplegado v7, repo `supabase/functions/datadis-sync/index.ts` actualizado (PENDIENTE COMMIT rama claude/ui-renovaciones-cups). El cron nocturno 05:15 UTC ya sincronizó 75 CUPS en 13 empresas (PAZ Y BIEN 30, BLUENET 19, CHEMTROL 13, +10 pymes). Integridad auditada: 75/75 con distribuidora+cod+tipo_punto, 0 vínculos rotos, campos comerciales del libro/Potencias protegidos. v7 reverificado end-to-end. Reconciliación pendiente (no urgente): CUPS autorizados en Datadis que el CRM no tiene → worker los reporta en `sin_match_en_crm`, alta con staging. Clientes 403/404 se sincronizan solos al tramitar su autorización. PENDIENTE OPERATIVO: commit worker v7 + borrar `datadis-diag-temp` (neutralizada v15, 410). Detalle: `.cowork/outbox/2026-07-09T07-00-00-datadis-partner-resuelto.md`.**

> **Estado previo: 2026-07-06 — 🎨 WORKSTREAM MEJORAS UI ARRANCADO (mejora continua, no fase). Backlog creado: `docs/MEJORAS_UI_BACKLOG.md`. Paquete v1 EMPRESAS CODIFICADO (pendiente terminal Juan: `APLICAR_UI_EMPRESAS_V1.ps1` → rama `claude/ui-empresas-presentacion` → PR): sin columna Segmento, ordenación por encabezados (asc/desc en URL), tipos legibles (CCPP, +Residencial en UI — ⚠️ CHECK BBDD pendiente), columna Comercial con desplegable inline (user_profiles → empresas.comercial_id, sync react-query), paginación completa reutilizable (`core/components/Pagination.tsx`: ⏮⏭, números con elipsis, salto directo). Doc RAG nueva `docs/help/empresas/listado-empresas.md`. TAREAS DERIVADAS: (1) SQL ampliar CHECK `empresas.tipo` += 'residencial'; (2) datos: backfill tipo y ciudad de empresas existentes; (3) modelado "canales" (no existen en esquema); (4) futura: alta empresa con PDF/Excel + extracción IA (Edge Function). Detalle: `docs/SESIONES/2026-07-06-resumen-ui-empresas.md`.**

> **Estado previo: 2026-07-05 — 🚀 FASE 1 CARGADA EN PRODUCCIÓN: 566 filas del libro de ventas → 542 contratos + 24 rechazos (cuadre exacto, doble OK Juan+auditor). +215 empresas, +349 CUPS (453 total), 507 renovaciones con prioridades (24 críticas, campaña migración Esmiluz 22). Staging certificado en BBDD (staging_fase1_*). Expediente en Drive/BACKUP CRM VALERE. Detalle: .cowork/outbox/2026-07-05T16-10-00-fase1-carga-completada.md. Pendiente: verificación frontend + re-auditoría + filtro Sin fecha.**

> **Última actualización: 2026-07-04 — 📡 FASE 2 TELEMETRÍA Y AUDITORÍA DE ENLACES: los 3 objetivos cumplidos y EN PRODUCCIÓN. (1) Telemetría viva: PR #55 mergeado (squash 36b1f16) — `telemetry.ts` reescrito (batching 20ev/30s/pagehide keepalive, Bearer vivo vía onAuthStateChange [E1], dedupe 5/firma, REST directo anti-bucle, queries lentas >3s), wrapper `telemetryFetch` en client.ts, `TelemetryTracker` en App.tsx, `trackErrorBoundary`. Verificado por auditoría externa contra `client_telemetry` con evidencia positiva en las 5 rutas de captura (18+ eventos, 400 forzado con UUID no parseable, error JS de test). (2) Inventario: `docs/AUDITORIA_ENLACES_FASE2.md` aprobado, con A1 (externos limpios; riesgo residual pdf_url en BBDD) y A2 (la clase query params entera era H1). (3) Arreglos: PR #56 mergeado (61665b5) — H1 filtro `estado` en ContratosPage + chip, H5 `NotFoundPage` con evento `custom ruta_no_encontrada` (adiós catch-all silencioso), H6 `EntidadNoEncontrada` en empresas/contratos/expedientes con evento `entidad_no_encontrada`; ambas huellas verificadas en tabla. INCIDENTES: H4 (commit c809ef4 arrastró 2 líneas SIPS de App.tsx sin sus ficheros → fix 56577cb; lección: diffear contra main los ficheros compartidos antes de commit) y locks `.git` por sandbox (resueltos por PowerShell). PENDIENTE CIERRE FASE: unos días de uso real (H3, ranking de errores por ruta), regenerar copia Drive del inventario, informe de cierre 8 secciones. TAREAS DERIVADAS: E2 (revocar DELETE/TRUNCATE de authenticated sobre client_telemetry, ventana BBDD) + SQL pdf_url LIKE '%vercel%' + idea botón "informar de un problema" (event_type reported_incident libre). Detalle: `docs/SESIONES/2026-07-04-resumen-f2.md`.**

> **Ãšltima actualizaciÃ³n: 2026-07-03 â€” ðŸ” SIPS F1 BUSCADOR DE CUPS CABLEADO (rama `claude/f1-sips-cups`, rebuild limpio desde main). EF `resolver-sips-cups` DESPLEGADA (orquesta `datadis-proxy` v13). Pantalla `/buscador-cups` con ruta + menÃº CRM Comercial + permiso asesor_senior. Doc RAG `docs/help/datadis/buscador-cups.md`. Pendiente: autorrelleno `sipsToAutofill` DIFERIDO a Suministros iteraciÃ³n 2 (no hay form de alta de CUPS comercial). Detalle: `.cowork/outbox/*-sips-f1-buscador-cableado.md`.**

> **Última actualización: 2026-07-02c — 🔐 RESET DE CONTRASEÑA COMPLETADO Y DESPLEGADO. Edge Function `send-password-reset` (Deno) DESPLEGADA y ACTIVE (v1, verify_jwt=false): genera recovery link con `auth.admin.generateLink` y lo envía por **Resend** (reutiliza RESEND_API_KEY; NO usa el SMTP por defecto de Supabase ni hizo falta configurarlo). `ForgotPasswordPage` ya la invoca. Probado end-to-end: POST 200, logs sin error, correo enviado a jolivares@valereconsultores.com. Redirect URL ya cubierto por comodines en Supabase (`.../pages.dev/**`). Ficheros en `supabase/functions/send-password-reset/` + `ForgotPasswordPage.tsx`, commiteados en rama `claude/suministros-comercial` (commit bc371cd). SOLO PENDIENTE: mergear el PR de esa rama a main + redeploy Cloudflare para que el frontend quede activo. SIPS F1 respaldado en rama `claude/sips-f1` (WIP, NO mergear). Detalle: `.cowork/outbox/2026-07-02T13-35-30-reset-password-via-resend.md`.**

> **Estado previo: 2026-07-02b — ⚡ MÓDULO SUMINISTROS EN CRM COMERCIAL (rama pendiente `claude/suministros-comercial`, SIN commit — verificación tsc/tests + commit en terminal de Juan). Los CUPS solo se veían en Potencias; ahora se exponen en comercial sin crear datos (solo lee `cups`). Nueva feature `src/features/suministros/` (api + `SuministrosTable` reutilizable + `SuministrosTab` para ficha empresa + `SuministrosPage` global). Cableado: ruta `/suministros` en App.tsx, pestaña «⚡ Suministros» en `EmpresaDetailPage`, ítem de menú en `Sidebar` (crmItems), whitelist `asesor_senior` en `permissions.ts`. Doc RAG `docs/help/suministros/ver-suministros.md`. Sandbox tsc: 0 errores en la feature nueva (resto = falsos por mount/BOM). Detalle en `.cowork/outbox/2026-07-02T12-50-48-modulo-suministros-comercial.md`. TAMBIÉN esta sesión: cargados grupo Chemtrol (Chemtrol 15 CUPS incl. gas, Sierra Mayor completada, Bluenet 16 CUPS) y vinculadas plantas FV (Cortijo El Cabril, Bluenet→CUPS ...018MH autoconsumo con excedentes por CTA e-distribución).**

> **Estado previo: 2026-07-02 — 🔐 FLUJO PÚBLICO DE RECUPERAR CONTRASEÑA (rama pendiente `claude/auth-reset-password`). Detectado que el CRM no tenía reset de contraseña (Julia / soporte@valereconsultores.com bloqueada; logs de auth mostraban logins fallidos + re-registro 422). Implementado en código (SIN commit — verificación tsc/tests + commit en terminal de Juan por el gotcha del mount): `ForgotPasswordPage` (ruta pública `/forgot-password`) y `ResetPasswordPage` (`/reset-password`), enlace «¿Olvidaste tu contraseña?» en `LoginPage`, rutas en `App.tsx` (fuera de AuthGuard), mensaje de `SignupPage` actualizado. Doc RAG nueva `docs/help/auth/recuperar-contrasena.md`. PENDIENTE Supabase Dashboard: añadir Redirect URL `https://valere-v2.pages.dev/reset-password` (+ localhost), y sobre todo configurar SMTP propio (Resend) para que los emails de reset se entreguen. Detalle y comandos en `.cowork/outbox/2026-07-02T11-30-08-flujo-reset-password.md`.**

> **Estado previo: 2026-06-30 — 🟢 MÓDULO DATADIS AUTORIZACIONES, FASE 1 IMPLEMENTADA (rama `claude/datadis-autorizaciones`). (1) Migración SQL aplicada en producción vía conector (plan gratuito, sin branch): columna `contactos.dni` + tabla `datadis_autorizaciones` (RLS patrón datadis_tokens, trigger set_updated_at, 4 índices, CHECK estados/alcance/calidad/método). Fichero `supabase/migrations/20260627_datadis_autorizaciones.sql`, commit `ef012f6` en main. (2) Edge Function `datadis-generar-autorizacion` DESPLEGADA y ACTIVE (verify_jwt): valida 4 datos críticos (razón social, CIF, firmante+DNI, ≥1 CUPS) y si faltan devuelve lista de qué/dónde completar; genera PDF plantilla Valere autorrellenado (premarca "todos los CUPS"+"Sí", mapea cargo→calidad firmante), sube a Storage bucket documentos, registra en documentos + crea autorización estado=generada. (3) Frontend: `src/features/datadis/autorizaciones.api.ts` + `components/DatadisAutorizacionesTab.tsx` + tab "Datadis" en ficha empresa (botón generar + panel "Faltan datos" con enlaces + lista con estados). TSC 0 en sandbox (tests pendientes de correr en terminal Juan: sandbox no ejecuta vitest por binario rollup linux). Commits EF: `379f84b`. Pendiente: correr tests + commit del frontend + abrir PR. Dato: ninguna empresa tiene aún firmante con DNI → la validación lo exigirá. Ver `docs/PLAN_MODULO_DATADIS_AUTORIZACIONES.md` y `docs/SESIONES/2026-06-30-resumen.md`.**

> **Estado previo: 2026-06-26 — 🟢 HITO DATADIS PARTNER: convenio de Partner FIRMADO por ambas partes + ✅ ACCESO VERIFICADO EN PLATAFORMA. Datadis confirmó por email (Adrián, dpo@datadis.es, 26-jun 09:35) que el partner ya estaba activo. Verificado en vivo en datadis.es (login como B10759520): el perfil Partner está OPERATIVO — en "Suministros de terceros" aparece la nueva pestaña con sello «datadis partner» → "Alta usuario" (Registro de nuevo usuario: Particulares y autónomos / Organizaciones), que permite dar de alta clientes SIN cuenta en Datadis a partir de su autorización firmada. Confirmado también: API privada/agregada documentada y accesible (URL base https://datadis.es/, auth por token, endpoints Supplies/Contracts/ConsumptionsKWh/MaxPower, datos propios + de terceros autorizados + agregados). Autorización previa A28429348 - CHEMTROL ESPAÑOLA SA · 14 CUPS sigue PENDIENTE (espera aceptación del titular). Origen: gestión por email + verificación Chrome (no toca repo). Pendiente: (1) montar Vía A en CRM (PDF autorización autorrellenado + archivo en empresa); (2) mover authenticate() de src/core/services/datadis.ts a Edge Function (credenciales fuera del cliente); (3) carga agregada por lotes (formato a confirmar con Datadis); (4) protocolo de auditorías Datadis (2/año); (5) carpeta Drive `Datadis Partner/` + onboarding Julia. Ver `docs/SESIONES/2026-06-26-resumen.md`.**

> **Estado previo: 2026-06-18 — Sprint Carolina Calendario Capa A desplegado en producción (commit e2c1445). Tab "Calendario" en /captacion con drag&drop bidireccional ficha↔calendario. 3 fixes BD aplicados directamente (RLS notificaciones, color en eventos, master visibility en v_mis_oportunidades). Ver `docs/SESIONES/2026-06-18-resumen.md` y `.cowork/outbox/2026-06-18T20-00-00-...md` para detalle. Pendiente: P2 cosméticos + Capa B Google Calendar (requiere OAuth setup por Juan).**

> **Estado previo: 2026-06-19e — FASE 1 TAREA 1/6 implementada y mergeada (PR #47): 3 pestañas mock conectadas a Supabase real. tsc 0, 195 tests. Revisado Browser OK. Pendiente tareas 2-6.**

## SESION 2026-06-19e (Cowork) -- FASE 1 TAREA 1: CONECTAR 3 PESTANAS A SUPABASE

> Implementada desde Cowork (no Desktop, sin acceso). Metodo: scripts .py via PowerShell.

### Hecho (PR #47, commit cfd3cc9) -- revisado por Browser, aprobado
- api.ts: 3 hooks. useComparativaExcedentes (fv_kpi_diario.excedente_kwh real; Datadis=null; sin medidor->sin_datos). useInformesMensuales (fv_informe_mensual). useIncidenciasFV ([] FxIncidencia, empty state).
- SeguimientoFVPage.tsx: sin FIXTURE_COMPARATIVA/INCIDENCIAS/INFORMES. Tambien limpia bloques mock del Resumen.
- tsc 0 errores, 195 tests. Punto rojo #1 (cero mock) cumplido.

### DEUDA anotada (corregir en tareas 2-6)
- excedente_fv_kwh devuelve 0 en plantas sin medidor; deberia ser null (prompt: nunca 0 inventado). La UI usa estado=sin_datos, pero el dato es inconsistente. Corregir al construir ExcedentesTab real.
- useIncidenciasFV importa FxIncidencia desde fixtures.ts; mover el tipo a un types.ts del modulo (acoplamiento).

### PENDIENTE Fase 1 (tareas 2-6)
- [ ] Tarea 2: Centro de Operaciones del dia.
- [ ] Tarea 3: Alarmas FV gestionables (mapeo alarma->incidencia, enums).
- [ ] Tarea 4: Detalle por planta + notas (fv_planta_nota).
- [ ] Tarea 5: Frescura (constante unica verde<6h/ambar 6-24h/rojo>24h).
- [ ] Tarea 6: KPIs/badges Resumen derivados de queries; normalizar estados.
- Revisar cada PR con docs/CHECKLIST_REVISION_PR_DESKTOP_FASE1.md.

### No bloqueante
- compra_red_kwh NULL (revisar mainsUsePower v1). day-real-kpi 503 (intradia).

---


> **Ultima actualizacion: 2026-06-19c - Auditoria pre-Desktop MVP FV: Produccion/Excedentes ya muestran balance real; las 3 pestanas mock siguen pendientes. Prompt MVP v3 coherente (sin contradicciones energy-balance), listo para lanzar Fase 1.**

## SESION 2026-06-19c (Cowork) -- AUDITORIA PRE-DESKTOP MVP FV

> Re-auditoria en vivo del despliegue actual antes de lanzar la Fase 1 en Claude Desktop.

### Mejoras ya visibles en el CRM
- Resumen muestra las 12 plantas reales, incluidas las 5 sin asignar. Badge "Sin asignar" = 5.
- Potencia agregada (287.1 kW) y energia mensual (44 MWh) reflejan datos reales coherentes.
- Produccion ya refleja el fix de energy-balance (PR #42):
  - Plantas con medidor (JUAN RUBIO CASA, 2026-06-17): consumo 368.9 kWh, excedente 312.9 kWh, autoconsumo 79%, grafico 3 series.
  - Plantas sin medidor (FOAM JAEN): "Sin medidor de consumo en esta planta", campos en "--", sin error.

### Pendiente confirmado: Fase 1 aun NO implementada
- Excedentes/Datadis, Incidencias CRM e Informes siguen usando fixtures/mock.
- Verificado por red: esas pestanas NO disparan queries a Supabase (fv_kpi_diario, incidencias, fv_informe_mensual).
- Siguen apareciendo plantas ficticias (Industrias Perez, MercaVal, Garcia Logistica, Panificadora Norte, Coop. Agricola), tambien en bloques del Resumen ("Incidencias abiertas", "Comparativa FV vs Datadis").

### Prompt MVP v3 coherente (un solo bloque)
- energy-balance ya NO bloqueado; Excedentes usa fv_kpi_diario.excedente_kwh real; Produccion diaria usa fv_kpi_diario.
- Siguen bloqueados: Datadis completo (cruce CUPS) y curva intradia (day-real-kpi 503).
- docs/ACTUALIZACION_PREVIA_PROMPT_MVP_FV.md marcado obsoleto (ya integrado, no pegar). Pegar SOLO docs/PROMPT_MVP_FV_para_Desktop.md.

### PENDIENTE
- [ ] Lanzar prompt v3 unico en Claude Desktop -> Fase 1.
- [ ] Re-auditar tras despliegue: mock fuera, Excedentes con excedente_kwh, Incidencias real/empty, Informes con fv_informe_mensual, Centro Operaciones, alarmas gestionables, frescura, KPIs reales.
- [ ] (menor) compra_red_kwh NULL: revisar mainsUsePower en v1.
- [ ] (no bloqueante) day-real-kpi 503 = curva intradia.

---

> **Ultima actualizacion: 2026-06-19 - energy-balance RESUELTO (PR #42): era endpoint v3 roto en EU5, fix v1. Consumo/excedente reales pueblan fv_kpi_diario. Produccion/Excedentes del MVP YA NO bloqueados.**

## SESION 2026-06-19 (Cowork) -- FIX energy-balance HTTP 500 (v3->v1)

> Frente tecnico del MVP FV. El endpoint energy-balance daba HTTP 500 para todas las plantas. Resuelto: era la version del endpoint.

### Diagnostico y fix (3 PRs)
- PR #40: probado anadir timeZoneStr=Europe/Madrid + nonce. NO era la causa (500 persistia).
- PR #41: diagnostico temporal de variantes (flag FV_DIAG_EB + input diag_eb workflow). Sondeo confirmo: v3 GET=500, v1 GET=200 con todos los datos, v2 GET=200, POST=405.
- PR #42: FIX DEFINITIVO. _ENERGY_BALANCE v3->v1 en fusionsolar_client.py. Eliminado el diagnostico temporal.

### Verificado (run FV Sync 27691355853, 2026-06-19)
energy-balance OK para todas las plantas con datos reales: NE=137303012 consumo=368.86 excedente=312.9; NE=197303554 consumo=4487 excedente=941; NE=177242135 consumo=2115 excedente=2320; etc. Cero ROA_EXFRAME. excedente=None en alguna planta es legitimo (no reporta vertido -> NULL).

### IMPACTO en el MVP
Las columnas consumo_kwh/autoconsumo_kwh/excedente_kwh/compra_red_kwh de fv_kpi_diario YA SE POBLAN. La pestana Excedentes del MVP puede conectarse a datos REALES desde fv_kpi_diario.excedente_kwh (ya NO empty state). Actualizado docs/PROMPT_MVP_FV_para_Desktop.md en consecuencia.

### PENDIENTE FV (no bloqueante)
- [ ] day-real-kpi 503/WAF = curva intradia (fv_produccion_intradia no existe). OTRO endpoint, sigue bloqueado pero NO bloquea Produccion (datos diarios si llegan).
- [ ] Lanzar MVP fase 1 en Claude Desktop.

---


> **Ultima actualizacion: 2026-06-18b - Prompt MVP FV v2 FINAL + migracion fv_planta_nota versionada (commit d9401af, PR pendiente merge). Esquema/enums incidencias verificados. Listo para Desktop fase 1.**

## SESION 2026-06-18b (Cowork) -- PROMPT MVP FV v2 FINAL + VERSIONAR MIGRACION

> Prompt para Desktop afinado con 4 correcciones verificadas contra el esquema real. Detectado y corregido que la migracion fv_planta_nota estaba en prod pero NO versionada en repo.

### Correcciones incrustadas (verificadas via MCP)
- Badges/contadores de queries reales: asignadas=empresa_id NOT NULL, sin asignar=empresa_id NULL, total=suma. 7+5=12.
- Frescura: constante unica verde<6h / ambar 6-24h / rojo >24h o sin dato, sobre fv_kpi_realtime.actualizado_en.
- Mapeo alarma->incidencia con enums REALES: severidad->prioridad (critica->critica, mayor->alta, menor->media, aviso->baja); estado inicial 'abierta'; si falta empresa_id NO inserta.
- HALLAZGO: enum tipo_incidencia NO tiene valor FV. incidencias NO tiene columna origen ni FK a alarmas. Hoy NO se distinguen incidencias FV de comerciales -> tipo='otro', pestana Incidencias = empty state + proponer migracion (origen='fv' o fv_alarma_id).

### Ficheros (commit d9401af, ya pusheado en claude/fv-mvp-prompt-y-migracion)
- docs/PROMPT_MVP_FV_para_Desktop.md (prompt v2 final).
- supabase/migrations/20260618_fv_mvp_notas_rls.sql (versiona fv_planta_nota).
- PR PENDIENTE DE MERGE. La proxima sesion debe confirmar que esta en main antes de arrancar.

### IMPORTANTE -- fv_planta_nota
YA APLICADA EN PRODUCCION (via MCP, 2026-06-18). NO reaplicar. El .sql solo versiona.

### Estado repo
main = origin/main = a2bc6b9. Rama de trabajo: claude/fv-mvp-prompt-y-migracion (commit d9401af).

### PENDIENTE (proxima sesion)
- [ ] Mergear PR de claude/fv-mvp-prompt-y-migracion. Confirmar en main.
- [ ] Lanzar docs/PROMPT_MVP_FV_para_Desktop.md en Claude Desktop -> MVP fase 1.
- [ ] Frente paralelo: energy-balance HTTP 500. day-real-kpi 503 (intradia).

---


> **Ultima actualizacion: 2026-06-18 - FV MVP operativo: auditoria Supabase completada y migracion `fv_planta_nota` aplicada en produccion via MCP. Proximo paso: versionar migracion en repo y lanzar prompt MVP en Desktop.**

## SESION 2026-06-18 (Cowork) -- MODULO FV MVP OPERATIVO: AUDITORIA SUPABASE + NOTAS

### Decision de arquitectura
El modulo FV se abordara como MVP operativo primero, sin esperar a Huawei:
- quitar mock automatico;
- Centro de Operaciones FV;
- alarmas gestionables;
- detalle por planta;
- notas por planta;
- frescura de datos;
- KPIs reales;
- no abrir INSERT generico en `notificaciones`.

En paralelo quedan los frentes tecnicos de fuente:
- `energy-balance HTTP 500 / ROA_EXFRAME_EXCEPTION`;
- `day-real-kpi 503/WAF`;
- cruce Datadis/CUPS completo.

### Auditoria Supabase realizada
El esquema real ya estaba mas completo de lo previsto:
- `fv_kpi_diario` ya cumple el rol de produccion diaria y tiene `energia_kwh`, `consumo_kwh`, `autoconsumo_kwh`, `excedente_kwh`, `compra_red_kwh`, `potencia_max_kw`, `ingresos_eur`.
- No crear `fv_produccion_diaria`.
- `fv_informe_mensual` ya existe.
- `fv_alarma` ya existe con `severidad`, `descripcion`, `activa`, `iniciada_en`, `resuelta_en`.
- Lo que faltaba realmente era `fv_planta_nota`.

### Bug principal localizado
En `src/features/seguimiento-fv/SeguimientoFVPage.tsx`, las pestanas Excedentes/Datadis, Incidencias e Informes usan fixtures directamente:
- `FIXTURE_COMPARATIVA`;
- `FIXTURE_INCIDENCIAS`;
- `FIXTURE_INFORMES`.

No es solo un fallback: esas pestanas nunca se conectaron a Supabase. Esto explica la mezcla de plantas reales con empresas ficticias.

### Migracion aplicada en Supabase
Aplicada en vivo via MCP:
- tabla `fv_planta_nota`;
- RLS activa;
- policies `read`, `insert`, `update`, `delete` para `authenticated`;
- trigger de `actualizado_en`;
- funcion trigger corregida con `SET search_path = ''`.

Pendiente: archivar/versionar la migracion en `supabase/migrations/20260618_fv_mvp_notas_rls.sql`.

### Notificaciones / 403
Causa del 403: tabla `notificaciones` tiene RLS activa y no tiene policy de INSERT.
Decision: NO abrir policy generica de INSERT para `authenticated`.
Las notificaciones automaticas FV deben nacer del sync/backend con `service_role`.
El frontend solo debe leer/actualizar. Si hace falta creacion manual futura, usar RPC/Edge Function validada.

### Duda 5 vs 7 plantas resuelta
- `jolivares` minusculas: 5 plantas.
- `JOLIVARES` mayusculas/instalador: 7 plantas.
Ambos datos son correctos; no faltaban plantas.

### Proximo paso
1. Versionar migracion ya aplicada:
   `supabase/migrations/20260618_fv_mvp_notas_rls.sql`
2. Pasar `PROMPT_MVP_FV_para_Desktop.md` a Claude Desktop.
3. Desktop debe implementar Fase 1:
   quitar mock -> conectar pestanas reales -> Centro Operaciones -> alarmas gestionables -> detalle planta + notas -> frescura -> KPIs reales.

---


> **Ultima actualizacion: 2026-06-17 - FV Sync FusionSolar AUTH_REDIRECT/0-plantas RESUELTO. 3 fixes encadenados mergeados (PR #31 zona, #32 doble-browser, #33 host post-login). jolivares: 0 -> 5 plantas OK. Pendiente: energy-balance HTTP 500.**

## SESION 2026-06-17 (Cowork) -- FIX FV SYNC FUSIONSOLAR (zona dinamica uni003->uni004)

> Depuracion del sync FV lanzado desde el CRM. La credencial jolivares fallaba con AUTH_REDIRECT y luego con 0 plantas. Causa raiz: zona/subdominio dinamico de FusionSolar (jolivares autentica en uni004eu5, no en el uni003eu5 guardado). 3 fixes encadenados.

### MERGEADO en main
| PR | Que |
|---|---|
| #31 | fix(fv): StorageStateClient detecta zona real post-login (actualiza base_url/_api_base_url) |
| #32 | fix(fv): cerrar WebAuthClient antes de delegar (evita doble sync_playwright/asyncio) |
| #33 | fix(fv): delegar StorageStateClient con host real post-login (jolivares uni004) |

### Diagnostico (orden de descubrimiento)
1. AUTH_REDIRECT en station-list de jolivares. Hipotesis: base_url fija uni003eu5 con sesion en uni004eu5.
2. Tras #31+#32: la delegacion WebAuthClient->StorageStateClient reventaba con "Sync API inside the asyncio loop" (dos contextos Playwright sync a la vez). Se cerro el primero antes de abrir el segundo.
3. Tras eso: sesion OK (check_session 200) pero 0 plantas. StorageStateClient se creaba con region_url de la credencial (uni003) y station-list devolvia vacio. Fix #33: usar client._page.url (host real post-login = uni004) como base.

### Resultado verificado (run FV Sync 27681662657, 2026-06-17)
- jolivares (cred 49064082): region_url real post-login uni003eu5 -> uni004eu5 -> 5 plantas encontradas -> OK 5 plantas, 20 alarmas. (Antes: 0 plantas / AUTH_REDIRECT.)
- JOLIVARES (7 plantas) y FOAM_RESIDENCIAS (3 plantas): terminan en uni003, sin cambios. Sync global 3/3 OK.

### PENDIENTE (tareas nuevas)
- [ ] energy-balance HTTP 500 (ROA_EXFRAME_EXCEPTION) en v3/overview/energy-balance para TODAS las plantas. No tumba el sync (warning, KPIs diarios si entran) pero no trae balance energetico. Investigar (Huawei? navegacion previa? roarand?). Ver run 27681662657.
- [ ] Verificar si jolivares son 5 o 7 plantas reales (memoria decia 7; el sync trajo 5).

---


> **Ultima actualizacion: 2026-06-15 - FV credenciales Fase 1 DESPLEGADA (PR #17, migracion + EF v6 en Supabase). Bug guardado resuelto. Pendiente Fase 3 FusionSolar/cookies.**

> **Ultima actualizacion: 2026-06-14 (Dia 2 sprint) - Fase 1 piezas (menu Energia + anualizacion) MERGEADA (PR #12) y desplegada en Cloudflare. Git corrupto reparado. TSC 0 + 187 tests. Siguiente: Fase 2 PPTX.**

## 🔧 SESIÓN 2026-06-14/15 (Día 2-3 sprint) — REPARACIÓN GIT + FASE 1 + FASE 2 PPTX + CAPTURA FACTURAS + DIAGNÓSTICO FV

> Sesión Cowork larga. Reparado git corrupto, Fase 1 desplegada, Fase 2 PPTX arrancada y desplegada, captura de facturas mejorada (por periodo + coordinación), y diagnóstico exhaustivo del módulo Plantas FV (credenciales). Varios PRs.

### MERGEADO en main
| PR | Qué | Commit |
|---|---|---|
| #12 | Fase 1: menú Energía en Sidebar + anualización en /analisis | 74c6f76 |
| #13 | docs ESTADO.md sesión | ea0bc98 |
| #14 | Fase 2.1: ClienteJson + buildClienteJson + tests | f6099a3 |

### PENDIENTE DE MERGE (CI verde esperado)
| PR | Rama | Estado |
|---|---|---|
| #15 | claude/faseA-captura-facturas | Fase A captura facturas + fix database.ts (commit 707f524). Mergear cuando CI verde. |

### Fase 2 — PPTX de propuesta (avanzado)
- F2.1 ClienteJson + builder: MERGEADO (#14).
- F2.3 Edge Function `generar-propuesta-pptx`: escrita, validada (genera PPTX real 8 slides, fee invisible OK), y **DESPLEGADA en Supabase (v1, ACTIVE)**. Código + demo en `C:\Users\joliv\.claude\fase2_pptx_entregables\`. Logo oficial: `C:\Users\joliv\.claude\logo Valere.jpg` (horizontal 2043×675, el correcto).
- Bucket `propuestas` (privado) creado.
- PENDIENTE F2: columna proposals.pptx_url, botón en /analisis (F2.4), cablear logo, QA fee en CI (F2.5).

### Captura de facturas (módulo Energía /datos) — Fase A hecha (PR #15)
- **Modelo POR PERIODO** (no por mes): facturas.fecha_inicio/fecha_fin (date). Permite 2 facturas/mes y periodos que cruzan meses. Constraint UNIQUE (cups_id, fecha_inicio, fecha_fin) + índice. APLICADO EN PROD.
- Columnas nuevas: origen ('manual'/'datadis'/'ia'/'telemedida'), documento_url. Migración versionada: supabase/migrations/20260614_facturas_coordinacion.sql.
- Frontend: autorrelleno comercializadora del CUPS + contexto (tarifa/potencias) + campos fecha + anti-duplicado por periodo + origen:'manual'. database.ts: InvoiceHistory ampliada.
- COORDINACIÓN: facturas la escriben manual + Datadis; la lee análisis. ⚠️ La próxima vez que se toque Datadis (useDatadis.ts) debe poblar fecha_inicio/fecha_fin (hoy solo month/year).
- PENDIENTE: Fase B (adjuntar PDF/Excel, reusar sistema documentos polimórfico existente), Fase C (extracción IA con ai-adapter Gemini multimodal). Diseño en outputs/DISENO_CAPTURA_FACTURAS_IA.md.

### 🔴 DIAGNÓSTICO MÓDULO PLANTAS FV (bug credenciales) — para chat nuevo dedicado
- **BUG:** "Nueva credencial" no guarda; solo hay 1 credencial (JOLIVARES, instalador multicliente, 7 plantas, estado_sesion='error').
- **CAUSA RAÍZ:** constraint `UNIQUE (plataforma, region_url, username)` en fv_credenciales → rechaza 2ª credencial si se reutiliza el mismo usuario instalador. La EF hace throw, no se guarda.
- Arquitectura seguridad CORRECTA: password cifrado AES-GCM en tabla separada fv_credenciales_secret (solo service_role), RLS admin/master, EF fv-create-credential (ACTIVE v5).
- estado_sesion='error' → login FusionSolar fallando (problema conocido cookies/WAF FusionSolar EU5, no permite histórico headless — ver scripts/fv-sync/README.md).
- Modelo 1 credencial→N plantas (fv_planta.credencial_id) correcto.
- Ficheros: src/features/seguimiento-fv/ (CredencialFormModal, CredencialesTab, api.ts), supabase/functions/fv-create-credential/, scripts/fv-sync/ (Python cron GitHub Actions).
- **SE TRABAJA EN CHAT NUEVO DEDICADO A FV** (prompt entregado a Juan). No mezclar con captura/propuestas.

### Reglas operativas confirmadas
- Sandbox NO escribe en .git. Parche .cjs idempotente + PS1 (ASCII, TSC+tests, abort si falla) que ejecuta Juan. No push directo a main: rama claude/<desc> + PR.
- LECCIÓN: el git add del PS1 debe incluir TODOS los ficheros tocados (el PR #15 falló CI por olvidar database.ts).


> **Ultima actualizacion: 2026-06-14 (Dia 2 sprint) - Fase 1 piezas (menu Energia + anualizacion) MERGEADA (PR #12) y desplegada en Cloudflare. Git corrupto reparado. TSC 0 + 187 tests. Siguiente: Fase 2 PPTX.**

## 🔧 SESIÓN 2026-06-14/15 (Día 2-3 sprint) — REPARACIÓN GIT + FASE 1 + FASE 2 PPTX + CAPTURA FACTURAS + DIAGNÓSTICO FV

> Sesión Cowork larga. Reparado git corrupto, Fase 1 desplegada, Fase 2 PPTX arrancada y desplegada, captura de facturas mejorada (por periodo + coordinación), y diagnóstico exhaustivo del módulo Plantas FV (credenciales). Varios PRs.

### MERGEADO en main
| PR | Qué | Commit |
|---|---|---|
| #12 | Fase 1: menú Energía en Sidebar + anualización en /analisis | 74c6f76 |
| #13 | docs ESTADO.md sesión | ea0bc98 |
| #14 | Fase 2.1: ClienteJson + buildClienteJson + tests | f6099a3 |

### PENDIENTE DE MERGE (CI verde esperado)
| PR | Rama | Estado |
|---|---|---|
| #15 | claude/faseA-captura-facturas | Fase A captura facturas + fix database.ts (commit 707f524). Mergear cuando CI verde. |

### Fase 2 — PPTX de propuesta (avanzado)
- F2.1 ClienteJson + builder: MERGEADO (#14).
- F2.3 Edge Function `generar-propuesta-pptx`: escrita, validada (genera PPTX real 8 slides, fee invisible OK), y **DESPLEGADA en Supabase (v1, ACTIVE)**. Código + demo en `C:\Users\joliv\.claude\fase2_pptx_entregables\`. Logo oficial: `C:\Users\joliv\.claude\logo Valere.jpg` (horizontal 2043×675, el correcto).
- Bucket `propuestas` (privado) creado.
- PENDIENTE F2: columna proposals.pptx_url, botón en /analisis (F2.4), cablear logo, QA fee en CI (F2.5).

### Captura de facturas (módulo Energía /datos) — Fase A hecha (PR #15)
- **Modelo POR PERIODO** (no por mes): facturas.fecha_inicio/fecha_fin (date). Permite 2 facturas/mes y periodos que cruzan meses. Constraint UNIQUE (cups_id, fecha_inicio, fecha_fin) + índice. APLICADO EN PROD.
- Columnas nuevas: origen ('manual'/'datadis'/'ia'/'telemedida'), documento_url. Migración versionada: supabase/migrations/20260614_facturas_coordinacion.sql.
- Frontend: autorrelleno comercializadora del CUPS + contexto (tarifa/potencias) + campos fecha + anti-duplicado por periodo + origen:'manual'. database.ts: InvoiceHistory ampliada.
- COORDINACIÓN: facturas la escriben manual + Datadis; la lee análisis. ⚠️ La próxima vez que se toque Datadis (useDatadis.ts) debe poblar fecha_inicio/fecha_fin (hoy solo month/year).
- PENDIENTE: Fase B (adjuntar PDF/Excel, reusar sistema documentos polimórfico existente), Fase C (extracción IA con ai-adapter Gemini multimodal). Diseño en outputs/DISENO_CAPTURA_FACTURAS_IA.md.

### 🔴 DIAGNÓSTICO MÓDULO PLANTAS FV (bug credenciales) — para chat nuevo dedicado
- **BUG:** "Nueva credencial" no guarda; solo hay 1 credencial (JOLIVARES, instalador multicliente, 7 plantas, estado_sesion='error').
- **CAUSA RAÍZ:** constraint `UNIQUE (plataforma, region_url, username)` en fv_credenciales → rechaza 2ª credencial si se reutiliza el mismo usuario instalador. La EF hace throw, no se guarda.
- Arquitectura seguridad CORRECTA: password cifrado AES-GCM en tabla separada fv_credenciales_secret (solo service_role), RLS admin/master, EF fv-create-credential (ACTIVE v5).
- estado_sesion='error' → login FusionSolar fallando (problema conocido cookies/WAF FusionSolar EU5, no permite histórico headless — ver scripts/fv-sync/README.md).
- Modelo 1 credencial→N plantas (fv_planta.credencial_id) correcto.
- Ficheros: src/features/seguimiento-fv/ (CredencialFormModal, CredencialesTab, api.ts), supabase/functions/fv-create-credential/, scripts/fv-sync/ (Python cron GitHub Actions).
- **SE TRABAJA EN CHAT NUEVO DEDICADO A FV** (prompt entregado a Juan). No mezclar con captura/propuestas.

### Reglas operativas confirmadas
- Sandbox NO escribe en .git. Parche .cjs idempotente + PS1 (ASCII, TSC+tests, abort si falla) que ejecuta Juan. No push directo a main: rama claude/<desc> + PR.
- LECCIÓN: el git add del PS1 debe incluir TODOS los ficheros tocados (el PR #15 falló CI por olvidar database.ts).


> **Ultima actualizacion: 2026-06-14 (Dia 2 sprint) - Fase 1 piezas (menu Energia + anualizacion) MERGEADA (PR #12) y desplegada en Cloudflare. Git corrupto reparado. TSC 0 + 187 tests. Siguiente: Fase 2 PPTX.**

## 🔧 SESIÓN 2026-06-14 (Día 2 sprint) — REPARACIÓN GIT + FASE 1 PIEZAS PERDIDAS

> Sesión Cowork. Reparado el repo git corrupto (causa raíz del "gremlin") y reimplementadas las 2 piezas de Fase 1 que se perdieron el Día 1. PR nuevo subido.

### Completado
| Artefacto | Estado |
|---|---|
| **Git reparado**: refs/heads/main duplicado + HEAD en rama fantasma `claud` → limpiado con `REPARAR_GIT_VALERE_2026-06-14.ps1` (backup .git previo) | ✅ |
| Repo local al día: `git pull` trajo PR #11 (`35ec276`) que estaba mergeado en GitHub pero no en local por la corrupción | ✅ |
| **Pieza 1 Fase 1**: menú "Energía" en Sidebar (Datos · Análisis · Propuestas · Seguimiento), antes solo por URL | ✅ commit 0c0bf13 |
| **Pieza 2 Fase 1**: anualización real en `/analisis` (usa `annualizeFactor`; % ahorro deja de mentir con pocas facturas) | ✅ commit 0c0bf13 |
| Fix TSC colateral: formatter recharts en `src/features/sips/BuscadorCupsPage.tsx` (tolerante a undefined) — queda en disco sin commitear | ✅ aplicado |
| PR subido: rama `claude/fase1-piezas-energia` → push OK, pendiente abrir PR + merge | ⏳ |
| TSC 0 errores + 187 tests pasados (1 skipped) verificados en local | ✅ |

### Lección operativa reforzada (gremlin resuelto)
- El "gremlin" era doble: (a) refs de git corruptos por sesiones paralelas, (b) ficheros .tsx guardándose en UTF-16/bytes nulos. Solución: parche `.cjs` idempotente que corre EN la máquina de Juan dentro de un PS1 que verifica nulos + aborta si TSC/tests fallan.
- **REGLA**: nunca dos sesiones Cowork tocando los mismos .tsx a la vez. Sprint técnico (código) y análisis estratégico (docs .md) en chats separados.
- PS1: NO usar `$ErrorActionPreference='Stop'` global (git escribe por stderr y lo trata como error); controlar con `$LASTEXITCODE`. Funciones auxiliares NUNCA llamarse `Git` (recursión infinita, PS es case-insensitive).

### Pendiente inmediato (Día 2 cont.)
- Abrir y mergear PR `claude/fase1-piezas-energia` (CI verde esperado) → deploy Cloudflare → verificar menú Energía + ahorro anualizado.
- **Fase 2 — PPTX**: EF `generar-propuesta-pptx`, botón en `/analisis`, bucket Storage "propuestas", QA "fee invisible". Diseño cerrado en `DISENO_BASE_PROPUESTA_VALERE.md` + `PLAN_FASE2_PROPUESTAS_PPTX.md` (untracked, commitear).
- Commitear trabajo untracked valioso: feature SIPS (`src/features/sips/`, `resolver-sips-cups`), docs Fase 2, migraciones auth/telemetría.


> **Última actualización: 2026-06-12 (noche) — SPRINT 7 DÍAS APROBADO (`docs/PLAN_SPRINT_7DIAS_2026-06-12.md` — este plan manda hasta el 19/06). Decisiones Juan: unificar en `propuestas`, NO borrar `_migration_*`/backups, alcance completo. Backfill Visalia EJECUTADO: 43 tarifas en `tariff_staging`. Pipeline reparado (gemini-2.5-flash, EF v4; migration `20260612_tariff_extractions_fix_backfill.sql` aplicada en prod). Día 1 en curso: PR #11 (`claude/fase1-analisis-menu`) con Fase 1 + tipos + informes + fix pipeline. Telemedida = Telegest/Linkener/CGNET (doc ChatGPT).**

## 🚀 SESIÓN 2026-06-12 (tarde/noche) — ANÁLISIS GLOBAL + SPRINT 7 DÍAS + BACKFILL + DÍA 1

### Completado
| Artefacto | Estado |
|---|---|
| Auditoría completa multi-LLM (docs + código + Supabase vivo) | ✅ |
| `docs/PLAN_SPRINT_7DIAS_2026-06-12.md` — plan aprobado día a día | ✅ |
| Backfill Visalia real: 43 tarifas en staging (16 elec + 9 gas dom + 18 gas PYME) | ✅ prod |
| Pipeline reparado: EF v4 gemini-2.5-flash + 2 migrations tariff_extractions | ✅ prod + repo |
| PR #11: Fase 1 (CNMC 3.0TD, anualización, menú Energía) + tipos is_approved/client_telemetry + hooks informes + smoke tests | ✅ subido |
| Hallazgo operativo: archivos se revertían en local → parche pre-TSC en PS1 (`patch-database-types.cjs`) | ✅ mitigado |
| `.env.txt` estaba staged con todo el repo → `git reset` + gitignore | ✅ evitado |

### Pendiente inmediato
- Merge PR #11 cuando CI esté verde → deploy → verificación en navegador (menú Energía, anualización, alta incidencias C3)
- Día 1 resto: unificación `proposals`→`propuestas`, limpiar chat-ia/tipos triplicados, `.gitattributes`, CLAUDE.md al día
- Juan: revisar las 43 tarifas en `tariff_staging`

> Última actualización anterior: 2026-06-10 — Sesión de análisis estratégico (Fable 5). Auditoría completa repo + Supabase. Creado `docs/ANALISIS_ESTRATEGICO_2026-06-10.md`: diagnóstico (el CRM está construido pero el circuito de propuestas está roto en 3 puntos), 83 avisos de seguridad Supabase priorizados, diseño integraciones Datadis/SIPS/telemedida/FV multi-plataforma, roadmap S1-S7. NUEVA DIRECCIÓN PROPUESTA: congelar módulos nuevos y cerrar circuito consumo→análisis→propuesta PDF→envío→tracking. Pendiente decisión Juan sobre 7 puntos (sección 8 del análisis).**

## 🔒 SESIÓN 2026-06-11 — FASE 0 EJECUTADA (limpieza + hardening en prod)

### Completado
| Acción | Estado |
|---|---|
| Datos TEST de la auditoría borrados (3 empresas, 2 CUPS, 3 facturas, 2 propuestas, 1 contrato, 3 contactos, 1 oportunidad) | ✅ verificado 0 restantes |
| Usuario `test.auditor@valereconsultores.com` eliminado de auth.users | ✅ |
| REVOKE anon en todas las funciones public (0 SECURITY DEFINER ejecutables por anon) | ✅ migración `fase0_hardening_funciones_anon_searchpath` |
| Funciones cron/worker (cleanup_*, holded_dispatch_worker) sin EXECUTE de authenticated | ✅ |
| search_path fijo en 16 funciones | ✅ |
| 3 vistas → security_invoker (retailer_offers, fv_credenciales_safe, fv_sync_health_latest); policies base verificadas (qual=true authenticated) | ✅ sin rotura |
| Advisor: 83 avisos → ~35, 0 ERRORs | ✅ |
| Migración consolidada en repo: `supabase/migrations/20260611_fase0_hardening_funciones.sql` | ✅ |

### Pendiente Fase 0 (decisión Juan / manual)
- ❌ **Leaked password protection**: NO se puede activar — requiere **plan Pro** (el proyecto está en plan Gratis). El toggle está deshabilitado en Dashboard → Auth → Protección contra ataques. Queda como aviso aceptado del advisor hasta que se valore el upgrade.
- ⚠️ **Índice de git CORRUPTO** en el repo local de Juan ("bad signature / index file corrupt") — es la causa del error `git pull`. El script `COMMIT_FASE0_2026-06-11.ps1` lo repara (borra .git/index + git reset) antes de commitear. El sandbox NO puede arreglarlo (sin permiso de escritura en .git Windows).
- Tablas `_migration_*` y `*_backup_20260511` — Juan NO autorizó borrado todavía.
- Registros basura/duplicados (dzt, xfgj, ABRASIVOS ×2...) — Juan NO autorizó todavía.
- Unificación `proposals`+`propuestas` — requiere sesión de código (frontend), planificar en Fase 1.
- Diagnóstico del error `git pull` ("did not send all necessary objects") + confirmar commit deployado en Cloudflare.

### Siguiente: FASE 1 (ver plan en ANALISIS_ESTRATEGICO_2026-06-10.md §7 y AUDITORIA_FUNCIONAL §12)
Normalización temporal del análisis + fix 3.0TD (6 periodos potencia) + reparar alta de incidencias + menú grupo "Energía" + tests calculator.

## 📊 SESIÓN 2026-06-10 — ANÁLISIS ESTRATÉGICO Y AUDITORÍA (sin código)

### Completado (parte 2 — auditoría funcional en producción)
| Artefacto | Estado |
|---|---|
| `docs/AUDITORIA_FUNCIONAL_2026-06-10.md` — auditoría real en navegador con 2 clientes TEST (sustituye al intento fallido del agente ChatGPT) | ✅ creado |
| Usuario auditor `test.auditor@valereconsultores.com` (manager, ID 492a6574) | ⚠️ ACTIVO — borrar tras revisión |
| Datos TEST en prod: 2 empresas, 2 CUPS, 3 facturas, 2 propuestas, 1 contrato, 1 lead | ⚠️ pendiente limpieza (SQL en §14 del informe) |
| Hallazgos críticos: C1 sin PDF · C2 cálculo no normalizado (ahorros -32,8% en verde) · C3 incidencias rotas · C4 flujo energía fuera del menú · A1 3.0TD con 3 periodos potencia | ✅ documentados |
| Sorpresa positiva: "Guardar Propuesta" SÍ existe en prod y el circuito datos→análisis→propuesta funciona | ✅ verificado |

### Completado (parte 1 — análisis estratégico)
| Artefacto | Estado |
|---|---|
| `docs/ANALISIS_ESTRATEGICO_2026-06-10.md` (auditoría + plan integraciones + roadmap) | ✅ creado |
| Auditoría repo: 206 archivos, ~53k líneas, 0 `as any`, 0 TODOs, 8/10 | ✅ |
| Auditoría Supabase: 83 tablas reales, 14 EF, 83 avisos advisor (3 ERROR security_definer_view, 27 funciones SECURITY DEFINER ejecutables por anon) | ✅ |
| Hallazgos críticos: PDF de propuestas fantasma, /analisis no persiste, doble tabla proposals/propuestas, facturas=0 filas | ✅ documentados |
| Investigación APIs: Datadis terceros, SIPS CNMC (solo comercializadoras → importador Excel), IEC 60870-5-102 telemedida, GoodWe SEMS OpenAPI | ✅ |

### Pendiente próxima sesión (decisión Juan primero — sección 8 del análisis)
- Juan responde a los 7 puntos (diseño comparativas, Excel SIPS muestra, pasarelas telemedida, cuenta Datadis empresa, cuenta org GoodWe SEMS, prioridad S2/S3, Visalia)
- **S1 — Seguridad y limpieza**: REVOKEs anon, search_path 16 funciones, leaked password, borrar `_migration_*` y `*_backup_20260511`, unificar proposals+propuestas
- Heredado del 04/06: backfill Visalia dry_run=true, escenario Make backfill, pantalla tariff_staging

## ✅ SESIÓN 2026-06-04 — PIPELINE TARIFAS + SISTEMA MULTIAGENTE

### Completado
| Artefacto | Estado |
|---|---|
| calculator.ts Fase 3: indexado + SSAA externos + fee Valere | ✅ commit 05ab64b |
| 29 ofertas reales cargadas en comercializadora_ofertas | ✅ prod |
| Tablas: tariff_sources, tariff_extractions, tariff_staging | ✅ prod |
| Edge Function tariffs-ingest-email v2 (cleanHtml + dedup) | ✅ deployada |
| Make Rama B: filtro + stopOnHttpError=true + truncado seguro | ✅ activo |
| Carpeta 00_SYNC_AGENTES_VALERE Drive (10 docs) | ✅ pública |
| Sistema multiagente operativo (Claude+ChatGPT+Gemini leen Drive) | ✅ |
| Protocolo gobierno multiagente | ✅ VIGENTE aprobado Juan |

### Pendiente próxima sesión
- Backfill Visalia 04/06/2026 — dry_run=true (APROBADO, ejecutar próxima sesión)
- Crear escenario Make "Backfill Tarifas - Manual"
- Validar extracción Gemini con emails reales Visalia
- Pantalla revisión tariff_staging en CRM (Fase 2)

## ✅ SESIÓN 2026-06-02 — FASE 3: TARIFAS INDEXADAS

### Qué se hizo
| Artefacto | Cambio |
|---|---|
| `supabase/migrations/20260602_retailer_offers_indexado.sql` | Nuevos campos `price_type` + `spread_eur_kwh` en `comercializadora_ofertas`. Vista `retailer_offers` actualizada. |
| `src/types/database.ts` | `RetailerOffer` con `price_type` y `spread_eur_kwh` |
| `src/core/energia/calculator.ts` | `SimulationParams.poolPrecioMedioEurKwh` + rama indexada en `calculateSimulatedInvoice` |
| `src/core/hooks/usePoolPrecioMedio.ts` | Hook nuevo: consulta `precios_pool_horarios` (indicador 600) y devuelve precio medio EUR/kWh para un rango |
| `src/features/analisis/AnalisisPage.tsx` | Usa `usePoolPrecioMedio` y pasa el precio pool al motor de cálculo para ofertas indexadas |
| `src/features/admin/AdminPage.tsx` | Formulario de ofertas con selector `fijo`/`indexado` y campo `spread_eur_kwh` |

### Estado final
- TSC: 0 errores
- Commit pendiente: ejecutar PS1 de cierre desde PowerShell

### Pendiente próxima sesión
- Widget `PrecioPoolCard` en Dashboard (Fase 3 visual)
- Tests para `usePoolPrecioMedio` y lógica indexada en calculator
- Integración `CaptacionPage.tsx`: toggle Vista (Fichas/Tabla), tab Enviados, buscador inline (Sprint Carolina pendiente)

## ✅ SESIÓN 2026-05-19 — SPRINT CAROLINA (Hallazgos #2 + #3)

### Contexto
Revisión con Carolina Aroca (telemarketing). Recogí 3 hallazgos:
- **#1** Sincronización Outlook/Google Calendar — apuntado, requiere OAuth Google (pendiente decisión Juan).
- **#2** Buscador inline + pestaña Enviados con SLA + recordatorios CRM+email.
- **#3** Vista tabla tipo Excel + edición inline propagable + tab Mis llamadas + export.

Decisiones firmadas Juan:
- Una pestaña "Enviados" con sub-chips Análisis/Senior (siempre desde historial unificado).
- Edición inline propagable, whitelist segura en backend.
- Recordatorio = notificación CRM + email vía Resend.
- SLA: 3d amarillo / 5d rojo.
- Eliminada pestaña "Seguimientos" actual; `propuesta_enviada` vuelve a "Por llamar".

### Backend aplicado en prod
| Artefacto | Cambio |
|---|---|
| `supabase/migrations/20260519_sprint_vista_tabla_captacion.sql` | 3 vistas + 3 RPCs (aplicado bloque a bloque vía SQL Editor) |
| Edge Function `enviar-recordatorio` | Deployada vía CLI (Resend, JWT verify) |

Vistas: `v_captacion_historico_completo`, `v_captacion_enviados_en_seguimiento`, `v_mis_llamadas`.
RPCs: `editar_campo_oportunidad`, `editar_campo_empresa`, `recordar_a_responsable`.

### Frontend en disco (commit pendiente)
- `src/features/captacion/api.ts`: 6 hooks nuevos con invalidación cascada (useCaptacionHistorico, useCaptacionEnviados, useMisLlamadas, useEditarCampoOportunidad, useEditarCampoEmpresa, useRecordarAResponsable).
- Componentes nuevos en `src/features/captacion/components/`: SelectorVista, BuscadorCaptacion, CeldaEditable, ChipsFiltros, PaginacionIncremental, TablaCaptacion.
- Util `src/core/utils/exportToExcel.ts` (SheetJS).

### Bonus
- DashboardPage.tsx tenía `PrecioPoolCard` truncado de un sprint inacabado anterior — bloqueaba TSC desde hace tiempo. **Limpiado**. El sprint OMIE puede retomarse desde git history cuando se quiera.
- **TSC vuelve a 0 errores** tras meses.

### Pendiente próxima sesión
- Componente `MisLlamadasView` (log cronológico actividades llamada).
- Integración `CaptacionPage.tsx`: toggle Vista (Fichas/Tabla), tab Enviados, buscador inline.
- Bloque "Recordar a responsable" en card Enviados.
- Tests vista tabla + edición inline.
- Regenerar tipos TS Supabase para eliminar casts `(supabase as any)` en hooks nuevos.

### Cierre operativo
- Script PowerShell preparado: `COMMIT_SPRINT_CAROLINA_2026-05-19.ps1` (pull + tsc + tests + build + commit + push).
- Juan ejecuta el PS1 para cerrar el sprint.

---

> **(estado anterior abajo)**
>
> Anterior cierre: 2026-06-01 (sesión autónoma) — 🎉 FASE 2 COMPLETADA EN PROD. Edge Functions deployadas, secrets configurados, backfill 2024-2026 ejecutado (40.672 filas en precios_pool_horarios). Escenario Make configurado. Pendiente: activar escenario Make, investigar indicadores PVPC/CO₂ sin datos, Fase 3 (widget dashboard + calculator indexado).

## ✅ SESIÓN 2026-06-01 TARDE — FASE 2 COMPLETADA EN PROD (sesión autónoma)

### Deploy Edge Functions
| Función | URL | Estado |
|---|---|---|
| `tariffs-ingest` | `https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/tariffs-ingest` | ✅ Deployada, JWT OFF |
| `esios-price-cache` | `https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/esios-price-cache` | ✅ Deployada, JWT OFF |

### Secrets configurados en Supabase
- ✅ `MAKE_INGEST_TOKEN` = `7f3a9c2e-b814-4d6f-a053-1e8c29d70f45`
- ✅ `ESIOS_API_KEY` = ya existía (configurado previamente)

### Backfill histórico ESIOS ejecutado
| Indicador | Filas en prod | Rango |
|---|---|---|
| 600 - Precio spot OMIE | 19.482 | 2024-01-01 → 2026-06-01 |
| 1739 - Compensación excedentes FV | 21.190 | 2024-01-01 → 2026-06-01 |
| 1001, 10211, 10349 | 0 | ESIOS no publica estos para geo_id=3 en el rango |

**Total: ~40.672 filas** en `precios_pool_horarios`. El precio spot (600) es el indicador más importante — ya disponible.

### Escenario Make configurado
Módulo HTTP POST añadido al escenario "Detector Tarifas Comercializadoras - Valere":
- URL: `https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/tariffs-ingest`
- Auth: `x-ingest-token: 7f3a9c2e-b814-4d6f-a053-1e8c29d70f45`
- Body mapeado: Drive ID, filename, subject, from (email), date
- ⚠️ El escenario sigue **inactivo** — Juan debe activarlo manualmente

### Verificación funcional
- ✅ `tariffs-ingest`: test real → `{"ok":true,"document_id":"972b6d17-9c0f-48df-bd24-1ee7979c8445"}` (fila insertada en `tariff_documents`)
- ✅ `esios-price-cache`: test real → 92 filas descargadas de ESIOS en primera ejecución
- ✅ `precios_pool_horarios`: 40.672 filas con histórico 2024-2026

### Pendientes Fase 2 (menores)
- ⏳ Activar escenario Make (Juan)
- ⏳ Investigar por qué PVPC (1001, 10211) y CO₂ (10349) devuelven 0 — posible geo_id o retraso de publicación
- ⏳ Configurar cron `30 20 * * *` para `esios-price-cache` en Supabase (Dashboard → Edge Functions → Schedule)

### Siguiente paso: Fase 3
- Widget dashboard "Precio pool hoy" (leer de `precios_pool_horarios` donde `indicador_id=600`)
- Integración `calculator.ts` para tarifas indexadas (usar `calcularCosteIndexado` de `esios.ts`)
- Vista comparativa en AnalisisPage: coste real indexado vs oferta fija

---

## ✅ SESIÓN 2026-06-01 — ANÁLISIS ESIOS + FASE 2 PREPARADA

### Token ESIOS recibido
Juan tiene token personal de ESIOS (REE). Análisis técnico completo en `docs/ANALISIS_ESIOS_INTEGRACION.md`.

### Archivos creados en esta sesión

| Archivo | Descripción |
|---|---|
| `docs/ANALISIS_ESIOS_INTEGRACION.md` | Análisis técnico completo: indicadores, arquitectura, plan de integración |
| `docs/BRIEFING_FASE2_TARIFFS_INGEST.md` | Instrucciones paso a paso para Claude Code |
| `supabase/migrations/20260601_esios_precios_pool.sql` | Tabla `precios_pool_horarios` con RLS — **pendiente aplicar en prod** |
| `supabase/functions/esios-price-cache/index.ts` | Cron nightly que cachea precios ESIOS en Supabase |
| `supabase/functions/tariffs-ingest/index.ts` | Endpoint para Make (ingesta de tarifas por email) |
| `src/core/services/esios.ts` | Cliente TypeScript ESIOS con tipos, constantes y `calcularCosteIndexado()` |

### Estado Fase 2 — checklist

- ✅ Briefing redactado (`docs/BRIEFING_FASE2_TARIFFS_INGEST.md`)
- ✅ Migration SQL lista (`supabase/migrations/20260601_esios_precios_pool.sql`)
- ✅ Edge Function `esios-price-cache` escrita (cron nightly, 5 indicadores, upsert por lotes)
- ✅ Edge Function `tariffs-ingest` escrita (auth token, dedup SHA256, mapeo correcto a schema real)
- ✅ Cliente TypeScript `src/core/services/esios.ts` (tipos, constantes, `calcularCosteIndexado`)
- ✅ TSC 0 errores verificado
- ⏳ Aplicar migration `20260601_esios_precios_pool.sql` en Supabase prod
- ⏳ Deploy `tariffs-ingest` en Supabase Edge Functions
- ⏳ Deploy `esios-price-cache` en Supabase Edge Functions
- ⏳ Configurar secret `ESIOS_API_KEY` en Supabase
- ⏳ Configurar secret `MAKE_INGEST_TOKEN` en Supabase (generar UUID aleatorio)
- ⏳ Configurar cron `30 20 * * *` para `esios-price-cache`
- ⏳ Backfill histórico 24 meses (2024-01-01 → 2025-12-31) — curl manual POST a la Edge Function
- ⏳ Configurar Make para llamar a `tariffs-ingest` con el token

### Indicadores ESIOS que se cachean

| ID | Nombre | Unidad |
|---|---|---|
| 600 | Precio mercado spot OMIE | €/MWh |
| 1001 | PVPC término energía 2.0TD | €/kWh |
| 10211 | PVPC precio total 2.0TD | €/kWh |
| 1739 | Compensación excedentes FV | €/kWh |
| 10349 | Factor emisiones CO₂ | gCO₂/kWh |

### Próximos pasos (Fase 3, tras deploy Fase 2)
- Widget dashboard "Precio pool hoy" (leer de `precios_pool_horarios`)
- Integración `calculator.ts` para tarifas indexadas (usar `calcularCosteIndexado`)
- Vista comparativa en AnalisisPage: coste real indexado vs oferta fija

---
>
> ## ✅ SESIÓN 2026-05-28 — FASE 1 APLICADA EN PROD + MERGE A MAIN
>
> ### Aplicación de migraciones en Supabase prod (proyecto `gtphkowfcuiqbvfkwjxb`)
> Cowork aplicó las 9 migraciones via Chrome MCP sobre el SQL editor (autorización explícita de Juan). Mantenimiento programado de shared pooler eu-west-1 ralentizó la UI puntualmente (migraciones 07 y 09 con UI colgada en "Running..." pero el DDL se completó correctamente — confirmado al recargar y consultar catálogo PostgreSQL).
>
> ### Verificación final SQL (la que ChatGPT pidió antes del merge)
> ```sql
> select 'RPC: '||proname from pg_proc where proname='publish_oferta_with_versioning'
> union all
> select 'TABLA: '||tablename from pg_tables where schemaname='public' and tablename in (
>   'tariff_documents','tariff_extractions','proposal_email_drafts',
>   'comercializadora_productos_servicios','oferta_precios_mensuales'
> ) order by 1;
> ```
> **6 filas devueltas:** 1 RPC + 5 tablas confirmadas en prod ✅.
>
> ### PR #10 — Squashed-mergeado a `main`
> | Campo | Valor |
> |---|---|
> | Título | `Claude/modulo tarifas propuestas (#10)` |
> | Estado final | 🟣 Merged |
> | Estrategia | Squash and merge |
> | Commits originales | 5 (35d14c9, 1f22535, e728aab, 01b01b7, 3176057) |
> | Files changed | 18 (+4.103 / −1) |
> | All checks | ✅ 5 successful checks |
> | Conflicts | ✅ None |
>
> Los 5 commits originales se condensaron en un único commit squash en `main`. La rama `claude/modulo-tarifas-propuestas` queda obsoleta tras el merge — Juan puede borrarla cuando quiera.
>
> ### Lo que ahora vive en `main`
> - **Documentación del módulo:** `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md`, `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` (v1.1), `docs/ANALISIS_FORMATOS_TARIFAS.md`, `docs/BRIEFING_FASE1_CLAUDE_CODE.md` (v1.1), `docs/SESIONES/2026-05-27-resumen.md`.
> - **9 migraciones SQL aditivas:** `supabase/migrations/20260528_modulo_tarifas_*.sql` (aplicadas en prod, registradas en repo para reproducibilidad).
> - **Test placeholder:** `src/features/admin/__tests__/publishOfertaWithVersioning.test.ts` (9 casos documentados en JSDoc para Fase 3).
> - **Tipos Supabase regenerados:** `src/core/types/database.ts` con `tariff_documents`, `publish_oferta_with_versioning`, `extension_data` y todas las extensiones.
>
> ### Lo que NO se ha tocado (intencional)
> - UI / hooks / pantallas existentes — `AnalisisPage` (comparador) y `XLSXImportadorTarifas` siguen funcionando exactamente igual.
> - Edge Functions existentes.
> - Escenario Make.
> - Sistema RLS legacy.
>
> ### Pendientes operativos heredados (ahora más limpios)
> - ✅→ ✅ SQL fase 28.6 cerrado (era documentación desfasada).
> - ✅→ ✅ Regenerar tipos Supabase cerrado.
> - ✅→ ✅ Fase 1 aplicada y mergeada.
> - ⏳ Push commit local `60ab260` (Hito 2) — verificar si Juan lo hizo en algún momento (probablemente sí, ya está en `main`).
> - ⏳ RESEND_API_KEY en local — sin importancia hasta Fase 6.
>
> ### Aprobaciones ChatGPT acumuladas
> | Ronda | Decisión |
> |---|---|
> | 1 | Aprobado Plan + Análisis de formatos con 3 matices (verificar fase 28.6, casteo JSONB, status_v2 provisional) |
> | 2 | Aprobado Briefing v1.1 con 4 correcciones técnicas integradas (índices sin current_date, RPC zona, RPC approved, no tocar database.ts) |
> | 3 | Aprobado PR #10 para merge tras verificación SQL final (1 RPC + 5 tablas confirmadas) |
>
> ### Siguiente paso (Fase 2)
> Cowork prepara `docs/BRIEFING_FASE2_TARIFFS_INGEST.md` cuando Juan lo pida. Contenido:
> - Edge Function `tariffs-ingest` (clon del patrón `chat-consultor`, con auth por token compartido `MAKE_INGEST_TOKEN` en lugar de JWT).
> - Modificar el escenario Make: tras subir adjunto a Drive, llamar al endpoint `/tariffs/ingest` con metadatos del email.
> - Hash SHA256 como dedup exacto en `tariff_documents`.
> - Tests de la Edge Function.
>
> ### Pendientes en paralelo (Juan, no técnico)
> - **NEG-A ampliado:** renombrar archivos genéricos en Drive `TARIFAS_VIGENTES` con la comercializadora en el nombre.
> - **NEG-A ampliado:** reenviarme 2-3 emails con la tarifa en el cuerpo del mensaje.
> - **NEG-A ampliado:** catálogo de productos canónicos por comercializadora (bloquea Fase 3).
> - **NEG-B:** logo Valere alta resolución + colores + tipografía (bloquea Fase 5).
>
> ---
>
>
> ## ✅ SESIÓN 2026-05-28 — FASE 0 CERRADA + ARRANQUE FASE 1
>
> ### Cierre de Fase 0 (saneamiento)
> | Acción | Resultado |
> |---|---|
> | Push del Bloque 1 v1.1 (6 docs) en rama `claude/modulo-tarifas-propuestas` | ✅ commit `35d14c9` |
> | Regeneración tipos Supabase (`supabase gen types typescript`) | ✅ commit `1f22535` — diff vacío: `database.ts` activo ya estaba al día, el legacy era `database_canonical_2026-04-26.ts` (archivo histórico) |
> | TSC | ✅ 0 errores |
> | Tests | ✅ 129/129 (no 39 — el repo creció; corregir CLAUDE.md en próximo housekeeping) |
> | SQL fase 28.6 verificado en Supabase | ✅ Aplicada el 13/05 vía MCP (cabecera del propio SQL lo declara). NO re-ejecutar. Evidencia: cleanup de `cfs_admin`/`cfv_all`/`notificaciones_all` confirmado; las nuevas `notif_select/update/delete` + `cfs_*_authenticated` + `cfv_*_authenticated` presentes |
>
> ### Aprendizajes sobre nomenclatura
> - **`src/core/types/database.ts`** = fichero ACTIVO (siempre usar este).
> - **`src/core/types/database_canonical_2026-04-26.ts`** = snapshot histórico con nombres legacy (`retailers`/`retailer_offers`). Sólo para referencia, NO usar como fuente de tipos.
> - Las tablas reales en español: `comercializadoras`, `comercializadora_ofertas`. Confirmado tanto en BD como en código vivo.
> - Hay 2 policies legacy con nombres alias (`retailers_select`, `retailer_offers_select` sobre las tablas en español). Funcionan correctamente, sólo el nombre interno es legacy. No bloquea nada — housekeeping futuro.
> - Hay redundancia de policies en `actividades/contactos/documentos/empresas` (`*_funciones` añadidas en sprint captación además de las clásicas `a_*/co_*/doc_*/e_*`). Suma con OR — no es bug, no bloquea.
>
> ### Pendientes obsoletos cerrados
> - ⏳→ ✅ SQL fase 28.6 — confirmado aplicado, era documentación desfasada.
> - ⏳→ ✅ Regenerar tipos Supabase TS — confirmado al día, era confusión con fichero archivado.
>
> ### Pendientes para esta sesión (en curso)
> - Crear `docs/BRIEFING_FASE1_CLAUDE_CODE.md` operativo (no conceptual) con: 8 migraciones SQL aditivas + RPC `publish_oferta_with_versioning` con casteo JSONB→numeric[] correcto + tests + criterios aceptación + commit message.
> - Commitear en `claude/modulo-tarifas-propuestas`.
> - Juan lanza a Claude Code.
>
> ### Pendientes en paralelo (Juan, no técnico)
> - Renombrar archivos genéricos en Drive `TARIFAS_VIGENTES` (sumar comercializadora al nombre).
> - Reunir 2-3 emails con tarifa en el cuerpo del mensaje (no encontrados en carpeta hoy — sólo PDFs/Excels).
> - NEG-A: catálogo productos canónicos por comercializadora (bloquea Fase 3).
> - NEG-B: logo + colores + tipografía Valere (bloquea Fase 5).
>
> ---
>
>
> ## ✅ SESIÓN 2026-05-27 — MÓDULO TARIFAS Y PROPUESTAS: BLOQUE 1 (AUDITORÍA + PLAN)
>
> ### Contexto de la sesión
> Juan trae briefing de traspaso desde otra herramienta (ChatGPT) tras varias sesiones intentando construir el sistema de tarifas dentro de Make.com (que llegó al límite de su editor visual). Decisión consolidada: **Make = captura, Supabase Edge Functions = cerebro, Gemini server-side, módulo dentro del CRM**. Volumen real 30-40 tarifas/mes → humano-en-el-bucle desde el día 1.
>
> ### Hallazgo principal de la auditoría
> **El módulo NO se construye desde cero — está al ~70% hecho.** El CRM ya tiene:
> - `comercializadoras` + `comercializadora_ofertas` (CRUD admin completo + importador XLSX masivo en `XLSXImportadorTarifas`)
> - `AnalisisPage` ya implementa el comparador end-to-end (lee facturas históricas, simula N ofertas, rankea por ahorro, guarda en `proposals`)
> - `PropuestasEnergiaPage` ya visualiza propuestas generadas
> - Motor de cálculo `calculateSimulatedInvoice` (comparador) y `calculateInvoiceEstimate` (factura actual) ya operativos
> - Edge Function `chat-consultor` con patrón Gemini server-side desplegado (JWT auth, CORS, `@google/genai`) — clonable para `tariffs-extract`
> - Sistema de roles + signup + RLS granular ya en pie
>
> ### Lo que falta (delta)
> 1. **Capa de ingesta** (Make → webhook → tabla): tabla `tariff_documents` + Edge Function `tariffs-ingest`
> 2. **Capa de extracción IA**: tabla `tariff_extractions` + Edge Function `tariffs-extract` (clon de chat-consultor)
> 3. **Versionado de ofertas**: hoy el upsert sobreescribe — añadir `valid_from`/`valid_to`/`status`/`version`/`superseded_by` + RPC `publish_oferta_with_versioning`
> 4. **Bandeja "tarifas pendientes"**: nuevo tab en `AdminPage` (humano-en-el-bucle)
> 5. **Logo de comercializadora**: campo no existe — `add column logo_url`
> 6. **Generador PDF de propuesta** con plantilla Valere (bloqueado por NEG-B: diseño)
> 7. **Borrador de email con aprobación manual**: tabla `proposal_email_drafts` + Edge Function `proposals-send-email` (Resend ya en uso)
>
> ### Aclaración crítica de nomenclatura
> El schema canónico `src/core/types/database_canonical_2026-04-26.ts` muestra `retailers/retailer_offers` (nombre antiguo) pero **las migraciones de abril renombraron a `comercializadoras/comercializadora_ofertas`** y todo el código vivo usa los nombres en español. **Cualquier código o doc nuevo debe usar los nombres en español.** Regenerar tipos es prerrequisito de Fase 0.
>
> ### Entregables de esta sesión
> | Artefacto | Ubicación |
> |---|---|
> | Auditoría técnica completa | `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md` (12 secciones) |
> | Plan de implementación por fases (v1.1) | `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` (15 secciones, 8 fases técnicas + 2 fases negocio + addendum ChatGPT) |
> | **Análisis de formatos reales (NUEVO)** | `docs/ANALISIS_FORMATOS_TARIFAS.md` — 8 archivos reales analizados, ~25 campos críticos detectados que NO están en el esquema actual |
> | Primer commit mínimo recomendado (v1.1) | Solo documentación (5 archivos). Migraciones SQL ampliadas pasan al commit de Fase 1 |
> | Mensaje de cierre a próxima sesión | `.cowork/outbox/2026-05-27T23-00-00-modulo-tarifas-bloque1-listo.md` |
>
> ### Hallazgos del análisis de formatos reales (resumen)
> 1. **Tres unidades distintas de potencia coexistiendo**: €/kW·año (BASE MET, UniEléctrica A), €/kW·día (METROPOLI MET, Iberdrola), €/kW·mes (Energya-VM).
> 2. **Multi-zona explícita**: Península, Baleares, Canarias, Ceuta/Melilla, Extra Peninsular. Cada zona con precios distintos en algunas comercializadoras.
> 3. **Combinatoria masiva**: MET una sola campaña = 56 ofertas (7 productos × 4 accesos × 2 zonas). Iberdrola hoja mensual = 50+ productos.
> 4. **Descuentos no normalizables**: "15% s/Te y Tp (+5% PyS Tier 1 +2% PyS Tier 2)", "dto 0,02€/Kwh si consumo >40MWh/a". Solución híbrida: texto libre + campos estructurados.
> 5. **PyS (Productos y Servicios) son catálogo paralelo** — Iberdrola tiene 30+ servicios opcionales (Pack Hogar 8.95€/mes, etc.) que dan descuento sobre la tarifa.
> 6. **Vigencias múltiples por producto**: UniÉlectrica FLEXIPYME aparece con dos ventanas de contratación con precios distintos.
> 7. **Precios mes a mes para gas**: MET y Energya-VM dan 12 valores por período.
> 8. **Visalia y similares son PDFs imagen** — extracción solo con Gemini visual; texto plano NO sirve.
> 9. **Variantes por umbral de potencia**: Iberdrola separa "2.0TD_2 P1≤10kW" de "2.0TD_3 P1>10kW".
> 10. **Conceptos especializados frecuentes**: Eventual/Temporal (sin IE), Telemedido/No telemedido, Promocionado/No promocionado, "sin SSAA/CAD" (interna no contratable), bono social por zona, Hora Tempo / Resto h.
>
> ### Aprobación de ChatGPT (con 3 matices integrados en §14 del PLAN)
> 1. **Verificar si SQL fase 28.6 ya está aplicado en producción** antes de re-ejecutarlo (contradicción en históricos).
> 2. **Refactorizar el casteo JSONB→numeric[]** en RPC `publish_oferta_with_versioning` (la sintaxis propuesta puede fallar en PostgreSQL).
> 3. **Declarar `status_v2` como temporal** y planificar su consolidación en `status` único en fase posterior.
>
> ### ⚠️ Pendientes para próxima sesión (orden estricto)
> 1. **Juan + ChatGPT aprueban** docs/AUDITORIA y docs/PLAN.
> 2. **Juan ejecuta Fase 0 (saneamiento)**:
>    - Push commits locales no pusheados (`60ab260` Hito 2 + commits de esta sesión)
>    - SQL `20260422_fase28_6_rls_policies_cleanup.sql` en Supabase Dashboard prod
>    - Regenerar tipos: `npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts`
>    - Abrir rama `claude/modulo-tarifas-propuestas`
>    - Verificar `npx tsc --noEmit` (0 errores) + `npm test -- --run` (39/39)
> 3. **Juan reúne en paralelo** (NEG-A, bloquea Fase 3):
>    - 4 ejemplos reales: PDF fija + PDF indexada + Excel + email cuerpo
>    - Lista comercializadoras activas + catálogo productos canónicos
> 4. **Juan reúne en paralelo** (NEG-B, bloquea Fase 5):
>    - Logo Valere alta resolución + colores + tipografía + propuesta de referencia
> 5. **Cowork prepara** briefing concreto de Fase 1 (migraciones SQL aditivas) para Claude Code.
> 6. **Claude Code ejecuta** Fase 1 → commit → PR draft.
>
> ### ⚠️ Pendientes heredados anteriores (no resueltos en esta sesión)
> - **SQL fase28.6** sin ejecutar en Supabase prod (sigue pendiente desde 14 mayo).
> - **Regenerar tipos Supabase TypeScript** (sigue pendiente — necesario para Fase 0 del módulo).
> - **Push commit `60ab260`** (Hito 2 factura teórica) — sin verificar si Juan ya lo hizo.
> - **RESEND_API_KEY** no configurado en local — verificar prod antes de Fase 6.
>
> ---
>
> ## ✅ SESIÓN 2026-05-14 (5ª parte) — FV SYNC: DIAGNÓSTICO WAF 503 + FIXES
>
> ### Diagnóstico exhaustivo `day-real-kpi` HTTP 503 (conclusión definitiva)
>
> | Plan | Estrategia | Resultado |
> |---|---|---|
> | A | Hash nav `#/plantDetail/NE=137403508` via `page.goto()` | SPA redirige a `#/home/list`. 0 requests HTTP generados. 503 persiste. |
> | B | `page.evaluate(fetch())` desde hash de detalle | 503 idéntico. WAF bloquea independientemente del cliente HTTP. |
> | C | Prelim `device-list` via `context.request` antes de `day-real-kpi` | `device-list` también 503. El WAF bloquea TODOS los POST station-específicos fuera del SPA. |
>
> **Conclusión**: CloudWAF FusionSolar EU5 bloquea `day-real-kpi` Y `device-list` desde cualquier cliente headless que no haya navegado a la ruta SPA correcta del detalle de planta. La ruta correcta es desconocida (`#/plantDetail/<dn>` es inválida — el SPA la rechaza). El backfill automático de KPI histórico NO es viable con este endpoint desde automatización.
>
> ### Fixes aplicados
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `scripts/fv-sync/sync_job.py` | Guard WAF: si `get_daily_kpi()` devuelve `{}` (503 silencioso), **skip** — no escribe 0.0 kWh en `fv_kpi_diario`. Auditoría con `error_tipo="waf_503_skip"`. | `e018be1` |
> | `scripts/fv-sync/fusionsolar_client.py` | `_navigate_to_station_detail()` simplificado a no-op con comentario diagnóstico completo. Elimina 3 planes fallidos. | `e018be1` |
> | `fv_kpi_diario` (Supabase prod) | DELETE 17 filas contaminadas con 0.000 kWh para fechas históricas (2026-05-11/12/13, 7 plantas). Producción limpia. | SQL directo |
>
> ### Estado operativo FV tras esta sesión
> - ✅ **Realtime**: `station-list` → `fv_kpi_realtime` + KPI de hoy → `fv_kpi_diario` (fecha actual). Funciona en cada sync.
> - ✅ **Alarmas**: `fm/v1/statistic` → `fv_alarma`. Funciona.
> - ❌ **Histórico automático**: `day-real-kpi` bloqueado WAF para fechas pasadas. No viable por automatización.
> - ✅ **Datos históricos limpios**: 0.0 kWh falsos eliminados de BD.
>
> ### Estrategia para histórico FV
> 1. **Acumulación diaria**: el sync corre cada día y guarda la producción de hoy. En 30 días habrá 30 días de histórico.
> 2. **Backfill manual**: descargar CSV desde FusionSolar portal e importar via script SQL o herramienta admin.
> 3. **Futura investigación**: capturar la URL correcta del SPA para la vista de detalle (requiere navegación headful manual con Playwright inspector).
>
> ### ⚠️ Pendientes heredados
> - **SQL fase28.6**: `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` — pendiente ejecutar en Supabase prod
> - **Regenerar tipos Supabase TypeScript**: incluir `datadis_supply_price_terms` para eliminar `(supabase as any)` cast
> - **RESEND_API_KEY**: no configurado en local (warning en cada sync — no afecta a CI)
>
> ---
>
> ## ✅ SESIÓN 2026-05-14 (4ª parte) — HITO 2: FACTURA TEÓRICA V1
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `supabase/migrations/20260514_hito2_supply_price_terms.sql` | Nueva tabla `datadis_supply_price_terms` + seed 5 CUPS reales CHEMTROL (3×3.0TD Nexus, 1×2.0TD Naturgy, 1×6.1TD Bassols). Índice único `(cups) WHERE valid_to IS NULL`. RLS authenticaded. **Aplicada en prod.** | `60ab260` |
> | `src/core/energia/invoiceEstimate.ts` | Motor de cálculo puro: `calculateInvoiceEstimate()`. Potencia P1-P6, energía P1-P6, IEE (max 0.5% vs 1€/MWh mínimo Art.99.2), IVA 10%/21%, alquiler, bonoSocial. Confianza: completa/parcial/baja. | `60ab260` |
> | `src/features/datadis/api.ts` | Hook `useSupplyPriceTerms(cups)`: cache 24h, filtra `valid_to IS NULL`, retorna fila vigente. | `60ab260` |
> | `src/features/datadis/SupplyDetailPage.tsx` | Tab "Factura Teórica" completo: selector mes, badge confianza, tabla desglose P1-P6 potencia+energía, IEE+IVA+TOTAL, 3 KPIs, nota legal. React Query deduplica con ConsumoTab (cache 6h compartido). | `60ab260` |
>
> ### Decisiones técnicas Hito 2
> - P4/P5 energía NULL en 3.0TD: ningún CUPS tuvo consumo en esos períodos → confianza='parcial' si hay consumo P4/P5
> - `(supabase as any).from('datadis_supply_price_terms')`: tabla nueva no en tipos generados → cast temporal hasta regeneración
> - Reg. RRTT Sistema excluida: cargo retroactivo distribuidora impredecible → nota legal en UI
> - IEE: max(5‰ de (potencia+energía), 1€/MWh × totalKWh) per Art. 99.2 Ley 38/1992
>
> ### ⚠️ Pendiente para próxima sesión
> - **Push a GitHub**: `git push origin main` (commit local `60ab260`, push requiere credenciales Windows)
> - **Pendiente anterior**: SQL fase28.6 (`supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql`) — aún no ejecutada
>
> ---
>
> ## ✅ SESIÓN 2026-05-14 (3ª parte) — DATADIS: PERFORMANCE CACHE + HITO 1 CIERRE
>
> ### Fix rendimiento: cache 6h unificada (commit b58f4e1)
> | Causa raíz | Fix |
> |---|---|
> | `CierresTab` pedia `get_reactive` con 12m y `ReactivaTab` con 13m → queryKeys distintas → 2 llamadas reales (37s + 47s) | Ambos ahora usan `getDateRange(24)` → misma queryKey → React Query deduplica |
> | `ConsumoTab` incluia `fechaInicial/Final` variables en queryKey → re-fetch en cada selector 3/6/12/24m | Siempre pide 24m; `rangeMonths` filtra en cliente con `.slice(-rangeMonths)` |
> | `CurveTab` idem con rangos 7d/30d/3m | Siempre pide 24m; filtro por cutoff date sobre puntos crudos |
> | `staleTime: 10min` en hooks | `DATADIS_CACHE` con `staleTime: 6h`, `gcTime: 24h`, `refetchOnMount/Focus: false` |
>
> ### Hito 1 — CERRADO
> - derivePeriod30TD: 35/35 tests + validación producción OK (nov/dic/ene/feb P6 dominante)
> - Banner UI actualizado: "CNMC Circular 3/2020 + festivos Andalucía + error <0.3%"
>
> ### Pendientes Hito 2
> - Factura teórica v1: tabla `datadis_supply_price_terms` + `calculateInvoiceEstimate()`
> - Requiere: factura real CUPS para calibrar precios P1-P6 por temporada
> ---

> ## ✅ SESIÓN 2026-05-14 (2ª parte) — DATADIS: FIX CRÍTICO P6 + FESTIVOS CNMC
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `periodos30TD.ts` | Reescrito: P6 universal (fines de semana + festivos + 00:00-08:00 laborables). 4 temporadas CNMC correctas: Alta(ene,feb,jul,dic)/Media(mar,nov)/Media-Baja(jun,sep)/Baja(abr,may,ago,oct). Import isHolidayES. | `8f029d1` |
> | `holidays-es.ts` | Nuevo: festivos nacionales 2024-2026 (BOE) + autonómicos Andalucía. `isHolidayES(dateISO, ccaa?)` + `ccaaFromProvinceCode(code)`. PROVINCE_TO_CCAA con 52 provincias. | `8f029d1` |
> | `normalizers.ts` | `normalizeConsumption` acepta `{ tariff?, ccaa? }`. Pasa ccaa a cada llamada de `derivePeriod`. | `8f029d1` |
> | `SupplyDetailPage.tsx` | ConsumoTab: `ccaaFromProvinceCode(province)` → pasa ccaa a normalizeConsumption. | `8f029d1` |
> | `periodos30TD.test.ts` | Nuevo: 30 casos borde (festivos nacionales, autonómicos, fines de semana, madrugadas, períodos por temporada). | `8f029d1` |
>
> ### Bug corregido
> Bug original: división binaria verano/invierno → P3 sustituía a P6 en invierno (meses oct-mar).
> Impacto: nov/dic/ene/feb/mar mostraban P3 en lugar de P6 en el gráfico apilado — normativamente incorrecto.
> Fix: P6 se evalúa primero, antes de temporada. Festivos nacionales y de Andalucía incluidos. Error residual < 0.3% (festivos locales no incluidos).
>
> ### ✅ HITO 1 CERRADO — derivePeriod validado en producción (2026-05-14)
> - P6 barra dominante en nov/dic/ene/feb confirmado visualmente en CUPS real ✅
> - P3 desaparecido de invierno; temporadas CNMC correctas en todos los meses ✅
> - 35/35 tests automatizados pasando (periodos30TD.test.ts) ✅
> - Comparativa 13 meses vs. BOE: todos <=5% desvio por festivos ✅
> - Banner UI actualizado: CNMC Circular 3/2020 + festivos Andalucia + error <0.3%
> - **Siguiente: Hito 2 Factura teorica v1**
>
> ---
>
> ## ✅ SESIÓN 2026-05-14 — DATADIS: MODO FRANJA HORARIA
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `SupplyDetailPage.tsx` | ConsumoTab: toggle Vista mensual / Modo franja. Franja: selector mes, sliders hora inicio/fin, filtro Todos/Lab/Fds, KPIs (total kWh, % mes, día pico, hora pico), gráfico diario con día pico en rojo | `f4e06cc` |
> | `normalizers.ts` | `points: ConsumoHourlyPoint[]` añadido a `ConsumoNormalized` — array con todos los intervalos horarios para drill-down | `ce38120` |
>
> ### Funcionalidades Modo Franja
> - Slider hora inicio (0–22) + hora fin (1–23) con auto-ajuste para evitar rangos inválidos
> - Filtro tipo día: Todos / Laborables / Fin de semana (usa `isWeekend` del punto horario)
> - 4 KPIs: total kWh franja, % del mes, día pico, hora pico
> - Gráfico de barras diario filtrado; día pico resaltado en rojo con leyenda
> - Auto-selección del último mes disponible al activar Modo Franja
> - Toda la computación en memoria sobre `normalized.points[]` — 0 llamadas extra a la API
>
> ### Pendientes Datadis (próximas sesiones)
> - ⏳ #35: Autoconsumo FV en normalizeConsumption() — BLOQUEADO esperando payload real de CUPS con energyPoured/energyGenerated informados
> - ⏳ Hito 2 — Factura teórica v1: tabla `datadis_supply_price_terms` + `calculateInvoiceEstimate()`. Requiere factura real CUPS para calibrar precios P1-P6.
> - ⏳ Conectar IncidenciasTab a tabla `incidencias` real en Supabase
>
> ---
>
> ## ✅ SESIÓN 2026-05-13 (3ª parte) — DATADIS: TAB CONSUMO + PERÍODOS 3.0TD
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `periodos30TD.ts` | Nuevo: `derivePeriod()` pura, matriz 3.0TD verano/invierno, `PeriodConfidence='estimated'`, TODO festivos v2 | `4bed1ed` |
> | `normalizers.ts` | `normalizeConsumption()` reescrito: lee `timeCurveList[].measureMagnitudeActive`, `metodoObtencion`. DTOs `ConsumoMonthlyAgg` + `ConsumoNormalized` con `byPeriod`, `dominantPeriod`, `periodConfidence` | `4bed1ed` |
> | `api.ts` | `DatadisConsumptionPoint` actualizado con campos reales: `measureMagnitudeActive`, `metodoObtencion`, `energyPoured`, `energyGenerated`, `selfConsumptionEnergy` | `4bed1ed` |
> | `SupplyDetailPage.tsx` | `ConsumoTab` reescrito: gráfico apilado P1-P6 estimado, tabla con badge Real/Estimada/Mixto, aviso ámbar, KPIs (total, media, máx hora, período dominante) | `4bed1ed` |
> | `docs/datadis/payloads/` | Fixture `get_consumption_EDISTRIBUCION_2026-05-13.json` + regla de oro en blueprint: payload real antes de normalizer | `4bed1ed` |
>
> ### Validación producción ConsumoTab (2026-05-13)
> - ✅ 13 meses visibles (2025-05 → 2026-05), total 28.071 kWh (coherente con payload real ≈28k)
> - ✅ Gráfico apilado P1-P6 con leyenda; badge "Períodos estimados" visible
> - ✅ Tabla con badges Real (12 filas) / Mixto (2025-10)
> - ✅ Aviso: "matriz 3.0TD oficial, sin festivos, error <2%"
> - ✅ Regresión: Información / Contrato / Curva / Cierres / Reactiva intactas
> - ⚠️ MÁX. HORA: 24.667 kWh con 15kW contratados — posible pico con exceso de potencia, revisar en conciliación factura
>
> ### Estado módulo Datadis — VISOR OPERATIVO COMPLETO ✅
> 6 tabs validadas en producción: Información · Contrato · Curva · Cierres · Reactiva · Consumo
>
### Pendientes Datadis (estado 2026-05-14)
> - ✅ #36: ConsumoTab Modo Franja — COMPLETADO (f4e06cc)
> - ⏳ #35: Autoconsumo FV en normalizeConsumption() — esperar payload real de CUPS con energyPoured/energyGenerated informados
> - ⏳ Factura teórica v1: Contrato + Consumo + Maxímetro + Reactiva → estimación económica
>
> ---
>
> ## ✅ SESIÓN 2026-05-13 (2ª parte) — DATADIS: NORMALIZERS + TAB REACTIVA
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `src/features/datadis/normalizers.ts` | Nueva capa de normalización: `ContractDTO`, `MaxPowerDTO`, `ReactiveDTO`. Funciones `normalizeContract`, `normalizeMaxPower`, `normalizeReactive`, `extractProvince`, `extractMunicipio`, `extractTariff`. Soporta shapes EDISTRIBUCIÓN (español) + otros portales (inglés). | `a0c8e8e` |
> | `src/features/datadis/SupplyDetailPage.tsx` | Refactor completo para usar DTOs canónicos. Nueva `ReactivaTab`: KPIs, gráfico de barras con Cell coloreado, tabla P1-P6, badge de penalización por umbral. Tab 5ª añadida al router de tabs. | `a0c8e8e` + `4ea3dcc` |
> | `docs/DATADIS_BLUEPRINT_MODULO_CRM_VALERE.md` | Blueprint arquitectónico completo: DTOs, normalizers, tablas BD, dashboards, alertas, roadmap. | `b0626cb` |
>
> ### Estado módulo Datadis tras esta sesión — VALIDADO EN PRODUCCIÓN ✅
> - ✅ Normalización centralizada: frontend nunca toca campos raw de Datadis
> - ✅ Tab Reactiva funcional: KPIs (2915 kVArh total, 14/14 meses), gráfico, tabla P1-P6, badges
> - ✅ Tab Cierres: columna REACTIVA con valores reales (antes mostraba "---")
> - ✅ Tab Contrato: "Indefinido" en fin de contrato (antes mostraba "---")
> - ✅ TSC 0 errores; desplegado en https://valere-v2.pages.dev (`4ea3dcc`)
> - ⏳ Tab Consumo: desglose mensual/anual P1-P6 (próxima sesión Datadis)
> - ⏳ Curva Tipo 1/2: pendiente probar con CUPS de telemedida real
> - ⏳ Mover normalización al Edge Function datadis-proxy (backend, futuro)
>
> ---
>
> ## ✅ SESIÓN 2026-05-13 (1ª parte) — FV HARDENING COMPLETO + AUDIT SCAFFOLD
>
> | Artefacto | Cambio | Commit / Estado |
> |---|---|---|
> | `fusionsolar_client.py` | EU5 fix: `get_daily_kpi` detecta `NE=` → usa `dn`+`queryTime`+`timeZone:2`. Retry x3 en StorageStateClient. | `45a7c3a` en main |
> | `sync_job.py` | Overflow guards HOTEL SIERRA LUZ (`>99,999→0`). `sleep(1)` anti-rate-limit. | `45a7c3a` en main |
> | `.github/workflows/fv-sync.yml` | Cron `0 7 * * *` (07:00 UTC). `concurrency.group`. Fix YAML inputs injection (inputs via `env:` vars). | `4a50df9` + `a5ad0b4` en main |
> | `sync_job.py` | Helpers `_audit_record()` (no bloqueante) + `_classify_error()`. `run_id` UUID por ejecución. Backfill instrumentado. | `24653ce` en main ✅ |
> | `supabase/migrations/20260513_fv_sync_audit.sql` | ENUM `fv_error_category`, tabla `fv_sync_audit`, 4 índices, vista `fv_sync_health_latest`, RLS via `empresas.comercial_id`. | Aplicado en prod ✅ |
> | `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` | RLS granular notificaciones + limpieza policies custom_fields duplicadas. | Aplicado en prod ✅ |
> | `docs/PLAN_INCIDENCIAS_CRM_CONEXION.md` | Plan completo para conectar IncidenciasTab a tabla `incidencias` real (~2h). | Documentado ✅ |
>
> ### Validación local EU5 (sesión 2026-05-13)
> - EU5 fix validado localmente con `python sync_job.py`: `NE=135347362` KPI insertado OK
> - Overflow guard capturó `-99999999.0` para HOTEL SIERRA LUZ → guardado como `0.0 kWh` ✅
> - Merge `feature/fv-operational-redesign` → `main` completado: `24653ce` ✅
>
> ### Seguridad — Supabase Advisor (2026-05-13)
> **Resuelto**: `rls_disabled_in_public` → 0 tablas sin RLS.
> - `fv_credenciales_backup_20260511`, `fv_planta_backup_20260511`, `fv_sync_log_backup_20260511` → RLS ON sin policies (bloqueadas). Migración: `20260513_fix_rls_backup_tables.sql`
> - `datadis_provincias` → RLS ON + lectura authenticated.
> - ⏳ Pendiente DROP de las 3 tablas backup cuando se confirme que las migraciones del 11/05 están consolidadas.
>
> ### Pendientes FV (próxima sesión)
> - ⏳ **[BLOQUEANTE]** CI auth fallback: `AUTH_REDIRECT → WebAuthClient → persistir storage_state → retry único`
> - ⏳ Asignar 7 plantas reales a empresa+CUPS desde tab "Sin asignar"
> - ⏳ Configurar `RESEND_API_KEY` en Supabase Edge Functions Secrets
> - ⏳ Configurar `GITHUB_PAT` en Supabase Edge Functions Secrets
> - ⏳ Deploy Edge Function `trigger-fv-sync`
> - ⏳ Conectar `IncidenciasTab` a tabla `incidencias` real (plan en `docs/PLAN_INCIDENCIAS_CRM_CONEXION.md`, ~2h)
> - ⏳ Deploy Edge Function `chat-consultor`
> - ⏳ Regenerar tipos Supabase (4 casts `supabase as any` restantes)
> - ⏳ DROP tablas backup 20260511 (cuando confirmado que no se necesitan)
>
> ---
>
> ## ✅ SESIÓN 2026-05-12 — FV SESSION MANAGEMENT + SYNC MANUAL DESDE CRM
>
> ## ✅ SESIÓN 2026-05-12 — FV SESSION MANAGEMENT + SYNC MANUAL DESDE CRM
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | **Supabase migración** | `fv_credenciales`: nuevo campo `estado_sesion` (activa/por_caducar/caducada/error/desconocida) + `cookies_expires_at` público. Vista `fv_credenciales_safe` actualizada. Función helper `fv_estado_sesion()`. | via MCP |
> | `sync_job.py` | Escribe `estado_sesion` tras cada intento sync. Refleja `cookies_expires_at` secret→público. Protege KPIs existentes si falla auth (no sobreescribe). Acepta `--credencial <uuid>` para sync puntual. | `7f12dc5` |
> | `fv-sync.yml` | Input `credencial_id` en `workflow_dispatch` para sync por credencial desde CRM. | `7f12dc5` |
> | `supabase/functions/trigger-fv-sync/index.ts` | **Nueva Edge Function**: recibe petición del CRM (master/admin), llama GitHub Actions dispatch API con `GITHUB_PAT`. Registra en `fv_sync_log`. | `7f12dc5` |
> | `api.ts` | Tipo `FVEstadoSesion`, campo `estado_sesion` en `FVCredencial`, hook `useTriggerFVSync()`. | `7f12dc5` |
> | `CredencialesTab.tsx` | Badge 🟢/🟠/🔴 por credencial. Botón "Sincronizar" individual. Botón "Sincronizar todo". Aviso sesión caducada con comando exact de `extract_cookies.py`. | `7f12dc5` |
>
> **Pendiente tras esta sesión:**
> 1. Crear GitHub PAT (Actions: Read & Write) → añadir como secret `GITHUB_PAT` en Supabase Edge Functions
> 2. `npx supabase functions deploy trigger-fv-sync --project-ref gtphkowfcuiqbvfkwjxb`
> 3. Renovar cookies FusionSolar (`python extract_cookies.py`) y validar botón Sincronizar en CRM
>
> ---
>
> ## ✅ SESIÓN 2026-05-12 — FIX BUG CACHÉ EU5 (sesión anterior continuada)
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `fusionsolar_client.py` | `StorageStateClient.get_station_list`: añadida clave `dn` al cache key (EU5 usa `dn`, no `stationCode`). `get_station_kpi`: check ampliado de campos realtime + warning de fallback. | `626985a` |
> | `sync_job.py` | Logs `[DIAG-KPI]` para validar clave EU5. KPI extraction con todas las variantes de campo. Fix `capacidad_kwp` usando `onlyInverterPower` como fallback. | `626985a` |
> | `api.ts` | Join `cups:cups(id, codigo_cups)` + normalización `ultima_sync` y `cups_asociados`. | `7f12dc5` |
>
> ---

> **Última actualización: 2026-05-11 por Cowork — SESIÓN 3ª: fixes cierres duplicados (PlantasTab 79f07cf, AsignarPlantaModal daef025) + nueva tab "Alarmas FV" con datos reales Supabase (c9c8a16). TSC 0 errores. Branch: feature/fv-operational-redesign.**
>
> ## ✅ SESIÓN 2026-05-11 (3ª parte) — ALARMAS FV + FIXES DUPLICADOS
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `PlantasTab.tsx` | Eliminadas líneas 146-147 (cierre `)\n}` duplicado por bug sandbox append) | `79f07cf` |
> | `AsignarPlantaModal.tsx` | Eliminado `}` extra en línea 235 | `daef025` |
> | `api.ts` | Nuevo hook `useTodasLasAlarmas()` — JOIN `fv_alarma` → `fv_planta` → `empresas`, limit 200, orden `iniciada_en` DESC | `c9c8a16` |
> | `AlarmasTab.tsx` | Nueva tab: KPIs (activas/críticas/mayores/resueltas), buscador, filtros estado+severidad, botón refetch, lista con colores por severidad | `c9c8a16` |
> | `SeguimientoFVPage.tsx` | Tab "Alarmas FV" entre Excedentes e Incidencias CRM; "Incidencias" → "Incidencias CRM" | `c9c8a16` |
>
> **Estado actual**: 9 tabs en `/seguimiento-fv`. Alarmas FV lee de `fv_alarma` real (28 alarmas sincronizadas). PlantasTab y AsignarPlantaModal sin crashes. TSC 0 errores.
>
> ## ✅ SESIÓN 2026-05-11 (2ª parte) — HARDENING FRONTEND FV
>
> | Fix | Archivo | Cambio | Commit |
> |---|---|---|---|
> | C-1 crash PlantasTab | `PlantasTab.tsx:128` | `(p.cups_asociados ?? []).length` — guard undefined | `386875d` |
> | C-2 vista 404 | Supabase | `CREATE VIEW fv_credenciales_safe` con `security_invoker=true` + `GRANT SELECT TO authenticated` | via MCP |
> | C-3 estados KPI | `sync_job.py:82` | `normalize_status`: añadido `connected/on-grid→normal`, `faulty→defectuoso`, `off-grid→desconectado` | `386875d` |
> | I-4 modal "0" | `AsignarPlantaModal.tsx:109` | `!!planta.capacidad_kwp` evita render de `0` en JSX | `386875d` |
>
> **Estado fv_planta tras sync**: FOAM JAEN/MENGIBAR/JUAN RUBIO → `normal` ✅ · GUADIX/HOTEL SIERRA LUZ → `desconectado` ✅ · FOAM SANTIPONCE/PAZ Y BIEN → `desconocido` (FusionSolar envía estado no mapeado aún).
> **capacidad_kwp=0**: 5 plantas — FusionSolar no tiene el campo registrado en el portal (no es bug del sync).
>
> ## ✅ SESIÓN 2026-05-11 — SYNC FV REAL + FIXES SQL + ALARMAS
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | Supabase `fv_upsert_planta` | DROP + recreación con `RETURNS TABLE(planta_id, planta_empresa_id, planta_is_new)` — elimina ambigüedad entre output columns y columnas de `fv_planta`. UPDATE usa alias `fp`. | via MCP Supabase |
> | `scripts/fv-sync/sync_job.py` | Lee `res.data[0]["planta_id"]` (nuevo nombre RETURNS TABLE). Upsert `fv_alarma` usa `iniciada_en` (real) en vez de `detectada_en` (inexistente). Añadidos `alarm_id` y `dispositivo`. | `518da18` → feature/fv-operational-redesign |
>
> **Resultado verificado en Supabase**: `fv_planta=7, fv_kpi_realtime=7, fv_kpi_diario=7, fv_sync_log=92+`. Sync limpio: `1/1 OK — 7 plantas, 0 alarmas en 17.4s`.
>
> **Flujo de refresco de cookies**: las cookies FusionSolar duran ~7 días. Cuando expiren, ejecutar `python extract_cookies.py` (abre browser visible, hace login, guarda en `fv_credenciales_secret`).
>
> ## ✅ SESIÓN 2026-05-11 — CI FIX + DIAGNÓSTICO FV SYNC + COMMIT MÓDULO FV
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `.github/workflows/fv-sync.yml` | Step "Ejecutar sincronización" estaba truncado en línea 63 (solo `name:`). Completado con `working-directory`, `env` (4 secrets) y `run: python sync_job.py`. | `c70d44b` → main |
> | `src/features/seguimiento-fv/api.ts` | Eliminado fragmento duplicado líneas 496-512 (causa build error). Completadas truncaciones en `onSuccess`/`onError` + 3× `(supabase as any)` para columnas post-migración. | `3f095e1` → feature/demo-audit-mode |
> | `src/App.tsx` | Completada truncación en route `/cartera-senior`. | idem |
> | `src/components/layout/Sidebar.tsx` | Completadas etiquetas de cierre truncadas. | idem |
> | `src/core/demo/fixtures.ts` | Recuperadas 221 líneas perdidas (FV_ALARMAS, CUPS, DATADIS, CAPTACION, FIXTURES export). | idem |
> | `src/features/seguimiento-fv/components/PlantasTab.tsx` | Truncación + `title` → `aria-label` en icono Battery. | idem |
> | `src/features/seguimiento-fv/components/ProduccionTab.tsx` | Truncación + formatter recharts tipado con `as [string, string]`. | idem |
> | `feature/fv-operational-redesign` | 14 archivos del módulo FV completo (frontend + Edge Function + migración SQL + Python). | `7c64604` → new branch |
>
> **Run #97 resultado**: YAML fix confirmado (job ejecutó 44s vs fallo instantáneo anterior). AUTH_REDIRECT FusionSolar — cookies de sesión invalidadas server-side por Huawei. Fix: ejecutar `extract_cookies.py` localmente tras despliegue coordinado.
>
> ## ⏳ CAMBIO COORDINADO FV — PENDIENTE DESPLIEGUE (rama lista 2026-05-11)
>
> **Todo listo en rama `feature/fv-operational-redesign` (commit 7c64604). NO aplicar por separado.**
>
> Orden de despliegue cuando estés listo:
> 1. Backup tablas `fv_credenciales` y `fv_planta` en Supabase Dashboard
> 2. Configurar `FV_ENCRYPTION_KEY` en Supabase → Edge Functions → Secrets (32 bytes base64, misma clave que Python)
> 3. `supabase functions deploy fv-create-credential --project-ref gtphkowfcuiqbvfkwjxb`
> 4. Aplicar `supabase/migrations/20260510_fv_alta_manual_credenciales.sql` en SQL Editor
> 5. `python sync_job.py --check-secrets` — verifica secretos post-migración
> 6. `python sync_job.py --dry-run` — smoke sin escritura
> 7. Probar alta de credencial real desde CRM → verificar login FV
> 8. Probar asignación de planta a empresa+CUPS
> 9. Validar UI en `feature/fv-operational-redesign`
> 10. Activar sincronización recurrente
>
> Rollback SQL documentado en docs/SESIONES/2026-05-10-resumen.md.
>
> ## ✅ SESIÓN 2026-05-10 — FV MÓDULO ALTA MANUAL + SEGURIDAD
>
> | Archivo | Cambio |
> |---|---|
> | `supabase/migrations/20260510_fv_alta_manual_credenciales.sql` | Split-table: `fv_credenciales` (operativa) + `fv_credenciales_secret` (secretos, solo service_role). RLS + REVOKE sobre authenticated/anon. `username_masked` generado. `fv_planta` con `cups_id`, `sync_enabled`, `nombre_fusionsolar`, `nombre_interno`, `empresa_id` nullable. |
> | `supabase/functions/fv-create-credential/index.ts` | Edge Function: cifrado AES-256-GCM, JWT + rol admin/master, escribe en ambas tablas, rollback si falla secret, nunca devuelve password_enc |
> | `src/features/seguimiento-fv/api.ts` | `useCrearCredencial`/`useActualizarCredencial` vía Edge Function, `usePlantasSinAsignar`, `useAsignarPlantaEmpresa` |
> | `src/features/seguimiento-fv/components/CredencialFormModal.tsx` | Formulario alta/edición credencial con toggle password, aviso seguridad, plataformas pre-configuradas |
> | `src/features/seguimiento-fv/components/AsignarPlantaModal.tsx` | Asignación planta → empresa + CUPS con selects en cascada |
> | `src/features/seguimiento-fv/components/CredencialesTab.tsx` | Self-fetching, fallback a fixtures, banner demo mode, botones crear/editar |
> | `src/features/seguimiento-fv/components/SinAsignarTab.tsx` | Self-fetching, tabla con "Asignar cliente" por planta |
> | `scripts/fv-sync/sync_job.py` | `load_fv_credentials_with_secrets()` (JOIN a tabla secreta), `check_secrets_diagnostic()`, `--check-secrets` flag, sin KeyError si falta secret |
> | `scripts/fv-sync/extract_cookies.py` | Lee password de `fv_credenciales_secret`, escribe cookies en `fv_credenciales_secret` vía upsert |
> | `COMMIT_FV_MODULE_2026-05-10.ps1` | Incluye todos los archivos anteriores, checklist de despliegue en output |
>
> ## ✅ SESIÓN 2026-05-10 — FV SYNC DIAGNÓSTICOS (sesión anterior)
>
> | Archivo | Cambio | Commit |
> |---|---|---|
> | `fusionsolar_client.py` | FusionSolarAuthError/ResponseError + StorageStateClient completo (check_session, _log_storage_state_info, _fetch estructurado, login robusto con FusionSolarAuthError en redirect) | `cda9a24` |
> | `extract_cookies.py` | Usa `context.storage_state()` (cookies + localStorage) en vez de solo `context.cookies()` | `cda9a24` |
> | `sync_job.py` | Importa FusionSolarAuthError, catch específico con log `AUTH_REDIRECT` + `ACCIÓN REQUERIDA: ejecuta extract_cookies.py` | `cda9a24` |
> | `test_cookie_auth.py` | Reescrito: usa StorageStateClient igual que CI, check_session() + get_station_list(), diagnósticos OK/AUTH_REDIRECT/NON_JSON/SUPABASE_ERROR | `cda9a24` |
> | `fv-sync.yml` | Elimina step Playwright duplicado; añade step "Diagnóstico entorno" (fecha UTC, Python version, vars de entorno presentes sin mostrar valores) | `cda9a24` |
>
> ## ⏳ PENDIENTES FV (fase hardening)
>
> - ✅ Sync FusionSolar real: 7 plantas, 28 alarmas, upserts idempotentes
> - ✅ Frontend hardening: crash PlantasTab, vista fv_credenciales_safe, normalize_status, modal fix
> - ⏳ Asignar 7 plantas reales a empresa + CUPS desde tab "Sin asignar"
> - ⏳ Activar cron GitHub Actions nocturno (fv-sync.yml ya existe — añadir schedule)
> - ⏳ Configurar RESEND_API_KEY para alertas email alarmas críticas
> - ⏳ Tab "Alarmas FusionSolar" separado de "Incidencias CRM"
> - ⏳ Mapear estados FusionSolar desconocido restantes (FOAM SANTIPONCE, PAZ Y BIEN)
> - ⏳ Limpiar logs [DIAG] temporales en sync_job.py
> - ⏳ localStorage.removeItem("sb-dtpbghvfxwyvkugtsojr-auth-token") en cliente
>
> ## 📋 PENDIENTES CRM (previos, sin cambios hoy)
>
> - ✅ SQL fase28.6 aplicado en Supabase 2026-05-13 vía MCP (`fase28_6_rls_policies_cleanup`). **Nota**: aplicado manualmente, NO mediante `supabase db push` — el archivo local `20260422_fase28_6_rls_policies_cleanup.sql` queda como referencia histórica pero ya NO debe re-ejecutarse.
> - Deploy Edge Function `chat-consultor`
> - Regenerar tipos Supabase (4 casts `supabase as any` restantes)

> **Última actualización (más reciente): 2026-05-05 (jornada larga) por Cowork — 5 sprints encadenados con smoke real Carolina entre cada uno. Todo desplegado.**
>
> ## ✅ JORNADA 2026-05-05 — RESUMEN
>
> Sesión arrancó con feedback real de Carolina A sobre Herba Ricemills. Encadenamos 5 sprints validados con smoke entre cada uno:
>
> | Sprint | Commit | Smoke |
> |---|---|---|
> | Sprint Fase 2-3 + vencimiento prospecto | `0260ae3` | OK Carolina |
> | Sprint C — visibilidad post-handoff | `8c38089` | OK con Claude in Chrome |
> | Hotfix C — toast + drawer placeholder | `ffb3bfa` | OK Carolina |
> | Sprint D1 — helper vencimiento + cards | `b3c3d03` | OK uso real |
> | Fix1 RAG — Edge Function v20 (sin Fuentes:) | (Edge Fn, no commit) | 3/3 OK |
> | Fix2 RAG — docs/help al día | `d0efcf6` | 5/5 OK Carolina |
> | Micro-fix RAG — Edge Function v21 anti-alucinación | (Edge Fn, no commit) | aplicado tras alucinación P5 |
>
> ## ✅ SPRINT C — VISIBILIDAD POST-HANDOFF (2026-05-05)
>
> Origen: smoke real Carolina con Herba Ricemills. Al pasar caso a analista perdía control comercial.
>
> ### BD aplicada (mirror SQL: `supabase/migrations/20260505_sprint_c_visibilidad_post_handoff.sql`)
> - Vista `v_captacion_todos_mis_casos` ampliada: incluye `created_by`, `creador_nombre`, `creador_funciones`.
> - RPC `agregar_comentario_oportunidad(uuid, text)` — inserta actividad tipo `nota` permitido a responsable, creador, admin/senior, o usuario que aparezca en handoffs.
>
> ### Frontend
> - `OportunidadDrawer`: cabecera "Responsable / Creador", banner azul "Solo seguimiento", botón "Añadir comentario" + form inline. Footer de cambio de etapa oculto cuando `esSoloSeguimiento`.
> - `BandejaCard`: badge azul "Solo seguimiento" cuando user no es responsable (solo en pestaña "Todos mis casos").
> - Hook `useAgregarComentario`.
>
> ### Hotfix C aplicado (commit `ffb3bfa`)
> - Toaster: `top-right` 3.5s → `bottom-right` 5s. No tapa botones.
> - Drawer vencimiento: ahora siempre visible en captación; placeholder dashed gris cuando no hay fecha. Carolina ve si guardó OK.
>
> ## ✅ SPRINT D1 — HELPER + CARDS MEJORADAS (2026-05-05)
>
> Origen: análisis Carolina + ChatGPT — la card no decía qué hacer, había que abrir cada drawer.
>
> ### BD (mirror SQL: `supabase/migrations/20260505_d1_v_mis_oportunidades_vencimiento.sql`)
> - Vista `v_mis_oportunidades` ampliada: `fecha_vencimiento_contrato_prospecto`, `fuente_vencimiento_contrato_prospecto`, `factura_fecha_prevista`. Aditivo, sin breaking changes.
>
> ### Frontend
> - Nuevo módulo `src/features/captacion/utils/vencimiento.ts`: helper limpio con campos `estado / diasRestantes / label`. Función `siguienteAccionLead(etapa, fecha)` con overlay de urgencia. `ESTADO_CLASSES` central.
> - 15 tests nuevos (`vencimiento.test.ts`) con `vi.useFakeTimers`. Cubre 90 días = amarillo (caso borde validado).
> - Migrado helper viejo en `api.ts` (re-export). `VencimientoContratoForm` y `OportunidadDrawer` usan `sem.estado`.
> - `BandejaCard`: badge color con texto "Vence en X días" debajo del NIF (solo si hay fecha). Línea "→ siguiente acción" ahora dinámica con texto urgente cuando aplica.
>
> ### Resultado
> Carolina ve en cards: "Urgente: vence en 15 días — llama ya", "Prioridad alta: vence en 50 días", etc. Sin abrir el drawer.
>
> ## ✅ FIX1 RAG — EDGE FUNCTION SIN "FUENTES:" (2026-05-05)
>
> Origen: smoke Carolina detecta que el asistente RAG mostraba `[Fuente N: docs/help/...]` en respuestas. Ruido visual + jerga técnica para usuario no técnico.
>
> ### Aplicado
> - Edge Function `ask-crm-docs` versión 20 desplegada via MCP.
> - System prompt reescrito: prohíbe explícitamente citar archivos, rutas, "Fuentes:", "Referencias:".
> - Contexto interno usa delimitadores neutros (`--- INFORMACIÓN INTERNA ---` / `--- FIN ---`) sin path. El LLM ya no tiene de dónde copiar la sintaxis técnica.
> - Array `sources` sigue en JSON por si futuro UI propio, pero hoy se ignora.
>
> ## ✅ FIX2 RAG — DOCS/HELP AL DÍA (2026-05-05)
>
> Origen: tras Fix1, las preguntas sobre features nuevas ("Solo seguimiento", "comentario", "prospecto vs cliente") devolvían honestamente "No encuentro información". Faltaba la documentación.
>
> ### Docs nuevos
> - `docs/help/captacion/separacion-prospecto-cliente.md` (9 chunks indexados).
> - `docs/help/captacion/seguimiento-tras-handoff.md` (12 chunks).
> - `docs/help/captacion/vencimiento-y-semaforo.md` (12 chunks).
>
> ### Docs actualizados
> - `crear-lead.md`: bloque vencimiento + nace prospecto.
> - `pasar-a-analisis.md`: sección "Después de pasarlo" con visibilidad + comentarios.
> - `README.md`: índice + estado.
>
> ### Pipeline
> Workflow `regenerate-help-embeddings` ejecutó: DELETE + INSERT en `crm_help_embeddings`. Embeddings nuevos validados con SQL contra Supabase.
>
> ### Smoke 5/5 OK con Carolina
> 1. "Solo seguimiento" → respuesta operativa.
> 2. "Cómo añado comentario" → pasos numerados.
> 3. "Prospecto vs cliente" → diferencias claras.
> 4. "Cómo registro fecha vencimiento" → vías + fuentes + semáforo.
> 5. Bonus "Cómo funciona el semáforo" → tabla colores.
> Sin "Fuentes:", sin rutas, sin jerga técnica.
>
> ## Deuda técnica conocida (no bloqueante)
>
> - **4 casts `(supabase as any)`** por columnas nuevas no reflejadas en tipos generados. Solución: regenerar tipos. Pendiente.
> - **Cache Cloudflare con bundles obsoletos** en tabs viejos. Patrón conocido. Solución: hard refresh + tab nuevo.
> - **Alucinación menor del asistente RAG**: la respuesta P5 mencionó *"Naranja y Rojo aparecen en Dashboard como alertas"* — no implementado. Si Carolina lo busca y no lo encuentra, refinar doc o implementar alertas reales.
>
> ## Próxima sesión (orden firmado tras dictamen ChatGPT cierre)
>
> **REGLA #0:** NO arrancar nada técnico hasta tener feedback REAL de Carolina.
>
> 1. **Recoger feedback real Carolina** (sin código). Frases literales tipo "no veo qué hacer hoy" / "abro muchas cards" / "¿qué hago ahora?".
> 2. Si Carolina aporta fricción → fix prioritario por su feedback.
> 3. Si no → **D2 vista tabla**. Mensaje detallado en `.cowork/outbox/2026-05-06T-d2-vista-tabla.md`.
> 4. **Decisión Dashboard comercial.** ChatGPT entregó scope completo (KPIs + alertas + acciones del día + pipeline + equipo + funnel). Trigger: 2 de 4 síntomas en uso real. Si no, no arrancar.
> 5. Filtros CRM restantes: Datadis, Renovaciones, Incidencias, Contratos.
> 6. Regenerar tipos Supabase + quitar 4 casts.
>
> ## Backlog estratégico (no arrancar sin trigger)
>
> - **`.cowork/backlog/agenda-captacion.md`** — agenda interna captación + estrategia calendarios compartidos. Plan completo con fases (interna primero, Google Calendar después). Trigger: Carolina dice "no sé a quién llamar hoy" o >20-30 prospectos activos por persona. Scope estimado cuando arranque: 1-2 sesiones cowork. El 60% de lógica ya en código.
>
> ---
>
> **Última actualización (anterior): 2026-05-05 por Cowork — Sprint Fase 2-3 separación CRM/Captación + vencimiento contrato prospecto cerrado y desplegado.**
>
> ## ✅ SPRINT FASE 2-3 + VENCIMIENTO PROSPECTO — DESPLEGADO (2026-05-05)
>
> Commit `0260ae3` en `origin/main`. TSC 0, tests 74/74, build OK, push OK. Cloudflare deploy pendiente (~2 min).
>
> ### Lo que entrega
>
> **Separación lógica CRM ↔ Captación**
> - Empresas, contactos, oportunidades, dashboard y búsqueda global del CRM filtran por `estado_relacion='cliente'` / `contexto='crm'`.
> - Captación opera independiente: prospectos no contaminan listas del CRM hasta promoción explícita.
> - Drawer captación muestra badge ámbar **PROSPECTO** y botón verde "Convertir a cliente CRM" (admin/senior + etapa cerrada_ganada/contrato_firmado/activo) → invoca RPC `convertir_prospecto_a_cliente`.
>
> **Vencimiento contrato actual del prospecto**
> - 3 columnas nuevas en `oportunidades`: `fecha_vencimiento_contrato_prospecto`, `fuente_vencimiento_contrato_prospecto`, `notas_vencimiento_contrato_prospecto`. Aisladas de la tabla `contratos` real (CRM).
> - Componente `VencimientoContratoForm` reutilizable (date + select fuente + notas + semáforo en vivo).
> - Helper puro `calcularSemaforoVencimiento`: verde >90d, amarillo ≤90d, naranja ≤60d, rojo ≤30d, vencido <0.
> - Integrado en `NuevoLeadModal` (bloque "Datos adicionales") y `EditarLeadModal` (sección dedicada con flag `actualizar_vencimiento` para distinguir borrar vs no tocar).
> - `OportunidadDrawer` muestra fecha + semáforo + fuente + notas en el detalle.
>
> ### BD prod (aplicada vía MCP, mirror SQL en disco)
>
> 1. `20260505_fase1_separacion_captacion_crm.sql`
>    - ALTER `empresas` (+ `estado_relacion`, `origen_relacion`, `convertido_cliente_at/_por`)
>    - ALTER `oportunidades` (+ `contexto`, `convertida_a_crm_at/_por`)
>    - Backfill: 24 clientes históricos / 9 prospectos (4 DEMO + 2 TEST SMOKE + 3 leads Carolina A)
>    - Trigger `enforce_oportunidad_contexto_coherence`
>    - RPC `convertir_prospecto_a_cliente` SECURITY DEFINER
>    - 4 vistas con `security_invoker = true`
>    - `crear_lead_captacion` v3 con prospecto/captacion forzados
> 2. `20260505_vencimiento_contrato_prospecto.sql`
>    - 3 columnas nuevas en `oportunidades` + check constraint en `fuente_vencimiento`
>    - `crear_lead_captacion` v4 (3 params nuevos opcionales)
>    - `actualizar_lead_captacion` v3 (flag `p_actualizar_vencimiento` boolean)
>
> ### Deuda técnica conocida (no bloqueante)
>
> - 4 archivos con cast `(supabase as any)` por columnas nuevas no reflejadas en tipos generados:
>   - `src/features/empresas/api.ts:32`
>   - `src/features/oportunidades/api.ts:30`
>   - `src/features/dashboard/api.ts:51`
>   - `src/components/search/GlobalSearch.tsx:26`
> - Solución: regenerar tipos con `supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts` y quitar los casts.
>
> ### Smoke test pendiente Juan (post deploy CF)
>
> 1. `/empresas` debe mostrar 24 clientes, NO 33.
> 2. `/captacion` sigue mostrando los 9 prospectos.
> 3. Crear lead nuevo → nace con `estado_relacion=prospecto, contexto=captacion`.
> 4. Vencimiento prospecto: 15d→rojo, 50d→naranja, 80d→amarillo, 200d→verde.
> 5. Convertir a cliente: solo admin/senior + etapa ganado/firmado.
>
> ### Orden siguiente sesión (acordado con Juan/ChatGPT 2026-05-05)
>
> 1. Smoke corto separación/vencimientos (validar antes de tocar nada).
> 2. Filtros módulos CRM restantes: Datadis, Renovaciones, Incidencias, Contratos.
> 3. Badge "Vence en X días" en `BandejaCard` (P1 útil para Carolina).
> 4. Regenerar tipos Supabase + quitar 4 casts `(supabase as any)`.
> 5. Tests unitarios `calcularSemaforoVencimiento` (helper puro, fácil con `vi.useFakeTimers`).
>
> Mensaje detallado para próxima sesión en `.cowork/outbox/2026-05-05T-prioridades-post-fase23.md`.
>
> ---
>
> **Última actualización (anterior): 2026-05-04 tarde por Cowork (sesión autónoma) — Sprint Operativo Captación COMPLETO en disco (Días 1-5). Pendiente PS1 commit + push.**
>
> ## ✅ SPRINT OPERATIVO CAPTACIÓN — COMPLETO
>
> Carolina Aroca ya puede operar end-to-end. La sesión autónoma de la tarde cerró Días 2-5.
>
> **Día 1 commiteado en main** (commit `4dfc3b1`): permisos por funciones, drawer base, RPC lead.
>
> **Días 2-5 en disco, pendiente commit** (script `COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1`):
> - Modal "+ Nuevo lead" con form mínimo viable
> - 14 forms contextuales por etapa cubriendo todo el ciclo:
>   - Por llamar: No contesta / No es decisor / Esperando factura / No interesa
>   - Esperando factura: Recordatorio / Factura recibida (upload) / Pasar a análisis / No envía
>   - Factura recibida (Carolina M): Empezar análisis / Asignar a senior
>   - En análisis / Propuesta en preparación: Subir propuesta lista
>   - Asignada a senior: Empezar a preparar propuesta
>   - Propuestas para enviar: Marcar enviada
>   - Seguimientos: Cliente acepta / rechaza (con motivo) / Pedir visita / Programar
> - Upload Supabase Storage con validaciones (PDF/JPG/PNG, max 15MB, sanitización)
> - Handoffs manuales con triggers BD (responsable_actual_id se actualiza solo)
> - Tab "Todos mis casos" cross-bandeja para Carolina A
> - 35 tests nuevos (motivos, storage, permissions)
>
> ### BD aplicada en prod
>
> 1. `20260504_sprint_operativo_captacion_dia1.sql` (commiteada)
> 2. `20260504_sprint_captacion_dia3_storage_policies.sql` (en disco):
>    - helper `user_has_funcion(text)` STABLE SECURITY DEFINER
>    - policies adicionales en bucket `documentos` para funciones telemarketing/analista/asesor_senior/admin
>    - policies adicionales en tabla `public.documentos`
>
> ### Pendiente operativo Juan
>
> 1. Ejecutar `.\COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1` (valida TSC + tests + build, commit + push, ~2 min).
> 2. Esperar deploy Cloudflare Pages (~2 min).
> 3. Smoke test login Carolina Aroca + ciclo completo.
> 4. Si OK → enviar onboarding actualizado al equipo.
>
> ### Próximos pasos posibles tras uso real
>
> - Sprint plantillas propuestas (PDF auto)
> - Google Calendar integración para visitas
> - Permisos capa B/C/D del backlog
> - Notificaciones push/email
>
> ---
>
> **Última actualización (anterior): 2026-05-04 por Cowork — Smoke test 4 perfiles + onboarding + feedback ready. Listo para arrancar uso real.**
>
> ## ✅ DÍA 1 USO REAL — TODO PREPARADO (2026-05-04)
>
> Sesión enfocada en validación pre-uso, sin código nuevo (directriz ChatGPT).
>
> ### 1. Smoke test BD + código (objetivo)
>
> Verificación SQL de `v_mis_oportunidades` por usuario + auditoría Sidebar.tsx + App.tsx + deploy Cloudflare.
>
> | Usuario | Bandeja real (BD) |
> |---|---|
> | Carolina Aroca [telemarketing] | Industria Textil ABC [esperando_factura] |
> | Carolina Maciñeiras [analista] | Hostal del Pino [factura_recibida] |
> | Antonio Rodriguez [asesor_senior] | Frigorífica Norte [asignada_a_senior] |
> | Juan Olivares [admin+asesor_senior] | Bodega Mediterránea SL [asignada_a_senior] (€18.500 / €9.200/año) |
>
> **Nota:** se añadió Bodega Mediterránea SL a Juan el 2026-05-04 para que su bandeja Cartera Senior tenga al menos 1 caso visible al validar UI. `external_id='DEMO_MVP'` para borrado fácil cuando lleguen datos reales.
>
> Filtrado correcto. Deploy `valere-v2.pages.dev` HTTP 200 servido por Cloudflare.
>
> ### 2. Fugas conocidas (deuda no bloqueante para uso real)
>
> - Sidebar "CRM Comercial" (13 items) y "Gestión de Potencias" (9 items) visibles a todos sin filtro por funciones.
> - Solo `/admin` tiene guard de rol; resto de rutas accesibles tecleando URL directa.
> - RLS permisivo (cualquier authenticated puede CRUD cualquier tabla).
>
> Aceptado como deuda. Si el equipo reporta fricción real durante uso, se desbloquea capa A del backlog de permisos.
>
> Doc: `docs/SMOKE_TEST_4_USERS_2026-05-04.md`.
>
> ### 3. Onboarding equipo listo
>
> 3 borradores de mensaje (Antonio, Carolina M, Carolina A) en `docs/ONBOARDING_4_USERS_2026-05-04.md`. Tono coloquial profesional, en castellano. Carolina Aroca con password temporal `Valere2026Temporal!` y reset en primer login.
>
> ### 4. Mecanismo feedback activado
>
> `docs/FEEDBACK_USO_REAL.md` con plantilla copiable + 6 categorías (`fuga`, `hueco`, `ux`, `bug`, `mejora`, `confianza`). Trigger: 3+ entradas o ≥7 días → Cowork procesa y propone sprint correctivo.
>
> ### Próximo paso (NO es código, es operativo de Juan)
>
> 1. Enviar los 3 mensajes a Antonio, Carolina M y Carolina A.
> 2. Asignarse a sí mismo una oportunidad demo si quiere validar UI desde perfil senior (su bandeja sale vacía hoy).
> 3. Llenar `docs/FEEDBACK_USO_REAL.md` a medida que aparezcan fricciones.
> 4. Esperar ≥1 semana antes de pedir nuevas features.
>
> ---
>
> **Última actualización (anterior): 2026-05-03 por Cowork — 4 usuarios reales operativos + 3 demos reasignados. Próximo: uso real ≥1 semana.**
>
> ## ✅ USUARIOS REALES OPERATIVOS (2026-05-03)
>
> 4 usuarios reales con funciones asignadas. Las 3 oportunidades demo han sido reasignadas a sus responsables reales según el flujo:
>
> | Usuario | Email | Funciones | Demo asignada (etapa) |
> |---|---|---|---|
> | Juan Olivares | jolivares@ | `['admin','asesor_senior']` | (sin demo asignada — supervisión) |
> | Antonio Rodriguez | arodriguez@ | `['asesor_senior']` | DEMO MVP — Frigorífica Norte SL (asignada_a_senior) |
> | Carolina Maciñeiras | administracion@ | `['analista']` | DEMO MVP — Hostal del Pino SL (factura_recibida) |
> | Carolina Aroca | info@ | `['telemarketing']` | DEMO MVP — Industria Textil ABC SL (esperando_factura) |
>
> ### Carolina Aroca — credencial inicial
>
> Usuario creado vía SQL en auth.users (no había registro previo). Password temporal: `Valere2026Temporal!`. Juan le facilita el acceso y le pide reset de password en primer login.
>
> ### Petición permisos granulares — diferida
>
> Juan pidió plantear permisos editables por usuario. **Documentado como BACKLOG en `docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md`** (4 capas: menú → entidad → campo → RPC).
> Razón del aplazamiento: directriz validada por ChatGPT — *"El modelo de datos ya soporta el flujo real. Lo siguiente no es más código, es uso real con el equipo."*
> Pre-requisito: ≥1 semana uso real con los 4 usuarios para identificar fugas concretas y diseñar permisos basados en evidencia, no en hipótesis.
>
> ### Próximo paso (sin desviación)
>
> Uso real con los 4 usuarios. Recoger feedback en `.cowork/inbox/` o `docs/SESIONES/`. Cuando haya ≥3 fricciones reales documentadas, desbloquear sprint de permisos granulares.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Schema CONGELADO. Próximo: saneamiento.**
>
> ## 🛑 SCHEMA CONGELADO (decisión final aceptada por ChatGPT)
>
> ChatGPT da dictamen final tras revisar fixes post-audit:
>
> > *"ACEPTAR. Schema ya está suficientemente bien para MVP. NO seguir refinando base de datos salvo bug real. La frase: el modelo de datos ya soporta el flujo real; el riesgo ya no está en el schema, está en empezar UI sin cerrar la deuda crítica."*
>
> ### Últimas correcciones documentales aplicadas (1 mayo noche)
>
> 1. ✅ Eliminada contradicción en `SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md` sobre "trigger motivo_perdida obligatorio" → marcado como decisión final SIN trigger, gestión UI/backend.
> 2. ✅ Eliminada misma contradicción en `RELEASE_1_CAPTACION_2026-05-01.md` (bloque SQL CREATE TRIGGER → reemplazado por nota explicativa).
> 3. ✅ Añadida nota de dependencia en `20260501_mvp_captacion_multi_rol_schema.sql` indicando que debe aplicarse junto con el fix post-audit (evita reintroducir bugs en entornos nuevos).
>
> ### Defaults validados por ChatGPT para las 3 preguntas críticas pendientes
>
> 1. **Criterio "alto consumo / cliente complejo"**: decisión MANUAL de Carolina Maciñeiras. CRM puede mostrar sugerencias visuales (consumo alto / multi-CUPS / tarifa 6.x / potencia elevada) pero NO autoasignar.
> 2. **Emails Carolina Maciñeiras + Antonio**: pendientes de Juan.
> 3. **Intentos antes de marcar `no_envia_factura`**: regla simple inicial = 3 intentos en 10 días (día 0 / día 3 / día 7 / día 10 cierre sugerido). CRM sugiere, Carolina confirma. NO automático.
>
> ### Funciones por user (validadas)
>
> ```
> Juan:                ['admin', 'asesor_senior']
> Antonio:             ['asesor_senior']
> Carolina Aroca:      ['telemarketing']
> Carolina Maciñeiras: ['analista']
> ```
>
> ### Frase guía actualizada
>
> > *El modelo de datos ya soporta el flujo real. El riesgo ya no está en el schema; está en empezar UI sin cerrar la deuda crítica.*
>
> ### Orden inflexible de saneamiento (sin desviación)
>
> ```
> 1. Cerrar TSC Potencias                    [Code/Juan, ~2.5h]
> 2. QA + commit Sprint A                    [Juan, ~45min]
> 3. Regenerar tipos Supabase                [Code, prohíbe nuevos `as never`]
> 4. Crear users Maciñeiras + Antonio        [Cowork, cuando Juan dé emails]
> 5. Asignar funciones a los 4 users         [Cowork]
> 6. Sembrar responsable_actual_id 4 oport.  [Cowork, manual case-by-case]
> 7. Empezar UI MVP por BANDEJAS por rol     [no dashboards, no Kanban genérico]
> ```
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Fixes post-audit ChatGPT aplicados**
>
> ## ✅ FIXES POST-AUDIT CHATGPT APLICADOS EN BD
>
> ChatGPT auditó el schema MVP recién aplicado. Veredicto: **ACEPTAR CON CONDICIONES**. Detectó 3 problemas técnicos pequeños pero importantes. Corregidos vía MCP. Migration espejo: `supabase/migrations/20260501_mvp_captacion_fixes_post_audit_chatgpt.sql`.
>
> ### Fix 1 — `to_user_id` FK incoherencia
>
> Era `NOT NULL + ON DELETE SET NULL` (contradictorio: Postgres lo acepta pero falla en runtime al borrar usuario).
> ✅ Cambiado a `ON DELETE RESTRICT` (un handoff histórico nunca pierde a quién recibió el caso).
>
> ### Fix 2 — `v_mis_oportunidades` security_invoker
>
> Falta `WITH (security_invoker = true)` — buena práctica Supabase para que filtrado RLS use el rol del consumidor, no del creador. Crítico para futuro portal cliente.
> ✅ Recreada con `security_invoker = true` + `GRANT SELECT TO authenticated`.
>
> ### Fix 3 — Catálogo motivo_perdida (inconsistencia documental)
>
> Estaba documentado en RELEASE_1 pero la migration MVP no lo incluyó. ChatGPT detectó la inconsistencia.
> ✅ Aplicado `motivo_perdida_enum` (21 valores en 4 familias: A_contacto / B_estatus / C_funnel / D_fuera_perfil) + columnas `motivo_perdida_codigo` + `motivo_perdida_detalle` + vista `v_motivos_perdida_familia`.
> ⚠️ SIN trigger obligatorio (lo gestionará UI cuando llegue, según recomendación ChatGPT).
>
> ### QA test trigger handoff
>
> Test end-to-end con rollback: trigger `tg_oportunidad_handoff_apply` actualiza correctamente `responsable_actual_id` y `etapa_operativa` al insertar handoff. Sin residuos. ✓
>
> ### Veredicto ChatGPT
>
> > *"ACEPTAR CON CONDICIONES. No revertiría. Schema multi-rol es mejora clara, refleja flujo real, aditivo, no toca frontend. PERO no dejaría que Claude empiece UI todavía."*
>
> ChatGPT también valida la concepción rectora: **"Cada usuario ve solo lo que le toca AHORA"** vía `v_mis_oportunidades`. Y refuerza un principio UX clave: **"Diseña bandejas, no pantallas genéricas. Que diga 'esto es lo que tienes que resolver ahora'"**.
>
> ### Pasos antes de UI MVP (orden inflexible)
>
> 1. Cerrar TSC sprint Potencias (Code, ~2.5h).
> 2. QA + commit Sprint A (`docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md`, ~45 min).
> 3. **Regenerar tipos Supabase** `npx supabase gen types typescript` antes de UI (evitar más `as never`).
> 4. Crear users Carolina Maciñeiras + Antonio en BD (cuando Juan dé emails).
> 5. Asignar `funciones` a los 4 users (Juan/Antonio/Aroca/Maciñeiras).
> 6. Sembrar `responsable_actual_id` en las 4 oportunidades existentes.
> 7. **Empezar UI por bandejas, no por dashboard** (principio ChatGPT).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Schema MVP multi-rol APLICADO en BD**
>
> ## ✅ SCHEMA MVP CAPTACIÓN APLICADO (saneamiento estructural sin código frontend)
>
> Tras feedback ChatGPT al modelo multi-rol (3/4 ajustes aceptados, 1 matizado), aplicado a BD prod vía MCP. Documento decisiones: `docs/SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md`.
>
> ### Aplicado en BD producción
>
> - **`oportunidades` ALTER**: 8 columnas nuevas (etapa_operativa, responsable_actual_id, decisor_identificado, factura_recibida_at, factura_documento_id, propuesta_documento_id, propuesta_enviada_at, visita_programada_at).
> - **CHECK etapa_operativa** con 10 valores: nuevo / contactado / esperando_factura / factura_recibida / en_analisis / propuesta_en_preparacion / propuesta_lista / propuesta_enviada / seguimiento / cerrado.
> - **Tabla `oportunidad_handoffs`** con trigger `handoff_apply` que actualiza `responsable_actual_id` automáticamente.
> - **Tabla `oportunidad_emails`** (concepto decisor vs ejecutor — aporte ChatGPT).
> - **Vista `v_mis_oportunidades`** filtra por `responsable_actual_id = auth.uid()`.
> - **`user_profiles.funciones text[]`** para telemarketing/analista/asesor_senior/admin.
>
> Migration espejo: `supabase/migrations/20260501_mvp_captacion_multi_rol_schema.sql`.
>
> ### Decisiones tras ChatGPT
>
> - ✅ Aceptado: simplificar de 17 a 10 estados operativos (no 9 — necesito distinguir factura_recibida de en_analisis).
> - ✅ Aceptado: tabla emails con decisor + ejecutor.
> - ✅ Aceptado: minimizar triggers (solo handoff_apply + motivo_perdida).
> - 🔧 Matizado: NO añadido `tipo_atencion` (se deriva de funciones del responsable).
>
> ### Lo que NO se ha hecho (sigue regla "no programar UI encima de base inestable")
>
> - Cero código frontend nuevo.
> - Cero modificación a `src/`.
> - Cero migration nuevas pendientes.
>
> ### Pendiente para arrancar UI MVP
>
> 1. **Cerrar TSC sprint Potencias** (Code en PowerShell, ~2.5h).
> 2. **Commit Sprint A actual** (~30+ archivos working tree).
> 3. **Crear users en BD** para Carolina Maciñeiras y Antonio (cuando Juan dé emails).
> 4. **Asignar `funciones`** a los 4 users.
> 5. Entonces UI MVP 7 días siguiendo `FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md`.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — FLUJO REAL multi-rol descubierto**
>
> ## 🚨 DESCUBRIMIENTO CRÍTICO — flujo de captación es MULTI-ROL, no 1 vendedor
>
> Juan describió el flujo real. Cambia profundamente el diseño del MVP. Doc: `docs/FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md`.
>
> ### 4 roles operativos identificados
>
> | Persona | Rol | Función |
> |---|---|---|
> | Carolina Aroca | Telemarketing + envío + seguimiento | Llama lead, pide decisor, manda presentación, pide factura, recibe propuesta lista, la envía, llama seguimiento |
> | Carolina Maciñeiras | Análisis + decisión asignación + propuestas estándar | Recibe factura, analiza, decide complejidad, hace propuesta estándar, decide a qué asesor asignar |
> | Antonio | Asesor senior | Atiende casos complejos directamente, propuesta personalizada, cierre directo |
> | Juan | Asesor senior + master | Idem Antonio + visión global |
>
> ### Workflow con handoffs explícitos
>
> ```
> Carolina Aroca llama → manda presentación → pide factura
>   ├── No factura → cierre `no_envia_factura`
>   └── Factura recibida → handoff a Carolina Maciñeiras
>           ├── Estándar → Maciñeiras hace propuesta → handoff a Carolina Aroca
>           │              └── Aroca envía email + llama seguimiento → cierre
>           └── Complejo → Maciñeiras decide asesor → handoff a Antonio o Juan
>                          └── Asesor contacta DIRECTAMENTE al cliente → cierre directo
> ```
>
> ### Modelo de datos propuesto (cambia el MVP)
>
> - ALTER `oportunidades`: `etapa_operativa`, `responsable_actual_id`, `tipo_atencion` (estandar/senior), `factura_recibida_at`, `factura_documento_id`, `propuesta_documento_id`.
> - Nueva tabla `oportunidad_handoffs` con trigger que actualiza `responsable_actual_id` automáticamente.
> - Vista `v_mis_oportunidades` filtra por `responsable_actual_id = auth.uid()`.
> - ALTER `user_profiles`: `funciones text[]` con valores telemarketing/analista/asesor_senior/admin.
>
> ### MVP redimensionado (de 3-5 días → 7 días)
>
> - Día 1: schema multi-rol + crear users Carolina M. y Antonio en BD.
> - Día 2: UI Carolina Aroca (3 tabs: por llamar / propuestas para enviar / seguimientos).
> - Día 3: UI Carolina Maciñeiras (facturas pendientes + propuestas en preparación).
> - Día 4: UI asesores senior (cartera asignada a mí).
> - Día 5: subida factura + propuesta documento.
> - Día 6: compliance básico + motivos pérdida.
> - Día 7: QA con los 4 roles + ajustes.
>
> Esto **es un MVP que refleja la realidad**. El v1 anterior (1 vendedor) habría fallado en simulación.
>
> ### 10 preguntas pendientes a Juan antes de empezar
>
> Críticas (1, 4, 8): criterio "alto consumo", users en BD, intentos antes de marcar perdida.
> Importantes (2, 3, 5, 6): handoff post-asesor senior, formato propuestas, visita, multi-CUPS.
> Refinamiento (7, 9, 10): reasignaciones, generar propuesta sin factura, cliente recuperación.
>
> ### Confirmación de la hipótesis ChatGPT
>
> ChatGPT predijo: *"es bastante posible que descubramos que el modelo de datos es incorrecto"*. **Confirmado**: el modelo "1 vendedor → cliente" no encaja. Necesitamos modelo multi-rol con handoffs. Esto valida la regla "diseña → prueba → corrige → repite": antes de programar más, modelar bien la realidad.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Reenfoque pre-producto + MVP validación**
>
> ## 🔁 REENFOQUE ESTRATÉGICO (tercera ronda ChatGPT — auditor externo)
>
> Tras leer el handoff completo, ChatGPT corrige el diagnóstico:
>
> > *"No es problema de adopción. Es producto en construcción con datos heredados. Estado natural de pre-producto. Pero estás diseñando SIN datos reales de uso → riesgo de sobre-diseño antes de validación."*
>
> **Acepto el reenfoque con un matiz**: ChatGPT propone "Release 1 en 3 días" — discrepo en formulación, **acepto en espíritu**: 3-5 días MVP pelado + 1 semana simulación + 4-6 días R1 final.
>
> ### Regla nueva (sustituye a 70/30):
> > *Diseña → prueba → corrige → repite. Construir el siguiente paso pequeño, ponerlo en manos de Carolina, observar, decidir con esa información.*
>
> ### Plan próximas 4 semanas
>
> | Semana | Foco | Outcome |
> |---|---|---|
> | 1 | L-M cierre TSC + commit + 30.2/30.3 · X-V construcción **MVP pelado** | MVP usable mínimo (5 días) |
> | 2 | Simulación uso real Carolina · NO construir nada nuevo · solo observar | datos de uso real |
> | 3 | L sesión revisión + decisiones · M-V Release 1 final ajustado | R1 validado por uso |
> | 4 | Sprint B (FASE 31 modelo energético) o pivot según aprendizajes | siguiente sprint |
>
> ### MVP pelado (3-5 días) — qué entra
> - `/captacion` lista priorizada manual (sin scoring matemático).
> - Ficha llamada activa + outcomes con motivos pérdida (catálogo cerrado).
> - Botón `tel:` (sin CTI).
> - Alta empresa+contacto+oportunidad unificada.
> - Schema mínimo: `origen_canal`, `motivo_perdida` enum, `no_llamar`.
> - Aviso LOPDGDD verbal (sin auditoría sofisticada).
>
> ### MVP NO incluye
> - PDF diagnóstico, plantilla email Gmail, lead scoring, cadencias, dashboard supervisor, tracking apertura, compliance profundo. **Solo si Carolina lo pide post-simulación**.
>
> ### Criterios éxito simulación (≥3 de 5)
> - Carolina logra 4h+ continuas con CRM 1 día concreto.
> - Tiempo cerrar llamada < 60 seg.
> - ≥50% llamadas registradas vs hechas.
> - Cualitativamente: "es mejor que mi Excel".
> - ≥1 propuesta enviada desde CRM.
>
> Documento ejecutable: `docs/REENFOQUE_USO_REAL_2026-05-01.md`.
>
> ### Compromiso Cowork durante simulación
> NO construir nada nuevo, NO arreglar a mitad de jornada, observar + recopilar feedback en `docs/SIMULACION_CAROLINA_FEEDBACK.md` (futuro).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — FASE 30.3 + paquete handoff auditor externo**
>
> ## ✅ FASE 30.3 cerrada (saneamiento autorizado dentro regla 70/30)
>
> Aplicada autónomamente vía MCP + edits TS:
> - BD prod: UPDATE 1 fila `contactado`→`auditoria_consumo` + ALTER CHECK a 8 etapas + comment.
> - TS: `EtapaOportunidad` en `entities.ts` reducido a 8 valores.
> - TS: `OportunidadForm.tsx` ETAPAS array limpio.
> - Mapeo defensivo legacy→canónica mantenido en KanbanColumn/OportunidadForm como capa seguridad.
> - Migration espejo: `supabase/migrations/20260501_fase30_3_cerrar_etapas_legacy.sql`.
>
> Estado BD post-aplicación: 3 `cerrada_ganada` + 1 `auditoria_consumo`. Pipeline 100% energético.
>
> ## 📦 PAQUETE HANDOFF PARA AUDITOR EXTERNO (ChatGPT u otro)
>
> A petición de Juan, generado paquete autocontenido para auditoría sin acceso al repo:
>
> **5 documentos nuevos:**
> - `docs/HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` — documento maestro (11 secciones).
> - `docs/INDEX_PROYECTO_VALERE.md` — punto de entrada general.
> - `docs/ESTADO_TECNICO_ACTUAL.md` — stack + arquitectura.
> - `docs/ROADMAP_VIGENTE.md` — roadmap condensado.
> - `docs/DEUDA_TECNICA_PRIORIZADA.md` — deuda con coste de cierre.
>
> **ZIP descargable:**
> - `valere-crm-audit-pack-2026-05-01.zip` — 1.5 MB, 438 archivos.
> - Incluye: docs/, supabase/migrations, supabase/functions, src/, scripts/, package.json, tsconfig*, vite.config, .env.example, CLAUDE.md, index.html.
> - Excluye: .env real, .git, node_modules, .venv, __pycache__.
> - El `.env` real de `scripts/fv-sync/` redactado a `[REDACTED]`.
>
> ## ➡️ PRÓXIMO PASO INMEDIATO (Juan en PowerShell)
>
> 1. Cerrar TSC sprint Potencias (`docs/SPRINT3_TSC_PENDIENTE.md`, ~2.5h).
> 2. Ejecutar `CHECKLIST_QA_SPRINT_A_2026-05-01.md` (30-45 min).
> 3. Si todo verde → commit + push según comando del checklist (incluye los 30+ archivos de hoy).
> 4. Para auditoría: subir ZIP + handoff a ChatGPT (o cualquier auditor externo).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 Cowork — Módulo Datadis completo: tabs funcionales + caché persistente Supabase**
>
> ## ✅ MÓDULO DATADIS — SPRINT COMPLETADO
>
> | Item | Estado | Detalle |
> |---|---|---|
> | `DatadisPage` — filas navegables | ✅ | `<Link>` en CUPS + `onClick` en fila → `/datadis/:cups`. `distributorLabel()` resuelve nombre completo |
> | `SupplyDetailPage` — 4 tabs | ✅ | Información, Contrato, Curva, Cierres. Helper `sf()` mapea claves español↔inglés |
> | Ruta `/datadis/:cups` | ✅ | Registrada en `App.tsx`, lazy loaded |
> | Fixes auditoría P0/P1/P2 | ✅ | Claves API en español, tipoPunto guard en CurveTab, distribuidoras, tildes, badge "Sincronizado", botón volver |
> | Tabla `datadis_proxy_cache` | ✅ APLICADA en prod | Cache read-through con TTL por action. RLS authenticated=SELECT, service_role=write |
> | Edge Function `datadis-proxy` v8 | ✅ DESPLEGADA (version 8, ACTIVE) | Cache HIT fresco → devuelve sin llamar Datadis. Cache MISS → llama y guarda. Fallo Datadis → fallback stale |
> | Scripts commit | ✅ | `COMMIT_DATADIS_AUDIT_FIXES.ps1`, `COMMIT_DATADIS_PROXY_V8.ps1`, `COMMIT_DATADIS_MAIN.ps1` **ejecutados por Juan** |
>
> ## ➡️ SIGUIENTE SESIÓN
>
> - TSC `claude/sprint2-lib-potencias` sigue pendiente (~60 errores documentados en `docs/SPRINT3_TSC_PENDIENTE.md`)
> - Sprint A sub-fases pendientes: 30.2 (DROP renovaciones), 30.3 (etapas legacy), 30.7 (vinculación masiva NIF), 30.9 (RLS granular)
> - Cuando Datadis tenga acceso API funcional: añadir botón "Actualizar desde Datadis" en `SupplyDetailPage` con `force_refresh: true`
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Opción A reducida aceptada + verificaciones BD**
>
> ## ✅ DECISIÓN ESTRATÉGICA — Opción A reducida (saneamiento primero)
>
> Tras segunda crítica ChatGPT, aceptado plan: **2-3 días de saneamiento técnico obligatorio antes de arrancar Release 1**. Frase guía:
>
> > *"Podemos seguir pensando ideas nuevas, pero no seguir programando encima de una base inestable."*
>
> Regla operativa nueva: **no más de 1 sprint abierto + 1 rama experimental simultáneos**.
>
> ## 🔬 VERIFICACIONES BD ejecutadas hoy (informan decisiones Sprint A)
>
> | Verificación | Resultado | Implicación |
> |---|---|---|
> | `renovaciones` filas vivas | **0** | FASE 30.2: DROP totalmente seguro |
> | `oportunidades` etapas legacy | **1 sola** (`contactado`) | FASE 30.3: trivial, 1 UPDATE |
> | RAG asistente uso 30d | 15 consultas, 100% encontradas, 4.6s avg | NO eliminar. NO priorizar mejoras |
> | Lista Robinson integrada | NO | R2 según RELEASE_1_CAPTACION |
> | Cron `daily_contract_check` | Activo (jobid 3, próxima 04:00 UTC mañana) | FASE 30.1 cerrada ✅ |
>
> ## 📋 ENTREGABLES SESIÓN (sin código nuevo, solo investigación + planificación)
>
> - `docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md` — checklist 6 tests para validar antes de commit (30-45 min de QA manual).
> - `docs/INDICE_2026-05-01.md` — mapa único de los 11 documentos creados hoy + contradicciones detectadas + plan de retirada de docs obsoletos.
> - Verificaciones BD ejecutadas vía MCP (no destructivas).
>
> ## ➡️ PASOS INMEDIATOS (TÚ EN POWERSHELL)
>
> 1. Cerrar TSC sprint Potencias siguiendo `docs/SPRINT3_TSC_PENDIENTE.md`.
> 2. Ejecutar `CHECKLIST_QA_SPRINT_A` (30-45 min QA manual).
> 3. Si todo verde → commit + push según comando del checklist.
> 4. Decisiones 30.2/30.3: con la BD verificada, son ejecuciones triviales que puedo hacer en próxima sesión Cowork si lo apruebas.
>
> ## ➡️ COWORK PRÓXIMA SESIÓN (con repo verde)
>
> 1. FASE 30.2: DROP `renovaciones` (vacía, sin riesgo).
> 2. FASE 30.3: 1 UPDATE oportunidades + restringir CHECK + actualizar EtapaOportunidad enum TS.
> 3. Sprint Release 1 día 1-3 (schema motivos pérdida + origen canal + UI lista + UI ficha).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Plan depuración + Release 1 integrado**
>
> ## ⚖️ REGLA OPERATIVA NUEVA — depuración + nuevas ideas en paralelo
>
> Tras preocupación válida de Juan ("no quiero acumular deuda mientras avanzo en propuestas"), establecida la regla:
> **70% nueva funcionalidad / 30% depuración. NO abrir sprint nuevo sin cerrar el anterior.**
>
> Documento ejecutable: `docs/PLAN_DEPURACION_2026-05-01.md` con inventario completo de loose ends, calendario 4 semanas integrando depuración + Release 1, y 29 archivos pendientes de commit identificados explícitamente.
>
> **Loose ends críticos:**
> - 🔴 TSC roto en `claude/sprint2-lib-potencias` (~60 errores) — bloquea merge a main.
> - 🔴 Sprint A aplicado hoy NO commiteado (29 archivos working tree).
> - 🔴 Wizard contacto decisor sin validar uso real con Juan/Carolina.
>
> **Loose ends importantes:**
> - 🟠 Sprint A pendientes (30.2, 30.3, 30.7, 30.9).
> - 🟠 111 `as never` legados.
> - 🟠 15 documentos creados hoy sin índice consolidado.
>
> **Documento ejecutable Release 1 captación**: `docs/RELEASE_1_CAPTACION_2026-05-01.md` redimensionado a 11 días (de 18-20) tras crítica ChatGPT. SIN Gmail API auto, SIN CTI, SIN SIPS pilar único, CON motivos de pérdida estructurados (20 valores) y compliance LOPDGDD día 1.
>
> **Pregunta concreta a Juan para próxima sesión**: ¿100% depuración, mezclado, o 100% Release 1 asumiendo cierre TSC paralelo?
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Plan captación profesional + Workspace**
>
> ## ⚙️ DISEÑO PROFESIONAL MÓDULO CAPTACIÓN — `docs/PLAN_CAPTACION_PROFESIONAL_2026-05-01.md`
>
> Aplicado conocimiento industria call center / sales development B2B + integraciones Google Workspace (sustituyen a Office).
>
> **Aporta:**
> - Wireframe ASCII pantallas `/captacion` lista + llamada activa.
> - Cadencia 8-12 touches en 14-21 días (llamada + email + LinkedIn).
> - Lead scoring algorítmico (sector × tamaño × tarifa × recencia × comportamiento).
> - Compliance LOPDGDD + Lista Robinson ADIGITAL + LSSI-CE.
> - Email outbound con Gmail API + service account + DKIM/SPF/DMARC.
> - Telefonía Aircall/Ringover (€60-120/mes operación 1-3 personas).
> - Integraciones Google Workspace: Gmail API send/sync threading, Calendar, Drive (espejo PDFs), Identity (SSO).
> - Anti-patrones evitar: 50 campos obligatorios, vigilancia agresiva, automatización prematura, Apollo/ZoomInfo.
> - 13 KPIs reales (no vanity): connect rate, conversation rate, qualification rate, win rate, tiempo medio llamada→propuesta.
>
> **Sprint Carolina v2 redimensionado**: 18-20 días en 4 semanas con paralelismo (era 5-6 días, era ingenuo).
>
> **7 preguntas concretas pendientes a Juan** para arrancar (telefonía, volumen, origen leads, cadencia actual, plantilla email, Lista Robinson, Workspace admin).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Plan Carolina-as-engine**
>
> ## 🔴 INSIGHT GO-TO-MARKET — Carolina es el motor real de captación
>
> Tras describir Juan los 3 canales (Carolina telemarketing, comerciales, cartera), todo el plan estratégico se reordena. Documento: `docs/PLAN_CAROLINA_ENGINE_2026-05-01.md`.
>
> **Insight:** el cuello de botella real del Canal 1 (Carolina) NO es "no hay leads" — es el ciclo "llamada → pedir factura → esperar 5-7 días → análisis manual → propuesta". Reducible a "llamada → CUPS → click → propuesta enviada en minutos" usando SIPS + heurísticas + OMIE.
>
> **Plan revisado mes 1-3:**
> - **Mes 1 (~14 días)**: cerrar Sprint A + adopción interna + SIPS/OMIE + **Sprint Carolina FASE 41** (pantalla `/captacion` + diagnóstico + flow rápido). Outcome: Carolina genera 10 propuestas/día desde CRM.
> - **Mes 2 (~10 días)**: FASE 42 generador propuesta avanzada (Canal 2) + FASE 36-bis validador facturas (Canal 3) + cifra "€ recuperados" home.
> - **Mes 3 (~5 días)**: FASE 43 optimización trimestral + reporting mensual cliente (Canal 3 retención).
>
> **Diferidos a mes 4+**: FV calculator, CAEs, portal cliente, Sentry DSN.
>
> **Pendiente input Juan**: 6 preguntas concretas sobre Carolina (volumen llamadas, herramientas actuales, acceso SIPS, plantilla email) para diseñar wireframe `/captacion` óptimo. Ver doc.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Comparativa con ChatGPT + plan revisado**
>
> ## 🟠 SEGUNDA OPINIÓN CHATGPT — `docs/COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md`
>
> ChatGPT validó el plan estratégico con 2 correcciones importantes y 1 idea nueva:
>
> 1. **Modelo híbrido empresa/CUPS** (no sustituir uno por otro): CRM=empresa, Operaciones=CUPS. Mejor formulación que la propuesta original.
> 2. **Adopción interna como prioridad #1** (Sprint 30.bis): el equipo no usa el CRM. Sin esto, el resto es teoría. Matiz Cowork: la adopción se gana con flujos donde "CRM > Excel", no se fuerza por disciplina.
> 3. **IDEA NUEVA — Modo diagnóstico primera reunión** (FASE 41): SIPS + heurísticas sectoriales + OMIE → PDF de 30 segundos con "pagas €X, ahorrarías €Y". Sin Datadis, sin facturas. Arma comercial concreta.
>
> Plan revisado de prioridades 2 meses (~25 días-persona):
> - Cerrar Sprint A pendiente.
> - Sprint adopción interna (KPI uso CRM por usuario).
> - Sprint sector mínimo (SIPS + OMIE, sin BOE scraper ni eSIOS).
> - **Sprint modo diagnóstico (FASE 41) — nueva prioridad #1**.
> - Sprint generador propuesta (FASE 42).
> - Sprint validador v0 con 3 reglas críticas.
> - Sprint € trofeo + vista `/suministros`.
>
> Diferidos: FV + CAEs (mes 3+), descartado de momento CSRD/PPA/CER/auditoría obligatoria.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Auditoría profesional sector**
>
> ## 🟣 AUDITORÍA PROFESIONAL DEL SECTOR — `docs/AUDIT_2026-05-01_PROFESIONAL_SECTOR.md`
>
> Tras el audit técnico (mañana) y el sprint autónomo (tarde), Juan pidió una auditoría con lente de profesional del sector consultoría energética. Resultado: documento de 13 secciones que identifica 3 grandes ejes:
>
> 1. **El CRM hoy es un CRM general aplicado a energía, no un CRM vertical**: el objeto central debe ser el suministro/CUPS, no la empresa.
> 2. **5 fuentes públicas gratuitas no consumidas**: SIPS, OMIE, REE/eSIOS, BOE, CNMC. Cada una desbloquea features comerciales.
> 3. **Los servicios adyacentes son donde está el ticket grande**: autoconsumo FV, CAEs, CER, auditoría obligatoria RD 56/2016, CSRD/CBAM, PPA.
>
> Roadmap ampliado FASES 34-40 propuesto. Las 3 prioridades 60d:
> - Cerrar bucle Datadis (auditoría inicial automatizada).
> - Validador de facturas v0 (reglas críticas + plantilla reclamación).
> - Cifra trofeo "€ recuperados a clientes 12m" en home + material comercial.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 tarde por Cowork — Sprint A autónomo aplicado**
>
> ## 🟢 SPRINT A AUTÓNOMO — 6/10 sub-fases aplicadas
>
> Tras la auditoría, Juan dio luz verde para avanzar autónomamente. Aplicado vía Supabase MCP + edits frontend:
>
> | Sub-fase | Estado | Aplicado |
> |---|---|---|
> | 30.1 — pg_cron daily-contract-check | ✅ | BD prod: cron jobid 3, 04:00 UTC. Función SQL `run_daily_contract_check()`. Migration espejo `20260501_fase30_1_*` |
> | 30.4 — Importes en Kanban | ✅ | KanbanCard + KanbanColumn editados |
> | 30.5 — Wizard contacto decisor | ✅ | EmpresasPage convertido a wizard 2 pasos en CREATE |
> | 30.6 — Asociar Datadis↔Empresa | ✅ | AsociarEmpresaDialog (nuevo) + hook `useAsociarSuministroAEmpresa` + botón en DatadisPage |
> | 30.8 (aditiva) — incidencias.cups_id | ✅ | BD prod: ALTER + index + populate. Migration espejo `20260501_fase30_8_*` |
> | 30.10 — Sentry SDK base | ✅ | sentry.ts wrapper lazy + integrado en main.tsx, useAuth, logger.ts. `.env.example` actualizado. `@sentry/react@^10` añadido a package.json |
>
> Pendientes Sprint A (con razón documentada):
> - **30.2 / 30.3** — necesitan decisión de Juan (consolidar renovaciones, etapas legacy).
> - **30.7** — vinculación masiva Datadis por NIF, requiere nueva Edge Function.
> - **30.9** — RLS granular, mejor en sesión coordinada con observación tabla a tabla.
>
> **PRE-REQUISITO MERGE A MAIN:** cerrar TSC pendiente de `claude/sprint2-lib-potencias` (`docs/SPRINT3_TSC_PENDIENTE.md`).
>
> **Pasos siguientes (Code, PowerShell):**
> 1. `npm install` (instala `@sentry/react`)
> 2. `npx tsc --noEmit` (verifica integración)
> 3. `npm test -- --run` (33 tests deben pasar)
> 4. Sanity check manual en localhost:3000
> 5. Commit con el comando del handoff: `.cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md`
>
> ---
>
> ## 🟦 AUDITORÍA 2026-05-01 — `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`
>
> Disparada por análisis estratégico de Juan en navegador (5 áreas + matriz de priorización). Verificación rigurosa contra código + ampliación con capa técnica y UX.
>
> **Hallazgos clave:**
> - Pipeline energético existe (FASE 21.a) pero **migración a medias**: etapas legacy aún vivas en BD y Dashboard.
> - Edge Function `daily-contract-check` lista pero **sin programar pg_cron** — la automatización del rollover no se ejecuta.
> - Datadis aislado del CRM: ningún flujo asocia los CUPS bajados con empresas. **Es el cable más rentable.**
> - RLS granular FASE 20.9 escrita pero **no aplicada** — bloquea portal cliente.
> - Tabla `incidencias` con `cups: text` (no FK uuid) — vinculación débil.
> - Validador de facturas y portal cliente: ❌ inexistentes (producto nuevo, sprint completo cada uno).
> - 111 `as never` legados, sólo 6 ficheros test (33 tests reales, no 39).
> - Dos escuelas visuales (CRM `rounded-md` vs Calc `rounded-xl`) — design review 2026-04-20 sigue vigente.
>
> **Plan propuesto:** 3 sprints (FASES 30, 31, 32) + diferidos (FASE 33+) integrados en `docs/ROADMAP_FUSION.md`:
> - **Sprint A (FASE 30) · 5 d** — "Cablear lo que ya existe": cron, RLS, vinculación Datadis↔Empresa.
> - **Sprint B (FASE 31) · 5 d** — "Ampliar el modelo energético": precios P1–P6, oportunidad_cups, historial, informes.
> - **Sprint C (FASE 32) · 5 d** — "Diferenciar el servicio": validador facturas, portal cliente, autorización Datadis.
>
> **Pre-requisito sprint A:** cerrar TSC pendiente de `claude/sprint2-lib-potencias` (`docs/SPRINT3_TSC_PENDIENTE.md`).
>
> Resumen completo: `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`. Mensaje detallado para Code: `.cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md`.
>
> ---
>
> **Última actualización (anterior): 2026-04-30 por Cowork noche — Integración Datadis proxy v4 funcional**
>
> ## ✅ DATADIS PROXY — INTEGRACIÓN COMPLETADA (commit 6aa361c en claude/sprint2-lib-potencias)
>
> | Item | Estado | Detalle |
> |---|---|---|
> | Edge Function `datadis-proxy` v4 | ✅ ACTIVA en prod | 5 endpoints: get_supplies, get_consumption, get_max_power, get_contractual, get_reactive |
> | Fix auth Bearer | ✅ | `/api-private/*` exige `Authorization: Bearer jwt`. Sin Bearer → 401. Verificado A/B en navegador. |
> | Cookie JSESSIONID | ✅ | Capturada en login, reenviada en peticiones (Spring Security stateful) |
> | Migración SQL | ✅ aplicada en prod | datadis_consumos_cache, consentimientos_datadis, columnas datadis_* en cups, datadis_provincias (52 INE) |
> | Test get_supplies | ✅ | 14 suministros CHEMTROL, 3 distribuidoras activas, CodError 902 (EOSA+EREDES sin respuesta — normal) |
>
> **Próximos pasos Datadis:**
> - Test get_consumption con CUPS concreto de CHEMTROL
> - Exponer CodError 902 como warning en frontend (no bloquear flujo)
> - Cache en BD: buscar en datadis_consumos_cache antes de llamar a Datadis
> - UI en CRM: pantalla suministros por cliente + importación de consumos
> - Solicitar acceso API oficial Datadis (datadis@enagas.es) para modo `terceros`
>
> ---
>
> **Última actualización (anterior): 2026-04-30 por Cowork tarde — Integración librerías Potencias (Sprint 1+2+3 parcial)**
>
> ## Cowork tarde 2026-04-30 — Sprint integración Potencias al CRM
>
> Rama: `claude/sprint2-lib-potencias` (sin push aún).
>
> | Sprint | Estado | Detalle |
> |---|---|---|
> | 1 P0 | ✅ | trigger `fn_calcular_alertas_solicitudes` aplicado al CRM. 41 fechas alerta calculadas. Julia Ruiz creada en auth.users. 31 expedientes huérfanos asignados. _migration_user_map actualizado. |
> | Auditoría | ✅ | `docs/AUDITORIA_POTENCIAS_VS_CRM.md` con 4 gaps identificados (triggers, lib, componentes, endpoint). |
> | 2 (copiar archivos) | ✅ | 16 archivos `musing-kalam` → CRM en estructura `src/core/pdf/`, `src/core/email/`, `src/core/excel/`, `src/features/potencias/lib/`, `src/features/potencias/components/shared/`, `api/`. |
> | 3 primera pasada | ✅ | Imports `@/lib/*` → `@/core/*`. 12 nombres tablas reemplazados. Tipos `TariffType`, `PowerValues`, `RegulatedRate` añadidos a entities.ts. Reemplazos `client_id → empresa_id`, FKs renamed. |
> | 3 segunda pasada | ⏳ pendiente | ~60 errores TSC documentados en `docs/SPRINT3_TSC_PENDIENTE.md`. Plan Sprint 4 detallado por fases (A-E, ~2.5h). |
>
> **Estado BD CRM:** trigger alertas activo, datos completos (41 expedientes con created_by), sin advisors RLS pendientes.
>
> ⚠️ **NO mergear `claude/sprint2-lib-potencias` hasta que TSC = 0** (si no, CI bloquea futuros PRs).
>
> Pendientes próxima sesión: ver `.cowork/outbox/2026-04-30-sprint3-tsc-pendiente.md`.
>
> ---
>
> **Última actualización (Code mañana): 2026-04-30 por Cowork (sesión — FV schema redesign + mantenimiento + informes)**
>
> ## ✅ COMPLETADO EN ESTA SESIÓN (commits 00243bd + a388e04 en main)
>
> | Componente | Estado | Detalle |
> |---|---|---|
> | fix(fv-sync): fill(force=True) eliminado | ✅ | Playwright Python: fill() no acepta force=True; causaba TypeError en 10s. Corregido. |
> | database.ts regenerado con tablas fv_* | ✅ | 5011 líneas, incluye todas las tablas fv_*. Elimina (supabase as any) en api.ts |
> | Schema FV rediseñado (multi-credencial) | ✅ aplicado en prod | UNIQUE (plataforma,region_url,station_code): 1 planta física = 1 fila. fv_planta_credencial N:M. fv_upsert_planta() protege empresa_id |
> | fv_planta: nombre_interno + nombre_fusionsolar | ✅ | Valere puede poner nombre personalizado; sync no lo sobreescribe |
> | fv_credenciales: tipo + descripcion | ✅ | instalador_multicliente / cliente_monoplanta / cliente_multiplanta. JOLIVARES etiquetado. |
> | Password JOLIVARES actualizado | ✅ | Nuevo hash xa1Y/hIblHe3JqD8:... aplicado en Supabase |
> | fv_empresa_mantenimiento | ✅ aplicado en prod | Registro empresas externas de mantenimiento (datos, contacto, contrato) |
> | fv_mantenimiento | ✅ aplicado en prod | Intervenciones por planta: preventiva, correctiva, limpieza, inspección |
> | fv_config_informe | ✅ aplicado en prod | Config entrega informes por cliente: modo_envio, gestor_id, asesor_id, destinatarios |
> | fv_informe_mensual extendido | ✅ aplicado en prod | Estados: borrador→revision_pendiente→aprobado→enviado. Edición contenido, notas gestor |
> | Trigger notificación informe pendiente | ✅ | Crea notif CRM al gestor cuando informe pasa a revision_pendiente |
>
> ## ⏳ PENDIENTE INMEDIATO
>
> | Item | Responsable | Notas |
> |---|---|---|
> | Lanzar Run #15 en GitHub Actions | Juan | Fix fill(force=True) ya commiteado en 00243bd |
> | .\COMMIT_FV_MANT_INFORMES.ps1 | ✅ HECHO | a388e04 en main |
> | Verificar plantas en fv_planta tras Run #15 | Juan + Cowork | Si verde: ejecutar SQL asignación empresas |
> | RESEND_API_KEY en GitHub Actions secrets | Juan | Settings → Secrets → Actions (ya está en Supabase EF) |
>
> ## 🔮 SIGUIENTE SPRINT (Fase B módulo FV)
>
> | Item | Estado | Notas |
> |---|---|---|
> | Refactor SeguimientoFVPage con tabs | Pendiente | Dashboard global, vista por cliente, detalle planta |
> | Gráfico producción 30 días (recharts) | Pendiente | Usa fv_kpi_diario |
> | Edición nombre_interno desde CRM | Pendiente | Inline edit en tarjeta planta |
> | UI mantenimiento por planta | Pendiente | Tabla intervenciones + próximas fechas |
> | UI fv_config_informe por empresa | Pendiente | Panel configuración en EmpresaDetailPage |
>
> ## 📋 PENDIENTE REAL (no implementado)
>
> | Item | Bloqueador | Notas |
> |---|---|---|
> | Integración Datadis | Trámite Juan (registro terciario) | Plan en docs/PLAN_INTEGRACION_DATADIS.md |
> | Auth Google Identity | Decisión producto | Plan en docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md |
> | RESEND_API_KEY secret GitHub Actions | Acción Juan | Para emails alarmas FV |
> | Más credenciales FV (otros instaladores) | Acción Juan | Dar cuando pipeline esté estable |
> | fv_actuacion (actuaciones Valere + ROI) | Sprint 3 | Ver plan módulo FV |
> | Informes PDF integrados FV+facturas | Sprint 4 | Ver plan módulo FV |
> | fv_alarma_procedimiento (catálogo resolución) | Sprint 2 | Ver plan módulo FV |

## Historial de sesiones relevantes

| Fecha | Commits | Resumen |
|---|---|---|
| 2026-04-29 mañana | e8ed8c2…6464a89 | Reescritura Playwright, fixes CI ubuntu-22.04, fix login |
| 2026-04-29 noche | a3d4a21 | Fix dashboard, asistente RAG, ExpedienteDetail |
| 2026-04-30 | 00243bd, a388e04 | Schema FV multi-credencial, mantenimiento, workflow informes |



