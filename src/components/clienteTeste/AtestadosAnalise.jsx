import React, { useMemo } from 'react';
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell,
} from 'recharts';
import { custoEstimado, diasDoAtestado, STATUS_ATESTADO, TIPOS_ATESTADO } from '@/services/atestadosService';
import { ehAfastamento, geraCusto } from '@/services/atestadosAnalise';

const NAVY = '#003580';
const ANTERIOR = '#B6C8E3';
const CORES = ['#2563B8', '#1F9E96', '#D9822B', '#8A63C9'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ENCARGOS_REFERENCIA = 80;

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPct = (v, casas = 1) => `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

const grupoDoCid = (cid) => {
  if (!cid) return 'Sem CID informado';
  const c = cid.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letra = c[0];
  const num = Number(c.slice(1, 3));
  if (letra === 'A' || letra === 'B') return 'Infecções';
  if (letra === 'C' || (letra === 'D' && num <= 48)) return 'Tumores';
  if (letra === 'D') return 'Sangue';
  if (letra === 'E') return 'Hormonais e metabólicas';
  if (letra === 'F') return 'Saúde mental';
  if (letra === 'G') return 'Sistema nervoso';
  if (letra === 'H') return num <= 59 ? 'Olhos' : 'Ouvidos';
  if (letra === 'I') return 'Coração e circulação';
  if (letra === 'J') return 'Respiratórias';
  if (letra === 'K') return 'Digestivas';
  if (letra === 'L') return 'Pele';
  if (letra === 'M') return 'Coluna, músculos e articulações';
  if (letra === 'N') return 'Urinárias e genitais';
  if (letra === 'O') return 'Gravidez e parto';
  if (letra === 'S' || letra === 'T') return 'Lesões e fraturas';
  if (letra === 'R') return 'Sintomas gerais';
  if (letra === 'Z') return 'Exames e acompanhamento';
  return 'Outras';
};

const faixaEtaria = (nascimento, hoje) => {
  if (!nascimento) return null;
  const n = new Date(`${nascimento}T00:00:00`);
  let idade = hoje.getFullYear() - n.getFullYear();
  if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) idade -= 1;
  if (idade < 20) return 'Até 19';
  if (idade < 30) return '20 a 29';
  if (idade < 40) return '30 a 39';
  if (idade < 50) return '40 a 49';
  if (idade < 60) return '50 a 59';
  return '60 ou mais';
};

const faixaDuracao = (a) => {
  if (!ehAfastamento(a)) return 'Horas';
  const d = diasDoAtestado(a);
  if (d <= 4) return `${d} ${d === 1 ? 'dia' : 'dias'}`;
  if (d <= 14) return '5 a 14 dias';
  return '15 ou mais';
};

const Cartao = ({ titulo, descricao, children, className = '' }) => (
  <div className={`bg-white border border-gray-100 rounded-2xl p-5 ${className}`}>
    <h2 className="font-bold text-gray-900">{titulo}</h2>
    {descricao && <p className="text-xs text-gray-400 mb-3">{descricao}</p>}
    {children}
  </div>
);

const Variacao = ({ atual, anterior, bomQuandoCai = true }) => {
  if (!anterior) return <p className="text-xs text-gray-400 mt-1">Sem dados do período anterior</p>;
  const pct = ((atual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 0.5) return <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Minus className="w-3 h-3" /> Igual ao período anterior</p>;
  const subiu = pct > 0;
  const bom = bomQuandoCai ? !subiu : subiu;
  const Icone = subiu ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`text-xs mt-1 flex items-center gap-1 ${bom ? 'text-emerald-700' : 'text-red-700'}`}>
      <Icone className="w-3 h-3" /> {formatPct(Math.abs(pct), 0)} {subiu ? 'a mais' : 'a menos'} que nos 12 meses anteriores
    </p>
  );
};

const Rosca = ({ dados }) => {
  const total = dados.reduce((t, d) => t + d.valor, 0);
  if (!total) return <p className="text-sm text-gray-400">Sem dados no período.</p>;
  return (
    <div className="flex items-center gap-4">
      <PieChart width={130} height={130}>
        <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={40} outerRadius={62} paddingAngle={2} stroke="none">
          {dados.map((d, i) => <Cell key={d.nome} fill={d.cor || CORES[i % CORES.length]} />)}
        </Pie>
        <Tooltip formatter={(v, nome) => [`${v} (${formatPct((v / total) * 100, 0)})`, nome]} />
      </PieChart>
      <div className="space-y-1.5 min-w-0">
        {dados.map((d, i) => (
          <div key={d.nome} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.cor || CORES[i % CORES.length] }} />
            <span className="text-gray-900 truncate">{d.nome}</span>
            <span className="text-gray-500 flex-shrink-0">{d.valor} · {formatPct((d.valor / total) * 100, 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const eixoX = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: '#9ca3af' }, interval: 0 };
const eixoY = { allowDecimals: false, tickLine: false, axisLine: false, width: 28, tick: { fontSize: 11, fill: '#9ca3af' } };

const AtestadosAnalise = ({ atestados, beneficiarios, config, onVoltar, rodape }) => {
  const d = useMemo(() => {
    const hoje = new Date();
    const inicioAtual = iso(new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()));
    const inicioAnterior = iso(new Date(hoje.getFullYear() - 2, hoje.getMonth(), hoje.getDate()));
    const salarioBase = Number(config.salario_base);
    const encargos = Number(config.encargos_percentual) || ENCARGOS_REFERENCIA;
    const pessoaDe = new Map(beneficiarios.map((b) => [b.id, b]));
    const validos = atestados.filter((a) => a.status !== 'RECUSADO');
    const custoDe = (a) => (geraCusto(a) ? custoEstimado(diasDoAtestado(a), Number(a.beneficiarios?.salario) || salarioBase) : 0);
    const diasDe = (a) => (ehAfastamento(a) ? diasDoAtestado(a) : 0);

    const resumir = (lista) => ({
      atestados: lista.length,
      dias: lista.reduce((t, a) => t + diasDe(a), 0),
      custo: lista.reduce((t, a) => t + custoDe(a), 0),
      pessoas: new Set(lista.map((a) => a.beneficiario_id)).size,
    });
    const atualLista = validos.filter((a) => a.data_inicio >= inicioAtual);
    const anteriorLista = validos.filter((a) => a.data_inicio >= inicioAnterior && a.data_inicio < inicioAtual);
    const atual = resumir(atualLista);
    const anterior = resumir(anteriorLista);

    const titulares = beneficiarios.filter((b) => !b.parentesco || b.parentesco === 'TITULAR').length || beneficiarios.length;
    const absenteismo = titulares ? (atual.dias / (titulares * 365)) * 100 : 0;
    const absenteismoAnterior = titulares ? (anterior.dias / (titulares * 365)) * 100 : 0;
    const afast = atualLista.filter(ehAfastamento);

    const porMes = [];
    for (let i = 11; i >= 0; i -= 1) {
      const m = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      const chaveAnt = `${m.getFullYear() - 1}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      const doMes = atualLista.filter((a) => a.data_inicio.slice(0, 7) === chave);
      porMes.push({
        mes: MESES[m.getMonth()],
        atual: doMes.length,
        anterior: anteriorLista.filter((a) => a.data_inicio.slice(0, 7) === chaveAnt).length,
        custo: Math.round(doMes.reduce((t, a) => t + custoDe(a), 0) * 100) / 100,
      });
    }

    const contar = (lista, chaveDe, valorDe = () => 1) => {
      const mapa = new Map();
      lista.forEach((a) => {
        const k = chaveDe(a);
        if (k == null) return;
        mapa.set(k, (mapa.get(k) || 0) + valorDe(a));
      });
      return mapa;
    };

    const grupos = [...contar(afast, (a) => grupoDoCid(a.cid), diasDe).entries()]
      .map(([nome, dias]) => ({ nome, dias })).sort((x, y) => y.dias - x.dias).slice(0, 8);

    const semana = contar(atualLista, (a) => new Date(`${a.data_inicio}T00:00:00`).getDay());
    const porDiaSemana = [1, 2, 3, 4, 5, 6, 0].map((n) => ({ dia: DIAS_SEMANA[n], atestados: semana.get(n) || 0 }));

    const sexo = contar(atualLista, (a) => pessoaDe.get(a.beneficiario_id)?.sexo || 'N');
    const porSexo = [
      { nome: 'Mulheres', valor: sexo.get('F') || 0 },
      { nome: 'Homens', valor: sexo.get('M') || 0 },
      { nome: 'Não informado', valor: sexo.get('N') || 0, cor: '#CBD5E1' },
    ].filter((x) => x.valor > 0);

    const idade = contar(atualLista, (a) => faixaEtaria(pessoaDe.get(a.beneficiario_id)?.data_nascimento, hoje));
    const porIdade = ['Até 19', '20 a 29', '30 a 39', '40 a 49', '50 a 59', '60 ou mais'].map((f) => ({ faixa: f, atestados: idade.get(f) || 0 }));

    const duracao = contar(atualLista, faixaDuracao);
    const porDuracao = ['Horas', '1 dia', '2 dias', '3 dias', '4 dias', '5 a 14 dias', '15 ou mais'].map((f) => ({ faixa: f, atestados: duracao.get(f) || 0 }));

    const noPeriodo = atestados.filter((a) => a.data_inicio >= inicioAtual);
    const status = contar(noPeriodo, (a) => a.status || 'PENDENTE');
    const CORES_STATUS = { PENDENTE: '#D9822B', APROVADO: '#2563B8', RECUSADO: '#C2410C', SEM_ABONO: '#94A3B8' };
    const porStatus = Object.keys(STATUS_ATESTADO).map((s) => ({ nome: STATUS_ATESTADO[s].label, valor: status.get(s) || 0, cor: CORES_STATUS[s] })).filter((x) => x.valor > 0);

    const comCid = atualLista.filter((a) => a.cid).length;
    const porCid = [{ nome: 'Com CID', valor: comCid }, { nome: 'Sem CID', valor: atualLista.length - comCid }].filter((x) => x.valor > 0);

    const tipo = contar(atualLista, (a) => a.tipo || 'ATESTADO');
    const porTipo = TIPOS_ATESTADO.map((t) => ({ nome: t.label, valor: tipo.get(t.value) || 0 })).filter((x) => x.valor > 0);

    return {
      atual, anterior, titulares, absenteismo, absenteismoAnterior, encargos,
      mediaDias: afast.length ? afast.reduce((t, a) => t + diasDe(a), 0) / afast.length : 0,
      pctPessoas: titulares ? (atual.pessoas / titulares) * 100 : 0,
      porMes, grupos, porDiaSemana, porSexo, porIdade, porDuracao, porStatus, porCid, porTipo,
    };
  }, [atestados, beneficiarios, config]);

  const comEncargos = (v) => v * (1 + d.encargos / 100);
  const NUMEROS = [
    { rotulo: 'Atestados', valor: d.atual.atestados, atual: d.atual.atestados, anterior: d.anterior.atestados },
    { rotulo: 'Dias de afastamento', valor: d.atual.dias, atual: d.atual.dias, anterior: d.anterior.dias },
    { rotulo: 'Absenteísmo', valor: formatPct(d.absenteismo, 2), atual: d.absenteismo, anterior: d.absenteismoAnterior },
    { rotulo: 'Média de dias por atestado', valor: d.mediaDias.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
    { rotulo: 'Pessoas com atestado', valor: `${d.atual.pessoas} de ${d.titulares}`, extra: formatPct(d.pctPessoas, 0) },
  ];

  return (
    <div className="space-y-6">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Atestados
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Análise</h1>
        <p className="text-gray-400 text-sm">Últimos 12 meses, comparados com os 12 meses anteriores. Atestados recusados não entram.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {NUMEROS.map((n) => (
          <div key={n.rotulo} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{n.rotulo}</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{n.valor}</p>
            {n.extra && <p className="text-xs text-gray-400 mt-1">{n.extra} das pessoas</p>}
            {n.atual != null && <Variacao atual={n.atual} anterior={n.anterior} />}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 -mt-3">
        Absenteísmo = dias de afastamento ÷ (pessoas × 365). Base de {plural(d.titulares, 'pessoa cadastrada', 'pessoas cadastradas')} no plano.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { rotulo: 'Custo sem encargos', nota: 'Só o salário dos dias de afastamento.', atual: d.atual.custo, anterior: d.anterior.custo },
          { rotulo: 'Custo com encargos', nota: `Salário mais ${formatPct(d.encargos, 0)} de encargos${Number(config.encargos_percentual) ? '' : ' (referência; ajustável nas regras)'}.`, atual: comEncargos(d.atual.custo), anterior: comEncargos(d.anterior.custo) },
        ].map((c) => (
          <div key={c.rotulo} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{c.rotulo}</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{formatBRL(c.atual)}</p>
            <p className="text-xs text-gray-400 mt-1">{c.nota}</p>
            <Variacao atual={c.atual} anterior={c.anterior} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cartao titulo="Atestados por mês" descricao="Cada mês comparado com o mesmo mês do ano anterior.">
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: NAVY }} /> Últimos 12 meses</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ANTERIOR }} /> 12 meses anteriores</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={d.porMes} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={2} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="anterior" name="12 meses anteriores" fill={ANTERIOR} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="atual" name="Últimos 12 meses" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Cartao>

        <Cartao titulo="Custo por mês" descricao="Custo sem encargos, pelo mês de início do atestado.">
          <ResponsiveContainer width="100%" height={236}>
            <BarChart data={d.porMes} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} width={56} tickFormatter={(v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [formatBRL(v), 'Custo']} />
              <Bar dataKey="custo" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Cartao>

        <Cartao titulo="Grupos de doença" descricao="Dias de afastamento por grupo, somando a empresa toda.">
          {d.grupos.length === 0 ? <p className="text-sm text-gray-400">Sem dados no período.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(120, d.grupos.length * 34)}>
              <BarChart data={d.grupos} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap="28%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nome" tickLine={false} axisLine={false} width={210} tick={{ fontSize: 12, fill: '#111827' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [plural(v, 'dia', 'dias'), 'Afastamento']} />
                <Bar dataKey="dias" fill={NAVY} radius={[0, 4, 4, 0]} maxBarSize={18}>
                  <LabelList dataKey="dias" position="right" style={{ fontSize: 12, fill: '#6b7280' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Cartao>

        <Cartao titulo="Duração dos atestados" descricao="Quantos atestados em cada faixa de dias.">
          <ResponsiveContainer width="100%" height={236}>
            <BarChart data={d.porDuracao} margin={{ top: 16, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="faixa" {...eixoX} />
              <YAxis {...eixoY} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [plural(v, 'atestado', 'atestados'), null]} separator="" />
              <Bar dataKey="atestados" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={32}>
                <LabelList dataKey="atestados" position="top" style={{ fontSize: 11, fill: '#6b7280' }} formatter={(v) => v || ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Cartao>

        <Cartao titulo="Dia da semana" descricao="Em que dia os atestados começam.">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={d.porDiaSemana} margin={{ top: 16, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dia" {...eixoX} />
              <YAxis {...eixoY} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [plural(v, 'atestado', 'atestados'), null]} separator="" />
              <Bar dataKey="atestados" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={32}>
                <LabelList dataKey="atestados" position="top" style={{ fontSize: 11, fill: '#6b7280' }} formatter={(v) => v || ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Cartao>

        <Cartao titulo="Faixa etária" descricao="Atestados pela idade de quem entregou.">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={d.porIdade} margin={{ top: 16, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="faixa" {...eixoX} />
              <YAxis {...eixoY} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [plural(v, 'atestado', 'atestados'), null]} separator="" />
              <Bar dataKey="atestados" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={32}>
                <LabelList dataKey="atestados" position="top" style={{ fontSize: 11, fill: '#6b7280' }} formatter={(v) => v || ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Cartao>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Cartao titulo="Por sexo" descricao="Atestados entregues."><Rosca dados={d.porSexo} /></Cartao>
        <Cartao titulo="Situação" descricao="Decisão do RH."><Rosca dados={d.porStatus} /></Cartao>
        <Cartao titulo="Com e sem CID" descricao="O CID não é obrigatório."><Rosca dados={d.porCid} /></Cartao>
        <Cartao titulo="Tipo de documento" descricao="O que foi entregue."><Rosca dados={d.porTipo} /></Cartao>
      </div>

      {rodape}
    </div>
  );
};

export default AtestadosAnalise;
