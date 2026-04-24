---
title: Interpretar el dashboard
section: dashboard
audience: todos
keywords: [dashboard, panel, inicio, principal, kpis, métricas, resumen, widgets]
related:
  - oportunidades/pipeline-kanban
  - contratos/gestionar-contratos
  - incidencias/registrar-incidencia
---

# Interpretar el dashboard

## Resumen rápido
El **dashboard** es la primera pantalla al entrar. Muestra KPIs y widgets según tu rol. Si eres **comercial**, ves tus números. Si eres **manager** o **master**, ves los del equipo o de la consultoría entera.

## Secciones del dashboard

### 1. KPIs principales (arriba)
- **Oportunidades activas**: total de oportunidades en etapas no-terminales (prospecto → contrato firmado).
- **Valor pipeline ponderado**: suma de (valor × probabilidad) de todas las oportunidades activas. Indica cuánto se espera cerrar según probabilidad.
- **Contratos activos**: contratos en estado `activo`.
- **Incidencias abiertas**: incidencias en estado `abierta` o `en_proceso`.

### 2. Vencimientos próximos
- Contratos que vencen en los próximos 90 días.
- Semáforo: 🟢 90+ días / 🟡 60-90 / 🟠 30-60 / 🔴 <30 o vencido.
- Click en un contrato → va a su ficha.

### 3. Pipeline visual
- Mini-kanban con las 8 etapas.
- Muestra cuántas oportunidades hay en cada.
- Click en columna → te lleva al pipeline completo filtrado.

### 4. Actividad reciente
- Últimas actividades registradas (tuyas si eres comercial, del equipo si eres manager).
- Incluye: nuevas empresas, nuevas oportunidades, cambios de etapa, nuevos contratos.

### 5. Tareas pendientes
- Tareas asignadas a ti con vencimiento próximo.
- Click → abre la actividad.

## Diferencias por rol

| Widget | Comercial | Manager | Master |
|---|---|---|---|
| KPIs propios | ✅ | ✅ | ✅ |
| KPIs del equipo | ❌ | ✅ | ✅ |
| KPIs globales consultoría | ❌ | ❌ | ✅ |
| Vencimientos de todos los contratos | ❌ | ✅ | ✅ |
| Actividad de otros | ❌ (solo equipo) | ✅ | ✅ |

## Consejos de uso diario

- **Empieza cada mañana por aquí**: 2 minutos revisando el dashboard te orientan para el día.
- **Vencimientos**: prioriza contratos en 🔴 (menos de 30 días) — son los que se te van si no actúas.
- **Pipeline**: si ves una columna muy cargada (ej. 10 oportunidades en "Oferta presentada") puede ser síntoma de oportunidades atascadas que necesitan push.
- **Tareas**: completa tareas vencidas antes de las nuevas del día.

## Filtros / personalización

- **Rango de fechas**: cambiar entre "este mes", "último trimestre", "este año".
- **Por tipo energía**: electricidad / gas / dual.
- **Custom fields**: si has configurado custom fields en las entidades, puedes filtrar por ellos (Fase 28).

## Errores frecuentes

- **"Dashboard vacío"**: si es tu primer día, aún no tienes datos. Crea una empresa y una oportunidad para ver widgets rellenos.
- **"Los números no cuadran"**: revisa el filtro de fechas activo. Si tienes "último trimestre" y quieres todo, cambia a "desde el inicio".
- **"No veo widgets que aparecen en capturas"**: algunos widgets dependen del rol. Si no los ves, tu rol no tiene permiso.

## Preguntas relacionadas

- ¿Cómo ver el forecast de ventas del próximo mes?
- ¿Puedo personalizar qué widgets aparecen en mi dashboard?
- ¿Cómo exportar los KPIs a un informe?
- ¿Qué significa "Valor pipeline ponderado"?
