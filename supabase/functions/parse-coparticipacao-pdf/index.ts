const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `Voce vai receber um arquivo de coparticipacao de plano de saude ou odontologico de uma seguradora brasileira.
O arquivo pode ser um PDF, CSV, Excel exportado como texto, ou um arquivo TXT de largura fixa (posicional).

Extraia TODOS os registros de coparticipacao presentes no documento.

Para cada registro retorne:
- nome_beneficiario: Nome do titular/beneficiario do plano (quem e o segurado principal). Em MAIUSCULAS
- quem_utilizou: Nome de quem efetivamente utilizou o servico. Em MAIUSCULAS. Se nao diferenciado, use o mesmo nome_beneficiario
- cpf_quem_utilizou: CPF de quem utilizou (apenas 11 digitos numericos, sem pontos ou tracas). Se nao encontrado, use ""
- valor: Valor da coparticipacao em reais (numero float, ponto como decimal, ex: 45.90). Se nao encontrado, use 0
- descricao: Descricao do procedimento, especialidade ou servico. Em MAIUSCULAS. Se nao houver descricao, use o periodo de competencia (ex: "COPARTICIPACAO 04/2026")

---

FORMATO CONHECIDO 1 — Arquivo TXT posicional (largura fixa) da Sul America:

Exemplo de conteudo:
1016/05/2026                                000000000000000
208888848445359001MARIA NATALICIA SILVA BARRETO         03094162789604/2026+0000000000035878X1PV25/12/1982...
208888848455461001JESSYCA PACHI RODRIGUES SELMAN        04096830089804/2026+0000000000153558X1PV18/03/1991...
90+000000000047226000004

Layout fixo de cada linha de detalhe (tipo = "2"):
- Pos 1:     tipo_registro (1=cabecalho, 2=detalhe, 9=rodape — processe apenas tipo "2")
- Pos 2-15:  codigo do beneficiario (14 chars)
- Pos 16-18: codigo sequencial (3 chars, ex: "001")
- Pos 19-56: nome_beneficiario (38 chars, preenchido com espacos a direita — faca trim)
- Pos 57-67: cpf (11 digitos numericos)
- Pos 68:    codigo extra (1 char, ignore)
- Pos 69-75: periodo de competencia (7 chars, formato MM/YYYY, ex: "04/2026")
- Pos 76:    sinal do valor ("+" ou "-")
- Pos 77-92: valor em centavos (16 chars inteiros — divida por 100 para obter reais, ex: "0000000000035878" = R$ 358.78)
- Pos 93-96: codigo do tipo de procedimento (4 chars, ex: "X1PV")
- Pos 97-106: data de nascimento (10 chars, formato DD/MM/YYYY)

Exemplo de extracao para a linha acima:
  nome_beneficiario: "MARIA NATALICIA SILVA BARRETO"
  quem_utilizou: "MARIA NATALICIA SILVA BARRETO"
  cpf_quem_utilizou: "03094162789"
  valor: 358.78
  descricao: "COPARTICIPACAO 04/2026"

---

FORMATO CONHECIDO 2 — CSV ou Excel exportado:
Cada linha e um registro com colunas como: nome, cpf, valor, descricao, periodo, etc.
- Converta valores monetarios "R$ 1.234,56" para float 1234.56
- CPF pode estar formatado "000.000.000-00" — remova pontos e traco

---

FORMATO CONHECIDO 3 — PDF de relatorio:
Extraia todos os itens listados. O nome do beneficiario pode aparecer como cabecalho de grupo antes de varios procedimentos.

---

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
- valor deve ser numero float, nunca string
- Se valor nao encontrado, use 0
- Se cpf nao encontrado, use ""
- Se quem_utilizou nao encontrado, copie nome_beneficiario
- Inclua TODOS os registros do documento, sem omitir nenhum
- Para formato TXT posicional: ignore linhas com tipo "1" (cabecalho) e "9" (rodape)`;

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
          { type: 'text', text: PROMPT + '\n\nConteudo do arquivo:\n\n' + csvText },
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
