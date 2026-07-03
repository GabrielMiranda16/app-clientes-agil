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
import { SEGURADORAS } from '@/data/seguradoras';

const maskBRL = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10);
  const cents = n % 100;
  const reais = Math.floor(n / 100);
  const reaisStr = reais === 0 ? '0' : reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
};

const STATUS_CONFIG = {
  SOLICITACAO:  { label: 'Solicitação',        color: 'bg-gray-100 text-gray-700',    desc: 'Aguardando resposta do ADM' },
  ORCAMENTO:    { label: 'Orçamento',          color: 'bg-blue-100 text-blue-700',    desc: 'Link pronto — envie para o cliente' },
  DOCUMENTOS:   { label: 'Documentos',         color: 'bg-blue-100 text-[#003580]',   desc: 'Cliente aceitou — enviando documentos' },
  ASSINATURA:   { label: 'Assinatura/Transmitida', color: 'bg-blue-100 text-[#003580]', desc: null },
  CONCLUIDO:    { label: 'Concluído',          color: 'bg-blue-100 text-[#003580]',   desc: 'Contrato assinado — aguardando comissão' },
  COMISSAO:     { label: 'Comissão',           color: 'bg-blue-100 text-[#003580]',   desc: 'Comissão registrada' },
};
const assinaturaLabel = seg => ['SAUDE', 'VIDA', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'].includes(seg) ? 'Assinatura' : 'Transmitida';
const assinaturaDesc  = seg => ['SAUDE', 'VIDA', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'].includes(seg) ? 'Documentos recebidos — em assinatura' : 'Proposta transmitida — aguardando conclusão';

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
    { key: 'placa',          label: 'Placa',              header: 'Dados do veículo', type: 'plate', placeholder: 'Ex: ABC1D23' },
    { key: 'chassi',         label: 'Chassi',             type: 'text', placeholder: 'Auto-preenchido pela placa', optional: true },
    { key: 'modelo_veiculo', label: 'Modelo',             type: 'text', placeholder: 'Auto-preenchido pela placa', optional: true },
    { key: 'ano_fabricacao', label: 'Ano de fabricação',  type: 'number', placeholder: 'Ex: 2023' },
    { key: 'tipo_uso',       label: 'Tipo de uso',        header: 'Uso do veículo', type: 'select',
      options: ['Particular','Táxi','Frete','Misto','Lotação','Bombeiro','Ambulância','Policiamento','Escolar','Test Drive','Diferenciado','Transporte por Aplicativo'] },
    { key: 'cep',            label: 'CEP',                header: 'Endereço', type: 'cep', placeholder: 'Ex: 01310-100' },
    { key: 'rua',            label: 'Rua / Logradouro',   type: 'text', placeholder: 'Auto-preenchido pelo CEP', optional: true },
    { key: 'numero',         label: 'Número',             type: 'text', placeholder: 'Ex: 123' },
    { key: 'complemento',    label: 'Complemento',        type: 'text', placeholder: 'Ex: Apto 42', optional: true },
    { key: 'cor',            label: 'Cor',                type: 'text', optional: true, hidden: true },
    { key: 'municipio',      label: 'Município',          type: 'text', optional: true, hidden: true },
    { key: 'origem',         label: 'Origem',             type: 'text', optional: true, hidden: true },
    { key: 'logo_marca',     label: 'Logo',               type: 'text', optional: true, hidden: true },
  ],
  SAUDE: [
    { key: 'tipo', label: 'Modalidade do plano', type: 'select', options: [
      { value: 'INDIVIDUAL', label: 'INDIVIDUAL' },
      { value: 'MEI',        label: 'MEI/FAMILIAR' },
      { value: 'PME',        label: 'PME (até 99 vidas)' },
      { value: 'PJ',         label: 'PJ (acima de 100 vidas)' },
    ]},
    { key: 'qtd_vidas', label: 'Número de vidas', type: 'number', placeholder: 'Ex: 3' },
    { key: 'cidade', label: 'Cidade', placeholder: 'Ex: São Paulo' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] },
  ],
  RESIDENCIAL: [
    { key: 'tipo_imovel',  label: 'Tipo de imóvel',        type: 'select', options: ['Casa', 'Apartamento', 'Sobrado'] },
    { key: 'cep',          label: 'CEP do imóvel',          header: 'Endereço', type: 'cep', placeholder: 'Ex: 01310-100' },
    { key: 'rua',          label: 'Rua / Logradouro',       type: 'text', placeholder: 'Auto-preenchido pelo CEP', optional: true },
    { key: 'numero',       label: 'Número',                 type: 'text', placeholder: 'Ex: 123' },
    { key: 'complemento',  label: 'Complemento',            type: 'text', placeholder: 'Ex: Apto 42', optional: true },
    { key: 'valor_imovel', label: 'Valor aproximado (R$)',  type: 'text', placeholder: 'Ex: 350.000', money: true },
  ],
  EMPRESARIAL: [
    { key: 'nome_empresa',     label: 'Nome da empresa',      placeholder: 'Ex: Empresa ABC Ltda' },
    { key: 'cnpj_empresa',     label: 'CNPJ da empresa',      placeholder: 'Ex: 00.000.000/0001-00' },
    { key: 'qtd_vidas',        label: 'Número de vidas',      type: 'number', placeholder: 'Ex: 10' },
    { key: 'segmento_empresa', label: 'Segmento da empresa',  placeholder: 'Ex: Tecnologia, Varejo, Saúde' },
  ],
  ODONTOLOGICO: [
    { key: 'tipo', label: 'Modalidade do plano', type: 'select', options: ['INDIVIDUAL', 'MEI', 'PME', 'PJ'] },
    { key: 'qtd_vidas', label: 'Número de vidas', type: 'number', placeholder: 'Ex: 3' },
  ],
  VIAGEM: [
    { key: 'tipo_viagem',  label: 'Tipo da viagem',               type: 'select', options: ['Nacional', 'Internacional'] },
    { key: 'destino',      label: 'Destino',                      placeholder: 'Ex: Portugal, EUA, Nordeste' },
    { key: 'data_saida',   label: 'Data de saída',                type: 'date' },
    { key: 'data_retorno', label: 'Data de retorno',              type: 'date' },
    { key: 'utiliza_moto', label: 'Utilizará moto?',              type: 'select', options: ['Não', 'Sim'] },
    { key: 'pax_0_70',     label: 'Passageiros de 0 a 70 anos',  type: 'number', placeholder: 'Ex: 2' },
    { key: 'pax_71_90',    label: 'Passageiros de 71 a 90 anos', type: 'number', placeholder: 'Ex: 0', optional: true },
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
    { key: 'valor_carga',    label: 'Valor da carga (R$)',          placeholder: 'Ex: 50.000,00', money: true },
  ],
  EQUIPAMENTOS: [
    { key: 'tipo_equip',    label: 'Tipo de equipamento',       placeholder: 'Ex: Notebook, Câmera, Drone' },
    { key: 'descricao_equip', label: 'Descrição do equipamento', placeholder: 'Ex: MacBook Pro M3 14"' },
    { key: 'valor_equip',   label: 'Valor do equipamento (R$)', placeholder: 'Ex: 8000', money: true },
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
  const [cenariosSolic, setCenariosSolic] = useState([{ tem_plano: false, operadora: '', valor: '', vidas: {} }]);
  const updCenarioSolicVidas = (ci, id, val) => setCenariosSolic(cs => cs.map((c, idx) => idx === ci ? { ...c, vidas: { ...(c.vidas || {}), [id]: val } } : c));
  const [enviando, setEnviando] = useState(false);
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);

  const [detalhe, setDetalhe] = useState(null);
  const [detalheComissao, setDetalheComissao] = useState(null);

  const [pgOrc, setPgOrc] = useState(1);
  const [pgContr, setPgContr] = useState(1);
  const [pgCom, setPgCom] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    if (user?.id) loadData();
  }, [user]);

  useEffect(() => {
    const aberto = detalhe || modalAberto;
    if (!aberto) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [detalhe, modalAberto]);

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

  const abrirModal = () => { setForm(FORM_VAZIO); setCenariosSolic([{ tem_plano: false, operadora: '', valor: '', vidas: {} }]); setModalAberto(true); };
  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setExtra = async (key, value) => {
    const val = key === 'placa' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value;
    setForm(f => ({ ...f, extras: { ...f.extras, [key]: val } }));

    if (key === 'cep') {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 8) {
        try {
          const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
          const json = await res.json();
          if (!json.erro) {
            setForm(f => ({ ...f, extras: { ...f.extras, cep: val, rua: json.logradouro || '', bairro: json.bairro || '', cidade: json.localidade || '' } }));
          }
        } catch {}
      }
    }

    if (key === 'placa' && val.length === 7) {
      setBuscandoPlaca(true);
      try {
        const { data: json, error } = await supabase.functions.invoke('buscar-placa', { body: { placa: val } });
        if (!error && json && !json.error) {
          setForm(f => ({
            ...f,
            extras: {
              ...f.extras,
              chassi: json.chassi || f.extras.chassi || '',
              modelo_veiculo: [json.marca || json.MARCA, json.modelo || json.MODELO].filter(Boolean).join(' ').trim() || f.extras.modelo_veiculo || '',
              ano_fabricacao: String(json.extra?.ano_fabricacao || json.ano || f.extras.ano_fabricacao || ''),
              cor: json.cor || f.extras.cor || '',
              municipio: json.municipio ? `${json.municipio}${json.uf ? ' - ' + json.uf : ''}` : f.extras.municipio || '',
              origem: json.origem || f.extras.origem || '',
              logo_marca: json.logo || f.extras.logo_marca || '',
            },
          }));
        }
      } catch {}
      finally { setBuscandoPlaca(false); }
    }
  };
  const addCenarioSolic = () => setCenariosSolic(cs => [...cs, { tem_plano: false, operadora: '', valor: '', vidas: {} }]);
  const removeCenarioSolic = (i) => setCenariosSolic(cs => cs.filter((_, idx) => idx !== i));
  const updCenarioSolic = (i, key, val) => setCenariosSolic(cs => cs.map((c, idx) => idx === i ? { ...c, [key]: val } : c));

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
    const campoFaltando = camposDoSegmento.find(c => !c.optional && !String(form.extras[c.key] || '').trim());
    if (campoFaltando) return toast({ variant: 'destructive', title: `Informe: ${campoFaltando.label}.` });
    if (showAgeBrackets && remainingLives !== 0) return toast({ variant: 'destructive', title: 'Distribua todas as vidas por faixa etária.', description: `Faltam ${remainingLives} vida(s) para distribuir.` });
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

      const cenAtivos = cenariosSolic.filter(c => c.tem_plano).map(c => ({ tem_plano: true, operadora: c.operadora || '', valor: c.valor || '', vidas: c.vidas || {} }));
      const { data: orcData, error } = await supabase.from('orcamentos').insert({
        parceiro_id: parceiro.id,
        segmento: form.segmento,
        modalidade: form.extras.tipo || null,
        status: 'SOLICITACAO',
        cliente_nome: form.cliente_nome.trim(),
        cliente_telefone: form.cliente_telefone.trim(),
        cliente_email: form.cliente_email.trim(),
        cliente_cpf: form.cliente_cpf.replace(/\D/g, ''),
        cliente_data_nascimento: form.cliente_data_nascimento || null,
        observacoes: obsTexto.trim() || null,
        cenarios_atuais: cenAtivos.length > 0 ? cenAtivos : null,
      }).select('id').single();

      if (error) throw error;

      supabase.from('leads').insert({
        nome: form.cliente_nome.trim(),
        cpf: form.cliente_cpf.replace(/\D/g, '') || null,
        data_nascimento: form.cliente_data_nascimento || null,
        email: form.cliente_email.trim() || null,
        telefone: form.cliente_telefone.trim() || null,
        segmento: form.segmento,
        origem: 'parceiro',
        status: 'novo',
        orcamento_id: orcData.id,
      }).catch(() => {});
      toast({ title: 'Orçamento solicitado!', description: 'O ADM será notificado e responderá em breve.' });

      // Notifica grupo Ágil no WhatsApp via bot
      const segLabel = SEGMENTOS.find(s => s.value === form.segmento)?.label || form.segmento;
      fetch('https://agil-instagram.fly.dev/api/nova-solicitacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'agil-lembretes-2026',
          parceiro_nome: parceiro.nome_completo,
          cliente_nome: form.cliente_nome.trim(),
          segmento: segLabel,
          cliente_telefone: form.cliente_telefone.trim(),
          observacoes: form.observacoes.trim(),
        }),
      }).catch(() => {});

      // Notifica ADM via WhatsApp
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

      // Notifica ADM via email
      supabase.functions.invoke('send-email', {
        body: {
          to: ['contato@segurosagil.com.br'],
          subject: `🔔 Nova solicitação — ${form.cliente_nome.trim()} (${segLabel})`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;">
              <div style="background:#003580;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <h1 style="color:white;margin:0;font-size:22px;">🔔 Nova Solicitação de Orçamento</h1>
              </div>
              <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Parceiro</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#1e293b;">${parceiro.nome_completo}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Cliente</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#1e293b;">${form.cliente_nome.trim()}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Telefone</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#1e293b;">${form.cliente_telefone.trim()}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#1e293b;">${form.cliente_email.trim() || '—'}</td></tr>
                  <tr><td style="padding:10px 0;color:#64748b;font-size:14px;">Segmento</td><td style="padding:10px 0;font-weight:bold;color:#003580;font-size:16px;">${segLabel}</td></tr>
                </table>
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-top:16px;">
                  <p style="margin:0;color:#1e40af;font-size:14px;">Acesse o portal para responder com o orçamento: <a href="https://www.agilseguros.app/admin/parceiros" style="color:#003580;font-weight:bold;">agilseguros.app/admin/parceiros</a></p>
                </div>
              </div>
              <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">Ágil Seguros · SUSEP 252166308</p>
            </div>`,
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
  const agora = new Date();
  const comissoesMes = comissoes.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  });
  const comissaoPendente = comissoesMes.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valor_comissao || 0), 0);
  const comissaoRecebida = comissoesMes.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valor_comissao || 0), 0);

  const metrics = [
    { label: 'Em andamento', value: emAndamento.length, icon: Clock, color: 'text-blue-600' },
    { label: 'Contratos fechados', value: concluidos.length, icon: CheckCircle2, color: 'text-[#003580]' },
    { label: 'A receber (mês)', value: `R$ ${comissaoPendente.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-[#003580]' },
    { label: 'Recebido (mês)', value: `R$ ${comissaoRecebida.toFixed(2).replace('.', ',')}`, icon: TrendingUp, color: 'text-[#003580]' },
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
            <p className="text-xs text-gray-500 mt-0.5">{o.status === 'ASSINATURA' ? assinaturaDesc(o.segmento) : cfg.desc}</p>
            {o.valor_mensalidade && (
              <p className="text-xs text-gray-500 mt-1">Mensalidade: <span className="font-semibold text-gray-700">R$ {Number(o.valor_mensalidade).toFixed(2).replace('.', ',')}</span></p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-xs ${cfg.color}`}>{o.status === 'ASSINATURA' ? assinaturaLabel(o.segmento) : cfg.label}</Badge>
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

  const Paginacao = ({ total, pagina, setPagina }) => {
    const totalPags = Math.ceil(total / POR_PAGINA);
    if (totalPags <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 pt-2">
        <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
          className="px-3 py-1 rounded-lg text-sm bg-white/10 text-white/70 border border-white/20 disabled:opacity-30 hover:bg-white/20">
          ← Anterior
        </button>
        <span className="text-sm text-white/60">{pagina} / {totalPags}</span>
        <button disabled={pagina === totalPags} onClick={() => setPagina(p => p + 1)}
          className="px-3 py-1 rounded-lg text-sm bg-white/10 text-white/70 border border-white/20 disabled:opacity-30 hover:bg-white/20">
          Próxima →
        </button>
      </div>
    );
  };

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
                       Solicitar
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
                   Solicitar orçamento
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
                  orcamentos.slice((pgOrc - 1) * POR_PAGINA, pgOrc * POR_PAGINA).map(o => renderOrcamentoCard(o))
                )}
              </div>
              <Paginacao total={orcamentos.length} pagina={pgOrc} setPagina={setPgOrc} />
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
                  concluidos.slice((pgContr - 1) * POR_PAGINA, pgContr * POR_PAGINA).map(o => renderOrcamentoCard(o))
                )}
              </div>
              <Paginacao total={concluidos.length} pagina={pgContr} setPagina={setPgContr} />
            </TabsContent>

            {/* ── Comissão ── */}
            <TabsContent value="comissao" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">A receber (este mês)</p>
                    <p className="text-2xl font-bold text-[#003580]">R$ {comissaoPendente.toFixed(2).replace('.', ',')}</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500">Total recebido (este mês)</p>
                    <p className="text-2xl font-bold text-[#003580]">R$ {comissaoRecebida.toFixed(2).replace('.', ',')}</p>
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
                  comissoes.slice((pgCom - 1) * POR_PAGINA, pgCom * POR_PAGINA).map(c => (
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
                            <p className="text-lg font-bold text-[#003580]">R$ {Number(c.valor_comissao || 0).toFixed(2).replace('.', ',')}</p>
                            <Badge className={c.status === 'PAGO' ? 'bg-blue-100 text-[#003580]' : 'bg-blue-100 text-blue-800'}>
                              {c.status === 'PAGO' ? 'Pago' : 'Pendente'}
                            </Badge>
                            {c.data_pagamento && <p className="text-xs text-gray-400 mt-1">{fmtData(c.data_pagamento)}</p>}
                          </div>
                        </div>
                        {c.comprovante_path && (
                          <a href={c.comprovante_path} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-[#003580] hover:underline">
                            <ArrowUpRight className="h-3 w-3" /> Ver comprovante
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
              <Paginacao total={comissoes.length} pagina={pgCom} setPagina={setPgCom} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </DashboardLayout>

      {/* ── Modal Detalhe do Orçamento ── */}
      <AnimatePresence>
        {detalhe && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 flex items-start justify-between rounded-t-2xl shrink-0 bg-white">
                <div>
                  <p className="text-gray-900 font-bold text-base">{detalhe.cliente_nome}</p>
                  <p className="text-gray-500 text-xs">{SEGMENTO_LABEL[detalhe.segmento] || detalhe.segmento}</p>
                  <Badge className={`mt-1 text-xs ${STATUS_CONFIG[detalhe.status]?.color}`}>{detalhe.status === 'ASSINATURA' ? assinaturaLabel(detalhe.segmento) : STATUS_CONFIG[detalhe.status]?.label}</Badge>
                </div>
                <button onClick={() => setDetalhe(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
                {/* Status desc */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  {detalhe.status === 'ASSINATURA' ? assinaturaDesc(detalhe.segmento) : STATUS_CONFIG[detalhe.status]?.desc}
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
                      { label: assinaturaLabel(detalhe.segmento), date: detalhe.data_assinatura },
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
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">
                            Base R$ {Number(detalheComissao.valor_base).toFixed(2).replace('.', ',')} · {detalheComissao.comissao_percentual}% · 6% imposto
                          </p>
                          <p className="text-2xl font-bold text-[#003580] mt-0.5">
                            R$ {Number(detalheComissao.valor_comissao || 0).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <Badge className={detalheComissao.status === 'PAGO' ? 'bg-blue-100 text-[#003580]' : 'bg-blue-100 text-blue-800'}>
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden overscroll-contain">
              <div className="bg-white px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
                <div>
                  <h2 className="text-gray-900 font-bold text-lg">Solicitar Orçamento</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Preencha os dados do cliente e do seguro</p>
                </div>
                <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-5 overflow-y-auto">
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
                    {camposDoSegmento.map((campo) => {
                      if (campo.hidden) return null;
                      const { key, label, placeholder, type, options, optional, header } = campo;
                      const vazio = !optional && !String(form.extras[key] || '').trim();
                      return (
                        <React.Fragment key={key}>
                          {header && (
                            <p className="text-xs font-semibold text-[#003580] uppercase tracking-wide pt-1">{header}</p>
                          )}
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700">
                              {label} {!optional && <span className="text-red-500">*</span>}
                              {key === 'placa' && buscandoPlaca && <span className="text-[#003580] ml-1 font-normal text-xs">buscando...</span>}
                            </Label>
                            {type === 'select' ? (
                              <select value={form.extras[key] || ''}
                                onChange={e => setExtra(key, e.target.value)}
                                className={`w-full rounded-lg border bg-[#f0f7ff] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] ${vazio ? 'border-red-300' : 'border-gray-200'}`}>
                                <option value="">Selecione...</option>
                                {(options || []).map(opt => {
                                  const val = typeof opt === 'object' ? opt.value : opt;
                                  const lbl = typeof opt === 'object' ? opt.label : opt;
                                  return <option key={val} value={val}>{lbl}</option>;
                                })}
                              </select>
                            ) : (
                              <input value={form.extras[key] || ''} onChange={e => setExtra(key, campo.money ? maskBRL(e.target.value) : e.target.value)}
                                type={['cep','plate'].includes(type) ? 'text' : (type || 'text')}
                                maxLength={type === 'cep' ? 9 : type === 'plate' ? 7 : undefined}
                                placeholder={placeholder}
                                className={`w-full rounded-lg border bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] ${vazio ? 'border-red-300' : 'border-gray-200'}`} />
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
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
                      const atingiuTotal = distribuiVidas >= totalVidas;
                      return (
                        <div key={id} className="flex items-center justify-between gap-3">
                          <Label className="text-sm text-gray-600 flex-1">{label}</Label>
                          <div className="flex items-center gap-2">
                            <button type="button"
                              onClick={() => setExtra(key, String(Math.max(0, val - 1)))}
                              disabled={val === 0}
                              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-100 active:enabled:scale-95">
                              <Minus className="h-3 w-3 text-gray-600" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-gray-800">{val}</span>
                            <button type="button"
                              onClick={() => { if (!atingiuTotal) setExtra(key, String(val + 1)); }}
                              disabled={atingiuTotal}
                              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-100 active:enabled:scale-95">
                              
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cenário Atual do Cliente — só para SAUDE e ODONTOLOGICO com vidas preenchidas */}
                {showAgeBrackets && (() => {
                  const cenAtivosS = cenariosSolic.filter(c => c.tem_plano);
                  const temMultiplosS = cenAtivosS.length > 1;
                  const showDistS = temMultiplosS && showAgeBrackets;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cenário atual do cliente</p>
                        <button type="button" onClick={addCenarioSolic}
                          className="text-xs text-[#003580] hover:underline flex items-center gap-1">
                           Adicionar plano
                        </button>
                      </div>
                      {cenariosSolic.map((c, ci) => (
                        <div key={ci} className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Label className="text-sm text-gray-600">Possui plano atual?</Label>
                              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                                <button type="button" onClick={() => updCenarioSolic(ci, 'tem_plano', false)}
                                  className={`px-3 py-1.5 transition-colors ${!c.tem_plano ? 'bg-[#003580] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Não</button>
                                <button type="button" onClick={() => updCenarioSolic(ci, 'tem_plano', true)}
                                  className={`px-3 py-1.5 transition-colors ${c.tem_plano ? 'bg-[#003580] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Sim</button>
                              </div>
                            </div>
                            {cenariosSolic.length > 1 && (
                              <button type="button" onClick={() => removeCenarioSolic(ci)} className="text-gray-400 hover:text-red-500">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {c.tem_plano && (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-gray-700">Operadora atual</Label>
                                  <select value={c.operadora} onChange={e => updCenarioSolic(ci, 'operadora', e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#003580]">
                                    <option value="">Selecionar...</option>
                                    {SEGURADORAS.filter(s => !form.segmento || s.categorias.includes(form.segmento)).map(s => (
                                      <option key={s.nome} value={s.nome}>{s.nome}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-gray-700">Valor mensal (R$)</Label>
                                  <input value={c.valor} onChange={e => updCenarioSolic(ci, 'valor', maskBRL(e.target.value))}
                                    placeholder="Ex: 520,00"
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]" />
                                </div>
                              </div>
                              {showDistS && (
                                <div className="pt-2 border-t border-gray-200 space-y-2">
                                  <p className="text-xs font-semibold text-gray-600">Vidas por faixa etária</p>
                                  {AGE_BRACKETS.filter(({ id }) => parseInt(form.extras[faixaKey(id)] || '0') > 0).map(({ id, label }) => {
                                    const meta = parseInt(form.extras[faixaKey(id)] || '0');
                                    const val = parseInt((c.vidas || {})[id] || 0);
                                    const totalFaixa = cenAtivosS.reduce((s, c2) => s + parseInt((c2.vidas || {})[id] || 0), 0);
                                    const atingiuLimite = totalFaixa >= meta;
                                    return (
                                      <div key={id} className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600 flex-1">{label}</span>
                                        <span className="text-xs text-gray-400 shrink-0">{totalFaixa}/{meta}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button type="button" onClick={() => updCenarioSolicVidas(ci, id, Math.max(0, val - 1))} disabled={val === 0}
                                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-100 active:enabled:scale-95">
                                            <Minus className="h-3 w-3 text-gray-600" />
                                          </button>
                                          <span className="w-6 text-center text-sm font-semibold text-gray-800">{val}</span>
                                          <button type="button" onClick={() => { if (!atingiuLimite) updCenarioSolicVidas(ci, id, val + 1); }} disabled={atingiuLimite}
                                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-100 active:enabled:scale-95">
                                            
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div className="flex justify-between pt-1.5 border-t border-gray-200">
                                    <span className="text-xs font-semibold text-gray-600">Total deste cenário</span>
                                    <span className="text-xs font-bold text-gray-800">
                                      {AGE_BRACKETS.reduce((s, { id }) => s + parseInt((c.vidas || {})[id] || 0), 0)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {showDistS && (() => {
                        const porFaixa = AGE_BRACKETS.filter(({ id }) => parseInt(form.extras[faixaKey(id)] || '0') > 0).map(({ id, label }) => {
                          const meta = parseInt(form.extras[faixaKey(id)] || '0');
                          const dist = cenAtivosS.reduce((s, c) => s + parseInt((c.vidas || {})[id] || 0), 0);
                          return { id, label, vidas: meta, distribuido: dist, faltam: meta - dist };
                        });
                        const totalMeta = porFaixa.reduce((s, f) => s + f.vidas, 0);
                        const totalDist = porFaixa.reduce((s, f) => s + f.distribuido, 0);
                        const totalFaltam = totalMeta - totalDist;
                        const completo = totalFaltam === 0 && totalMeta > 0;
                        const excede = totalFaltam < 0;
                        return (
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${completo ? 'bg-green-50 border-green-200' : excede ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                              <span className={`text-sm font-semibold ${completo ? 'text-green-700' : excede ? 'text-red-600' : 'text-amber-700'}`}>
                                {completo ? '✓ Todas as vidas distribuídas' : excede ? `Excede em ${Math.abs(totalFaltam)} vidas` : `${totalFaltam} vidas para distribuir`}
                              </span>
                              <span className="text-xs text-gray-400">{totalDist}/{totalMeta}</span>
                            </div>
                            <table className="w-full text-xs">
                              <thead><tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-2 text-gray-500 font-medium">Faixa Etária</th>
                                <th className="text-right px-4 py-2 text-gray-500 font-medium">Meta</th>
                                <th className="text-right px-4 py-2 text-gray-500 font-medium">Distribuído</th>
                                <th className="text-right px-4 py-2 text-gray-500 font-medium">Faltam</th>
                              </tr></thead>
                              <tbody>
                                {porFaixa.map((f, i) => (
                                  <tr key={i} className={`border-b border-gray-100 ${f.faltam === 0 ? 'bg-green-50/40' : f.faltam < 0 ? 'bg-red-50/40' : ''}`}>
                                    <td className="px-4 py-1.5 text-gray-700">{f.label}</td>
                                    <td className="px-4 py-1.5 text-right text-gray-400">{f.vidas}</td>
                                    <td className="px-4 py-1.5 text-right font-semibold text-gray-800">{f.distribuido}</td>
                                    <td className={`px-4 py-1.5 text-right font-semibold ${f.faltam === 0 ? 'text-green-600' : f.faltam < 0 ? 'text-red-500' : 'text-amber-600'}`}>{f.faltam === 0 ? '✓' : f.faltam}</td>
                                  </tr>
                                ))}
                                <tr className="bg-gray-50">
                                  <td className="px-4 py-2 font-bold text-gray-700">Total</td>
                                  <td className="px-4 py-2 text-right font-semibold text-gray-400">{totalMeta}</td>
                                  <td className="px-4 py-2 text-right font-black text-gray-800">{totalDist}</td>
                                  <td className={`px-4 py-2 text-right font-black ${completo ? 'text-green-600' : 'text-amber-600'}`}>{completo ? '✓' : totalFaltam}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

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
                    disabled={enviando || !form.segmento || !form.cliente_nome.trim() || !validarTelefone(form.cliente_telefone) || !validarEmail(form.cliente_email) || !validarCpfCnpj(form.cliente_cpf) || !form.cliente_data_nascimento || camposDoSegmento.some(c => !c.optional && !c.hidden && !String(form.extras[c.key] || '').trim()) || (showAgeBrackets && remainingLives !== 0)}
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
