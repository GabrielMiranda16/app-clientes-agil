-- =============================================================================
-- Rodar manualmente no SQL Editor do Supabase (projeto ersrbtyrwlljhkomqfpk).
-- Não mexe em RLS/policies nem apaga nenhum dado — só troca o comportamento
-- do DELETE em beneficiarios de "bloquear" para "desvincular".
--
-- PROBLEMA: excluir um beneficiário que já tem coparticipação (e o mesmo
-- valeria para solicitação) dava erro de foreign key, porque a constraint
-- não tinha ON DELETE definido (bloqueia por padrão).
--
-- POR QUE ON DELETE SET NULL É SEGURO AQUI (não perde dado nenhum):
-- - coparticipacoes já guarda nome_quem_utilizou/cpf_quem_utilizou em campos
--   próprios (não depende do JOIN com beneficiarios pra mostrar quem usou) —
--   ver src/pages/CoparticipacaoPage.jsx.
-- - solicitacoes já foi construída esperando beneficiario_id nulo: o
--   front mostra "Beneficiário Removido" quando isso acontece — ver
--   src/pages/SolicitacoesPage.jsx linhas 664/717/822/860.
-- Ou seja: o histórico financeiro e de solicitações continua 100% intacto e
-- legível, só o vínculo com a linha apagada de beneficiarios é desfeito.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.coparticipacoes'::regclass
    AND confrelid = 'public.beneficiarios'::regclass
    AND contype = 'f';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.coparticipacoes DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.coparticipacoes ALTER COLUMN beneficiario_id DROP NOT NULL;

  ALTER TABLE public.coparticipacoes
    ADD CONSTRAINT coparticipacoes_beneficiario_id_fkey
    FOREIGN KEY (beneficiario_id) REFERENCES public.beneficiarios(id) ON DELETE SET NULL;
END $$;

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.solicitacoes'::regclass
    AND confrelid = 'public.beneficiarios'::regclass
    AND contype = 'f';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.solicitacoes DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.solicitacoes ALTER COLUMN beneficiario_id DROP NOT NULL;

  ALTER TABLE public.solicitacoes
    ADD CONSTRAINT solicitacoes_beneficiario_id_fkey
    FOREIGN KEY (beneficiario_id) REFERENCES public.beneficiarios(id) ON DELETE SET NULL;
END $$;

COMMIT;
