# Plan Arsys — Conversión + Import a Workspace

> Generado 2026-04-24 por Cowork.
> Para ejecutar cuando el backup de Arsys esté listo (Claude web gestiona la contratación).
> Tiempo total: 2-4h según volumen + número de cuentas.

## Situación

Claude web está gestionando la contratación del **Email Backup de Arsys** (0,50€/mes + 5GB gratis). Una vez esté poblado (24-48h después de contratar), toca:

1. **Descargar el backup** desde Arsys.
2. **Convertir formato** si es necesario (a MBOX/EML estándar).
3. **Import a Workspace** para preservar el histórico indexado + buscable.

## Pre-requisitos (antes de empezar)

- ✅ Email Backup contratado y poblado en Arsys (verificar en el panel que cada cuenta tiene el backup completo).
- ✅ Acceso admin a Google Workspace (https://admin.google.com).
- ✅ Cuenta personal @valereconsultores.com activa en Workspace.
- ✅ Thunderbird instalado (opcional, como fallback).
- ✅ Carpeta local preparada para volcar los backups: `C:\Backup_Arsys_2026\`.

## Fase 1 — Descarga del backup (30 min - 1h según volumen)

### Opción A — Si Arsys permite descarga directa MBOX/EML

1. Ir a `https://www.arsys.es/clientes` → login.
2. Navegar a **Productos / Email / Email Backup**.
3. Acceder al panel del backup con el email + password específico de backup (distinto del IMAP normal).
4. Seleccionar cuenta → **Exportar** → formato **MBOX** (o EML si solo permite esto).
5. Repetir para cada cuenta @valereconsultores.com.
6. Guardar archivos en `C:\Backup_Arsys_2026\<nombre-cuenta>\`.

### Opción B — Si Arsys solo permite formato propio

1. Descargar el backup en el formato que ofrezca.
2. Abrir un caso de soporte Arsys preguntando cómo convertir a MBOX o EML estándar.
3. Alternativamente, usar herramienta de conversión (ver Fase 2 Opción B).

### Opción C — IMAP directo con Thunderbird (fallback si Arsys no colabora)

Si Arsys complica la descarga, usar Thunderbird como intermediario:

1. Descargar Thunderbird (https://www.thunderbird.net).
2. Añadir cada cuenta @valereconsultores.com como IMAP:
   - Servidor entrante: `imap.arsys.es`, puerto 993 SSL.
   - Usuario: email completo.
   - Password: el del correo Arsys.
3. Settings cuenta → **Synchronize and Disk Space** → "Synchronize messages for offline use for all folders" → All messages.
4. Dejar Thunderbird abierto varias horas hasta que descargue TODO.
5. Resultado: archivos `.mbox` en `%APPDATA%\Thunderbird\Profiles\<profile>\Mail\imap.arsys.es\`.
6. Copiar esa carpeta a `C:\Backup_Arsys_2026\thunderbird\`.

## Fase 2 — Conversión de formato (si hace falta)

### Si ya tienes MBOX / EML estándar

Saltar a Fase 3. No hace falta conversión.

### Si tienes formato propio de Arsys (no estándar)

Opciones de conversión:

#### Opción A — MailStore Home (gratis, Windows)

1. Descargar https://www.mailstore.com/en/products/mailstore-home/
2. Instalar y abrir.
3. **Archive** → **Email Files (EML, MBOX, etc.)** → seleccionar carpeta con backup.
4. MailStore indexa y permite exportar a MBOX o a cuenta IMAP/Google Workspace directamente.

#### Opción B — Aid4Mail (pago ~$50, gran compatibilidad)

1. https://www.aid4mail.com
2. Formatos soportados: Outlook PST, Thunderbird, Apple Mail, propietarios varios → MBOX/EML/Google Workspace.
3. Usar si el formato Arsys es exótico y MailStore no lo reconoce.

#### Opción C — Herramienta oficial Arsys

Si Arsys ofrece exportación IMAP después de la descarga (panel permite configurarlo como cuenta IMAP temporal), usar esa vía — luego Thunderbird descarga directamente de esa "cuenta IMAP del backup".

### Verificación post-conversión

Abrir algunos MBOX en Thunderbird (File → Import) y verificar:
- Se ven los correos.
- Se leen los asuntos + cuerpo correctamente (sin caracteres rotos por codificación).
- Los adjuntos están accesibles.
- Las fechas originales se preservan.

Si algo falla → re-convertir con otra herramienta.

## Fase 3 — Import a Workspace (1-2h)

### Opción 1 (recomendada) — Google Workspace Migration Tool

1. Login admin en https://admin.google.com con cuenta admin de Workspace.
2. **Data** → **Data Migration**.
3. **Add migration**.
4. **Source**: seleccionar **MBOX**.
5. **Destination**: seleccionar tu Workspace.
6. **Target users**: seleccionar los emails destino (uno por cada @valereconsultores.com).
7. **Upload MBOX files**: subir los archivos MBOX de cada cuenta al usuario correspondiente.
8. **Options**:
   - "Skip messages already in destination" → **ON** (muy importante, evita duplicados con los correos ya migrados).
   - "Preserve original dates" → **ON**.
   - "Import folder structure" → **ON**.
9. **Start migration**. Google lo procesa en su cloud — puede tardar horas según volumen.
10. **Monitor progress** en el dashboard de Data Migration. Al terminar, reporta cuántos mensajes se importaron y cuántos se saltaron.

### Opción 2 (alternativa) — Thunderbird como puente

Si el Migration Tool falla o es complicado:

1. En Thunderbird, añadir **la cuenta Workspace** como IMAP (no Arsys):
   - Servidor: `imap.gmail.com`, puerto 993 SSL.
   - Auth: OAuth2 (se abre navegador para autorizar).
2. Importar los MBOX a una carpeta local temporal en Thunderbird (File → Import → MBOX).
3. Arrastrar los correos de la carpeta local a la carpeta IMAP de Gmail (o a una etiqueta tipo `Archivo-Arsys-2026`).
4. Thunderbird los sube uno a uno a Workspace.
5. Desventaja: lento (1 mensaje/segundo aprox), pero fiable.

### Verificación post-import

1. Abrir Gmail de una cuenta cualquiera.
2. Buscar mensajes del año pasado (que deberían ser de Arsys).
3. Confirmar que aparecen con fecha original preservada.
4. Probar búsqueda por remitente o asunto específico conocido.
5. Repetir para 2-3 cuentas distintas.

### Si faltan correos

Comparar contadores:
- Arsys backup: X correos por cuenta.
- Workspace después del import: Y correos por cuenta (incluyendo los antiguos + los ya migrados en abril).

Si Y < X: faltan correos. Repetir el import con:
- Mismo MBOX pero **sin** "Skip existing" (puede crear duplicados).
- O identificar manualmente qué mensajes faltan (por fecha o remitente) y subirlos a mano.

## Fase 4 — Verificación final + limpieza

1. **Validación con usuarios reales**:
   - Pedir a 2-3 compañeros que busquen correos antiguos importantes que recuerden → confirmar que aparecen.
2. **Backup local de respaldo**:
   - Guardar una copia de `C:\Backup_Arsys_2026\` en un disco externo o en Google Drive (encriptado).
   - Idea: "si algo se pierde en Workspace, tenemos el MBOX original para re-importar".
3. **Cancelar servicio Arsys** (opcional, según plan de dejar Arsys):
   - Una vez confirmado que TODO está en Workspace, se puede cancelar el hosting Arsys.
   - Mantener el registro de dominio si es en Arsys (o transferir a Cloudflare).
4. **Documentar cierre**:
   - Actualizar `docs/ESTADO.md` con "Arsys migration completada".
   - Marcar la tarea como resuelta en el mapa estratégico.

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Arsys no permite exportar en formato estándar | Media | Thunderbird IMAP como fallback (Opción C Fase 1) |
| Conversión rompe codificación (acentos) | Baja | Verificar tras conversión antes de importar. Probar con 1 cuenta pequeña primero. |
| Duplicados en Workspace | Media | "Skip existing" activado. Verificar contadores post-import. |
| Import muy lento (días) | Baja | Google cloud lo hace. Si necesitas acelerar, usar cuenta business con más cuota. |
| Mensajes con adjuntos > 25MB | Media | Gmail rechaza adjuntos >25MB. Exportar aparte los mensajes problemáticos. |
| Pérdida de etiquetas/carpetas originales | Baja | Migration Tool preserva estructura. Thunderbird también. |

## Checklist de ejecución

- [ ] Fase 1: Email Backup descargado a `C:\Backup_Arsys_2026\`
- [ ] Fase 2: Formato verificado (MBOX/EML) — conversión si era necesaria
- [ ] Fase 3: Import a Workspace completado
- [ ] Fase 4: Verificado con 2-3 compañeros + backup local de respaldo
- [ ] Documentación actualizada

## Cuando esté todo

1. Actualizar `docs/ESTADO.md` con estado "Arsys migration cerrada".
2. Marcar las tareas #16 y #20 como completadas en el TaskList.
3. Coordinar con Cowork la siguiente prioridad del plan.
