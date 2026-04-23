const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'PDF não informado.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada.' }), {
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
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                type: 'text',
                text: `Este é um relatório de coparticipação de plano de saúde ou odontológico de uma seguradora brasileira.

Extraia TODOS os registros de coparticipação presentes no documento.

Para cada registro retorne:
- nome_beneficiario: Nome do titular/beneficiário do plano (quem é o segurado principal)
- quem_utilizou: Nome de quem efetivamente utilizou o serviço (pode ser o titular ou um dependente)
- cpf_quem_utilizou: CPF de quem utilizou (apenas os 11 dígitos, sem pontos ou traços)
- valor: Valor da coparticipação em reais (número float, use ponto como decimal, ex: 45.90)
- descricao: Descrição do procedimento, especialidade ou serviço utilizado

Retorne APENAS um JSON válido no seguinte formato, sem nenhum texto antes ou depois:
[
  {
    "nome_beneficiario": "NOME DO TITULAR",
    "quem_utilizou": "NOME DE QUEM USOU",
    "cpf_quem_utilizou": "12345678901",
    "valor": 123.45,
    "descricao": "CONSULTA MEDICA"
  }
]

Regras obrigatórias:
- Retorne SOMENTE o JSON, absolutamente nada mais
- valor deve ser número (float), nunca string
- Se valor não encontrado, use 0
- Se cpf não encontrado, use string vazia ""
- Se quem_utilizou não encontrado, copie o nome_beneficiario
- Inclua TODOS os registros do documento`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const text: string = anthropicData.content?.[0]?.text || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Claude não retornou dados estruturados. Verifique se o PDF contém uma tabela de coparticipação.');
    }

    const data = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[parse-coparticipacao-pdf]', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar o PDF.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
