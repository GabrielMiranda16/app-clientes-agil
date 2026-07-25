import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_URL = 'https://agil-instagram.fly.dev';
const ID_RE = /^[a-zA-Z0-9-]+$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const TOKEN = Deno.env.get('BOT_LEMBRETES_TOKEN')!;
    const { action, ...params } = await req.json();

    let botPath = '';
    let botMethod = 'GET';
    let botBody: Record<string, unknown> | null = null;

    switch (action) {
      case 'listar_lembretes':
        botPath = `/api/lembretes?token=${encodeURIComponent(TOKEN)}&empresa=${encodeURIComponent(params.empresa || 'agil')}`;
        botMethod = 'GET';
        break;

      case 'criar_lembrete':
        botPath = '/api/lembretes';
        botMethod = 'POST';
        botBody = { token: TOKEN, empresa: params.empresa || 'agil', descricao: params.descricao, data_lembrete: params.data_lembrete ?? null };
        break;

      case 'editar_lembrete':
        if (!ID_RE.test(String(params.id || ''))) throw new Error('id inválido');
        botPath = `/api/lembretes/${params.id}`;
        botMethod = 'PATCH';
        botBody = { token: TOKEN, descricao: params.descricao, data_lembrete: params.data_lembrete ?? null };
        break;

      case 'concluir_lembrete':
        if (!ID_RE.test(String(params.id || ''))) throw new Error('id inválido');
        botPath = `/api/lembretes/${params.id}/concluir`;
        botMethod = 'PATCH';
        botBody = { token: TOKEN };
        break;

      case 'nova_solicitacao':
        botPath = '/api/nova-solicitacao';
        botMethod = 'POST';
        botBody = { token: TOKEN, parceiro_nome: params.parceiro_nome, segmento: params.segmento, cliente_nome: params.cliente_nome, cliente_telefone: params.cliente_telefone, observacoes: params.observacoes };
        break;

      case 'alerta_gestao':
        botPath = '/api/alerta-gestao';
        botMethod = 'POST';
        botBody = { token: TOKEN, empresa: params.empresa, beneficiario: params.beneficiario, tipo_plano: params.tipo_plano, tipo_solicitacao: params.tipo_solicitacao, observacoes: params.observacoes };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const resp = await fetch(`${BOT_URL}${botPath}`, {
      method: botMethod,
      headers: botBody ? { 'Content-Type': 'application/json' } : undefined,
      body: botBody ? JSON.stringify(botBody) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
