# Diseño — Espejo documental Drive (fase puente ★)

> Estado: CREDENCIALES LISTAS (23-jul-2026). Decisión de arquitectura
> confirmada por Juan 2026-07-23: **Opción A — Edge Function + pg_cron**
> (no Make, ver justificación abajo).
>
> **Pivote de autenticación (23-jul-2026):** la cuenta de servicio de
> Google Cloud quedó bloqueada por la política de organización
> `iam.disableServiceAccountKeyCreation` (baseline "secure by default
> organizations" de Google, aplicada automáticamente a
> valereconsultores.com) — no permite descargar claves JSON de cuentas de
> servicio. En vez de pedir a Juan que abra una excepción de política de
> seguridad, se optó por **OAuth 2.0 con la cuenta personal de Juan**
> (jolivares@valereconsultores.com), que no está cubierta por esa política.
>
> Completado: proyecto GCP `valere-espejo-documental`, Drive API
> habilitada, pantalla de consentimiento OAuth (tipo Interno), cliente
> OAuth de escritorio creado, autorización concedida por Juan, y
> `refresh_token` obtenido. Las 7 credenciales (client_id, client_secret,
> refresh_token, y los 4 folder IDs de Drive) están guardadas en
> **Supabase Vault** del proyecto `PROYECTO VALERE` bajo los nombres
> `espejo_drive_client_id`, `espejo_drive_client_secret`,
> `espejo_drive_refresh_token`, `espejo_drive_folder_id_root`,
> `espejo_drive_folder_id_empresa`, `espejo_drive_folder_id_contrato`,
> `espejo_drive_folder_id_oportunidades`. Nunca en el repo ni en texto
> plano en ningún documento.
>
> **Pendiente**: codificar la Edge Function `espejo-documental` (usa
> refresh-token flow para autenticarse contra la API de Drive, en vez de
> JWT firmado con clave de cuenta de servicio), desplegarla, configurar
> `pg_cron`, y hacer la prueba end-to-end.

## Objetivo

Espejar el bucket `documentos` de Supabase Storage (los PDFs de contratos —
el hueco crítico de backup) a una carpeta de Google Drive, de forma
**self-healing**: si una pasada falla, la siguiente recupera lo pendiente
sin ventanas de pérdida permanentes. El espejo **nunca borra** — si un PDF
desaparece de Supabase, su copia en Drive permanece (o se mueve a
`_PAPELERA/`, nunca se elimina).

Este es el primer tramo de un plan mayor (copia fría mensual con Object
Lock + hashes SHA-256 + simulacro de restauración trimestral, ver análisis
de almacenamiento) — aquí solo se construye el espejo caliente.

## Terreno mapeado (23-jul-2026)

- Bucket `documentos`: **27 ficheros / 5,71 MB**. Estructura en 3 carpetas:
  `empresa/` (20), `oportunidades/` (5), `contrato/` (2). Pequeño y limpio.
- Bucket `email-assets`: ya tiene el logo del email (PR-4.2), sin relación
  con este espejo.
- Bucket `justificantes` (App Gastos Valere): 12 ficheros / 96 MB, en uso
  real — fuera de alcance de este PR (backlog propio si se decide espejarlo
  también).

## Por qué NO Make (descartado 23-jul-2026)

Make está conectado y sería la opción más rápida de montar, pero el plan es
**Free** con límites duros:

- 1.000 operaciones/mes · **solo 2 escenarios activos** · mínimo 15 min
  entre ejecuciones · máx 5 MB/fichero · 512 MB transferencia/mes.
- Los 2 huecos de escenario activo YA están ocupados: "App Gastos Valere
  (servir página)" y "Factura tarjeta → Drive + email Carolina". Un tercer
  escenario activo excede el plan gratuito.
- Liberar hueco pausando uno de los dos activos no es viable: ambos están
  en uso real hoy (Gastos Valere).
- Subir a plan de pago resuelve el límite pero es el sobrecoste que el
  proyecto busca evitar.

**Decisión (Juan, 23-jul-2026): Opción A.**

## Arquitectura — Opción A: Edge Function + pg_cron

Mismo patrón ya probado en este proyecto (`datadis-sync`, `datadis-consumos`,
`push-lunes`): Edge Function con `verify_jwt = false` + autenticación propia
vía `x-cron-secret` (RPC `check_push_cron_secret` o equivalente nuevo),
invocada por `pg_cron`. Sin coste, sin límites de Make, coherente con la
arquitectura Supabase-céntrica del resto del proyecto.

### Filosofía: reconciliación, no webhook

En lugar de disparar la subida al crear cada documento (frágil: un fallo
puntual deja ese PDF sin espejar para siempre si nadie se da cuenta), la
Edge Function **reconcilia** en cada pasada — misma filosofía autocurativa
que ya funciona en Datadis (S0.2-ter):

1. Lista los objetos del bucket `documentos` (Storage API).
2. Compara contra lo ya espejado — tabla de control `espejo_drive_log`
   (nueva, pequeña: `storage_path`, `drive_file_id`, `sha256`, `subido_at`)
   en vez de listar Drive en cada pasada (más barato en llamadas API y más
   fiable que comparar por nombre).
3. Los que faltan en el log: descarga por URL firmada de Storage, sube a
   Drive vía API v3 (multipart, cuenta de servicio) en la subcarpeta que
   corresponda (`empresa/`, `contrato/`, `oportunidades/` — se replica la
   misma estructura de rutas del bucket), y registra el resultado en
   `espejo_drive_log`.
4. **Nunca borra.** No hay paso de borrado en ningún sentido. Si en el
   futuro se detecta un documento borrado en Supabase (soft-delete), la
   idea es moverlo a `_PAPELERA/` en Drive — no se implementa en esta
   primera versión salvo que se decida ampliar el alcance.

### Carpeta destino

`BACKUP CRM VALERE / ESPEJO DOCUMENTAL CRM` (decisión de Juan: todo el
respaldo del CRM consolidado en un sitio, separado por función). Dentro,
las 3 subcarpetas espejo de la estructura de Storage: `empresa/`,
`contrato/`, `oportunidades/`.

### Qué necesitaba Juan (COMPLETADO 23-jul-2026)

~~1. Cuenta de servicio de Google Cloud con la Drive API habilitada.~~
~~2. Clave JSON de esa cuenta de servicio.~~
~~3. Compartir la carpeta `ESPEJO DOCUMENTAL CRM` con el email de la cuenta~~
~~   de servicio (rol Editor).~~

Sustituido por el flujo OAuth descrito arriba (pivote 23-jul-2026): Juan
creó el proyecto GCP, configuró la pantalla de consentimiento, creó el
cliente OAuth de escritorio y concedió el permiso de acceso a su propio
Drive. No hizo falta compartir ninguna carpeta — el mismo dueño de la
carpeta (Juan) es el titular de las credenciales OAuth.

Las credenciales las guarda Cowork como secreto en Supabase Vault — nunca
en el repo ni en texto plano en ningún documento.

### Qué construye Cowork (tras recibir credenciales)

1. Migración: tabla `espejo_drive_log` (RLS: solo `service_role` escribe;
   `authenticated` lectura opcional para un futuro panel de estado).
2. Secreto en Vault: la clave JSON de la cuenta de servicio +
   `espejo_drive_folder_id` (o los 3 IDs de subcarpeta, según convenga).
3. Edge Function `espejo-documental` (`verify_jwt = false` + x-cron-secret):
   lógica de reconciliación descrita arriba.
4. `pg_cron`: frecuencia a decidir — sin los límites de Make ya no hay techo
   duro; propuesta razonable 1×/día (o 3×/día si Juan quiere latencia menor
   de recuperación ante fallo) dado que el bucket crece lento (27 ficheros
   en meses de uso).
5. Prueba end-to-end: subir un PDF de prueba a `documentos`, confirmar que
   aparece en Drive en la siguiente pasada del cron (o invocación manual) y
   que una segunda pasada NO lo vuelve a subir (idempotencia vía
   `espejo_drive_log`).

## Fuera de alcance de este PR

- Copia fría mensual con Object Lock + hashes SHA-256 (fase posterior del
  plan de almacenamiento).
- Simulacro de restauración trimestral (fase posterior).
- Espejo del bucket `justificantes` (Gastos Valere) — backlog propio si se
  decide.
- Papelera (`_PAPELERA/`) ante soft-delete de documentos — no implementada
  en esta primera versión.
