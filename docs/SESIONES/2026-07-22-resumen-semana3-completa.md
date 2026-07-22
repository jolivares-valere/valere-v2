# Sesion 2026-07-21/22 (maraton nocturno) — Semana 3 completa + 4 fixes de fondo

## Que se hizo
1. PR-3.1 catalogo comercializadoras: disenado, BBDD aplicada (extension del maestro
   de la calculadora — retailers es vista), seed 20 canales/28 condiciones del doc
   REGLAS v2, selector en ContratoForm, backfill 543 contratos. MERGEADO #78 y
   SELLADO por paseo del auditor.
2. PR-3.2 asistente alta 4 pasos (adaptativo por tarifa, renovacion autogenerada,
   aviso no-comisiona, reintento sin duplicados, +4 tests -> 199). MERGEADO #79.
   Alta real NAGINI ejecutada.
3. PR-3.3 documentos OCR-ready (tipo_documento + comercializadora_id + nombres
   normalizados + EF service_role). MERGEADO.
4. CUATRO FIXES de fondo cazados por el circuito, todos mergeados:
   a) soft-delete bloqueado por RLS en TODAS las tablas (policy lectura deleted_at
      IS NULL invalida la fila al borrarla) -> RPC soft_delete SECURITY DEFINER.
   b) documentos.tamanio -> tamano_bytes (insert roto).
   c) documentos.tipo legacy: el codigo escribia la EXTENSION y violaba el check ->
      mapa TIPO_LEGACY.
   d) documentos_subido_por_fkey apuntaba a auth.users -> listado 400 DE NACIMIENTO
      (vacio deshonesto que se comia el error) -> FK a user_profiles + error honesto
      + borrado compensatorio de huerfanos + guard doble-click.
5. Ops de datos con OK: backfill comercializadora_id (544=543+1 Pendiente demo) ·
   unificaciones GANA/SILVER/Endesa Energia · EDP->EDP GC (PEREGRIN) · purga
   huerfanos Storage (cuadre 1 fila + 1 objeto).
6. Doc REGLAS v2 en Drive editado (CYE 50%, Eleia Zoco confirmados).

## Lecciones (memoria actualizada)
- Soft-delete + RLS lectura = 42501: feedback_supabase_softdelete_rls.md.
- La feature Documentos estaba rota de nacimiento en 3 capas: nunca dar por hecha
  una feature sin paseo de punta a punta.

## Pendiente
- Veredictos formales auditor (3.2/3.3 con fixes) -> sellar 3/3 en el plan.
- GATE V3 viernes: Julia o Antonio.
- Deuda de esquema tipo->tipo_documento (backlog).
