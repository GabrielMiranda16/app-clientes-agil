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
        max_tokens: 8192,
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
                text: `Este é um relatório ou lista de beneficiários de um plano de saúde, odontológico ou de vida de uma seguradora brasileira.

Extraia TODOS os beneficiários presentes no documento.

Para cada beneficiário retorne:
- nome_completo: Nome completo da pessoa (em MAIÚSCULAS)
- cpf: CPF com apenas 11 dígitos numéricos, sem pontos ou traços (ex: "12345678901"). Se não encontrado, use ""
- data_nascimento: Data no formato YYYY-MM-DD. Se não encontrado, use ""
- parentesco: Um dos valores: "TITULAR", "CONJUGE", "FILHO", "FILHA", "PAI", "MAE", "OUTRO". Deduza pelo campo de tipo/parentesco do documento. Se não encontrado, use "TITULAR"
- nome_titular: Nome do titular ao qual este beneficiário está vinculado. Para titulares, use o próprio nome. Para dependentes, use o nome do titular correspondente conforme aparece no documento
- matricula: Número de matrícula ou código do beneficiário. Se não encontrado, use ""
- data_admissao: Data de admissão/inclusão no formato YYYY-MM-DD. Se não encontrado, use ""
- situacao: "ATIVO" ou "INATIVO". Se não informado, use "ATIVO"
- planos: array com os planos ativos da pessoa. Valores possíveis: "saude", "odonto", "vida". Ex: ["saude", "odonto"]

Retorne APENAS um JSON válido no seguinte formato, sem nenhum texto antes ou depois:
[
  {
    "nome_completo": "NOME COMPLETO",
    "cpf": "12345678901",
    "data_nascimento": "1990-01-15",
    "parentesco": "TITULAR",
    "nome_titular": "NOME DO TITULAR",
    "matricula": "12345",
    "data_admissao": "2020-03-01",
    "situacao": "ATIVO",
    "planos": ["saude"]
  }
]

Regras obrigatórias:
- Retorne SOMENTE o JSON, absolutamente nada mais
- Inclua TODOS os beneficiários do documento, titulares e dependentes
- Para dependentes, sempre preencha nome_titular com o nome do titular correspondente
- planos deve ser array, nunca string
- Se o documento for de saúde, inclua "saude" nos planos; se for odonto, inclua "odonto"; se for vida, inclua "vida"
- Se o documento misturar tipos, deduza pelo contexto de cada linha`,
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
      throw new Error('Claude não retornou dados estruturados. Verifique se o PDF contém uma lista de beneficiários.');
    }

    const data = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[parse-beneficiarios-pdf]', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar o PDF.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
