---
title: Contactos sin empresa y reasignación a otra empresa
section: contactos
audience: todos
keywords: [contacto sin empresa, contacto independiente, asociar contacto, mover contacto, transferir contacto, cambiar empresa, prospect, lead, contacto suelto, reasignar, vincular]
related:
  - contactos/crear-contacto
  - empresas/anadir-contacto-a-empresa
  - empresas/crear-empresa
  - oportunidades/crear-oportunidad
---

# Contactos sin empresa y reasignación

## Resumen rápido
- **Crear un contacto sin empresa**: Menú → **Contactos** → **+ Nuevo contacto** → deja el campo Empresa vacío → **Guardar**.
- **Asociar más tarde a una empresa**: ficha del contacto → editar → seleccionar Empresa → Guardar.
- **Mover de una empresa a otra**: editar → cambiar campo Empresa al nuevo valor → Guardar (no duplica, transfiere).

## Por qué un contacto puede no tener empresa

Casos válidos:
- **Lead frío** que conociste en una feria sin saber aún su empresa.
- **Persona física** (autónomo) cuya "empresa" todavía no se ha dado de alta.
- **Antiguo trabajador** que ahora trabaja por su cuenta y mantienes la relación.
- **Recomendador** o intermediario que no es cliente final pero te trae oportunidades.

## Crear un contacto sin empresa

1. Menú lateral → **Contactos** (no entrar por Empresas).
2. Botón **+ Nuevo contacto** arriba a la derecha.
3. Rellena los datos personales:
   - **Nombre** *(obligatorio)*.
   - **Apellidos**.
   - **Email**.
   - **Teléfono**.
   - **Cargo / Departamento**: opcional, pero útil si lo conoces.
   - **Notas**: contexto (cómo lo conociste, qué te interesa de él).
4. **Empresa**: déjalo en blanco (selector vacío).
5. **Guardar**.

El contacto queda en la lista con la columna Empresa marcada como "—" o "Sin empresa".

## Filtrar contactos sin empresa

En la lista de contactos:
1. Filtro **Empresa** → opción "Sin empresa" (o checkbox "Mostrar solo huérfanos").
2. Te quedan solo los que no están asociados.

Útil para revisar leads sueltos al final del mes y darles continuidad.

## Asociar el contacto a una empresa después

Cuando descubras la empresa de la persona o la des de alta:

1. Asegúrate de que la empresa **ya existe** (si no, créala primero — `empresas/crear-empresa.md`).
2. Menú → **Contactos** → busca el contacto.
3. Abre su ficha → botón **Editar**.
4. Campo **Empresa**: selecciona la empresa del desplegable.
5. **Guardar**.

El contacto ya aparece en la pestaña Contactos de esa empresa.

## Mover un contacto de una empresa a otra

La persona cambió de trabajo y ahora está en otra empresa. Quieres mantener el histórico (actividades pasadas, conversaciones) pero asociarlo a la empresa nueva:

1. Ficha del contacto → **Editar**.
2. Cambia el campo **Empresa** del valor viejo al nuevo.
3. **Guardar**.
4. El contacto **deja de aparecer** en la pestaña Contactos de la empresa vieja y **aparece** en la nueva.
5. Las actividades históricas se conservan asociadas al contacto (no a la empresa), por lo que la trazabilidad personal queda intacta.

> **Buena práctica**: añade una **nota** en el contacto del tipo "Pasó de Empresa A a Empresa B en marzo 2026" para tener constancia explícita.

## ¿Y si la persona trabaja en dos empresas a la vez?

Caso típico: un consultor que es a la vez gerente de su consultora y administrador de la sociedad de un cliente.

En la versión actual del CRM, **un contacto pertenece a UNA sola empresa**. Soluciones:

- **Opción A** (recomendada): crear el contacto duplicado en cada empresa, con email distinto si lo tiene (corporativo de cada una). Ambos quedan asociados a su empresa.
- **Opción B**: crear el contacto solo en la empresa principal y en el campo **Notas** anotar "También trabaja en EmpresaY".
- **Opción C** (futura): el campo "tags" permite poner múltiples etiquetas, podríamos ampliar a relaciones múltiples — feature pendiente.

## Asociar un contacto a una oportunidad

Independientemente de la empresa:

1. Abre la oportunidad.
2. Pestaña **Contactos** dentro de la ficha de la oportunidad (o campo "Contacto principal").
3. Selecciona el contacto del desplegable.
4. **Guardar**.

Si el contacto no tiene empresa o tiene otra distinta de la empresa de la oportunidad, el sistema avisa pero permite el cruce — puede ser un intermediario o recomendador.

## Asociar un contacto a una actividad

Al registrar una actividad (llamada, email, reunión):
1. **+ Nueva actividad** desde la ficha del contacto, o desde otra entidad.
2. En el formulario, campo **Contacto**: selecciona el contacto.
3. La actividad queda asociada al contacto (y opcionalmente también a su empresa o a la oportunidad relacionada).

## Convertir un contacto sin empresa en una nueva empresa

Si la persona resulta ser autónomo y necesitas crear su empresa:

1. Crea la empresa con sus datos (`empresas/crear-empresa.md`) — usa el NIF de la persona como CIF.
2. Edita el contacto y asígnalo a esa nueva empresa.

El sistema **no automatiza esta conversión** — son dos pasos manuales.

## Errores frecuentes

- **"No puedo dejar el campo Empresa vacío al editar"**: comprueba que la versión del CRM lo permite. Si te obliga a poner una empresa, crea una empresa "Sin asignar" temporal y muévelo después.
- **"El contacto se duplicó al moverlo"**: probablemente lo creaste de nuevo en lugar de editarlo. Borra el duplicado.
- **"Las actividades se quedaron en la empresa vieja"**: las actividades quedaron asociadas a la empresa del momento de creación. Para moverlas individualmente, abre cada actividad → cambia la entidad asociada.
- **"No me deja crear contacto sin email"**: el email no es obligatorio. Si la UI lo pide, deja un placeholder claro tipo "sin-email@desconocido.tld" y reemplázalo cuando lo tengas.

## Preguntas relacionadas

- ¿Cómo importar un CSV de leads sin empresa?
- ¿Puedo enviar comunicaciones masivas solo a los contactos sin empresa?
- ¿El historial del contacto se preserva si lo muevo entre empresas?
- ¿Cómo saber qué contactos no tienen ninguna actividad reciente?
