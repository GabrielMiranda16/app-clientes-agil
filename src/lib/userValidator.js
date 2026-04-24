export const validatePasswordStrength = (password) => {
  const errors = [];
  if (!password || password.length < 6) errors.push('Mínimo 6 caracteres');
  if (!/[0-9]/.test(password)) errors.push('Pelo menos 1 número');
  if (!/[a-z]/.test(password)) errors.push('Pelo menos 1 letra minúscula');
  if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 letra maiúscula');
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push('Pelo menos 1 caractere especial (!@#$%...)');
  return errors;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
};

export const cleanUserData = (data) => {
  const text = (val) => (val ? String(val).trim() : null);
  const number = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };
  const boolean = (val) => val === true || val === 'true';

  return {
    email: text(data.email),
    password: data.password ? String(data.password).trim() : null,
    name: text(data.name),
    perfil: text(data.perfil),
    empresa_id: number(data.empresa_id),
    empresa_matriz_id: number(data.empresa_matriz_id),
    ativo: data.ativo !== undefined ? boolean(data.ativo) : true,
    must_change_password: data.must_change_password !== undefined ? boolean(data.must_change_password) : false,
    aceite_termos: false,
    aceite_whatsapp: false,
    aceite_email: false,
  };
};

export const validateUser = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Email inválido ou obrigatório');
  }

  if (!data.password) {
    errors.push('Senha é obrigatória');
  }

  if (!data.perfil) {
    errors.push('Perfil é obrigatório');
  }

  return errors;
};