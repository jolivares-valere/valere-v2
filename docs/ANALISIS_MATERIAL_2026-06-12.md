# Análisis del material aportado por Juan — 2026-06-12

Cuatro entradas que desbloquean Fases 2, 4, 5 y 6. Resumen para las próximas sesiones de código.

## 1. Diseño de propuesta (Fase 2 — PDF) — DESBLOQUEADO

Fuente: chat "Valere Consultores", presentación `Propuesta_Montetabor_EVM_v3` (Drive) + PDFs AUDAX y pptx GRUPO_VERTICE. **Estructura canónica de 5 secciones** que la plantilla HTML→PDF debe reproducir:

1. **Portada** — "ESTUDIO DE OPTIMIZACIÓN ENERGÉTICA", titular, tarifa, comercializadora + campaña + mes, "VALERE CONSULTORES".
2. **Resumen del punto de suministro** — titular+CIF, CUPS+tarifa, consumo anual, actividad (CNAE), dirección.
3. **Perfil de carga y pesos energéticos** — kWh por periodo P1-P6 + frase destacando el periodo dominante (ej. "P6 concentra el 44,3%").
4. **Matriz de precios (€/kWh)** — tabla periodo × (consumo kWh/año, contrato actual, propuesta N meses) con código de color: verde = mejora, rojo = empeora respecto al actual.
5. **Impacto financiero anual** — desglose Energía / Potencia / TOTAL para actual vs propuesta, y línea de ahorro o sobrecoste destacada.
6. **Conclusiones y dictamen** — texto comercial con contexto de mercado.

Pie corporativo en todas: `VALERE CONSULTORES ASOCIADOS S.L. · C/Astronomía S/N, Torre 4, Planta 1, Puerta 3 · 41015 Sevilla`.

**Decisión técnica para Fase 2**: plantilla HTML+CSS con esa estructura → render a PDF en Edge Function. Los datos ya los tiene el motor (`comparison_results` de la propuesta). Falta el campo "contrato actual €/kWh por periodo" — ya se captura en facturas/CUPS.

## 2. SIPS — TRES formatos distintos (Fase 4 — importador)

Juan confirma: el SIPS se descarga de **muchas fuentes** (comercializadoras, cada distribuidora, Datadis, plataformas de contadores) y **cada una presenta los mismos datos distinto**. El importador debe **detectar el formato y mapear**, no asumir uno. Ejemplos reales recibidos:

**A. SIPS distribuidora (tabla .xls disfrazada de HTML)** — `Tabla_8-6-2026...zip`:
- Es un `<table>` HTML con extensión .xls. ~85 columnas oficiales SIPS.
- Campos clave: `Codigo CUPS`, `Tarifa` (ej "3.0TD ML"), `Consumo Anual`, `Consumo Anual P1..P6`, `Potencias Contratadas En W P1..P6` (¡en W, dividir /1000 para kW!), `Fecha Ultimo Cambio Comercializador`, `CNAE`, `Codigo Telemedida`, `Codigo Autoconsumo`, dirección completa.

**B. RPS.xlsx (estructurado por hojas)**:
- Hoja "Datos suministro": pares clave-valor (CUPS, distribuidora, tarifa 6.2TD...).
- Hoja "Consumos": "CONSUMO ANUAL: 1.84M" + fila `P1..P6` con kWh y otra con %.
- Formato legible por humanos, requiere parser distinto al A.

**C. Curva cuartohoraria de telemedida (.csv ; separado)** — `CURVA CARGA...TLM.csv`:
- Cabecera: `CUPS;TIPO MEDIDA;FECHA-HORA;INV/VER;CONSUMO kWh;...;GENERACION kWh;...REACTIVA Q1-Q4...METODO OBT.;FIRMEZA`.
- 1 fila por hora (en este caso horaria, no QH real pese al nombre). Sirve para reconstruir curva de carga y agregados P1-P6.
- Es el dato MÁS rico (permite perfil real, no estimado).

**Diseño importador (Fase 4)**: detector por firma de cabecera → 3+ parsers (`sips_distribuidora`, `sips_rps`, `curva_telemedida`) → normalizador común → upsert `cups` + `facturas(origen=...)`. La tabla `excel_import_templates` (vacía) sirve para guardar mapeos por fuente.

## 3. Telemedida directa (Fase 6) — viable con estos datos

El CSV de telemedida (formato estándar español, protocolo IEC tras la pasarela) confirma que **podéis trabajar con descargas de las plataformas de contadores sin tocar IEC-102 directamente**. Es la opción (a) del análisis estratégico: la plataforma del proveedor ya exporta CSV → conector ligero que lo ingiere. Pendiente: Juan pasará datos de las plataformas de telemedida de clientes concretos para validar marca/modelo y formato exacto de export.

## 4. GoodWe SEMS / FusionSolar — problema de cookies (Fase 5)

Juan: solo **cuenta de usuario final** (no organización) en SEMS y FusionSolar. El bloqueo de cookies que ya sufrís con FusionSolar es el reto central.

**Hallazgo clave**: la OpenAPI Northbound de FusionSolar y la OpenAPI de GoodWe SEMS **requieren cuenta de organización/instalador** (no la de usuario final). Con cuenta de usuario final, las opciones son:
- **Solicitar acceso Northbound/OpenAPI** al instalador o a Huawei/GoodWe (lo correcto y estable a medio plazo).
- **Scraping autenticado del portal** (lo que estáis haciendo): frágil por las cookies/captcha. Para que no se bloquee hay que: persistir la sesión (cookies + token de login) entre ejecuciones, aceptar el banner de cookies una vez y reutilizar ese storage state, y espaciar las peticiones para no disparar el rate-limit (FusionSolar limita a 1 sesión de login activa). El módulo `fv_credenciales` + el sync con Playwright ya existen — el fix es de gestión de sesión, no de arquitectura.

**Recomendación**: documentar y, en paralelo, pedir las credenciales Northbound al instalador. Lo abordo en detalle en la Fase 5 con los datos concretos que pase Juan.

## Prioridad actualizada
Fase 2 (PDF) ahora está desbloqueada → es lo siguiente tras mergear Fase 1. Fase 4 (SIPS) tiene los 3 formatos. Fase 5/6 esperan datos concretos de plataformas/instalador.
