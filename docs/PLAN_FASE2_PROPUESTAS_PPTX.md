# Plan Fase 2 — Generación de propuestas PPTX desde el CRM

> 2026-06-12 · Decisión Juan: máxima integración y usabilidad futura.
> Basado en el sistema YA EXISTENTE de "COMPARATIVAS Y PROPUESTAS CLIENTES":
> `PLANTILLA_PRESENTACION_GENERADOR.js` (pptxgenjs, 270 líneas, caso LOWFIT validado),
> `PLANTEAMIENTO_PLANTILLA_MAESTRA_VALERE.md` y `PLANTILLA_PRESENTACION_INSTRUCCIONES.md`.

## Principio: no reinventar, integrar

El equipo ya tiene un generador profesional con la identidad Valere, 14 slides, reglas de
fee/SSAA/GDO/Endesa-P6 consolidadas y un modelo de datos `cliente.json`. El planteamiento
maestro (§4) ya prevé que **"el mismo JSON sirve para el generador PPTX y mañana para el CRM"**.
La Fase 2 hace realidad ese "mañana".

## Arquitectura elegida (la más profesional / mejor futuro)

```
CRM (/analisis con propuesta guardada)
  └─ construye y valida cliente.json desde sus tablas
       (empresa, puntos[cups+tarifa+kwh[6]+potencias[6]+fv], opciones[], modulos{}, fee interno)
       ↓
  └─ Edge Function `generar-propuesta-pptx` (Deno + pptxgenjs)
       = PORT 1:1 del PLANTILLA_PRESENTACION_GENERADOR.js, parametrizado por cliente.json
       ↓
  └─ Devuelve .pptx → se guarda en Storage (bucket `propuestas`) y en proposals.pptx_url
       ↓
  └─ Botón "Generar propuesta PPTX" en /analisis y en la ficha de propuesta → descarga
```

### Por qué Edge Function y no exportar JSON manual
- Un solo clic para el analista (cierra el circuito de la auditoría: factura→análisis→PDF/PPTX→envío).
- `pptxgenjs` corre en Deno → la Edge Function puede generarlo server-side sin tocar el navegador.
- **Una sola fuente del generador**: el repo del CRM pasa a ser dueño del código del generador;
  la carpeta de comparativas consume la misma lógica. Se versiona y testea (no dos copias divergentes).

## Contrato de datos `cliente.json` (fuente única)

Extiende el del PLANTEAMIENTO §4. El CRM lo rellena así:
- `cliente`: de `empresas` (+ contacto decisor de `contactos`).
- `puntos[]`: de `cups` (cups, tarifa, potencias[6], fv{}) + agregado de `facturas` → kwh[6] por periodo.
- `opciones[]`: del resultado de `calculateSimulatedInvoice` por cada `comercializadora_ofertas`.
- `ranking` / `P30` / `P61`: precios FINALES (base + fee ya integrado) — el fee NUNCA viaja al JSON de salida.
- `modulos{}`: flags del cuestionario (§8 del planteamiento) — ssaa, multi, fv, potencias, competencia, indexado, faq.
- `salida`: formato (pptx por defecto), nombre de archivo.

## Reglas que el generador del CRM DEBE respetar (de INSTRUCCIONES §4)
1. **Fee invisible**: precios siempre finales. QA automático: el contenido del PPTX no contiene "fee|margen|comisión" (test en CI).
2. **SSAA**: redacción por tipo (incluidos con cap 12,39 / no incluidos doble fila / sin cap declarado).
3. **GDO**: sin garantía de origen por defecto.
4. **€/MWh**: doble columna (energía ponderada + total con potencia).
5. **Endesa**: tramo de precio por potencia P6; modalidades horarias mapeadas.
6. **Identidad visual**: azul 1A2B5F, verde 2D6A2D, Calibri, footer corporativo, logo (subir a Storage).
7. **3.0TD = 6 periodos de potencia** (corregido 2026-06-12 en CRM y en doc plantilla).

## Pasos de implementación (sub-sprints F2)
- **F2.1** Tipar `ClienteJson` en `src/core/types/` + builder `buildClienteJson(propuesta)` con tests.
- **F2.2** Bucket Storage `propuestas` (RLS por comercial) + columna `proposals.pptx_url` (ya existe el campo pdf_url; añadir pptx_url o reutilizar).
- **F2.3** Edge Function `generar-propuesta-pptx`: port del generador, recibe cliente.json, devuelve pptx, sube a Storage.
- **F2.4** Botón en `/analisis` (tras guardar propuesta) y en ficha de propuesta → invoca EF → descarga.
- **F2.5** QA automatizado: test que abre el pptx generado y verifica fee=0, totales cuadran, validez visible.
- **F2.6** Validación con 2 casos reales (LOWFIT multipunto 3.0TD+6.1TD; uno monopunto simple) comparando con lo ya entregado.

## Dependencias / pendientes
- Subir el logo `Valere&Vitaly_300ppp_Logotipo_rrss_2.png` al bucket (la ruta del JS es local).
- Confirmar con Juan el cuestionario (§8): ¿se rellena en una pantalla del CRM o se infiere de los datos? (propongo: inferir lo posible, preguntar solo lo ambiguo — mismo patrón que ya usamos).
- DOCX como salida secundaria (bajo petición) — F2 posterior, mismo cliente.json.

## Estado actual confirmado en repo
- `proposals` ya tiene `pdf_url` (sin uso) → añadir `pptx_url`.
- `/analisis` ya guarda propuesta con `comparison_results` (insumo del ranking/matrices).
- Falta: capturar el "precio actual por periodo" del cliente para la columna "Contrato actual" de las matrices (está en facturas/cups parcialmente).
