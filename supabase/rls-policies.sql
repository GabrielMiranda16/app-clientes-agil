-- =============================================================================
-- RLS POLICIES — app-clientes-agil (Supabase: ersrbtyrwlljhkomqfpk)
-- Como rodar: Supabase Dashboard → SQL Editor → colar e executar
--
-- Perfis de usuário:
--   CEO   → vê e edita tudo
--   ADM   → vê e edita tudo (funcionários da Ágil Seguros)
--   CLIENTE → vê e edita apenas sua empresa e filiais
--   PARCEIRO → acesso só a orcamentos (via serviços separados)
--   anon  → acesso só a orcamentos ativos pelo slug
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER para acessar tabela users como admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_perfil()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT perfil FROM public.users WHERE email = (auth.jwt() ->> 'email')
$$;

CREATE OR REPLACE FUNCTION public.current_user_empresa_matriz_id()
RETURNS int LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(empresa_matriz_id, empresa_id)::int
  FROM public.users
  WHERE email = (auth.jwt() ->> 'email')
$$;

-- ---------------------------------------------------------------------------
-- Tabela: empresas
-- ---------------------------------------------------------------------------
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_admin" ON public.empresas;
CREATE POLICY "empresas_admin" ON public.empresas
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "empresas_cliente_select" ON public.empresas;
CREATE POLICY "empresas_cliente_select" ON public.empresas
  FOR SELECT USING (
    current_user_perfil() = 'CLIENTE' AND (
      id = current_user_empresa_matriz_id() OR
      empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tabela: beneficiarios
-- ---------------------------------------------------------------------------
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficiarios_admin" ON public.beneficiarios;
CREATE POLICY "beneficiarios_admin" ON public.beneficiarios
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "beneficiarios_cliente_select" ON public.beneficiarios;
CREATE POLICY "beneficiarios_cliente_select" ON public.beneficiarios
  FOR SELECT USING (
    current_user_perfil() = 'CLIENTE' AND
    empresa_id IN (
      SELECT id FROM public.empresas
      WHERE id = current_user_empresa_matriz_id()
         OR empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

DROP POLICY IF EXISTS "beneficiarios_cliente_update" ON public.beneficiarios;
CREATE POLICY "beneficiarios_cliente_update" ON public.beneficiarios
  FOR UPDATE USING (
    current_user_perfil() = 'CLIENTE' AND
    empresa_id IN (
      SELECT id FROM public.empresas
      WHERE id = current_user_empresa_matriz_id()
         OR empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tabela: solicitacoes
-- ---------------------------------------------------------------------------
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitacoes_admin" ON public.solicitacoes;
CREATE POLICY "solicitacoes_admin" ON public.solicitacoes
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "solicitacoes_cliente_select" ON public.solicitacoes;
CREATE POLICY "solicitacoes_cliente_select" ON public.solicitacoes
  FOR SELECT USING (
    current_user_perfil() = 'CLIENTE' AND
    empresa_id IN (
      SELECT id FROM public.empresas
      WHERE id = current_user_empresa_matriz_id()
         OR empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

DROP POLICY IF EXISTS "solicitacoes_cliente_insert" ON public.solicitacoes;
CREATE POLICY "solicitacoes_cliente_insert" ON public.solicitacoes
  FOR INSERT WITH CHECK (
    current_user_perfil() = 'CLIENTE' AND
    empresa_id IN (
      SELECT id FROM public.empresas
      WHERE id = current_user_empresa_matriz_id()
         OR empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tabela: coparticipacoes
-- ---------------------------------------------------------------------------
ALTER TABLE public.coparticipacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coparticipacoes_admin" ON public.coparticipacoes;
CREATE POLICY "coparticipacoes_admin" ON public.coparticipacoes
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "coparticipacoes_cliente_select" ON public.coparticipacoes;
CREATE POLICY "coparticipacoes_cliente_select" ON public.coparticipacoes
  FOR SELECT USING (
    current_user_perfil() = 'CLIENTE' AND
    empresa_id IN (
      SELECT id FROM public.empresas
      WHERE id = current_user_empresa_matriz_id()
         OR empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tabela: apolices
-- ---------------------------------------------------------------------------
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apolices_admin" ON public.apolices;
CREATE POLICY "apolices_admin" ON public.apolices
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "apolices_cliente_select" ON public.apolices;
CREATE POLICY "apolices_cliente_select" ON public.apolices
  FOR SELECT USING (
    current_user_perfil() = 'CLIENTE' AND
    empresa_id IN (
      SELECT id FROM public.empresas
      WHERE id = current_user_empresa_matriz_id()
         OR empresa_matriz_id = current_user_empresa_matriz_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tabela: orcamentos (acesso público por slug + ADM/CEO/PARCEIRO)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamentos_admin" ON public.orcamentos;
CREATE POLICY "orcamentos_admin" ON public.orcamentos
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "orcamentos_parceiro" ON public.orcamentos;
CREATE POLICY "orcamentos_parceiro" ON public.orcamentos
  FOR SELECT USING (
    current_user_perfil() = 'PARCEIRO' AND
    parceiro_id IN (
      SELECT id FROM public.parceiros
      WHERE email = (auth.jwt() ->> 'email')
    )
  );

-- Acesso anon por slug (página pública) — apenas orcamentos não cancelados
DROP POLICY IF EXISTS "orcamentos_public_slug" ON public.orcamentos;
CREATE POLICY "orcamentos_public_slug" ON public.orcamentos
  FOR SELECT USING (
    slug IS NOT NULL AND
    status NOT IN ('CANCELADA', 'SOLICITACAO')
  );

-- ---------------------------------------------------------------------------
-- Tabela: orcamento_acessos (rastreamento — anon pode inserir para tracking)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orcamento_acessos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamento_acessos_admin" ON public.orcamento_acessos;
CREATE POLICY "orcamento_acessos_admin" ON public.orcamento_acessos
  FOR ALL USING (current_user_perfil() IN ('CEO', 'ADM'));

DROP POLICY IF EXISTS "orcamento_acessos_anon_insert" ON public.orcamento_acessos;
CREATE POLICY "orcamento_acessos_anon_insert" ON public.orcamento_acessos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orcamento_acessos_anon_update" ON public.orcamento_acessos;
CREATE POLICY "orcamento_acessos_anon_update" ON public.orcamento_acessos
  FOR UPDATE USING (true);

-- =============================================================================
-- IMPORTANTE: usuários que ainda não migraram para Supabase Auth (bcrypt antigo)
-- não terão auth.jwt() válido e serão bloqueados por essas policies.
-- A edge function `sync-auth-password` migra o usuário no primeiro login.
-- Se algum usuário for bloqueado, peça que ele faça logout e login novamente.
-- =============================================================================
