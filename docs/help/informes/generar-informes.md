---
title: Generar informes predefinidos
section: informes
audience: manager
keywords: [informe, reporte, kpi, métrica, exportar, mensual, comercial, cartera, csv]
related:
  - dashboard/interpretar-dashboard
  - oportunidades/pipeline-kanban
---

# Generar informes

## Resumen rápido
Menú → **Informes**. Elige el informe predefinido que quieras → configura filtros (rango fechas, comercial, etc.) → genera → exporta a CSV o PDF.

## Informes predefinidos disponibles

### 1. Informe comercial mensual
Rendimiento de un comercial en un mes:
- Oportunidades creadas, movidas de etapa, ganadas, perdidas.
- Contratos firmados en el mes.
- Ingresos previstos (valor de contratos firmados).
- Tasa de conversión (oportunidades ganadas / oportunidades totales).
- Actividades registradas (llamadas, reuniones).
- Tiempo medio de cierre (días desde creación de oportunidad a ganada).

**Útil para**: evaluar rendimiento individual + planificar objetivos.

### 2. Cartera activa
Foto fija de la cartera de un comercial:
- Empresas activas asignadas.
- Contratos en vigor.
- Facturación anual estimada (suma de valores de contratos).
- Contratos próximos a vencer (ventana configurable).
- Oportunidades en curso por etapa.

**Útil para**: revisar la situación del comercial + handover cuando alguien sale del equipo.

### 3. Forecast de ventas
Proyección de ingresos próximos:
- Oportunidades por etapa × probabilidad = valor ponderado.
- Desglose por mes (según fecha cierre prevista).
- Breakdown por comercial y por tipo de energía.

**Útil para**: proyectar caja + planificar equipo.

### 4. Incidencias y SLA
Análisis de incidencias:
- Nº incidencias abiertas/resueltas/cerradas.
- Tiempo medio de resolución.
- Por tipo (facturación, avería, disconformidad).
- Clientes con más incidencias (indicador de riesgo churn).

**Útil para**: identificar problemas recurrentes + priorizar soporte.

### 5. Renovaciones pendientes
Pipeline de renovaciones:
- Contratos próximos a vencer en 90/60/30 días.
- % tasa de renovación histórica.
- Valor en juego.

**Útil para**: priorizar acciones comerciales en contratos vencedores.

### 6. Actividad global
Resumen de actividad del equipo:
- Llamadas, reuniones, emails registrados.
- Actividades pendientes (tareas sin completar).
- Tiempo dedicado por tipo.

**Útil para**: evaluar productividad y detectar cuellos de botella.

## Paso a paso — generar un informe

1. Menú → **Informes**.
2. Elegir el tipo de informe del listado.
3. Configurar **filtros**:
   - Rango de fechas.
   - Comercial (uno o todos).
   - Tipo de energía (eléctrica / gas / dual).
   - Etapas (para forecast).
   - Cualquier otro filtro específico del informe.
4. Pulsar **Generar**.
5. El informe se muestra en pantalla con gráficos y tablas.
6. Acciones sobre el informe:
   - **Exportar CSV**: descarga datos tabulados.
   - **Exportar PDF**: descarga PDF con gráficos.
   - **Enviar por email**: envía el PDF a los emails que indiques.
   - **Programar** (manager/admin): configurar que se genere automáticamente cada mes y se envíe por email.

## Permisos por rol

| Informe | Comercial | Manager | Admin |
|---|---|---|---|
| Comercial mensual (solo propio) | ✅ | ✅ | ✅ |
| Comercial mensual (otros) | ❌ | ✅ (su equipo) | ✅ |
| Cartera activa (propia) | ✅ | ✅ | ✅ |
| Cartera activa (otros) | ❌ | ✅ (su equipo) | ✅ |
| Forecast | ❌ | ✅ | ✅ |
| Incidencias | ❌ | ✅ | ✅ |
| Renovaciones | ❌ | ✅ | ✅ |
| Actividad global | ❌ | ✅ | ✅ |

## Informes programados

Solo manager/admin. Permite enviar un informe por email automáticamente cada X tiempo:

1. Generar el informe con los filtros deseados.
2. Pulsar **Programar**.
3. Configurar:
   - **Frecuencia**: diaria, semanal (día de semana), mensual (día de mes), trimestral.
   - **Emails destinatarios**: uno o varios.
   - **Formato**: PDF, CSV o ambos.
4. Guardar.

El sistema lo enviará sin intervención manual. Puedes pausar/cancelar desde Admin → Informes programados.

## Errores frecuentes

- **"Sin datos para los filtros seleccionados"**: el rango es muy estrecho o los filtros excluyen todo. Amplía fechas o quita filtros.
- **"Error al generar PDF"**: el informe tiene demasiadas filas. Filtrar más o usar solo CSV.
- **"No tengo permiso para este informe"**: rol insuficiente. Pedir al admin.

## Preguntas relacionadas

- ¿Cómo programar un informe semanal que llegue los lunes?
- ¿Puedo crear un informe custom con los campos que yo elija?
- ¿Los informes incluyen los custom fields?
- ¿Cómo exportar solo una selección concreta, no todos los datos?
