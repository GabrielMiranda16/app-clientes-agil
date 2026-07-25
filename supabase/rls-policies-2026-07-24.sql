-- =============================================================================
-- JÁ EXECUTADO em produção em 2026-07-24 (via Management API do Supabase).
-- Achado: existia uma policy "allow_all" (public, ALL, USING true) em quase
-- toda tabela, que anulava qualquer outra policy mais restrita — ou seja,
-- a chave anon (pública, embutida no JS do site) conseguia ler/escrever
-- livremente em users (com hash de senha), beneficiarios, orcamentos etc.
-- Este arquivo documenta exatamente o que foi rodado. Ver também
-- supabase/rls-policies.sql (versão anterior, parcialmente aplicada).
-- =============================================================================

BEGIN;

-- ============================================================
-- 0. Remove a policy "allow_all" (public, ALL, true) que anulava
--    todas as outras policies em praticamente toda tabela.
-- ============================================================
DROP POLICY IF EXISTS "allow_all" ON public.apolices;
DROP POLICY IF EXISTS "allow_all" ON public.beneficiarios;
DROP POLICY IF EXISTS "allow_all" ON public.boletos;
DROP POLICY IF EXISTS "allow_all" ON public.comissoes;
DROP POLICY IF EXISTS "allow_all" ON public.coparticipacoes;
DROP POLICY IF EXISTS "allow_all" ON public.empresas;
DROP POLICY IF EXISTS "allow_all" ON public.orcamento_acessos;
DROP POLICY IF EXISTS "allow_all" ON public.orcamento_documentos;
DROP POLICY IF EXISTS "allow_all" ON public.orcamentos;
DROP POLICY IF EXISTS "allow_all" ON public.parceiros;
DROP POLICY IF EXISTS "allow_all" ON public.solicitacoes;
DROP POLICY IF EXISTS "allow_all" ON public.termos_log;
DROP POLICY IF EXISTS "allow_all" ON public.users;

-- Remove policies "authenticated full access" genéricas demais
-- (davam a QUALQUER usuário logado, de qualquer perfil/empresa, acesso total)
DROP POLICY IF EXISTS "auth full access comissoes" ON public.comissoes;
DROP POLICY IF EXISTS "auth full access orcamento_acessos" ON public.orcamento_acessos;
DROP POLICY IF EXISTS "auth full access orcamento_documentos" ON public.orcamento_documentos;
DROP POLICY IF EXISTS "auth full access orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "auth full access parceiros" ON public.parceiros;

-- Remove policies antigas de acesso público direto em orcamentos
-- (substituídas por RPCs SECURITY DEFINER mais abaixo)
DROP POLICY IF EXISTS "anon read orcamento by slug" ON public.orcamentos;
DROP POLICY IF EXISTS "anon update orcamento documentos" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_public_slug" ON public.orcamentos;

-- Remove policies antigas de leitura pública em orcamento_documentos
-- (substituídas por RPC; insert direto continua permitido pro upload do cliente)
DROP POLICY IF EXISTS "Clientes publicos ver docs" ON public.orcamento_documentos;
DROP POLICY IF EXISTS "anon insert orcamento_documentos" ON public.orcamento_documentos;
DROP POLICY IF EXISTS "anon_insert_docs" ON public.orcamento_documentos;

-- Consolida policy de tracking em orcamento_acessos (era ALL demais)
DROP POLICY IF EXISTS "anon all orcamento_acessos" ON public.orcamento_acessos;

-- ============================================================
-- 1. Funções auxiliares (recriação idempotente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_perfil()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT u.perfil FROM public.users u WHERE u.email = (auth.jwt() ->> 'email')
$$;

CREATE OR REPLACE FUNCTION public.current_user_empresa_matriz_id()
RETURNS int LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(u.empresa_matriz_id, u.empresa_id)::int
  FROM public.users u
  WHERE u.email = (auth.jwt() ->> 'email')
$$;

CREATE OR REPLACE FUNCTION public.current_parceiro_id()
RETURNS int LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT p.id FROM public.parceiros p
  JOIN public.users u ON u.id = p.user_id
  WHERE u.email = (auth.jwt() ->> 'email')
  LIMIT 1
$$;

-- ============================================================
-- 2. users — antes a tabela inteira (com hash de senha) era pública
-- ============================================================
DROP POLICY IF EXISTS "users_self_or_admin_select" ON public.users;
CREATE POLICY "users_self_or_admin_select" ON public.users
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email') OR current_user_perfil() IN ('CEO','ADM')
  );

DROP POLICY IF EXISTS "users_self_or_admin_update" ON public.users;
CREATE POLICY "users_self_or_admin_update" ON public.users
  FOR UPDATE USING (
    email = (auth.jwt() ->> 'email') OR current_user_perfil() IN ('CEO','ADM')
  );

DROP POLICY IF EXISTS "users_admin_insert" ON public.users;
CREATE POLICY "users_admin_insert" ON public.users
  FOR INSERT WITH CHECK (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "users_admin_delete" ON public.users;
CREATE POLICY "users_admin_delete" ON public.users
  FOR DELETE USING (current_user_perfil() IN ('CEO','ADM'));

-- ============================================================
-- 3. comissoes
-- ============================================================
DROP POLICY IF EXISTS "comissoes_admin" ON public.comissoes;
CREATE POLICY "comissoes_admin" ON public.comissoes
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "comissoes_parceiro_select" ON public.comissoes;
CREATE POLICY "comissoes_parceiro_select" ON public.comissoes
  FOR SELECT USING (
    current_user_perfil() = 'PARCEIRO' AND parceiro_id = current_parceiro_id()
  );

-- ============================================================
-- 4. solicitacoes (as policies desenhadas antes nunca tinham sido criadas)
-- ============================================================
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

-- ============================================================
-- 5. termos_log
-- ============================================================
DROP POLICY IF EXISTS "termos_log_admin" ON public.termos_log;
CREATE POLICY "termos_log_admin" ON public.termos_log
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "termos_log_self_insert" ON public.termos_log;
CREATE POLICY "termos_log_self_insert" ON public.termos_log
  FOR INSERT WITH CHECK (
    user_id = (SELECT u.id FROM public.users u WHERE u.email = (auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "termos_log_self_select" ON public.termos_log;
CREATE POLICY "termos_log_self_select" ON public.termos_log
  FOR SELECT USING (
    user_id = (SELECT u.id FROM public.users u WHERE u.email = (auth.jwt() ->> 'email'))
  );

-- ============================================================
-- 6. boletos
-- ============================================================
DROP POLICY IF EXISTS "boletos_admin" ON public.boletos;
CREATE POLICY "boletos_admin" ON public.boletos
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "boletos_cliente" ON public.boletos;
CREATE POLICY "boletos_cliente" ON public.boletos
  FOR ALL USING (
    current_user_perfil() = 'CLIENTE' AND
    apolice_id IN (
      SELECT a.id FROM public.apolices a
      WHERE a.empresa_id IN (
        SELECT id FROM public.empresas
        WHERE id = current_user_empresa_matriz_id() OR empresa_matriz_id = current_user_empresa_matriz_id()
      )
    )
  )
  WITH CHECK (
    current_user_perfil() = 'CLIENTE' AND
    apolice_id IN (
      SELECT a.id FROM public.apolices a
      WHERE a.empresa_id IN (
        SELECT id FROM public.empresas
        WHERE id = current_user_empresa_matriz_id() OR empresa_matriz_id = current_user_empresa_matriz_id()
      )
    )
  );

-- ============================================================
-- 7. leads (RLS estava totalmente desligada)
-- ============================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_admin" ON public.leads;
CREATE POLICY "leads_admin" ON public.leads
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "leads_parceiro_insert" ON public.leads;
CREATE POLICY "leads_parceiro_insert" ON public.leads
  FOR INSERT WITH CHECK (current_user_perfil() = 'PARCEIRO');

-- ============================================================
-- 8. lembretes_adm (RLS estava totalmente desligada)
-- ============================================================
ALTER TABLE public.lembretes_adm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lembretes_adm_admin" ON public.lembretes_adm;
CREATE POLICY "lembretes_adm_admin" ON public.lembretes_adm
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

-- ============================================================
-- 9. orcamento_acessos (tracking anônimo — insere/atualiza, nunca lê/apaga)
-- ============================================================
DROP POLICY IF EXISTS "orcamento_acessos_admin" ON public.orcamento_acessos;
CREATE POLICY "orcamento_acessos_admin" ON public.orcamento_acessos
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "orcamento_acessos_anon_insert" ON public.orcamento_acessos;
CREATE POLICY "orcamento_acessos_anon_insert" ON public.orcamento_acessos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orcamento_acessos_anon_update" ON public.orcamento_acessos;
CREATE POLICY "orcamento_acessos_anon_update" ON public.orcamento_acessos
  FOR UPDATE USING (true);

-- ============================================================
-- 10. orcamento_documentos (leitura pública passa a ser só via RPC;
--     anon continua podendo inserir o próprio upload)
-- ============================================================
DROP POLICY IF EXISTS "orcamento_documentos_admin" ON public.orcamento_documentos;
CREATE POLICY "orcamento_documentos_admin" ON public.orcamento_documentos
  FOR ALL USING (current_user_perfil() IN ('CEO','ADM'));

DROP POLICY IF EXISTS "orcamento_documentos_anon_insert" ON public.orcamento_documentos;
CREATE POLICY "orcamento_documentos_anon_insert" ON public.orcamento_documentos
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 11. RPCs para o link público de orçamento
--     Substituem o SELECT/UPDATE direto e anônimo na tabela orcamentos,
--     que antes permitia listar TODOS os orçamentos (CPF, telefone, valores).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_orcamento_publico(p_slug text)
RETURNS TABLE (
  id bigint, created_at timestamptz, status character varying, slug character varying,
  cliente_nome text, cliente_cpf text, segmento character varying, modalidade text,
  observacoes text, descricao_orcamento text, propostas jsonb, cenarios_atuais jsonb,
  lista_documentos jsonb, docs_extras jsonb, data_orcamento timestamptz,
  valor_mensalidade numeric, operadora_escolhida text, numero_protocolo text, perfil_vidas jsonb
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT o.id, o.created_at, o.status, o.slug, o.cliente_nome, o.cliente_cpf, o.segmento,
         o.modalidade, o.observacoes, o.descricao_orcamento, o.propostas, o.cenarios_atuais,
         o.lista_documentos, o.docs_extras, o.data_orcamento, o.valor_mensalidade,
         o.operadora_escolhida, o.numero_protocolo, o.perfil_vidas
  FROM public.orcamentos o
  WHERE o.slug = p_slug AND o.status NOT IN ('CANCELADA', 'SOLICITACAO')
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_orcamento_publico(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.listar_tipos_documentos_publico(p_orcamento_id bigint)
RETURNS TABLE (tipo_documento text)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT d.tipo_documento
  FROM public.orcamento_documentos d
  JOIN public.orcamentos o ON o.id = d.orcamento_id
  WHERE d.orcamento_id = p_orcamento_id
    AND o.status NOT IN ('CANCELADA', 'SOLICITACAO')
$$;

GRANT EXECUTE ON FUNCTION public.listar_tipos_documentos_publico(bigint) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.aceitar_proposta_publico(
  p_slug text, p_novo_status text, p_valor_mensalidade numeric,
  p_descricao_orcamento text, p_operadora_escolhida text
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_id bigint;
BEGIN
  IF p_novo_status NOT IN ('DOCUMENTOS', 'ASSINATURA') THEN
    RAISE EXCEPTION 'Status inválido.';
  END IF;

  UPDATE public.orcamentos
  SET status = p_novo_status,
      data_documentos = now(),
      valor_mensalidade = COALESCE(p_valor_mensalidade, valor_mensalidade),
      descricao_orcamento = COALESCE(p_descricao_orcamento, descricao_orcamento),
      operadora_escolhida = COALESCE(p_operadora_escolhida, operadora_escolhida)
  WHERE slug = p_slug AND status = 'ORCAMENTO'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado ou já processado.';
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_proposta_publico(text, text, numeric, text, text) TO anon, authenticated;

COMMIT;
