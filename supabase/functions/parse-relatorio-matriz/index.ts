import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt acumulativo — adicionar novos formatos aqui ao encontra-los, nunca remover.
const PROMPT = `Voce vai receber um PDF de "Relacao de Segurados Ativos" ou "Relatorio Matriz" de uma seguradora brasileira (Sul America, Bradesco, Amil, Porto Seguro, Unimed, etc).

Extraia TODOS os segurados presentes no documento, incluindo titulares e dependentes.

Para cada segurado retorne:
- cod_identificacao: Codigo de identificacao / numero da carteirinha (ex: "88888484452080012")
- plano: Codigo e nome do plano (ex: "98070-DIRETO NACIONAL")
- nome_completo: Nome completo em MAIUSCULAS
- cpf: Apenas 11 digitos numericos, sem pontos ou tracas. Se nao encontrado, use ""
- id_funcional: ID funcional / matricula (ex: "484452080"). Se nao encontrado, use ""
- data_nascimento: No formato YYYY-MM-DD. Se nao encontrado, use ""
- parentesco: "TITULAR", "CONJUGE", "FILHO", "FILHA", "PAI", "MAE" ou "OUTRO"
- nome_titular: Nome do TITULAR da familia. Para titulares, use o proprio nome. Para dependentes, identifique o titular da mesma familia (mesmo ID funcional / grupo)
- inicio_vigencia: Data de inicio da vigencia no formato YYYY-MM-DD. Se nao encontrado, use ""
- premio: Valor do premio/mensalidade em reais como numero float (ex: 1103.33). Se nao encontrado, use 0
- tipo_plano: "saude", "odonto" ou "vida" — detecte pelo contexto do documento (logomarca, titulo, nome do plano)

---

FORMATO CONHECIDO 1 — Sul America "Relacao de Segurados Ativos":

Colunas: Cod. de Identificacao | Plano | Nome do segurado | CPF | ID Funcional | Data de Nascimento | Idade | Parentesco | Inicio Vigencia | Premio

Exemplo de linha:
88888484452080012  98070-DIRETO NACIONAL  AMINADABE DE SOUZA GONCALVES  265.905.958-60  484452080  13/05/1976  50  TITULAR  20/03/2024  R$ 1.103,33

Regras deste formato:
- Linhas "Total da Familia: R$ X" sao resumos — ignore para extracao de segurados
- Linhas "Total Geral" e "Resumo Grupo Segurado" sao rodape — ignore
- Parentesco "CONJUGE" pode aparecer como "CÔNJUGE" — normalize para "CONJUGE"
- Parentesco "FILHO(A)" — use "FILHO" se nao souber o genero, "FILHA" se obvio pelo nome
- Segurados com mesmo ID Funcional pertencem a mesma familia (mesmo grupo)

---

Retorne APENAS um JSON valido, sem nenhum texto antes ou depois:
[
  {
    "cod_identificacao": "88888484452080012",
    "plano": "98070-DIRETO NACIONAL",
    "nome_completo": "AMINADABE DE SOUZA GONCALVES",
    "cpf": "26590595860",
    "id_funcional": "484452080",
    "data_nascimento": "1976-05-13",
    "parentesco": "TITULAR",
    "nome_titular": "AMINADABE DE SOUZA GONCALVES",
    "inicio_vigencia": "2024-03-20",
    "premio": 1103.33,
    "tipo_plano": "saude"
  }
]

Regras obrigatorias:
- Retorne SOMENTE o JSON, absolutamente nada mais
- Inclua TODOS os segurados, titulares e dependentes
- premio deve ser numero float, nunca string
- cpf deve ter exatamente 11 digitos sem formatacao (ou "" se ausente)
- datas no formato YYYY-MM-DD`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    const body = await req.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'pdfBase64 e obrigatorio.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY nao configurada.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 32768,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error('Anthropic API error ' + anthropicRes.status + ': ' + errText);
    }

    const anthropicData = await anthropicRes.json();
    const text = anthropicData.content?.[0]?.text || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Claude nao retornou dados estruturados.');

    const data = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[parse-relatorio-matriz]', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar PDF.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
