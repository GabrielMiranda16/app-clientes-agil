import { supabase } from '@/lib/customSupabaseClient';

export const atestadosService = {
  async getAtestadosByApolice(apolice_id) {
    try {
      const { data, error } = await supabase
        .from('atestados')
        .select('*, beneficiarios(nome_completo, cpf)')
        .eq('apolice_id', apolice_id)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar atestados da apólice:', error);
      throw new Error('Não foi possível carregar os atestados.');
    }
  },

  async createAtestado(atestadoData) {
    try {
      const { data, error } = await supabase
        .from('atestados')
        .insert([atestadoData])
        .select('*, beneficiarios(nome_completo, cpf)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar atestado:', error);
      throw new Error('Não foi possível cadastrar o atestado.');
    }
  },

  async deleteAtestado(id) {
    try {
      const { error } = await supabase.from('atestados').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir atestado:', error);
      throw new Error('Não foi possível excluir o atestado.');
    }
  },
};
