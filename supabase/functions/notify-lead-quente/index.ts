import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SEG_LABEL: Record<string, string> = {
  AUTO: 'Auto', SAUDE: 'Saúde', RESIDENCIAL: 'Residencial',
  EMPRESARIAL: 'Empresarial', ODONTOLOGICO: 'Odontológico', VIAGEM: 'Viagem',
  PET_SAUDE: 'Pet Saúde', PET_SEGURO: 'Pet Seguro', VIDA: 'Vida',
  FROTA: 'Frota', CARGAS: 'Cargas', EQUIPAMENTOS: 'Equipamentos',
  SAUDE_VIDA_ODONTO: 'Saúde, Vida e Odonto', AUTO_FROTA: 'Auto e Frota',
};

const ordinal = (n: number) =>
  ({ 2: '2ª', 3: '3ª', 4: '4ª', 5: '5ª' }[n] ?? `${n}ª`);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { slug, num_acessos, aceitou = false, proposta_clicada: propostaBody = '' } = await req.json();
  if (!slug) return new Response('slug required', { status: 400, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: o } = await supabase
    .from('orcamentos')
    .select('id, cliente_nome, cliente_telefone, segmento, slug, numero_protocolo')
    .eq('slug', slug)
    .single();

  if (!o) return new Response('not found', { status: 404, headers: corsHeaders });

  const { data: lastAcesso } = await supabase
    .from('orcamento_acessos')
    .select('proposta_clicada')
    .eq('orcamento_id', o.id)
    .order('acessado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  const segLabel = SEG_LABEL[o.segmento] || o.segmento;
  const link = o.slug ? `https://www.agilseguros.app/orcamento/${o.slug}` : '';
  const propostaClicada = propostaBody || lastAcesso?.proposta_clicada || '';
  const ord = ordinal(num_acessos);
  const protocolo = o.numero_protocolo || '';

  const BOT_TOKEN = Deno.env.get('BOT_LEMBRETES_TOKEN');

  // WhatsApp via bot
  fetch('https://agil-instagram.fly.dev/api/lead-quente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: BOT_TOKEN,
      cliente_nome: o.cliente_nome,
      segmento: segLabel,
      telefone: o.cliente_telefone || '',
      num_acessos,
      proposta_clicada: propostaClicada,
      link,
      aceitou,
      protocolo,
    }),
  }).catch(() => {});

  // Email via Resend
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
  if (RESEND_KEY) {
    const isAceitou = aceitou;
    const subject = isAceitou
      ? `✅ Proposta aceita: ${o.cliente_nome} (${segLabel}${propostaClicada ? ` — ${propostaClicada}` : ''})`
      : `🔥 Lead quente: ${o.cliente_nome} (${segLabel} — ${ord} acesso)`;

    const protocoloHtml = protocolo
      ? `<p style="margin:0 0 8px">Protocolo: <strong style="color:#003580;font-family:monospace">${protocolo}</strong></p>`
      : '';
    const propostaHtml = propostaClicada
      ? `<p style="margin:0 0 8px">💡 ${isAceitou ? 'Plano escolhido' : 'Clicou em'}: <strong>${propostaClicada}</strong></p>`
      : '';
    const telefoneHtml = o.cliente_telefone
      ? `<p style="margin:0 0 8px">📞 <strong>${o.cliente_telefone}</strong></p>`
      : '';
    const linkHtml = link
      ? `<p style="margin:16px 0"><a href="${link}" style="background:#003580;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Ver proposta</a></p>`
      : '';

    const html = isAceitou
      ? `<div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#003580;margin-bottom:4px">✅ Proposta Aceita!</h2>
          <p style="margin:0 0 12px"><strong>${o.cliente_nome}</strong> aceitou o orçamento de <strong>${segLabel}</strong>.</p>
          ${propostaHtml}${telefoneHtml}${protocoloHtml}${linkHtml}
          <p style="color:#999;font-size:11px;margin-top:20px">Ágil Seguros — Portal do Parceiro</p>
        </div>`
      : `<div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#003580;margin-bottom:4px">🔥 Lead Quente!</h2>
          <p style="margin:0 0 12px"><strong>${o.cliente_nome}</strong> acessou o orçamento de <strong>${segLabel}</strong> pela <strong>${ord} vez</strong>.</p>
          ${propostaHtml}${telefoneHtml}${protocoloHtml}${linkHtml}
          <p style="color:#999;font-size:11px;margin-top:20px">Ágil Seguros — Portal do Parceiro</p>
        </div>`;

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'Ágil Seguros <noreply@agilseguros.app>',
        to: 'contato@segurosagil.com.br',
        subject,
        html,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
