alter table public.atestados
  add column if not exists tipo text not null default 'ATESTADO',
  add column if not exists data_emissao date,
  add column if not exists dias_afastamento integer,
  add column if not exists cid text,
  add column if not exists medico_nome text,
  add column if not exists crm text,
  add column if not exists crm_uf text,
  add column if not exists arquivo_path text,
  add column if not exists ia_dados jsonb;

alter table public.atestados enable row level security;

drop policy if exists atestados_admin on public.atestados;
create policy atestados_admin on public.atestados for all
  using (current_user_perfil() = any (array['CEO','ADM']))
  with check (current_user_perfil() = any (array['CEO','ADM']));

drop policy if exists atestados_cliente on public.atestados;
create policy atestados_cliente on public.atestados for all
  using (current_user_perfil() = 'CLIENTE' and empresa_id in (
    select id from empresas where id = current_user_empresa_matriz_id() or empresa_matriz_id = current_user_empresa_matriz_id()))
  with check (current_user_perfil() = 'CLIENTE' and empresa_id in (
    select id from empresas where id = current_user_empresa_matriz_id() or empresa_matriz_id = current_user_empresa_matriz_id()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atestados', 'atestados', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists atestados_storage_admin on storage.objects;
create policy atestados_storage_admin on storage.objects for all
  using (bucket_id = 'atestados' and current_user_perfil() = any (array['CEO','ADM']))
  with check (bucket_id = 'atestados' and current_user_perfil() = any (array['CEO','ADM']));

drop policy if exists atestados_storage_cliente on storage.objects;
create policy atestados_storage_cliente on storage.objects for all
  using (bucket_id = 'atestados' and current_user_perfil() = 'CLIENTE' and (storage.foldername(name))[1] in (
    select id::text from empresas where id = current_user_empresa_matriz_id() or empresa_matriz_id = current_user_empresa_matriz_id()))
  with check (bucket_id = 'atestados' and current_user_perfil() = 'CLIENTE' and (storage.foldername(name))[1] in (
    select id::text from empresas where id = current_user_empresa_matriz_id() or empresa_matriz_id = current_user_empresa_matriz_id()));
