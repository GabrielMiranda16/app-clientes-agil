alter table public.atestados
  add column if not exists status text not null default 'PENDENTE',
  add column if not exists motivo_recusa text,
  add column if not exists recusa_detalhe text,
  add column if not exists decidido_por text,
  add column if not exists decidido_em timestamptz,
  add column if not exists horas numeric(5,2),
  add column if not exists mesmo_motivo_de bigint references public.atestados(id) on delete set null,
  add column if not exists etapa text,
  add column if not exists inss_encaminhado_em date,
  add column if not exists pericia_data date,
  add column if not exists beneficio_numero text,
  add column if not exists beneficio_inicio date,
  add column if not exists beneficio_fim date,
  add column if not exists retorno_previsto date,
  add column if not exists retorno_efetivo date,
  add column if not exists exame_retorno_data timestamptz,
  add column if not exists exame_retorno_local text,
  add column if not exists exame_retorno_medico text,
  add column if not exists exame_retorno_resultado text,
  add column if not exists exame_retorno_arquivo_path text;

alter table public.atestados drop constraint if exists atestados_status_check;
alter table public.atestados add constraint atestados_status_check
  check (status in ('PENDENTE', 'APROVADO', 'RECUSADO', 'SEM_ABONO'));

alter table public.beneficiarios
  add column if not exists salario numeric(12,2);

create table if not exists public.atestado_anotacoes (
  id bigint generated always as identity primary key,
  atestado_id bigint not null references public.atestados(id) on delete cascade,
  empresa_id bigint not null,
  texto text not null,
  autor text,
  created_at timestamptz not null default now()
);

alter table public.atestado_anotacoes enable row level security;

drop policy if exists atestado_anotacoes_admin on public.atestado_anotacoes;
create policy atestado_anotacoes_admin on public.atestado_anotacoes for all
  using (current_user_perfil() = any (array['CEO','ADM']))
  with check (current_user_perfil() = any (array['CEO','ADM']));

drop policy if exists atestado_anotacoes_cliente on public.atestado_anotacoes;
create policy atestado_anotacoes_cliente on public.atestado_anotacoes for all
  using (current_user_perfil() = 'CLIENTE' and empresa_id in (
    select id from empresas where id = current_user_empresa_matriz_id() or empresa_matriz_id = current_user_empresa_matriz_id()))
  with check (current_user_perfil() = 'CLIENTE' and empresa_id in (
    select id from empresas where id = current_user_empresa_matriz_id() or empresa_matriz_id = current_user_empresa_matriz_id()));

create table if not exists public.atestados_config (
  empresa_id bigint primary key,
  prazo_entrega_dias integer not null default 2,
  soma_inss text not null default 'MESMO_MOTIVO' check (soma_inss in ('MESMO_MOTIVO', 'QUALQUER_MOTIVO')),
  salario_base numeric(12,2) not null default 1621,
  encargos_percentual numeric(5,2) not null default 0,
  limitar_custo_15_dias boolean not null default true,
  meta_absenteismo numeric(5,2) not null default 4,
  updated_at timestamptz not null default now()
);

alter table public.atestados_config enable row level security;

drop policy if exists atestados_config_admin on public.atestados_config;
create policy atestados_config_admin on public.atestados_config for all
  using (current_user_perfil() = any (array['CEO','ADM']))
  with check (current_user_perfil() = any (array['CEO','ADM']));

drop policy if exists atestados_config_cliente on public.atestados_config;
create policy atestados_config_cliente on public.atestados_config for all
  using (current_user_perfil() = 'CLIENTE' and empresa_id = current_user_empresa_matriz_id())
  with check (current_user_perfil() = 'CLIENTE' and empresa_id = current_user_empresa_matriz_id());

create table if not exists public.modulos_empresa (
  empresa_id bigint primary key,
  atestados boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.modulos_empresa enable row level security;

drop policy if exists modulos_empresa_admin on public.modulos_empresa;
create policy modulos_empresa_admin on public.modulos_empresa for all
  using (current_user_perfil() = any (array['CEO','ADM']))
  with check (current_user_perfil() = any (array['CEO','ADM']));

drop policy if exists modulos_empresa_cliente_select on public.modulos_empresa;
create policy modulos_empresa_cliente_select on public.modulos_empresa for select
  using (current_user_perfil() = 'CLIENTE' and empresa_id = current_user_empresa_matriz_id());

insert into public.modulos_empresa (empresa_id, atestados)
select id, true from public.empresas
where regexp_replace(coalesce(cnpj, ''), '\D', '', 'g') = '11144477735' and empresa_matriz_id is null
on conflict (empresa_id) do update set atestados = true;
