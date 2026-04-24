---
title: Importar muchas empresas desde CSV
section: empresas
audience: admin
keywords: [importar, csv, masivo, alta, excel, bulk, subir]
related:
  - empresas/crear-empresa
  - importador
---

# Importar muchas empresas desde CSV

## Resumen rápido
Ve al **Importador** en el menú → sube un archivo CSV con las columnas correctas → previsualiza → confirma. El sistema valida duplicados por NIF automáticamente.

## Paso a paso

1. En el menú lateral, pulsa **Importador**.
2. Descarga la **plantilla CSV** desde el botón **Descargar plantilla**. Ábrela en Excel o Google Sheets.
3. Rellena una fila por empresa. Columnas obligatorias y opcionales:
   - `nombre` *(obligatorio)*
   - `nif`
   - `tipo`: uno de `empresa`, `autonomo`, `comunidad_propietarios`, `cooperativa`, `asociacion`
   - `segmento`: uno de `industrial`, `comercial`, `servicios`, `agricola`, `residencial_colectivo`
   - `email_principal`
   - `telefono_principal`
   - `web`
   - `direccion`, `cp`, `ciudad`, `provincia`
   - `notas`
4. Guarda el archivo como **CSV (UTF-8)** — importante el formato UTF-8 para que no se rompan los acentos.
5. Vuelve al Importador y pulsa **Seleccionar archivo**.
6. Sube tu CSV. El sistema te mostrará una **previsualización** de las primeras 20 filas.
7. Revisa que los datos se han mapeado correctamente a las columnas del sistema.
8. Pulsa **Importar**. El sistema procesa fila por fila:
   - Si el NIF ya existe, salta esa fila (no duplica).
   - Si hay error en una fila, lo reporta y sigue con las siguientes.
9. Al terminar verás un resumen: cuántas importadas, cuántas saltadas por duplicado, cuántas con error.

## Consejos

- **Prepara el CSV en Excel**: deja los valores vacíos en blanco (no "null", no "NA"). Un valor vacío se guarda como NULL en el sistema.
- **NIF**: puedes ponerlo con o sin espacios/guiones. El sistema normaliza antes de comparar duplicados.
- **Tipo y segmento**: respeta los valores exactos de la lista (minúsculas, con guiones bajos). Si dejas vacío, se guarda sin categorizar.
- **Acentos y ñ**: guarda siempre como CSV UTF-8 para que no se rompan.
- **Empieza con pocas filas**: haz una primera prueba con 5 filas para asegurar que todo va bien antes de subir 500.

## Errores frecuentes

- **"Columna `nombre` vacía"**: el campo nombre es obligatorio. Revisa que todas las filas lo tienen.
- **"Tipo no válido"**: has puesto un valor que no está en la lista (`empresa`, `autonomo`, etc.). Revisa el valor exacto.
- **"Formato CSV inválido"**: el archivo no es un CSV válido. Vuelve a exportar desde Excel como "CSV UTF-8 (delimitado por comas)".
- **Los acentos salen raros (por ejemplo "SeÃ±or")**: guardaste el CSV con codificación distinta a UTF-8. Re-exporta como UTF-8.
- **Se han importado empresas duplicadas**: el NIF estaba vacío en el CSV, por lo que el sistema no puede detectar duplicados. Añade NIFs y re-importa solo las faltantes.

## Preguntas relacionadas

- ¿Cómo importar contactos vinculados a empresas ya existentes?
- ¿Cómo importar contratos?
- ¿Se pueden actualizar empresas existentes desde CSV (no solo crear nuevas)?
- ¿Qué pasa si el CSV tiene una columna que el sistema no reconoce?
