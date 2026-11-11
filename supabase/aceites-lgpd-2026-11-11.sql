create table if not exists public.aceites_lgpd (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  email text,
  modulo text not null,
  versao text not null default '2026-11-11',
  aceito_em timestamptz not null default now(),
  unique (user_id, modulo, versao)
);

alter table public.aceites_lgpd enable row level security;

drop policy if exists aceites_lgpd_proprio_select on public.aceites_lgpd;
create policy aceites_lgpd_proprio_select on public.aceites_lgpd for select
  using (user_id = auth.uid() or current_user_perfil() = any (array['CEO','ADM']));

drop policy if exists aceites_lgpd_proprio_insert on public.aceites_lgpd;
create policy aceites_lgpd_proprio_insert on public.aceites_lgpd for insert
  with check (user_id = auth.uid());
