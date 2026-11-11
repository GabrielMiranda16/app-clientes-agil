import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.agilseguros.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEDIA_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const texto = { type: ['string', 'null'] };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'eh_atestado', 'tipo', 'paciente_nome', 'data_emissao', 'data_inicio', 'data_fim',
    'dias_afastamento', 'cid', 'medico_nome', 'crm', 'crm_uf', 'local_atendimento',
    'legibilidade', 'observacoes', 'risco',
  ],
  properties: {
    eh_atestado: { type: 'boolean' },
    tipo: { type: 'string', enum: ['ATESTADO', 'ODONTOLOGICO', 'COMPARECIMENTO', 'ACOMPANHANTE', 'OUTRO'] },
    paciente_nome: texto,
    data_emissao: texto,
    data_inicio: texto,
    data_fim: texto,
    dias_afastamento: { type: ['integer', 'null'] },
    cid: texto,
    medico_nome: texto,
    crm: texto,
    crm_uf: texto,
    local_atendimento: texto,
    legibilidade: { type: 'string', enum: ['BOA', 'PARCIAL', 'RUIM'] },
    observacoes: texto,
    risco: {
      type: 'object',
      additionalProperties: false,
      required: ['nivel', 'sinais'],
      properties: {
        nivel: { type: 'string', enum: ['BAIXO', 'MEDIO', 'ALTO'] },
        sinais: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

const SYSTEM = `Você lê atestados médicos brasileiros (foto de celular ou PDF) enviados pelo RH de uma empresa e extrai os dados para cadastro. Quem confere o resultado é uma pessoa do RH, antes de salvar.

Regras de extração:
- Extraia somente o que está escrito no documento. Campo ausente ou ilegível fica null. Nunca complete por dedução um nome, CRM ou CID que você não conseguiu ler.
- Datas no formato YYYY-MM-DD. A data de hoje é ${new Date().toISOString().slice(0, 10)}; use-a só para resolver anos abreviados.
- tipo: ATESTADO quando um médico afasta a pessoa por um ou mais dias; ODONTOLOGICO quando quem afasta é um dentista (registro CRO); COMPARECIMENTO quando só declara presença em consulta ou exame por horas; ACOMPANHANTE quando declara que a pessoa acompanhou outra (filho, cônjuge) em consulta, exame ou internação; OUTRO quando o documento não é nenhum desses (receita, pedido de exame, etc.).
- eh_atestado: false quando o tipo for OUTRO.
- data_inicio: primeiro dia de afastamento. Se o documento não disser, é a data de emissão.
- dias_afastamento: número de dias corridos de afastamento escrito no documento. Em COMPARECIMENTO é 0.
- data_fim: último dia de afastamento. Se o documento só informar a quantidade de dias, calcule data_inicio + dias_afastamento - 1.
- cid: código no padrão CID-10 (ex.: J11, M54.5), só se estiver escrito. O CID é opcional no atestado; a ausência é normal.
- crm: apenas os dígitos do registro do médico (ou do CRO, se for dentista). crm_uf: a sigla do estado do registro (ex.: SP).
- local_atendimento: nome da clínica, hospital ou consultório, se constar.
- legibilidade: BOA se leu tudo com segurança, PARCIAL se algum campo ficou em dúvida, RUIM se a maior parte está ilegível.
- observacoes: em uma frase curta, diga quais campos ficaram em dúvida e por quê, para o RH saber o que conferir. null se não houver dúvida.

Sinais de atenção (campo risco):
Você não tem como provar que um atestado é falso, e uma acusação errada prejudica um funcionário. O objetivo é só apontar o que o RH deveria verificar antes de aceitar o documento. Liste em sinais apenas o que é observável no próprio documento, cada um em uma frase curta e concreta. Exemplos do que conta: falta de assinatura do médico; em atestado manuscrito, falta de carimbo ou do número do CRM; CRM ausente, sem UF ou com formato estranho; nome do médico ausente ou incompleto; falta do nome do paciente; falta da data de emissão; falta da quantidade de dias de dispensa; emitido por profissional que não é médico nem dentista; rasura ou sobrescrita em data ou quantidade de dias; quantidade de dias em número diferente da escrita por extenso; data de emissão futura ou muito distante do início do afastamento; trechos com fonte, alinhamento ou cor diferentes do resto, sugerindo edição; ausência de identificação do local de atendimento; afastamento longo demais para o CID informado.
- nivel BAIXO: documento com os elementos esperados e sem inconsistência. sinais fica vazio.
- nivel MEDIO: falta algum elemento esperado ou há uma inconsistência pequena.
- nivel ALTO: há rasura, divergência entre campos ou indício de edição em dado essencial (paciente, datas, dias, médico).
Foto torta, escura ou de baixa qualidade não é sinal de fraude: isso entra em legibilidade, não em risco. Ausência de CID também não é sinal: o CID só consta se o paciente pedir. Falta de CPF do paciente ou de telefone e endereço do médico é, no máximo, nível MEDIO.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const authToken = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData?.user) return json({ error: 'Não autenticado.' }, 401);

    const { fileBase64, mediaType } = await req.json();
    if (!fileBase64 || !MEDIA_TYPES.includes(mediaType)) {
      return json({ error: 'Envie um PDF ou uma imagem (JPG, PNG ou WEBP).' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY não configurada' }, 500);

    const client = new Anthropic({ apiKey });

    const arquivo = mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: fileBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } };

    const response = await client.beta.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{
        role: 'user',
        content: [arquivo, { type: 'text', text: 'Extraia os dados deste atestado.' }],
      }],
    } as any);

    if (response.stop_reason === 'refusal') {
      return json({ error: 'A IA não conseguiu analisar este documento. Preencha os campos manualmente.' }, 422);
    }
    if (response.stop_reason === 'max_tokens') {
      return json({ error: 'A leitura foi interrompida antes de terminar. Tente de novo.' }, 502);
    }

    const bloco = response.content.find((b: any) => b.type === 'text') as any;
    if (!bloco?.text) return json({ error: 'A IA não retornou dados.' }, 502);

    return json({ data: JSON.parse(bloco.text) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: 'Muitas leituras ao mesmo tempo. Tente de novo em instantes.' }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic', err.status, err.message);
      return json({ error: 'Falha ao consultar a IA (' + err.status + ').' }, 502);
    }
    console.error(err);
    return json({ error: 'Erro ao processar o atestado.' }, 500);
  }
});
