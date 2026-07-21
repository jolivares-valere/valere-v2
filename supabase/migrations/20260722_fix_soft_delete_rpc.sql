-- FIX transversal soft-delete (21-jul-2026) — APLICADA EN PRODUCCION via MCP con OK de Juan.
-- BUG: las policies de lectura con USING (deleted_at IS NULL) hacen que el UPDATE de
-- soft-delete "esconda" la fila nueva y Postgres lo rechace (42501: new row violates
-- row-level security policy) para TODOS los roles en TODAS las tablas con ese patron.
-- Nadie podia borrar nada desde el endurecimiento RLS. Descubierto al intentar borrar
-- la empresa de prueba del asistente PR-3.2.
-- SOLUCION: RPC SECURITY DEFINER unica con whitelist de tablas y chequeo de permisos
-- ESPEJO de las policies de delete. Las policies de lectura NO se relajan.

create or replace function public.soft_delete(p_tabla text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text := get_user_rol();
  v_ok boolean := false;
  v_rows int;
begin
  if v_uid is null then
    raise exception 'soft_delete: no autenticado';
  end if;

  case p_tabla
    when 'empresas'     then v_ok := v_rol = 'admin';                -- espejo e_delete
    when 'contratos'    then v_ok := v_rol = 'admin';                -- espejo c_delete
    when 'renovaciones' then v_ok := is_manager_or_above();          -- espejo renovaciones_delete
    when 'incidencias'  then v_ok := is_manager_or_above();          -- espejo incidencias_delete
    when 'documentos'   then v_ok := v_rol in ('admin','jefe_equipo','comercial'); -- espejo doc_delete
    when 'eventos'      then v_ok := v_rol in ('admin','jefe_equipo','comercial'); -- espejo ev_delete
    when 'actividades'  then                                          -- espejo a_delete
      v_ok := v_rol in ('admin','jefe_equipo')
        or exists (select 1 from actividades a where a.id = p_id and a.usuario_id = v_uid);
    when 'contactos'    then                                          -- espejo co_delete
      v_ok := v_rol in ('admin','jefe_equipo')
        or (v_rol = 'comercial' and exists (
              select 1 from contactos ct join empresas e on e.id = ct.empresa_id
              where ct.id = p_id and e.comercial_id = v_uid));
    else
      raise exception 'soft_delete: tabla no permitida (%)', p_tabla;
  end case;

  if not v_ok then
    raise exception 'soft_delete: permiso denegado para % (rol %)', p_tabla, v_rol;
  end if;

  execute format('update public.%I set deleted_at = now() where id = $1 and deleted_at is null', p_tabla)
    using p_id;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end
$$;

revoke execute on function public.soft_delete(text, uuid) from public;
revoke execute on function public.soft_delete(text, uuid) from anon;
grant execute on function public.soft_delete(text, uuid) to authenticated;
