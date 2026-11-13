create or replace function public.current_user_perfil()
returns text language sql security definer stable
set search_path = public as $$
  select u.perfil from public.users u
  where u.email = (auth.jwt() ->> 'email')
    and (coalesce(u.ativo, true) or u.perfil in ('CEO', 'ADM'))
$$;

create or replace function public.current_user_empresa_matriz_id()
returns int language sql security definer stable
set search_path = public as $$
  select coalesce(u.empresa_matriz_id, u.empresa_id)::int
  from public.users u
  where u.email = (auth.jwt() ->> 'email')
    and (coalesce(u.ativo, true) or u.perfil in ('CEO', 'ADM'))
$$;
