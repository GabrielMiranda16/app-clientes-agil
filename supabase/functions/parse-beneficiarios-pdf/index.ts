const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = 'Este e um relatorio ou lista de beneficiarios/segurados de uma seguradora ou operadora de planos brasileira.\n\nExtraia TODOS os beneficiarios presentes no documento.\n\nPara cada beneficiario retorne:\n- nome_completo: Nome completo da pessoa (em MAIUSCULAS)\n- cpf: CPF com apenas 11 digitos numericos, sem pontos ou tracas (ex: "12345678901"). Se for "000.000.000-00" ou nao encontrado, use ""\n- data_nascimento: Data no formato YYYY-MM-DD. Se nao encontrado, use ""\n- parentesco: Um dos valores: "TITULAR", "CONJUGE", "FILHO", "FILHA", "PAI", "MAE", "OUTRO". Deduza pelo campo de tipo/parentesco do documento. Se nao encontrado, use "TITULAR"\n- nome_titular: Nome do titular ao qual este beneficiario esta vinculado. Para titulares, use o proprio nome. Para dependentes, identifique o titular pelo codigo de familia ou ID funcional compartilhado no documento\n- matricula: Numero de matricula, ID funcional ou codigo do beneficiario. Se nao encontrado, use ""\n- data_admissao: Data de admissao/inclusao/inicio de vigencia no formato YYYY-MM-DD. Se nao encontrado, use ""\n- situacao: "ATIVO" ou "INATIVO". Se nao informado, use "ATIVO"\n\nRetorne APENAS um JSON valido no seguinte formato, sem nenhum texto antes ou depois:\n[\n  {\n    "nome_completo": "NOME COMPLETO",\n    "cpf": "12345678901",\n    "data_nascimento": "1990-01-15",\n    "parentesco": "TITULAR",\n    "nome_titular": "NOME DO TITULAR",\n    "matricula": "12345",\n    "data_admissao": "2020-03-01",\n    "situacao": "ATIVO"\n  }\n]\n\nRegras obrigatorias:\n- Retorne SOMENTE o JSON, absolutamente nada mais\n- Inclua TODOS os beneficiarios do documento, titulares e dependentes\n- Para dependentes, sempre preencha nome_titular com o nome do titular correspondente\n- Vincule dependentes ao titular pelo codigo de familia ou ID funcional compartilhado (mesma linha ou mesmo grupo)\n- Nao inclua campos de plano, premio ou valor';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'PDF nao informado.' }), {
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
                text: PROMPT,
              },
            ],
          },
        ],
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
    console.error('[parse-beneficiarios-pdf]', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar o PDF.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
