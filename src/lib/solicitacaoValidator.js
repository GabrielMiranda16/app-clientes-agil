export const cleanSolicitacaoData = (data) => {
  // Helper functions for cleaning and type conversion
  const text = (val) => (val ? String(val).trim() : null);
  const date = (val) => (val ? val : null);
  const number = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };
  const json = (val) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return null;
      }
    }
    return val;
  };

  return {
    // Required fields (validated in validateSolicitacao)
    empresa_id: number(data.empresa_id),
    beneficiario_id: number(data.beneficiario_id),
    tipo_solicitacao: text(data.tipo_solicitacao),
    
    // Fields with defaults
    status: text(data.status) || 'PENDENTE',
    data_solicitacao: date(data.data_solicitacao) || new Date().toISOString(),

    // Optional fields
    tipo_plano: text(data.tipo_plano),
    motivo: text(data.motivo),
    observacoes: text(data.observacoes),
    dados_exclusao: json(data.dados_exclusao),
    
    // Approval/Rejection workflow fields
    data_aprovacao: date(data.data_aprovacao),
    data_rejeicao: date(data.data_rejeicao),
    motivo_rejeicao: text(data.motivo_rejeicao)
  };
};

export const validateSolicitacao = (data) => {
  const errors = [];

  // Check for required fields
  if (!data.empresa_id) {
    errors.push('empresa_id');
  }
  if (!data.beneficiario_id) {
    errors.push('beneficiario_id');
  }
  if (!data.tipo_solicitacao || !data.tipo_solicitacao.trim()) {
    errors.push('tipo_solicitacao');
  }

  return errors;
};