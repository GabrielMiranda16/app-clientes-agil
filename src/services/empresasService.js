import { supabase } from '@/lib/customSupabaseClient';
import { cleanEmpresaData } from '@/lib/empresaValidator';

export const empresasService = {
  async getEmpresas() {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select(`
          *,
          matriz:empresas!empresa_matriz_id (
            razao_social,
            nome_fantasia
          )
        `)
        .order('razao_social', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      throw new Error('Não foi possível carregar a lista de empresas.');
    }
  },

  async createEmpresa(empresaData) {
    try {
      const cleanedData = cleanEmpresaData(empresaData);

      const { data, error } = await supabase
        .from('empresas')
        .insert([cleanedData])
        .select()
        .single();

      if (error) throw error;

      supabase.from('leads').insert({
        nome: data.nome_fantasia || data.razao_social,
        nome_empresa: data.razao_social || null,
        cnpj: data.cnpj || null,
        email: data.email_cliente || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        origem: 'cliente',
        status: 'convertido',
      }).catch(() => {});

      return data;
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      throw new Error('Não foi possível cadastrar a empresa. Verifique se o CNPJ já está cadastrado.');
    }
  },

  async updateEmpresa(id, updateData) {
    try {
      const cleanedData = cleanEmpresaData(updateData);
      
      // Ensure ID is not included in the update payload
      if (cleanedData.id) delete cleanedData.id;

      const { data, error } = await supabase
        .from('empresas')
        .update(cleanedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      throw new Error('Não foi possível atualizar a empresa.');
    }
  },

  async deleteEmpresa(id) {
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      // Specific error handling for foreign key constraints is often helpful here
      throw new Error('Não foi possível excluir a empresa. Verifique se existem beneficiários ou dados vinculados a ela.');
    }
  }
};