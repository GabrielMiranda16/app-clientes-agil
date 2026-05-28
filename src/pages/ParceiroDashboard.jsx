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
  Plus, Minus, TrendingUp, Clock, Copy, Check,
  ArrowUpRight, X, Send, Loader2, Eye, Phone, Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';

const STATUS_CONFIG = {
  SOLICITACAO:  { label: 'Solicitação',  color: 'bg-gray-100 text-gray-700',     desc: 'Aguardando resposta do ADM' },
  ORCAMENTO:    { label: 'Orçamento',    color: 'bg-blue-100 text-blue-700',     desc: 'Link pronto — envie para o cliente' },
  DOCUMENTOS:   { label: 'Documentos',   color: 'bg-yellow-100 text-yellow-700', desc: 'Cliente aceitou — enviando documentos' },
  ASSINATURA:   { label: 'Assinatura',   color: 'bg-purple-100 text-purple-700', desc: 'Documentos recebidos — em assinatura' },
  CONCLUIDO:    { label: 'Concluído',    color: 'bg-green-100 text-green-700',   desc: 'Contrato assinado — aguardando comissão' },
  COMISSAO:     { label: 'Comissão',     color: 'bg-emerald-100 text-emerald-700', desc: 'Comissão registrada' },
};

const SEGMENTOS = [
  { value: 'AUTO',          label: 'Seguro Auto' },
  { value: 'SAUDE',         label: 'Plano de Saúde' },
  { value: 'RESIDENCIAL',   label: 'Seguro Residencial' },
  { value: 'EMPRESARIAL',   label: 'Seguro Empresarial' },
  { value: 'ODONTOLOGICO',  label: 'Plano Odontológico' },
  { value: 'VIAGEM',        label: 'Seguro Viagem' },
  { value: 'PET_SAUDE',     label: 'Plano de Saúde Pet' },
  { value: 'PET_SEGURO',    label: 'Seguro Pet' },
  { value: 'VIDA',          label: 'Seguro de Vida' },
  { value: 'FROTA',         label: 'Seguro Frota' },
  { value: 'CARGAS',        label: 'Seguro de Cargas' },
  { value: 'EQUIPAMENTOS',  label: 'Equipamentos Portáteis' },
];

const SEGMENTO_LABEL = Object.fromEntries(SEGMENTOS.map(s => [s.value, s.label]));

const SEGMENTO_CAMPOS = {
  AUTO: [
    { key: 'placa',          label: 'Placa do veículo',    placeholder: 'Ex: ABC1D23' },
    { key: 'modelo_veiculo', label: 'Modelo do veículo',   placeholder: 'Ex: Honda Civic 2023' },
    { key: 'ano_fabricacao', label: 'Ano de fabricação',   type: 'number', placeholder: 'Ex: 2023' },
  ],
  SAUDE: [
    { key: 'modalidade_plano', label: 'Modalidade do plano', type: 'select', options: ['Empresarial', 'Familiar', 'Sênior', 'Individual'] },
    { key: 'qtd_vidas',        label: 'Número de vidas',     type: 'number', placeholder: 'Ex: 3' },
  ],
  RESIDENCIAL: [
    { key: 'tipo_imovel',     label: 'Tipo de imóvel',       type: 'select', options: ['Casa', 'Apartamento', 'Sobrado'] },
    { key: 'endereco_imovel', label: 'Endereço do imóvel',   placeholder: 'Rua, número, bairro, cidade' },
    { key: 'valor_imovel',    label: 'Valor aproximado (R$)', placeholder: 'Ex: 350000' },
  ],
  EMPRESARIAL: [
    { key: 'nome_empresa',     label: 'Nome da empresa',      placeholder: 'Ex: Empresa ABC Ltda' },
    { key: 'cnpj_empresa',     label: 'CNPJ da empresa',      placeholder: 'Ex: 00.000.000/0001-00' },
    { key: 'qtd_vidas',        label: 'Número de vidas',      type: 'number', placeholder: 'Ex: 10' },
    { key: 'segmento_empresa', label: 'Segmento da empresa',  placeholder: 'Ex: Tecnologia, Varejo, Saúde' },
  ],
  ODONTOLOGICO: [
    { key: 'qtd_vidas', label: 'Número de vidas', type: 'number', placeholder: 'Ex: 3' },
  ],
  VIAGEM: [
    { key: 'destino',       label: 'Destino',                  placeholder: 'Ex: Europa, EUA, Nordeste' },
    { key: 'data_inicio',   label: 'Data de início',           type: 'date' },
    { key: 'data_fim',      label: 'Data de fim',              type: 'date' },
    { key: 'qtd_viajantes', label: 'Quantidade de viajantes',  type: 'number', placeholder: 'Ex: 2' },
  ],
  PET_SAUDE: [
    { key: 'nome_pet',   label: 'Nome do pet',   placeholder: 'Ex: Rex' },
    { key: 'raca_pet',   label: 'Raça do pet',   placeholder: 'Ex: Golden Retriever' },
    { key: 'idade_pet',  label: 'Idade do pet',  placeholder: 'Ex: 3 anos' },
  ],
  PET_SEGURO: [
    { key: 'nome_pet',   label: 'Nome do pet',   placeholder: 'Ex: Rex' },
    { key: 'raca_pet',   label: 'Raça do pet',   placeholder: 'Ex: Golden Retriever' },
    { key: 'idade_pet',  label: 'Idade do pet',  placeholder: 'Ex: 3 anos' },
  ],
  VIDA: [
    { key: 'cobertura_desejada', label: 'Valor de cobertura desejado (R$)', placeholder: 'Ex: 100000' },
  ],
  FROTA: [
    { key: 'nome_empresa',  label: 'Nome da empresa',      placeholder: 'Ex: Transportadora ABC' },
    { key: 'qtd_veiculos',  label: 'Número de veículos',   type: 'number', placeholder: 'Ex: 5' },
    { key: 'tipo_veiculos', label: 'Tipo de veículos',     placeholder: 'Ex: Caminhões, Vans, Carros' },
  ],
  CARGAS: [
    { key: 'nome_empresa',   label: 'Nome da empresa',              placeholder: 'Ex: Transportadora ABC' },
    { key: 'tipo_mercadoria', label: 'Tipo de carga',               placeholder: 'Ex: Eletrônicos, Alimentos' },
    { key: 'trajeto',        label: 'Trajeto (origem → destino)',   placeholder: 'Ex: São Paulo → Rio de Janeiro' },
    { key: 'valor_carga',    label: 'Valor da carga (R$)',          placeholder: 'Ex: 50000' },
  ],
  EQUIPAMENTOS: [
    { key: 'tipo_equip',    label: 'Tipo de equipamento',       placeholder: 'Ex: Notebook, Câmera, Drone' },
    { key: 'descricao_equip', label: 'Descrição do equipamento', placeholder: 'Ex: MacBook Pro M3 14"' },
    { key: 'valor_equip',   label: 'Valor do equipamento (R$)', placeholder: 'Ex: 8000' },
  ],
};

const AGE_BRACKETS = [
  { id: '0-18',  label: '0 a 18 anos' },
  { id: '19-23', label: '19 a 23 anos' },
  { id: '24-28', label: '24 a 28 anos' },
  { id: '29-33', label: '29 a 33 anos' },
  { id: '34-38', label: '34 a 38 anos' },
  { id: '39-43', label: '39 a 43 anos' },
  { id: '44-48', label: '44 a 48 anos' },
  { id: '49-53', label: '49 a 53 anos' },
  { id: '54-58', label: '54 a 58 anos' },
  { id: '59+',   label: '59+ anos' },
];

const faixaKey = (id) => `faixa_${id.replace(/-/g, '_').replace('+', 'plus')}`;

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const FORM_VAZIO = { segmento: '', cliente_nome: '', cliente_telefone: '', cliente_email: '', cliente_cpf: '', cliente_data_nascimento: '', observacoes: '', extras: {} };

const validarCpfCnpj = (val) => {
  const digits = (val || '').replace(/\D/g, '');
  return digits.length === 11 || digits.length === 14;
};

const validarTelefone = (val) => {
  const digits = (val || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

const validarEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || '').trim());

const fmtData = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

  const [detalhe, setDetalhe] = useState(null);
  const [detalheComissao, setDetalheComissao] = useState(null);

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

  const abrirModal = () => { setForm(FORM_VAZIO); setModalAberto(true); };
  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setExtra = (key, value) => setForm(f => ({ ...f, extras: { ...f.extras, [key]: value } }));

  const handleSolicitar = async () => {
    if (!form.segmento) return toast({ variant: 'destructive', title: 'Selecione o segmento.' });
    if (!form.cliente_nome.trim()) return toast({ variant: 'destructive', title: 'Informe o nome do cliente.' });
    if (!form.cliente_telefone.trim()) return toast({ variant: 'destructive', title: 'Informe o telefone do cliente.' });
    if (!validarTelefone(form.cliente_telefone)) return toast({ variant: 'destructive', title: 'Telefone inválido.', description: 'Informe um número com DDD (10 ou 11 dígitos).' });
    if (!form.cliente_email.trim()) return toast({ variant: 'destructive', title: 'Informe o e-mail do cliente.' });
    if (!validarEmail(form.cliente_email)) return toast({ variant: 'destructive', title: 'E-mail inválido.', description: 'Informe um e-mail no formato correto.' });
    if (!form.cliente_cpf.trim()) return toast({ variant: 'destructive', title: 'Informe o CPF ou CNPJ do cliente.' });
    if (!validarCpfCnpj(form.cliente_cpf)) return toast({ variant: 'destructive', title: 'CPF ou CNPJ inválido.', description: 'CPF deve ter 11 dígitos e CNPJ 14 dígitos.' });
    if (!form.cliente_data_nascimento) return toast({ variant: 'destructive', title: 'Informe a data de nascimento do cliente.' });
    if (!parceiro?.id) return toast({ variant: 'destructive', title: 'Perfil de parceiro não encontrado.' });

    setEnviando(true);
    try {
      const camposExtras = SEGMENTO_CAMPOS[form.segmento] || [];
      let obsTexto = '';
      camposExtras.forEach(({ key, label }) => {
        const v = form.extras[key];
        if (v != null && String(v).trim()) obsTexto += `${label}: ${String(v).trim()}\n`;
      });
      if (['SAUDE', 'ODONTOLOGICO'].includes(form.segmento)) {
        const lines = AGE_BRACKETS
          .map(({ id, label }) => {
            const val = parseInt(form.extras[faixaKey(id)] || '0');
            return val > 0 ? `  ${label}: ${val}` : null;
          })
          .filter(Boolean);
        if (lines.length) obsTexto += `Distribuição por faixa etária:\n${lines.join('\n')}\n`;
      }
      if (form.observacoes.trim()) obsTexto += `\nObservações: ${form.observacoes.trim()}`;

      const { error } = await supabase.from('orcamentos').insert({
        parceiro_id: parceiro.id,
        segmento: form.segmento,
        status: 'SOLICITACAO',
        cliente_nome: form.cliente_nome.trim(),
        cliente_telefone: form.cliente_telefone.trim(),
        cliente_email: form.cliente_email.trim(),
        cliente_cpf: form.cliente_cpf.replace(/\D/g, ''),
        cliente_data_nascimento: form.cliente_data_nascimento || null,
        observacoes: obsTexto.trim() || null,
      });

      if (error) throw error;
      toast({ title: 'Orçamento solicitado!', description: 'O ADM será notificado e responderá em breve.' });

      // Notifica ADM via WhatsApp
      const segLabel = SEGMENTOS.find(s => s.value === form.segmento)?.label || form.segmento;
      supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: '5511999996863',
          message:
            `🔔 *Nova solicitação de orçamento!*\n\n` +
            `Parceiro: *${parceiro.nome_completo}*\n` +
            `Cliente: ${form.cliente_nome.trim()}\n` +
            `Telefone: ${form.cliente_telefone.trim()}\n` +
            `Segmento: ${segLabel}\n\n` +
            `Acesse o portal para responder com o orçamento.`,
        },
      }).catch(() => {});

      setModalAberto(false);
      loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao solicitar.', description: err?.message || 'Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  };

  const abrirDetalhe = async (o) => {
    setDetalhe(o);
    setDetalheComissao(null);
    if (['CONCLUIDO', 'COMISSAO'].includes(o.status)) {
      const { data } = await supabase.from('comissoes').select('*').eq('orcamento_id', o.id).maybeSingle();
      setDetalheComissao(data);
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
    { label: 'Em andamento', value: emAndamento.length, icon: Clock, color: 'text-blue-600' },
    { label: 'Contratos fechados', value: concluidos.length, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'A receber', value: `R$ ${comissaoPendente.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-yellow-600' },
    { label: 'Total recebido', value: `R$ ${comissaoRecebida.toFixed(2).replace('.', ',')}`, icon: TrendingUp, color: 'text-emerald-600' },
  ];

  const renderOrcamentoCard = (o, clicavel = true) => {
    const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.SOLICITACAO;
    const step = FUNIL.indexOf(o.status);
    return (
      <div key={o.id}
        className={`border rounded-xl p-4 bg-white transition-shadow ${clicavel ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''}`}
        onClick={clicavel ? () => abrirDetalhe(o) : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{o.cliente_nome || 'Cliente não informado'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{SEGMENTO_LABEL[o.segmento] || o.segmento}</p>
            <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
            {o.valor_mensalidade && (
              <p className="text-xs text-gray-500 mt-1">Mensalidade: <span className="font-semibold text-gray-700">R$ {Number(o.valor_mensalidade).toFixed(2).replace('.', ',')}</span></p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
            {o.status === 'ORCAMENTO' && o.slug && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                onClick={e => { e.stopPropagation(); copyLink(o.slug); }}>
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

  const totalVidas = parseInt(form.extras.qtd_vidas || '0');
  const distribuiVidas = AGE_BRACKETS.reduce((s, { id }) => s + parseInt(form.extras[faixaKey(id)] || '0'), 0);
  const remainingLives = totalVidas - distribuiVidas;
  const showAgeBrackets = ['SAUDE', 'ODONTOLOGICO'].includes(form.segmento) && totalVidas > 0;

  return (
    <>
      <Helmet><title>Portal do Parceiro — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Olá, {user?.name?.split(' ')[0] || 'Parceiro'}
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
                      <div className={`p-2 rounded-lg bg-gray-50 ${color}`}><Icon className="h-5 w-5" /></div>
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
                    <CardTitle className="text-base font-semibold text-gray-800">Em andamento</CardTitle>
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
                    </div>
                  ) : (
                    emAndamento.slice(0, 5).map(o => renderOrcamentoCard(o))
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
                    </CardContent>
                  </Card>
                ) : (
                  orcamentos.map(o => renderOrcamentoCard(o))
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
                    </CardContent>
                  </Card>
                ) : (
                  concluidos.map(o => renderOrcamentoCard(o))
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
                              Base: R$ {Number(c.valor_base).toFixed(2).replace('.', ',')} · {c.comissao_percentual}% · 6% imposto
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">R$ {Number(c.valor_comissao || 0).toFixed(2).replace('.', ',')}</p>
                            <Badge className={c.status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {c.status === 'PAGO' ? 'Pago' : 'Pendente'}
                            </Badge>
                            {c.data_pagamento && <p className="text-xs text-gray-400 mt-1">{fmtData(c.data_pagamento)}</p>}
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

      {/* ── Modal Detalhe do Orçamento ── */}
      <AnimatePresence>
        {detalhe && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
              {/* Header */}
              <div className={`px-5 py-4 flex items-start justify-between rounded-t-2xl sticky top-0 z-10 ${
                detalhe.status === 'SOLICITACAO' ? 'bg-[#003580]' :
                detalhe.status === 'ORCAMENTO' ? 'bg-blue-600' :
                detalhe.status === 'DOCUMENTOS' ? 'bg-yellow-600' :
                detalhe.status === 'ASSINATURA' ? 'bg-purple-600' :
                detalhe.status === 'CONCLUIDO' ? 'bg-green-600' : 'bg-emerald-600'
              }`}>
                <div>
                  <p className="text-white font-bold text-base">{detalhe.cliente_nome}</p>
                  <p className="text-white/80 text-xs">{SEGMENTO_LABEL[detalhe.segmento] || detalhe.segmento}</p>
                  <Badge className={`mt-1 text-xs ${STATUS_CONFIG[detalhe.status]?.color}`}>{STATUS_CONFIG[detalhe.status]?.label}</Badge>
                </div>
                <button onClick={() => setDetalhe(null)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Status desc */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  {STATUS_CONFIG[detalhe.status]?.desc}
                </div>

                {/* Link (se ORCAMENTO) */}
                {detalhe.status === 'ORCAMENTO' && detalhe.slug && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-700">Link para o cliente</p>
                    <p className="text-xs text-blue-600 font-mono break-all">{window.location.origin}/orcamento/{detalhe.slug}</p>
                    <Button size="sm" onClick={() => copyLink(detalhe.slug)}
                      className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
                      {copiedSlug === detalhe.slug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedSlug === detalhe.slug ? 'Copiado!' : 'Copiar link e enviar ao cliente'}
                    </Button>
                  </div>
                )}

                {/* Proposta (se ADM já respondeu) */}
                {detalhe.valor_mensalidade && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposta da Ágil</p>
                    <div className="bg-gradient-to-r from-[#003580]/5 to-[#0B7EC4]/5 rounded-xl p-4 border border-[#003580]/10">
                      <p className="text-xs text-gray-500">Mensalidade</p>
                      <p className="text-2xl font-bold text-[#003580]">R$ {Number(detalhe.valor_mensalidade).toFixed(2).replace('.', ',')}</p>
                      {detalhe.descricao_orcamento && <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{detalhe.descricao_orcamento}</p>}
                    </div>
                  </div>
                )}

                {/* Dados do cliente */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    {detalhe.cliente_telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <a href={`tel:${detalhe.cliente_telefone}`} className="hover:underline text-blue-600">{detalhe.cliente_telefone}</a>
                      </div>
                    )}
                    {detalhe.cliente_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {detalhe.cliente_email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados da solicitação */}
                {detalhe.observacoes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados enviados</p>
                    <pre className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 whitespace-pre-wrap font-sans">{detalhe.observacoes}</pre>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progresso</p>
                  <div className="flex gap-1 mb-1">
                    {FUNIL.map((s, i) => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= FUNIL.indexOf(detalhe.status) ? 'bg-[#003580]' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-y-1.5 text-xs text-gray-500">
                    {[
                      { label: 'Solicitação', date: detalhe.data_solicitacao || detalhe.created_at },
                      { label: 'Orçamento', date: detalhe.data_orcamento },
                      { label: 'Documentos', date: detalhe.data_documentos },
                      { label: 'Assinatura', date: detalhe.data_assinatura },
                      { label: 'Concluído', date: detalhe.data_conclusao },
                    ].map(({ label, date }) => date ? (
                      <div key={label}>
                        <p className="font-medium text-gray-600">{label}</p>
                        <p className="text-[10px]">{fmtData(date)}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>

                {/* Comissão (se CONCLUIDO/COMISSAO) */}
                {detalheComissao && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comissão</p>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">
                            Base R$ {Number(detalheComissao.valor_base).toFixed(2).replace('.', ',')} · {detalheComissao.comissao_percentual}% · 6% imposto
                          </p>
                          <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                            R$ {Number(detalheComissao.valor_comissao || 0).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <Badge className={detalheComissao.status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {detalheComissao.status === 'PAGO' ? 'Pago ✓' : 'Pendente'}
                        </Badge>
                      </div>
                      {detalheComissao.comprovante_path && (
                        <a href={detalheComissao.comprovante_path} target="_blank" rel="noreferrer"
                          className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Eye className="h-3 w-3" /> Ver comprovante de pagamento
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Solicitar Orçamento ── */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="bg-[#003580] px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
                <div>
                  <h2 className="text-white font-bold text-lg">Solicitar Orçamento</h2>
                  <p className="text-white/70 text-xs mt-0.5">Preencha os dados do cliente e do seguro</p>
                </div>
                <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Segmento */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Segmento <span className="text-red-500">*</span></Label>
                  <select value={form.segmento}
                    onChange={e => { setField('segmento', e.target.value); setForm(f => ({ ...f, extras: {} })); }}
                    className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]">
                    <option value="">Selecione o segmento...</option>
                    {SEGMENTOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* Dados do cliente */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do cliente</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Nome completo <span className="text-red-500">*</span></Label>
                    <input value={form.cliente_nome} onChange={e => setField('cliente_nome', e.target.value)}
                      placeholder="Nome completo do cliente"
                      className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Telefone / WhatsApp <span className="text-red-500">*</span></Label>
                    <input value={form.cliente_telefone} onChange={e => setField('cliente_telefone', e.target.value)}
                      placeholder="(11) 99999-0000"
                      className={`w-full rounded-lg border bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#003580] ${form.cliente_telefone && !validarTelefone(form.cliente_telefone) ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#003580]'}`} />
                    {form.cliente_telefone && !validarTelefone(form.cliente_telefone) && (
                      <p className="text-xs text-red-500 mt-0.5">Informe um número com DDD (10 ou 11 dígitos)</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">E-mail <span className="text-red-500">*</span></Label>
                    <input value={form.cliente_email} onChange={e => setField('cliente_email', e.target.value)}
                      placeholder="email@exemplo.com" type="email"
                      className={`w-full rounded-lg border bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#003580] ${form.cliente_email && !validarEmail(form.cliente_email) ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#003580]'}`} />
                    {form.cliente_email && !validarEmail(form.cliente_email) && (
                      <p className="text-xs text-red-500 mt-0.5">Informe um e-mail válido</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">CPF / CNPJ <span className="text-red-500">*</span></Label>
                      <input value={form.cliente_cpf} onChange={e => setField('cliente_cpf', e.target.value)}
                        placeholder="000.000.000-00"
                        className={`w-full rounded-lg border bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#003580] ${form.cliente_cpf && !validarCpfCnpj(form.cliente_cpf) ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#003580]'}`} />
                      {form.cliente_cpf && !validarCpfCnpj(form.cliente_cpf) && (
                        <p className="text-xs text-red-500 mt-0.5">CPF (11 dígitos) ou CNPJ (14 dígitos)</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Data de nascimento <span className="text-red-500">*</span></Label>
                      <input value={form.cliente_data_nascimento} onChange={e => setField('cliente_data_nascimento', e.target.value)}
                        type="date"
                        className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]" />
                    </div>
                  </div>
                </div>

                {/* Campos específicos do segmento */}
                {camposDoSegmento.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Informações do seguro ({SEGMENTO_LABEL[form.segmento]})
                    </p>
                    {camposDoSegmento.map(({ key, label, placeholder, type, options }) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">{label}</Label>
                        {type === 'select' ? (
                          <select value={form.extras[key] || ''}
                            onChange={e => setExtra(key, e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]">
                            <option value="">Selecione...</option>
                            {(options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input value={form.extras[key] || ''} onChange={e => setExtra(key, e.target.value)}
                            type={type || 'text'} placeholder={placeholder}
                            className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Distribuição por faixa etária — Saúde e Odonto */}
                {showAgeBrackets && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Distribuição por faixa etária</p>
                      <span className={`text-xs font-bold ${remainingLives === 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {remainingLives === 0 ? 'Completo ✓' : `${remainingLives} restante(s)`}
                      </span>
                    </div>
                    {AGE_BRACKETS.map(({ id, label }) => {
                      const key = faixaKey(id);
                      const val = parseInt(form.extras[key] || '0');
                      return (
                        <div key={id} className="flex items-center justify-between gap-3">
                          <Label className="text-sm text-gray-600 flex-1">{label}</Label>
                          <div className="flex items-center gap-2">
                            <button type="button"
                              onClick={() => setExtra(key, String(Math.max(0, val - 1)))}
                              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-95">
                              <Minus className="h-3 w-3 text-gray-600" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-gray-800">{val}</span>
                            <button type="button"
                              onClick={() => setExtra(key, String(val + 1))}
                              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-95">
                              <Plus className="h-3 w-3 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Observações <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <textarea value={form.observacoes} onChange={e => setField('observacoes', e.target.value)}
                    placeholder="Alguma informação adicional para o ADM..." rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] resize-none" />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setModalAberto(false)} disabled={enviando}
                    className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </Button>
                  <Button onClick={handleSolicitar}
                    disabled={enviando || !form.segmento || !form.cliente_nome.trim() || !validarTelefone(form.cliente_telefone) || !validarEmail(form.cliente_email) || !validarCpfCnpj(form.cliente_cpf) || !form.cliente_data_nascimento}
                    className="flex-1 rounded-lg text-white font-semibold gap-2" style={{ background: '#003580' }}>
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
