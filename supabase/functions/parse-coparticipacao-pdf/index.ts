const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `Este e um relatorio de coparticipacao de plano de saude ou odontologico de uma seguradora ou operadora de planos brasileira.

Extraia TODOS os registros de coparticipacao presentes no documento.

Para cada registro retorne:
- nome_beneficiario: Nome do titular/beneficiario do plano (quem e o segurado principal). Em MAIUSCULAS
- quem_utilizou: Nome de quem efetivamente utilizou o servico (pode ser o titular ou um dependente). Em MAIUSCULAS
- cpf_quem_utilizou: CPF de quem utilizou (apenas 11 digitos numericos, sem pontos ou tracas). Se nao encontrado, use ""
- valor: Valor da coparticipacao em reais (numero float, use ponto como decimal, ex: 45.90). Se nao encontrado, use 0
- descricao: Descricao do procedimento, especialidade ou servico utilizado. Em MAIUSCULAS. Se nao encontrado, use ""

Retorne APENAS um JSON valido no seguinte formato, sem nenhum texto antes ou depois:
[
  {
    "nome_beneficiario": "NOME DO TITULAR",
    "quem_utilizou": "NOME DE QUEM USOU",
    "cpf_quem_utilizou": "12345678901",
    "valor": 123.45,
    "descricao": "CONSULTA MEDICA"
  }
]

Regras obrigatorias:
- Retorne SOMENTE o JSON, absolutamente nada mais
- valor deve ser numero (float), nunca string. Converta "R$ 45,90" para 45.90
- Se valor nao encontrado, use 0
- Se cpf nao encontrado, use string vazia ""
- Se quem_utilizou nao encontrado, copie o nome_beneficiario
- Se nome_beneficiario nao encontrado mas ha um titular associado, use o nome do titular
- Inclua TODOS os registros do documento, sem omitir nenhum
- Para planilhas Excel/CSV: cada linha e um registro separado
- Para PDFs: extraia todos os itens de todas as paginas`;

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
        max_tokens: 32768,
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
