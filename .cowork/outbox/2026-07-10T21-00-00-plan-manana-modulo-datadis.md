# PLAN PARA MAÑANA — Rehacer/mejorar el módulo Datadis en el CRM (2026-07-11)

> Nota de Juan al cierre del 2026-07-10. Objetivo de la próxima sesión.

## Qué pide Juan
1. **Solucionar el módulo de "conexión de Datadis" tal como aparece hoy en el CRM** (la pestaña/pantalla Datadis actual no está bien resuelta).
2. **Mejorar el diseño del contenido de Datadis** para tener un módulo con el que se pueda **trabajar la información** que da Datadis (no solo verla): consumos, curvas, potencias, contratos, excedentes, etc.
3. Valorar apoyarse en **plataformas externas** para enriquecer/analizar esos datos. Juan mencionó (nombres a confirmar/afinar):
   - **Linkener** (probablemente "Linkener" — analítica/monitorización energética)
   - **Telegest** (telemedida; ya aparece en el proyecto telemedida/FV, ver memoria)
   - **Seginet / Segenet** (nombre a confirmar — plataforma de medición/gestión energética)

## Estado de partida (lo que YA hay, 2026-07-10)
- Sincronización Datadis partner OPERATIVA: worker `datadis-sync` v8 (modelo authorizedNif, batches de 4, base20). Cron nocturno 05:15 UTC. 18 clientes autorizados, 83 CUPS en 18 empresas.
- Tabla `datadis_incidencias` + alarma en Dashboard (`IncidenciasDatadisCard`) → clic lleva a `/empresas/:id?tab=suministros`.
- Pestañas en ficha empresa: **Suministros** (lee `cups`) y **Datadis** (`DatadisAutorizacionesTab`, autorizaciones/PDF). Ese es el "módulo Datadis" a rediseñar.
- Datos que el worker guarda hoy en `cups`: `datadis_distributor_code`, `datadis_point_type`, `distribuidor`, `direccion_suministro`, `ciudad_suministro`, `datadis_sincronizado`, `datadis_ultima_sync`.

## Qué ofrece la API de Datadis (para diseñar el módulo)
- `get-supplies` (ya usado): lista de CUPS con distribuidora, dirección, tipo de punto, fechas de validez.
- `get-contract-detail`: datos de contrato (tarifa/ATR, potencias contratadas por periodo, comercializadora, fechas).
- `get-consumption-data`: **curva de consumo** (kWh por periodo/hora, mensual).
- `get-max-power`: **maxímetro** (potencia máxima demandada por periodo).
- (Para autoconsumo: excedentes si el contador lo reporta.)
→ Hoy el CRM solo explota `get-supplies`. El módulo nuevo debería traer contrato + consumos + maxímetro para poder "trabajar la información".

## Tareas propuestas para la sesión de mañana
1. **Auditar la pantalla Datadis actual** (screenshots + código `DatadisAutorizacionesTab` y `SuministrosTab`) y listar qué falla / qué falta.
2. **Diseñar el módulo objetivo**: qué datos mostrar y cómo trabajarlos (tabla de CUPS con estado sync, ficha de CUPS con contrato + curva de consumo + maxímetro + gráficos recharts, export).
3. **Definir el modelo de datos**: tablas nuevas para consumos/potencias/contratos Datadis (p.ej. `datadis_consumos`, `datadis_maximetro`, `datadis_contratos`) y workers que las pueblen (reutilizar patrón `datadis-sync`).
4. **Investigar Linkener / Telegest / Seginet**: qué aportan (API, telemedida, analítica), coste, y si sustituyen o complementan a Datadis. Confirmar nombres exactos con Juan.
5. Decidir alcance de la primera iteración (MVP) y abrir rama `claude/datadis-modulo-v2`.

## Antes de tocar código
- Preguntar a Juan: ¿el módulo es para uso interno (asesores) o también cara al cliente? ¿Prioridad: consumos/curvas, o potencias/optimización de tarifa? ¿Linkener/Telegest/Seginet ya contratados o a evaluar?
- Verificar primero que la **alarma de incidencias se ve bien en producción** (Cloudflare Pages) tras el merge de #66.
- Pendiente operativo del día: dar de alta los **11 CUPS que faltan** + corregir **SOCOESREMA**.

## Recordatorio de gotchas
- El mount del sandbox sirve copias obsoletas → tsc/tests los valida Juan en su terminal.
- Deploy de Edge Functions vía herramienta: usar versión ASCII minificada si hay problemas de escape; repo guarda la legible.
- Nunca push directo a main; rama `claude/<desc>` + PR (con Browser). Cuidado con crear ramas desde ramas viejas (líos de historial por squash-merges).
