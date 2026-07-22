-- FIX listado de documentos (re-paseo PR-3.3, 22-jul-2026) — APLICADA via MCP con OK de Juan.
-- documentos_subido_por_fkey apuntaba a auth.users -> el embed PostgREST
-- user_profiles!documentos_subido_por_fkey devolvia PGRST200/400 DESDE SIEMPRE y la
-- pestana Documentos se pintaba vacia (el estado vacio se comia el error; tambien
-- arreglado en frontend). Re-apuntado a user_profiles (1:1 con auth.users, patron del
-- resto del esquema). Pre-check: 0 filas con subido_por sin perfil.
alter table public.documentos drop constraint documentos_subido_por_fkey;
alter table public.documentos
  add constraint documentos_subido_por_fkey
  foreign key (subido_por) references public.user_profiles(id);
notify pgrst, 'reload schema';
