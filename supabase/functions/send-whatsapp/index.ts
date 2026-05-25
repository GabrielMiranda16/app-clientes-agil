import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_URL = 'https://evolution-agil.fly.dev';
const EVOLUTION_KEY = 'ljzRG5XQPhbJiMV7grrPBd6b_9uAfv6HyZpvy0IMvTA';
const EVOLUTION_INSTANCE = 'agil-seguros';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
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
