import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { supabaseClient } from '@/lib/supabase';
import { SEGURADORAS } from '@/data/seguradoras';
import { applyCpfMask, applyPhoneMask, applyCepMask } from '@/lib/masks';
import {
  ArrowLeft, Loader2, FileText, Plus, Pencil, Check, X, ArrowRight, Building2, Users, UserPlus,
  Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import ApoliceExpandableRow from '@/components/clienteTeste/ApoliceExpandableRow';
import BeneficiarioExpandableRow from '@/components/clienteTeste/BeneficiarioExpandableRow';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const tooltipPercent = (total) => (value, name) => [`${total > 0 ? Math.round((value / total) * 100) : 0}%`, name];

const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario = hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
};

const EMPTY_BEN_FORM = {
  nome_completo: '', cpf: '', parentesco: 'TITULAR', data_nascimento: '', nome_mae: '', nome_titular: '',
  matricula_empresa: '', data_admissao: '',
  celular: '', email_beneficiario: '',
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
};

const QTD_SLOTS = 6;
const ITENS_POR_PAGINA_OPCOES = [5, 10, 15, 25];

const logoDaSeguradora = (nome) => SEGURADORAS.find(s => s.nome === nome)?.logo;

const descricaoApolice = (apolice) => {
  const subs = (apolice.dados_adicionais?.sub_apolices || []).filter(s => s.tipo);
  if (subs.length > 0) return subs.map(s => s.tipo).join(' + ');
  return apolice.numero_apolice || '—';
};

// Apólice pode ser da matriz ou de uma filial do grupo — deixa isso visível.
const empresaLabelDe = (apolice) => apolice.empresa
  ? `${apolice.empresa.tipo === 'MATRIZ' ? '⭐ ' : ''}${apolice.empresa.nome_fantasia || apolice.empresa.razao_social}`
  : null;

const SelectApoliceTestePage = () => {
  const { segmento } = useParams();
  const { user } = useAuth();
  const { selectedCompanyId, isViewingAsClient } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [apolices, setApolices] = useState([]);
  const [empresaId, setEmpresaId] = useState(null);
  const [atalhos, setAtalhos] = useState(Array(QTD_SLOTS).fill(null));
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editandoSlot, setEditandoSlot] = useState(null);
  const [selecaoModal, setSelecaoModal] = useState('');
  const [busca, setBusca] = useState('');
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [pagina, setPagina] = useState(1);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [buscaBen, setBuscaBen] = useState('');
  const [itensPorPaginaBen, setItensPorPaginaBen] = useState(10);
  const [paginaBen, setPaginaBen] = useState(1);
  const [isAddBenOpen, setIsAddBenOpen] = useState(false);
  const [addBenForm, setAddBenForm] = useState(EMPTY_BEN_FORM);
  const [isSavingBen, setIsSavingBen] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const segConfig = SEGMENTOS[segmento] || SEGMENTOS[segmento?.toUpperCase()] || Object.values(SEGMENTOS).find(s => s.slug === segmento);
  const isSVD = segmento?.toLowerCase().replace(/_/g, '-') === 'saude-vida-odonto';
  const storageKey = `atalhos_${segmento}_${empresaId}`;

  useEffect(() => {
    const id = user?.perfil !== 'CLIENTE' && isViewingAsClient && selectedCompanyId
      ? selectedCompanyId
      : (user?.empresa_matriz_id || user?.empresa_id);
    if (!id) { setLoading(false); return; }
    setEmpresaId(id);

    apolicesService.getApolicesByMatriz(id)
      .then(all => {
        const filtered = all.filter(ap => ap.segmento?.toLowerCase().replace(/_/g, '-') === segmento?.toLowerCase().replace(/_/g, '-'));
        setApolices(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    if (isSVD) {
      supabaseClient.from('empresas').select('id, nome_fantasia, razao_social, tipo').or(`id.eq.${id},empresa_matriz_id.eq.${id}`)
        .then(({ data: empresasDoGrupo }) => {
          const empresaMap = Object.fromEntries((empresasDoGrupo || []).map(e => [e.id, e]));
          const grupoIds = (empresasDoGrupo || []).map(e => e.id);
          return Promise.all(grupoIds.map(gid => beneficiariosService.getBeneficiariosByEmpresa(gid).catch(() => [])))
            .then((listas) => listas.flat().map(b => ({ ...b, empresa: empresaMap[b.empresa_id] || null })));
        })
        .then((flat) => setBeneficiarios(flat.filter(b => !b.data_exclusao)))
        .catch(console.error);
    }
  }, [user, segmento, selectedCompanyId, isViewingAsClient, isSVD]);

  useEffect(() => {
    if (!isSVD || !empresaId) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setAtalhos(JSON.parse(raw));
    } catch { /* localStorage indisponível ou corrompido — ignora */ }
  }, [isSVD, empresaId, storageKey]);

  const salvarAtalhos = (next) => {
    setAtalhos(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignora */ }
  };

  // Uma apólice de saúde/vida/odonto pode agrupar vários sub-tipos (sub_apolices)
  // com seguradora/número próprios — flatten pra lista exibir/selecionar uma linha
  // por sub-tipo (cada sub-apólice conta como uma apólice selecionável à parte).
  const linhasTabela = useMemo(() => {
    if (!isSVD) return apolices.map(ap => ({ key: String(ap.id), apolice: ap }));
    return apolices.flatMap((ap) => {
      const subs = (ap.dados_adicionais?.sub_apolices || []).filter(s => s.tipo || s.numero);
      if (subs.length === 0) return [{ key: String(ap.id), apolice: ap }];
      return subs.map((sub, i) => ({
        key: `${ap.id}-${i}`,
        apolice: ap,
        displayOverride: {
          seguradora: sub.seguradora || ap.seguradora,
          numero: sub.numero || ap.numero_apolice,
          tipoLabel: sub.tipo,
          valorPremio: sub.valor_premio,
          contratoUrl: sub.contrato_url,
        },
      }));
    });
  }, [apolices, isSVD]);

  const linhasPorKey = useMemo(
    () => Object.fromEntries(linhasTabela.map((linha) => [linha.key, linha])),
    [linhasTabela]
  );

  const abrirPicker = (slot) => {
    setSelecaoModal(atalhos[slot] || '');
    setEditandoSlot(slot);
  };

  const handleSalvarAtalho = () => {
    if (!selecaoModal) return;
    const next = [...atalhos];
    next[editandoSlot] = selecaoModal;
    salvarAtalhos(next);
    setEditandoSlot(null);
  };

  const handleRemoverAtalho = (slot) => {
    const next = [...atalhos];
    next[slot] = null;
    salvarAtalhos(next);
  };

  const buscarCep = async (cep) => {
    const nums = cep.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddBenForm((f) => ({ ...f, rua: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', estado: data.uf || '' }));
      } else {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      }
    } catch { /* ignora falha de rede na busca de CEP */ } finally {
      setIsCepLoading(false);
    }
  };

  const handleCriarBeneficiario = async () => {
    if (!addBenForm.nome_completo || !addBenForm.cpf) {
      toast({ variant: 'destructive', title: 'Preencha nome e CPF.' });
      return;
    }
    setIsSavingBen(true);
    try {
      const created = await beneficiariosService.createBeneficiario({ ...addBenForm, empresa_id: empresaId });
      setBeneficiarios((prev) => [created, ...prev]);
      toast({ title: 'Beneficiário adicionado.' });
      setIsAddBenOpen(false);
      setAddBenForm(EMPTY_BEN_FORM);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar', description: err.message });
    } finally {
      setIsSavingBen(false);
    }
  };

  const handleAcessarAtalho = (slot) => {
    const linha = linhasPorKey[atalhos[slot]];
    if (!linha) return;
    navigate(`/cliente/${empresaId}`, {
      state: { from: 'apolice', apoliceId: linha.apolice.id, segmento: linha.apolice.segmento, segLabel: linha.displayOverride?.tipoLabel || 'Saúde, Vida e Odonto', apoliceNum: linha.displayOverride?.numero || linha.apolice.numero_apolice },
    });
  };

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return linhasTabela;
    return linhasTabela.filter((linha) => {
      const seguradora = linha.displayOverride?.seguradora || linha.apolice.seguradora || '';
      const numero = linha.displayOverride?.numero || linha.apolice.numero_apolice || '';
      return seguradora.toLowerCase().includes(termo) || numero.toLowerCase().includes(termo);
    });
  }, [linhasTabela, busca]);

  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina = linhasFiltradas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const beneficiariosFiltrados = useMemo(() => {
    const termo = buscaBen.trim().toLowerCase();
    if (!termo) return beneficiarios;
    return beneficiarios.filter((b) =>
      b.nome_completo?.toLowerCase().includes(termo) ||
      b.cpf?.toLowerCase().includes(termo)
    );
  }, [beneficiarios, buscaBen]);

  const totalPaginasBen = Math.max(1, Math.ceil(beneficiariosFiltrados.length / itensPorPaginaBen));
  const paginaAtualBen = Math.min(paginaBen, totalPaginasBen);
  const beneficiariosPagina = beneficiariosFiltrados.slice(
    (paginaAtualBen - 1) * itensPorPaginaBen,
    paginaAtualBen * itensPorPaginaBen
  );

  const titulares = useMemo(() => beneficiarios.filter((b) => b.parentesco === 'TITULAR'), [beneficiarios]);

  const resumoVidas = useMemo(() => {
    const total = beneficiarios.length;
    const homens = beneficiarios.filter(b => b.sexo === 'M').length;
    const mulheres = beneficiarios.filter(b => b.sexo === 'F').length;
    const idades = beneficiarios.map(b => calcularIdade(b.data_nascimento)).filter(i => i !== null);
    const mediaIdade = idades.length > 0 ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : null;
    const segmentos = [
      { key: 'saude',  label: 'Saúde',  cor: '#003580', qtd: beneficiarios.filter(b => b.saude_ativo).length },
      { key: 'vida',   label: 'Vida',   cor: '#7B3FE4', qtd: beneficiarios.filter(b => b.vida_ativo).length },
      { key: 'odonto', label: 'Odonto', cor: '#00B2FF', qtd: beneficiarios.filter(b => b.odonto_ativo).length },
    ];
    return { total, homens, mulheres, mediaIdade, segmentos };
  }, [beneficiarios]);

  const segLabel = segConfig?.label || segmento?.toLowerCase().replace(/_/g, ' ');
  const apolicesSubtitle = isSVD
    ? 'Todas suas apólices de saúde, odonto e vida abaixo.'
    : `Todas suas apólices de ${segLabel.toLowerCase()} abaixo.`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{segLabel} - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate('/select-segmento/teste')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Meus Seguros
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">{segLabel}</h1>
              <p className="text-gray-400 text-sm">Todas suas apólices abaixo.</p>
            </div>
            {isSVD && (
              <button
                onClick={() => { setAddBenForm(EMPTY_BEN_FORM); setIsAddBenOpen(true); }}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#003580] text-white text-sm font-semibold hover:bg-[#002060] transition-colors flex-shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Adicionar beneficiário
              </button>
            )}
          </div>

          {isSVD && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Atalhos</p>
                <button
                  onClick={() => setModoEdicao(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#003580] transition-colors"
                >
                  {modoEdicao ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  {modoEdicao ? 'Concluído' : 'Editar'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: QTD_SLOTS }).map((_, slot) => {
                  const linha = atalhos[slot] ? linhasPorKey[atalhos[slot]] : null;

                  if (linha) {
                    const apolice = linha.apolice;
                    const seguradora = linha.displayOverride?.seguradora || apolice.seguradora;
                    const descricao = [linha.displayOverride?.tipoLabel || descricaoApolice(apolice), empresaLabelDe(apolice)].filter(Boolean).join(' · ');
                    const logo = logoDaSeguradora(seguradora);
                    return (
                      <div key={slot} className="relative">
                        {modoEdicao && (
                          <button
                            onClick={() => handleRemoverAtalho(slot)}
                            className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => (modoEdicao ? abrirPicker(slot) : handleAcessarAtalho(slot))}
                          className="group w-full flex items-center gap-3 bg-white border border-gray-100 hover:border-[#003580] rounded-2xl px-4 py-2.5 text-left transition-colors"
                        >
                          <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {logo ? <img src={logo} alt={seguradora} className="w-full h-full object-contain p-1.5" /> : <Building2 className="w-4 h-4 text-gray-400" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-gray-900 text-sm truncate">{seguradora}</span>
                            <span className="block text-xs text-gray-400 truncate">{descricao}</span>
                          </span>
                          {!modoEdicao && (
                            <span className="w-8 h-8 rounded-full group-hover:bg-[#003580] flex items-center justify-center flex-shrink-0 transition-colors">
                              <ArrowRight className="w-4 h-4 text-gray-900 group-hover:text-white transition-colors" />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot}
                      onClick={() => abrirPicker(slot)}
                      className="group flex items-center gap-3 bg-white border border-gray-100 hover:border-[#003580] rounded-2xl px-4 py-2.5 text-left transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#003580] transition-colors" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-gray-900 text-sm">Adicione uma apólice</span>
                        <span className="block text-xs text-gray-400">Atalho rápido pra gestão</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Apólices</h2>
            <p className="text-gray-400 text-sm mb-5">{apolicesSubtitle}</p>
          </div>

          {apolices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Nenhuma apólice encontrada</h2>
              <p className="text-gray-400 mt-2">Entre em contato com o administrador.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={busca}
                      onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                      placeholder="Buscar por Seguradora/Operadora"
                      className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#003580]/20 focus:border-[#003580]"
                    />
                  </div>
                  <button
                    title="Em breve"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="hidden sm:inline">Itens por página</span>
                  <div className="relative">
                    <select
                      value={itensPorPagina}
                      onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPagina(1); }}
                      className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 bg-white focus:outline-none"
                    >
                      {ITENS_POR_PAGINA_OPCOES.map((n) => (
                        <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  <span>{paginaAtual} de {totalPaginas}</span>
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual <= 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-white text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <span>Apólice</span>
                  <span className="hidden sm:block">Vigente desde</span>
                  <span className="hidden sm:block">Número da apólice</span>
                  <span></span>
                </div>
                {linhasPagina.map((linha) => (
                  <ApoliceExpandableRow key={linha.key} apolice={linha.apolice} showSegmento={false} displayOverride={linha.displayOverride} />
                ))}
              </div>
            </>
          )}

          {isSVD && resumoVidas.total > 0 && (
            <div className="pt-2">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Resumo das Vidas</h2>
              <p className="text-gray-400 text-sm mb-5">{resumoVidas.total} {resumoVidas.total === 1 ? 'vida vinculada' : 'vidas vinculadas'} aos seus seguros.</p>

              <div className="bg-white rounded-2xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                {/* Homens x Mulheres */}
                <div className="flex items-center gap-4 p-5">
                  <PieChart width={140} height={140}>
                    <Pie
                      data={[{ name: 'Homens', value: resumoVidas.homens }, { name: 'Mulheres', value: resumoVidas.mulheres }]}
                      dataKey="value" innerRadius={42} outerRadius={66} startAngle={90} endAngle={-270} stroke="none"
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#EC4899" />
                    </Pie>
                    <Tooltip formatter={tooltipPercent(resumoVidas.homens + resumoVidas.mulheres)} />
                  </PieChart>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
                      <span className="text-sm text-gray-700"><span className="font-bold text-gray-900">{resumoVidas.homens}</span> homens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899] flex-shrink-0" />
                      <span className="text-sm text-gray-700"><span className="font-bold text-gray-900">{resumoVidas.mulheres}</span> mulheres</span>
                    </div>
                  </div>
                </div>

                {/* Média de idade */}
                <div className="flex flex-col items-start justify-center p-5 text-left">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Média de idade</p>
                  <p className="text-6xl font-bold text-gray-900">{resumoVidas.mediaIdade ?? '—'}{resumoVidas.mediaIdade !== null && <span className="text-xl font-semibold text-gray-400"> anos</span>}</p>
                </div>

                {/* Por segmento */}
                <div className="flex items-center gap-4 p-5">
                  <PieChart width={140} height={140}>
                    <Pie
                      data={resumoVidas.segmentos.map(s => ({ name: s.label, value: s.qtd }))}
                      dataKey="value" innerRadius={42} outerRadius={66} startAngle={90} endAngle={-270} stroke="none"
                    >
                      {resumoVidas.segmentos.map((s) => <Cell key={s.key} fill={s.cor} />)}
                    </Pie>
                    <Tooltip formatter={tooltipPercent(resumoVidas.total)} />
                  </PieChart>
                  <div className="space-y-2">
                    {resumoVidas.segmentos.map((s) => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.cor }} />
                        <span className="text-sm text-gray-700">
                          <span className="font-bold text-gray-900">{s.qtd}</span> {s.label}
                          <span className="text-gray-400"> · {resumoVidas.total > 0 ? Math.round((s.qtd / resumoVidas.total) * 100) : 0}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isSVD && (
            <div className="pt-2">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Vidas</h2>
              <p className="text-gray-400 text-sm mb-5">Todas as pessoas vinculadas aos seus seguros abaixo.</p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={buscaBen}
                      onChange={(e) => { setBuscaBen(e.target.value); setPaginaBen(1); }}
                      placeholder="Buscar por Nome/CPF"
                      className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#003580]/20 focus:border-[#003580]"
                    />
                  </div>
                  <button
                    title="Em breve"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="hidden sm:inline">Itens por página</span>
                  <div className="relative">
                    <select
                      value={itensPorPaginaBen}
                      onChange={(e) => { setItensPorPaginaBen(Number(e.target.value)); setPaginaBen(1); }}
                      className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 bg-white focus:outline-none"
                    >
                      {ITENS_POR_PAGINA_OPCOES.map((n) => (
                        <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  <span>{paginaAtualBen} de {totalPaginasBen}</span>
                  <button
                    onClick={() => setPaginaBen((p) => Math.max(1, p - 1))}
                    disabled={paginaAtualBen <= 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPaginaBen((p) => Math.min(totalPaginasBen, p + 1))}
                    disabled={paginaAtualBen >= totalPaginasBen}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-white text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <span>Nome</span>
                  <span>CPF</span>
                  <span>Parentesco</span>
                  <span>Idade</span>
                  <span></span>
                </div>

                {beneficiariosPagina.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-gray-300" />
                    Nenhuma vida encontrada.
                  </div>
                ) : (
                  beneficiariosPagina.map((b) => (
                    <BeneficiarioExpandableRow key={b.id} beneficiario={b} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </ClienteSidebarLayout>

      <Dialog open={editandoSlot !== null} onOpenChange={(open) => !open && setEditandoSlot(null)}>
        <DialogContent className="bg-white" style={{ fontFamily: "'DM Sans', sans-serif", '--background': '0 0% 100%' }}>
          <DialogHeader>
            <DialogTitle>Selecionar apólice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Escolha qual apólice vai aparecer como atalho direto pra gestão.</p>
          <Select value={selecaoModal} onValueChange={setSelecaoModal}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma apólice" />
            </SelectTrigger>
            <SelectContent>
              {linhasTabela.map((linha) => (
                <SelectItem key={linha.key} value={linha.key}>
                  {(linha.displayOverride?.seguradora || linha.apolice.seguradora)} · {(linha.displayOverride?.tipoLabel || descricaoApolice(linha.apolice))} · {(linha.displayOverride?.numero || linha.apolice.numero_apolice || '—')}
                  {empresaLabelDe(linha.apolice) ? ` · ${empresaLabelDe(linha.apolice)}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="sm:justify-between">
            {editandoSlot !== null && atalhos[editandoSlot] ? (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => { handleRemoverAtalho(editandoSlot); setEditandoSlot(null); }}
              >
                Remover atalho
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditandoSlot(null)}>Cancelar</Button>
              <Button className="bg-[#003580] hover:bg-[#002060]" disabled={!selecaoModal} onClick={handleSalvarAtalho}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBenOpen} onOpenChange={setIsAddBenOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white" style={{ fontFamily: "'DM Sans', sans-serif", '--background': '0 0% 100%' }}>
          <DialogHeader>
            <DialogTitle>Adicionar beneficiário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Dados Pessoais</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Nome Completo *</Label>
                  <Input value={addBenForm.nome_completo} onChange={(e) => setAddBenForm((f) => ({ ...f, nome_completo: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">CPF *</Label>
                  <Input value={addBenForm.cpf} onChange={(e) => setAddBenForm((f) => ({ ...f, cpf: applyCpfMask(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Parentesco *</Label>
                  <Select value={addBenForm.parentesco} onValueChange={(v) => setAddBenForm((f) => ({ ...f, parentesco: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TITULAR">TITULAR</SelectItem>
                      <SelectItem value="CONJUGE">CÔNJUGE</SelectItem>
                      <SelectItem value="FILHO">FILHO(A)</SelectItem>
                      <SelectItem value="OUTRO">OUTRO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data de Nascimento</Label>
                  <Input type="date" value={addBenForm.data_nascimento} onChange={(e) => setAddBenForm((f) => ({ ...f, data_nascimento: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Idade</Label>
                  <Input value={calcularIdade(addBenForm.data_nascimento) ?? ''} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label className="text-xs">Nome da Mãe</Label>
                  <Input value={addBenForm.nome_mae} onChange={(e) => setAddBenForm((f) => ({ ...f, nome_mae: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Nome do Titular</Label>
                  {addBenForm.parentesco === 'TITULAR' ? (
                    <Input value="" disabled placeholder="Não aplicável para titulares" />
                  ) : (
                    <Select value={addBenForm.nome_titular} onValueChange={(v) => setAddBenForm((f) => ({ ...f, nome_titular: v }))} disabled={titulares.length === 0}>
                      <SelectTrigger><SelectValue placeholder={titulares.length > 0 ? 'Selecione o titular...' : 'Nenhum titular cadastrado'} /></SelectTrigger>
                      <SelectContent>
                        {titulares.map((t) => <SelectItem key={t.id} value={t.nome_completo}>{t.nome_completo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Dados Trabalhistas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Matrícula e Dígito</Label>
                  <Input value={addBenForm.matricula_empresa} onChange={(e) => setAddBenForm((f) => ({ ...f, matricula_empresa: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Data de Admissão</Label>
                  <Input type="date" value={addBenForm.data_admissao} onChange={(e) => setAddBenForm((f) => ({ ...f, data_admissao: e.target.value }))} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Contato e Endereço</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Celular</Label>
                  <Input value={addBenForm.celular} onChange={(e) => setAddBenForm((f) => ({ ...f, celular: applyPhoneMask(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <Input type="email" value={addBenForm.email_beneficiario} onChange={(e) => setAddBenForm((f) => ({ ...f, email_beneficiario: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">CEP</Label>
                  <div className="flex gap-2">
                    <Input value={addBenForm.cep} placeholder="00000-000" maxLength={9} onChange={(e) => setAddBenForm((f) => ({ ...f, cep: applyCepMask(e.target.value) }))} onBlur={() => buscarCep(addBenForm.cep)} />
                    <button type="button" onClick={() => buscarCep(addBenForm.cep)} disabled={isCepLoading} className="px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center">
                      {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div><Label className="text-xs">Rua</Label><Input value={addBenForm.rua} onChange={(e) => setAddBenForm((f) => ({ ...f, rua: e.target.value }))} /></div>
                <div><Label className="text-xs">Número</Label><Input value={addBenForm.numero} onChange={(e) => setAddBenForm((f) => ({ ...f, numero: e.target.value }))} /></div>
                <div><Label className="text-xs">Complemento</Label><Input value={addBenForm.complemento} onChange={(e) => setAddBenForm((f) => ({ ...f, complemento: e.target.value }))} /></div>
                <div><Label className="text-xs">Bairro</Label><Input value={addBenForm.bairro} onChange={(e) => setAddBenForm((f) => ({ ...f, bairro: e.target.value }))} /></div>
                <div><Label className="text-xs">Cidade</Label><Input value={addBenForm.cidade} onChange={(e) => setAddBenForm((f) => ({ ...f, cidade: e.target.value }))} /></div>
                <div><Label className="text-xs">Estado</Label><Input value={addBenForm.estado} onChange={(e) => setAddBenForm((f) => ({ ...f, estado: e.target.value }))} /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBenOpen(false)}>Cancelar</Button>
            <Button className="bg-[#003580] hover:bg-[#002060]" disabled={isSavingBen} onClick={handleCriarBeneficiario}>
              {isSavingBen ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelectApoliceTestePage;
