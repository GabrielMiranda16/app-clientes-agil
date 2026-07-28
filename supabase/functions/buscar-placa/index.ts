import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const authToken = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { placa } = await req.json();
    if (!placa || placa.length < 7) {
      return new Response(JSON.stringify({ error: 'Placa inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = Deno.env.get('APIPLACAS_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`https://apiplacas.com.br/api/v1/placa/${placa.toUpperCase()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    console.log(`[buscar-placa] placa=${placa} status=${res.status} body=${text.slice(0, 300)}`);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: 'Resposta inválida da API de placas' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!res.ok) {
      const msg = (data?.message || data?.error) as string | undefined;
      const amigavel = res.status === 429 || res.status === 403
        ? 'Limite diário de consultas da API de placas foi atingido.'
        : (msg || 'Placa não encontrada na base da API.');
      return new Response(JSON.stringify({ error: amigavel, status_origem: res.status }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
