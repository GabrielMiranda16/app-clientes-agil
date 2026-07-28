import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOGIN_URL = 'https://www.agilseguros.app/login';

async function sendResetEmail(name: string, email: string, tempPassword: string) {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID');
  const templateId = Deno.env.get('EMAILJS_TEMPLATE_ID');
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY');
  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EMAILJS_SERVICE_ID/EMAILJS_TEMPLATE_ID/EMAILJS_PUBLIC_KEY não configurados.');
  }

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_name: name,
        to_email: email,
        temp_password: tempPassword,
        login_url: LOGIN_URL,
        from_name: 'Ágil Seguros',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS [${res.status}]: ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'E-mail é obrigatório.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    // Sempre responde a mesma mensagem de sucesso, exista o e-mail ou não —
    // evita confirmar pra quem está chamando se aquele e-mail tem conta.
    if (fetchError || !userData) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));

    const hashed = await bcrypt.hash(tempPassword, 10);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashed, must_change_password: true })
      .eq('id', userData.id);

    if (updateError) throw updateError;

    // A senha só existe aqui dentro do servidor — nunca volta na resposta.
    // Se o e-mail falhar, a senha já foi trocada no banco; logamos pra dar
    // suporte manual em vez de deixar o usuário sem acesso e sem aviso.
    try {
      await sendResetEmail(userData.name || userData.email, userData.email, tempPassword);
    } catch (emailErr) {
      console.error('[request-password-reset] falha ao enviar e-mail', emailErr);
      return new Response(JSON.stringify({ error: 'Senha redefinida, mas não foi possível enviar o e-mail. Entre em contato com o suporte.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[request-password-reset]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
