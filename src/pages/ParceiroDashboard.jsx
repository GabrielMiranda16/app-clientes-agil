import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard, FileText, CheckCircle2, DollarSign,
  Plus, TrendingUp, Clock, Copy, Check,
  ArrowUpRight, X, Send, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';

const STATUS_CONFIG = {
  SOLICITACAO:  { label: 'Solicitação',  color: 'bg-gray-100 text-gray-700' },
  ORCAMENTO:    { label: 'Orçamento',    color: 'bg-blue-100 text-blue-700' },
  DOCUMENTOS:   { label: 'Documentos',   color: 'bg-yellow-100 text-yellow-700' },
  ASSINATURA:   { label: 'Assinatura',   color: 'bg-purple-100 text-purple-700' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-green-100 text-green-700' },
  COMISSAO:     { label: 'Comissão',     color: 'bg-emerald-100 text-emerald-700' },
};

const SEGMENTOS = [
  { value: 'SAUDE_VIDA_ODONTO', label: 'Saúde / Vida / Odonto' },
  { value: 'AUTO_FROTA',        label: 'Auto / Frota' },
  { value: 'VIAGEM',            label: 'Viagem' },
  { value: 'RESIDENCIAL',       label: 'Residencial' },
  { value: 'PET_SAUDE',         label: 'Pet Saúde' },
  { value: 'EMPRESARIAL',       label: 'Empresarial' },
  { value: 'CARGAS',            label: 'Cargas' },
  { value: 'EQUIPAMENTOS',      label: 'Equipamentos Portáteis' },
];

const SEGMENTO_LABEL = Object.fromEntries(SEGMENTOS.map(s => [s.value, s.label]));

const SEGMENTO_CAMPOS = {
  SAUDE_VIDA_ODONTO: [
    { key: 'data_nascimento',  label: 'Data de nascimento',              placeholder: 'DD/MM/AAAA' },
    { key: 'tipo_cobertura',   label: 'Tipo de cobertura desejada',      placeholder: 'Ex: individual, familiar, empresarial' },
    { key: 'qtd_vidas',        label: 'Quantidade de vidas',             placeholder: 'Ex: 1, 5, 20' },
  ],
  AUTO_FROTA: [
    { key: 'modelo_veiculo',   label: 'Modelo do veículo',               placeholder: 'Ex: Honda Civic 2023' },
    { key: 'placa',            label: 'Placa (opcional)',                 placeholder: 'Ex: ABC-1D23' },
    { key: 'ano_fabricacao',   label: 'Ano de fabricação',               placeholder: 'Ex: 2022' },
  ],
  VIAGEM: [
    { key: 'destino',          label: 'Destino da viagem',               placeholder: 'Ex: Europa, EUA, Nordeste' },
    { key: 'periodo_viagem',   label: 'Período / Duração',               placeholder: 'Ex: 15/06 a 30/06 (15 dias)' },
    { key: 'qtd_viajantes',    label: 'Quantidade de viajantes',         placeholder: 'Ex: 2' },
  ],
  RESIDENCIAL: [
    { key: 'endereco_imovel',  label: 'Endereço do imóvel',              placeholder: 'Rua, número, bairro, cidade' },
    { key: 'tipo_imovel',      label: 'Tipo de imóvel',                  placeholder: 'Casa ou apartamento' },
    { key: 'valor_imovel',     label: 'Valor aproximado do imóvel',      placeholder: 'Ex: R$ 350.000' },
  ],
  PET_SAUDE: [
    { key: 'nome_pet',         label: 'Nome do pet',                     placeholder: 'Ex: Rex' },
    { key: 'especie_raca',     label: 'Espécie e raça',                  placeholder: 'Ex: Cachorro — Golden Retriever' },
    { key: 'idade_pet',        label: 'Idade do pet',                    placeholder: 'Ex: 3 anos' },
  ],
  EMPRESARIAL: [
    { key: 'cnpj_empresa',     label: 'CNPJ da empresa',                 placeholder: 'Ex: 00.000.000/0001-00' },
    { key: 'qtd_funcionarios', label: 'Nº de funcionários',              placeholder: 'Ex: 25' },
    { key: 'segmento_empresa', label: 'Segmento da empresa',             placeholder: 'Ex: Tecnologia, Varejo, Saúde' },
  ],
  CARGAS: [
    { key: 'tipo_mercadoria',  label: 'Tipo de mercadoria',              placeholder: 'Ex: Eletrônicos, Alimentos' },
    { key: 'trajeto',          label: 'Trajeto (origem → destino)',      placeholder: 'Ex: São Paulo → Rio de Janeiro' },
    { key: 'valor_carga',      label: 'Valor aproximado da carga',       placeholder: 'Ex: R$ 50.000' },
  ],
  EQUIPAMENTOS: [
    { key: 'descricao_equip',  label: 'Descrição do equipamento',        placeholder: 'Ex: Notebook Dell XPS 15' },
    { key: 'valor_equip',      label: 'Valor do equipamento',            placeholder: 'Ex: R$ 8.000' },
    { key: 'uso_equip',        label: 'Uso principal',                   placeholder: 'Ex: Trabalho remoto, Fotografia' },
  ],
};

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const FORM_VAZIO = {
  segmento: '',
  cliente_nome: '',
  cliente_telefone: '',
  cliente_email: '',
  cliente_cpf: '',
  observacoes: '',
  extras: {},
};

const ParceiroDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [parceiro, setParceiro] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from('parceiros').select('*').eq('user_id', user.id).maybeSingle();
      if (p) {
        setParceiro(p);
        const [oRes, cRes] = await Promise.allSettled([
          supabase.from('orcamentos').select('*, comissoes(*)').eq('parceiro_id', p.id).order('created_at', { ascending: false }),
          supabase.from('comissoes').select('*, orcamentos(cliente_nome, segmento)').eq('parceiro_id', p.id).order('created_at', { ascending: false }),
        ]);
        if (oRes.status === 'fulfilled') setOrcamentos(oRes.value.data || []);
        if (cRes.status === 'fulfilled') setComissoes(cRes.value.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = () => {
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setExtra = (key, value) => setForm(f => ({ ...f, extras: { ...f.extras, [key]: value } }));

  const handleSolicitar = async () => {
    if (!form.segmento) return toast({ variant: 'destructive', title: 'Selecione o segmento.' });
    if (!form.cliente_nome.trim()) return toast({ variant: 'destructive', title: 'Informe o nome do cliente.' });
    if (!form.cliente_telefone.trim()) return toast({ variant: 'destructive', title: 'Informe o telefone do cliente.' });
    if (!parceiro?.id) return toast({ variant: 'destructive', title: 'Perfil de parceiro não encontrado.' });

    setEnviando(true);
    try {
      const camposExtras = SEGMENTO_CAMPOS[form.segmento] || [];
      let obsTexto = '';
      camposExtras.forEach(({ key, label }) => {
        const v = form.extras[key];
        if (v?.trim()) obsTexto += `${label}: ${v.trim()}\n`;
      });
      if (form.observacoes.trim()) obsTexto += `\nObservações: ${form.observacoes.trim()}`;

      const { error } = await supabase.from('orcamentos').insert({
        parceiro_id:      parceiro.id,
        segmento:         form.segmento,
        status:           'SOLICITACAO',
        cliente_nome:     form.cliente_nome.trim(),
        cliente_telefone: form.cliente_telefone.trim(),
        cliente_email:    form.cliente_email.trim() || null,
        cliente_cpf:      form.cliente_cpf.trim() || null,
        observacoes:      obsTexto.trim() || null,
      });

      if (error) throw error;

      toast({ title: 'Orçamento solicitado!', description: 'O ADM será notificado e responderá em breve.' });
      setModalAberto(false);
      loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao solicitar.', description: err?.message || 'Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/orcamento/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({ title: 'Link copiado!', description: 'Cole e envie para o cliente.' });
  };

  const emAndamento = orcamentos.filter(o => !['CONCLUIDO', 'COMISSAO'].includes(o.status));
  const concluidos = orcamentos.filter(o => ['CONCLUIDO', 'COMISSAO'].includes(o.status));
  const comissaoPendente = comissoes.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valor_comissao || 0), 0);
  const comissaoRecebida = comissoes.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valor_comissao || 0), 0);

  const metrics = [
    { label: 'Orçamentos em andamento', value: emAndamento.length, icon: Clock, color: 'text-blue-600' },
    { label: 'Contratos fechados', value: concluidos.length, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Comissão a receber', value: `R$ ${comissaoPendente.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-yellow-600' },
    { label: 'Total recebido', value: `R$ ${comissaoRecebida.toFixed(2).replace('.', ',')}`, icon: TrendingUp, color: 'text-emerald-600' },
  ];

  const renderOrcamentoCard = (o) => {
    const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.SOLICITACAO;
    const step = FUNIL.indexOf(o.status);
    return (
      <div key={o.id} className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{o.cliente_nome || 'Cliente não informado'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{SEGMENTO_LABEL[o.segmento] || o.segmento}</p>
            {o.cliente_telefone && <p className="text-xs text-gray-400">{o.cliente_telefone}</p>}
            {o.valor_mensalidade && (
              <p className="text-xs text-gray-500 mt-1">Mensalidade: <span className="font-semibold text-gray-700">R$ {Number(o.valor_mensalidade).toFixed(2).replace('.', ',')}</span></p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
            {o.status === 'ORCAMENTO' && o.slug && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => copyLink(o.slug)}>
                {copiedSlug === o.slug ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                {copiedSlug === o.slug ? 'Copiado' : 'Copiar link'}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {FUNIL.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#003580]' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">Solicitação</span>
          <span className="text-[10px] text-gray-400">Comissão</span>
        </div>
      </div>
    );
  };

  const camposDoSegmento = SEGMENTO_CAMPOS[form.segmento] || [];

  return (
    <>
      <Helmet><title>Portal do Parceiro — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Olá, {user?.name?.split(' ')[0] || 'Parceiro'} 👋
            </h1>
          </div>

          <Tabs defaultValue="dashboard">
            <TabsList className="grid grid-cols-4 h-auto gap-1 bg-white/10 border border-white/20 rounded-lg p-1">
              {[
                { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { value: 'orcamentos', label: 'Orçamentos', icon: FileText },
                { value: 'contratos', label: 'Contratos', icon: CheckCircle2 },
                { value: 'comissao', label: 'Comissão', icon: DollarSign },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="text-xs md:text-sm rounded-md text-white/70 data-[state=active]:bg-white/25 data-[state=active]:text-white data-[state=active]:font-semibold hover:text-white flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 hidden sm:block" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Dashboard ── */}
            <TabsContent value="dashboard" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-lg font-bold text-gray-800">{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-800">Orçamentos em andamento</CardTitle>
                    <Button size="sm" onClick={abrirModal} className="bg-[#003580] hover:bg-[#002060] text-white rounded-lg gap-1.5">
                      <Plus className="h-4 w-4" /> Solicitar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
                  ) : emAndamento.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum orçamento em andamento.</p>
                      <p className="text-xs mt-1">Solicite um novo orçamento para começar.</p>
                    </div>
                  ) : (
                    emAndamento.slice(0, 5).map(renderOrcamentoCard)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Orçamentos ── */}
            <TabsContent value="orcamentos" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">{orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''} no total</p>
                <Button onClick={abrirModal} variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 rounded-lg">
                  <Plus className="mr-1.5 h-4 w-4" /> Solicitar orçamento
                </Button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
                ) : orcamentos.length === 0 ? (
                  <Card className="border shadow-sm">
                    <CardContent className="text-center py-12">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">Nenhum orçamento ainda</p>
                      <p className="text-xs text-gray-400 mt-1">Solicite um orçamento para começar a vender.</p>
                    </CardContent>
                  </Card>
                ) : (
                  orcamentos.map(renderOrcamentoCard)
                )}
              </div>
            </TabsContent>

            {/* ── Contratos ── */}
            <TabsContent value="contratos" className="space-y-4 mt-4">
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
                ) : concluidos.length === 0 ? (
                  <Card className="border shadow-sm">
                    <CardContent className="text-center py-12">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">Nenhum contrato fechado ainda</p>
                      <p className="text-xs text-gray-400 mt-1">Contratos concluídos aparecerão aqui.</p>
                    </CardContent>
                  </Card>
                ) : (
                  concluidos.map(renderOrcamentoCard)
                )}
              </div>
            </TabsContent>

            {/* ── Comissão ── */}
            <TabsContent value="comissao" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">A receber</p>
                    <p className="text-2xl font-bold text-yellow-600">R$ {comissaoPendente.toFixed(2).replace('.', ',')}</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">Total recebido</p>
                    <p className="text-2xl font-bold text-emerald-600">R$ {comissaoRecebida.toFixed(2).replace('.', ',')}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
                ) : comissoes.length === 0 ? (
                  <Card className="border shadow-sm">
                    <CardContent className="text-center py-12">
                      <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">Nenhuma comissão registrada</p>
                      <p className="text-xs text-gray-400 mt-1">As comissões aparecem após a conclusão dos contratos.</p>
                    </CardContent>
                  </Card>
                ) : (
                  comissoes.map(c => (
                    <Card key={c.id} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{c.orcamentos?.cliente_nome || 'Cliente'}</p>
                            <p className="text-xs text-gray-400">{SEGMENTO_LABEL[c.orcamentos?.segmento] || c.orcamentos?.segmento}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Base: R$ {Number(c.valor_base).toFixed(2).replace('.', ',')} · {c.comissao_percentual}% · Imposto {c.imposto_percentual}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">R$ {Number(c.valor_comissao || 0).toFixed(2).replace('.', ',')}</p>
                            <Badge className={c.status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {c.status === 'PAGO' ? 'Pago' : 'Pendente'}
                            </Badge>
                            {c.data_pagamento && <p className="text-xs text-gray-400 mt-1">{c.data_pagamento}</p>}
                          </div>
                        </div>
                        {c.comprovante_path && (
                          <a href={c.comprovante_path} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <ArrowUpRight className="h-3 w-3" /> Ver comprovante
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </DashboardLayout>

      {/* ── Modal Solicitar Orçamento ── */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-[#003580] px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
                <div>
                  <h2 className="text-white font-bold text-lg">Solicitar Orçamento</h2>
                  <p className="text-white/70 text-xs mt-0.5">Preencha os dados do cliente e do seguro</p>
                </div>
                <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Segmento */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Segmento <span className="text-red-500">*</span></Label>
                  <select
                    value={form.segmento}
                    onChange={e => { setField('segmento', e.target.value); setForm(f => ({ ...f, extras: {} })); }}
                    className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Selecione o segmento...</option>
                    {SEGMENTOS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Dados do cliente */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do cliente</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Nome completo <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.cliente_nome}
                      onChange={e => setField('cliente_nome', e.target.value)}
                      placeholder="Nome completo do cliente"
                      className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Telefone / WhatsApp <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.cliente_telefone}
                      onChange={e => setField('cliente_telefone', e.target.value)}
                      placeholder="(11) 99999-0000"
                      className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">E-mail <span className="text-gray-400 font-normal">(opcional)</span></Label>
                      <Input
                        value={form.cliente_email}
                        onChange={e => setField('cliente_email', e.target.value)}
                        placeholder="email@exemplo.com"
                        type="email"
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">CPF <span className="text-gray-400 font-normal">(opcional)</span></Label>
                      <Input
                        value={form.cliente_cpf}
                        onChange={e => setField('cliente_cpf', e.target.value)}
                        placeholder="000.000.000-00"
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]"
                      />
                    </div>
                  </div>
                </div>

                {/* Campos específicos do segmento */}
                {camposDoSegmento.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Informações do seguro ({SEGMENTO_LABEL[form.segmento]})
                    </p>
                    {camposDoSegmento.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">{label}</Label>
                        <Input
                          value={form.extras[key] || ''}
                          onChange={e => setExtra(key, e.target.value)}
                          placeholder={placeholder}
                          className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Observações livres */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Observações <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <textarea
                    value={form.observacoes}
                    onChange={e => setField('observacoes', e.target.value)}
                    placeholder="Alguma informação adicional para o ADM..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] resize-none"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setModalAberto(false)}
                    className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50"
                    disabled={enviando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSolicitar}
                    disabled={enviando || !form.segmento || !form.cliente_nome.trim() || !form.cliente_telefone.trim()}
                    className="flex-1 rounded-lg text-white font-semibold gap-2"
                    style={{ background: '#003580' }}
                  >
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {enviando ? 'Enviando...' : 'Solicitar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ParceiroDashboard;
