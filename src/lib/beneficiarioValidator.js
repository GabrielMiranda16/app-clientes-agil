export const validateCPF = (cpf) => {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Check for repeated digits (111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

export const validateEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
};

export const cleanBeneficiarioData = (data) => {
  // Helpers
  const text = (val) => val ? String(val).trim().toUpperCase() : null;
  const email = (val) => val ? String(val).trim().toLowerCase() : null;
  const digits = (val) => val ? String(val).replace(/[^\d]/g, '') : null;
  const date = (val) => val ? val : null; // Assumes input is already valid date string YYYY-MM-DD or ISO
  const bool = (val) => Boolean(val);
  const money = (val) => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    // Handle "R$ 1.200,50" -> 1200.50
    const clean = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(clean) || null;
  };

  return {
    // Identity
    empresa_id: data.empresa_id,
    nome_completo: text(data.nome_completo),
    cpf: digits(data.cpf),
    parentesco: text(data.parentesco),
    data_nascimento: date(data.data_nascimento),
    nome_mae: text(data.nome_mae),
    nome_titular: text(data.nome_titular),
    
    // Contact
    celular: digits(data.celular),
    email_beneficiario: email(data.email_beneficiario),
    
    // Address
    cep: digits(data.cep),
    rua: text(data.rua),
    numero: text(data.numero),
    complemento: text(data.complemento),
    bairro: text(data.bairro),
    cidade: text(data.cidade),
    estado: text(data.estado),
    
    // Employment
    matricula_empresa: text(data.matricula_empresa),
    data_admissao: date(data.data_admissao),
    observacoes: text(data.observacoes),
    situacao: text(data.situacao) || 'ATIVO',
    
    // Status Flags
    saude_ativo: bool(data.saude_ativo),
    vida_ativo: bool(data.vida_ativo),
    odonto_ativo: bool(data.odonto_ativo),
    
    // Health Plan Specifics
    saude_plano_nome: text(data.saude_plano_nome),
    saude_acomodacao: text(data.saude_acomodacao),
    saude_data_inclusao: date(data.saude_data_inclusao),
    saude_data_exclusao: date(data.saude_data_exclusao),
    saude_numero_carteirinha: text(data.saude_numero_carteirinha),
    saude_valor_fatura: money(data.saude_valor_fatura),
    saude_coparticipacao: text(data.saude_coparticipacao),
    saude_codigo_empresa: text(data.saude_codigo_empresa),
    saude_produto: text(data.saude_produto),
    saude_link_carteirinha: text(data.saude_link_carteirinha),

    // Life Plan Specifics
    vida_plano_nome: text(data.vida_plano_nome),
    vida_data_inclusao: date(data.vida_data_inclusao),
    vida_data_exclusao: date(data.vida_data_exclusao),
    vida_numero_carteirinha: text(data.vida_numero_carteirinha),
    vida_valor_fatura: money(data.vida_valor_fatura),
    vida_codigo_empresa: text(data.vida_codigo_empresa),
    vida_produto: text(data.vida_produto),
    vida_link_carteirinha: text(data.vida_link_carteirinha),

    // Dental Plan Specifics
    odonto_plano_nome: text(data.odonto_plano_nome),
    odonto_data_inclusao: date(data.odonto_data_inclusao),
    odonto_data_exclusao: date(data.odonto_data_exclusao),
    odonto_numero_carteirinha: text(data.odonto_numero_carteirinha),
    odonto_valor_fatura: money(data.odonto_valor_fatura),
    odonto_codigo_empresa: text(data.odonto_codigo_empresa),
    odonto_produto: text(data.odonto_produto),
    odonto_link_carteirinha: text(data.odonto_link_carteirinha),
    
    // System
    data_inatividade: date(data.data_inatividade),
    data_afastamento: date(data.data_afastamento),
    motivo_afastamento: text(data.motivo_afastamento),
    data_exclusao: date(data.data_exclusao),
  };
};

export const validateBeneficiario = (data) => {
  const errors = [];
  const required = (val, fieldName) => {
    if (!val || (typeof val === 'string' && !val.trim())) {
      errors.push(`${fieldName} é obrigatório`);
    }
  };

  required(data.empresa_id, 'Empresa');
  required(data.nome_completo, 'Nome Completo');
  required(data.cpf, 'CPF');
  required(data.data_nascimento, 'Data de Nascimento');
  required(data.parentesco, 'Parentesco');

  if (data.cpf) {
    const cleanCPF = data.cpf.replace(/[^\d]/g, '');
    if (!validateCPF(cleanCPF)) {
      errors.push('CPF inválido');
    }
  }

  if (data.email_beneficiario && !validateEmail(data.email_beneficiario)) {
    errors.push('Email inválido');
  }

  if (data.parentesco && data.parentesco.toUpperCase() !== 'TITULAR' && !data.nome_titular) {
    errors.push('Nome do Titular é obrigatório para dependentes');
  }

  return errors;
};