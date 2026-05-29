# Análisis de formatos reales de tarifas — Comercializadoras Valere

> **Fecha:** 2026-05-27
> **Autor:** Claude (Cowork) — sesión proyecto CRM VALERE
> **Fuente:** carpeta Drive `TARIFAS_VIGENTES` (ID `1vpv28Y4vp9w2UXFAW8TMsbsEoZ35WQGh`), 31 archivos analizados (PDF, XLSX, XLSM).
> **Propósito:** Catalogar la variabilidad real entre formatos de comercializadora, identificar campos críticos no contemplados en el esquema actual, calibrar el prompt Gemini con casos reales y proponer un esquema homologado robusto.
> **Estado:** addendum al `PLAN_MODULO_TARIFAS_PROPUESTAS.md`. Sus conclusiones modifican el alcance de la Fase 1 (modelo de datos).

---

## 0. Conclusión ejecutiva — antes de leer el resto

**El esquema actual de `comercializadora_ofertas` es INSUFICIENTE para capturar la realidad observada.** No es defecto del trabajo previo: es que el módulo nació para la calculadora interna y nunca tuvo que absorber la variedad real del mercado mayorista que Valere recibe a diario.

**Hallazgos críticos:**

1. **Tres unidades distintas de potencia coexisten** en el mercado (€/kW·año, €/kW·día, €/kW·mes). La tabla actual no tiene campo de unidad — todos los precios se guardan asumiendo una misma unidad.
2. **Zonas geográficas múltiples por oferta** (Península, Baleares, Canarias, Ceuta/Melilla, Extra Peninsular). Algunas comercializadoras dan precios distintos por zona dentro del mismo producto.
3. **Vigencias múltiples por producto** (UniEléctrica entrega el mismo producto con dos ventanas de contratación distintas y precios diferentes — "01/06/2026 a 31/05/2027" vs "01/07/2026 a 30/06/2027").
4. **Precios mes a mes para gas** — MET y Energya-VM dan 12 valores por período (uno por mes durante el año).
5. **Descuentos imposibles de normalizar a un campo numérico** — Iberdrola usa texto libre tipo "15% s/Te y Tp (+5% PyS Tier 1 +2% PyS Tier 2)" o "dto 0,02€/Kwh si consumo >40MWh/a".
6. **PyS (Productos y Servicios) son un catálogo paralelo** — Iberdrola tiene una tabla entera de servicios opcionales (Pack Hogar 8.95€/mes, Protección Eléctrica, Asistencia Negocios) que dan descuentos sobre la tarifa y deben modelarse aparte.
7. **Variantes por umbral de potencia P1** dentro de la misma tarifa de acceso — Iberdrola separa "2.0TD_2 (P1≤10kW)" de "2.0TD_3 (P1>10kW)" con precios distintos.
8. **Visalia y otros entregan PDFs imagen** — el extractor de texto plano no funciona; sólo Gemini con visión los lee.
9. **MET entrega multi-producto en un solo archivo** — un Excel = una "campaña" = hasta 56 ofertas distintas (7 productos × 4 accesos × 2 zonas).
10. **Conceptos especializados frecuentes:** Eventual/Temporal (sin impuesto eléctrico), Telemedido/No telemedido (precios distintos), Promocionado/No promocionado, "sin SSAA/CAD" (versión interna no contratable), bono social aparte, IPC anual + revisión por componentes regulados.

**Implicación para el PLAN:**
La migración `extension comercializadora_ofertas` de Fase 1 necesita más columnas de las previstas, y conviene introducir una columna `extension_data jsonb` para capturar la riqueza sin sobrenormalizar. Además surge una nueva tabla `comercializadora_productos_servicios` (PyS) que no estaba contemplada. Detalle en §6.

---

## 1. Inventario de comercializadoras detectadas

De los nombres de archivo y contenido extraído:

| Comercializadora | Archivos | Formato dominante | Notas |
|---|---|---|---|
| **MET Energía** | 4 (Power Península PDF, Power Islas PDF, Gas PDF, Resumen Power+Gas XLSX) | XLSX consolidado + PDFs derivados | El XLSX trae múltiples productos en una sola hoja. Multi-zona explícita. |
| **Iberdrola** | 1 XLSX (862 KB) | Excel monolítico mensual | El más complejo: 50+ productos en una hoja, además de PyS aparte. |
| **Visalia** | 2 PDFs (Electricidad, Gas) | **PDF imagen** | Texto no extraíble. Requiere Gemini con visión. |
| **Endesa (Tempo Open)** | 5 PDFs (Plana, Noche, Laboral, Fin de Semana, Día) | PDF corto por producto | Un archivo = un producto. 5 modalidades. |
| **UniEléctrica** | 2 PDFs (TARIFAS ELECTRICIDAD, TARIFAS GAS) | PDF mensual multi-producto | Edición "MAYO 2026". 12+ productos por PDF con vigencias propias. |
| **Energya-VM (EVM, grupo Naturgy)** | 3 (Calculadora XLSM, Campaña ELEC+GAS PDF, Campaña GAS PDF) | PDF + Calculadora Excel | Diferencia Peninsular vs Extra Peninsular. Gas con M0/M1/M2/M3. |
| **Nexus** | 2 XLSM (Canal Externo Electricidad 14 MB, Canal Externo Gas) | Excel macro-enabled enorme | No leído en detalle (tamaño). Probablemente catálogo completo. |
| **Gana Energía** | 2 PDFs (PYME Precio Mercado, PYME Tramos Horarios) | PDF folleto comercial | Tarifa indexada simple: potencia BOE + margen del comercializador. |
| **ATM / Naturgy** | 2 PDFs (Precios Campaña ATM ELEC+GAS, ATM GAS) | PDF de campaña | Vinculado a Energya-VM. |
| **Genéricos sin marca clara en el nombre** | varios (PRECIOS BASE, Tarifas Resumen, Tarifas marzo 2026, NC-Productos-Captacion, Preciario nagini, ODF Comercial, Tarifas Preciario agentes) | Mezcla | A clasificar manualmente — probablemente refresh de comercializadoras ya listadas. |

**Total estimado de comercializadoras activas:** entre 8 y 12 distintas, con catálogos de productos muy distintos en tamaño (Gana Energía: 1-2 productos; Iberdrola: 50+).

---

## 2. Comercializadora por comercializadora — hallazgos clave

### 2.1 MET Energía

Archivo de referencia: `Resumen Precios Power y Gas_26052026.xlsx`.

**Estructura del documento:**
- 3 hojas: "Precios Power Península", "Precios Gas", "Precios Power Islas".
- Cada hoja del Power tiene:
  - Cabecera con "Fecha de creación" + "Válido hasta" (vigencia explícita).
  - Bloque "Precios Fijos" con N sub-productos: `BASE`, `METROPOLI 1`, `METROPOLI 2`, `METROPOLI 3`.
  - Bloque "Precios Indexados" con M sub-productos: `METRIX 1`, `METRIX 2`, `METRIX 3`.
  - Cada sub-producto × 4 tarifas de acceso (2.0TD, 3.0TD, 6.1TD, 6.2TD).
  - Para cada combinación: P1-P6 energía + P1-P6 potencia + un precio único alternativo "P1-P6" (precio plano).

**Combinatoria total en UNA campaña:**
7 productos (BASE + 3 METROPOLI + 3 METRIX) × 4 accesos × 2 zonas (Península + Islas) = **56 ofertas**. Y eso sólo es la actualización semanal — la siguiente semana llega otra.

**Particularidades:**
- BASE usa €/kW·año para potencia; METROPOLI usa €/kW·día. **Dos unidades coexisten en el mismo archivo.**
- METRIX (indexado) sólo da el "componente Mg" (margen del comercializador) + potencia; el resto se completa con OMIP/OMIE.
- Para Islas hay sub-separación Canarias / Baleares con precios potencialmente distintos.
- Para gas (RL.1 a RL.6, con sub-tramos BAJA/ALTA en RL.5 y RL.6): matriz mes-a-mes durante 12 meses, distinción Telemedidos / No telemedidos, componente fijo + componente MIBGAS aparte.

### 2.2 Iberdrola

Archivo de referencia: `03 03 2026 IBERDROLA Hoja de Precios.xlsx`.

**Estructura del documento:**
- Dos pestañas principales: "Energía" (los planes tarifarios) + "PYS" (productos y servicios complementarios).
- En "Energía": 50+ filas por tarifa de acceso (2.0TD_2, 2.0TD_3, 3.0TD, 6.1TD, 6.2TD, 6.3TD, 6.4TD) + sub-bloque "GAS - RL1 a RL6".
- En "PYS": ~30 servicios con precio €/mes para 4 zonas fiscales (s/i, IVA 21%, IGIC 7%, IPSI 4%).

**Particularidades únicas:**
- **Variantes por umbral de potencia:** "2.0TD_2 P1≤10kW" y "2.0TD_3 P1>10kW" son la misma tarifa de acceso pero con precios y productos distintos.
- **Precios "No Prom." / "Prom."** — Iberdrola tira dos valores por producto (no promocionado y promocionado) cuando aplica descuento; el "Prom." ya incluye el descuento.
- **Descuentos como texto libre** — ejemplos:
  - `"15% s/Te y Tp (+5% PyS Tier 1 +2% PyS Tier 2)"`
  - `"100€ en Mi Iberdrola (+5% PyS Tier 1 +2% PyS Tier 2)"`
  - `"dto 0,02€/Kwh si consumo >40MWh/a"`
  - `"10% / 15% / 20% / 25% / 30% Te"` (escalonado según volumen)
- **DURACION en formato compuesto:** "60m / 12m" significa permanencia 60 meses con renovación de 12. Otros: "120m / 12m", "36m / 12m", "24m". No es un único entero.
- **Flags S/N por columna:** FACTURA ELECT. (obligatoria), ENERGIA VERDE (GdO), CANAL PRESEN.
- **Precio Excedentes** puede ser numérico (0.06, 0.05, 0.03, 0.01) o cadena ("PVPC").
- **Plan OMIE** = tarifa indexada al pool. Plan "Eventual/Temporal (s/IE)" = sin impuesto eléctrico (suministros temporales, ferias, etc.).
- **PyS Tier 1 / Tier 2** = sistema escalonado: contratar servicios opcionales aumenta el descuento aplicable.
- **IVA / IGIC / IPSI** explicitados por zona: 21% (Península y Baleares), 7% (Canarias), 4% (Ceuta y Melilla).
- **Sección "old"** al final del XLSX con valores con `#VALUE!` — son cálculos rotos de versiones anteriores. **Hay que filtrar/ignorar.**

### 2.3 Visalia

Archivos de referencia: `TARIFA VISALIA ELECTRICIDAD.pdf`, `TARIFA VISALIA GAS.pdf`.

**Estructura del documento:**
- PDFs comerciales con identidad gráfica (logo, lema "EL PARTNER ESTRATÉGICO DE TU NEGOCIO").
- **Los precios viven en imágenes/tablas no extraíbles como texto.** El `read_file_content` devolvió únicamente metadata textual ("Comprometidos con la sostenibilidad...") — ningún número.

**Implicación crítica:**
Para Visalia (y previsiblemente otras comercializadoras que entreguen PDFs visuales) el extractor de texto plano de Make NO funciona. **La extracción depende 100% de la capacidad multimodal de Gemini para leer la imagen del PDF.** Esto refuerza la decisión de usar `gemini-2.5-flash-lite` o equivalente con soporte visual, no la IA nativa de Make (que solo procesa texto).

### 2.4 Endesa — Tempo Open

Archivos de referencia: `TEMPO OPEN PLANA.pdf`, `TEMPO OPEN NOCHE.pdf`, `TEMPO OPEN LABORAL.pdf`, `TEMPO OPEN FIN DE SEMANA.pdf`, `TEMPO OPEN DÍA.pdf` (5 PDFs, ~25 KB cada uno).

**Estructura del documento:**
- Un PDF = un producto. Producto = "Tempo Open Plana", "Tempo Open Noche", etc.
- Cada PDF da: P1-P6 potencia + P1-P6 energía + sección "H. Tempo / Resto h." con descuento del 15 % en las horas etiquetadas como "Tempo".
- Tarifa de acceso 3.0TD. Potencia 15.001-30.000 kW.
- Texto MUY rico de condiciones (~5 páginas): IPC anual, revisión por componentes regulados, perfil de consumo (P1=12%, P2=14%, P3=13%, P4=14%, P5=5%, P6=41%), bono social aparte con tarifas por zona, canales de venta válidos, "Documento editado el…".

**Particularidades:**
- **"Hora Tempo" + "Resto h."** es un mecanismo de descuento horario: si el cliente acepta consumir en franjas específicas (variable según modalidad: noche, día, fin de semana, etc.), tiene un 15% de descuento sobre energía en esas horas. **Es un campo opcional adicional a las P1-P6.**
- Bono social explicitado como cargo aparte: "0,019121 €/día" para Península+Baleares con potencia <10kW; valores distintos para Canarias, Ceuta y Melilla.
- Promoción explícita: "Documento editado el 06/05/2026. Oferta válida para contrataciones entre 08/04/2026 y 08/06/2026." — vigencia explícita.

### 2.5 UniEléctrica

Archivos de referencia: `TARIFAS ELECTRICIDAD.pdf`, `TARIFAS GAS.pdf`.

**Estructura del documento:**
- Un PDF = un mes ("Edición: MAYO 2026") con TODOS los productos UniEléctrica para electricidad (o gas).
- Productos detectados en electricidad: `BIO 2026 S21`, `ECO 2026 S21`, `NATUR 2026 S21`, `FLEXIPYME 2026 S21`, `RELAX PLUS S21`, `FLEXIPYME GDOS 2026 S21`, `ACTIVA HOGAR` (con y sin SVE), `ACTIVA` (con y sin SVE), `FLEXIPYME UNICA 2026 S21`, `FLEXIPYME NO COS 2026 S21`, `FLEXIPYME UNICA NO COS 2026 S21`.
- Estructura por producto: P1-P6 potencia + P1-P6 energía + descuento (siempre 0% en este lote — los descuentos ya están aplicados).

**Particularidades únicas:**
- **Etiqueta (A) o (D) explícita** junto a cada bloque de potencia: `(A) €/kW AÑO` o `(D) €/kW DÍA`. **UniEléctrica es la única que escribe la unidad clara.**
- **F.Ini. / F.Fin por fila** — el mismo producto FLEXIPYME aparece con dos vigencias distintas en la misma tabla: "01/06/2026 a 31/05/2027" y "01/07/2026 a 30/06/2027", con precios ligeramente distintos. **Una oferta puede tener múltiples ventanas de contratación con precios distintos.**
- **SVE = Servicio Valor Energético** — servicio opcional que añade 35,88 €/año al precio base. Algunos productos vienen "con SVE" y "sin SVE" como variantes.
- **Productos con tarifa única** (RELAX PLUS, FLEXIPYME UNICA, ACTIVA HOGAR) — todas las P de energía tienen el mismo precio: 0,161382 €/kWh en 2.0TD. **Concepto "precio plano dentro de tarifa TD".**
- **NO COS** — productos sin Coste Operativo del Sistema. Concepto especializado.

### 2.6 Energya-VM (EVM, Naturgy)

Archivo de referencia: `Precios Campaña ATM_ELEC_GAS_EVM_20260511 (1).pdf`.

**Estructura del documento:**
- Producto: "A Tu Medida Electricidad" (y "A Tu Medida Gas").
- Para electricidad:
  - PRECIO FIJO Peninsular 12 meses + 24 meses.
  - PRECIO FIJO Extra Peninsular 12 meses + 24 meses.
  - PRECIO INDEXADO (Fee + Base) por zona.
  - PRECIO FIJO "sin SSAA/CAD" — versión interna informativa.
- Para gas:
  - TÉRMINO FIJO en €/cliente·día por tarifa RL01-RL06.
  - PRECIO INDEXADO con Valor C + Valor D + Valor S por tarifa.
  - PRECIO FIJO con M0, M1, M2, M3 (mes en curso + 3 meses siguientes).
  - Aviso: aplica a suministros sin telemedida; con telemedida = oferta personalizada.

**Particularidades únicas:**
- **Potencia en €/kW/mes** — tercera unidad distinta del mercado (junto a €/kW·año de BASE MET y €/kW·día de METROPOLI MET y €/kW·año/día de Iberdrola).
- **"PRECIO FIJO sin SSAA/CAD"** — versión interna del precio sin servicios de ajuste ni cargo adicional. **NO contratable**. Útil para comparativa interna pero no para propuesta al cliente. El sistema debe poder almacenarla pero marcarla como "no comparable" o "interna".
- **Para gas, los precios "fijos" en realidad son mes a mes** (M0, M1, M2, M3 distintos). Una oferta "fija a 12 meses" puede tener 12 valores distintos, uno por mes.
- **Indexado con C+D+S** — tres componentes en lugar de uno solo.

### 2.7 Gana Energía

Archivos: `Tarifa_PYME_Precio_Mercado.pdf`, `Tarifa_PYME_Tramos_Horarios_Colaborador_Captacion_302.pdf`.

**Estructura del documento:**
- Folleto comercial, 1 página por producto.
- Estructura mínima: potencia P1-P6 + "Energía: A precio de coste" + "Servicio Gana Energía" (margen del comercializador).
- Para 3.0TD/6.1TD probablemente similar.

**Particularidades:**
- **Tarifa indexada pura:** el precio de la energía es el coste real de compra + un único margen ("Servicio Gana Energía" = 0,015 €/kWh con factura electrónica, 0,02 €/kWh si factura en papel).
- **Diferenciación papel/electrónica** — bonificación por elegir factura electrónica.
- **Sin permanencia** explícito.
- **Esquema más simple que el resto** — basta con potencia P1-P6 + un único `margin_per_kwh`.

### 2.8 Nexus

Archivos: `Tarifario Nexus Canal Externo (3).xlsm` (14 MB), `Tarifario Nexus Canal Externo Gas con Easygas.xlsm` (185 KB).

**No leído en detalle por tamaño.** Probable: catálogo entero con macros + datos para todas las combinaciones. Tratar con descarga directa y parseo con `openpyxl` server-side cuando llegue Fase 3. **El sistema debe tolerar Excels macro-enabled (.xlsm) además de .xlsx.**

### 2.9 Otros archivos sin comercializadora clara en el nombre

`PRECIOS BASE ELEC_V.2026.1905-0206_PENINSULA.pdf`, `PRECIOS BASE GAS_V.2026.1905-0206.pdf`, `Tarifas marzo 2026 (1).pdf`, `Tarifas Resumen.pdf`, `NC-Productos-Captacion-PYMES-POT-10kW-20260525-VP.xlsx`, `NC-Productos-Captacion-PYMES-POT-mas-10KW-20260525-VP.xlsx`, `Precios-Residencial-25052026-VP-MAYORISTA.xlsm`, `2601_preciario nagini.xlsx`, `Resumen precios Gas S4225.xlsx`, `Resumen precios Electricidad S4225.xlsx`, `N. Tarifas Preciario ELECTRICIDAD agentes fijoindexado 2026_08.xlsx`, `ODF Comercial_v01826_20260526_08.51.xlsx`, `20260511_Calculadora Energya VM.xlsm`.

**No leídos en detalle.** Conviene en sesión separada que Juan los identifique (de qué comercializadora son) y reorganice/renombre para que el filename incluya el nombre del retailer. **Esta tarea es de NEG-A.**

---

## 3. Patrones detectados cross-comercializadora

### 3.1 Lo que se repite en TODAS (o casi todas)

- Tarifa de acceso (2.0TD / 3.0TD / 6.1TD / 6.2TD / 6.3TD / 6.4TD).
- Hasta 6 períodos (P1-P6) de potencia y energía.
- Vigencia con fecha de inicio (y, a veces, fecha de fin).
- Distinción Península vs zonas insulares/extra-peninsulares.
- Notas sobre componentes regulados, impuestos y bono social.

### 3.2 Lo que se repite en ALGUNAS

- Tarifa indexada con "componente Mg" / Fee / margen del comercializador.
- Modalidades horarias (Tempo Open, etc.).
- Permanencia y renovación.
- Telemedida vs no-telemedida.
- Distinción Promocionado vs No promocionado.

### 3.3 Lo que es ÚNICO de UNA comercializadora

- Iberdrola: PyS Tier 1/2 + variantes por umbral de potencia P1.
- UniEléctrica: F.Ini / F.Fin por fila + SVE.
- Energya-VM: "sin SSAA/CAD" + valores mes a mes para gas.
- MET: precio único alternativo P1-P6.
- Gana Energía: tarifa "a precio de coste".
- Endesa: hora Tempo / resto h.

### 3.4 Unidades inconsistentes

| Comercializadora | Unidad potencia |
|---|---|
| BASE MET, UniEléctrica (A) | €/kW·año |
| METROPOLI MET, Iberdrola, UniEléctrica (D) | €/kW·día |
| Energya-VM | €/kW·mes |
| BOE peajes (común) | €/kW·año |

**Implicación:** la columna debe poder almacenar cualquier unidad + indicar cuál es, o normalizar todo a una sola unidad en la ingesta (mi recomendación: normalizar a €/kW·día en BD, conservar la unidad original como metadato).

### 3.5 Vigencias inconsistentes

| Patrón | Comercializadoras |
|---|---|
| Vigencia única explícita (fecha creación + válido hasta) | MET, Endesa Tempo Open |
| Vigencia múltiple por fila | UniÉlectrica FLEXIPYME |
| Vigencia mes a mes | MET gas, EVM gas |
| Vigencia implícita (sólo "Edición MAYO 2026") | UniÉlectrica |
| Sin vigencia visible | Visalia (en metadata), Gana Energía |

**Implicación:** el modelo necesita `valid_from` + `valid_to` opcionales como base, con extensión a una sub-tabla `tariff_period_prices` para casos mes-a-mes.

### 3.6 Descuentos: el caso más espinoso

Iberdrola es el campeón de la complejidad. Pero también MET con METROPOLI 1/2/3 y METRIX 1/2/3 es complejo (las variantes son escalones de descuento). UniÉlectrica los aplica "ya incluidos en el precio".

**Tres posibles modelos:**

- (a) Descuento como texto libre (`discount_description`). Pros: capta todo. Contras: no comparable.
- (b) Descuento estructurado (`discount_pct_energy`, `discount_pct_power`, `discount_per_kwh`, `discount_fixed_eur_year`, `discount_conditions`). Pros: parcialmente comparable. Contras: no captura escalonados ni "PyS Tier".
- (c) Modelo híbrido: campos estructurados básicos + JSONB para casos complejos + texto libre para mostrar al cliente.

**Recomendación: modelo (c).** El comparador del MVP usa los campos estructurados; los casos complejos se ven en la propuesta como texto descriptivo. Mejorar con el tiempo.

---

## 4. Casos especiales detectados

### 4.1 Conceptos que el esquema actual NO contempla

| Concepto | Aparece en | Modelado actual | Propuesta |
|---|---|---|---|
| Unidad de potencia (año/día/mes) | TODAS | No existe | Nueva columna `power_unit` |
| Zona geográfica | MET, EVM | No existe | Nueva columna `zones` (text[]) |
| Tipo de tarifa (fixed/indexed/mixed) | TODAS | Sólo `surplus_model` parcial | Nueva columna `pricing_type` |
| Componente Mg / Fee para indexada | MET METRIX, EVM, Gana | No existe | Nueva columna `index_margin_per_kwh` |
| Variante por umbral de potencia P1 | Iberdrola | No existe | Nueva columna `power_p1_threshold` |
| Múltiples vigencias por producto | UniÉlectrica | No existe | Sub-tabla `oferta_vigencias` |
| Precios mes a mes (gas) | MET, EVM | No existe | Sub-tabla `oferta_precios_mensuales` |
| Hora Tempo / Resto h. | Endesa | No existe | Campos `tempo_hours_discount_pct` + `tempo_hours_schedule` |
| Promocionado vs No promocionado | Iberdrola | No existe | Dos filas (preferible) o campos `promo_*` adicionales |
| Telemedida (S/N/ambos) | MET, EVM | No existe | Nueva columna `telemedida` |
| Sin impuesto eléctrico (Eventual/Temporal) | Iberdrola | No existe | Nueva columna `exempt_electricity_tax` |
| Sin SSAA/CAD (versión interna no contratable) | EVM | No existe | Nueva columna `contractable` (bool) |
| Servicios obligatorios incluidos | Iberdrola, Endesa | No existe | Sub-tabla `oferta_servicios_requeridos` |
| Productos y Servicios opcionales (PyS) | Iberdrola | No existe | **Nueva tabla `comercializadora_productos_servicios`** |
| Permanencia + renovación compuesta | Iberdrola | Sólo `min_contract_months` | Nuevo campo `auto_renewal_months` |
| Energía verde (GdO) | Iberdrola | No existe | Nueva columna `green_energy_gdo` (bool) |
| Canal de venta | Iberdrola | No existe | Nueva columna `sales_channels` (text[]) |
| IPC + componentes regulados | Endesa, todas | No existe | Nueva columna `price_revision_terms` (text) |
| Bono social explícito por zona | Endesa | No existe | Sub-tabla `comercializadora_bono_social` (opcional) |

### 4.2 Conceptos que el esquema actual SÍ contempla pero hay que renombrar/aclarar

| Campo actual | Problema | Propuesta |
|---|---|---|
| `energy_prices numeric[]` | Sin unidad indicada (siempre €/kWh — OK) | Mantener |
| `power_prices numeric[]` | Sin unidad indicada (mezcla €/kW·año, €/kW·día, €/kW·mes) | Añadir `power_unit` |
| `surplus_model text` | Solo cubre excedentes; no cubre indexado | Mantener para excedentes; añadir `pricing_type` |
| `surplus_price_per_kwh numeric` | OK | Mantener |
| Varios `*_fee_*` | OK pero incompletos | Mantener; añadir según hallazgos |
| `min_contract_months int` | Falta renovación | Añadir `auto_renewal_months` |

---

## 5. Esquema homologado propuesto

### 5.1 Filosofía

- **Mantener `comercializadora_ofertas`** como tabla principal sin romper el código actual.
- **Añadir columnas** para los campos comunes nuevos (unidad, zona, tipo, etc.).
- **Añadir columna `extension_data jsonb`** para variabilidad no estructurable que el comparador puede ignorar y que la propuesta usa textualmente.
- **Crear sub-tablas mínimas** sólo donde la cardinalidad lo justifica (PyS, precios mensuales gas, vigencias múltiples).
- **Diferir** lo que no entra en MVP (bono social granular, servicios obligatorios, escalado de descuentos).

### 5.2 `comercializadora_ofertas` extendida — columnas nuevas (a añadir en Fase 1)

```sql
-- ── Identidad y tipo de tarifa ──────────────────────────────────────────────
add column if not exists pricing_type text
  check (pricing_type in ('fixed','indexed','mixed','pvpc','fixed_temporary'))
  default 'fixed';

add column if not exists index_margin_per_kwh numeric;       -- margen Mg / fee tarifa indexada
add column if not exists power_unit text
  check (power_unit in ('eur_kw_year','eur_kw_day','eur_kw_month'))
  default 'eur_kw_year';

-- ── Vigencia ya prevista en el PLAN, recordada aquí ─────────────────────────
-- add column if not exists valid_from date;
-- add column if not exists valid_to   date;
-- add column if not exists status     text;
-- add column if not exists version    int;
-- add column if not exists superseded_by uuid references comercializadora_ofertas(id);

-- ── Zona geográfica ─────────────────────────────────────────────────────────
add column if not exists zones text[] default array['peninsula'];
-- Valores válidos: 'peninsula','baleares','canarias','ceuta_melilla','extra_peninsular'

-- ── Umbral por sub-variante de tarifa ───────────────────────────────────────
add column if not exists power_p1_threshold_kw numeric;       -- 10 para "2.0TD_2 P1≤10kW"
add column if not exists power_p1_threshold_op text
  check (power_p1_threshold_op in ('lte','gt'));               -- 'lte' o 'gt'

-- ── Características del producto ────────────────────────────────────────────
add column if not exists telemedida text
  check (telemedida in ('telemedido','no_telemedido','ambos'))
  default 'ambos';
add column if not exists exempt_electricity_tax bool default false;
add column if not exists contractable bool default true;
add column if not exists green_energy_gdo bool default false;
add column if not exists sales_channels text[];                -- ['app','web','telefono','presencial']
add column if not exists requires_electronic_invoice bool default false;
add column if not exists auto_renewal_months int;              -- renovación tras permanencia
add column if not exists tempo_hours_discount_pct numeric;     -- p.ej. 15
add column if not exists tempo_hours_description text;         -- "todas las horas Tempo" (Endesa)
add column if not exists price_revision_terms text;            -- "IPC anual + componentes regulados"

-- ── Descuentos ──────────────────────────────────────────────────────────────
add column if not exists discount_description text;            -- texto libre
add column if not exists discount_pct_energy   numeric;
add column if not exists discount_pct_power    numeric;
add column if not exists discount_fixed_eur_year numeric;

-- ── Trazabilidad de promoción ───────────────────────────────────────────────
add column if not exists is_promotional bool default false;
add column if not exists non_promotional_oferta_id uuid references comercializadora_ofertas(id);

-- ── Extensión para variabilidad no estructurable ────────────────────────────
add column if not exists extension_data jsonb;
-- Contenedor flexible para campos raros: "PyS Tier 1/2", "M0/M1/M2/M3 gas",
-- "perfil consumo P1=12%/...", "10%/15%/20%/25%/30% Te escalonado", etc.
```

### 5.3 Nueva tabla `comercializadora_productos_servicios` (PyS)

Para los servicios opcionales tipo "Pack Iberdrola Hogar", "Asistencia Eléctrica Negocios", etc.

```sql
create table if not exists public.comercializadora_productos_servicios (
  id                       uuid primary key default gen_random_uuid(),
  comercializadora_id      uuid not null references public.comercializadoras(id),
  nombre                   text not null,
  tipo                     text check (tipo in ('asistencia','seguro','mantenimiento','digital','solar','aerotermia','movilidad','otros')),
  precio_mes_eur           numeric,
  precio_mes_eur_con_iva   numeric,
  precio_mes_eur_con_igic  numeric,
  precio_mes_eur_con_ipsi  numeric,
  cliente_objetivo         text,              -- 'residencial','pymes','autonomos','comunidades_propietarios'
  promocion                text,              -- "3 meses gratis", "2 meses al 50%"
  descuento_tier           int,               -- 1 o 2 (PyS Tier 1 / 2 en Iberdrola)
  valid_from               date,
  valid_to                 date,
  status                   text default 'published' check (status in ('published','superseded','draft')),
  source_document_id       uuid references public.tariff_documents(id),
  notes                    text,
  created_at               timestamptz default now()
);
```

### 5.4 Nueva sub-tabla `oferta_precios_mensuales` (gas)

Sólo cuando el producto tiene precios mes a mes (MET gas, EVM gas).

```sql
create table if not exists public.oferta_precios_mensuales (
  id            uuid primary key default gen_random_uuid(),
  oferta_id     uuid not null references public.comercializadora_ofertas(id) on delete cascade,
  mes_yyyy_mm   text not null,                 -- "2026-05", "2026-06", ...
  precio_energia_kwh numeric,                  -- precio del mes
  componente    text,                          -- "PRECIO FIJO", "MIBGAS", "Componente Mg"
  notes         text,
  unique (oferta_id, mes_yyyy_mm, componente)
);
```

### 5.5 Decisiones sobre lo que NO se crea (todavía)

- **Sub-tabla de vigencias múltiples por producto**: deferred. Modelar las dos vigencias de FLEXIPYME como **dos ofertas independientes** linkadas por `extension_data.product_family = 'FLEXIPYME 2026 S21'`. Simplifica el comparador.
- **Modelo granular de escalado de descuentos (10%/15%/20%/25%/30% Te según volumen)**: deferred a `extension_data`. El comparador usa el descuento medio o el de la franja del cliente.
- **Bono social por zona en tabla aparte**: deferred. Se modela como `extension_data.bono_social_eur_dia_by_zone`.
- **Curva de perfil de consumo (P1=12%, P2=14%, ...)**: deferred. Sólo se usa al validar y mostrar al cliente; no en el comparador.

---

## 6. Implicaciones para el PLAN

### 6.1 Cambios en Fase 1 (modelo de datos)

**La migración `20260528_modulo_tarifas_extension_ofertas.sql`** del PLAN original (§3.1 de PLAN) **debe ampliarse** con todas las columnas de §5.2 de este análisis. No es un "ADD una columna" — son **~25 columnas nuevas**.

**Nueva migración añadida:**
- `20260528_modulo_tarifas_productos_servicios.sql` — tabla PyS (§5.3).
- `20260528_modulo_tarifas_precios_mensuales.sql` — sub-tabla gas mes a mes (§5.4).

**Total de migraciones de Fase 1 actualizado:** 8 (en lugar de 6 previstas).

### 6.2 Cambios en Fase 3 (extracción IA)

**El prompt Gemini debe cubrir todos los casos descubiertos.** Borrador inicial calibrado con los formatos reales en §7.

**El catálogo de productos canónicos (NEG-A) debe ampliarse para incluir:**
- Productos detectados por comercializadora (ver §2 — mínimo 30 productos comunes para MET, Iberdrola, UniEléctrica, EVM, Endesa, Gana, Visalia).
- Sub-categorías necesarias (BASE/METRÓPOLI/METRIX para MET; Plan Estable/Plan Especial/Plan OMIE/etc. para Iberdrola).
- Sinónimos por producto (alias que distintos colaboradores usan).

**Decisión añadida: Gemini debe extraer un "score de extracción"** por campo:
- `power_p1_value: { value: 27.704413, confidence: 1.0, source: "Tabla Potencia BASE 2.0TD" }`.
- Esto permite al comercial ver qué confiar y qué revisar.

### 6.3 Cambios en Fase 4 (versionado)

**El RPC `publish_oferta_with_versioning`** del PLAN original (§6.1) **necesita revisar el casteo JSONB → numeric[].** ChatGPT lo señaló: `(p_payload->>'energy_prices')::jsonb::numeric[]` puede fallar. La forma correcta es:

```sql
select array_agg((value)::numeric order by ord)
  into v_energy_prices
  from jsonb_array_elements_text(p_payload->'energy_prices') with ordinality as t(value, ord);
```

Adicionalmente, dado que ahora hay sub-tablas (`oferta_precios_mensuales`, `comercializadora_productos_servicios`), el RPC debe gestionar la copia de esas sub-relaciones cuando publica una versión nueva.

### 6.4 Cambios en Fase 5 (PDF propuesta)

La plantilla debe acomodar:
- Distintas unidades de potencia (mostrar en €/kW·año normalizado al cliente, aunque la BD lo tenga en €/kW·día).
- Indicador visual de tipo de tarifa (fija / indexada / mixta).
- Notas de zona si la comparativa cruza zonas.
- PyS recomendados si el cliente los puede contratar.

---

## 7. Borrador de prompt Gemini calibrado con casos reales

```text
Eres un experto en tarifas eléctricas y de gas del mercado español.

TAREA
Extrae la información estructurada de la tarifa contenida en el documento
adjunto (PDF, Excel o texto de email). Devuelve un JSON con el schema
descrito abajo. Si un campo no aparece en el documento, ponlo a null —
NUNCA inventes valores.

CONTEXTO
- Comercializadoras conocidas en nuestro sistema:
  [lista dinámica desde tabla `comercializadoras`]
- Productos canónicos por comercializadora:
  [lista dinámica desde catálogo NEG-A]
- Si el documento contiene MÚLTIPLES productos / múltiples tarifas de
  acceso / múltiples zonas, devuelve un ARRAY de objetos en `ofertas`,
  uno por cada combinación contratable.

REGLAS DE NORMALIZACIÓN
- Si la potencia está en €/kW·año, devuelve `power_unit: "eur_kw_year"`.
- Si está en €/kW·día, devuelve `power_unit: "eur_kw_day"`.
- Si está en €/kW·mes, devuelve `power_unit: "eur_kw_month"`.
- Para tarifas indexadas: si sólo aparece un margen / fee / "componente
  Mg", llénalo en `index_margin_per_kwh` y deja `energy_prices` a null.
- Si el documento dice "PRECIOS CON DESCUENTOS YA APLICADOS",
  marca `discount_pct_*` a 0 y describe el descuento original en
  `discount_description` para trazabilidad.
- Zona: deduce de cabeceras ("PENINSULA", "ISLAS", "CANARIAS", "BALEARES",
  "EXTRA PENINSULAR", "CEUTA Y MELILLA"). Si no se menciona, asume
  ["peninsula"].
- Si el documento dice "sin SSAA/CAD" o "no contratable", marca
  `contractable: false`.
- Si el producto separa Promocionado / No promocionado, devuelve DOS
  ofertas separadas, marcando `is_promotional: true` en una y enlazando
  con `non_promotional_product_name`.
- Si el producto tiene múltiples vigencias (F.Ini/F.Fin), devuelve UNA
  oferta por vigencia.
- Para gas con precios mes a mes (M0/M1/M2/M3), llena `monthly_prices`
  con un array de {mes: "YYYY-MM", precio_energia_kwh, componente}.

SCHEMA DEL OUTPUT
{
  "comercializadora": {
    "name": "MET Energía",
    "match_to_existing_id": "uuid o null"
  },
  "documento": {
    "valid_from": "YYYY-MM-DD",
    "valid_to":   "YYYY-MM-DD",
    "notes":      "Texto adicional relevante"
  },
  "ofertas": [
    {
      "product_name": "BASE",
      "product_canonical_id": "uuid del catálogo o null si nuevo",
      "access_rate": "2.0TD",
      "pricing_type": "fixed",
      "zones": ["peninsula"],
      "telemedida": "ambos",
      "power_unit": "eur_kw_year",
      "power_prices": [27.704413, 0.725423, null, null, null, null],
      "energy_prices": [0.263771, 0.174347, 0.14021, null, null, null],
      "index_margin_per_kwh": null,
      "power_p1_threshold_kw": null,
      "power_p1_threshold_op": null,
      "discount_description": null,
      "discount_pct_energy": 0,
      "discount_pct_power": 0,
      "is_promotional": false,
      "contractable": true,
      "green_energy_gdo": false,
      "requires_electronic_invoice": false,
      "tempo_hours_discount_pct": null,
      "min_contract_months": 12,
      "auto_renewal_months": 12,
      "exempt_electricity_tax": false,
      "sales_channels": null,
      "price_revision_terms": "IPC anual + componentes regulados",
      "monthly_prices": null,
      "extension_data": {
        "raw_label_in_document": "BASE 2.0TD Península Precios Fijos",
        "perfil_consumo": null,
        "bono_social_eur_dia_by_zone": null
      },
      "confidence_score": 0.95
    }
  ],
  "productos_servicios": [],
  "extraction_warnings": [
    "Documento tiene texto OCR de baja calidad en página 3"
  ]
}

LÍMITES Y FALLBACK
- Si NO puedes identificar la comercializadora con confianza ≥ 0.7,
  devuelve confidence_score < 0.4 y proposed_action = "reject".
- Si encuentras conceptos que NO encajan en el schema, ponlos en
  `extension_data` con clave descriptiva.
- Si el documento es una imagen sin OCR fiable, marca extraction_warnings
  y baja confidence_score.
```

---

## 8. Próximos pasos derivados del análisis

### 8.1 Acciones inmediatas para Juan (NEG-A ampliado)

1. **Reorganizar la carpeta Drive**: renombrar los archivos genéricos (`Tarifas Resumen.pdf`, `Tarifas marzo 2026.pdf`, etc.) para que el nombre incluya la comercializadora. Esto acelera la extracción y reduce errores de match.
2. **Cerrar el catálogo de productos canónicos** por comercializadora. Estructura recomendada:
   - 1 comercializadora → N familias de producto → M variantes (zona, vigencia, umbral, promoción).
3. **Confirmar el manejo de Visalia**: ¿hay otro canal alternativo (CRM de Visalia, Excel descargable) o nos quedamos con el PDF imagen y dependemos de Gemini visual?
4. **Subir 2-3 ejemplos de email con tarifa en el cuerpo** (no encontrado en la carpeta hoy — sólo PDFs y Excels). Sin ejemplos reales, el prompt para procesar cuerpo de email no se calibra.

### 8.2 Actualización del PLAN (a aplicar en el commit del Bloque 1)

- Sección 3 del PLAN: ampliar la migración de extensión con las ~25 columnas nuevas de §5.2 de este análisis.
- Sección 3 del PLAN: añadir migraciones de PyS (§5.3) y precios mensuales gas (§5.4) como prerrequisitos de Fase 3.
- Sección 6 del PLAN: revisar el RPC `publish_oferta_with_versioning` para corregir el casteo JSONB y para gestionar las sub-tablas nuevas.
- Sección 9 del PLAN: el primer commit mínimo recomendado se amplía: pasa de 6 migraciones a **8 migraciones** + este documento de análisis + ANALISIS_FORMATOS_TARIFAS.md.

### 8.3 Acción sobre el escenario Make existente

El filtro actual de Make (`extension PDF/XLSX/XLS/CSV + type=attachment`) es correcto **pero hay que ampliarlo** para incluir `.xlsm` (Excel macro-enabled, formato de Nexus y Energya-VM). En Make:
- Cambiar el regex `\.(pdf|xlsx|xls|csv)$` a `\.(pdf|xlsx|xlsm|xls|csv)$`.

---

**Fin del documento.**
