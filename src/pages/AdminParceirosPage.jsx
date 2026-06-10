import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  HeartHandshake, FileText, Clock, CheckCircle2, DollarSign,
  X, Send, Loader2, ChevronRight, Copy, Check,
  Upload, Eye, Plus, Minus, Trash2, ArrowRight, Star,
  Link as LinkIcon, ChevronDown, Shield, ArrowUp, ArrowDown,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { SEGURADORAS } from '@/data/seguradoras';

const STATUS_CONFIG = {
  SOLICITACAO: { label: 'Solicitação',  color: 'bg-gray-100 text-gray-700',    border: 'border-l-gray-400' },
  ORCAMENTO:   { label: 'Orçamento',    color: 'bg-blue-100 text-blue-700',    border: 'border-l-blue-400' },
  DOCUMENTOS:  { label: 'Documentos',   color: 'bg-yellow-100 text-yellow-700', border: 'border-l-yellow-400' },
  ASSINATURA:  { label: 'Assinatura',   color: 'bg-purple-100 text-purple-700', border: 'border-l-purple-400' },
  CONCLUIDO:   { label: 'Concluído',    color: 'bg-green-100 text-green-700',   border: 'border-l-green-400' },
  COMISSAO:    { label: 'Comissão',     color: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-400' },
};

const SEGMENTO_LABEL = {
  AUTO:         'Seguro Auto',
  SAUDE:        'Plano de Saúde',
  RESIDENCIAL:  'Seguro Residencial',
  EMPRESARIAL:  'Seguro Empresarial',
  ODONTOLOGICO: 'Plano Odontológico',
  VIAGEM:       'Seguro Viagem',
  PET_SAUDE:    'Plano de Saúde Pet',
  PET_SEGURO:   'Seguro Pet',
  VIDA:         'Seguro de Vida',
  FROTA:        'Seguro Frota',
  CARGAS:       'Seguro de Cargas',
  EQUIPAMENTOS: 'Equipamentos Portáteis',
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto',
  AUTO_FROTA: 'Auto / Frota',
};

const DOCS_POR_SEGMENTO = {
  AUTO:         ['CRLV', 'CNH', 'CPF'],
  SAUDE:        ['RG', 'CPF', 'Comprovante de residência', 'Carteirinha anterior (se houver)'],
  RESIDENCIAL:  ['RG', 'CPF', 'Comprovante de residência', 'Escritura ou contrato do imóvel'],
  EMPRESARIAL:  ['CNPJ', 'Contrato Social', 'Comprovante de endereço da empresa'],
  ODONTOLOGICO: ['RG', 'CPF', 'Carteirinha anterior (se houver)'],
  VIAGEM:       ['RG ou Passaporte', 'CPF'],
  PET_SAUDE:    ['CPF do titular', 'Cartão de vacinação do pet'],
  PET_SEGURO:   ['CPF do titular', 'Cartão de vacinação do pet'],
  VIDA:         ['RG', 'CPF', 'Comprovante de renda'],
  FROTA:        ['CNPJ', 'CRLV de todos os veículos', 'CNH dos motoristas'],
  CARGAS:       ['CPF ou CNPJ', 'Nota fiscal da carga'],
  EQUIPAMENTOS: ['CPF ou CNPJ', 'Nota fiscal do equipamento'],
  SAUDE_VIDA_ODONTO: ['RG', 'CPF', 'Comprovante de residência', 'Carteirinha anterior (se houver)'],
  AUTO_FROTA: ['CRLV', 'CNH', 'CPF'],
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

const CAMPOS_SEGMENTO = {
  SAUDE: [
    { key: 'tipo', label: 'Tipo de plano', type: 'select', options: ['Familiar', 'Empresarial', 'Individual', 'MEI', 'Adesão'] },
    { key: 'vidas', label: 'Nº de vidas', type: 'number', placeholder: 'Ex: 3' },
  ],
  SAUDE_VIDA_ODONTO: [
    { key: 'tipo', label: 'Tipo de plano', type: 'select', options: ['Familiar', 'Empresarial', 'Individual', 'MEI'] },
    { key: 'vidas', label: 'Nº de vidas', type: 'number', placeholder: 'Ex: 3' },
  ],
  ODONTOLOGICO: [
    { key: 'tipo', label: 'Tipo de plano', type: 'select', options: ['Individual', 'Familiar', 'Empresarial'] },
    { key: 'vidas', label: 'Nº de vidas', type: 'number', placeholder: 'Ex: 2' },
  ],
  AUTO: [
    { key: 'placa', label: 'Placa do veículo', type: 'text', placeholder: 'Ex: ABC1D23' },
    { key: 'modelo_veiculo', label: 'Modelo do veículo', type: 'text', placeholder: 'Ex: Honda Civic 2023' },
    { key: 'ano_fabricacao', label: 'Ano de fabricação', type: 'number', placeholder: 'Ex: 2023' },
  ],
  AUTO_FROTA: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Transportadora ABC' },
    { key: 'qtd_veiculos', label: 'Número de veículos', type: 'number', placeholder: 'Ex: 10' },
    { key: 'tipo_veiculos', label: 'Tipo de veículos', type: 'text', placeholder: 'Ex: Caminhões, Vans, Carros' },
  ],
  RESIDENCIAL: [
    { key: 'tipo_imovel', label: 'Tipo de imóvel', type: 'select', options: ['Casa', 'Apartamento', 'Sobrado'] },
    { key: 'endereco_imovel', label: 'Endereço do imóvel', type: 'text', placeholder: 'Rua, número, bairro, cidade' },
    { key: 'valor_imovel', label: 'Valor aproximado (R$)', type: 'text', placeholder: 'Ex: 350.000' },
  ],
  EMPRESARIAL: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Empresa ABC Ltda' },
    { key: 'cnpj_empresa', label: 'CNPJ da empresa', type: 'text', placeholder: 'Ex: 00.000.000/0001-00' },
    { key: 'qtd_vidas', label: 'Número de vidas', type: 'number', placeholder: 'Ex: 10' },
    { key: 'segmento_empresa', label: 'Segmento da empresa', type: 'text', placeholder: 'Ex: Tecnologia, Varejo, Saúde' },
  ],
  VIDA: [
    { key: 'cobertura_desejada', label: 'Valor de cobertura desejado (R$)', type: 'text', placeholder: 'Ex: 100.000' },
  ],
  VIAGEM: [
    { key: 'destino', label: 'Destino', type: 'text', placeholder: 'Ex: Europa, EUA, Nordeste' },
    { key: 'data_inicio', label: 'Data de início', type: 'date' },
    { key: 'data_fim', label: 'Data de fim', type: 'date' },
    { key: 'qtd_viajantes', label: 'Quantidade de viajantes', type: 'number', placeholder: 'Ex: 2' },
  ],
  PET_SAUDE: [
    { key: 'nome_pet', label: 'Nome do pet', type: 'text', placeholder: 'Ex: Rex' },
    { key: 'raca_pet', label: 'Raça do pet', type: 'text', placeholder: 'Ex: Golden Retriever' },
    { key: 'idade_pet', label: 'Idade do pet', type: 'text', placeholder: 'Ex: 3 anos' },
  ],
  PET_SEGURO: [
    { key: 'nome_pet', label: 'Nome do pet', type: 'text', placeholder: 'Ex: Rex' },
    { key: 'raca_pet', label: 'Raça do pet', type: 'text', placeholder: 'Ex: Golden Retriever' },
    { key: 'idade_pet', label: 'Idade do pet', type: 'text', placeholder: 'Ex: 3 anos' },
  ],
  FROTA: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Transportadora ABC' },
    { key: 'qtd_veiculos', label: 'Número de veículos', type: 'number', placeholder: 'Ex: 5' },
    { key: 'tipo_veiculos', label: 'Tipo de veículos', type: 'text', placeholder: 'Ex: Caminhões, Vans, Carros' },
  ],
  CARGAS: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Transportadora ABC' },
    { key: 'tipo_mercadoria', label: 'Tipo de carga', type: 'text', placeholder: 'Ex: Eletrônicos, Alimentos' },
    { key: 'trajeto', label: 'Trajeto (origem → destino)', type: 'text', placeholder: 'Ex: São Paulo → Rio de Janeiro' },
    { key: 'valor_carga', label: 'Valor da carga (R$)', type: 'text', placeholder: 'Ex: 50.000' },
  ],
  EQUIPAMENTOS: [
    { key: 'tipo_equip', label: 'Tipo de equipamento', type: 'text', placeholder: 'Ex: Notebook, Câmera, Drone' },
    { key: 'descricao_equip', label: 'Descrição do equipamento', type: 'text', placeholder: 'Ex: MacBook Pro M3 14"' },
    { key: 'valor_equip', label: 'Valor do equipamento (R$)', type: 'text', placeholder: 'Ex: 8.000' },
  ],
};

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const planoVazio = () => ({ nome: '', valor: '' });
const propVazio = () => ({
  operadora: '', logo_url: '',
  planos: [planoVazio()],
  abrangencia: '',
  acomodacao: '',
  coparticipacao: { tem: false, percentual: '', limitada: false },
  carencia: false,
  rede_url: '',
  destaque: false,
  combinar_com: [],
});
const cenarioVazio = () => ({ tem_plano: false, operadora: '', valor: '', vidas: '' });

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generateSlug = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const ToggleBtn = ({ value, onChange, labelFalse = 'Não', labelTrue = 'Sim', color = '#003580' }) => (
  <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
    <button type="button" onClick={() => onChange(false)}
      className={`px-3 py-1.5 transition-colors ${!value ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      style={!value ? { background: color } : {}}>
      {labelFalse}
    </button>
    <button type="button" onClick={() => onChange(true)}
      className={`px-3 py-1.5 transition-colors ${value ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      style={value ? { background: color } : {}}>
      {labelTrue}
    </button>
  </div>
);

const AdminParceirosPage = () => {
  const { toast } = useToast();
  const compInputRef = useRef(null);

  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODOS');
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [uploadingComp, setUploadingComp] = useState(false);

  // Builder
  const [cenarios, setCenarios] = useState([cenarioVazio()]);
  const [propostas, setPropostas] = useState([propVazio()]);
  const [expandedPropIdx, setExpandedPropIdx] = useState(0);

  // Docs form
  const [formR, setFormR] = useState({ docsBase: [], docExtra: '', docsExtras: [] });
  // Comissão
  const [formC, setFormC] = useState({ valor_base: '', comissao_percentual: '' });
  // ORCAMENTO edit modes
  const [editandoProposta, setEditandoProposta] = useState(false);
  const [novaPropostaMode, setNovaPropostaMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Criar orçamento
  const [parceiros, setParceiros] = useState([]);
  const [criarModal, setCriarModal] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novoForm, setNovoForm] = useState({ parceiro_id: '', cliente_nome: '', cliente_telefone: '', cliente_email: '', segmento: '', observacoes: '' });
  const [segData, setSegData] = useState({});

  useEffect(() => {
    loadData();
    supabase.from('parceiros').select('id, nome_completo').order('nome_completo').then(({ data }) => setParceiros(data || []));
  }, []);

  const loadData = async (expandId = null) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orcamentos')
        .select('*, parceiros(nome_completo, modalidade, comissao_percentual, telefone)')
        .order('created_at', { ascending: false });
      setOrcamentos(data || []);
      if (expandId && data) {
        const o = data.find(x => x.id === expandId);
        if (o) {
          setExpandedId(o.id);
          setSelected(o);
          setEditandoProposta(false);
          setNovaPropostaMode(false);
          setConfirmDelete(false);
          setCenarios([cenarioVazio()]);
          setPropostas([propVazio()]);
          setExpandedPropIdx(0);
          setFormR({ docsBase: DOCS_POR_SEGMENTO[o.segmento] || [], docExtra: '', docsExtras: [] });
          setFormC({ valor_base: '', comissao_percentual: '50' });
          setDocs([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (o) => {
    if (expandedId === o.id) {
      setExpandedId(null);
      setSelected(null);
      setDocs([]);
      setConfirmDelete(false);
      return;
    }
    setExpandedId(o.id);
    setSelected(o);
    setEditandoProposta(false);
    setNovaPropostaMode(false);
    setConfirmDelete(false);
    setFormR({
      docsBase: o.lista_documentos || DOCS_POR_SEGMENTO[o.segmento] || [],
      docExtra: '',
      docsExtras: o.docs_extras || [],
    });
    setCenarios(
      o.cenarios_atuais?.length > 0
        ? o.cenarios_atuais.map(c => ({ ...cenarioVazio(), ...c }))
        : [cenarioVazio()]
    );
    setPropostas(
      o.propostas?.length > 0
        ? o.propostas.map(p => ({ ...propVazio(), ...p, planos: p.planos?.length > 0 ? p.planos : [planoVazio()] }))
        : [propVazio()]
    );
    setExpandedPropIdx(0);
    setFormC({
      valor_base: o.valor_mensalidade ? String(o.valor_mensalidade) : '',
      comissao_percentual: o.parceiros?.comissao_percentual ? String(o.parceiros.comissao_percentual) : '50',
    });
    const { data: docData } = await supabase
      .from('orcamento_documentos')
      .select('*')
      .eq('orcamento_id', o.id)
      .order('enviado_em', { ascending: true });
    setDocs(docData || []);
  };

  const refreshSelected = async (id) => {
    const [orcRes, docsRes] = await Promise.allSettled([
      supabase.from('orcamentos').select('*, parceiros(nome_completo, modalidade, comissao_percentual, telefone)').eq('id', id).maybeSingle(),
      supabase.from('orcamento_documentos').select('*').eq('orcamento_id', id).order('enviado_em', { ascending: true }),
    ]);
    if (orcRes.status === 'fulfilled' && orcRes.value.data) {
      const data = orcRes.value.data;
      setSelected(data);
      setOrcamentos(prev => prev.map(o => o.id === id ? data : o));
    }
    if (docsRes.status === 'fulfilled') setDocs(docsRes.value.data || []);
  };

  // ── Cenários ──
  const updCenario = (i, field, val) => setCenarios(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  const addCenario = () => setCenarios(cs => [...cs, cenarioVazio()]);
  const removeCenario = (i) => setCenarios(cs => cs.filter((_, idx) => idx !== i));

  // ── Propostas ──
  const addProposta = () => { setPropostas(ps => [...ps, propVazio()]); setExpandedPropIdx(propostas.length); };
  const removeProposta = (i) => {
    setPropostas(ps => ps.length === 1 ? [propVazio()] : ps.filter((_, idx) => idx !== i));
    setExpandedPropIdx(0);
  };
  const updProposta = (i, field, val) => setPropostas(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  const updCopart = (i, field, val) => setPropostas(ps => ps.map((p, idx) => idx === i ? { ...p, coparticipacao: { ...p.coparticipacao, [field]: val } } : p));
  const onSelectSeg = (i, nome) => {
    const seg = SEGURADORAS.find(s => s.nome === nome);
    setPropostas(ps => ps.map((p, idx) => idx === i ? { ...p, operadora: nome, logo_url: seg?.logo || '' } : p));
  };
  const toggleDestaque = (i) => setPropostas(ps => ps.map((p, idx) => ({ ...p, destaque: idx === i })));
  const moveProposta = (i, dir) => {
    setPropostas(ps => {
      const a = [...ps];
      [a[i], a[i + dir]] = [a[i + dir], a[i]];
      return a;
    });
    setExpandedPropIdx(i + dir);
  };

  const toggleCombinarCom = (pi, cenario) => {
    setPropostas(ps => ps.map((p, idx) => {
      if (idx !== pi) return p;
      const exists = (p.combinar_com || []).some(c => c.operadora === cenario.operadora);
      const combinar_com = exists
        ? (p.combinar_com || []).filter(c => c.operadora !== cenario.operadora)
        : [...(p.combinar_com || []), { operadora: cenario.operadora, valor: cenario.valor }];
      return { ...p, combinar_com };
    }));
  };

  // ── Planos dentro de proposta ──
  const addPlano = (pi) => setPropostas(ps => ps.map((p, idx) => idx === pi ? { ...p, planos: [...p.planos, planoVazio()] } : p));
  const removePlano = (pi, pli) => setPropostas(ps => ps.map((p, idx) => idx === pi ? { ...p, planos: p.planos.filter((_, j) => j !== pli) } : p));
  const updPlano = (pi, pli, field, val) => setPropostas(ps => ps.map((p, idx) => idx === pi ? { ...p, planos: p.planos.map((pl, j) => j === pli ? { ...pl, [field]: val } : pl) } : p));

  // ── Docs ──
  const toggleDocBase = (doc) => setFormR(f => ({
    ...f, docsBase: f.docsBase.includes(doc) ? f.docsBase.filter(d => d !== doc) : [...f.docsBase, doc],
  }));
  const addDocExtra = () => {
    if (!formR.docExtra.trim()) return;
    setFormR(f => ({ ...f, docsExtras: [...f.docsExtras, f.docExtra.trim()], docExtra: '' }));
  };
  const removeDocExtra = (i) => setFormR(f => ({ ...f, docsExtras: f.docsExtras.filter((_, idx) => idx !== i) }));

  // ── Enviar orçamento ──
  const handleResponder = async () => {
    const valid = propostas.filter(p => p.operadora && p.planos.some(pl => pl.valor));
    if (valid.length === 0) return toast({ variant: 'destructive', title: 'Informe ao menos uma proposta com operadora e valor.' });
    setEnviando(true);
    try {
      const slug = generateSlug();
      const dest = valid.find(p => p.destaque) || valid[0];
      const pl0 = dest.planos.find(pl => pl.valor) || dest.planos[0];
      const validComDestaque = valid.map(p => ({ ...p, destaque: p === dest }));
      const { error } = await supabase.from('orcamentos').update({
        status: 'ORCAMENTO',
        slug,
        valor_mensalidade: parseFloat(String(pl0.valor).replace(',', '.')),
        descricao_orcamento: `${dest.operadora}${pl0.nome ? ` — ${pl0.nome}` : ''}`,
        cenarios_atuais: cenarios.filter(c => c.tem_plano),
        propostas: validComDestaque,
        lista_documentos: formR.docsBase,
        docs_extras: formR.docsExtras,
        data_orcamento: new Date().toISOString(),
      }).eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Orçamento enviado!', description: 'Link gerado com sucesso.' });

      const parceiroTel = selected?.parceiros?.telefone;
      if (parceiroTel) {
        const segLabel = SEGMENTO_LABEL[selected.segmento] || selected.segmento;
        supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: parceiroTel,
            message: `📋 *Orçamento pronto!*\n\nOlá, ${selected.parceiros?.nome_completo?.split(' ')[0] || 'Parceiro'}! O orçamento para *${selected.cliente_nome}* (${segLabel}) está pronto.\n\n🔗 ${window.location.origin}/orcamento/${slug}`,
          },
        }).catch(() => {});
      }

      await loadData();
      await refreshSelected(expandedId);
      setNovaPropostaMode(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleEditarProposta = async () => {
    const valid = propostas.filter(p => p.operadora && p.planos.some(pl => pl.valor));
    if (valid.length === 0) return toast({ variant: 'destructive', title: 'Informe ao menos uma proposta com operadora e valor.' });
    setEnviando(true);
    try {
      const dest = valid.find(p => p.destaque) || valid[0];
      const pl0 = dest.planos.find(pl => pl.valor) || dest.planos[0];
      const validComDestaque = valid.map(p => ({ ...p, destaque: p === dest }));
      const { error } = await supabase.from('orcamentos').update({
        valor_mensalidade: parseFloat(String(pl0.valor).replace(',', '.')),
        descricao_orcamento: `${dest.operadora}${pl0.nome ? ` — ${pl0.nome}` : ''}`,
        cenarios_atuais: cenarios.filter(c => c.tem_plano),
        propostas: validComDestaque,
      }).eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Proposta atualizada!', description: 'O link continua o mesmo.' });
      setEditandoProposta(false);
      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleAvancar = async (novoStatus) => {
    setEnviando(true);
    try {
      const update = { status: novoStatus };
      if (novoStatus === 'DOCUMENTOS') update.data_documentos = new Date().toISOString();
      if (novoStatus === 'ASSINATURA') update.data_assinatura = new Date().toISOString();
      if (novoStatus === 'CONCLUIDO') update.data_conclusao = new Date().toISOString();
      const { error } = await supabase.from('orcamentos').update(update).eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Status atualizado!' });

      const parceiroTel = selected?.parceiros?.telefone;
      if (parceiroTel) {
        const nome = selected.parceiros?.nome_completo?.split(' ')[0] || 'Parceiro';
        const msgs = {
          ASSINATURA: `📄 *Processo avançou para assinatura!*\n\nOlá, ${nome}! Os documentos do cliente *${selected.cliente_nome}* foram recebidos. Quase lá! 🎯`,
          CONCLUIDO: `🎉 *Contrato fechado!*\n\nOlá, ${nome}! O contrato de *${selected.cliente_nome}* foi concluído. A comissão será registrada em breve. 💰`,
        };
        if (msgs[novoStatus]) supabase.functions.invoke('send-whatsapp', { body: { phone: parceiroTel, message: msgs[novoStatus] } }).catch(() => {});
      }

      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleComissao = async () => {
    if (!formC.valor_base || !formC.comissao_percentual) return toast({ variant: 'destructive', title: 'Preencha valor e percentual.' });
    setEnviando(true);
    try {
      const { data: existente } = await supabase.from('comissoes').select('id').eq('orcamento_id', expandedId).maybeSingle();
      const base = parseFloat(formC.valor_base.replace(',', '.'));
      const pct = parseFloat(formC.comissao_percentual);
      if (existente) {
        await supabase.from('comissoes').update({ valor_base: base, comissao_percentual: pct, status: 'PENDENTE' }).eq('id', existente.id);
      } else {
        await supabase.from('comissoes').insert({ orcamento_id: expandedId, parceiro_id: selected.parceiro_id, valor_base: base, comissao_percentual: pct, status: 'PENDENTE' });
      }
      await supabase.from('orcamentos').update({ status: 'COMISSAO' }).eq('id', expandedId);
      toast({ title: 'Comissão registrada!' });

      const parceiroTel = selected?.parceiros?.telefone;
      if (parceiroTel) {
        const comissao = base * (1 - 0.06) * (pct / 100);
        supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: parceiroTel,
            message: `🎉 *Comissão registrada*\n\nParabéns, ${selected.parceiros?.nome_completo?.split(' ')[0] || 'Parceiro'}! Contrato de *${selected.cliente_nome}* concluído.\n\n💰 Sua comissão: *R$ ${fmtBRL(comissao)}*`,
          },
        }).catch(() => {});
      }

      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleUploadComprovante = async (file) => {
    if (!file) return;
    setUploadingComp(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `comissoes/${expandedId}/comprovante.${ext}`;
      const { error: upErr } = await supabase.storage.from('orcamento-documentos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('orcamento-documentos').getPublicUrl(path);
      const { data: com } = await supabase.from('comissoes').select('id').eq('orcamento_id', expandedId).maybeSingle();
      if (com) await supabase.from('comissoes').update({ comprovante_path: publicUrl, status: 'PAGO', data_pagamento: new Date().toISOString() }).eq('id', com.id);
      toast({ title: 'Comprovante enviado e comissão marcada como paga!' });
      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro no upload.', description: err?.message });
    } finally {
      setUploadingComp(false);
    }
  };

  const handleExcluir = async () => {
    setEnviando(true);
    try {
      await supabase.from('comissoes').delete().eq('orcamento_id', expandedId);
      await supabase.from('orcamento_documentos').delete().eq('orcamento_id', expandedId);
      await supabase.from('orcamento_acessos').delete().eq('orcamento_id', expandedId);
      const { error } = await supabase.from('orcamentos').delete().eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Orçamento excluído.' });
      setExpandedId(null);
      setSelected(null);
      setConfirmDelete(false);
      await loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleCriarOrcamento = async () => {
    if (!novoForm.cliente_nome || !novoForm.cliente_telefone || !novoForm.cliente_email || !novoForm.segmento)
      return toast({ variant: 'destructive', title: 'Preencha nome do cliente, telefone, e-mail e segmento.' });
    setCriando(true);
    try {
      const campos = CAMPOS_SEGMENTO[novoForm.segmento] || [];
      const obsSegmento = campos.filter(f => segData[f.key]).map(f => `${f.label}: ${segData[f.key]}`).join('\n');
      let obsFaixas = '';
      if (['SAUDE', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'].includes(novoForm.segmento)) {
        const lines = AGE_BRACKETS
          .map(({ id, label }) => {
            const val = parseInt(segData[faixaKey(id)] || '0');
            return val > 0 ? `  ${label}: ${val}` : null;
          })
          .filter(Boolean);
        if (lines.length) obsFaixas = `Distribuição por faixa etária:\n${lines.join('\n')}`;
      }
      const obsCompleto = [obsSegmento, obsFaixas, novoForm.observacoes].filter(Boolean).join('\n\n');
      const perfilVidas = ['SAUDE', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'].includes(novoForm.segmento)
        ? AGE_BRACKETS
            .map(({ id, label }) => ({ id, label, vidas: parseInt(segData[faixaKey(id)] || '0') }))
            .filter(b => b.vidas > 0)
        : [];
      const { data, error } = await supabase.from('orcamentos').insert({
        parceiro_id: novoForm.parceiro_id || null,
        cliente_nome: novoForm.cliente_nome,
        cliente_telefone: novoForm.cliente_telefone,
        cliente_email: novoForm.cliente_email,
        segmento: novoForm.segmento,
        observacoes: obsCompleto || null,
        status: 'SOLICITACAO',
        perfil_vidas: perfilVidas.length > 0 ? perfilVidas : null,
      }).select('*, parceiros(nome_completo, modalidade, comissao_percentual, telefone)').single();
      if (error) throw error;
      toast({ title: 'Orçamento criado!', description: 'Agora preencha as propostas.' });
      setCriarModal(false);
      setFiltro('TODOS');
      setNovoForm({ parceiro_id: '', cliente_nome: '', cliente_telefone: '', cliente_email: '', segmento: '', observacoes: '' });
      setSegData({});
      await loadData(data.id);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao criar.', description: err?.message });
    } finally {
      setCriando(false);
    }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/orcamento/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({ title: 'Link copiado!' });
  };

  // ── Builder (SOLICITACAO + editar + nova proposta) ──
  const renderBuilder = (mode) => (
    <div className="space-y-5">
      {/* Cenários atuais */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Cenário atual do cliente</p>
          <Button size="sm" variant="outline" onClick={addCenario} className="h-7 text-xs border-dashed border-[#003580]/40 text-[#003580] hover:bg-[#f0f7ff]">
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        {cenarios.map((c, ci) => {
          const cenarioLogo = SEGURADORAS.find(s => s.nome === c.operadora)?.logo;
          return (
            <div key={ci} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  {cenarioLogo
                    ? <img src={cenarioLogo} alt={c.operadora} className="h-5 w-10 object-contain shrink-0" />
                    : <Shield className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {c.operadora || (cenarios.length > 1 ? `Cenário ${ci + 1}` : 'Cenário atual')}
                  </span>
                  {c.valor && <span className="text-xs text-gray-400 shrink-0">· R$ {c.valor}</span>}
                </div>
                {cenarios.length > 1 && (
                  <button type="button" onClick={() => removeCenario(ci)} className="text-gray-400 hover:text-red-500 shrink-0 ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {/* Corpo */}
              <div className="p-3 space-y-3 bg-white">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs text-gray-500 shrink-0">Possui plano ativo?</Label>
                  <ToggleBtn value={c.tem_plano} onChange={v => updCenario(ci, 'tem_plano', v)} />
                </div>
                {c.tem_plano && (
                  <div className={`grid gap-2 ${cenarios.filter(c2 => c2.tem_plano).length > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="space-y-1 col-span-1">
                      <Label className="text-xs text-gray-500">Operadora atual</Label>
                      <select value={c.operadora} onChange={e => updCenario(ci, 'operadora', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-sm focus:outline-none focus:border-[#003580]">
                        <option value="">Selecionar...</option>
                        {SEGURADORAS.map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Valor mensal (R$)</Label>
                      <Input value={c.valor} onChange={e => updCenario(ci, 'valor', e.target.value)}
                        placeholder="Ex: 520,00" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-sm" />
                    </div>
                    {cenarios.filter(c2 => c2.tem_plano).length > 1 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Nº de vidas</Label>
                        <Input value={c.vidas ?? ''} onChange={e => updCenario(ci, 'vidas', e.target.value)}
                          placeholder="Ex: 30" type="number" min="0"
                          className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Contador de vidas — só quando 2+ cenários com plano e há perfil_vidas */}
        {(() => {
          const totalVidas = selected?.perfil_vidas?.reduce((s, f) => s + (f.vidas || 0), 0) || 0;
          const cenArivos = cenarios.filter(c => c.tem_plano);
          if (cenArivos.length < 2 || totalVidas === 0) return null;
          const distribuidas = cenArivos.reduce((s, c) => s + (parseInt(c.vidas) || 0), 0);
          const faltam = totalVidas - distribuidas;
          const completo = faltam === 0;
          return (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm border ${completo ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div>
                <span className={`font-semibold ${completo ? 'text-green-700' : 'text-amber-700'}`}>
                  {distribuidas} de {totalVidas} vidas distribuídas
                </span>
                {!completo && faltam > 0 && (
                  <span className="text-amber-500 ml-2 text-xs">— faltam {faltam}</span>
                )}
                {!completo && faltam < 0 && (
                  <span className="text-red-500 ml-2 text-xs">— excede em {Math.abs(faltam)}</span>
                )}
              </div>
              {completo && <span className="text-green-600 font-bold text-base">✓</span>}
            </div>
          );
        })()}
      </div>

      {/* Propostas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Propostas ({propostas.length})</p>
          <Button size="sm" variant="outline" onClick={addProposta} className="h-7 text-xs border-dashed border-[#003580]/40 text-[#003580] hover:bg-[#f0f7ff]">
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>

        {propostas.map((p, pi) => (
          <div key={pi} className={`border rounded-xl overflow-hidden transition-all ${p.destaque ? 'border-[#003580] shadow-sm' : 'border-gray-200'}`}>
            {/* Header da proposta */}
            <div
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer select-none ${p.destaque ? 'bg-[#003580] text-white' : 'bg-gray-50 text-gray-700'}`}
              onClick={() => setExpandedPropIdx(expandedPropIdx === pi ? -1 : pi)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {p.logo_url
                  ? <img src={p.logo_url} alt={p.operadora} className="h-5 w-10 object-contain shrink-0" />
                  : <Shield className={`h-4 w-4 shrink-0 ${p.destaque ? 'text-white/60' : 'text-gray-400'}`} />
                }
                <span className="text-sm font-medium truncate">{p.operadora || `Proposta ${pi + 1}`}</span>
                {p.destaque && <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300 shrink-0" />}
                {propostas.length > 1 && (
                  <span className={`text-xs ${p.destaque ? 'text-blue-200' : 'text-gray-400'}`}>
                    {p.destaque ? '· Melhor opção' : `· ${pi + 1}ª opção`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {pi > 0 && (
                  <button type="button" onClick={() => moveProposta(pi, -1)}
                    className={`p-1 rounded hover:bg-black/10 ${p.destaque ? 'text-white/70' : 'text-gray-400'}`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                )}
                {pi < propostas.length - 1 && (
                  <button type="button" onClick={() => moveProposta(pi, 1)}
                    className={`p-1 rounded hover:bg-black/10 ${p.destaque ? 'text-white/70' : 'text-gray-400'}`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => removeProposta(pi)}
                  className={`p-1 rounded ${p.destaque ? 'text-white/70 hover:text-red-300' : 'text-gray-400 hover:text-red-500'}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedPropIdx === pi ? 'rotate-180' : ''} ${p.destaque ? 'text-white/70' : 'text-gray-400'}`}
                  onClick={() => setExpandedPropIdx(expandedPropIdx === pi ? -1 : pi)} />
              </div>
            </div>

            {/* Corpo da proposta */}
            {expandedPropIdx === pi && (
              <div className="p-3 space-y-3 bg-white border-t border-gray-100">
                {/* Operadora */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Seguradora / Operadora</Label>
                  <div className="flex gap-2 items-center">
                    <select value={p.operadora} onChange={e => onSelectSeg(pi, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-sm focus:outline-none focus:border-[#003580]">
                      <option value="">Selecionar...</option>
                      {SEGURADORAS.map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
                    </select>
                    {p.logo_url && (
                      <img src={p.logo_url} alt={p.operadora} className="h-8 w-16 object-contain rounded border border-gray-100 p-1 bg-white shrink-0" />
                    )}
                  </div>
                </div>

                {/* Planos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Planos *</Label>
                    <button type="button" onClick={() => addPlano(pi)} className="text-xs text-[#003580] hover:underline flex items-center gap-0.5">
                      <Plus className="h-3 w-3" /> plano
                    </button>
                  </div>
                  {p.planos.map((pl, pli) => (
                    <div key={pli} className="flex gap-2 items-center">
                      <Input value={pl.nome} onChange={e => updPlano(pi, pli, 'nome', e.target.value)}
                        placeholder="Nome do plano (opcional)"
                        className="flex-1 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                      <Input value={pl.valor} onChange={e => updPlano(pi, pli, 'valor', e.target.value)}
                        placeholder="R$ valor *"
                        className="w-24 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                      {p.planos.length > 1 && (
                        <button type="button" onClick={() => removePlano(pi, pli)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Abrangência + Acomodação */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Abrangência</Label>
                    <select value={p.abrangencia} onChange={e => updProposta(pi, 'abrangencia', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-xs focus:outline-none focus:border-[#003580]">
                      <option value="">Selecionar...</option>
                      {['Nacional', 'Regional', 'Estadual', 'Municipal'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Acomodação</Label>
                    <select value={p.acomodacao} onChange={e => updProposta(pi, 'acomodacao', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-xs focus:outline-none focus:border-[#003580]">
                      <option value="">Selecionar...</option>
                      {['Enfermaria', 'Apartamento'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Coparticipação */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label className="text-xs text-gray-500 shrink-0">Coparticipação</Label>
                    <ToggleBtn value={p.coparticipacao.tem} onChange={v => updCopart(pi, 'tem', v)} />
                  </div>
                  {p.coparticipacao.tem && (
                    <div className="flex items-center gap-3 pl-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-gray-500 shrink-0">%</Label>
                        <Input value={p.coparticipacao.percentual} onChange={e => updCopart(pi, 'percentual', e.target.value)}
                          placeholder="30" className="w-16 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 shrink-0">Limitada</Label>
                        <ToggleBtn value={p.coparticipacao.limitada} onChange={v => updCopart(pi, 'limitada', v)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Carência */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs text-gray-500 shrink-0">Carência</Label>
                  <ToggleBtn value={p.carencia} onChange={v => updProposta(pi, 'carencia', v)} />
                </div>

                {/* Rede credenciada */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Link de redes credenciadas (opcional)</Label>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <Input value={p.rede_url} onChange={e => updProposta(pi, 'rede_url', e.target.value)}
                      placeholder="https://..."
                      className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                  </div>
                </div>

                {/* Destaque */}
                {propostas.length > 1 && (
                  <button type="button" onClick={() => toggleDestaque(pi)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-colors ${p.destaque ? 'text-white border-[#003580]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#003580] hover:text-[#003580]'}`}
                    style={p.destaque ? { background: '#003580' } : {}}>
                    <Star className={`h-3.5 w-3.5 ${p.destaque ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                    {p.destaque ? 'Melhor opção (destaque ativo)' : 'Marcar como melhor opção'}
                  </button>
                )}

                {/* Combinar com cenário atual */}
                {cenarios.filter(c => c.tem_plano && c.operadora).length > 1 && (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <Label className="text-xs text-gray-500">Combinar com cenário atual (opcional)</Label>
                    <p className="text-xs text-gray-400">Selecione qual plano atual será mantido junto com esta proposta</p>
                    <div className="space-y-1.5">
                      {cenarios.filter(c => c.tem_plano && c.operadora).map((c, ci) => {
                        const isChecked = (p.combinar_com || []).some(x => x.operadora === c.operadora);
                        return (
                          <label key={ci} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border transition-colors ${isChecked ? 'bg-[#f0f7ff] border-[#003580]/30' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={isChecked}
                              onChange={() => toggleCombinarCom(pi, c)}
                              className="rounded border-gray-300 text-[#003580] focus:ring-[#003580]" />
                            <span className="text-xs text-gray-600 flex-1">
                              {c.operadora}
                              {c.valor && <span className="text-gray-400"> — R$ {c.valor}</span>}
                            </span>
                            <span className="text-xs text-gray-400">(mantida)</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>


      {/* Botões de ação */}
      {mode === 'responder' && (
        <Button onClick={handleResponder} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2 py-5" style={{ background: '#003580' }}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {enviando ? 'Enviando...' : 'Enviar orçamento e gerar link'}
        </Button>
      )}
      {mode === 'editar' && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditandoProposta(false)} disabled={enviando} className="flex-1">Cancelar</Button>
          <Button onClick={handleEditarProposta} disabled={enviando} className="flex-1 text-white gap-1.5" style={{ background: '#003580' }}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      )}
      {mode === 'nova' && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNovaPropostaMode(false)} disabled={enviando} className="flex-1">Cancelar</Button>
          <Button onClick={handleResponder} disabled={enviando} className="flex-1 text-white gap-1.5" style={{ background: '#003580' }}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar nova proposta
          </Button>
        </div>
      )}
    </div>
  );

  const renderActionPanel = () => {
    if (!selected) return null;
    const s = selected.status;

    if (s === 'SOLICITACAO') return renderBuilder('responder');

    if (s === 'ORCAMENTO') {
      if (editandoProposta) return renderBuilder('editar');
      if (novaPropostaMode) return renderBuilder('nova');
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1.5">Link público para o cliente</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 truncate flex-1 font-mono">{window.location.origin}/orcamento/{selected.slug}</span>
              <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => copyLink(selected.slug)}>
                {copiedSlug === selected.slug ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-blue-500 mt-1">Passe este link ao parceiro para repassar ao cliente</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-gray-700">Proposta enviada</p>
              <Button size="sm" variant="outline" onClick={() => setEditandoProposta(true)}
                className="shrink-0 text-xs border-[#003580]/30 text-[#003580] hover:bg-[#f0f7ff]">
                Editar
              </Button>
            </div>
            {selected.propostas?.length > 0 ? (
              <div className="space-y-2">
                {selected.propostas.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${p.destaque ? 'border-[#003580]/30 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.operadora} className="h-6 w-12 object-contain shrink-0" />
                      : <Shield className="h-4 w-4 text-gray-400 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{p.operadora || `Opção ${i + 1}`}</p>
                      <p className="text-xs text-gray-500">
                        {p.planos?.length > 0 ? p.planos.map(pl => `R$ ${fmtBRL(parseFloat(String(pl.valor).replace(',', '.')))}`).join(' / ') : `R$ ${fmtBRL(p.valor)}`}/mês
                      </p>
                    </div>
                    {p.destaque && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400 shrink-0" />}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p>Mensalidade: <span className="font-semibold text-gray-800">R$ {fmtBRL(selected.valor_mensalidade)}</span></p>
                {selected.descricao_orcamento && <p className="mt-1 text-xs">{selected.descricao_orcamento}</p>}
              </>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">Aguardando o cliente aceitar a proposta...</p>
          <Button variant="outline" size="sm" onClick={() => {
            setNovaPropostaMode(true);
            setEditandoProposta(false);
            setCenarios([cenarioVazio()]);
            setPropostas([propVazio()]);
            setExpandedPropIdx(0);
          }} className="w-full text-xs border-dashed border-gray-300 text-gray-500 hover:border-[#003580] hover:text-[#003580]">
            + Nova proposta (gera novo link)
          </Button>
        </div>
      );
    }

    if (s === 'DOCUMENTOS') return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Documentos enviados pelo cliente</p>
        {docs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum documento recebido ainda.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-700 truncate flex-1">{d.tipo_documento}</span>
                <span className="text-xs text-gray-400 mr-2">{d.nome_arquivo}</span>
                <a href={d.storage_path} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                  <Eye className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
        <Button onClick={() => handleAvancar('ASSINATURA')} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2 bg-purple-600 hover:bg-purple-700">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Avançar para Assinatura
        </Button>
      </div>
    );

    if (s === 'ASSINATURA') return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Aguardando assinatura da proposta</p>
        {docs.length > 0 && (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-700 truncate flex-1">{d.tipo_documento}</span>
                <a href={d.storage_path} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                  <Eye className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
        <Button onClick={() => handleAvancar('CONCLUIDO')} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2 bg-green-600 hover:bg-green-700">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Marcar como Assinado / Concluído
        </Button>
      </div>
    );

    if (s === 'CONCLUIDO') return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Registrar comissão do parceiro</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Valor base (R$) *</Label>
            <Input value={formC.valor_base} onChange={e => setFormC(f => ({ ...f, valor_base: e.target.value }))}
              placeholder="Ex: 350,00" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">% do parceiro *</Label>
            <Input value={formC.comissao_percentual} onChange={e => setFormC(f => ({ ...f, comissao_percentual: e.target.value }))}
              placeholder="Ex: 50" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
          </div>
        </div>
        {formC.valor_base && formC.comissao_percentual && (() => {
          const base = parseFloat(formC.valor_base.replace(',', '.')) || 0;
          const pct = parseFloat(formC.comissao_percentual) || 0;
          const aposImp = base * (1 - 0.06);
          const comissao = aposImp * (pct / 100);
          return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm">
              <p className="text-xs text-gray-500">Base: R$ {fmtBRL(base)} → após 6% imposto: R$ {fmtBRL(aposImp)}</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">Comissão: R$ {fmtBRL(comissao)}</p>
            </div>
          );
        })()}
        <Button onClick={handleComissao} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          Registrar Comissão
        </Button>
      </div>
    );

    if (s === 'COMISSAO') return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Comissão registrada</p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-xs text-gray-500">Parceiro: {selected.parceiros?.nome_completo}</p>
          <p className="text-base font-bold text-emerald-700 mt-1">Contrato concluído ✅</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Upload do comprovante de pagamento</p>
          <input ref={compInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleUploadComprovante(e.target.files?.[0])} />
          <Button onClick={() => compInputRef.current?.click()} disabled={uploadingComp} variant="outline" className="w-full rounded-xl gap-2 text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            {uploadingComp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingComp ? 'Enviando...' : 'Enviar comprovante e marcar como pago'}
          </Button>
        </div>
      </div>
    );

    return null;
  };

  const pendentes = orcamentos.filter(o => o.status === 'SOLICITACAO').length;
  const emAndamento = orcamentos.filter(o => !['CONCLUIDO', 'COMISSAO', 'SOLICITACAO'].includes(o.status)).length;
  const concluidos = orcamentos.filter(o => ['CONCLUIDO', 'COMISSAO'].includes(o.status)).length;
  const FILTROS = ['TODOS', 'SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];
  const orcamentosFiltrados = filtro === 'TODOS' ? orcamentos : orcamentos.filter(o => o.status === filtro);

  return (
    <>
      <Helmet><title>Parceiros — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Orçamentos de Parceiros</h1>
            <Button onClick={() => setCriarModal(true)} className="gap-2 text-white font-semibold" style={{ background: '#003580' }}>
              <Plus className="h-4 w-4" /> Novo orçamento
            </Button>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Solicitações novas', value: pendentes, icon: Clock, color: 'text-gray-600' },
              { label: 'Em andamento', value: emAndamento, icon: FileText, color: 'text-blue-600' },
              { label: 'Concluídos', value: concluidos, icon: CheckCircle2, color: 'text-green-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-800">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${filtro === f ? 'bg-white text-[#003580] border-white' : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'}`}>
                {f === 'TODOS' ? 'Todos' : (STATUS_CONFIG[f]?.label || f)}
                {f !== 'TODOS' && ` (${orcamentos.filter(o => o.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Lista de cards */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : orcamentosFiltrados.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="text-center py-16">
                  <HeartHandshake className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">
                    Nenhum orçamento {filtro !== 'TODOS' ? `com status "${STATUS_CONFIG[filtro]?.label}"` : 'ainda'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              orcamentosFiltrados.map(o => {
                const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.SOLICITACAO;
                const step = FUNIL.indexOf(o.status);
                const isExpanded = expandedId === o.id;
                return (
                  <Card key={o.id} className={`border shadow-sm border-l-4 ${cfg.border} transition-all`}>
                    {/* Header do card */}
                    <CardContent
                      className="p-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(o)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{o.cliente_nome || 'Cliente não informado'}</p>
                          <p className="text-xs text-gray-400">{SEGMENTO_LABEL[o.segmento] || o.segmento}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Parceiro: <span className="font-medium">{o.parceiros?.nome_completo || '—'}</span></p>
                          {o.valor_mensalidade && (
                            <p className="text-xs text-gray-500 mt-0.5">R$ {fmtBRL(o.valor_mensalidade)}/mês</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {o.status === 'SOLICITACAO' && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            </span>
                          )}
                          <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1">
                        {FUNIL.map((s, i) => (
                          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#003580]' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </CardContent>

                    {/* Conteúdo expandido inline */}
                    <AnimatePresence>
                      {isExpanded && selected?.id === o.id && (
                        <motion.div
                          key="detail"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
                            {/* Dados do cliente */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do cliente</p>
                                {!confirmDelete ? (
                                  <button type="button" onClick={() => setConfirmDelete(true)}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-red-600 font-medium">Confirmar?</span>
                                    <button type="button" onClick={handleExcluir} disabled={enviando}
                                      className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
                                      {enviando ? 'Excluindo...' : 'Sim'}
                                    </button>
                                    <button type="button" onClick={() => setConfirmDelete(false)}
                                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                      Não
                                    </button>
                                  </div>
                                )}
                              </div>
                              {selected.cliente_telefone && <p><span className="text-gray-400">Tel:</span> {selected.cliente_telefone}</p>}
                              {selected.cliente_email && <p><span className="text-gray-400">Email:</span> {selected.cliente_email}</p>}
                              {selected.cliente_cpf && <p><span className="text-gray-400">CPF/CNPJ:</span> {selected.cliente_cpf}</p>}
                              {selected.observacoes && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 font-medium mb-0.5">Dados da solicitação</p>
                                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{selected.observacoes}</pre>
                                </div>
                              )}
                            </div>
                            {/* Painel de ação por status */}
                            {renderActionPanel()}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })
            )}
          </div>

        </motion.div>
      </DashboardLayout>

      {/* Modal — Novo orçamento */}
      {criarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setCriarModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Novo orçamento</h2>
              <button onClick={() => setCriarModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Parceiro</Label>
                <select value={novoForm.parceiro_id} onChange={e => setNovoForm(f => ({ ...f, parceiro_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580]">
                  <option value="">Selecionar parceiro...</option>
                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Nome do cliente *</Label>
                <Input value={novoForm.cliente_nome} onChange={e => setNovoForm(f => ({ ...f, cliente_nome: e.target.value }))}
                  placeholder="Nome completo" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Telefone *</Label>
                  <Input value={novoForm.cliente_telefone} onChange={e => setNovoForm(f => ({ ...f, cliente_telefone: e.target.value }))}
                    placeholder="(11) 99999-9999" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">E-mail *</Label>
                  <Input value={novoForm.cliente_email} onChange={e => setNovoForm(f => ({ ...f, cliente_email: e.target.value }))}
                    placeholder="email@exemplo.com" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Segmento *</Label>
                <select value={novoForm.segmento} onChange={e => { setNovoForm(f => ({ ...f, segmento: e.target.value })); setSegData({}); }}
                  className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580]">
                  <option value="">Selecionar segmento...</option>
                  {Object.entries(SEGMENTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {/* Campos específicos do segmento */}
              {novoForm.segmento && (CAMPOS_SEGMENTO[novoForm.segmento] || []).length > 0 && (
                <div className="space-y-2 border border-blue-100 rounded-xl p-3 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Dados do {SEGMENTO_LABEL[novoForm.segmento]}</p>
                  {(CAMPOS_SEGMENTO[novoForm.segmento] || []).map(campo => (
                    <div key={campo.key} className="space-y-1">
                      <Label className="text-xs text-gray-600">{campo.label}</Label>
                      {campo.type === 'select' ? (
                        <select value={segData[campo.key] || ''} onChange={e => setSegData(d => ({ ...d, [campo.key]: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-[#003580]">
                          <option value="">Selecionar...</option>
                          {campo.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <Input value={segData[campo.key] || ''} onChange={e => setSegData(d => ({ ...d, [campo.key]: e.target.value }))}
                          type={campo.type} placeholder={campo.placeholder}
                          className="border-gray-200 bg-white focus:border-[#003580] h-8 text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Faixas etárias — igual ao formulário do parceiro */}
              {['SAUDE', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'].includes(novoForm.segmento) && parseInt(segData.vidas || '0') > 0 && (() => {
                const totalVidas = parseInt(segData.vidas || '0');
                const distribuiVidas = AGE_BRACKETS.reduce((s, { id }) => s + parseInt(segData[faixaKey(id)] || '0'), 0);
                const remaining = totalVidas - distribuiVidas;
                return (
                  <div className="space-y-2 border border-blue-100 rounded-xl p-3 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Distribuição por faixa etária</p>
                      <span className={`text-xs font-bold ${remaining === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {remaining === 0 ? 'Completo ✓' : `${remaining} restante(s)`}
                      </span>
                    </div>
                    {AGE_BRACKETS.map(({ id, label }) => {
                      const key = faixaKey(id);
                      const val = parseInt(segData[key] || '0');
                      return (
                        <div key={id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex-1">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <button type="button"
                              onClick={() => setSegData(d => ({ ...d, [key]: String(Math.max(0, val - 1)) }))}
                              className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100">
                              <Minus className="h-3 w-3 text-gray-600" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold text-gray-800">{val}</span>
                            <button type="button"
                              onClick={() => setSegData(d => ({ ...d, [key]: String(val + 1) }))}
                              className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100">
                              <Plus className="h-3 w-3 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Observações adicionais</Label>
                <Input value={novoForm.observacoes} onChange={e => setNovoForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Informações extras (opcional)" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCriarModal(false)}>Cancelar</Button>
              <Button onClick={handleCriarOrcamento} disabled={criando} className="flex-1 text-white font-semibold gap-2" style={{ background: '#003580' }}>
                {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {criando ? 'Criando...' : 'Criar orçamento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminParceirosPage;
