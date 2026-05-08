const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = 'Este e um relatorio de coparticipacao de plano de saude ou odontologico de uma seguradora brasileira.\n\nExtraia TODOS os registros de coparticipacao presentes no documento.\n\nPara cada registro retorne:\n- nome_beneficiario: Nome do titular/beneficiario do plano (quem e o segurado principal)\n- quem_utilizou: Nome de quem efetivamente utilizou o servico (pode ser o titular ou um dependente)\n- cpf_quem_utilizou: CPF de quem utilizou (apenas os 11 digitos, sem pontos ou tracas)\n- valor: Valor da coparticipacao em reais (numero float, use ponto como decimal, ex: 45.90)\n- descricao: Descricao do procedimento, especialidade ou servico utilizado\n\nRetorne APENAS um JSON valido no seguinte formato, sem nenhum texto antes ou depois:\n[\n  {\n    "nome_beneficiario": "NOME DO TITULAR",\n    "quem_utilizou": "NOME DE QUEM USOU",\n    "cpf_quem_utilizou": "12345678901",\n    "valor": 123.45,\n    "descricao": "CONSULTA MEDICA"\n  }\n]\n\nRegras obrigatorias:\n- Retorne SOMENTE o JSON, absolutamente nada mais\n- valor deve ser numero (float), nunca string\n- Se valor nao encontrado, use 0\n- Se cpf nao encontrado, use string vazia ""\n- Se quem_utilizou nao encontrado, copie o nome_beneficiario\n- Inclua TODOS os registros do documento';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { pdfBase64, csvText } = body;

    if (!pdfBase64 && !csvText) {
      return new Response(JSON.stringify({ error: 'Arquivo nao informado.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY nao configurada.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageContent = pdfBase64
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          { type: 'text', text: PROMPT },
        ]
      : [
          { type: 'text', text: PROMPT + '\n\nDados da planilha (CSV):\n\n' + csvText },
        ];

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error('Anthropic API error ' + anthropicRes.status + ': ' + errText);
    }

    const anthropicData = await anthropicRes.json();
    const text = anthropicData.content?.[0]?.text || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Claude nao retornou dados estruturados.');
    }

    const data = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[parse-coparticipacao-pdf]', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar arquivo.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
