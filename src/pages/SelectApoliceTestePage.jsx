import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { supabaseClient } from '@/lib/supabase';
import { SEGURADORAS } from '@/data/seguradoras';
import { applyCpfMask, applyPhoneMask } from '@/lib/masks';
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

const EMPTY_BEN_FORM = { nome_completo: '', cpf: '', parentesco: 'TITULAR', data_nascimento: '', celular: '', email_beneficiario: '' };

const QTD_SLOTS = 6;
const ITENS_POR_PAGINA_OPCOES = [5, 10, 15, 25];

const logoDaSeguradora = (nome) => SEGURADORAS.find(s => s.nome === nome)?.logo;

const descricaoApolice = (apolice) => {
  const subs = (apolice.dados_adicionais?.sub_apolices || []).filter(s => s.tipo);
  if (subs.length > 0) return subs.map(s => s.tipo).join(' + ');
  return apolice.numero_apolice || '—';
};

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
      supabaseClient.from('empresas').select('id').eq('empresa_matriz_id', id)
        .then(({ data: filiais }) => {
          const grupoIds = [id, ...(filiais || []).map(f => f.id)];
          return Promise.all(grupoIds.map(gid => beneficiariosService.getBeneficiariosByEmpresa(gid).catch(() => [])));
        })
        .then((listas) => setBeneficiarios(listas.flat().filter(b => !b.data_exclusao)))
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

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">{segLabel}</h1>
            <p className="text-gray-400 text-sm">Todas suas apólices abaixo.</p>
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
                    const descricao = linha.displayOverride?.tipoLabel || descricaoApolice(apolice);
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

          {isSVD && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Vidas</h2>
                <button
                  onClick={() => { setAddBenForm(EMPTY_BEN_FORM); setIsAddBenOpen(true); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#003580] transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Adicionar beneficiário
                </button>
              </div>
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
        <DialogContent>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar beneficiário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome Completo *</Label>
              <Input value={addBenForm.nome_completo} onChange={(e) => setAddBenForm((f) => ({ ...f, nome_completo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CPF *</Label>
                <Input value={addBenForm.cpf} onChange={(e) => setAddBenForm((f) => ({ ...f, cpf: applyCpfMask(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Parentesco</Label>
                <Select value={addBenForm.parentesco} onValueChange={(v) => setAddBenForm((f) => ({ ...f, parentesco: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">Titular</SelectItem>
                    <SelectItem value="CONJUGE">Cônjuge</SelectItem>
                    <SelectItem value="FILHO">Filho(a)</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data de Nascimento</Label>
                <Input type="date" value={addBenForm.data_nascimento} onChange={(e) => setAddBenForm((f) => ({ ...f, data_nascimento: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Celular</Label>
                <Input value={addBenForm.celular} onChange={(e) => setAddBenForm((f) => ({ ...f, celular: applyPhoneMask(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={addBenForm.email_beneficiario} onChange={(e) => setAddBenForm((f) => ({ ...f, email_beneficiario: e.target.value }))} />
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
