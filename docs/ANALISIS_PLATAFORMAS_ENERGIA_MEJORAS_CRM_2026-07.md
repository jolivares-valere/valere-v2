# Análisis profesional de plataformas de gestión energética → mejoras para el CRM Valere

> Fecha: 2026-07-13 · Autor: sesión Cowork · Tipo: análisis competitivo / benchmarking técnico
>
> Alcance: revisión en vivo de (1) **Linkener SIGE** (`linkener.meters.es`, plataforma con acceso real de Valere) y (2) **CRM Segenet** white-label de Valere (`crm.valereconsultores.com`), más la auditoría pública previa de Linkener, Telegest/Energygest, Segenet y Gestinel. Objetivo: identificar mejoras concretas para el CRM Valere en funcionamiento interno, flujo de información, gráficos, opciones y trabajo de datos.

---

## 0. Resumen ejecutivo

Las dos plataformas que Valere ya usa comparten una misma tesis de producto: **el dato de consumo (Datadis o telemedida) se ingiere, se persiste y se explota en módulos de análisis y en dashboards configurables**, todo en un modelo multi-cliente/multi-CUPS con jerarquía de organización y capa de IA. El CRM Valere hoy es fuerte en la parte comercial (empresas, contratos, oportunidades, renovaciones, propuestas) pero débil en la **explotación del dato energético**: la pantalla Datadis pide datos en vivo y no los persiste, no hay validación de factura, ni optimizador de potencia productizado, ni dashboards configurables.

La conclusión operativa es clara: la mayor palanca de valor es construir la **capa de datos energéticos persistida** (curva, potencias, contrato) y, sobre ella, replicar tres piezas de altísimo retorno que ambas plataformas destacan: **monitorización rápida (curva + mapa de calor), optimizador de potencia y validación de factura**.

---

## 1. Plataformas analizadas (contexto)

| Plataforma | Rol para Valere | Qué aporta al análisis |
|---|---|---|
| **Linkener SIGE** | Plataforma energética con acceso real | Arquitectura modular, suite analítica (SIGE), dashboards configurables, validación de factura por OCR, estudios de potencia/reactiva, IA (LinkIA), organización jerárquica |
| **CRM Segenet** (white-label Valere) | CRM comercial + herramientas que Valere usa hoy | Hub de "Herramientas", monitorización rápida (curva P1–P6 + mapa de calor + 7 magnitudes), comparadores, optimizador de potencia, operativa de agentes/canales |
| Telegest, Gestinel | Referencia pública | Verificación de factura línea a línea, telemedida industrial, white-label por canal |

---

## 2. Funcionamiento interno y flujo de información (lo observado en vivo)

### 2.1 Linkener SIGE — estructura
Navegación principal (barra izquierda): **Cuadro de mandos · SIGE · Suministros · Organización · LinkIA**.

- **Suministros**: registro maestro de puntos de suministro. Columnas: Nombre, Dirección, Código postal, **CUPS**, Propietario, Activo. Es la entidad raíz sobre la que cuelga todo el dato.
- **Organización**: jerarquía (organización → centros → suministros) para agrupar carteras y consolidar consumos. Permite vistas agregadas por grupo.
- **SIGE** (suite analítica, menú flotante, v2025-12.03):
  - **Validación de factura** · **Simulación de factura**
  - **Gráficos** · **Informes**
  - **Estudio de potencia** · **Estudio de reactiva inductiva**
  - **Alarmas** (con submenú) · **Registro de datos**
- **Cuadro de mandos**: **constructor de dashboards configurables** (crear dashboard, usar plantilla, marcar predeterminado/fijar, nº de widgets/grupos, acciones). El usuario compone su propio panel con widgets.
- **LinkIA**: asistente de IA (capa transversal).

**Flujo de información (Linkener):**
```
Contador (telemedida) / Datadis
   → ingesta y persistencia por dispositivo (device)
      → SIGE: Gráficos / Estudios (device + rango de fechas → resultado)
      → Validación de factura (PDF real + curva → simulada vs real)
      → Alarmas (reglas sobre la serie)
   → Cuadro de mandos (widgets que leen los resultados)
   → Informes (export) · LinkIA (consulta en lenguaje natural)
```
Patrón repetido en cada módulo: **selector de dispositivo/contador + rango de fechas → cálculo → resultado guardable**. Ejemplo real: "Estudio de potencia" avisa de usar **un año de datos** para que la potencia propuesta sea óptima (metodología basada en histórico anual de maxímetros).

### 2.2 CRM Segenet — estructura
Navegación: Escritorio · Contratos · Cuentas · Oportunidades · Contactos · Tareas · Calendario · Liquidaciones · Productos · Documentos · **Mi red** · **Herramientas**.

- **Escritorio**: KPIs (Total consumo MWh, Total contratos, comisiones agentes/Valere, total agentes) + gráficas "Contratos por comercializadora" y "Contratos por agente".
- **Mi red**: gestión de agentes/canales.
- **Herramientas** (hub de mini-utilidades autocontenidas):
  - *Utilidades*: Comparador de luz, Comparador de luz multipunto, Comparador de gas, Comparador de telefonía, **Buscador de CUPS**, **Creador de banner** (para informes PDF), **Optimizador de Potencia** (CUPS 3.0TD), Fichajes diarios.
  - *Monitorización*: **Monitorización** (consumo detallado) y **Monitorización contadores** (cuartohorario).
  - *Administración*: Cargar liquidaciones, Configuración de estados, **Correo masivo** a agentes, **Registros** (audit log), **Editor de permisos**, **Cambio masivo de estados**, Fichajes.

**Flujo de información (Segenet):** el hub de Herramientas actúa como "cajón de apps" sobre el mismo dato de CUPS; la Monitorización carga **al instante** porque el dato está **persistido**.

---

## 3. Gráficos y visualizaciones (lo que hay que replicar)

Observado en la Monitorización de Segenet (con datos reales de un cliente):

1. **Curva de carga por periodos P1–P6** (colores por periodo) sobre rango de fechas, con eje kWh y eje secundario (0–1) para factor de potencia. Pestañas de magnitud: **Energía activa, Energía inductiva, Energía capacitiva, Potencia, Potencia contratada, Cos Phi inductiva, Cos Phi capacitiva**.
2. **Mapa de calor día × hora**: rejilla donde cada celda es el consumo horario (kWh) con etiqueta de periodo, coloreada de amarillo (bajo) a rojo (alto). Ideal para detectar patrones y picos.
3. **Selector Desde/Hasta** + **Descargar** (export) + conmutador "Gráfica simple / Mapa de calor".

En Linkener, además, **dashboards configurables por widgets** (el usuario arma su panel) y **Gráficos guardables** por dispositivo/rango.

**Brecha Valere:** hoy el CRM tiene gráficas puntuales (recharts en dashboard, pipeline) pero **no** una monitorización de curva por CUPS con estas magnitudes ni mapa de calor, y **no** dashboards configurables.

---

## 4. Trabajo de datos (los módulos de mayor valor)

### 4.1 Validación de factura (Linkener) — pieza estrella
- Lista con columnas: **Nombre, Estado, Factura Real, Factura Simulada, Diferencia, %**.
- "Crear validación": **subes el PDF de la factura real → se procesa por OCR → se calcula la factura simulada desde la curva/tarifa → se compara → diferencia en € y %**.
- Valor comercial altísimo: demuestra al cliente cuánto le sobrefacturan; genera oportunidad automáticamente.

### 4.2 Estudio/Optimizador de potencia
- Selector de contador + rango; recomienda potencias óptimas P1–P6 a partir del histórico (idealmente 1 año) de maxímetros/curva. Salida accionable (coste actual vs óptimo). En Segenet está productizado como "Optimizador de Potencia (3.0TD)".

### 4.3 Estudio de reactiva inductiva
- Análisis de energía reactiva y cos phi → detección de penalización por reactiva (recomendación de batería de condensadores).

### 4.4 Simulación de factura, Comparadores, Precios OMIE
- Simular coste con distintas tarifas/comercializadoras; comparadores de luz (mono y multipunto), gas y telefonía; precios OMIE como fuente de mercado.

### 4.5 Registro de datos / Alarmas / Informes
- **Registro de datos**: trazabilidad de la serie (huecos, ingestas).
- **Alarmas**: reglas sobre la serie (exceso de potencia, reactiva, consumo anómalo, hueco de lectura) con aviso.
- **Informes**: generación y export (base para entregables al cliente).

---

## 5. Análisis de brechas: Valere CRM vs. plataformas

| Área | Plataformas (Linkener/Segenet) | CRM Valere hoy | Brecha |
|---|---|---|---|
| Dato energético persistido | Curva + potencias + contrato guardados por CUPS | Se pide a Datadis en vivo, no se persiste | **Alta** |
| Monitorización (curva + heatmap + magnitudes) | Sí, instantánea | Pantalla CUPS a medias, lenta, sin heatmap ni reactiva | **Alta** |
| Validación de factura (OCR real vs simulada) | Sí (pieza estrella) | No existe | **Alta** |
| Optimizador de potencia | Sí, productizado | No (planificado) | **Alta** |
| Dashboards configurables (widgets/plantillas) | Sí (Linkener) | Dashboard fijo | Media |
| Hub de "Herramientas" | Sí (Segenet) | Utilidades dispersas | Media |
| Estudio de reactiva / cos phi | Sí | No | Media |
| Comparadores (luz/gas/telefonía) | Sí | Calculadora parcial | Media |
| Organización jerárquica (grupos de CUPS) | Sí | Empresa→CUPS plano | Media |
| Alarmas sobre la serie | Sí | Solo incidencias de sync (nuevo) | Media |
| Gestión de agentes/canales ("Mi red") | Sí | Roles básicos | Media (Fase B) |
| Portal cliente | Sí (Segeapp) | No (Fase C) | Baja (futuro) |
| Asistente IA sobre datos | Sí (LinkIA) | RAG de ayuda (ask-crm-docs) | Reutilizable |
| Audit log / editor de permisos visual | Sí | Telemetría + roles hardcode | Media |
| CRM comercial (oportunidades, renovaciones, comisiones) | Básico | **Fuerte** (ventaja de Valere) | — (a favor) |

**Lectura:** la ventaja de Valere está en el CRM comercial; la brecha está toda en la **capa de explotación del dato energético**. Cerrarla nos pone al nivel de estas plataformas manteniendo nuestra fortaleza comercial (que ellas no tienen tan desarrollada).

---

## 6. Recomendaciones priorizadas para el CRM Valere

Ordenadas por valor/coste. Se apoyan en Datadis (ya operativo como partner) + tablas de precios que ya tenemos; la telemedida física queda para una fase posterior.

**Bloque 1 — Capa de datos (habilitador, imprescindible):**
1. **Persistir el dato Datadis** (curva de consumo, maxímetro, contrato) en tablas propias, alimentadas por el worker `datadis-sync`. Sin esto, nada va rápido.

**Bloque 2 — Explotación (alto valor):**
2. **Monitorización por CUPS** con las dos vistas (curva P1–P6 + **mapa de calor** día×hora), selector de fechas, magnitudes (activa/inductiva/capacitiva, potencia, potencia contratada, cos phi) y **export**.
3. ⭐ **Optimizador de potencia** P1–P6 (coste actual vs óptimo, export a Excel/PDF).
4. ⭐ **Validación de factura**: subir PDF real → OCR → comparar con factura simulada desde la curva → diferencia €/% → genera oportunidad. (Reutiliza motor de la Calculadora + `boe_regulated_prices` + precios pool.)
5. **Estudio de reactiva / cos phi** → aviso de penalización.

**Bloque 3 — Producto y operativa:**
6. **Hub "Herramientas"** unificado (una ruta) que agrupe comparadores, buscador de CUPS, optimizador, monitorización, creador de banner.
7. **Dashboards configurables** por widgets (empezar por plantillas fijas por rol; evolucionar a arrastrar widgets).
8. **Alarmas** sobre la serie (exceso de potencia, reactiva, hueco de lectura, consumo anómalo) reutilizando el patrón de la alarma de incidencias ya creada.
9. **Organización jerárquica** de CUPS (grupos/centros) para clientes multi-suministro.
10. **Asistente IA sobre datos** (extender el RAG actual a consultar consumos/facturas).

**Bloque 4 — Canales y cliente (Fases B/C):**
11. **"Mi red"** de agentes + **correo masivo** + informes white-label (reusa `generar-propuesta-pptx`).
12. **Portal del cliente** estilo Segeapp (facturas, consumos, gráficas, informes, recomendaciones, FV).
13. **Audit log** visible y **editor de permisos** visual.

---

## 7. Principios de diseño a adoptar (transversales)
- **Todo en euros, no solo en kWh.**
- **Patrón uniforme por módulo**: selector (CUPS/dispositivo) + rango de fechas → resultado guardable/exportable.
- **Vistas duales** para la serie: curva + mapa de calor.
- **Resultados accionables** (no solo informativos): cada estudio termina en un ahorro €, una recomendación o una oportunidad.
- **White-label**: informes con marca Valere.
- **IA con preguntas sugeridas** sobre el dato.

---

## 8. Encaje con el plan existente
Este análisis **valida y amplía** `docs/PLAN_MODULO_DATADIS_V2.md`. El Sprint 1 allí definido (persistir Datadis + ficha de CUPS + optimizador de potencia) es el Bloque 1+2 de aquí. Se recomienda **añadir al Sprint 1 la vista de mapa de calor y las magnitudes de reactiva/cos phi**, y planificar la **validación de factura** como Sprint 2 (pieza de mayor impacto comercial).

## 9. Evidencia (exploración en vivo 2026-07-13)
- Linkener SIGE: `linkener.meters.es` — Cuadro de mandos (constructor de dashboards), SIGE (Validación/Simulación de factura, Gráficos, Informes, Estudio de potencia, Estudio de reactiva inductiva, Alarmas, Registro de datos), Suministros, Organización, LinkIA. Validación de factura por subida de PDF (OCR) con salida Factura Real vs Simulada + Diferencia €/%.
- CRM Segenet: `crm.valereconsultores.com` — Escritorio con KPIs y gráficas por comercializadora/agente; hub Herramientas; Monitorización contadores con curva P1–P6, mapa de calor día×hora, 7 magnitudes, Desde/Hasta y Descargar.
- Auditoría pública previa: `docs/PLAN_MODULO_DATADIS_V2.md` §2 y fuentes allí citadas.

## 10. Recorrido detallado del SIGE de Linkener (todas las opciones, 2026-07-13)

Menú **SIGE** (v2025-12.03) completo, con el patrón y las opciones observadas en cada uno:

| Opción SIGE | Qué hace | Inputs / opciones | Salida |
|---|---|---|---|
| **Validación de factura** | Compara factura real vs simulada | Subir **PDF** → OCR/IA; asociar a **suministro/CUPS** | Lista Real / Simulada / **Diferencia €/%** + estado ("Pendiente de revisar"). Probado: 626,91 € real |
| **Simulación de factura** | Simula el coste desde la curva | Pestañas **Creadas / Programadas** (recurrentes); dispositivo, tipo de informe, periodo, formato | Informe simulado (guardable/programable) |
| **Gráficos** | Curva por dispositivo | Selector dispositivo + **rango de fechas** (con presets); botón **Guardar** (a dashboard) | Gráfica guardable como widget |
| **Informes** | Generación de informes | (comparte selector dispositivo+rango) | Informe exportable |
| **Estudio de potencia** | Optimizador de potencia P1–P6 | Selector **contador** + rango; aviso "usa 1 año para óptimo" | Potencias óptimas / coste actual vs óptimo |
| **Estudio de reactiva inductiva** | Análisis de reactiva/cos phi | contador + rango | Penalización por reactiva |
| **Alarmas** | Reglas sobre la serie (submenú) | Config. de reglas por dispositivo | Avisos |
| **Registro de datos** | Trazabilidad de la serie | — | Log de ingestas/huecos |

**Cuadro de mandos** = constructor de **dashboards configurables**: "Nuevo Dashboard", "Usar Plantilla", nº de widgets/grupos, marcar **predeterminado/fijar**, acciones (editar/eliminar). El usuario compone su panel con widgets que leen de los módulos.

**Organización** = jerarquía (organización → centros → suministros) para agrupar carteras y consolidar consumos.

**Patrón transversal confirmado en TODO el SIGE:** `seleccionar dispositivo/contador + rango de fechas → cálculo → resultado guardable / programable / exportable`. Esto es directamente trasladable a nuestro stack (un componente `SelectorCupsRango` reutilizable + hooks por módulo).

### Mejoras concretas nuevas que incorporar (derivadas de este recorrido)
1. **Componente reutilizable "CUPS + rango de fechas"** como base de todos los módulos energéticos (evita rehacer el selector en cada pantalla).
2. **Informes programados/recurrentes** (pestaña "Programadas"): generar y enviar informes/simulaciones periódicas por cliente → reutiliza el patrón de cron que ya tenemos (esios/datadis-sync) + Resend.
3. **Validación de factura con estado de revisión** ("Pendiente de revisar" → "Revisada"): flujo de trabajo, no solo cálculo. Cada validación con diferencia relevante debería **crear una oportunidad** automáticamente en el CRM (ventaja: nosotros ya tenemos el módulo de oportunidades).
4. **Dashboards configurables por widgets con plantillas por rol** (empezar por 2-3 plantillas fijas: telemarketing, analista, asesor).
5. **Organización jerárquica de CUPS** (grupos/centros) para clientes multi-suministro, con consolidación de consumo.
6. **Guardar gráfico como widget** en el dashboard (un botón "Guardar" en la monitorización que fije esa vista en el cuadro de mandos del usuario).

## 11. Módulos transversales de Linkener (Organización + LinkIA)

### Organización (jerarquía)
Estructura organización → centros → suministros. Permite agrupar la cartera y **consolidar consumos por grupo** (cadenas, franquicias, clientes multi-centro). En el CRM Valere hoy la relación es `empresa → cups` plana; añadir un nivel de agrupación (o `grupo_cups`) habilita vistas agregadas para grandes cuentas.

### LinkIA (asesor con IA)
Asistente de IA en lenguaje natural, siempre accesible (botón inferior-izquierdo), que responde sobre los consumos y facturas del cliente. Equivale a nuestro `AsistentePanel` + RAG (`ask-crm-docs`), pero enfocado al **dato energético** en lugar de a la documentación de ayuda. Reutilizable con coste bajo: mismo patrón de Edge Function + `ai-adapter`, cambiando el contexto (curva/potencias/factura) en vez de los docs de ayuda. Valor: preguntas tipo "¿qué CUPS consumió más este mes?", "¿hubo picos raros la semana pasada?" con chips de sugerencias.

**Mejoras derivadas:**
7. **Nivel de agrupación de CUPS** (grupos/centros) sobre `empresa`, con consolidación de consumo para grandes cuentas.
8. **Asistente IA sobre el dato energético** reutilizando la infraestructura RAG existente (nuevo contexto: consumos/potencias/facturas).

## 12. Cierre: recorrido 100% completado
Revisado todo el CRM de Linkener: Cuadro de mandos, SIGE completo (Validación/Simulación de factura, Gráficos, Informes, Estudio de potencia, Estudio de reactiva inductiva, Alarmas, Registro de datos), Suministros, Organización y LinkIA. No queda ninguna opción sin auditar. El conjunto de mejoras para el CRM Valere queda consolidado en las secciones 5, 6, 10 y 11 de este documento.
