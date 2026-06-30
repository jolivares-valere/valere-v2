# DISEÑO BASE — PROPUESTA COMERCIAL VALERE (especificación definitiva)

> v1.0 · 2026-06-12 · Verificado contra el ÚLTIMO PDF enviado (`Propuesta_LOWFIT_Valere_Jun2026.pdf`, 14 pág.)
> y su generador `PLANTILLA_PRESENTACION_GENERADOR.js`. **Ambos coinciden al 100%** — el .js es la fuente vigente.
> Esta es la referencia única de diseño: la usan tanto las propuestas manuales como el generador del CRM (Fase 2).
> Sustituye cualquier descripción de diseño anterior. Si algo difiere, vale lo de aquí.

## 1. Identidad visual (constantes exactas del generador)

| Elemento | Valor |
|---|---|
| Azul marino | `#1A2B5F` — barra superior 8px, títulos, cabeceras de tabla, slide de cierre |
| Verde corporativo | `#2D6A2D` — acento lateral del título (barra 6px), línea bajo título (3px), cifras de ahorro |
| Verde claro | `#5CA85C` — barras del perfil de carga (no dominante) |
| Rojo | `#C0392B` — recuadros de aviso de validez de oferta |
| Ámbar | `#B9770E` — notas SSAA "a coste real" |
| Gris fondo | `#F2F2F2` · Gris texto | `#555555` · Negro texto | `#222222` · Líneas | `#CCCCCC` |
| Tipografía | **Calibri** (toda la propuesta) |
| Footer (todas las slides) | `VALERE CONSULTORES ASOCIADOS S.L. · C/Astronomía S/N, Torre 4, Planta 1, Puerta 3 · 41015 Sevilla` + nº página + logo esquina inf. derecha |
| Logo | **SOLO el logotipo "Valere"** (con texto Valere visible). PROHIBIDOS en la IMAGEN: que aparezca "Vitaly", el icono de la "V" suelto y los logos redondos (el nombre del archivo puede contener "Vitaly", da igual; lo que no debe verse es en la imagen). ⚠️ HALLAZGO 2026-06-12: el PDF de LOWFIT ya enviado se generó con `Valere&Vitaly_300ppp_Logotipo_rrss_2.png`, que ES el logo REDONDO "VA" — incumple la norma.
**LOGO OFICIAL DEFINIDO (Juan, 2026-06-12):** logotipo HORIZONTAL = icono VA + texto "Valere" (azul `#1A2B5F`) + "CONSULTORES" (verde `#2D6A2D`), fondo transparente, ~2043×675px. Es el que se usa en propuestas. Pendiente: subir el fichero PNG a una carpeta conectada para cablearlo en el CRM y en el generador (sustituir la constante LOGO del .js). Portada sup. derecha (~1,05×1,07"), interiores inf. derecha (~0,46×0,47") |
| Formato | 16:9 (LAYOUT_16x9) |

Cabecera de slide interior: barra azul 8px arriba + barra verde vertical 6px junto al título + título azul 19pt bold + línea verde 3px bajo el título.

## 2. Estructura — 14 slides (orden y títulos EXACTOS del PDF final)

| Pág | Título exacto | Tipo | Contenido |
|---|---|---|---|
| 1 | (Portada) ESTUDIO DE OPTIMIZACIÓN ENERGÉTICA + cliente + subtítulo + "VALERE CONSULTORES" | Núcleo | Eyebrow verde, nombre cliente 40pt azul, línea "N puntos · tarifas · comparativa frente a N comercializadoras · mes año" |
| 2 | 1. RESUMEN EJECUTIVO | Núcleo | Card gris con ahorro grande verde (€/año + %), minitabla de opciones (Ahorro/Plazo/SSAA), frase entrecomillada, recuadro rojo de validez, nota SIPS + nota fee* |
| 3 | 2. PUNTOS DE SUMINISTRO DEL GRUPO | Núcleo | Tabla por CUPS (Empresa/Punto · Tarifa · kWh SIPS · % grupo) + fila TOTAL azul. (Monopunto: tarjetas en vez de tabla) |
| 4 | 3. PERFIL DE CARGA DEL GRUPO | Núcleo | Barras horizontales P1–P6 con kWh y %, dominante en azul, resto verde claro + nota del periodo dominante |
| 5 | 4. RANKING DE OPCIONES — COSTE TOTAL ANUAL DEL GRUPO | Núcleo | Tabla ordenada: # · Opción · Total €/año · €/MWh energía · €/MWh total · SSAA |
| 6 | 5. PRECIOS POR PERIODO — TARIFA 3.0TD (6 puntos) | Núcleo | Matriz €/kWh finales P1–P6 por opción; mejor precio por periodo en verde |
| 7 | 6. PRECIOS POR PERIODO — TARIFA 6.1TD (nombre punto) | Núcleo | Igual, para la otra tarifa del grupo |
| 8 | 7. COMPARATIVA DIRECTA: X vs Y — … | Módulo | 1-a-1 entre dos opciones comparables (cuando ayuda a decidir) |
| 9 | 8. PRESUPUESTO MENSUAL DEL GRUPO — ENERGÍA + POTENCIA | Módulo | 12 meses × opciones + ahorro mensual (3 opciones: referencia + comparable + recomendada) |
| 10 | 9. SERVICIOS DE AJUSTE (SSAA) — CÓMO COMPARAR CON RIGOR | Módulo | Qué son + criterio del estudio (homogeneización 12,39 €/MWh) |
| 11 | 10. ANÁLISIS DE RIESGO Y DICTAMEN | Núcleo | Tabla por perfil (Mayor ahorro / Menor riesgo…) + recuadro verde con dictamen Valere |
| 12 | 11. CONDICIONES CONTRACTUALES COMPARADAS | Núcleo | Tabla por condición × opción; puntos delicados (permanencia, preaviso) destacados |
| 13 | 12. PRÓXIMOS PASOS | Núcleo | Lista numerada + aviso de validez |
| 14 | (Cierre) Contacto + nota metodológica | Núcleo | Fondo/acento azul, email, footer, nota SIPS metodológica |

> Numeración: la portada y el cierre NO se numeran; las 12 intermedias llevan "1."–"12." en el título.
> La 3.0TD se etiqueta **"(6 puntos)"** = 6 periodos de potencia (confirmado en el PDF final).

## 3. Reglas de contenido permanentes (de INSTRUCCIONES §4, vigentes)

1. **Fee invisible**: precios siempre finales (base+fee). QA: grep "fee|margen|comisión" = 0 en el documento.
2. **SSAA por tipo**: incluidos con cap ("Incluidos hasta 12,39*" + nota) / no incluidos (doble fila "sin SSAA" y "ref. 12,39") / sin cap declarado ("Incl. — sin cap**"). Homogeneización estándar 12,39 €/MWh.
3. **GDO**: sin garantía de origen por defecto.
4. **€/MWh**: doble columna — energía (ponderada por consumo real) y total (con potencia).
5. **Endesa**: tramo de precio por potencia P6; modalidades horarias mapeadas a periodos.
6. **Consumos**: SIPS 12 meses; anomalías (cierres/incendios) → 12 meses representativos indicados en nota.
7. **Tarifas**: 3.0TD = 6 periodos potencia / 6 energía; 6.1TD–6.4TD = 6/6; 2.0TD fuera de alcance por ahora.
8. **Resultado negativo**: si ninguna opción ahorra, N6/dictamen pasan a modo "no cambiar / esperar / complementar FV"; nunca recomendar sobrecoste neto.

## 4. Módulos condicionales (se activan por flags del cuestionario)

M-SSAA (alguna opción sin SSAA) · M-MULTI (multipunto) · M-FV (tiene FV / se propone PPA) · M-POT (potencia sobredimensionada, RD-ley 7/2026) · M-COMP (estudio de la competencia) · M-INDEX (contrato actual indexado) · M-FAQ (dudas del cliente por escrito).

## 5. Uso en el CRM (Fase 2)

El generador del CRM reproduce esta especificación leyendo `cliente.json` (ver `PLAN_FASE2_PROPUESTAS_PPTX.md`). Salida principal PPTX; PDF/DOCX secundarios. El logo se sube al Storage del CRM (bucket de assets) para que la Edge Function lo incruste.

## 6. Validación

Diseño verificado el 2026-06-12 contra el PDF realmente enviado a GRUPO GIMNASIOS LOWFIT (junio 2026):
ahorro 30.647 €/año (−15,4%, hasta 46.058 € −23,1%), 1.243.835 kWh, perfil P6 valle 33,4%, ranking VISALIA 152.962 € (101,08/122,98 €/MWh), matrices 3.0TD y 6.1TD — todo coincide con el generador. Es el estándar de oro.
