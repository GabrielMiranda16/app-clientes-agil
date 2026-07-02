import { supabase } from '@/lib/customSupabaseClient';
import { cleanBeneficiarioData } from '@/lib/beneficiarioValidator';

export const beneficiariosService = {
  async getAllBeneficiarios() {
    try {
      const { data, error } = await supabase
        .from('beneficiarios')
        .select('*')
        .order('nome_completo');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar todos os beneficiários:', error);
      throw new Error('Não foi possível carregar a lista de beneficiários.');
    }
  },

  async getBeneficiariosByEmpresa(empresa_id) {
    try {
      const { data, error } = await supabase
        .from('beneficiarios')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('nome_completo');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar beneficiários da empresa:', error);
      throw new Error('Não foi possível carregar os beneficiários desta empresa.');
    }
  },

  async createBeneficiario(beneficiarioData) {
    try {
      const cleanedData = cleanBeneficiarioData(beneficiarioData);

      const { data, error } = await supabase
        .from('beneficiarios')
        .insert([cleanedData])
        .select()
        .single();

      if (error) throw error;

      supabase.from('leads').insert({
        nome: data.nome_completo,
        cpf: data.cpf || null,
        data_nascimento: data.data_nascimento || null,
        email: data.email_beneficiario || null,
        telefone: data.celular || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        origem: 'beneficiario',
        status: 'convertido',
      }).catch(() => {});

      return data;
    } catch (error) {
      console.error('Erro ao criar beneficiário:', error);
      throw new Error('Não foi possível cadastrar o beneficiário. Verifique os dados e tente novamente.');
    }
  },

  async updateBeneficiario(id, updateData) {
    console.log(`[BeneficiariosService] Updating beneficiario ID: ${id}`);
    
    try {
      // Create a copy to avoid mutating the original object
      const cleanedData = { ...updateData };
      
      // 1. Remove system fields that should not be manually updated
      delete cleanedData.id;
      delete cleanedData.created_at;
      delete cleanedData.updated_at;

      // 2. Remove empty fields (undefined or empty strings)
      // This allows for partial updates where we only send changed fields,
      // and prevents overwriting existing data with empty strings from a form.
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined || cleanedData[key] === '') {
          delete cleanedData[key];
        }
      });

      console.log('[BeneficiariosService] Update payload:', cleanedData);

      // Check if there's anything left to update
      if (Object.keys(cleanedData).length === 0) {
        console.warn('[BeneficiariosService] No valid fields to update');
        // Retrieve current data to return consistent response
        const { data: currentData, error: fetchError } = await supabase
          .from('beneficiarios')
          .select()
          .eq('id', id)
          .single();
          
        if (fetchError) throw fetchError;
        return currentData;
      }

      // 3. Perform update
      const { data, error } = await supabase
        .from('beneficiarios')
        .update(cleanedData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[BeneficiariosService] Supabase error:', error);
        throw error;
      }

      if (!data) {
         console.error('[BeneficiariosService] No data returned');
         throw new Error('Update completed but no data returned from database');
      }

      console.log('[BeneficiariosService] Update successful');
      return data;
    } catch (error) {
      console.error('[BeneficiariosService] Critical error updating beneficiario:', error);
      throw new Error(`Não foi possível atualizar o beneficiário: ${error.message}`);
    }
  },

  async deleteBeneficiario(id) {
    try {
      const { error } = await supabase
        .from('beneficiarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao excluir beneficiário:', error);
      throw new Error('Não foi possível excluir o beneficiário.');
    }
  }
};