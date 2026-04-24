---
title: Generar propuesta energética para el cliente
section: propuestas-energia
audience: comerciales
keywords: [propuesta, oferta, generar, pdf, enviar, cliente, comparativa, presentar]
related:
  - analisis/comparativo-ofertas
  - tracking/seguimiento-propuestas
  - oportunidades/pipeline-kanban
---

# Generar propuesta energética

## Resumen rápido
Tras hacer un **análisis comparativo**, eliges la oferta ganadora → **Generar propuesta** → el sistema crea un PDF profesional con la comparativa actual vs la oferta nueva → puedes enviarlo al cliente por email.

## Flujo completo

### 1. Análisis previo
Antes de generar propuesta, debes haber:

- Capturado las facturas del CUPS (datos completos del último año).
- Ejecutado el análisis comparativo (Menú → Análisis).
- Identificado cuál es la oferta ganadora para el cliente.

Ver `analisis/comparativo-ofertas.md`.

### 2. Generar propuesta

1. Desde el análisis, click sobre la oferta elegida → botón **Generar propuesta**.
2. Se abre el formulario de propuesta:
   - **Empresa**: prerellenado del análisis.
   - **CUPS**: prerellenado.
   - **Oportunidad** (opcional): vincular a una oportunidad existente (recomendado para tracking).
   - **Comercializadora propuesta**: prerellenada.
   - **Tarifa propuesta**: prerellenada.
   - **Precio kWh**: prerellenado de la oferta.
   - **Potencia recomendada**: prerellenada.
   - **Comisión estimada (€)**: tu comisión esperada (interno).
   - **Ahorro estimado (%)**: prerellenado.
   - **Fecha validez**: hasta cuándo la oferta es válida (típicamente 15-30 días).
   - **Notas para el cliente** (opcionales).
3. **Guardar como borrador** → genera la propuesta en estado `borrador`.

### 3. Generar el PDF

1. En la propuesta guardada, click en **Generar PDF**.
2. El sistema crea un PDF con:
   - **Portada**: logo Valere + datos cliente.
   - **Resumen ejecutivo**: ahorro principal en grande.
   - **Situación actual**: tabla con contrato actual + costes desglosados.
   - **Propuesta nueva**: tabla con la oferta + costes desglosados.
   - **Comparativa visual**: gráfico de barras con comparación.
   - **Detalles legales**: condiciones, validez, próximos pasos.
   - **Pie**: datos de contacto del comercial.
3. Previsualizar el PDF antes de enviarlo.

### 4. Enviar al cliente

Tres formas:

**Descargar PDF + email manual**:
1. Descargar el PDF.
2. Enviar desde tu Gmail con tu cuenta @valereconsultores.com.

**Enviar desde el CRM** (si la integración Resend está configurada):
1. Botón **Enviar al cliente**.
2. Destinatario: contacto firmante de la empresa (auto-prerellenado).
3. CC: tú mismo.
4. Asunto: editable.
5. Cuerpo: plantilla editable.
6. Adjunto: el PDF generado.
7. **Enviar**.

El sistema registra el envío en el log de comunicaciones del cliente.

**Compartir link único**:
1. Botón **Compartir link**.
2. Copia link (URL pública con token único).
3. Pegar en email/WhatsApp.
4. El cliente abre y ve la propuesta sin necesidad de PDF descargado.

### 5. Tracking de respuesta

Una vez enviada, sigue su estado en **Tracking** (menú lateral) o desde la pestaña **Tracking** dentro de la oportunidad.

Estados típicos:

- **Borrador**: aún no enviada.
- **Enviada**: enviada al cliente.
- **Vista**: el cliente abrió el email/PDF (si tienes pixel de tracking).
- **Aceptada**: cliente confirmó.
- **Rechazada**: cliente dijo no.
- **En negociación**: cliente pide cambios.

Si **aceptada** → mover oportunidad a "Contrato firmado".

## Versionado

Cuando el cliente pide cambios y generas una propuesta nueva con mejores condiciones:

1. **Edita** la propuesta existente.
2. Cambia los datos + sube el campo **Versión** (1 → 2).
3. Genera el PDF nuevo (sustituye al anterior).
4. Envía la versión 2.

El histórico de versiones queda guardado en `datos_json` de la propuesta para auditoría.

## Errores frecuentes

- **"Faltan datos del CUPS"**: el CUPS no tiene potencias contratadas o tarifa. Completar ficha del CUPS antes.
- **"Sin facturas en el periodo"**: necesitas mínimo 6 meses de facturas. Captura más.
- **"PDF muy grande"**: si tiene muchos gráficos. Reducir desde Settings → Plantilla PDF.
- **"Email no se envía"**: verifica config Resend en admin (key configurada, dominio verificado).

## Preguntas relacionadas

- ¿Cómo personalizar la plantilla del PDF de propuesta?
- ¿Puedo generar propuesta sin haber hecho análisis previo?
- ¿Cómo añadir condiciones especiales en la propuesta (descuentos, regalos)?
- ¿El cliente puede firmar la propuesta digitalmente desde el link?
