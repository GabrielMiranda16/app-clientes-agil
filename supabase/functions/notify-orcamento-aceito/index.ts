import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_URL = 'https://evolution-agil.fly.dev';
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_KEY') ?? '';
const EVOLUTION_INSTANCE = 'agil-seguros';
const ADM_PHONE = '5511999996863';

const SEGMENTO_LABEL: Record<string, string> = {
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto',
  AUTO_FROTA: 'Auto / Frota',
  VIAGEM: 'Viagem',
  RESIDENCIAL: 'Residencial',
  PET_SAUDE: 'Pet Saúde',
  EMPRESARIAL: 'Empresarial',
  CARGAS: 'Cargas',
  EQUIPAMENTOS: 'Equipamentos Portáteis',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { slug } = await req.json();
    if (!slug) return new Response(JSON.stringify({ error: 'slug required' }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: orc } = await supabase
      .from('orcamentos')
      .select('*, parceiros(nome_completo)')
      .eq('slug', slug)
      .maybeSingle();

    if (!orc) return new Response(JSON.stringify({ error: 'orcamento not found' }), { status: 404, headers: corsHeaders });

    const segmento = SEGMENTO_LABEL[orc.segmento] || orc.segmento;
    const parceiro = orc.parceiros?.nome_completo || 'Parceiro';
    const valor = orc.valor_mensalidade
      ? `R$ ${Number(orc.valor_mensalidade).toFixed(2).replace('.', ',')}`
      : 'a definir';

    const mensagem =
      `✅ *Cliente aceitou a proposta!*\n\n` +
      `*Cliente:* ${orc.cliente_nome}\n` +
      `*Telefone:* ${orc.cliente_telefone || '—'}\n` +
      `*Segmento:* ${segmento}\n` +
      `*Mensalidade:* ${valor}\n` +
      `*Parceiro:* ${parceiro}\n\n` +
      `Acesse o portal para acompanhar o envio de documentos e avançar o processo. 🗂️`;

    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_KEY,
      },
      body: JSON.stringify({
        number: ADM_PHONE,
        options: { delay: 500, presence: 'composing' },
        textMessage: { text: mensagem },
      }),
    });

    const whatsappResult = await res.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: true, whatsapp: whatsappResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
