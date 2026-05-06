---
title: Prospecto vs cliente
section: captacion
audience: [telemarketing, asesor_senior, admin]
keywords: [prospecto, cliente, conversión, contrato firmado, CRM, empresas, separación, convertir, promocionar]
related:
  - captacion/crear-lead
  - captacion/cerrar-caso
---

# Prospecto vs cliente

## Cuándo importa
Cuando te preguntas "¿esta empresa la veo en /empresas o en /captacion?" o cuando un caso ya está firmado y hay que sacarlo de captación al CRM.

## Qué es prospecto / qué es cliente
- **Prospecto** = empresa que estás trabajando para captar. Aún no ha firmado nada con Valere. Vive en **/captacion** con sus oportunidades, contactos y notas. NO aparece en /empresas, ni en /contactos, ni en /contratos del CRM.
- **Cliente** = empresa que ya firmó contrato con Valere o tiene relación activa. Vive en **/empresas**, sus contactos en **/contactos**, sus contratos en **/contratos**. NO aparece en /captacion.

Una empresa solo puede ser una de las dos cosas a la vez. Cuando un prospecto firma, se promociona a cliente y deja de aparecer en captación.

## Dónde aparece cada uno
| Pantalla | Qué muestra |
| --- | --- |
| /empresas | Solo clientes |
| /contactos | Solo contactos de clientes |
| /contratos | Solo contratos firmados |
| /captacion | Solo prospectos (todas las pestañas) |
| Búsqueda global (lupa arriba) | Solo clientes |

## Cuándo se promociona un prospecto a cliente
Cuando el caso está realmente cerrado y ganado. La oportunidad debe estar en una de estas etapas:
- **Cerrada ganada**
- **Contrato firmado**
- **Activo**

Si la oportunidad está en cualquier otra etapa (en análisis, propuesta enviada, seguimiento…), el botón de convertir no aparece. Es a propósito: no se promociona "por si acaso".

## Quién puede promocionar
Solo **admin** o **asesor senior**. Carolina A (telemarketing) ve el caso pero no ve el botón.

## Cómo se promociona
1. Abre el drawer del caso ganado/firmado.
2. Si tienes permisos, verás una sección **verde** con el título **"Convertir a cliente CRM"**.
3. Click en **"Convertir a cliente CRM"**.
4. Te aparece un mensaje de confirmación. Acéptalo solo si el contrato está firmado de verdad.

## Qué debe pasar
- Toast verde "Empresa promocionada a cliente CRM".
- La empresa pasa a aparecer en **/empresas**, **/contactos** y resto del CRM.
- Desaparece de **/captacion**.
- Las oportunidades del caso pasan también al CRM.

## Si falla
- **No ves el botón "Convertir a cliente CRM"** → o no eres admin/senior, o la oportunidad no está en una etapa ganada/firmada/activa. Revisa la etapa.
- **Toast rojo con mensaje de permisos** → confirma con admin que tu cuenta tiene la función `asesor_senior` o `admin`.
- **La empresa sigue apareciendo en /captacion tras convertir** → recarga con Ctrl+Shift+R. Si persiste, avisa a soporte.

## Por qué esta separación
Se hizo así para que el CRM solo muestre clientes reales. Antes de la separación, los leads de captación contaminaban /empresas y los listados del comercial. Ahora cada zona muestra lo suyo y solo cuando un prospecto firma, se mueve.
