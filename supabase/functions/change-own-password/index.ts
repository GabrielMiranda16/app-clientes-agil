import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { oldPassword, newPassword } = await req.json();
    if (!oldPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Senha antiga e nova senha são obrigatórias.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Identifica quem está chamando pelo JWT — nunca confia num email vindo do body.
    const { data: authData, error: authUserError } = await supabaseAdmin.auth.getUser(token);
    if (authUserError || !authData?.user?.email) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const email = authData.user.email;

    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, password')
      .eq('email', email)
      .maybeSingle();

    if (dbError || !dbUser) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isBcrypt = dbUser.password?.startsWith('$2');
    const isOldCorrect = isBcrypt
      ? await bcrypt.compare(oldPassword, dbUser.password)
      : oldPassword === dbUser.password;

    if (!isOldCorrect) {
      return new Response(JSON.stringify({ error: 'Senha antiga incorreta.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: newHash })
      .eq('id', dbUser.id);
    if (updateError) throw updateError;

    // Mantém o Supabase Auth em sincronia imediatamente (evita depender do
    // próximo login pra migrar via sync-auth-password).
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      authData.user.id,
      { password: newPassword }
    );
    if (authUpdateError) throw authUpdateError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[change-own-password]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
