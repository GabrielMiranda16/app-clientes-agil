const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const buildPrompt = (segmento: string) => `
Você é um especialista em seguros brasileiros. Analise esta apólice de seguro e extraia as informações em JSON.

Segmento: ${segmento}

Retorne APENAS um JSON válido com esta estrutura (sem texto antes ou depois):
{
  "numero_apolice": "número da apólice sem espaços extras",
  "seguradora": "nome da seguradora/operadora",
  "vigencia_inicio": "YYYY-MM-DD",
  "vigencia_fim": "YYYY-MM-DD",
  "valor_premio": 0.00,
  "descricao": "descrição resumida do seguro",
  "dados_adicionais": ${buildDadosAdicionaisPrompt(segmento)}
}

Regras:
- Datas sempre em formato YYYY-MM-DD
- valor_premio é o prêmio anual total em número (sem R$, sem pontos de milhar, use ponto decimal)
- Se não encontrar um campo, use "" para strings e 0 para números
- Para a seguradora, use o nome comercial (ex: "Porto Seguro", "SulAmérica", "Bradesco")
- numero_apolice: inclua todos os números da apólice como aparecem no documento
`;

const buildDadosAdicionaisPrompt = (segmento: string): string => {
  if (segmento === 'AUTO_FROTA') {
    return `{
  "veiculos": [
    {
      "placa": "placa do veículo",
      "marca": "marca (ex: RAM, Toyota, VW)",
      "modelo": "modelo completo do veículo",
      "cor": "cor do veículo",
      "ano": "ano de fabricação"
    }
  ]
}`;
  }
  if (segmento === 'RESIDENCIAL' || segmento === 'EMPRESARIAL') {
    return `{
  "cep": "00000-000",
  "rua": "logradouro e número",
  "bairro": "bairro",
  "cidade": "cidade",
  "estado": "UF"
}`;
  }
  if (segmento === 'EQUIPAMENTOS') {
    return `{
  "tipo_equipamento": "tipo (ex: Notebook, Câmera)",
  "marca": "marca",
  "modelo": "modelo",
  "numero_serie": "número de série se houver"
}`;
  }
  if (segmento === 'VIAGEM') {
    return `{
  "segurados": [
    { "nome": "nome completo", "cpf": "apenas dígitos" }
  ]
}`;
  }
  return '{}';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { pdfBase64, segmento } = await req.json();

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'pdfBase64 obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(segmento || 'GERAL');

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: prompt },
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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('IA não retornou JSON válido.');

    const data = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
