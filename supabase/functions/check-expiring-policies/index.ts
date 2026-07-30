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
    const em30diasStr = em30dias.toISOString().slice(0, 10);

    const { data: vencendo, error } = await supabase
      .from('orcamentos')
      .select('id, cliente_nome, cliente_email, cliente_telefone, segmento, operadora_escolhida, numero_apolice, data_vencimento, parceiros(nome_completo)')
      .lte('data_vencimento', em30diasStr)
      .eq('alerta_vencimento_enviado', false)
      .in('status', ['CONCLUIDO', 'COMISSAO']);

    if (error) throw error;
    if (!vencendo || vencendo.length === 0) {
      return new Response(JSON.stringify({ ok: true, enviados: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')!;
    const baseUrl = Deno.env.get('SUPABASE_URL')!.replace('supabase.co', 'supabase.co');

    let enviados = 0;
    for (const orc of vencendo) {
      const seg = SEGMENTO_LABEL[orc.segmento] || orc.segmento;
      const parceiro = (orc as any).parceiros?.nome_completo || '—';
      const venc = new Date(orc.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: #003580; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 22px;">⚠️ Apólice vencendo em 30 dias</h1>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Cliente</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #1e293b;">${orc.cliente_nome}</td></tr>
              <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Segmento</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #1e293b;">${seg}</td></tr>
              ${orc.operadora_escolhida ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Operadora</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #1e293b;">${orc.operadora_escolhida}</td></tr>` : ''}
              ${orc.numero_apolice ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Nº Apólice</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #1e293b;">${orc.numero_apolice}</td></tr>` : ''}
              <tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Parceiro</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #1e293b;">${parceiro}</td></tr>
              <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Vencimento</td><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 16px;">${venc}</td></tr>
            </table>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="margin: 0; color: #9a3412; font-size: 14px;">Entre em contato com o cliente para renovação. Telefone: <strong>${orc.cliente_telefone || '—'}</strong></p>
            </div>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">Ágil Seguros · SUSEP 252166308</p>
        </div>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Ágil Seguros <noreply@agilseguros.app>',
          to: ['contato@segurosagil.com.br'],
          subject: `⚠️ Apólice vencendo em 30 dias — ${orc.cliente_nome} (${seg})`,
          html,
        }),
      });
      await supabase.from('orcamentos').update({ alerta_vencimento_enviado: true }).eq('id', orc.id);
      enviados++;
    }

    return new Response(JSON.stringify({ ok: true, enviados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
