# Cierre PR-3.3 (codificado) — documentos OCR-ready — 2026-07-22 (madrugada)

## HALLAZGO GORDO (para el acta)
La pestana Documentos YA EXISTIA (DocumentosTab en ficha empresa y detalle contrato,
bucket privado con RLS desde abril) pero el UPLOAD ESTABA ROTO EN PRODUCCION:
el insert enviaba `tamanio` y la columna real es `tamano_bytes` -> error de columna
inexistente en cada subida. Nunca se habia paseado. FIX incluido en este PR.

## BBDD (migracion 20260722_pr33_documentos_ocr_ready.sql — APLICADA con OK de Juan)
- documentos + tipo_documento (check contrato/factura/dni/otro) + comercializadora_id
  (FK catalogo PR-3.1) + indice. Comentarios explican el porque (backlog v2 #1).
- Acceso EF: service_role BYPASEA RLS -> los PDF ya son legibles por Edge Function
  sin politica adicional (nota (c) cumplida sin SQL).
- Bucket `documentos` (privado) y sus 7 policies EXISTENTES verificadas: select
  authenticated / insert-update staff+funciones captacion / delete admin / anon nada.

## Codigo
- entities.ts: Documento honesto con la BBDD (tamanio->tamano_bytes; + tipo_documento,
  comercializadora_id, nombre_archivo, nombre_original; type TipoDocumento).
- documentos/api.ts: FIX insert (tamano_bytes) + metadatos OCR-ready + funcion
  normalizarNombreArchivo (fecha_tipo_slug, sin acentos, + sufijo anticolision) ->
  ruta y nombre_archivo normalizados (nota (b)).
- DocumentosTab: al elegir fichero se abre panel de confirmacion con Tipo de documento
  (premarcado "contrato" en detalle de contrato) + Comercializadora opcional (catalogo);
  chip de tipo en la lista; tamano desde tamano_bytes.
- database.ts: columnas nuevas en documentos.
- Doc RAG: docs/help/documentos/subir-documento.md ampliada (seccion PR-3.3).
- NOTA: hay una carpeta _to_delete/ en la raiz con un md descartado — borrala
  (no esta en git, el sandbox no puede borrar).

## Guion PowerShell Juan (sin &&; guard de rama)
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/pr-3-3-documentos-ocr-ready
git branch --show-current   # DEBE decir claude/pr-3-3-documentos-ocr-ready; si no, PARAR
npx tsc --noEmit
npm test
git add supabase/migrations/20260722_pr33_documentos_ocr_ready.sql src/features/documentos src/core/types/entities.ts src/core/types/database.ts docs/help/documentos/subir-documento.md
git commit -m "feat(pr3.3): documentos OCR-ready - fix upload roto (tamano_bytes), tipo de documento + comercializadora, nombres normalizados"
git push -u origin claude/pr-3-3-documentos-ocr-ready
```

## Guion de paseo del auditor
1. CA del plan: subir el contrato de CHEMTROL (PDF) desde su ficha -> tipo "contrato",
   comercializadora NEXUS -> abrirlo a 1 clic (enlace firmado). ANTES del fix esto
   fallaba: verificar en consola de red que el insert ya no da error de columna.
2. Nombre normalizado en BBDD: nombre_archivo = YYYYMMDD_contrato_slug_xxxx.pdf.
3. RLS del bucket: incognito/anon sin sesion -> el objeto NO es accesible; con sesion
   la URL firmada caduca (60s).
4. tipo_documento y comercializadora_id guardados en la fila (SQL).
5. Regresion: pestanas Documentos de empresa y contrato cargan lista y skeleton.

## Estado semana 3
PR-3.1 SELLADO (paseo PASA) · PR-3.2 MERGEADO #79 (paseo pendiente, alta real NAGINI)
· PR-3.3 CODIFICADO (este). GATE V3 viernes: Julia/Antonio alta completa <2 min +
encuentran un PDF -> con los tres PRs, el gate tiene todo lo que necesita.
