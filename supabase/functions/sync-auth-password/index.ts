import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Busca o hash da senha no banco para verificar a identidade
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, password')
      .eq('email', email)
      .maybeSingle();

    if (dbError || !dbUser) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verifica a senha antes de qualquer alteração no Auth
    const isBcrypt = dbUser.password?.startsWith('$2');
    const isValid = isBcrypt
      ? await bcrypt.compare(password, dbUser.password)
      : password === dbUser.password;

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Tenta criar o usuário no Supabase Auth
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!createError) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Usuário já existe — atualiza a senha
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === email);

    if (existing) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        { password }
      );
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[sync-auth-password]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
