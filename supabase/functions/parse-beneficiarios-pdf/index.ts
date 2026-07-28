import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `Este e um relatorio ou lista de beneficiarios/segurados de uma seguradora ou operadora de planos brasileira.

Extraia TODOS os beneficiarios presentes no documento.

Para cada beneficiario retorne:
- nome_completo: Nome completo (em MAIUSCULAS)
- cpf: CPF com apenas 11 digitos numericos, sem pontos ou tracas. Se "000.000.000-00" ou nao encontrado, use ""
- data_nascimento: Data no formato YYYY-MM-DD. Se numero serial Excel (ex: 34826), converta: (serial - 25569) * 86400000 ms desde 1970-01-01. Se nao encontrado, use ""
- data_admissao: Data de admissao/inclusao no formato YYYY-MM-DD. Mesma conversao serial se necessario. Se nao encontrado, use ""
- parentesco: "TITULAR", "CONJUGE", "FILHO", "FILHA", "PAI", "MAE" ou "OUTRO". Se nao encontrado, use "TITULAR"
- nome_titular: Nome do titular. Para titulares, use o proprio nome. Para dependentes, identifique o titular
- nome_mae: Nome da mae do beneficiario. Se nao encontrado, use ""
- matricula: Numero de matricula ou codigo. Se nao encontrado, use ""
- situacao: "ATIVO" ou "INATIVO". Se nao informado, use "ATIVO"
- celular: Telefone/celular apenas com digitos. Se nao encontrado, use ""
- email_beneficiario: E-mail do beneficiario. Se nao encontrado, use ""
- cep: CEP apenas com 8 digitos numericos. Se nao encontrado, use ""
- rua: Logradouro com numero (ex: "RUA DAS FLORES, 123"). Extraia do campo de endereco completo. Se nao encontrado, use ""
- bairro: Nome do bairro. Extraia do campo de endereco completo. Se nao encontrado, use ""
- cidade: Nome da cidade. Extraia do campo de endereco completo. Se nao encontrado, use ""
- estado: Sigla do estado (ex: "SP"). Extraia do endereco ou deduza pelo contexto. Se nao encontrado, use ""
- saude_plano_nome: Nome do plano/convenio de saude (campo CONV. SAUDE ou similar). Se nao encontrado, use ""
- saude_ativo: true se possui convenio de saude ativo, false caso contrario

Retorne APENAS um JSON valido, sem nenhum texto antes ou depois:
[
  {
    "nome_completo": "NOME COMPLETO",
    "cpf": "12345678901",
    "data_nascimento": "1990-01-15",
    "data_admissao": "2020-03-01",
    "parentesco": "TITULAR",
    "nome_titular": "NOME DO TITULAR",
    "nome_mae": "NOME DA MAE",
    "matricula": "",
    "situacao": "ATIVO",
    "celular": "14999998888",
    "email_beneficiario": "email@exemplo.com",
    "cep": "18840106",
    "rua": "RUA SEBASTIAO ALMEIDA, 04",
    "bairro": "CONJ. HABITACIONAL FRANCISCO L.CORTEZ JUNIOR",
    "cidade": "SARUTAIA",
    "estado": "SP",
    "saude_plano_nome": "UNIMED - PME COMPACTO ENF CP",
    "saude_ativo": true
  }
]

Regras:
- Retorne SOMENTE o JSON, absolutamente nada mais
- Inclua TODOS os beneficiarios, titulares e dependentes
- Para dependentes, preencha nome_titular com o nome do titular correspondente
- Para endereco completo (ex: "RUA X, 10 - BAIRRO - CIDADE-SP"), separe em rua, bairro, cidade, estado`;

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

    // Build message content depending on input type
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
    console.error('[parse-beneficiarios-pdf]', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar arquivo.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
