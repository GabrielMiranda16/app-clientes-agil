import { diasDoAtestado } from '@/services/atestadosService';

const DIA_MS = 86400000;
const LIMITE_INSS = 15;
const JANELA_INSS = 60;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

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

export const ehAfastamento = (a) => a.tipo !== 'COMPARECIMENTO';
const contaParaInss = (a) => ehAfastamento(a) && a.tipo !== 'ACOMPANHANTE' && a.status !== 'RECUSADO';
export const geraCusto = (a) => ehAfastamento(a) && (a.status === 'APROVADO' || a.status === 'PENDENTE' || !a.status);

export const marcasDoAtestado = (a, prazoEntregaDias = 2) => {
  const marcas = [];
  if (!ehAfastamento(a)) return marcas;
  const dias = diasDoAtestado(a);
  if (dias <= 2 && coladoEmFeriado(a)) marcas.push('Colado em feriado');
  else if (dias <= 2 && emendaFimDeSemana(a)) marcas.push('Emenda fim de semana');
  if (a.created_at && diferencaDias(a.data_inicio, a.created_at.slice(0, 10)) > prazoEntregaDias) marcas.push('Entregue com atraso');
  const risco = a.ia_dados?.risco?.nivel;
  if (risco === 'ALTO') marcas.push('Risco alto');
  else if (risco === 'MEDIO') marcas.push('Risco médio');
  return marcas;
};

const gruposDeMotivo = (itens, somaInss) => {
  if (somaInss === 'QUALQUER_MOTIVO') {
    return itens.length ? [{ itens, confirmado: true, rotulo: 'por qualquer motivo' }] : [];
  }
  const pai = new Map(itens.map((a) => [a.id, a.id]));
  const raiz = (id) => { while (pai.get(id) !== id) id = pai.get(id); return id; };
  const unir = (x, y) => { if (pai.has(x) && pai.has(y)) pai.set(raiz(x), raiz(y)); };
  const ligadosManual = new Set();
  itens.forEach((a) => {
    if (a.mesmo_motivo_de && pai.has(a.mesmo_motivo_de)) {
      unir(a.id, a.mesmo_motivo_de);
      ligadosManual.add(a.id);
      ligadosManual.add(a.mesmo_motivo_de);
    }
  });
  const porCid = new Map();
  itens.filter((a) => a.cid).forEach((a) => {
    const cid = a.cid.toUpperCase();
    if (porCid.has(cid)) unir(a.id, porCid.get(cid));
    else porCid.set(cid, a.id);
  });
  const grupos = new Map();
  itens.forEach((a) => {
    const r = raiz(a.id);
    grupos.set(r, [...(grupos.get(r) || []), a]);
  });
  return [...grupos.values()].map((lista) => {
    const cids = [...new Set(lista.filter((a) => a.cid).map((a) => a.cid.toUpperCase()))];
    return {
      itens: lista,
      confirmado: lista.every((a) => ligadosManual.has(a.id)),
      rotulo: cids.length ? `CID ${cids.join(', ')}` : 'mesmo motivo',
    };
  });
};

export const analisarAtestados = (atestados, { prazoEntregaDias = 2, somaInss = 'MESMO_MOTIVO' } = {}) => {
  const hoje = new Date();
  const inicioJanela = paraIso(new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()));
  const recentes = atestados.filter((a) => a.data_inicio >= inicioJanela);
  const validos = recentes.filter((a) => ehAfastamento(a) && a.status !== 'RECUSADO');

  const mapa = new Map();
  recentes.forEach((a) => {
    const p = mapa.get(a.beneficiario_id) || {
      id: a.beneficiario_id,
      nome: a.beneficiarios?.nome_completo || '—',
      matricula: a.beneficiarios?.matricula_empresa || null,
      salario: a.beneficiarios?.salario != null ? Number(a.beneficiarios.salario) : null,
      itens: [],
    };
    p.itens.push(a);
    mapa.set(a.beneficiario_id, p);
  });

  const alertas = [];

  const pessoas = [...mapa.values()].map((p) => {
    const itens = [...p.itens].sort((x, y) => y.data_inicio.localeCompare(x.data_inicio));
    const afast = itens.filter((a) => ehAfastamento(a) && a.status !== 'RECUSADO');
    const dias = afast.reduce((s, a) => s + diasDoAtestado(a), 0);
    const diasCusto = itens.filter(geraCusto).reduce((s, a) => s + diasDoAtestado(a), 0);
    const cids = new Map();
    afast.filter((a) => a.cid).forEach((a) => {
      const cid = a.cid.toUpperCase();
      const atual = cids.get(cid) || { cid, qtd: 0, dias: 0 };
      atual.qtd += 1;
      atual.dias += diasDoAtestado(a);
      cids.set(cid, atual);
    });
    const meus = [];

    const paraInss = itens.filter(contaParaInss);
    const longos = paraInss.filter((a) => diasDoAtestado(a) > LIMITE_INSS);
    longos.forEach((a) => {
      meus.push({
        tipo: 'INSS', chave: `inss-unico-${a.id}`, atestadoId: a.id,
        titulo: `Atestado de ${diasDoAtestado(a)} dias`,
        detalhe: `A empresa paga só os primeiros ${LIMITE_INSS} dias. A partir do 16º, encaminhar ao INSS.`,
      });
    });
    gruposDeMotivo(paraInss.filter((a) => diasDoAtestado(a) <= LIMITE_INSS), somaInss).forEach((g) => {
      if (g.itens.length < 2) return;
      const ordenada = [...g.itens].sort((x, y) => x.data_inicio.localeCompare(y.data_inicio));
      let maior = 0;
      ordenada.forEach((base, i) => {
        const soma = ordenada.slice(i).filter((a) => diferencaDias(base.data_inicio, a.data_inicio) <= JANELA_INSS)
          .reduce((t, a) => t + diasDoAtestado(a), 0);
        maior = Math.max(maior, soma);
      });
      if (maior > LIMITE_INSS) {
        meus.push({
          tipo: 'INSS', chave: `inss-${p.id}-${ordenada[0].id}`, atestadoId: ordenada[ordenada.length - 1].id,
          titulo: `${maior} dias em ${JANELA_INSS} dias (${g.rotulo})`,
          detalhe: g.confirmado
            ? `Afastamentos pelo mesmo motivo em até ${JANELA_INSS} dias são somados. Passou de ${LIMITE_INSS} dias: encaminhar ao INSS.`
            : `Possível mesmo motivo. Se for, os afastamentos em até ${JANELA_INSS} dias são somados e, passando de ${LIMITE_INSS} dias, o caso vai para o INSS. Confirme com o médico do trabalho.`,
        });
      }
    });

    const curtos = afast.filter((a) => diasDoAtestado(a) <= 2);
    const suspeitos = curtos.filter((a) => coladoEmFeriado(a) || emendaFimDeSemana(a));
    if (curtos.length >= 3 && suspeitos.length / curtos.length >= 0.6) {
      meus.push({ tipo: 'PADRAO', chave: `padrao-${p.id}`, titulo: `${suspeitos.length} de ${curtos.length} atestados curtos emendam folga`, detalhe: 'Atestados de 1 ou 2 dias colados em fim de semana ou feriado.' });
    }

    meus.forEach((al) => alertas.push({ ...al, pessoaId: p.id, titulo: `${p.nome}: ${al.titulo.charAt(0).toLowerCase()}${al.titulo.slice(1)}` }));

    return {
      id: p.id, nome: p.nome, matricula: p.matricula, salario: p.salario, itens,
      qtd: afast.length, dias, diasCusto,
      pendentes: itens.filter((a) => (a.status || 'PENDENTE') === 'PENDENTE').length,
      cids: [...cids.values()].sort((x, y) => y.dias - x.dias),
      bradford: afast.length ** 2 * dias, alertas: meus,
    };
  }).sort((x, y) => y.dias - x.dias || y.qtd - x.qtd || x.nome.localeCompare(y.nome));

  const medicos = new Map();
  validos.filter((a) => a.crm).forEach((a) => {
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
    const doMes = validos.filter((a) => a.data_inicio.slice(0, 7) === chave);
    porMes.push({ mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, atestados: doMes.length, dias: doMes.reduce((t, a) => t + diasDoAtestado(a), 0) });
  }

  const cidsGeral = new Map();
  validos.forEach((a) => {
    const cid = a.cid ? a.cid.toUpperCase() : 'Sem CID';
    cidsGeral.set(cid, (cidsGeral.get(cid) || 0) + diasDoAtestado(a));
  });
  const porCid = [...cidsGeral.entries()].map(([cid, dias]) => ({ cid, dias })).sort((x, y) => y.dias - x.dias).slice(0, 6);

  const pendentes = atestados.filter((a) => (a.status || 'PENDENTE') === 'PENDENTE')
    .sort((x, y) => x.data_inicio.localeCompare(y.data_inicio));

  return { pessoas, alertas, porMes, porCid, totalAtestados: validos.length, pendentes };
};

export const acharDuplicado = (atestados, novo, ignorarId = null) => atestados.find((a) =>
  a.id !== ignorarId && a.beneficiario_id === novo.beneficiario_id && a.data_inicio === novo.data_inicio && a.tipo === novo.tipo
);
