const SERVICE_ID                  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID                 = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY                  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const TEMPLATE_TERMOS_CLIENTE     = import.meta.env.VITE_EMAILJS_TEMPLATE_TERMOS_CLIENTE;
const EMPRESA_EMAIL               = 'contato@segurosagil.com.br';
const LOGIN_URL                   = 'https://www.agilseguros.app/login';

export function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function sendTermosConfirmacaoCliente({ nomeCliente, emailCliente, versao, data, aceitouWhatsapp, aceitouEmail }) {
  if (!SERVICE_ID || !TEMPLATE_TERMOS_CLIENTE || !PUBLIC_KEY) {
    console.error('[EmailJS Termos] Variáveis faltando:', { SERVICE_ID: !!SERVICE_ID, TEMPLATE_TERMOS_CLIENTE: !!TEMPLATE_TERMOS_CLIENTE, PUBLIC_KEY: !!PUBLIC_KEY });
    return { ok: false };
  }
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_TERMOS_CLIENTE,
        user_id: PUBLIC_KEY,
        template_params: {
          to_name: nomeCliente,
          to_email: emailCliente,
          versao_termos: versao,
          data_aceite: data,
          aceite_whatsapp: aceitouWhatsapp ? 'Sim' : 'Não',
          aceite_email: aceitouEmail ? 'Sim' : 'Não',
          from_name: 'Ágil Seguros',
        },
      }),
    });
    const text = await response.text();
    if (!response.ok) console.error('[EmailJS Termos Cliente] Erro:', response.status, text);
    return { ok: response.ok, error: text };
  } catch (err) {
    console.error('[EmailJS Termos Cliente] Exceção:', err);
    return { ok: false };
  }
}

export async function sendTermosNotificacaoEmpresa({ nomeCliente, emailCliente, versao, data, ip, aceitouWhatsapp, aceitouEmail }) {
  if (!SERVICE_ID || !TEMPLATE_TERMOS_CLIENTE || !PUBLIC_KEY) {
    console.error('[EmailJS Termos Empresa] Variáveis faltando:', { SERVICE_ID: !!SERVICE_ID, TEMPLATE_TERMOS_CLIENTE: !!TEMPLATE_TERMOS_CLIENTE, PUBLIC_KEY: !!PUBLIC_KEY });
    return { ok: false };
  }
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_TERMOS_CLIENTE,
        user_id: PUBLIC_KEY,
        template_params: {
          to_name: `[EMPRESA] Novo aceite: ${nomeCliente}`,
          to_email: EMPRESA_EMAIL,
          versao_termos: versao,
          data_aceite: `${data} | Cliente: ${emailCliente} | IP: ${ip}`,
          aceite_whatsapp: aceitouWhatsapp ? 'Sim' : 'Não',
          aceite_email: aceitouEmail ? 'Sim' : 'Não',
          from_name: 'Ágil Seguros - Sistema',
        },
      }),
    });
    const text = await response.text();
    if (!response.ok) console.error('[EmailJS Termos Empresa] Erro:', response.status, text);
    return { ok: response.ok, error: text };
  } catch (err) {
    console.error('[EmailJS Termos Empresa] Exceção:', err);
    return { ok: false };
  }
}

export async function sendWelcomeEmail({ nomeCliente, emailCliente, senhaTemporaria }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    return { ok: false, error: 'Variáveis de ambiente do EmailJS não configuradas no servidor.' };
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      SERVICE_ID,
        template_id:     TEMPLATE_ID,
        user_id:         PUBLIC_KEY,
        template_params: {
          to_name:       nomeCliente,
          to_email:      emailCliente,
          temp_password: senhaTemporaria,
          login_url:     LOGIN_URL,
          from_name:     'Ágil Seguros',
        },
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      return { ok: false, error: `EmailJS [${response.status}]: ${text}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
