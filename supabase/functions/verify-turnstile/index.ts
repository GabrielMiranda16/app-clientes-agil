const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_HOSTNAMES = new Set(['agilseguros.app', 'www.agilseguros.app']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string' || token.length > 2048) {
      return new Response(JSON.stringify({ success: false, error: 'Token ausente ou inválido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const secret = Deno.env.get('TURNSTILE_SECRET');
    if (!secret) throw new Error('TURNSTILE_SECRET não configurado.');

    const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
    });

    if (!verifyRes.ok) throw new Error(`Cloudflare siteverify HTTP ${verifyRes.status}`);
    const result = await verifyRes.json();

    if (!result.success || !ALLOWED_HOSTNAMES.has(result.hostname)) {
      console.error('[verify-turnstile] falhou', result);
      return new Response(JSON.stringify({ success: false }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[verify-turnstile]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
