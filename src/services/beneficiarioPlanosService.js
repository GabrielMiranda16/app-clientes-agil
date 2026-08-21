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
};
