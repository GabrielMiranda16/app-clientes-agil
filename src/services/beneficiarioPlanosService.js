import { supabase } from '@/lib/customSupabaseClient';

export const beneficiarioPlanosService = {
  async getByApoliceId(apolice_id) {
    try {
      const { data, error } = await supabase
        .from('beneficiario_planos')
        .select('*')
        .eq('apolice_id', apolice_id)
        .eq('ativo', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar vínculos da apólice:', error);
      return [];
    }
  },

  async getByBeneficiarioIds(beneficiarioIds) {
    try {
      if (!beneficiarioIds || beneficiarioIds.length === 0) return [];
      const { data, error } = await supabase
        .from('beneficiario_planos')
        .select('*')
        .eq('ativo', true)
        .in('beneficiario_id', beneficiarioIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar vínculos dos beneficiários:', error);
      return [];
    }
  },

  // Mantém o vínculo do beneficiário com a apólice sincronizado com o
  // status do plano: desativa qualquer vínculo antigo desse tipo que não
  // seja a apólice atual, e ativa/atualiza o vínculo certo.
  async syncPlano(beneficiarioId, tipo, { ativo, apoliceId, ...campos }) {
    try {
      let desativarQuery = supabase
        .from('beneficiario_planos')
        .update({ ativo: false })
        .eq('beneficiario_id', beneficiarioId)
        .eq('tipo', tipo)
        .eq('ativo', true);
      if (ativo && apoliceId) desativarQuery = desativarQuery.neq('apolice_id', apoliceId);

      const { error: desativarError } = await desativarQuery;
      if (desativarError) throw desativarError;

      if (!ativo || !apoliceId) return;

      const { error: upsertError } = await supabase
        .from('beneficiario_planos')
        .upsert(
          { beneficiario_id: beneficiarioId, apolice_id: apoliceId, tipo, ativo: true, ...campos },
          { onConflict: 'beneficiario_id,apolice_id,tipo' }
        );
      if (upsertError) throw upsertError;
    } catch (error) {
      console.error(`Erro ao sincronizar vínculo (${tipo}) do beneficiário:`, error);
      throw new Error('Não foi possível atualizar o vínculo com a apólice.');
    }
  },
};
