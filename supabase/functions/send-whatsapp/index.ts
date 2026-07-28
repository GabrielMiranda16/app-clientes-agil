import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_URL = 'https://evolution-agil.fly.dev';
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_KEY') ?? '';
const EVOLUTION_INSTANCE = 'agil-seguros';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone e message são obrigatórios' }), { status: 400, headers: corsHeaders });
    }

    const digits = String(phone).replace(/\D/g, '');
    const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;

    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
      body: JSON.stringify({
        number: fullPhone,
        options: { delay: 500, presence: 'composing' },
        textMessage: { text: message },
      }),
    });

    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: res.ok, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
