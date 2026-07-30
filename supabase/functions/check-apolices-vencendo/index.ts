import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEGMENTO_LABEL: Record<string, string> = {
  SAUDE: 'Saúde', VIDA: 'Vida', ODONTOLOGICO: 'Odontológico',
  AUTO: 'Auto', RESIDENCIAL: 'Residencial', EMPRESARIAL: 'Empresarial',
  VIAGEM: 'Viagem', PET_SAUDE: 'Pet Saúde', PET_SEGURO: 'Pet Seguro',
  FROTA: 'Frota', CARGAS: 'Cargas', EQUIPAMENTOS: 'Equipamentos',
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto', AUTO_FROTA: 'Auto / Frota',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const hoje = new Date();
    const em30dias = new Date(hoje);
    em30dias.setDate(hoje.getDate() + 30);

    const hojeStr = hoje.toISOString().slice(0, 10);
    const em30diasStr = em30dias.toISOString().slice(0, 10);

    const { data: vencendo, error } = await supabase
      .from('apolices')
      .select('id, empresa_id, segmento, seguradora, numero_apolice, vigencia_inicio, vigencia_fim, empresas(nome_fantasia)')
      .lte('vigencia_fim', em30diasStr)
      .or('ativo.is.null,ativo.eq.true')
      .or('lembrete_vencimento_criado.is.null,lembrete_vencimento_criado.eq.false');

    if (error) throw error;
    if (!vencendo || vencendo.length === 0) {
      return new Response(JSON.stringify({ ok: true, criados: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BOT_URL = 'https://agil-instagram.fly.dev';
    const TOKEN = Deno.env.get('BOT_LEMBRETES_TOKEN');

    let criados = 0;
    for (const ap of vencendo) {
      const empresa = (ap as any).empresas?.nome_fantasia || `Empresa ${ap.empresa_id}`;
      const seg = SEGMENTO_LABEL[ap.segmento] || ap.segmento;
      const seguradora = ap.seguradora || '—';

      const vigInicio = ap.vigencia_inicio
        ? new Date(ap.vigencia_inicio + 'T12:00:00').toLocaleDateString('pt-BR')
        : '—';
      const vigFim = new Date(ap.vigencia_fim + 'T12:00:00').toLocaleDateString('pt-BR');

      const descricao = `⚠️ Apólice vencendo — ${empresa} | ${seg} | ${seguradora} | Vigência: ${vigInicio} a ${vigFim}`;
      const data_lembrete = `${ap.vigencia_fim}T09:00:00-03:00`;

      try {
        // 1. Insere na aba Lembretes (lembretes_adm) — visível para CEO e ADM
        const { error: admErr } = await supabase
          .from('lembretes_adm')
          .insert({ texto: descricao, autor: 'bot', lida: false, concluido: false, data_alerta: data_lembrete });
        if (admErr) console.error(`Erro lembretes_adm apólice ${ap.id}:`, admErr.message);

        // 2. Cria no bot (card Lembretes Ágil no Dashboard + notificação WhatsApp)
        await fetch(`${BOT_URL}/api/lembrete-externo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao, token: TOKEN, empresa: 'agil', data_lembrete }),
        });

        await supabase
          .from('apolices')
          .update({ lembrete_vencimento_criado: true })
          .eq('id', ap.id);
        criados++;
      } catch (e) {
        console.error(`Erro na apólice ${ap.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, criados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
