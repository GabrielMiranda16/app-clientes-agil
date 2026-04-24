import { supabase } from '@/lib/customSupabaseClient';

export const SEGMENTOS = {
  SAUDE_VIDA_ODONTO: { label: 'Saúde, Vida e Odonto',  slug: 'saude-vida-odonto' },
  AUTO_FROTA:        { label: 'Auto e Frota',           slug: 'auto-frota'        },
  VIAGEM:            { label: 'Viagem',                 slug: 'viagem'            },
  RESIDENCIAL:       { label: 'Residencial',            slug: 'residencial'       },
  PET_SAUDE:         { label: 'Pet Saúde',              slug: 'pet-saude'         },
  EMPRESARIAL:       { label: 'Empresarial',            slug: 'empresarial'       },
  CARGAS:            { label: 'Cargas',                 slug: 'cargas'            },
  EQUIPAMENTOS:      { label: 'Equipamentos',           slug: 'equipamentos'      },
};

export const apolicesService = {
  async getApolicesByEmpresa(empresa_id) {
    try {
      const { data, error } = await supabase
        .from('apolices')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar apólices:', error);
      throw new Error('Não foi possível carregar as apólices.');
    }
  },

  async getApolicesByMatriz(empresa_matriz_id) {
    try {
      // Busca empresas da matriz com nome, cnpj e tipo
      const { data: empresas, error: empError } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social, cnpj, tipo, empresa_matriz_id')
        .or(`id.eq.${empresa_matriz_id},empresa_matriz_id.eq.${empresa_matriz_id}`);

      if (empError) throw empError;

      const ids = (empresas || []).map(e => e.id);
      if (ids.length === 0) return [];

      const empresaMap = Object.fromEntries((empresas || []).map(e => [e.id, e]));

      const { data, error } = await supabase
        .from('apolices')
        .select('*')
        .in('empresa_id', ids)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enriquece cada apólice com dados da empresa
      return (data || []).map(ap => ({
        ...ap,
        empresa: empresaMap[ap.empresa_id] || null,
      }));
    } catch (error) {
      console.error('Erro ao buscar apólices da matriz:', error);
      throw new Error('Não foi possível carregar as apólices.');
    }
  },

  async getAllApolices() {
    try {
      const { data, error } = await supabase
        .from('apolices')
        .select('*, empresas(razao_social, nome_fantasia, cnpj)')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar todas as apólices:', error);
      throw new Error('Não foi possível carregar as apólices.');
    }
  },

  async getApolice(id) {
    try {
      const { data, error } = await supabase
        .from('apolices')
        .select('*, empresas(razao_social, nome_fantasia, cnpj, tipo)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar apólice:', error);
      throw new Error('Não foi possível carregar a apólice.');
    }
  },

  async createApolice(apoliceData) {
    const { data, error } = await supabase
      .from('apolices')
      .insert([apoliceData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar apólice:', error);
      throw new Error(error.message || 'Não foi possível criar a apólice.');
    }
    return data;
  },

  async updateApolice(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('apolices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar apólice:', error);
      throw new Error('Não foi possível atualizar a apólice.');
    }
  },

  async deleteApolice(id) {
    try {
      const { error } = await supabase
        .from('apolices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao deletar apólice:', error);
      throw new Error('Não foi possível remover a apólice.');
    }
  },

  async uploadContratoSegmento(file, apoliceId, segmento) {
    try {
      const ext = file.name.split('.').pop();
      const path = `contratos/${apoliceId}_${segmento}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('apolices-contratos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('apolices-contratos').getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do contrato:', error);
      throw new Error(error?.message || 'Não foi possível fazer o upload do contrato.');
    }
  },

  async uploadContrato(file, apoliceId) {
    try {
      const ext = file.name.split('.').pop();
      const path = `contratos/${apoliceId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('apolices-contratos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('apolices-contratos')
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do contrato:', error);
      throw new Error(error?.message || error?.error_description || JSON.stringify(error) || 'Não foi possível fazer o upload do contrato.');
    }
  },

  async deleteContrato(apoliceId, contratoUrl) {
    try {
      if (contratoUrl) {
        const bucketPath = contratoUrl.split('/apolices-contratos/')[1];
        if (bucketPath) {
          await supabase.storage.from('apolices-contratos').remove([bucketPath]);
        }
      }
      const { data, error } = await supabase
        .from('apolices')
        .update({ contrato_url: null })
        .eq('id', apoliceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      throw new Error('Não foi possível excluir o contrato.');
    }
  },

  getStatusApolice(vigencia_fim) {
    if (!vigencia_fim) return { label: 'Sem vigência', color: 'gray' };
    const hoje = new Date();
    const fim = new Date(vigencia_fim);
    if (isNaN(fim.getTime())) return { label: 'Sem vigência', color: 'gray' };
    const diasRestantes = Math.floor((fim - hoje) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0)  return { label: 'Vencida',           color: 'red',    dias: diasRestantes };
    if (diasRestantes <= 30) return { label: 'Vencendo em breve', color: 'yellow', dias: diasRestantes };
    return { label: 'Ativa', color: 'green', dias: diasRestantes };
  },
};
