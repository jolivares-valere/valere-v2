# F2 cierre de sesión 2026-07-04 + nota para el workstream documental

## Estado F2 al cerrar
PRs #55 (telemetría) y #56 (arreglos H1+H5+H6) mergeados en main y desplegados. Telemetría verificada con evidencia positiva por auditoría externa. Detalle completo: `docs/SESIONES/2026-07-04-resumen-f2.md` y `docs/AUDITORIA_ENLACES_FASE2.md`.

**Para la próxima sesión F2 (cierre de fase, hacia el 7-8 jul):**
1. SELECT sobre `client_telemetry` con 2-3 días de uso real → ranking errores/ruta (H3).
2. Regenerar copia Drive del inventario (la de Drive NO incluye H4-H6 ni A1/A2).
3. Informe de cierre 8 secciones → Drive/BACKUP CRM VALERE, "CRM VALERE — FASE 2 · INFORME DE CIERRE PARA AUDITORÍA — [fecha]".
4. Derivadas: E2 (revoke DELETE/TRUNCATE authenticated en client_telemetry, ventana BBDD), SQL `pdf_url LIKE '%vercel%'` en propuestas, idea botón "informar de un problema" (`reported_incident`).

## Nota para el workstream de consolidación documental (Drive/OneDrive)
El auditor detectó en el CSV de consolidación **gemelos de nomenclatura** (mismo cliente en 2 carpetas): EL CIELO DE TRIANA / ~SL, MEDINA GARVEY SA / GRUPO MEDINA GARVEY, FRANCISCO MONTES / JOSE FRANCISCO MONTES, FACASA / FACASA 1994, CARMEN / MARIA DEL CARMEN FERNANDEZ GALAN, RUBIO PAZ / ANA ISABEL RUBIO PAZ, BLUE NET / BLUENET TECNOLOGIAS, FLAMENCA SERRANO TAGUAS / MODA FLAMENCA…, 3 variantes de PAZ Y BIEN, carpeta "bomba". Encargo pendiente de ESE workstream (no F2): lista de "parejas sospechosas de mismo cliente" por similitud para resolver en la reorganización `{NIF}_{Nombre}`. La tarea de Julia se reduce a 2 clientes reales sin papel (Avícola Hermanos Ramos, Seabarita Global) + traer carpeta antigua de Carnicería Reyes Ramos.
