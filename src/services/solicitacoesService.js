import { supabase } from '@/lib/customSupabaseClient';
import { cleanSolicitacaoData } from '@/lib/solicitacaoValidator';

export const solicitacoesService = {
  async getAllSolicitacoes() {
    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select(`
          *,
          beneficiarios (
            nome_completo,
            cpf
          ),
          empresa:empresas (
            razao_social,
            nome_fantasia,
            tipo,
            empresa_matriz_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar todas as solicitações:', error);
      throw new Error('Não foi possível carregar a lista de solicitações.');
    }
  },

  async getSolicitacoesByEmpresa(empresa_id) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select(`
          *,
          beneficiarios (
            nome_completo,
            cpf
          )
        `)
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar solicitações da empresa:', error);
      throw new Error('Não foi possível carregar as solicitações desta empresa.');
    }
  },

  async createSolicitacao(solicitacaoData) {
    try {
      const cleanedData = cleanSolicitacaoData(solicitacaoData);
      
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert([cleanedData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw new Error('Não foi possível registrar a solicitação. Verifique os dados e tente novamente.');
    }
  },

  async updateSolicitacao(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      throw new Error(error?.message || 'Não foi possível atualizar a solicitação.');
    }
  },

  async cancelPendingByEmpresa(empresa_id) {
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: 'CANCELADA' })
        .eq('empresa_id', empresa_id)
        .in('status', ['PENDENTE', 'EM PROCESSAMENTO']);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao cancelar solicitações:', error);
      throw new Error('Não foi possível cancelar as solicitações.');
    }
  },

  async cancelSolicitacao(id) {
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: 'CANCELADA' })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Cancel solicitacao error:', error);
      throw new Error(error?.message || 'Não foi possível cancelar a solicitação.');
    }
  },

  async deleteSolicitacao(id) {
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete solicitacao error:', error);
      throw new Error('Não foi possível deletar a solicitação.');
    }
  }
};