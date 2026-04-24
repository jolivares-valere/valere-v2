---
title: Subir documentos (contratos firmados, facturas, autorizaciones)
section: documentos
audience: todos
keywords: [documento, adjunto, subir, archivo, pdf, storage, factura, contrato, autorización]
related:
  - contratos/gestionar-contratos
  - empresas/crear-empresa
  - incidencias/registrar-incidencia
---

# Subir documentos

## Resumen rápido
Desde la ficha de cualquier entidad (empresa, contrato, CUPS, oportunidad, incidencia) → pestaña **Documentos** → **+ Subir documento**. Soporta PDF, imágenes, Excel, Word.

## Tipos de documentos habituales

- **Contratos firmados** (PDF del contrato con la comercializadora).
- **Autorizaciones** (cliente autoriza a gestionar su suministro).
- **Facturas** (PDFs de facturas de la comercializadora).
- **Comunicados** (emails relevantes, correspondencia con el cliente).
- **Documentos de identidad** (DNI/CIF del cliente si legal lo requiere).
- **Planos / fotos** (fotos del contador, del cuadro eléctrico, etc.).
- **Cualquier otro adjunto relevante**.

## Paso a paso

1. Abre la ficha de la entidad a la que quieres asociar el documento (empresa, contrato, etc.).
2. Click en la pestaña **Documentos**.
3. Pulsa **+ Subir documento**.
4. Rellena:
   - **Archivo** *(obligatorio)*: seleccionar desde tu equipo (drag&drop también funciona).
   - **Nombre**: por defecto el nombre del archivo, pero puedes renombrarlo para ser más descriptivo (ej: "Contrato Iberdrola PAZ Y BIEN - firmado 2026-04").
   - **Tipo**: contrato_firmado, autorización, factura, identificación, foto, otro.
   - **Descripción**: observaciones opcionales.
5. **Subir**.

El archivo se sube al Storage de Supabase y queda accesible desde la pestaña Documentos siempre que alguien abra la ficha.

## Tipos y tamaños permitidos

- **Formatos**: PDF, JPG, PNG, DOCX, XLSX, CSV, ODT, ODS.
- **Tamaño máximo por archivo**: 50 MB.
- **Sin límite de archivos por entidad**.

## Descargar un documento

1. Ficha → pestaña **Documentos**.
2. Click en el nombre del archivo → se abre en el navegador o descarga.
3. Alternativa: icono de descarga ⬇ al lado del nombre → descarga directa.

## Previsualización

- **PDF**: se abre en el navegador.
- **Imágenes**: miniatura + click para abrir a tamaño completo.
- **Excel / Word**: solo descarga — no hay preview inline.

## Permisos

- **Cualquier usuario autenticado**: puede ver los documentos de las entidades a las que tenga acceso.
- **Comerciales**: solo documentos de sus empresas/contratos asignados.
- **Manager**: documentos de su equipo.
- **Master/Admin**: todo.

Los documentos NO se pueden compartir con enlaces públicos externos (requiere login en el CRM).

## Eliminar un documento

⚠️ **Destructivo e irreversible**.

1. Ficha → pestaña Documentos.
2. Icono de papelera 🗑 al lado del documento.
3. Confirmar el diálogo.
4. El archivo se elimina del Storage de Supabase permanentemente.

Si quieres conservar el documento pero ocultarlo, opción "Archivar" en vez de "Eliminar" (soft delete).

## Consejos

- **Nombres descriptivos**: "Contrato Iberdrola 2026-abr" mejor que "scan001.pdf".
- **Sube el contrato firmado al día siguiente** de recibirlo, no al mes — es fácil perderlo.
- **Foto del contador cuando haya incidencia**: útil para disputar lecturas erróneas.
- **Confidencialidad**: no subas documentos que la empresa cliente no quiera que se almacenen (pregunta antes si es algo sensible).

## Errores frecuentes

- **"Archivo demasiado grande"**: >50 MB. Comprime el PDF con https://www.ilovepdf.com o similar antes de subir.
- **"Formato no soportado"**: revisa la lista de formatos permitidos. Convertir si es necesario.
- **"Error de red al subir"**: archivo muy grande con conexión lenta. Intentar en otra red o dividir.
- **"No puedo eliminar este documento"**: tu rol no tiene permiso de borrado. Pide al admin.

## Preguntas relacionadas

- ¿Los documentos se cifran en el Storage?
- ¿Puedo compartir un documento con el cliente por email desde el CRM?
- ¿Qué pasa si elimino un documento por error?
- ¿Hay un límite total de almacenamiento en el CRM?
