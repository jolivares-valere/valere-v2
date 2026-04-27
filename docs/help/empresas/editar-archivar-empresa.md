---
title: Editar, archivar y eliminar una empresa
section: empresas
audience: todos
keywords: [editar, modificar, cambiar, actualizar, archivar, ocultar, baja, dar de baja, inactiva, eliminar, borrar, papelera, restaurar, soft delete, hard delete]
related:
  - empresas/crear-empresa
  - empresas/anadir-contacto-a-empresa
  - contratos/gestionar-contratos
  - admin/gestionar-usuarios
---

# Editar, archivar y eliminar una empresa

## Resumen rápido
- **Editar**: ficha de la empresa → botón ✏ **Editar** → cambia los campos → **Guardar**.
- **Archivar** (recomendado para "darla de baja"): ficha → botón ⋯ → **Archivar**. La empresa desaparece de los listados pero se conserva con todo su histórico.
- **Eliminar** (irreversible): solo admins. Botón ⋯ → **Eliminar**. Borra la empresa y todas sus relaciones.

## Editar los datos de una empresa

1. Menú lateral → **Empresas**.
2. Click en la empresa que quieres editar para abrir su ficha.
3. Botón **✏ Editar** (arriba a la derecha de la cabecera de la ficha).
4. Cambia los campos que necesites. Los obligatorios siguen siendo los mismos que al crear (nombre).
5. **Guardar**.

> **Quién puede editar**: el comercial asignado a la empresa, su manager y los admin/master. Otros comerciales pueden ver pero no editar.

### Cambios habituales y dónde

| Cambio | Dónde |
|---|---|
| Nombre comercial / razón social | pestaña Datos generales |
| NIF/CIF | pestaña Datos generales (avisa si el nuevo ya existe en otra empresa) |
| Dirección, CP, ciudad | pestaña Datos generales |
| Comercial asignado | pestaña Datos generales (solo manager o admin) |
| Tipo / Segmento | pestaña Datos generales |
| Notas | pestaña Datos generales |
| Contactos | pestaña Contactos |
| Custom fields | pestaña Campos personalizados |

### Historial de cambios

Cada modificación queda registrada con fecha, usuario y campo modificado. Visible desde la ficha → pestaña **Historial** (solo admin/master por defecto).

## Archivar una empresa (alternativa recomendada al borrado)

Cuando una empresa ya no es cliente activo pero quieres conservar el histórico (contratos pasados, facturas, comunicaciones):

1. Ficha de la empresa → menú **⋯** (esquina superior derecha) → **Archivar**.
2. Confirma el diálogo.
3. La empresa desaparece de los listados normales. **No se borra**.
4. En contratos/oportunidades históricas sigue apareciendo el nombre.

### Ver empresas archivadas
- Listado de Empresas → filtro **Estado: archivadas**.
- O listado completo → checkbox "Incluir archivadas".

### Restaurar una empresa archivada
1. Filtra por archivadas.
2. Abre la ficha.
3. Botón ⋯ → **Restaurar**.
4. Vuelve a los listados normales.

> **Por qué archivar y no eliminar**: archivar conserva la trazabilidad legal/comercial. Si un cliente vuelve después de meses, recuperas todo su histórico sin tener que volver a crearlo.

## Eliminar una empresa (uso excepcional)

⚠️ **Destructivo e irreversible**. Solo admin y master pueden eliminar.

Cuándo procede eliminar (no archivar):
- Empresa creada por error (duplicado, prueba).
- Datos sensibles que la empresa pide expresamente que se borren (RGPD — derecho al olvido).

Cuándo NO eliminar — usa archivar:
- Cliente que se ha ido a competencia (conserva histórico para reactivación).
- Empresa con contratos antiguos cerrados (se necesitan para informes y auditorías).

### Pasos para eliminar
1. Ficha → ⋯ → **Eliminar**.
2. Diálogo de confirmación que pide escribir el nombre exacto de la empresa.
3. **Confirmar**.

### Qué se borra al eliminar
- La empresa.
- Sus contactos, contratos, CUPS, oportunidades, actividades, documentos asociados.
- Las facturas y datos de consumo asociados a sus CUPS.

### Qué NO se borra
- El histórico de log del asistente (anonimizado, no contiene NIF).
- Los embeddings del corpus de docs.
- Los registros agregados de KPIs ya consolidados.

## Marcar una empresa como "inactiva" sin archivar

Si quieres mantener la empresa visible pero indicar que **no se está trabajando con ella ahora mismo**, dos opciones:

1. Pestaña **Datos generales** → campo **Estado** → **inactiva**.
2. Tag personalizado "no contactar" o "pausada" en el campo Tags.

Inactiva sigue apareciendo en los listados pero filtros como "empresas activas" la excluyen.

## Errores frecuentes

- **"No tienes permiso para eliminar"**: tu rol no es admin. Pide al admin que lo haga, o archiva la empresa en su lugar.
- **"No se puede eliminar: tiene contratos activos"**: el sistema bloquea borrado si hay contratos en estado `activo`. Cancela primero los contratos o archiva la empresa.
- **"Restaurar falló"**: puede ser que el comercial al que estaba asignada ya no exista. Asígnala a otro comercial al restaurar.

## Preguntas relacionadas

- ¿Cómo recupero una empresa eliminada por error?
- ¿La papelera dura para siempre o se vacía sola?
- ¿Se puede transferir una empresa de un comercial a otro?
- ¿Cómo fusiono dos empresas duplicadas en una sola?
