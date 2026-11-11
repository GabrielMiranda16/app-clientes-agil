import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { apolicesService } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { atestadosService, custoEstimado, diasDoAtestado, CONFIG_PADRAO, ETAPAS_AFASTAMENTO, MOTIVOS_RECUSA, STATUS_ATESTADO, TIPOS_ATESTADO } from '@/services/atestadosService';
import { analisarAtestados, acharDuplicado, avisosDoAcompanhamento, emAcompanhamento, geraCusto, retornoPrevisto } from '@/services/atestadosAnalise';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AtestadoCard from '@/components/clienteTeste/AtestadoCard';
import { ArrowLeft, Loader2, Stethoscope, Plus, Trash2, Sparkles, FileText, Upload, AlertTriangle, ChevronRight, Pencil } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import { PainelLateral, PainelCorpo, PainelRodape } from '@/components/clienteTeste/PainelLateral';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const EMPTY_FORM = {
  beneficiario_id: '', tipo: 'ATESTADO', data_emissao: '', data_inicio: '', data_fim: '',
  dias_afastamento: '', horas: '', cid: '', medico_nome: '', crm: '', crm_uf: '', motivo: '', observacoes: '',
  mesmo_motivo_de: 'NENHUM',
};

const ALERTA_ESTILO = {
  INSS: { rotulo: 'INSS', classe: 'bg-red-50 text-red-700' },
  MEDICO: { rotulo: 'Mesmo médico', classe: 'bg-amber-50 text-amber-700' },
  PADRAO: { rotulo: 'Padrão', classe: 'bg-amber-50 text-amber-700' },
};

const resumoCids = (p) => {
  if (p.cids.length === 0) return '—';
  if (p.cids.length === 1) return p.cids[0].cid;
  return `${p.cids.length} diferentes`;
};

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(`${d}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const mascaraBRL = (texto) => (Number(String(texto).replace(/\D/g, '') || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const isoLocal = (date) => format(date, 'yyyy-MM-dd');

const somarDias = (iso, dias) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
};

const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const acharBeneficiario = (beneficiarios, nome) => {
  const alvo = normalizar(nome);
  if (!alvo) return null;
  const candidatos = beneficiarios.filter((b) => {
    const n = normalizar(b.nome_completo);
    return n === alvo || n.includes(alvo) || alvo.includes(n);
  });
  return candidatos.length === 1 ? candidatos[0] : null;
};

const AtestadosTestePage = () => {
  const { apoliceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [apolice, setApolice] = useState(null);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [atestados, setAtestados] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [arquivo, setArquivo] = useState(null);
  const [iaDados, setIaDados] = useState(null);
  const [isLendo, setIsLendo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pessoaAbertaId, setPessoaAbertaId] = useState(null);
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [editando, setEditando] = useState(null);
  const [salarioEdit, setSalarioEdit] = useState(null);
  const [acompanharId, setAcompanharId] = useState(null);
  const [recusa, setRecusa] = useState(null);

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(async (ap) => {
        setApolice(ap);
        const [ben, ats, cfg] = await Promise.all([
          beneficiariosService.getBeneficiariosByEmpresa(ap.empresa_id).catch(() => []),
          atestadosService.getAtestadosByApolice(apoliceId).catch(() => []),
          atestadosService.getConfig(ap.empresas?.empresa_matriz_id || ap.empresa_id).catch(() => CONFIG_PADRAO),
        ]);
        setConfig(cfg);
        setBeneficiarios(ben.filter(b => !b.data_exclusao));
        setAtestados(ats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  const resumo = useMemo(() => {
    const hoje = isoLocal(new Date());
    const mesAtual = hoje.slice(0, 7);
    const afastamentos = atestados.filter((a) => a.tipo !== 'COMPARECIMENTO' && a.status !== 'RECUSADO');

    const afastadosAgora = afastamentos.filter((a) => a.data_inicio <= hoje && hoje <= (a.data_fim || a.data_inicio));
    const retornosMes = afastamentos.filter((a) => {
      const retorno = somarDias(a.data_fim || a.data_inicio, 1);
      return retorno.slice(0, 7) === mesAtual && retorno <= hoje;
    });

    const analise = analisarAtestados(atestados, { prazoEntregaDias: config.prazo_entrega_dias, somaInss: config.soma_inss });
    const salarioBase = Number(config.salario_base);
    const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const agora = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      meses.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rotulo: `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` });
    }
    const custoDoAtestado = (a, salario) => (geraCusto(a) ? custoEstimado(diasDoAtestado(a), salario) : 0);
    const totalMes = {};
    const pessoas = analise.pessoas.map((p) => {
      const salarioMensal = p.salario || salarioBase;
      const custoMes = {};
      p.itens.forEach((a) => {
        const c = custoDoAtestado(a, salarioMensal);
        if (!c) return;
        const chave = a.data_inicio.slice(0, 7);
        custoMes[chave] = (custoMes[chave] || 0) + c;
        totalMes[chave] = (totalMes[chave] || 0) + c;
      });
      return { ...p, salarioMensal, custo: custoEstimado(p.diasCusto, salarioMensal), custoMes };
    });
    const ranking = [...pessoas].sort((x, y) => y.qtd - x.qtd || y.dias - x.dias || x.nome.localeCompare(y.nome));
    const salarioDe = new Map(pessoas.map((p) => [p.id, p.salarioMensal]));
    const ordemDe = new Map();
    const contador = new Map();
    [...atestados].sort((x, y) => x.data_inicio.localeCompare(y.data_inicio) || x.id - y.id).forEach((a) => {
      const n = (contador.get(a.beneficiario_id) || 0) + 1;
      contador.set(a.beneficiario_id, n);
      ordemDe.set(a.id, n);
    });
    const linhas = [...atestados].sort((x, y) => y.data_inicio.localeCompare(x.data_inicio) || y.id - x.id).map((a) => ({
      atestado: a,
      ordem: ordemDe.get(a.id),
      dias: a.tipo === 'COMPARECIMENTO' ? 0 : diasDoAtestado(a),
      custo: custoDoAtestado(a, salarioDe.get(a.beneficiario_id) || salarioBase),
    }));
    const custoTotal = pessoas.reduce((t, p) => t + p.custo, 0);
    const algumEstimado = pessoas.some((p) => !p.salario && p.diasCusto > 0);

    const porId = new Map(atestados.map((a) => [a.id, a]));
    const inssPendentes = analise.alertas
      .filter((al) => al.tipo === 'INSS' && al.atestadoId && !porId.get(al.atestadoId)?.etapa)
      .map((al) => ({ ...al, atestado: porId.get(al.atestadoId) }));
    const acompanhados = atestados.filter(emAcompanhamento)
      .map((a) => ({ atestado: a, avisos: avisosDoAcompanhamento(a), retorno: retornoPrevisto(a) }))
      .sort((x, y) => (x.retorno || '9').localeCompare(y.retorno || '9'));
    const limite = somarDias(hoje, 30);
    const retornosPrevistos = acompanhados.filter((x) => x.retorno && x.retorno >= hoje && x.retorno <= limite).length;

    return { afastadosAgora, retornosMes, ...analise, pessoas, custoTotal, algumEstimado, inssPendentes, acompanhados, retornosPrevistos, ranking, linhas, meses, totalMes };
  }, [atestados, config]);

  const pessoaAberta = resumo.pessoas.find((p) => p.id === pessoaAbertaId) || null;

  const abrirNovo = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setArquivo(null);
    setIaDados(null);
    setIsAddOpen(true);
  };

  const abrirEdicao = (a) => {
    setEditando(a);
    setForm({
      beneficiario_id: String(a.beneficiario_id),
      tipo: a.tipo || 'ATESTADO',
      data_emissao: a.data_emissao || '',
      data_inicio: a.data_inicio || '',
      data_fim: a.data_fim || '',
      dias_afastamento: a.dias_afastamento != null ? String(a.dias_afastamento) : '',
      horas: a.horas != null ? String(Number(a.horas)) : '',
      cid: a.cid || '',
      medico_nome: a.medico_nome || '',
      crm: a.crm || '',
      crm_uf: a.crm_uf || '',
      motivo: a.motivo || '',
      observacoes: a.observacoes || '',
      mesmo_motivo_de: a.mesmo_motivo_de ? String(a.mesmo_motivo_de) : 'NENHUM',
    });
    setArquivo(null);
    setIaDados(a.ia_dados || null);
    setPessoaAbertaId(null);
    setIsAddOpen(true);
  };

  const handleDecidir = async (a, patch) => {
    try {
      const reabrindo = patch.status === 'PENDENTE';
      const atualizado = await atestadosService.updateAtestado(a.id, {
        ...patch,
        decidido_por: reabrindo ? null : (user?.email || null),
        decidido_em: reabrindo ? null : new Date().toISOString(),
      });
      setAtestados((prev) => prev.map((x) => (x.id === a.id ? atualizado : x)));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar a decisão', description: err.message });
    }
  };

  const handleAtualizar = async (a, patch) => {
    try {
      const atualizado = await atestadosService.updateAtestado(a.id, patch);
      setAtestados((prev) => prev.map((x) => (x.id === a.id ? atualizado : x)));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
      throw err;
    }
  };

  const abrirAcompanhamentoDe = (a) => {
    setAcompanharId(a.id);
    setPessoaAbertaId(a.beneficiario_id);
  };

  const handleSalvarSalario = async () => {
    const centavos = Number(salarioEdit.valor.replace(/\D/g, '') || 0);
    const valor = centavos > 0 ? centavos / 100 : null;
    try {
      await atestadosService.updateSalario(salarioEdit.id, valor);
      setAtestados((prev) => prev.map((x) => (x.beneficiario_id === salarioEdit.id ? { ...x, beneficiarios: { ...x.beneficiarios, salario: valor } } : x)));
      setSalarioEdit(null);
      toast({ title: valor ? 'Salário salvo.' : 'Sem salário cadastrado: o custo usa o salário base.' });
    } catch (err) {
      toast({ variant: 'destructive', title: err.message });
    }
  };

  const handleArquivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsLendo(true);
    try {
      const preparado = await atestadosService.prepararArquivo(file);
      setArquivo({ ...preparado, nome: file.name });
      const d = await atestadosService.lerComIA(preparado);
      setIaDados(d);
      if (!d.eh_atestado) {
        toast({ variant: 'destructive', title: 'Esse documento não parece um atestado.', description: 'Confira o arquivo ou preencha os campos manualmente.' });
        return;
      }
      const pessoa = acharBeneficiario(beneficiarios, d.paciente_nome);
      setForm((f) => ({
        ...f,
        beneficiario_id: pessoa ? String(pessoa.id) : f.beneficiario_id,
        tipo: TIPOS_ATESTADO.some((t) => t.value === d.tipo) ? d.tipo : 'ATESTADO',
        data_emissao: d.data_emissao || '',
        data_inicio: d.data_inicio || d.data_emissao || '',
        data_fim: d.data_fim || '',
        dias_afastamento: d.dias_afastamento != null ? String(d.dias_afastamento) : '',
        cid: d.cid || '',
        medico_nome: d.medico_nome || '',
        crm: d.crm || '',
        crm_uf: d.crm_uf || '',
      }));
      toast({
        title: 'Atestado lido. Confira os dados antes de salvar.',
        description: pessoa ? undefined : `Não encontrei "${d.paciente_nome || 'o paciente'}" na lista. Selecione a pessoa.`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Não foi possível ler o atestado', description: err.message });
    } finally {
      setIsLendo(false);
    }
  };

  const handleCriar = async () => {
    if (!form.beneficiario_id || !form.data_inicio) {
      toast({ variant: 'destructive', title: 'Selecione a pessoa e a data de início.' });
      return;
    }
    const beneficiarioId = Number(form.beneficiario_id);
    if (acharDuplicado(atestados, { beneficiario_id: beneficiarioId, data_inicio: form.data_inicio, tipo: form.tipo }, editando?.id)) {
      toast({ variant: 'destructive', title: 'Esse atestado já foi cadastrado.', description: 'Já existe um atestado dessa pessoa com início nessa data.' });
      return;
    }
    setIsSaving(true);
    let arquivoPath = null;
    try {
      if (arquivo) arquivoPath = await atestadosService.uploadArquivo(arquivo, apolice.empresa_id);
      const ehComparecimento = form.tipo === 'COMPARECIMENTO';
      const dados = {
        beneficiario_id: beneficiarioId,
        tipo: form.tipo,
        data_emissao: form.data_emissao || null,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        dias_afastamento: ehComparecimento ? 0 : (form.dias_afastamento === '' ? null : Number(form.dias_afastamento)),
        horas: ehComparecimento && form.horas !== '' ? Number(String(form.horas).replace(',', '.')) : null,
        cid: form.cid.trim().toUpperCase() || null,
        medico_nome: form.medico_nome.trim() || null,
        crm: form.crm.trim() || null,
        crm_uf: form.crm_uf.trim().toUpperCase() || null,
        motivo: form.motivo.trim() || null,
        observacoes: form.observacoes.trim() || null,
        mesmo_motivo_de: form.mesmo_motivo_de === 'NENHUM' ? null : Number(form.mesmo_motivo_de),
        ia_dados: iaDados,
      };
      if (editando) {
        const antigo = editando.arquivo_path;
        const atualizado = await atestadosService.updateAtestado(editando.id, arquivoPath ? { ...dados, arquivo_path: arquivoPath } : dados);
        if (arquivoPath && antigo) atestadosService.removerArquivo(antigo).catch(() => {});
        setAtestados((prev) => prev.map((x) => (x.id === editando.id ? atualizado : x)));
        toast({ title: 'Atestado atualizado.' });
      } else {
        const created = await atestadosService.createAtestado({
          ...dados,
          empresa_id: apolice.empresa_id,
          apolice_id: Number(apoliceId),
          arquivo_path: arquivoPath,
        });
        setAtestados((prev) => [created, ...prev]);
        toast({ title: 'Atestado cadastrado. Ele entra como pendente de decisão.' });
      }
      setIsAddOpen(false);
      setPessoaAbertaId(beneficiarioId);
    } catch (err) {
      if (arquivoPath) atestadosService.removerArquivo(arquivoPath).catch(() => {});
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluir = async (atestado) => {
    try {
      await atestadosService.deleteAtestado(atestado);
      setAtestados((prev) => prev.filter((a) => a.id !== atestado.id));
      toast({ title: 'Atestado removido.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  const handleVerArquivo = async (atestado) => {
    try {
      window.open(await atestadosService.getArquivoUrl(atestado.arquivo_path), '_blank', 'noopener');
    } catch (err) {
      toast({ variant: 'destructive', title: err.message });
    }
  };

  const campo = (chave) => ({
    value: form[chave],
    onChange: (e) => setForm((f) => ({ ...f, [chave]: e.target.value })),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  const outrosDaPessoa = form.beneficiario_id && form.tipo !== 'COMPARECIMENTO'
    ? atestados.filter((a) => String(a.beneficiario_id) === form.beneficiario_id && a.id !== editando?.id && a.tipo !== 'COMPARECIMENTO')
    : [];

  const detalheRecusa = recusa ? MOTIVOS_RECUSA.find((m) => m.value === recusa.motivo)?.detalhe : null;

  const INDICADORES = [
    { label: 'Atestados (12 meses)', valor: resumo.totalAtestados },
    { label: 'Pendentes de decisão', valor: resumo.pendentes.length },
    { label: 'Custo estimado total (12 meses)', valor: formatBRL(resumo.custoTotal) },
  ];


  return (
    <>
      <Helmet><title>Atestados - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Atestados</h1>
              <p className="text-gray-400 text-sm">Atestados vinculados a essa apólice.</p>
            </div>
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#003580] text-white text-sm font-semibold hover:bg-[#002060] transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Adicionar atestado
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {INDICADORES.map((i) => (
              <div key={i.label} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{i.label}</p>
                <p className="text-2xl font-bold tracking-tight text-gray-900">{i.valor}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 -mt-3">
            Custo proporcional aos dias de afastamento, pelo salário de cada pessoa. {resumo.algumEstimado ? `Quem não tem salário cadastrado entra com o salário base de ${formatBRL(Number(config.salario_base))}/mês.` : ''} Atestados recusados ou sem abono não entram no custo.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900">Atestados por mês</h2>
              <p className="text-xs text-gray-400 mb-3">Quantidade de atestados iniciados em cada mês, últimos 12 meses.</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={resumo.porMes} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} interval={0} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v, _n, item) => [`${v} ${v === 1 ? 'atestado' : 'atestados'} · ${item.payload.dias} ${item.payload.dias === 1 ? 'dia' : 'dias'}`, null]} separator="" />
                  <Bar dataKey="atestados" fill="#003580" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900">Dias de afastamento por CID</h2>
              <p className="text-xs text-gray-400 mb-3">Os CIDs que mais afastaram nos últimos 12 meses.</p>
              {resumo.porCid.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum atestado no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={resumo.porCid} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="cid" tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: '#111827' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [`${v} ${v === 1 ? 'dia' : 'dias'}`, null]} separator="" />
                    <Bar dataKey="dias" fill="#003580" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      <LabelList dataKey="dias" position="right" style={{ fontSize: 12, fill: '#6b7280' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {resumo.inssPendentes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h2 className="font-bold text-red-700 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Afastar pelo INSS
              </h2>
              <p className="text-xs text-red-700 mb-3">A empresa paga só os primeiros 15 dias. Passando disso, a pessoa deve ser encaminhada à perícia do INSS.</p>
              <div className="space-y-2">
                {resumo.inssPendentes.map((al) => (
                  <div key={al.chave} className="bg-white rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button type="button" onClick={() => abrirAcompanhamentoDe(al.atestado)} className="min-w-0 text-left">
                      <span className="block text-sm font-semibold text-gray-900">{al.titulo}</span>
                      <span className="block text-xs text-gray-500">{al.detalhe}</span>
                    </button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                      onClick={() => handleAtualizar(al.atestado, { etapa: 'ENCAMINHADO_INSS', inss_encaminhado_em: isoLocal(new Date()) }).catch(() => {})}
                    >
                      Marcar como encaminhado
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resumo.alertas.some((al) => al.tipo !== 'INSS') && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Alertas
              </h2>
              <div className="divide-y divide-gray-100">
                {resumo.alertas.filter((al) => al.tipo !== 'INSS').map((al) => (
                  <button
                    key={al.chave}
                    type="button"
                    disabled={!al.pessoaId}
                    onClick={() => setPessoaAbertaId(al.pessoaId)}
                    className="w-full flex items-start gap-3 py-2.5 text-left"
                  >
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${ALERTA_ESTILO[al.tipo].classe}`}>
                      {ALERTA_ESTILO[al.tipo].rotulo}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{al.titulo}</span>
                      <span className="block text-xs text-gray-500">{al.detalhe}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Atestados</h2>
            <p className="text-gray-400 text-sm mb-4">Um por linha, com os dias e o custo de cada um. Clique para ver os detalhes da pessoa.</p>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="max-h-[440px] overflow-y-auto">
                <div className="hidden sm:grid grid-cols-[1.7fr_0.8fr_0.7fr_0.5fr_0.9fr_0.7fr_1.5fr] gap-4 px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide sticky top-0 bg-white z-10 border-b border-gray-100">
                  <span>Pessoa</span>
                  <span>Data</span>
                  <span>Atestado</span>
                  <span>Dias</span>
                  <span>Custo est.</span>
                  <span>CID</span>
                  <span>Situação</span>
                </div>

                {resumo.linhas.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                    <Stethoscope className="w-8 h-8 text-gray-300" />
                    Nenhum atestado cadastrado.
                  </div>
                ) : (
                  resumo.linhas.map(({ atestado: a, ordem, dias, custo }) => {
                    const st = a.status || 'PENDENTE';
                    return (
                      <div
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setPessoaAbertaId(a.beneficiario_id)}
                        onKeyDown={(e) => e.key === 'Enter' && setPessoaAbertaId(a.beneficiario_id)}
                        className="w-full cursor-pointer grid grid-cols-[1fr_auto] sm:grid-cols-[1.7fr_0.8fr_0.7fr_0.5fr_0.9fr_0.7fr_1.5fr] gap-4 items-center px-5 py-3.5 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-gray-900 text-sm truncate">{a.beneficiarios?.nome_completo || '—'}</span>
                          {a.beneficiarios?.matricula_empresa && <span className="block text-xs text-gray-400">Matrícula {a.beneficiarios.matricula_empresa}</span>}
                        </span>
                        <span className="hidden sm:block text-sm text-gray-900">{formatDate(a.data_inicio)}</span>
                        <span className="hidden sm:block text-sm text-gray-900">{ordem}º</span>
                        <span className="hidden sm:block text-sm text-gray-900">{dias || '—'}</span>
                        <span className="hidden sm:block text-sm text-gray-900">{custo ? formatBRL(custo) : '—'}</span>
                        <span className="hidden sm:block text-sm text-gray-900 truncate">{a.cid || '—'}</span>
                        <span className="flex items-center gap-1.5">
                          {st === 'PENDENTE' ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-[#003580] hover:bg-[#002060] text-white"
                                onClick={(e) => { e.stopPropagation(); handleDecidir(a, { status: 'APROVADO', motivo_recusa: null, recusa_detalhe: null }); }}
                              >
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs text-red-600 hover:text-red-700"
                                onClick={(e) => { e.stopPropagation(); setRecusa({ atestado: a, nome: a.beneficiarios?.nome_completo || '', motivo: '', detalhe: '' }); }}
                              >
                                Recusar
                              </Button>
                            </>
                          ) : (
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_ATESTADO[st].classe}`}>{STATUS_ATESTADO[st].label}</span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Ranking de pessoas</h2>
            <p className="text-gray-400 text-sm mb-4">Totais dos últimos 12 meses, de quem mais entregou atestado para quem menos entregou.</p>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="max-h-[360px] overflow-y-auto">
                <div className="grid grid-cols-[40px_1.8fr_0.8fr_0.8fr_1fr] gap-4 px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide sticky top-0 bg-white z-10 border-b border-gray-100">
                  <span>#</span>
                  <span>Pessoa</span>
                  <span>Atestados</span>
                  <span>Dias totais</span>
                  <span>Custo total</span>
                </div>
                {resumo.ranking.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum atestado no período.</p>
                ) : (
                  resumo.ranking.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPessoaAbertaId(p.id)}
                      className="w-full grid grid-cols-[40px_1.8fr_0.8fr_0.8fr_1fr] gap-4 items-center px-5 py-3.5 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-400">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-bold text-gray-900 text-sm truncate">{p.nome}</span>
                        {p.alertas.length > 0 && (
                          <span className="flex flex-wrap gap-1 mt-1">
                            {p.alertas.map((al) => (
                              <span key={al.chave} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ALERTA_ESTILO[al.tipo].classe}`}>{ALERTA_ESTILO[al.tipo].rotulo}</span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-gray-900">{p.qtd}</span>
                      <span className="text-sm text-gray-900">{p.dias}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatBRL(p.custo)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Custo por mês</h2>
            <p className="text-gray-400 text-sm mb-4">Quanto cada pessoa custou em cada mês, pelo mês de início do atestado.</p>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      <th className="sticky top-0 left-0 z-20 bg-white text-left px-5 py-3 border-b border-gray-100 min-w-[200px]">Pessoa</th>
                      {resumo.meses.map((m) => (
                        <th key={m.chave} className="sticky top-0 z-10 bg-white text-right px-4 py-3 border-b border-gray-100 whitespace-nowrap">{m.rotulo}</th>
                      ))}
                      <th className="sticky top-0 z-10 bg-white text-right px-5 py-3 border-b border-gray-100">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.ranking.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="sticky left-0 bg-white px-5 py-3 font-bold text-gray-900 truncate max-w-[220px]">{p.nome}</td>
                        {resumo.meses.map((m) => (
                          <td key={m.chave} className={`px-4 py-3 text-right whitespace-nowrap ${p.custoMes[m.chave] ? 'text-gray-900' : 'text-gray-300'}`}>
                            {p.custoMes[m.chave] ? formatBRL(p.custoMes[m.chave]) : '—'}
                          </td>
                        ))}
                        <td className="px-5 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{formatBRL(p.custo)}</td>
                      </tr>
                    ))}
                    {resumo.ranking.length > 0 && (
                      <tr>
                        <td className="sticky bottom-0 left-0 z-20 bg-white px-5 py-3 font-bold text-gray-900 border-t border-gray-200">Total do mês</td>
                        {resumo.meses.map((m) => (
                          <td key={m.chave} className="sticky bottom-0 bg-white px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap border-t border-gray-200">
                            {resumo.totalMes[m.chave] ? formatBRL(resumo.totalMes[m.chave]) : '—'}
                          </td>
                        ))}
                        <td className="sticky bottom-0 bg-white px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap border-t border-gray-200">{formatBRL(resumo.custoTotal)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </ClienteSidebarLayout>

      <PainelLateral open={!!pessoaAberta} onOpenChange={(open) => { if (!open) { setPessoaAbertaId(null); setAcompanharId(null); } }} title={pessoaAberta?.nome || ''}>
        {pessoaAberta && (
          <PainelCorpo className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Atestados (12 meses)', valor: pessoaAberta.qtd },
                { label: 'Dias afastado', valor: pessoaAberta.dias },
                { label: pessoaAberta.salario ? 'Custo' : 'Custo estimado', valor: formatBRL(pessoaAberta.custo) },
                { label: 'Índice de Bradford', valor: pessoaAberta.bradford },
              ].map((i) => (
                <div key={i.label} className="border border-gray-100 rounded-2xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{i.label}</p>
                  <p className="text-xl font-bold tracking-tight text-gray-900">{i.valor}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Índice de Bradford = atestados² × dias. Faltas curtas e repetidas pesam mais que um afastamento longo.
            </p>

            <div className="border border-gray-100 rounded-2xl px-4 py-3">
              {salarioEdit?.id === pessoaAberta.id ? (
                <div className="space-y-2">
                  <Label className="text-xs">Salário mensal (R$)</Label>
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={salarioEdit.valor}
                    onChange={(e) => setSalarioEdit((v) => ({ ...v, valor: mascaraBRL(e.target.value) }))}
                    placeholder="0,00"
                  />
                  <p className="text-[11px] text-gray-400">Com 0,00 o custo usa o salário base de {formatBRL(Number(config.salario_base))}.</p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSalarioEdit(null)}>Cancelar</Button>
                    <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={handleSalvarSalario}>Salvar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Salário mensal</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatBRL(pessoaAberta.salarioMensal)}
                      {!pessoaAberta.salario && <span className="font-normal text-gray-400"> · estimado pelo salário base</span>}
                    </p>
                    {pessoaAberta.matricula && <p className="text-xs text-gray-400 mt-0.5">Matrícula {pessoaAberta.matricula}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSalarioEdit({ id: pessoaAberta.id, valor: mascaraBRL(String(Math.round((pessoaAberta.salario || 0) * 100))) })}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-[#003580] transition-colors flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Ajustar
                  </button>
                </div>
              )}
            </div>

            {pessoaAberta.alertas.length > 0 && (
              <div className="space-y-2">
                {pessoaAberta.alertas.map((al) => (
                  <div key={al.chave} className={`rounded-xl px-3 py-2 text-xs ${ALERTA_ESTILO[al.tipo].classe}`}>
                    <p className="font-semibold">{ALERTA_ESTILO[al.tipo].rotulo}: {al.titulo}</p>
                    <p>{al.detalhe}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">CIDs</p>
              {pessoaAberta.cids.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum atestado com CID informado.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-900 mb-2">
                    {pessoaAberta.cids.length === 1
                      ? (pessoaAberta.cids[0].qtd > 1 ? 'Sempre o mesmo CID.' : 'Um CID informado.')
                      : `${pessoaAberta.cids.length} CIDs diferentes.`}
                  </p>
                  <div className="divide-y divide-gray-100">
                    {pessoaAberta.cids.map((c) => (
                      <div key={c.cid} className="flex items-center justify-between py-2 text-sm">
                        <span className="font-semibold text-gray-900">{c.cid}</span>
                        <span className="text-gray-500">{c.qtd} {c.qtd === 1 ? 'atestado' : 'atestados'} · {c.dias} {c.dias === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Atestados</p>
              <div className="space-y-2">
                {pessoaAberta.itens.map((a) => (
                  <AtestadoCard
                    key={a.id}
                    atestado={a}
                    config={config}
                    salarioMensal={pessoaAberta.salarioMensal}
                    autor={user?.email || null}
                    abrirAcompanhamento={acompanharId === a.id}
                    onAtualizar={handleAtualizar}
                    onDecidir={handleDecidir}
                    onEditar={abrirEdicao}
                    onExcluir={handleExcluir}
                    onVerArquivo={handleVerArquivo}
                  />
                ))}
              </div>
            </div>
          </PainelCorpo>
        )}
      </PainelLateral>

      <Dialog open={!!recusa} onOpenChange={(open) => !open && setRecusa(null)}>
        <DialogContent className="bg-white" style={{ fontFamily: "'DM Sans', sans-serif", '--background': '0 0% 100%' }}>
          <DialogHeader>
            <DialogTitle>Recusar atestado</DialogTitle>
          </DialogHeader>
          {recusa && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {recusa.nome} · {formatDate(recusa.atestado.data_inicio)}
                {recusa.atestado.tipo !== 'COMPARECIMENTO' ? ` · ${diasDoAtestado(recusa.atestado)} ${diasDoAtestado(recusa.atestado) === 1 ? 'dia' : 'dias'}` : ''}
              </p>
              <div>
                <Label className="text-xs">Motivo da recusa *</Label>
                <Select value={recusa.motivo} onValueChange={(v) => setRecusa((r) => ({ ...r, motivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_RECUSA.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {recusa.motivo && (
                <div>
                  <Label className="text-xs">{detalheRecusa ? `${detalheRecusa} *` : 'Observação (opcional)'}</Label>
                  <Input value={recusa.detalhe} onChange={(e) => setRecusa((r) => ({ ...r, detalhe: e.target.value }))} />
                </div>
              )}
              <p className="text-[11px] text-gray-400">Recusado, o atestado não abona a falta e sai da conta de dias e de custo. Dá para desfazer depois.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecusa(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!recusa?.motivo || (detalheRecusa && !recusa.detalhe.trim())}
              onClick={async () => {
                await handleDecidir(recusa.atestado, { status: 'RECUSADO', motivo_recusa: recusa.motivo, recusa_detalhe: recusa.detalhe.trim() || null });
                setRecusa(null);
              }}
            >
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PainelLateral open={isAddOpen} onOpenChange={setIsAddOpen} title={editando ? 'Editar atestado' : 'Adicionar atestado'}>
          <PainelCorpo className="space-y-3">
            <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleArquivo} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isLendo}
              className="w-full flex items-center gap-3 border border-dashed border-gray-300 rounded-2xl px-4 py-3 text-left hover:border-[#003580] transition-colors disabled:opacity-60"
            >
              {isLendo ? <Loader2 className="w-5 h-5 animate-spin text-[#003580]" /> : arquivo ? <Sparkles className="w-5 h-5 text-[#003580]" /> : <Upload className="w-5 h-5 text-gray-500" />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 truncate">
                  {isLendo ? 'Lendo o atestado...' : arquivo ? arquivo.nome : 'Enviar foto ou PDF do atestado'}
                </span>
                <span className="block text-xs text-gray-400">
                  {arquivo && !isLendo ? 'Toque para trocar o arquivo' : 'A IA preenche os campos e você confere antes de salvar'}
                </span>
              </span>
            </button>
            {iaDados?.observacoes && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Conferir: {iaDados.observacoes}</p>
            )}
            {iaDados?.risco?.sinais?.length > 0 && (
              <div className={`text-xs rounded-xl px-3 py-2 ${iaDados.risco.nivel === 'ALTO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                <p className="font-semibold mb-1">
                  {iaDados.risco.nivel === 'ALTO' ? 'Risco alto: verificar antes de aceitar' : 'Pontos de atenção'}
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {iaDados.risco.sinais.map((sinal) => <li key={sinal}>{sinal}</li>)}
                </ul>
              </div>
            )}

            <div>
              <Label className="text-xs">Beneficiário *</Label>
              <Select value={form.beneficiario_id} onValueChange={(v) => setForm((f) => ({ ...f, beneficiario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {beneficiarios.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ATESTADO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data de Emissão</Label>
                <Input type="date" {...campo('data_emissao')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Início *</Label>
                <Input type="date" {...campo('data_inicio')} />
              </div>
              <div>
                <Label className="text-xs">Término</Label>
                <Input type="date" {...campo('data_fim')} />
              </div>
              {form.tipo === 'COMPARECIMENTO' ? (
                <div>
                  <Label className="text-xs">Horas</Label>
                  <Input inputMode="decimal" {...campo('horas')} />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Dias</Label>
                  <Input type="number" min="0" {...campo('dias_afastamento')} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-[1fr_1.2fr_0.6fr] gap-3">
              <div>
                <Label className="text-xs">CID</Label>
                <Input {...campo('cid')} placeholder="Ex: J11" />
              </div>
              <div>
                <Label className="text-xs">CRM</Label>
                <Input {...campo('crm')} />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Input maxLength={2} {...campo('crm_uf')} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Médico</Label>
              <Input {...campo('medico_nome')} />
            </div>
            {outrosDaPessoa.length > 0 && (
              <div>
                <Label className="text-xs">Mesmo motivo de outro afastamento?</Label>
                <Select value={form.mesmo_motivo_de} onValueChange={(v) => setForm((f) => ({ ...f, mesmo_motivo_de: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NENHUM">Não, é outro motivo</SelectItem>
                    {outrosDaPessoa.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        Sim, o de {formatDate(o.data_inicio)} · {diasDoAtestado(o)} {diasDoAtestado(o) === 1 ? 'dia' : 'dias'}{o.cid ? ` · CID ${o.cid}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400 mt-1">Afastamentos pelo mesmo motivo em até 60 dias são somados para o INSS.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Motivo</Label>
              <Input {...campo('motivo')} placeholder="Ex: Gripe, pós-cirúrgico" />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input {...campo('observacoes')} />
            </div>
          </PainelCorpo>
          <PainelRodape>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button className="bg-[#003580] hover:bg-[#002060]" disabled={isSaving || isLendo} onClick={handleCriar}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </PainelRodape>
      </PainelLateral>
    </>
  );
};

export default AtestadosTestePage;
