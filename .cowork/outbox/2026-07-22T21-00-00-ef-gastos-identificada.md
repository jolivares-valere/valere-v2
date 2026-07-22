# EF `gastos` — IDENTIFICADA Y DOCUMENTADA (alerta del auditor resuelta) — 2026-07-22

## La alerta
El auditor detecto una EF nueva `gastos` (3 versiones, verify_jwt=false) sin rastro
en outbox/ESTADO. Con el CSV resuelto como falsa alarma, era la via de entrada
alternativa a descartar.

## Veredicto: LEGITIMA — app interna creada HOY por Juan con OTRA sesion de Claude
(confirmado por Juan en chat). PWA "Gastos Valere": justificacion de gastos de
tarjeta de empresa (titulares Juan/Antonio) — foto/PDF del justificante → bucket
privado `justificantes` + tablas `gastos_tarjeta`/`justificantes_gasto` → envio
automatico a Carolina (administracion) via webhook Make. Trimestre 2026-T2.
Cronologia: bucket 12:22 · EF 20:36-20:56 (entrelazada con los deploys S0.2-ter
de Cowork — por eso no salia en listados previos).

## Analisis de seguridad (Cowork, verificado en BBDD y codigo)
- verify_jwt=false es CORRECTO aqui: la EF solo sirve HTML/manifest/iconos
  estaticos (pagina de login). Cero secretos, cero service_role, cero SQL server.
- Bucket `justificantes` privado ✓ con policies authenticated (read/upload).
- RLS activa en ambas tablas ✓ PERO laxa (peros a backlog, abajo).

## Peros anotados en backlog (no urgentes, arreglar si la app se queda)
1. RLS `authenticated → true` en gastos_tarjeta y justificantes_gasto: cualquier
   usuario logueado (incluido un futuro role 'client') leeria/escribiria gastos
   de empresa. Endurecer a is_staff() o roles admin/manager (patron del esquema).
2. Webhook de Make EN CLARO en el HTML publico → spameable. Moverlo a una EF con
   secret (patron x-cron-secret) o asumir el riesgo conscientemente.
3. Fuente NO esta en el repo → pedir a la sesion que la creo que lo commitee
   (supabase/functions/gastos/), o lo hace Cowork desde produccion.

## Leccion de protocolo (la que señala el auditor, y tiene razon)
Toda sesion que despliegue en produccion debe dejar rastro en outbox/ESTADO.md,
tambien las "laterales". Dos falsas alarmas en un dia (CSV, gastos) se resolvieron
en minutos porque hubo verificacion — pero costaron tiempo de auditoria que un
parte de una linea habria ahorrado.

## ADDENDUM — registrada como APP SATELITE OFICIAL EN CURSO (Juan, 22-jul noche)
"Gastos Valere" (PWA movil, obra de Juan con Claude en otro chat). Encargos que
Juan traslada a ese chat:
1. BUG trimestre: TRIMESTRE='2026-T2' fijo en codigo, estamos en T3 → calcularlo
   de la fecha actual (archivo y bandeja de pendientes miran al trimestre correcto).
2. Subir el fuente al repo: supabase/functions/gastos/ (regla de la casa: todo lo
   desplegado deja rastro en el repo).
3. Vision de integracion: "Gastos Valere" es la otra cara del MODULO DE INGRESOS
   (ANEXO 2 = lo que pagan los clientes; gastos = lo que paga Valere). Ambos casan
   contra Holded (tablas holded_* ya existen). El PR de integracion futuro puede
   vincular gastos_tarjeta con la conciliacion contable — a tener en el diseño.
NOTA de matiz (Cowork): la auditoria del acta dice "RLS correcta"; el detalle fino
es que la RLS EXISTE pero es laxa (authenticated→true) — el endurecimiento a
is_staff() sigue en backlog como estaba.
