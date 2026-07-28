import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Parser direto para formato posicional tipo "20" ────────────────────────
// Layout (posições 1-indexadas):
//  01-02 : tipo registro ("20")
//  03-18 : codigo beneficiario (16)
//  19-50 : nome do beneficiario / quem utilizou (32)
//  51-56 : setor (6)
//  57-68 : CPF do titular (12 — 11 digitos + 1 espaco)
//  69-75 : mes referencia MM/YYYY (7)
//  76    : sinal valor + ou -
//  77-91 : valor co-participacao, inteiro sem decimal / 100 = reais (15)
//  92-96 : codigo empresa (5)
//  97-106: data nascimento (10)
// 107-121: codigo titular (15)
// 122-153: nome do titular (32)
// 154-181: area livre (28)
function parseTipoVinte(text: string) {
  const records: any[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.startsWith('20') || line.length < 91) continue;

    const nomeBenef  = line.substring(18, 50).trim().toUpperCase();
    const cpf        = line.substring(56, 68).replace(/\D/g, '').substring(0, 11);
    const mesRef     = line.substring(68, 75).trim();
    const sinal      = line[75] === '-' ? -1 : 1;
    const valorInt   = parseInt(line.substring(76, 91), 10) || 0;
    const valor      = (valorInt / 100) * sinal;
    const nomeTitular = line.length >= 153 ? line.substring(121, 153).trim().toUpperCase() : '';

    if (!nomeBenef && !nomeTitular) continue;
    records.push({
      nome_beneficiario: nomeTitular || nomeBenef,
      quem_utilizou: nomeBenef || nomeTitular,
      cpf_quem_utilizou: cpf,
      valor,
      descricao: mesRef ? `COPARTICIPACAO ${mesRef}` : 'COPARTICIPACAO',
    });
  }
  return records;
}

// ─── Parser direto para formato Sul América tipo "2" (1 char) ───────────────
// Layout:
//  1     : tipo registro ("2")
//  2-15  : codigo beneficiario (14)
// 16-18  : sequencial (3)
// 19-56  : nome beneficiario (38)
// 57-67  : CPF (11)
// 68     : codigo extra (1)
// 69-75  : periodo MM/YYYY (7)
// 76     : sinal + ou -
// 77-92  : valor em centavos (16)
function parseSulAmerica(text: string) {
  const records: any[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.length < 10 || line[0] !== '2' || line[1] === '0') continue;

    const nome   = line.substring(18, 56).trim().toUpperCase();
    const cpf    = line.substring(56, 67).replace(/\D/g, '');
    const periodo = line.substring(68, 75).trim();
    const sinal  = line[75] === '-' ? -1 : 1;
    const valorInt = parseInt(line.substring(76, 92), 10) || 0;
    const valor  = (valorInt / 100) * sinal;

    if (!nome) continue;
    records.push({
      nome_beneficiario: nome,
      quem_utilizou: nome,
      cpf_quem_utilizou: cpf,
      valor,
      descricao: periodo ? `COPARTICIPACAO ${periodo}` : 'COPARTICIPACAO',
    });
  }
  return records;
}

// ─── Tenta parsear TXT posicional; retorna null se formato desconhecido ──────
function tryParseTxt(text: string): any[] | null {
  const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(Boolean);

  const hasTipo20 = lines.some(l => l.startsWith('20') && l.length >= 91);
  if (hasTipo20) return parseTipoVinte(text);

  const hasTipo2  = lines.some(l => l[0] === '2' && l[1] !== '0' && l.length >= 80);
  if (hasTipo2) return parseSulAmerica(text);

  return null;
}

// ─── Prompt para Claude (PDF / CSV / formatos desconhecidos) ─────────────────
// Este prompt acumula conhecimento de todos os formatos ja vistos.
// Sempre adicionar novos formatos aqui ao encontra-los — nunca remover.
const PROMPT = `Voce vai receber um arquivo de coparticipacao de plano de saude ou odontologico de uma seguradora brasileira.
O arquivo pode ser um PDF, CSV, Excel exportado como texto, ou um arquivo TXT de largura fixa (posicional).

Extraia TODOS os registros de coparticipacao presentes no documento.

Para cada registro retorne:
- nome_beneficiario: Nome do titular/beneficiario do plano (titular principal). Em MAIUSCULAS
- quem_utilizou: Nome de quem efetivamente utilizou o servico. Em MAIUSCULAS. Se nao diferenciado, use o mesmo nome_beneficiario
- cpf_quem_utilizou: CPF de quem utilizou (apenas 11 digitos numericos, sem pontos ou traco). Se nao encontrado, use ""
- valor: Valor da coparticipacao em reais (numero float, ponto como decimal, ex: 45.90). Se nao encontrado, use 0
- descricao: Descricao do procedimento, especialidade ou servico. Em MAIUSCULAS. Se nao houver descricao, use o periodo de competencia (ex: "COPARTICIPACAO 04/2026")

---

FORMATO CONHECIDO 1 — TXT posicional Sul America (tipo registro "2", 1 char):

Exemplo de conteudo:
1016/05/2026                                000000000000000
208888848445359001MARIA NATALICIA SILVA BARRETO         03094162789604/2026+0000000000035878X1PV25/12/1982...
208888848455461001JESSYCA PACHI RODRIGUES SELMAN        04096830089804/2026+0000000000153558X1PV18/03/1991...
90+000000000047226000004

Layout fixo de cada linha de detalhe (processe apenas linhas com tipo "2" na pos 1):
- Pos 1:     tipo_registro ("2" = detalhe; "1" = cabecalho, "9" = rodape — ignore estes)
- Pos 2-15:  codigo do beneficiario (14 chars)
- Pos 16-18: codigo sequencial (3 chars)
- Pos 19-56: nome_beneficiario (38 chars, trim)
- Pos 57-67: CPF (11 digitos)
- Pos 68:    codigo extra (1 char, ignore)
- Pos 69-75: periodo de competencia MM/YYYY (7 chars)
- Pos 76:    sinal do valor ("+" ou "-")
- Pos 77-92: valor em centavos (16 chars inteiros — divida por 100 para obter reais)
  Ex: "0000000000035878" = R$ 358.78

Exemplo de extracao:
  nome_beneficiario: "MARIA NATALICIA SILVA BARRETO"
  quem_utilizou: "MARIA NATALICIA SILVA BARRETO"
  cpf_quem_utilizou: "03094162789"
  valor: 358.78
  descricao: "COPARTICIPACAO 04/2026"

---

FORMATO CONHECIDO 2 — TXT posicional (tipo registro "20", 2 chars):

Identificacao: linhas de detalhe comecam com "20" nas primeiras 2 posicoes.

Layout de cada linha de DETALHE (processe apenas linhas iniciadas com "20"):
- Pos 01-02  (2):  Tipo de Registro = "20"
- Pos 03-18  (16): Codigo do Beneficiario (ignore)
- Pos 19-50  (32): Nome do Beneficiario — quem utilizou o servico (trim)
- Pos 51-56  (6):  Setor de lotacao (ignore)
- Pos 57-68  (12): CPF do titular (11 digitos + possivelmente 1 espaco — use apenas digitos)
- Pos 69-75  (7):  Mes de referencia MM/YYYY (ex: "04/2026")
- Pos 76     (1):  Sinal do valor "+" ou "-"
- Pos 77-91  (15): Valor como inteiro sem ponto decimal (N, zeros a esquerda)
  → Divida por 100 para obter reais. Aplique sinal da pos 76.
  → Ex: "000000000012345" = R$ 123,45
- Pos 92-96  (5):  Codigo da Empresa (ignore)
- Pos 97-106 (10): Data de Nascimento (ignore)
- Pos 107-121 (15): Codigo do Titular (ignore)
- Pos 122-153 (32): Nome do Titular do plano (trim)
- Pos 154-181 (28): Area Livre — ignore

Nota sobre tipos de campo:
  N = numerico, alinhado a direita, zeros a esquerda
  A = alfanumerico, alinhado a esquerda, brancos a direita

Mapeamento para os campos de saida:
- nome_beneficiario → Nome do Titular (pos 122-153, trim)
- quem_utilizou     → Nome do Beneficiario (pos 19-50, trim)
- cpf_quem_utilizou → CPF pos 57-68 (apenas digitos)
- valor             → pos 77-91 / 100 com sinal da pos 76
- descricao         → "COPARTICIPACAO " + mes de referencia (pos 69-75)

TRAILER (linhas iniciadas com "90"): ignore.

---

FORMATO CONHECIDO 3 — CSV ou Excel exportado:
Cada linha e um registro com colunas como: nome, cpf, valor, descricao, periodo, etc.
- Converta valores monetarios "R$ 1.234,56" para float 1234.56
- CPF pode estar formatado "000.000.000-00" — remova pontos e traco

---

FORMATO CONHECIDO 4 — PDF de relatorio:
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
- Para formatos TXT posicionais: ignore linhas de cabecalho e rodape`;

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

    // Para TXT, tenta parsear diretamente sem chamar Claude
    if (csvText) {
      const parsed = tryParseTxt(csvText);
      if (parsed !== null) {
        return new Response(JSON.stringify({ data: parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // PDF ou CSV/Excel desconhecido — usa Claude
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
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
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
