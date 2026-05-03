# Auditoría profesional del CRM Valere — visión sector consultoría energética B2B

> **Autor:** Claude Cowork (1 mayo 2026), aplicando conocimiento del mercado eléctrico español, regulación BOE, prácticas estándar de consultoras energéticas B2B y software vertical del sector (Linkener, SegeNet, Ledecom, Solplanet, Iberdrola Smart Solutions, etc.).
>
> **Diferencia con [`AUDIT_2026-05-01_MEJORAS_CRM.md`](AUDIT_2026-05-01_MEJORAS_CRM.md):** ese audit miró el código y encontró "lo que está construido vs. lo que está cableado". Este audit mira el **producto** y encuentra "lo que un cliente B2B serio espera de su consultora energética y que el CRM no contempla".
>
> **Alcance:** ideas estratégicas para los próximos 6–12 meses. No todo va en el roadmap inmediato, pero sí debería formar parte del plan de producto.

---

## TL;DR — Tres conclusiones

1. **El CRM de Valere hoy es un CRM general aplicado al sector energético, no un CRM vertical de consultoría energética.** La diferencia es estructural: un CRM general gestiona empresas+contratos+oportunidades; un CRM vertical de este sector tiene como objeto central el **suministro (CUPS) y su factura**, con todo lo demás orbitando alrededor.

2. **Hay 5 fuentes de datos públicas y gratuitas que la app no consume todavía y que cambiarían el juego:** SIPS (titularidad y comercializadora actual de cualquier CUPS), OMIE (precios horarios mercado), REE/eSIOS (mix energético, factor emisiones), datos BOE actualizados (peajes, cargos, IE) y CNMC (resoluciones de mercado). Datadis ya está integrado pero infrautilizado.

3. **La oportunidad de monetización mayor que el CRM puede facilitar es el negocio adyacente a la energía:** autoconsumo FV, certificados de ahorro energético (CAE), comunidades energéticas, auditorías obligatorias RD 56/2016, reporting CSRD/CBAM. Cada uno de estos puede aportar tickets de €10K-€50K por cliente bien gestionado, mientras que la consultoría pura tiene márgenes apretados.

---

## 1. El modelo mental que falta — cadena de valor de una consultora energética

Una consultora energética B2B madura presta servicios estructurados en **7 fases del ciclo cliente**. El CRM debería instrumentar cada una.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROSPECCIÓN  →  AUDITORÍA INICIAL  →  PROPUESTA  →  CONTRATACIÓN  →        │
│                                                                              │
│  → ONBOARDING  →  GESTIÓN CONTINUA  →  RENOVACIÓN/UPSELL                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

Lo que el CRM cubre hoy en cada fase:

| Fase | Cubierto | Sin cubrir (*donde está el valor*) |
|---|---|---|
| **1. Prospección** | Empresas, contactos, actividades, oportunidades | Lead scoring por NIF, integración SIPS automática (sabes potencia y comercializadora actual antes de la primera reunión), enriquecimiento desde Holded |
| **2. Auditoría inicial** | Datadis bajado a tabla `cups` | **Análisis automático del consumo**: tarifa óptima, optimización potencia, detección reactiva, distribución por períodos, baseload vs picos, estacionalidad. Hoy es manual. |
| **3. Propuesta** | `propuestas` + `propuestas-energia` | **Comparador multi-comercializadora** sobre el perfil real Datadis del cliente. RFP estructurado a comercializadoras. Generación PDF white-label con cálculos defendibles. |
| **4. Contratación** | `contratos` con campos básicos | **Workflow de cambio de comercializadora** completo: firma contrato, baja anterior, alta nueva, gestión transición, monitorización CUPS hasta activación. Plantillas legales. |
| **5. Onboarding** | — | **Carta de autorización Datadis** generación + envío firma + carga PDF firmado + validación. Configuración alertas iniciales por cliente. Reunión de bienvenida con resultados primer mes. |
| **6. Gestión continua** | `incidencias`, `actividades`, alertas vencimiento | **Validación mensual de facturas** (motor de reglas), **alertas inteligentes** (anomalía consumo, exceso potencia, reactiva, bajada inesperada), **reporting mensual** automatizado al cliente. |
| **7. Renovación/Upsell** | Cron `daily_contract_check` crea oportunidad 60d antes | **Análisis comparativo automático con OMIE** ("tu precio actual es X, mercado está en Y, ahorro potencial Z"). **Propuestas cruzadas**: FV, baterías, eficiencia, CAEs. |

---

## 2. El cambio de objeto central del CRM — del cliente al suministro

Un CRM general pone la **empresa/cuenta** en el centro. Un CRM vertical de consultoría energética debería poner el **suministro (CUPS)** en el centro, porque es la unidad económica real.

### Por qué importa

- Un cliente puede tener **20 CUPS distribuidos en 12 ubicaciones**. Hoy todos cuelgan de "empresa" y se mezclan.
- Las **renovaciones son por CUPS**, no por empresa: una empresa puede tener 5 CUPS que vencen en fechas distintas con comercializadoras distintas.
- El **ahorro se calcula por CUPS** (consumo × precio).
- Las **incidencias se generan por CUPS** (lectura estimada en CUPS X, reactiva en CUPS Y).
- Las **facturas son por CUPS-período**.

### Implicación de producto

Una vista nueva `/suministros` o `/cups` con:

- Tabla maestra de todos los CUPS de la cartera, con filtros (provincia, tarifa, comercializadora, fecha vencimiento, %FV, ahorro acumulado).
- Ficha de CUPS con: titular (empresa), curva Datadis, contrato vigente, histórico de contratos, facturas, incidencias, alertas activas, ahorro acumulado.
- KPI por CUPS: kWh/año, €/año, €/kWh medio, ahorro 12m, incidencias resueltas.

**Hoy `/empresas/:id` tiene un tab "CUPS" pero el CUPS no es ciudadano de primera clase.** Hay 72 CUPS en BD y ninguno asignado a empresa por la fricción del proceso (FASE 30.6 lo arregla parcialmente).

---

## 3. Las 5 fuentes de datos públicas que faltan

### 3.1 SIPS (Sistema de Información de Puntos de Suministro) — **prioritario**

Endpoint público gratuito de cada distribuidora (UFD, EDistribución, I-DE, EOSA, EREDES). Devuelve para cualquier CUPS:

- Titular (NIF + nombre fiscal).
- Comercializadora actual.
- Tarifa de acceso (2.0TD/3.0TD/6.xTD).
- Potencias contratadas P1-P6.
- Fecha último cambio de tarifa.
- Tipo de medición (1=cuarto-horaria, 2=mensual).

**Por qué importa:** te ahorras pedirle al cliente *"mándame tu factura"*. Le pides el CUPS y ya sabes con quién está, qué paga aproximadamente y a qué tarifa. Cierra la primera conversación comercial en 1 minuto en lugar de en 1 semana.

**Implementación:** Edge Function `sips-lookup` que consulta el endpoint de la distribuidora correcta según el código del CUPS (los 4 primeros dígitos identifican la distribuidora). El consentimiento explícito del titular se gestiona aparte.

### 3.2 OMIE — precios horarios del mercado mayorista

API pública: `https://www.omie.es/es/file-download?parents=marginalpdbc&filename=marginalpdbc_YYYYMMDD.1`

Devuelve los 24 precios horarios (€/MWh) del día. Snapshot diario en tabla `omie_precios_horarios (fecha, hora, precio_eur_mwh)`.

**Casos de uso en el CRM:**
- Comparativo: "tu contrato fijo está a 0,12 €/kWh; mercado spot últimos 90 días promedió 0,08 €/kWh. Ahorrarías €X cambiando a indexado."
- Validación de facturas indexadas: si tu contrato dice "OMIE + 0,02 €/kWh", tu factura debería coincidir con `precio_omie_periodo + 0,02 × consumo_periodo`.
- Detección de oportunidad de cambio: alarma cuando la curva del cliente correlaciona con períodos de OMIE bajo (le interesa indexado).

### 3.3 REE / eSIOS — mix energético y factor emisiones

API pública con token gratuito: `https://api.esios.ree.es/`. Datos clave:

- Mix energético horario (eólica, solar, hidráulica, nuclear, ciclo combinado, etc.).
- Factor de emisiones del sistema eléctrico español (kg CO₂/kWh) por hora.
- Demanda nacional.

**Caso de uso:** **reporting de huella de carbono Scope 2** del cliente, automático y oficial. Para empresas obligadas a reportar CSRD (a partir de 2025/2026 según tamaño), esto vale mucho. Genera el dato sin que el cliente lo pida y se lo entregas en su informe mensual.

### 3.4 Datos BOE actualizados — peajes, cargos, IE

Hoy `boe_regulated_prices` existe pero no hay **proceso de actualización**. Los peajes y cargos cambian por resoluciones de la CNMC publicadas en BOE. Mantener desactualizado este dato significa que tus comparativas y validaciones son incorrectas.

**Acción:** scraping mensual del BOE buscando "peajes acceso eléctricos" + "cargos sistema eléctrico" + "impuesto especial electricidad" + alertas a admin si hay cambios. Hay sólo 2-4 cambios/año, scraping muy ligero.

### 3.5 CNMC — resoluciones de mercado

La CNMC publica resoluciones que afectan a contratos y reclamaciones (cambios de comercializadora, suspensiones, rebajas administrativas). Útil para el módulo de incidencias: si un cliente tiene problema con su comercializadora, contrastar con resoluciones recientes.

---

## 4. El motor de validación de facturas — la palanca de fidelización

La auditoría técnica ya identifica el "Validador de facturas v0" (FASE 32.2) como producto necesario. Aquí ampliamos qué reglas debe ejecutar para ser **realmente profesional** y no un "diff visual":

### Reglas de validación (orden de complejidad)

1. **Concordancia de consumo Datadis**: el `consumo_p*` facturado debe coincidir con la suma de la curva horaria Datadis de ese período (margen ≤1%).
2. **Tarifa de acceso vigente**: peajes y cargos según RD vigente en la fecha de factura. Detectar si la comercializadora aplica peajes obsoletos.
3. **IE correcto**: 5,11269632% sobre (energía + potencia). Ojo: las bonificaciones del IE en algunos años requieren tipo reducido.
4. **IVA correcto**: 21% (ojo: 5%/10% temporal en crisis energética 2022-2024).
5. **Reactiva no penalizable cuando cosφ ≥ 0.95**: si el contador la ha registrado por debajo del umbral pero la facturan, error.
6. **Excesos de potencia legítimos**: el coeficiente Ke aplicado debe ser correcto y solo sobre el exceso real medido.
7. **Periodo de facturación**: días reales × tarifa día = importe potencia. Detectar facturas con días duplicados o gap.
8. **Coincidencia precio contrato**: el `precio_energia_p*` facturado debe coincidir con el contratado (FASE 31.1 introduce este campo).
9. **Bono social**: si el cliente lo tiene aplicado, verificar reducción correcta.
10. **Cargos por servicios añadidos**: detectar conceptos extraños (mantenimientos no contratados, seguros, etc.).

### Output del validador

- **Estado**: OK / Discrepancia menor (<2% importe) / Discrepancia mayor (≥2%) / Error grave.
- **Diff por línea**: qué concepto está bien, qué está mal, en cuánto.
- **Importe reclamable estimado**.
- **Plantilla de reclamación pre-rellenada** con los argumentos legales (artículos del RD aplicable).
- **Trazabilidad**: ir al detalle Datadis horario que respalda cada cálculo.

### Por qué es la palanca de fidelización

Una consultora que detecta y reclama €X al año por errores de factura **demuestra valor tangible cada mes**. La factura de la consultora es < €X. El cliente nunca se va.

**Ledecom y Linkener** ya hacen esto, pero su software es genérico y la **integración con datos reales del cliente es débil**. Valere puede hacerlo mejor con Datadis nativo.

---

## 5. Servicios adyacentes que multiplican el ticket — qué debería instrumentar el CRM

La consultoría energética pura tiene márgenes apretados (1–3% del consumo del cliente). Los servicios adyacentes son donde se hace dinero **y donde el CRM puede ser arma comercial**.

### 5.1 Autoconsumo fotovoltaico (FV)

- **Mercado:** boom 2023-2026. Empresas medianas y grandes están instalando, plazos de payback 4–8 años.
- **Lo que el CRM tiene:** módulo `seguimiento-fv` con plantas reales y mantenimiento.
- **Lo que falta:**
  - **Calculador de viabilidad FV por CUPS**: a partir de Datadis, calcular potencia óptima de instalación, generación esperada (PVGIS API gratuita), autoconsumo vs vertido, payback, TIR.
  - **Generador de propuesta FV**: PDF con cifras defendibles, basado en datos reales del cliente.
  - **Workflow de tramitación FV**: solicitudes a distribuidora (autorización inicial, instalación, conexión), legalización industria, registro RAIPRE.
  - **Tracking de generación post-instalación**: comparar real vs estimado.
- **Ticket adicional Valere:** comisión proyecto FV típica 5–15% del CAPEX. Para una FV de 100 kWp ≈ €60-80K, comisión Valere €3-12K.

### 5.2 Certificados de Ahorro Energético (CAE)

- **Mercado:** mecanismo creado por RDL 14/2022 (España). Empresas energéticas obligadas (~50/año) deben presentar ahorros certificados; pueden comprar CAEs a quien los genere.
- **Cómo funciona:** un cliente que reduce consumo (por LED, climatización eficiente, FV de autoconsumo, optimización procesos) genera CAEs por el ahorro acreditado. Un CAE = 1 kWh ahorrado certificado.
- **Mercado actual:** ~€0.05–0.15 por CAE en mercado secundario (precio CNMC).
- **Lo que el CRM podría hacer:**
  - **Detector de oportunidades CAE**: para cada cliente, simular ahorro potencial de medidas estándar (LED, variadores, climatización) y estimar CAEs y revenue.
  - **Workflow de certificación**: agente verificador, plataforma RECOPE, contrato de cesión.
  - **Marketplace interno**: agregar CAEs de los clientes de Valere y venderlos en bloque.
- **Ticket Valere:** comisión gestión CAE típica 15–30% del valor.

### 5.3 Comunidades Energéticas Locales (CER)

- **Mercado:** RD 244/2019 + Ley de Cambio Climático. Figura legal nueva, muchas comunidades en formación, muy poca herramienta.
- **CRM:** podría dar de alta una "Comunidad" que agrupe varios `empresas` y CUPS, repartir generación FV compartida según coeficientes, gestionar facturación interna.
- **Ticket Valere:** consultoría inicial creación CER €5-15K + gestión continua €100-300/mes.

### 5.4 Auditoría energética obligatoria RD 56/2016

- **Mercado:** empresas con >250 trabajadores o >50 M€ facturación, obligatorias cada **4 años**. Son ~1.500 empresas en España. Incumplimiento → sanciones administrativas.
- **CRM:** flag `auditoria_obligatoria: bool` en `empresas`, calendario de próxima auditoría, workflow de ejecución (análisis Datadis 12m, visita técnica, informe firmado).
- **Ticket Valere:** auditoría típica €3-15K por instalación.

### 5.5 Reporting CSRD / CBAM (corporativo grande)

- **Mercado:** CSRD obliga a empresas grandes (luego escalando a medianas) a reportar sostenibilidad incluyendo Scope 1/2/3 emisiones. CBAM (Carbon Border Adjustment Mechanism) afecta a importadores industria pesada.
- **CRM:** pestaña `Sostenibilidad` por empresa con cálculo automático de Scope 2 (emisiones eléctricas) usando factor de emisiones del mix REE.
- **Ticket Valere:** reporting anual €2-10K + consultoría descarbonización.

### 5.6 PPA (Power Purchase Agreements)

- **Mercado:** contratos directos consumidor-productor de >5 GWh/año. Mercado emergente, márgenes altos, complejidad legal alta.
- **CRM:** módulo dedicado `/ppa` con simulador, contratos plurianuales, tracking de consumo vs generación contratada.
- **Ticket Valere:** intermediación PPA estructuración 0.5-2% del notional.

---

## 6. Las alertas inteligentes — el cerebro operativo

Hoy las alertas son básicas (vencimiento, tareas pendientes). Una consultora energética madura monitoriza **patrones complejos en la curva horaria**. Lista de alertas que el CRM debería implementar:

### Alertas operativas (datos Datadis)

1. **Anomalía consumo**: media móvil 7d cambia >30% sin explicación. Posible avería, equipo nuevo, fuga.
2. **Exceso potencia**: valor 4-horario supera potencia contratada. Riesgo penalización en próxima factura.
3. **Reactiva en zona penalizable**: cosφ < 0.95 en P1-P3 durante >2h consecutivas.
4. **Lectura estimada**: detectada en últimos 7 días → trigger incidencia con plantilla reclamación.
5. **Patrón sospechoso fin de semana**: consumo de domingo similar a lunes → planta no apaga, oportunidad eficiencia.
6. **Cambio de hábito post-instalación FV**: tras instalar FV, el autoconsumo debería ser >X% — alarmar si baja (sombras, avería paneles).
7. **Pérdida señal Datadis**: 7 días sin datos del CUPS → escalar a distribuidora.

### Alertas de mercado (datos OMIE/BOE)

8. **Caída sostenida OMIE**: precios spot <X €/MWh durante >Y días → cliente con contrato fijo paga sobrecoste, oportunidad indexar.
9. **Subida sostenida OMIE**: cliente con indexado en escalada → revisar si conviene fijar.
10. **Cambio normativo**: CNMC publica resolución que afecta peajes/cargos → revisar facturas de los próximos 30 días con la nueva regulación.

### Alertas comerciales (datos CRM)

11. **Cliente sin actividad >60 días**: riesgo churn.
12. **Cliente con >2 incidencias mes**: insatisfacción acumulada, programar llamada gerente.
13. **Renovación próxima sin oferta presentada**: 30 días para vencer, oportunidad sin propuesta → alerta crítica.
14. **Oportunidad estancada en `negociacion` >21 días**: el ciclo medio del sector es 7-14 días en negociación; estancamiento = pérdida.

### Cómo se ejecutan

Una **Edge Function `alerts-engine`** programada cada hora o cada noche que:
- Lee la cache Datadis y aplica reglas 1–7.
- Lee `omie_precios_horarios` y aplica reglas 8–10.
- Lee CRM y aplica reglas 11–14.
- Crea `incidencias` o `notificaciones` según el caso.
- Idempotente: no crea duplicados si la condición persiste.

---

## 7. KPIs estratégicos que faltan en el dashboard

El dashboard actual muestra KPIs operativos (oportunidades por etapa, contratos por vencer, tareas pendientes). Faltan los **KPIs de salud de negocio**:

| KPI | Cómo se calcula | Para quién |
|---|---|---|
| **CAC** (Customer Acquisition Cost) | Coste comercial trimestre / nuevos clientes ganados | Master/manager |
| **LTV** (Lifetime Value) | Comisiones medias por cliente × duración media de relación | Master |
| **NRR** (Net Revenue Retention) | Comisiones renovadas + upsell − churn / comisiones inicio período | Master |
| **Tasa de renovación** | Renovaciones ganadas / renovaciones detectadas | Comercial |
| **% clientes con Datadis activo** | CUPS con `datadis_sincronizado=true` / total CUPS | Operaciones |
| **€ ahorrados al cliente vs fee Valere** | Ahorro acumulado oportunidad ganada / comisión cobrada | Comercial / cliente |
| **Tiempo medio resolución incidencia** | AVG(fecha_resolucion - fecha_apertura) | Operaciones |
| **Errores de factura detectados** | Incidencias tipo `facturacion` resueltas con `importe_recuperado > 0` | **Marketing — argumento de venta** |
| **Margen por kWh gestionado** | Comisiones totales / Σ consumo CUPS gestionados | Master |
| **Distribución cartera por riesgo de churn** | Heatmap por % cumplimiento alertas, días sin contacto, satisfacción | Master |

**El más infrautilizado: "errores de factura detectados con importe recuperado".** Si Valere recupera €100K/año en errores de facturación para sus clientes, esa cifra debería estar en la home del CRM como **trofeo permanente** y en el material comercial. Es el argumento más sólido frente a la competencia.

---

## 8. Workflows operativos que faltan — el "cómo se hace" del sector

Estos son procesos que toda consultora energética hace y que están dispersos en email/Excel:

### 8.1 Petición de oferta a comercializadoras (RFP)

Hoy: el comercial llama/envía email a 3-5 comercializadoras con la curva del cliente y espera ofertas.
Mejor: módulo `RFP` que:
1. Genera un fichero estructurado con perfil del cliente (CUPS, consumo Datadis 12m, potencia, tarifa actual, deseo precio fijo/indexado, plazo).
2. Envía a una lista de contactos comercializadoras (tabla `retailer_contacts`).
3. Recibe ofertas en estructura común (formulario).
4. Comparador automático: por € total/año, por € medio kWh, por riesgo (fijo vs indexado).
5. Genera la propuesta al cliente con la mejor.

**Tiempo ahorrado por oferta:** 4-6 horas en consultoría manual → 30 minutos.

### 8.2 Cambio de comercializadora (switching)

Workflow estándar de 5 pasos:
1. Firma contrato cliente con nueva comercializadora.
2. Solicitud de baja a comercializadora actual (preaviso 15 días).
3. Notificación a distribuidora del cambio (la comercializadora lo hace).
4. Activación del nuevo contrato (~30-45 días desde firma).
5. Verificación primera factura nueva comercializadora.

CRM hoy: nada de esto está modelado. Mejor: tabla `switching_processes` con pasos y fechas.

### 8.3 Carta de autorización Datadis

Hoy: probablemente Juan envía un PDF por email, el cliente lo firma, lo devuelve, Juan lo carga.
Mejor: workflow integrado:
1. Generación PDF auto desde plantilla con datos del cliente (NIF, nombre, CUPS).
2. Envío email con link a firma (Signaturit/DocuSign o subida manual).
3. Recepción PDF firmado → almacenamiento bucket `documentos` con `tipo='autorizacion_datadis'`, `firmado_el=now()`.
4. Validez 1 año — alerta automática 30 días antes de caducidad para renovar.

**Esto es el primer touchpoint con cada cliente nuevo. Profesionalizarlo da imagen sólida desde minuto 1.**

### 8.4 Optimización de potencia contratada

Análisis trimestral automático:
- Curva 4-horaria de potencia consumida (Datadis tiene este dato).
- Compara con potencias contratadas P1-P6.
- Detecta:
  - **Sobre-contratación**: potencia contratada nunca supera 70% del valor → reducir y ahorrar fijo.
  - **Sub-contratación**: hay >X excesos al mes → subir potencia y evitar penalizaciones.
- Genera propuesta de re-tarificación con ahorro estimado.

**Servicio típico que justifica la consultoría:** un cliente con 100 kW contratada que opera a 60 kW puede ahorrar €1.500-3.000/año bajando a 75 kW. Y el comercial lo descubre con un click.

### 8.5 Auditoría inicial automatizada

Cuando se asocia un CUPS a empresa, lanzar automáticamente:
1. Bajar curva Datadis 12m (ya hay infra).
2. Calcular: consumo total, distribución por períodos, perfil base/punta, factor potencia, anomalías.
3. Comparar tarifa actual con simulador de tarifa óptima (existe `core/energia/`).
4. Generar **informe ejecutivo PDF** automático con conclusiones y oportunidades.
5. Asignar a comercial como "Auditoría completada — programa reunión de presentación".

Esto convierte el lead en propuesta sin trabajo manual.

---

## 9. Diferenciación frente a competidores

### 9.1 Lo que Linkener / SegeNet / Ledecom hacen (y Valere debería igualar)

- Validador de facturas (los tres lo tienen).
- Comparador de tarifas con simulador.
- Reporting mensual al cliente.
- Portal cliente con login propio.

### 9.2 Lo que ninguno hace bien (y Valere puede liderar)

- **Datadis nativo y profundo**: ninguno usa Datadis al nivel que Valere tiene infraestructura para hacerlo. La mayoría se queda en facturas escaneadas. **Es el momento de capitalizar el ratio infra/competencia.**
- **Auditoría obligatoria + CAEs + FV en una sola plataforma**: hoy son productos en silos.
- **Branding white-label**: el cliente recibe el reporting "by Valere", pero los competidores ya lo hacen.
- **Integración con contabilidad** (Holded ya está conectado): cuadre facturas comercializadora ↔ asientos cliente. Diferenciador para consultoría a clientes con gestor.
- **Mobile-first**: la mayoría son web-only y mal en móvil. El CFO de la pyme quiere ver el ahorro en el iPhone, no en el portátil.

### 9.3 Lo que solo se hace en el sector enterprise (Schneider, Iberdrola Smart Solutions) y Valere podría democratizar

- **Análisis predictivo** del consumo (forecast 30/60/90 días).
- **Optimización dinámica** (cuándo arrancar el horno industrial según OMIE).
- **Trading de flexibilidad**: vender capacidad de reducir consumo a REE en horas pico.

Estos son productos para grandes consumidores, pero los hay en la cartera de Valere. Vale la pena evaluar piloto con 1-2 clientes industriales.

---

## 10. Estructura de datos faltante — propuesta de schema vertical

Tablas/columnas que un CRM vertical maduro debería tener y que aún no existen:

### Sobre `empresas`
- `auditoria_obligatoria boolean` (RD 56/2016).
- `fecha_proxima_auditoria date`.
- `actividad_cnae text` (clasificación CNAE — afecta a beneficios fiscales energéticos).
- `obligado_csrd boolean`.
- `factor_emisiones_objetivo numeric` (compromisos sostenibilidad).

### Sobre `cups`
- `coordenadas_lat`, `coordenadas_lng` (para mapas, viabilidad FV con PVGIS).
- `superficie_disponible_fv_m2 int`.
- `consumo_anual_kwh numeric` (cache, calculado desde Datadis).
- `factura_media_eur_mes numeric` (cache).
- `tipo_uso text` (industria/oficina/almacén/comercio — afecta a perfil esperado).

### Tablas nuevas

- `tarifas_acceso_vigentes` (peajes y cargos por tarifa por fecha — cache BOE).
- `omie_precios_horarios` (snapshot diario).
- `factor_emisiones_horario` (snapshot REE).
- `comercializadoras_contactos` (catálogo para RFPs).
- `auditorias_energeticas` (workflow obligatoria RD 56/2016).
- `proyectos_fv` (viabilidad + tramitación + seguimiento generación).
- `caes` (certificados ahorro generados/vendidos).
- `comunidades_energeticas` (CER con miembros y reparto).
- `huella_carbono_mensual` (cálculo automatizado por CUPS).
- `validacion_facturas` (resultado del motor de validación).
- `switching_processes` (cambio de comercializadora con pasos).

---

## 11. Roadmap ampliado — sprints sectoriales

Adicionalmente a las FASES 30-33 ya planteadas en la auditoría técnica, propongo:

### FASE 34 — Datos públicos del sector (3-4 días)

- 34.1: Edge Function `sips-lookup` por CUPS (devuelve titular + comercializadora actual + tarifa).
- 34.2: Cron diario que descarga OMIE → tabla `omie_precios_horarios`.
- 34.3: Cron diario que descarga factor emisiones eSIOS → tabla `factor_emisiones_horario`.
- 34.4: Scraper mensual BOE → `tarifas_acceso_vigentes` con alerta admin si cambian.

### FASE 35 — Auditoría inicial automatizada (5 días)

- 35.1: Hook `useAuditoriaCUPS(cups_id)` que lee Datadis 12m, calcula KPIs, evalúa optimización potencia, detecta reactiva, propone tarifa óptima.
- 35.2: Generador PDF informe ejecutivo (reutilizar `src/core/pdf/`).
- 35.3: Workflow: al asociar CUPS → trigger auditoría → asignar tarea comercial "presentar resultados".

### FASE 36 — Validador de facturas profesional (8-10 días)

- 36.1: Subida PDF + extracción texto (Edge Function con LLM).
- 36.2: Motor de reglas (10 reglas listadas en sección 4).
- 36.3: Tabla `validacion_facturas` con diff y estado.
- 36.4: Generador de reclamación pre-rellenada con base legal.
- 36.5: Trigger incidencia auto cuando estado=discrepancia_mayor.

### FASE 37 — Alertas inteligentes (5 días)

- 37.1: Edge Function `alerts-engine` cron horario.
- 37.2: 7 reglas operativas Datadis (sección 6).
- 37.3: 3 reglas mercado (OMIE/BOE).
- 37.4: 4 reglas comerciales.
- 37.5: Configuración por empresa (qué alertas opt-in).

### FASE 38 — Dashboard estratégico ampliado (3 días)

- 38.1: KPIs CAC, LTV, NRR, tasa renovación.
- 38.2: Cifra "€ ahorrados a clientes 12m" con desglose.
- 38.3: Heatmap riesgo churn por cliente.
- 38.4: Vista CUPS-céntrica `/suministros` (master detail).

### FASE 39 — Reporting cliente automatizado (4 días)

- 39.1: Plantilla PDF mensual por cliente (consumo, ahorro, incidencias resueltas, huella carbono).
- 39.2: Cron mensual que genera y envía a `cliente.contactos[es_decisor]`.
- 39.3: Versión accesible en portal cliente (depende de FASE 32.3).

### FASE 40 — Servicios adyacentes (módulos opcionales — sprint largo)

- 40.1: Calculador FV viabilidad con PVGIS + generador propuesta.
- 40.2: Detector oportunidades CAE.
- 40.3: Auditoría obligatoria RD 56/2016 — workflow + recordatorios.
- 40.4: Reporting CSRD/CBAM (cliente premium).
- 40.5: PPA simulator (piloto cliente industrial).

---

## 12. Recomendación estratégica final

Si tuviera que elegir **3 cosas** para los próximos 60 días que máximo cambien la posición competitiva:

1. **Cierra el bucle Datadis**: vincula los 72 CUPS bajados a empresas (FASE 30.6 + 30.7) y aplica auditoría inicial automatizada (FASE 35). Esto convierte la infraestructura técnica que ya existe en valor comercial demostrable. **Coste: 1 sprint. Impacto: muy alto.**

2. **Validador de facturas v0** (FASE 36, simplificado a 3-4 reglas críticas): subida PDF, comparativa con Datadis, detección de errores grandes, plantilla reclamación. No tiene que ser perfecto el día 1; el primer cliente al que recuperas €500 te dura 5 años. **Coste: 1 sprint. Impacto: muy alto en retención.**

3. **Cifra trofeo "€ recuperados a clientes 12m"** en home del CRM y en material comercial (FASE 38.2). Es métrica vanidad pero **vende sola**. Cuando pueda decir "hemos recuperado €X a nuestros clientes este año", la propuesta de venta cambia de "te negocio mejor precio" a "te ahorro y te protejo de tu comercializadora". Gancho narrativo radicalmente distinto.

Estos 3 puntos no requieren tecnología nueva — solo cablear, ampliar y exponer lo que ya hay. El resto del roadmap (FV, CAEs, CSRD, PPA) es expansión de mercado para los siguientes 6-12 meses.

---

## 13. Lo que NO hago en este audit

- **No reproduzco regulación al detalle**. Los importes exactos de IE, IVA, peajes y cargos cambian; el CRM debe consumir BOE en lugar de hardcodearlos.
- **No estimo precios de mercado** para tickets de los servicios. Son rangos típicos del sector pero Valere debe contrastarlos con su pricing real.
- **No hago benchmark detallado** de Linkener/SegeNet/Ledecom — solo referencias generales. Si interesa profundizar, sería un sprint dedicado de inteligencia competitiva.
- **No considero internacionalización** (Portugal MIBEL, Francia, etc.). El producto está claramente focalizado en mercado eléctrico español.

---

## Apéndice A — Catálogo de fuentes públicas españolas

| Fuente | URL/endpoint | Coste | Licencia | Uso CRM |
|---|---|---|---|---|
| Datadis | `datadis.es/api-private` | Gratis con consentimiento | Datos personales (RGPD) | Curva consumo, potencia, reactiva |
| SIPS | Cada distribuidora (UFD, EDistribución, I-DE, etc.) | Gratis | Datos titular CUPS | Auditoría inicial sin facturas |
| OMIE | `omie.es/es/file-download` | Gratis | Datos públicos | Precios spot horarios |
| eSIOS / REE | `api.esios.ree.es` (token gratuito) | Gratis | Datos públicos | Mix energético, factor emisiones |
| BOE | `boe.es/buscar/legislacion.php` | Gratis | Pública | Peajes, cargos, IE, IVA vigentes |
| CNMC | `cnmc.es/sectores/energia` | Gratis | Pública | Resoluciones de mercado |
| RAIPRE | `cne.es/raipre` | Gratis | Pública | Registro instalaciones FV |
| PVGIS (UE) | `re.jrc.ec.europa.eu/api/v5_2` | Gratis | Pública UE | Generación FV estimada por coordenadas |
| OpenStreetMap | Nominatim API | Gratis | ODbL | Geocoding direcciones suministro |
| INE | `ine.es/dyngs/INEbase/es/operacion.htm?...` | Gratis | Pública | CNAE, datos socioeconómicos |
| Catastro | `ovc.catastro.meh.es/ovcservweb` | Gratis | Pública | Verificación inmuebles |

---

## Apéndice B — Glosario sector

- **CUPS**: Código Unificado de Punto de Suministro. Identificador único de un suministro eléctrico. 22 caracteres alfanuméricos.
- **SIPS**: Sistema de Información de Puntos de Suministro. Cada distribuidora mantiene el suyo.
- **Datadis**: Plataforma del Ministerio para Transición Ecológica que agrega datos de las distribuidoras y los pone a disposición del titular.
- **OMIE**: Operador del Mercado Ibérico de Energía. Casa la oferta-demanda diaria.
- **eSIOS**: portal del operador del sistema (REE).
- **REE**: Red Eléctrica de España. Operador del sistema y de la red de transporte.
- **CNMC**: Comisión Nacional de los Mercados y la Competencia. Regulador.
- **PVPC**: Precio Voluntario al Pequeño Consumidor (mercado regulado).
- **Tarifa de acceso**: 2.0TD/3.0TD/6.xTD. Define peajes, cargos y número de períodos.
- **Períodos P1-P6**: franjas horarias con precios distintos. Llano/punta/valle según tarifa.
- **Potencia contratada**: kW que el cliente compromete pagar fijo (≠ potencia consumida).
- **Coeficiente Ke**: multiplicador de penalización por exceso de potencia.
- **Reactiva**: energía que el equipamiento del cliente "devuelve" a la red. Penalizada si cosφ < 0.95.
- **Indexado**: precio energía = OMIE + spread fijo. Riesgo del cliente.
- **Fijo**: precio energía cerrado por contrato. Riesgo de la comercializadora.
- **CAE**: Certificado de Ahorro Energético. RDL 14/2022.
- **CER**: Comunidad Energética Renovable. RD 244/2019.
- **PPA**: Power Purchase Agreement. Contrato bilateral consumidor-productor.
- **CBAM**: Carbon Border Adjustment Mechanism (UE 2026).
- **CSRD**: Corporate Sustainability Reporting Directive (UE).

— Cowork, 1 mayo 2026.
