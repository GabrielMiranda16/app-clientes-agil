import { diasDoAtestado } from '@/services/atestadosService';

const DIA_MS = 86400000;
const LIMITE_INSS = 15;
const JANELA_INSS = 60;

const paraData = (iso) => new Date(`${iso}T00:00:00`);
const paraIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const somar = (d, dias) => { const r = new Date(d); r.setDate(r.getDate() + dias); return r; };
const diferencaDias = (a, b) => Math.round((paraData(b) - paraData(a)) / DIA_MS);

const pascoa = (ano) => {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
};

const feriadosPorAno = new Map();
const feriadosDoAno = (ano) => {
  if (!feriadosPorAno.has(ano)) {
    const p = pascoa(ano);
    const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map((d) => `${ano}-${d}`);
    const moveis = [-48, -47, -2, 60].map((n) => paraIso(somar(p, n)));
    feriadosPorAno.set(ano, new Set([...fixos, ...moveis]));
  }
  return feriadosPorAno.get(ano);
};
const ehFeriado = (d) => feriadosDoAno(d.getFullYear()).has(paraIso(d));
const ehFolga = (d) => d.getDay() === 0 || d.getDay() === 6 || ehFeriado(d);

const coladoEmFeriado = (a) => {
  const inicio = paraData(a.data_inicio);
  const fim = paraData(a.data_fim || a.data_inicio);
  let antes = somar(inicio, -1);
  while (antes.getDay() === 0 || antes.getDay() === 6) antes = somar(antes, -1);
  let depois = somar(fim, 1);
  while (depois.getDay() === 0 || depois.getDay() === 6) depois = somar(depois, 1);
  return ehFeriado(antes) || ehFeriado(depois);
};

const emendaFimDeSemana = (a) => {
  const inicio = paraData(a.data_inicio);
  const fim = paraData(a.data_fim || a.data_inicio);
  return ehFolga(somar(inicio, -1)) || ehFolga(somar(fim, 1));
};

export const marcasDoAtestado = (a) => {
  const marcas = [];
  if (a.tipo === 'COMPARECIMENTO') return marcas;
  const dias = diasDoAtestado(a);
  if (dias <= 2 && coladoEmFeriado(a)) marcas.push('Colado em feriado');
  else if (dias <= 2 && emendaFimDeSemana(a)) marcas.push('Emenda fim de semana');
  if (a.created_at && diferencaDias(a.data_inicio, a.created_at.slice(0, 10)) > 2) marcas.push('Entregue com atraso');
  const risco = a.ia_dados?.risco?.nivel;
  if (risco === 'ALTO') marcas.push('Risco alto');
  else if (risco === 'MEDIO') marcas.push('Risco médio');
  return marcas;
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const analisarAtestados = (atestados) => {
  const hoje = new Date();
  const inicioJanela = paraIso(new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()));
  const recentes = atestados.filter((a) => a.data_inicio >= inicioJanela);
  const ehAfastamento = (a) => a.tipo !== 'COMPARECIMENTO';
  const afastamentos = recentes.filter(ehAfastamento);

  const mapa = new Map();
  recentes.forEach((a) => {
    const p = mapa.get(a.beneficiario_id) || { id: a.beneficiario_id, nome: a.beneficiarios?.nome_completo || '—', cpf: a.beneficiarios?.cpf, itens: [] };
    p.itens.push(a);
    mapa.set(a.beneficiario_id, p);
  });

  const alertas = [];

  const pessoas = [...mapa.values()].map((p) => {
    const itens = [...p.itens].sort((x, y) => y.data_inicio.localeCompare(x.data_inicio));
    const afast = itens.filter(ehAfastamento);
    const dias = afast.reduce((s, a) => s + diasDoAtestado(a), 0);
    const cids = new Map();
    afast.filter((a) => a.cid).forEach((a) => {
      const cid = a.cid.toUpperCase();
      const atual = cids.get(cid) || { cid, qtd: 0, dias: 0 };
      atual.qtd += 1;
      atual.dias += diasDoAtestado(a);
      cids.set(cid, atual);
    });
    const meus = [];

    const porCid = new Map();
    afast.forEach((a) => {
      const d = diasDoAtestado(a);
      if (d > LIMITE_INSS) {
        meus.push({ tipo: 'INSS', chave: `inss-unico-${a.id}`, titulo: `Atestado de ${d} dias`, detalhe: `Acima de ${LIMITE_INSS} dias a empresa paga só os primeiros ${LIMITE_INSS}. Encaminhar ao INSS.` });
        return;
      }
      if (!a.cid) return;
      const cid = a.cid.toUpperCase();
      porCid.set(cid, [...(porCid.get(cid) || []), a]);
    });
    porCid.forEach((lista, cid) => {
      const ordenada = [...lista].sort((x, y) => x.data_inicio.localeCompare(y.data_inicio));
      let maior = 0;
      ordenada.forEach((base, i) => {
        const soma = ordenada.slice(i).filter((a) => diferencaDias(base.data_inicio, a.data_inicio) <= JANELA_INSS)
          .reduce((t, a) => t + diasDoAtestado(a), 0);
        maior = Math.max(maior, soma);
      });
      if (ordenada.length > 1 && maior > LIMITE_INSS) {
        meus.push({ tipo: 'INSS', chave: `inss-${p.id}-${cid}`, titulo: `${maior} dias pelo CID ${cid} em ${JANELA_INSS} dias`, detalhe: `Atestados pelo mesmo CID em até ${JANELA_INSS} dias são somados. Passou de ${LIMITE_INSS} dias: encaminhar ao INSS.` });
      }
    });

    const curtos = afast.filter((a) => diasDoAtestado(a) <= 2);
    const suspeitos = curtos.filter((a) => coladoEmFeriado(a) || emendaFimDeSemana(a));
    if (curtos.length >= 3 && suspeitos.length / curtos.length >= 0.6) {
      meus.push({ tipo: 'PADRAO', chave: `padrao-${p.id}`, titulo: `${suspeitos.length} de ${curtos.length} atestados curtos emendam folga`, detalhe: 'Atestados de 1 ou 2 dias colados em fim de semana ou feriado.' });
    }

    meus.forEach((al) => alertas.push({ ...al, pessoaId: p.id, titulo: `${p.nome}: ${al.titulo.charAt(0).toLowerCase()}${al.titulo.slice(1)}` }));

    return {
      id: p.id, nome: p.nome, cpf: p.cpf, itens,
      qtd: afast.length, dias, cids: [...cids.values()].sort((x, y) => y.dias - x.dias),
      bradford: afast.length ** 2 * dias, alertas: meus,
    };
  }).sort((x, y) => y.bradford - x.bradford || y.qtd - x.qtd || x.nome.localeCompare(y.nome));

  const medicos = new Map();
  afastamentos.filter((a) => a.crm).forEach((a) => {
    const chave = `${a.crm}/${(a.crm_uf || '').toUpperCase()}`;
    const m = medicos.get(chave) || { chave, nome: a.medico_nome, pessoas: new Set(), qtd: 0 };
    m.pessoas.add(a.beneficiario_id);
    m.qtd += 1;
    medicos.set(chave, m);
  });
  medicos.forEach((m) => {
    if (m.pessoas.size >= 3) {
      alertas.push({ tipo: 'MEDICO', chave: `medico-${m.chave}`, titulo: `CRM ${m.chave}${m.nome ? ` (${m.nome})` : ''}: ${m.qtd} atestados para ${m.pessoas.size} pessoas`, detalhe: 'Mesmo médico emitindo atestados para várias pessoas da empresa.' });
    }
  });

  const ordem = { INSS: 0, MEDICO: 1, PADRAO: 2 };
  alertas.sort((x, y) => ordem[x.tipo] - ordem[y.tipo]);

  const porMes = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const doMes = afastamentos.filter((a) => a.data_inicio.slice(0, 7) === chave);
    porMes.push({ mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, atestados: doMes.length, dias: doMes.reduce((t, a) => t + diasDoAtestado(a), 0) });
  }

  const cidsGeral = new Map();
  afastamentos.forEach((a) => {
    const cid = a.cid ? a.cid.toUpperCase() : 'Sem CID';
    cidsGeral.set(cid, (cidsGeral.get(cid) || 0) + diasDoAtestado(a));
  });
  const porCid = [...cidsGeral.entries()].map(([cid, dias]) => ({ cid, dias })).sort((x, y) => y.dias - x.dias).slice(0, 6);

  const diasTotal = afastamentos.reduce((t, a) => t + diasDoAtestado(a), 0);

  return { pessoas, alertas, porMes, porCid, diasTotal, totalAtestados: afastamentos.length };
};

export const acharDuplicado = (atestados, novo) => atestados.find((a) =>
  a.beneficiario_id === novo.beneficiario_id && a.data_inicio === novo.data_inicio && a.tipo === novo.tipo
);
