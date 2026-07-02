import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Users, Search, RefreshCw, Phone, Calendar, Monitor, Smartphone,
  ChevronDown, ChevronUp, Plus, Trash2, Pencil, FileText, ExternalLink, Clock,
  SlidersHorizontal, X,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  novo:           { label: 'Novo',           color: 'bg-blue-100 text-blue-700' },
  contatado:      { label: 'Contatado',      color: 'bg-yellow-100 text-yellow-700' },
  em_negociacao:  { label: 'Em negociação',  color: 'bg-purple-100 text-purple-700' },
  convertido:     { label: 'Convertido',     color: 'bg-green-100 text-green-700' },
  perdido:        { label: 'Perdido',        color: 'bg-gray-100 text-gray-500' },
};

const ORIGEM_CONFIG = {
  manual:       { label: 'Manual',       icon: '👤' },
  parceiro:     { label: 'Parceiro',     icon: '🤝' },
  gi:           { label: 'Gi (chat)',    icon: '🤖' },
  site:         { label: 'Site',         icon: '🌐' },
  indicacao:    { label: 'Indicação',    icon: '💬' },
  ligacao:      { label: 'Ligação',      icon: '📞' },
  beneficiario: { label: 'Beneficiário', icon: '👥' },
  cliente:      { label: 'Cliente',      icon: '🏢' },
};

const SEG_LABEL = {
  SAUDE: 'Saúde', AUTO: 'Auto', RESIDENCIAL: 'Residencial',
  EMPRESARIAL: 'Empresarial', ODONTOLOGICO: 'Odontológico',
  VIAGEM: 'Viagem', PET_SAUDE: 'Pet Saúde', PET_SEGURO: 'Pet Seguro',
  VIDA: 'Vida', FROTA: 'Frota', CARGAS: 'Cargas', EQUIPAMENTOS: 'Equipamentos',
  SAUDE_VIDA_ODONTO: 'Saúde/Vida/Odonto', AUTO_FROTA: 'Auto/Frota',
};

const SEGMENTOS = Object.keys(SEG_LABEL);
const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const formatCPF = (v) => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length !== 11) return v;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatCNPJ = (v) => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length !== 14) return v;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const formatTelefone = (v) => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 13) return d.replace(/(\d{2})(\d{2})(\d{1})(\d{4})(\d{4})/, '+$1 ($2) $3 $4-$5');
  if (d.length === 12) return d.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '+$1 ($2) $3-$4');
  if (d.length === 11) return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  if (d.length === 9)  return d.replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2-$3');
  if (d.length === 8)  return d.replace(/(\d{4})(\d{4})/, '$1-$2');
  return v;
};

const tempoRelativo = (iso) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR');
};

const formatDatetime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formVazio = () => ({
  nome: '', cpf: '', cnpj: '', nome_empresa: '', data_nascimento: '',
  email: '', telefone: '', cidade: '', estado: '', segmento: '',
  num_vidas: '', tem_plano_atual: false, plano_atual_operadora: '',
  plano_atual_valor: '', origem: 'manual', status: 'novo',
  responsavel: '', proximo_contato: '', observacoes: '',
});

const AdminLeadsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [filtroTemp, setFiltroTemp] = useState({ status: 'todos', origem: 'todos', periodo: 'todos' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(formVazio());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [acessosPorOrcamento, setAcessosPorOrcamento] = useState({});
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar leads:', error);
      toast({ variant: 'destructive', title: 'Erro ao carregar leads.', description: error.message });
      setLoading(false);
      return;
    }
    const lista = data || [];
    setLeads(lista);

    const idsComOrcamento = lista.filter(l => l.orcamento_id).map(l => l.orcamento_id);
    if (idsComOrcamento.length) {
      const { data: acessos } = await supabase
        .from('orcamento_acessos')
        .select('*')
        .in('orcamento_id', idsComOrcamento)
        .order('acessado_em', { ascending: false });
      const mapa = {};
      (acessos || []).forEach(a => {
        if (!mapa[a.orcamento_id]) mapa[a.orcamento_id] = [];
        mapa[a.orcamento_id].push(a);
      });
      setAcessosPorOrcamento(mapa);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const abrirNovo = () => { setEditId(null); setForm(formVazio()); setModalOpen(true); };

  const abrirEditar = (lead) => {
    setEditId(lead.id);
    setForm({
      nome: lead.nome || '',
      cpf: lead.cpf || '',
      cnpj: lead.cnpj || '',
      nome_empresa: lead.nome_empresa || '',
      data_nascimento: lead.data_nascimento || '',
      email: lead.email || '',
      telefone: lead.telefone || '',
      cidade: lead.cidade || '',
      estado: lead.estado || '',
      segmento: lead.segmento || '',
      num_vidas: lead.num_vidas || '',
      tem_plano_atual: lead.tem_plano_atual || false,
      plano_atual_operadora: lead.plano_atual_operadora || '',
      plano_atual_valor: lead.plano_atual_valor || '',
      origem: lead.origem || 'manual',
      status: lead.status || 'novo',
      responsavel: lead.responsavel || '',
      proximo_contato: lead.proximo_contato ? lead.proximo_contato.slice(0, 16) : '',
      observacoes: lead.observacoes || '',
    });
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!form.nome.trim()) return toast({ variant: 'destructive', title: 'Nome obrigatório.' });
    setSaving(true);
    try {
      const payload = {
        ...form,
        num_vidas: form.num_vidas ? parseInt(form.num_vidas) : null,
        proximo_contato: form.proximo_contato || null,
        data_nascimento: form.data_nascimento || null,
        updated_at: new Date().toISOString(),
      };
      if (editId) {
        await supabase.from('leads').update(payload).eq('id', editId);
        toast({ title: 'Lead atualizado!' });
      } else {
        await supabase.from('leads').insert(payload);
        toast({ title: 'Lead criado!' });
      }
      setModalOpen(false);
      fetchLeads();
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id) => {
    await supabase.from('leads').delete().eq('id', id);
    setConfirmDelete(null);
    setExpandido(null);
    fetchLeads();
    toast({ title: 'Lead excluído.' });
  };

  const handleAlterarStatus = async (id, novoStatus) => {
    await supabase.from('leads').update({ status: novoStatus, updated_at: new Date().toISOString() }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: novoStatus } : l));
    toast({ title: `Status: ${STATUS_CONFIG[novoStatus]?.label}` });
  };

  const handleCriarOrcamento = (lead) => {
    navigate('/admin/orcamentos', {
      state: {
        leadData: {
          cliente_nome: lead.nome,
          cliente_telefone: lead.telefone || '',
          cliente_email: lead.email || '',
          cliente_cpf: lead.cpf || '',
          cliente_data_nascimento: lead.data_nascimento || '',
          segmento: lead.segmento || '',
          lead_id: lead.id,
        },
      },
    });
  };

  const periodoOk = (lead) => {
    if (filtroPeriodo === 'todos') return true;
    const diff = Date.now() - new Date(lead.created_at).getTime();
    if (filtroPeriodo === 'hoje') return diff < 86400000;
    if (filtroPeriodo === 'semana') return diff < 7 * 86400000;
    if (filtroPeriodo === 'mes') return diff < 30 * 86400000;
    return true;
  };

  const lista = leads.filter(l => {
    const q = busca.toLowerCase();
    const matchBusca = !q ||
      l.nome?.toLowerCase().includes(q) ||
      l.cpf?.includes(q) ||
      l.cnpj?.includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.telefone?.includes(q) ||
      l.nome_empresa?.toLowerCase().includes(q);
    return matchBusca &&
      (filtroStatus === 'todos' || l.status === filtroStatus) &&
      (filtroOrigem === 'todos' || l.origem === filtroOrigem) &&
      periodoOk(l);
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const listaPagina = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const quentesCount = leads.filter(l => {
    const acessos = acessosPorOrcamento[l.orcamento_id] || [];
    return acessos[0] && (Date.now() - new Date(acessos[0].acessado_em).getTime() < 3600000);
  }).length;

  const filtrosAtivos = [filtroStatus !== 'todos', filtroOrigem !== 'todos', filtroPeriodo !== 'todos'].filter(Boolean).length;

  useEffect(() => { setPagina(1); }, [busca, filtroStatus, filtroOrigem, filtroPeriodo]);

  const f = form;
  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <>
      <Helmet><title>Leads — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Users className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Leads</h1>
              <span className="text-white/50 text-sm">{leads.length} total</span>
              {quentesCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold animate-pulse">
                  <Flame className="h-3 w-3" /> {quentesCount} quente{quentesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={fetchLeads} className="p-1.5 text-white/60 hover:text-white transition-colors">
                <RefreshCw className="h-4 w-4" />
              </button>
              <Button onClick={abrirNovo} className="text-white font-semibold gap-1.5" style={{ background: '#003580' }}>
                <Plus className="h-4 w-4" /> Novo lead
              </Button>
            </div>
          </div>

          {/* Busca + Filtros */}
          <div className="flex gap-2 items-center max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nome, CPF, CNPJ, email, telefone ou empresa..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <button
              onClick={() => { setFiltroTemp({ status: filtroStatus, origem: filtroOrigem, periodo: filtroPeriodo }); setFiltroOpen(true); }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filtrosAtivos > 0 ? 'bg-white text-[#003580] border-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {filtrosAtivos > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {filtrosAtivos}
                </span>
              )}
            </button>
          </div>

          {/* Tags dos filtros ativos */}
          {filtrosAtivos > 0 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-white/50 text-xs">Filtrando:</span>
              {filtroStatus !== 'todos' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                  {STATUS_CONFIG[filtroStatus]?.label}
                  <button onClick={() => setFiltroStatus('todos')}><X className="h-3 w-3" /></button>
                </span>
              )}
              {filtroOrigem !== 'todos' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                  {ORIGEM_CONFIG[filtroOrigem]?.icon} {ORIGEM_CONFIG[filtroOrigem]?.label}
                  <button onClick={() => setFiltroOrigem('todos')}><X className="h-3 w-3" /></button>
                </span>
              )}
              {filtroPeriodo !== 'todos' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                  {filtroPeriodo === 'hoje' ? 'Hoje' : filtroPeriodo === 'semana' ? 'Esta semana' : 'Este mês'}
                  <button onClick={() => setFiltroPeriodo('todos')}><X className="h-3 w-3" /></button>
                </span>
              )}
              <button onClick={() => { setFiltroStatus('todos'); setFiltroOrigem('todos'); setFiltroPeriodo('todos'); }}
                className="text-white/50 hover:text-white text-xs underline">
                Limpar tudo
              </button>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-white/10 animate-pulse" />)}
            </div>
          ) : lista.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">Nenhum lead encontrado.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {listaPagina.map(lead => {
                  const acessos = acessosPorOrcamento[lead.orcamento_id] || [];
                  const ultimoAcesso = acessos[0];
                  const quente = ultimoAcesso && (Date.now() - new Date(ultimoAcesso.acessado_em).getTime() < 3600000);
                  const aceitou = acessos.some(a => a.aceitou_proposta);
                  const aberto = expandido === lead.id;
                  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                  const orig = ORIGEM_CONFIG[lead.origem] || ORIGEM_CONFIG.manual;

                  return (
                    <motion.div key={lead.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Card className={quente ? 'ring-2 ring-orange-400 shadow-md shadow-orange-100' : ''}>
                        <CardContent className="py-3 px-4">

                          {/* Linha principal */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {quente && <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-500 animate-pulse"><Flame className="h-3 w-3" /> Quente</span>}
                                {aceitou && <span className="text-[11px] font-bold text-green-600">✅ Convertido</span>}
                                <span className="text-sm font-semibold text-gray-900">{lead.nome}</span>
                                {lead.nome_empresa && <span className="text-xs text-gray-400">· {lead.nome_empresa}</span>}
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                                {lead.segmento && (
                                  <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {SEG_LABEL[lead.segmento] || lead.segmento}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                                {lead.telefone && (
                                  <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 hover:text-green-600 transition-colors">
                                    <Phone className="h-3 w-3" /> {formatTelefone(lead.telefone)}
                                  </a>
                                )}
                                <span>{orig.icon} {orig.label}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(lead.created_at)}</span>
                                {lead.proximo_contato && (
                                  <span className="flex items-center gap-1 text-blue-500 font-medium">
                                    <Clock className="h-3 w-3" /> Próx: {formatDatetime(lead.proximo_contato)}
                                  </span>
                                )}
                                {ultimoAcesso && (
                                  <span className={`font-medium ${quente ? 'text-orange-500' : 'text-gray-400'}`}>
                                    👁 {acessos.length} acesso{acessos.length > 1 ? 's' : ''} · {tempoRelativo(ultimoAcesso.acessado_em)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => setExpandido(aberto ? null : lead.id)}
                              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-[#003580] hover:bg-gray-50 transition-colors">
                              {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>

                          {/* Expandido */}
                          <AnimatePresence>
                            {aberto && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">

                                  {/* Dados pessoais */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {lead.email && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Email</p><p className="text-xs text-gray-700">{lead.email}</p></div>}
                                    {lead.cpf && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">CPF</p><p className="text-xs text-gray-700">{formatCPF(lead.cpf)}</p></div>}
                                    {lead.cnpj && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">CNPJ</p><p className="text-xs text-gray-700">{formatCNPJ(lead.cnpj)}</p></div>}
                                    {lead.data_nascimento && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Nascimento</p><p className="text-xs text-gray-700">{formatDate(lead.data_nascimento)}</p></div>}
                                    {(lead.cidade || lead.estado) && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Localização</p><p className="text-xs text-gray-700">{[lead.cidade, lead.estado].filter(Boolean).join(' — ')}</p></div>}
                                    {lead.num_vidas && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Nº de vidas</p><p className="text-xs text-gray-700">{lead.num_vidas}</p></div>}
                                    {lead.responsavel && <div><p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Responsável</p><p className="text-xs text-gray-700">{lead.responsavel}</p></div>}
                                  </div>

                                  {/* Plano atual */}
                                  {lead.tem_plano_atual && (
                                    <div className="bg-blue-50 rounded-lg px-3 py-2">
                                      <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-1">Plano atual</p>
                                      <p className="text-xs text-blue-700">
                                        {lead.plano_atual_operadora || '—'}
                                        {lead.plano_atual_valor && ` · R$ ${lead.plano_atual_valor}`}
                                      </p>
                                    </div>
                                  )}

                                  {/* Observações */}
                                  {lead.observacoes && (
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Observações</p>
                                      <p className="text-xs text-gray-600 whitespace-pre-line">{lead.observacoes}</p>
                                    </div>
                                  )}

                                  {/* Histórico de acessos */}
                                  {lead.orcamento_id && acessos.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Histórico de acessos à proposta</p>
                                      <div className="space-y-1 max-h-28 overflow-y-auto">
                                        {acessos.map((a, i) => (
                                          <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 rounded px-2 py-1">
                                            <span className="text-gray-400 shrink-0">{formatDatetime(a.acessado_em)}</span>
                                            {a.device === 'mobile' ? <Smartphone className="h-3 w-3 text-gray-400" /> : <Monitor className="h-3 w-3 text-gray-400" />}
                                            {a.proposta_clicada && <span className="text-blue-500">Clicou: {a.proposta_clicada}</span>}
                                            {a.aceitou_proposta && <span className="text-green-600 font-semibold">✅ Aceitou</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Alterar status */}
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                        <button key={k} onClick={() => handleAlterarStatus(lead.id, k)}
                                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${lead.status === k ? `${v.color} border-transparent` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                          {v.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Botões */}
                                  <div className="flex gap-2 flex-wrap pt-1">
                                    <Button onClick={() => handleCriarOrcamento(lead)}
                                      className="text-white font-semibold gap-1.5 text-sm" style={{ background: '#003580' }}>
                                      <FileText className="h-4 w-4" /> Criar orçamento
                                    </Button>
                                    {lead.orcamento_id && (
                                      <Button variant="outline" onClick={() => navigate('/admin/orcamentos')}
                                        className="gap-1.5 text-sm text-[#003580] border-[#003580]">
                                        <ExternalLink className="h-4 w-4" /> Ver orçamento
                                      </Button>
                                    )}
                                    <Button variant="outline" onClick={() => abrirEditar(lead)} className="gap-1.5 text-sm">
                                      <Pencil className="h-4 w-4" /> Editar
                                    </Button>
                                    {confirmDelete === lead.id ? (
                                      <div className="flex gap-1.5 items-center">
                                        <span className="text-xs text-red-500">Confirmar?</span>
                                        <Button size="sm" variant="destructive" onClick={() => handleExcluir(lead.id)}>Sim</Button>
                                        <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Não</Button>
                                      </div>
                                    ) : (
                                      <Button variant="outline" onClick={() => setConfirmDelete(lead.id)}
                                        className="gap-1.5 text-sm text-red-500 border-red-200 hover:border-red-400">
                                        <Trash2 className="h-4 w-4" /> Excluir
                                      </Button>
                                    )}
                                  </div>

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Paginação */}
          {!loading && totalPaginas > 1 && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '...' ? (
                    <span key={`dots-${i}`} className="px-2 py-1.5 text-white/30 text-xs">…</span>
                  ) : (
                    <button key={p} onClick={() => setPagina(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pagina === p ? 'bg-white text-[#003580]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                      {p}
                    </button>
                  ))
                }
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                >
                  Próxima →
                </button>
              </div>
              <span className="text-white/40 text-xs">
                {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, lista.length)} de {lista.length} leads
              </span>
            </div>
          )}
        </motion.div>
      </DashboardLayout>

      {/* Modal Adicionar / Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar lead' : 'Novo lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={f.nome} onChange={e => setF('nome', e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={f.telefone} onChange={e => setF('telefone', e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={f.email} onChange={e => setF('email', e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={f.cpf} onChange={e => setF('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={f.data_nascimento} onChange={e => setF('data_nascimento', e.target.value)} />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={f.cnpj} onChange={e => setF('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Nome da empresa</Label>
                <Input value={f.nome_empresa} onChange={e => setF('nome_empresa', e.target.value)} placeholder="Empresa Ltda" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={f.cidade} onChange={e => setF('cidade', e.target.value)} placeholder="São Paulo" />
              </div>
              <div>
                <Label>Estado</Label>
                <select value={f.estado} onChange={e => setF('estado', e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option value="">—</option>
                  {ESTADOS_BR.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Segmento de interesse</Label>
                <select value={f.segmento} onChange={e => setF('segmento', e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option value="">—</option>
                  {SEGMENTOS.map(s => <option key={s} value={s}>{SEG_LABEL[s]}</option>)}
                </select>
              </div>
              <div>
                <Label>Nº de vidas</Label>
                <Input type="number" min="1" value={f.num_vidas} onChange={e => setF('num_vidas', e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="tem_plano" checked={f.tem_plano_atual}
                  onChange={e => setF('tem_plano_atual', e.target.checked)} className="rounded" />
                <Label htmlFor="tem_plano">Tem plano atual</Label>
              </div>
              {f.tem_plano_atual && (
                <div className="grid grid-cols-2 gap-3 pl-4">
                  <div>
                    <Label>Operadora atual</Label>
                    <Input value={f.plano_atual_operadora} onChange={e => setF('plano_atual_operadora', e.target.value)} placeholder="Bradesco Saúde" />
                  </div>
                  <div>
                    <Label>Valor atual (R$)</Label>
                    <Input value={f.plano_atual_valor} onChange={e => setF('plano_atual_valor', e.target.value)} placeholder="350,00" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <select value={f.origem} onChange={e => setF('origem', e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {Object.entries(ORIGEM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={f.status} onChange={e => setF('status', e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Input value={f.responsavel} onChange={e => setF('responsavel', e.target.value)} placeholder="Nome do ADM" />
              </div>
              <div>
                <Label>Próximo contato</Label>
                <Input type="datetime-local" value={f.proximo_contato} onChange={e => setF('proximo_contato', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <textarea value={f.observacoes} onChange={e => setF('observacoes', e.target.value)}
                rows={3} placeholder="Anotações internas..."
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={() => setModalOpen(false)} variant="outline" className="flex-1" disabled={saving}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={saving} className="flex-1 text-white" style={{ background: '#003580' }}>
                {saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar lead'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de filtros */}
      <Dialog open={filtroOpen} onOpenChange={setFiltroOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[{ k: 'todos', l: 'Todos' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(({ k, l }) => (
                  <button key={k} onClick={() => setFiltroTemp(p => ({ ...p, status: k }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${filtroTemp.status === k ? 'bg-[#003580] text-white border-[#003580]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Origem</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button onClick={() => setFiltroTemp(p => ({ ...p, origem: 'todos' }))}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${filtroTemp.origem === 'todos' ? 'bg-[#003580] text-white border-[#003580]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  Todas
                </button>
                {Object.entries(ORIGEM_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setFiltroTemp(p => ({ ...p, origem: k }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${filtroTemp.origem === k ? 'bg-[#003580] text-white border-[#003580]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { k: 'todos', l: 'Todo período' },
                  { k: 'hoje', l: 'Hoje' },
                  { k: 'semana', l: 'Esta semana' },
                  { k: 'mes', l: 'Este mês' },
                ].map(({ k, l }) => (
                  <button key={k} onClick={() => setFiltroTemp(p => ({ ...p, periodo: k }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${filtroTemp.periodo === k ? 'bg-[#003580] text-white border-[#003580]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => {
                setFiltroTemp({ status: 'todos', origem: 'todos', periodo: 'todos' });
                setFiltroStatus('todos'); setFiltroOrigem('todos'); setFiltroPeriodo('todos');
                setFiltroOpen(false);
              }}>
                Limpar
              </Button>
              <Button className="flex-1 text-white" style={{ background: '#003580' }} onClick={() => {
                setFiltroStatus(filtroTemp.status);
                setFiltroOrigem(filtroTemp.origem);
                setFiltroPeriodo(filtroTemp.periodo);
                setFiltroOpen(false);
              }}>
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLeadsPage;
