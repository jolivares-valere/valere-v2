# PROXIMA SESION -- PLAN: modulo Seguimiento Plantas FV (MVP operativo)

## Decision (Juan + auditoria Claude Browser + ChatGPT, 2026-06-17)
El modulo FV esta partido: mitad REAL (Plantas, Resumen, Credenciales, Sin asignar -> Supabase)
y mitad MOCK (Excedentes/Datadis, Incidencias, Alarmas, Informes -> datos ficticios hardcoded:
Industrias Perez, MercaVal, Garcia Logistica, Panificadora Norte). Hay que unificar todo sobre
datos reales y hacerlo OPERATIVO (herramienta de trabajo diario, no panel de mirar).

Plantas reales: JUAN RUBIO CASA, HOTEL SIERRA LUZ, PAZ Y BIEN HERMANA CLARA, FOAM JAEN,
FOAM MENGIBAR, FOAM SANTIPONCE, GUADIX. Sin asignar detectadas: BLUENET, CORTIJO EL CABRIL,
GANADERIA ANTONIO, NOSOLOMONTAJES, SIERRA MAYOR DE JABUGO.

## Estrategia: separar por DEPENDENCIA, no por pesta?a
- FASE 1 (se puede YA, no depende de Huawei): quitar mock, Centro de Operaciones del dia,
  alarmas gestionables, detalle por planta + notas, frescura de datos, KPIs reales, 403 notificaciones.
- BLOQUEADO por fuente de datos (frente tecnico paralelo): consumo/autoconsumo/excedente
  (= energy-balance 500), curva intradia (= day-real-kpi 503/WAF), comparativa Datadis (CUPS cruzado),
  informes PDF finales. NO construir UI sobre esto hasta tener la fuente.

## PASO 0 de la sesion: AUDITAR ESQUEMA SUPABASE antes de tocar codigo
Objetivo: que el prompt para Claude Desktop cite tablas/columnas REALES, no inventadas.
Usar el MCP de Supabase (list_tables) para confirmar:
- Existentes: fv_planta, fv_credenciales, fv_kpi_realtime, fv_kpi_diario, fv_alarma, fv_sync_log,
  fv_sync_audit, notificaciones, cups, empresas.
- Verificar si EXISTEN o faltan: fv_produccion_diaria, fv_produccion_intradia, fv_excedente_datadis,
  fv_informe_mensual, fv_planta_nota.
- Revisar RLS/policies, en especial el 403 de notificaciones (INSERT por usuario autenticado).

Comandos utiles de arranque:
  Get-ChildItem supabase\migrations -Recurse | Select-String "fv_|notificaciones|policy|rls|alarm|kpi|planta"
  Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String "fv_planta|fv_alarma|fv_kpi|notificaciones|mock|Industrias|MercaVal|Excedentes|Datadis|Informes"
  Get-ChildItem scripts\fv-sync -Recurse -Include *.py | Select-String "fv_planta|fv_alarma|fv_kpi|notificaciones|energy-balance|day-real-kpi"

## ENTREGABLE de la sesion (antes de que Desktop implemente)
1. Tablas existentes que Desktop debe USAR (con columnas reales).
2. Tablas que FALTAN + migraciones SQL exactas (las preparo yo aqui, Juan las aplica).
3. Policy RLS a corregir para el 403 de notificaciones (SQL listo).
4. Componentes frontend donde esta el mock (rutas exactas).
5. Prompt MVP final para Claude Desktop, citando el esquema real + orden de fases.
6. Lista explicita de bloqueos: energy-balance 500, day-real-kpi 503, Datadis.

## Orden MVP fase 1 (impacto operativo)
quitar mock -> Centro de Operaciones del dia -> alarmas gestionables -> detalle por planta + notas
-> frescura de datos -> KPIs coherentes Resumen -> 403 notificaciones.

## Frente tecnico paralelo
energy-balance HTTP 500 (ver PLAN-energy-balance-500.md). Da consumo/autoconsumo/excedente,
necesario para que Produccion/Excedentes dejen de salir "--".

## 403 notificaciones (quick win, mirar primero)
POST a tabla `notificaciones` da 403 por RLS. Arreglo SQL puntual: policy INSERT para authenticated.
