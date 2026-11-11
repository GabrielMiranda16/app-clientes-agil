import { supabase } from '@/lib/customSupabaseClient';

const BUCKET = 'atestados';
const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const LADO_MAXIMO = 2000;

const blobParaBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const reduzirImagem = async (file) => {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
};

export const SALARIO_MINIMO = 1621;

export const CONFIG_PADRAO = {
  prazo_entrega_dias: 2,
  soma_inss: 'MESMO_MOTIVO',
  salario_base: SALARIO_MINIMO,
  encargos_percentual: 0,
  limitar_custo_15_dias: true,
  meta_absenteismo: 4,
};

export const TIPOS_ATESTADO = [
  { value: 'ATESTADO', label: 'Atestado médico' },
  { value: 'ODONTOLOGICO', label: 'Atestado odontológico' },
  { value: 'COMPARECIMENTO', label: 'Declaração de comparecimento' },
  { value: 'ACOMPANHANTE', label: 'Acompanhante' },
];

export const STATUS_ATESTADO = {
  PENDENTE: { label: 'Pendente', classe: 'bg-amber-50 text-amber-700' },
  APROVADO: { label: 'Aprovado', classe: 'bg-blue-50 text-[#003580]' },
  RECUSADO: { label: 'Recusado', classe: 'bg-red-50 text-red-700' },
  SEM_ABONO: { label: 'Justificado sem abono', classe: 'bg-gray-100 text-gray-600' },
};

export const ETAPAS_AFASTAMENTO = [
  { value: 'ENCAMINHAR_INSS', label: 'Encaminhar ao INSS' },
  { value: 'ENCAMINHADO_INSS', label: 'Encaminhado ao INSS' },
  { value: 'AGUARDANDO_PERICIA', label: 'Aguardando perícia' },
  { value: 'EM_BENEFICIO', label: 'Em benefício do INSS' },
  { value: 'BENEFICIO_NEGADO', label: 'Benefício negado' },
  { value: 'AGUARDANDO_EXAME_RETORNO', label: 'Aguardando exame de retorno' },
  { value: 'RETORNOU', label: 'Retornou ao trabalho' },
];

export const RESULTADOS_EXAME = [
  { value: 'APTO', label: 'Apto' },
  { value: 'APTO_RESTRICAO', label: 'Apto com restrição' },
  { value: 'INAPTO', label: 'Inapto' },
];

export const MOTIVOS_RECUSA = [
  { value: 'FORA_PRAZO', label: 'Entregue fora do prazo do regulamento' },
  { value: 'RASURA', label: 'Rasura ou alteração no documento' },
  { value: 'DADO_OBRIGATORIO', label: 'Falta dado obrigatório (médico, CRM, data, assinatura ou dias)' },
  { value: 'PROFISSIONAL', label: 'Emitido por quem não é médico nem dentista' },
  { value: 'DUPLICADO', label: 'Documento duplicado' },
  { value: 'DIVERGENCIA_MEDICA', label: 'Divergência do médico do trabalho', detalhe: 'Nome do médico do trabalho que avaliou' },
  { value: 'OUTRO', label: 'Outro motivo', detalhe: 'Descreva o motivo' },
];

export const custoEstimado = (dias, salarioMensal = SALARIO_MINIMO) =>
  dias > 0 ? (salarioMensal / 30) * dias : 0;

export const diasDoAtestado = (a) => {
  if (a.dias_afastamento != null) return a.dias_afastamento;
  if (!a.data_inicio || !a.data_fim) return a.data_inicio ? 1 : 0;
  const inicio = new Date(`${a.data_inicio}T00:00:00`);
  const fim = new Date(`${a.data_fim}T00:00:00`);
  return Math.max(1, Math.round((fim - inicio) / 86400000) + 1);
};

export const atestadosService = {
  tiposAceitos: TIPOS_ACEITOS,

  async prepararArquivo(file) {
    if (!TIPOS_ACEITOS.includes(file.type)) {
      throw new Error('Envie um PDF ou uma foto (JPG, PNG ou WEBP).');
    }
    if (file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) throw new Error('O PDF precisa ter até 10 MB.');
      return { blob: file, mediaType: file.type, extensao: 'pdf' };
    }
    const blob = await reduzirImagem(file);
    return { blob, mediaType: 'image/jpeg', extensao: 'jpg' };
  },

  async lerComIA({ blob, mediaType }) {
    const fileBase64 = await blobParaBase64(blob);
    const { data, error } = await supabase.functions.invoke('parse-atestado', {
      body: { fileBase64, mediaType },
    });
    if (error) {
      const detalhe = await error.context?.json?.().catch(() => null);
      throw new Error(detalhe?.error || 'Não foi possível ler o atestado.');
    }
    if (!data?.data) throw new Error('A IA não retornou dados.');
    return data.data;
  },

  async uploadArquivo({ blob, mediaType, extensao }, empresaId) {
    const path = `${empresaId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mediaType });
    if (error) throw new Error('Não foi possível enviar o arquivo do atestado.');
    return path;
  },

  async removerArquivo(path) {
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  },

  async getArquivoUrl(path) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    if (error) throw new Error('Não foi possível abrir o arquivo.');
    return data.signedUrl;
  },

  async getAtestadosByApolice(apolice_id) {
    try {
      const { data, error } = await supabase
        .from('atestados')
        .select('*, beneficiarios(nome_completo, cpf, matricula_empresa, salario)')
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
        .select('*, beneficiarios(nome_completo, cpf, matricula_empresa, salario)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar atestado:', error);
      throw new Error('Não foi possível cadastrar o atestado.');
    }
  },

  async updateAtestado(id, patch) {
    try {
      const { data, error } = await supabase
        .from('atestados')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, beneficiarios(nome_completo, cpf, matricula_empresa, salario)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar atestado:', error);
      throw new Error('Não foi possível salvar a alteração.');
    }
  },

  async getAnotacoes(atestadoId) {
    const { data, error } = await supabase.from('atestado_anotacoes').select('*').eq('atestado_id', atestadoId).order('created_at', { ascending: false });
    if (error) throw new Error('Não foi possível carregar as anotações.');
    return data || [];
  },

  async addAnotacao(anotacao) {
    const { data, error } = await supabase.from('atestado_anotacoes').insert([anotacao]).select().single();
    if (error) throw new Error('Não foi possível salvar a anotação.');
    return data;
  },

  async deleteAnotacao(id) {
    const { error } = await supabase.from('atestado_anotacoes').delete().eq('id', id);
    if (error) throw new Error('Não foi possível excluir a anotação.');
  },

  async updateSalario(beneficiarioId, salario) {
    const { error } = await supabase.from('beneficiarios').update({ salario }).eq('id', beneficiarioId);
    if (error) throw new Error('Não foi possível salvar o salário.');
  },

  async getConfig(matrizId) {
    const { data } = await supabase.from('atestados_config').select('*').eq('empresa_id', matrizId).maybeSingle();
    return { ...CONFIG_PADRAO, ...(data || {}) };
  },

  async deleteAtestado(atestado) {
    try {
      const { error } = await supabase.from('atestados').delete().eq('id', atestado.id);
      if (error) throw error;
      await this.removerArquivo(atestado.arquivo_path).catch(() => {});
    } catch (error) {
      console.error('Erro ao excluir atestado:', error);
      throw new Error('Não foi possível excluir o atestado.');
    }
  },
};
