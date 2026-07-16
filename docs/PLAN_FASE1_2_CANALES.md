# PLAN fase1_2_canales — Consolidación Comerciales / Canales (Tiempo 1)

> Estado: **PROPUESTA — NO EJECUTADA**. Pendiente veredicto del auditor + OK de Juan.
> Origen: encargo del auditor (Fase 1) tras la pregunta de Juan sobre los canales externos.
> Naturaleza: inventario read-only + plan. No se ha escrito ni una fila.

---

## 1. Hallazgos del inventario (verificado contra BBDD de producción)

Los nombres de canal **NO están en `empresas.notas` ni en `empresas.tags`** (0 coincidencias).
Viven en la columna `comercial` del staging certificado `staging_fase1_libro`, que se
cruza con producción por `external_id = 'LV:'||libro||':'||hoja||':'||fila`.

### Mapa completo de la columna `comercial` (542 contratos, cuadra exacto)

| comercial (libro) | contratos | sin comercial hoy | empresas | CUPS | ¿en user_profiles? | Interpretación |
|---|---:|---:|---:|---:|:--:|---|
| JUAN OLIVARES | 210 | 0 | 63 | 141 | ✅ | interno (mapeado) |
| ANTONIO RODRIGUEZ | 54 | 0 | 27 | 32 | ✅ | interno (mapeado) |
| CARO | 14 | 0 | 11 | 9 | ⚑ | Maciñeiras (mapeado) |
| CAROLINA | 12 | 0 | 8 | 12 | ⚑ | Maciñeiras (mapeado) |
| ANTONIIO RODRIGUEZ | 1 | 0 | 1 | 1 | ⚑ | interno (typo, mapeado) |
| CAROLINA AROCA | 1 | 0 | 1 | 1 | ✅ | Aroca (mapeado) |
| **JOAQUIN LLORENTE** | **105** | **105** | **33** | **65** | ❌ | **CANAL** |
| **JOAQUIN** | **3** | **3** | **3** | **3** | ❌ | **CANAL** (= Llorente, casi seguro) |
| **JOSE IGNACIO** | **48** | **48** | **33** | **48** | ❌ | **CANAL** |
| **HERQUESA** | **14** | **14** | **11** | **14** | ❌ | **CANAL** |
| **DAMARIS** | **4** | **4** | **3** | **4** | ❌ | **CANAL** |
| ANTONIO | 21 | 21 | 15 | 20 | ❌ | ¿= Antonio Rodriguez (interno, ya tiene perfil)? |
| JUAN RODRIGUEZ | 20 | 20 | 11 | 20 | ❌ | ¿interno sin perfil? ¿canal? — **decisión Juan** |
| RENOVACION | 12 | 12 | 10 | 3 | ❌ | no es persona (etiqueta de proceso) |
| EMILIO | 10 | 10 | 6 | 9 | ❌ | ¿interno? ¿canal? — **decisión Juan** |
| PEDRO LANUZA + LANUZA | 6 | 6 | ~5 | 5 | ❌ | ¿interno? ¿canal? — **decisión Juan** |
| TACITA | 1 | 1 | 1 | 1 | ❌ | no es persona (renovación tácita) |
| (null) | 6 | 6 | 6 | 0 | — | sin comercial en el libro |

### Lo importante que destapa el inventario
El encargo hablaba de **4 canales**. La realidad del bucket "sin comercial" (~250 contratos)
es **más ancha**: además de los 4 canales confirmados hay **etiquetas ambiguas** que NO son
canales y necesitan decisión de Juan antes de tocarlas:
- **ANTONIO** (21): con casi total seguridad es *Antonio Rodriguez*, que ya tiene perfil. Es un
  fallo de *matching* de nombre, no un canal → se remapea al perfil existente.
- **JUAN RODRIGUEZ / EMILIO / PEDRO LANUZA** (36 contratos): personas que no tienen perfil.
  ¿Son comerciales internos (merecen perfil propio) o canales? **Juan debe clasificarlas.**
- **RENOVACION / TACITA / (null)** (19 contratos): no son personas. No se les crea comercial;
  se dejan sin asignar o se tratan aparte.

---

## 2. BLOQUEANTE que rompe la premisa del encargo

El encargo pedía: *"alta de los 4 como user_profiles SIN cuenta auth, sin entrada en auth.users"*.

**Eso es imposible tal cual.** `user_profiles` tiene:

```
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
```

No se puede insertar una fila en `user_profiles` sin una fila correspondiente en `auth.users`.
Y como `empresas.comercial_id` → `user_profiles(id)`, para asignarles clientes hace falta sí o sí
que existan en `user_profiles`, y por tanto en `auth.users`.

Además, el CHECK de dominio de email obliga a `email @valereconsultores.com / @valere.com` o `NULL`.
Los canales no tienen ese email → deben ir con **email NULL**.

### Consecuencia para las variantes de rol

CHECK actual: `role IN ('master','manager','consultant','client')`. **`channel` no está permitido hoy.**

Helpers de permiso (Fase 0), todos evalúan `WHERE id = auth.uid()`:
- `is_staff()` → `role IN ('master','consultant')`
- `is_manager_or_above()` → `get_user_rol() IN ('admin','master','manager')`
- `get_user_rol()` → master/manager ⇒ 'admin', resto ⇒ su rol

**Clave de seguridad:** como los helpers filtran por `auth.uid()`, si el canal **no puede autenticarse**
(sin contraseña / cuenta baneada), su fila nunca se evalúa en ninguna política. El rol es
irrelevante mientras no haya login. Aun así, el rol debe elegirse para que sea seguro *también*
el día que se abra login.

---

## 3. Variantes de rol para el auditor (elige una)

**Variante A — `role = 'consultant'` provisional (sin DDL).**
- Pro: no toca el esquema.
- Contra: `is_staff()` incluye `consultant`. El día que se les cree login sin cambiar antes el rol,
  tendrían acceso de staff a **toda la cartera**. Riesgo aplazado y fácil de olvidar. **No recomendada.**

**Variante B — nuevo valor `role = 'channel'` (recomendada por el auditor).**
- Requiere 1 línea DDL: ampliar el CHECK a `('master','manager','consultant','client','channel')`.
- `channel` queda **fuera de `is_staff()` y de `is_manager_or_above()` por omisión** (ninguno lo lista),
  y `get_user_rol()` lo devuelve tal cual (no 'admin'). Es seguro por defecto.
- Nunca pasan por `consultant`. Cuando llegue Tiempo 2 (login restringido) sólo se añaden políticas
  positivas para `channel`, sin quitar nada.
- **Recomendación de Cowork: Variante B.**

### Sobre el `auth.users` (obligado por la FK) — sub-decisión
Como la FK obliga a una fila en `auth.users`, propongo crearla como **cuenta-cáscara sin login**:
`email` técnico o NULL, **sin contraseña**, `banned_until` = 'infinity' (o equivalente), email no
confirmado. Así existe la identidad (satisface la FK) pero **nadie puede iniciar sesión** hasta que
Tiempo 2 lo habilite deliberadamente. El auditor debe validar el método exacto de creación de la
cáscara (Admin API `createUser` con `ban_duration`, o INSERT controlado) contra el modelo Fase 0.
Marca de canal: `role='channel'` ya los identifica; opcionalmente un `tags` = `{canal_externo}` en
user_profiles si se quiere filtrar sin depender del rol.

---

## 4. Re-vinculación de empresas y suministros

- **Suministros**: `cups` no tiene columna de comercial propia (sólo `empresa_id`, `contrato_id`,
  `comercializadora_actual`). El módulo Suministros deriva el comercial de la **empresa**. Por tanto
  re-vincular suministros = re-vincular `empresas.comercial_id` (+ `contratos.comercial_id`). No hay
  UPDATE sobre `cups`.
- **Contratos**: UPDATE `contratos.comercial_id` de las filas del canal (identificadas por el cruce
  staging→external_id). Directo y no ambiguo: cada contrato tiene un único `comercial` en el libro.
- **Empresas**: aquí hay ambigüedad. Regla propuesta: asignar `empresas.comercial_id` al canal
  **sólo** si la empresa está hoy en NULL **y todos** sus contratos LV son de ese único canal.

  Reparto limpio (empresas asignables sin ambigüedad):
  | Canal | empresas limpias |
  |---|---:|
  | Jose Ignacio | 33 |
  | Joaquin Llorente | 32 |
  | Herquesa | 8 |
  | Damaris | 3 |
  | **Total limpias** | **76** |
  | **Empresas mezcladas (multi-comercial)** | **11** → se dejan en NULL, revisión manual |

  Las 11 mezcladas comparten contratos de más de un comercial sin mapear (p. ej. Herquesa + Jose
  Ignacio). No se auto-asignan; quedan listadas para que Juan decida caso a caso.

---

## 5. Reversibilidad

- Todos los contratos afectados llevan ya `external_id = 'LV:...'`; el UPDATE se acota por ese patrón
  y por el `comercial` del staging → **reversible quirúrgicamente** (volver `comercial_id` a NULL de
  las filas de un canal concreto).
- Los perfiles nuevos se marcan con `role='channel'` (y/o tag), de modo que borrarlos = filtrar por
  ese marcador. Como no tienen datos propios más allá del vínculo, revertir es limpio.
- Ninguna de las 56 empresas base ni los 104 CUPS vivos (Potencias/FV) entra en este cambio: sólo
  se tocan filas hoy en `comercial_id IS NULL` provenientes del libro.

---

## 6. Decisiones que necesito antes de ejecutar

1. **Auditor:** ¿Variante A o B para el rol? (Cowork recomienda B.) Y validar el método de creación
   de la cáscara `auth.users` sin login contra Fase 0.
2. **Juan (clasificación):**
   - ¿`ANTONIO` (21) = Antonio Rodriguez interno? (remapeo al perfil existente, no es canal)
   - ¿`JUAN RODRIGUEZ`, `EMILIO`, `PEDRO LANUZA` son internos (perfil propio) o canales?
   - ¿`JOAQUIN` (3) se funde con `JOAQUIN LLORENTE`? (asumo que sí)
   - `RENOVACION`, `TACITA`, `null`: se dejan sin comercial, ¿de acuerdo?
3. **Juan (empresas mezcladas):** las 11 multi-comercial, ¿revisión manual posterior o alguna regla
   automática (p. ej. canal con más contratos en esa empresa)?

Con esas respuestas, redacto la migración `fase1_2_canales.sql` definitiva (perfiles + re-vínculos +
recuentos antes/después) y la traigo para OK final. **Nada se ejecuta hasta entonces.**
