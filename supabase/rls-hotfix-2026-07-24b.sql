-- =============================================================================
-- HOTFIX executado em produção em 2026-07-24, minutos após o rls-policies-2026-07-24.sql.
--
-- O QUE ACONTECEU: o script anterior assumiu (com base no arquivo antigo
-- supabase/rls-policies.sql) que as tabelas empresas, beneficiarios,
-- coparticipacoes e apolices já tinham policies próprias (*_admin,
-- *_cliente_select) e só precisavam ter a policy "allow_all" removida.
-- Na verdade, essas 4 tabelas tinham SOMENTE "allow_all" — nenhuma outra
-- policy existia de verdade no banco. Ao remover "allow_all" sem criar as
-- policies substitutas, essas tabelas ficaram com RLS ativo e ZERO
-- policies, o que no Postgres significa bloqueio total para todo mundo
-- (inclusive CEO/ADM) — daí o CEO não conseguir mais ver nada.
--
-- Nenhum dado foi perdido em momento nenhum (confirmado por COUNT(*) direto
-- nas tabelas via acesso de superusuário) — foi só um problema de permissão.
--
-- Este script recria as policies que deveriam ter sido criadas desde o início.
-- =============================================================================

BEGIN;

-- empresas
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

-- beneficiarios
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

-- coparticipacoes
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

-- apolices
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

COMMIT;

-- =============================================================================
-- Achado adicional no mesmo incidente: o provedor de login por e-mail/senha
-- estava DESLIGADO no projeto inteiro (Authentication → Providers → Email),
-- o que impedia QUALQUER login via Supabase Auth — provavelmente configurado
-- assim há muito tempo, mascarado porque o código antigo de login ignorava
-- silenciosamente erros de sincronização com o Supabase Auth. Reativado via
-- Management API (external_email_enabled: true). Sem isso, mesmo com as RLS
-- corretas, ninguém conseguiria logar.
--
-- Achado adicional #2: a edge function sync-auth-password tinha um bug de
-- import (`import * as bcrypt` em vez de `import bcrypt` — bcryptjs via
-- esm.sh) que fazia bcrypt.compare falhar sempre com "bcrypt.compare is not
-- a function". Também mascarado pelo mesmo motivo. Corrigido e redeployado.
-- =============================================================================
