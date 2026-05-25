import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Handshake, FileText, Clock, CheckCircle2, DollarSign,
  X, Send, Loader2, ChevronRight, Copy, Check, ExternalLink,
  Upload, Eye, Plus, Trash2, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';

const STATUS_CONFIG = {
  SOLICITACAO: { label: 'Solicitação',  color: 'bg-gray-100 text-gray-700',    border: 'border-l-gray-400' },
  ORCAMENTO:   { label: 'Orçamento',    color: 'bg-blue-100 text-blue-700',    border: 'border-l-blue-400' },
  DOCUMENTOS:  { label: 'Documentos',   color: 'bg-yellow-100 text-yellow-700', border: 'border-l-yellow-400' },
  ASSINATURA:  { label: 'Assinatura',   color: 'bg-purple-100 text-purple-700', border: 'border-l-purple-400' },
  CONCLUIDO:   { label: 'Concluído',    color: 'bg-green-100 text-green-700',   border: 'border-l-green-400' },
  COMISSAO:    { label: 'Comissão',     color: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-400' },
};

const SEGMENTO_LABEL = {
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto',
  AUTO_FROTA: 'Auto / Frota',
  VIAGEM: 'Viagem',
  RESIDENCIAL: 'Residencial',
  PET_SAUDE: 'Pet Saúde',
  EMPRESARIAL: 'Empresarial',
  CARGAS: 'Cargas',
  EQUIPAMENTOS: 'Equipamentos Portáteis',
};

const DOCS_POR_SEGMENTO = {
  SAUDE_VIDA_ODONTO: ['RG', 'CPF', 'Comprovante de residência', 'Carteirinha anterior (se houver)'],
  AUTO_FROTA: ['CRLV', 'CNH', 'CPF'],
  VIAGEM: ['RG ou Passaporte', 'CPF'],
  RESIDENCIAL: ['RG', 'CPF', 'Comprovante de residência', 'Escritura ou contrato do imóvel'],
  PET_SAUDE: ['CPF do titular', 'Cartão de vacinação do pet'],
  EMPRESARIAL: ['CNPJ', 'Contrato Social', 'Comprovante de endereço da empresa'],
  CARGAS: ['CPF ou CNPJ', 'Nota fiscal da carga'],
  EQUIPAMENTOS: ['CPF ou CNPJ', 'Nota fiscal do equipamento'],
};

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const generateSlug = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const AdminParceirosPage = () => {
  const { toast } = useToast();
  const compInputRef = useRef(null);

  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODOS');
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [uploadingComp, setUploadingComp] = useState(false);

  // Form responder
  const [formR, setFormR] = useState({ valor: '', descricao: '', docsBase: [], docExtra: '', docsExtras: [] });
  // Form comissão
  const [formC, setFormC] = useState({ valor_base: '', comissao_percentual: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orcamentos')
        .select('*, parceiros(nome_completo, modalidade, comissao_percentual)')
        .order('created_at', { ascending: false });
      setOrcamentos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (o) => {
    setSelected(o);
    setDocs([]);
    setFormR({
      valor: o.valor_mensalidade ? String(o.valor_mensalidade) : '',
      descricao: o.descricao_orcamento || '',
      docsBase: o.lista_documentos || DOCS_POR_SEGMENTO[o.segmento] || [],
      docExtra: '',
      docsExtras: o.docs_extras || [],
    });
    setFormC({ valor_base: o.valor_mensalidade ? String(o.valor_mensalidade) : '', comissao_percentual: o.parceiros?.comissao_percentual ? String(o.parceiros.comissao_percentual) : '50' });

    const { data: docData } = await supabase
      .from('orcamento_documentos')
      .select('*')
      .eq('orcamento_id', o.id)
      .order('enviado_em', { ascending: true });
    setDocs(docData || []);
  };

  const closeDetail = () => { setSelected(null); setDocs([]); };

  const refreshSelected = async (id) => {
    const { data } = await supabase.from('orcamentos').select('*, parceiros(nome_completo, modalidade, comissao_percentual)').eq('id', id).maybeSingle();
    if (data) {
      setSelected(data);
      setOrcamentos(prev => prev.map(o => o.id === id ? data : o));
    }
  };

  const handleResponder = async () => {
    if (!formR.valor) return toast({ variant: 'destructive', title: 'Informe o valor da mensalidade.' });
    if (!formR.descricao.trim()) return toast({ variant: 'destructive', title: 'Informe a descrição do orçamento.' });
    setEnviando(true);
    try {
      const slug = generateSlug();
      const { error } = await supabase.from('orcamentos').update({
        status: 'ORCAMENTO',
        slug,
        valor_mensalidade: parseFloat(formR.valor.replace(',', '.')),
        descricao_orcamento: formR.descricao.trim(),
        lista_documentos: formR.docsBase,
        docs_extras: formR.docsExtras,
        data_orcamento: new Date().toISOString(),
      }).eq('id', selected.id);
      if (error) throw error;
      toast({ title: 'Orçamento enviado!', description: 'O link foi gerado. Informe o parceiro para repassar ao cliente.' });
      await loadData();
      await refreshSelected(selected.id);
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
      const { error } = await supabase.from('orcamentos').update(update).eq('id', selected.id);
      if (error) throw error;
      toast({ title: 'Status atualizado!' });
      await loadData();
      await refreshSelected(selected.id);
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
      const { data: existente } = await supabase.from('comissoes').select('id').eq('orcamento_id', selected.id).maybeSingle();
      if (existente) {
        await supabase.from('comissoes').update({
          valor_base: parseFloat(formC.valor_base.replace(',', '.')),
          comissao_percentual: parseFloat(formC.comissao_percentual),
          status: 'PENDENTE',
        }).eq('id', existente.id);
      } else {
        await supabase.from('comissoes').insert({
          orcamento_id: selected.id,
          parceiro_id: selected.parceiro_id,
          valor_base: parseFloat(formC.valor_base.replace(',', '.')),
          comissao_percentual: parseFloat(formC.comissao_percentual),
          status: 'PENDENTE',
        });
      }
      await supabase.from('orcamentos').update({ status: 'COMISSAO' }).eq('id', selected.id);
      toast({ title: 'Comissão registrada!' });
      await loadData();
      await refreshSelected(selected.id);
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
      const path = `comissoes/${selected.id}/comprovante.${ext}`;
      const { error: upErr } = await supabase.storage.from('orcamento-documentos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('orcamento-documentos').getPublicUrl(path);

      const { data: com } = await supabase.from('comissoes').select('id').eq('orcamento_id', selected.id).maybeSingle();
      if (com) {
        await supabase.from('comissoes').update({
          comprovante_path: publicUrl,
          status: 'PAGO',
          data_pagamento: new Date().toISOString(),
        }).eq('id', com.id);
      }
      toast({ title: 'Comprovante enviado e comissão marcada como paga!' });
      await loadData();
      await refreshSelected(selected.id);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro no upload.', description: err?.message });
    } finally {
      setUploadingComp(false);
    }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/orcamento/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({ title: 'Link copiado!' });
  };

  const addDocExtra = () => {
    if (!formR.docExtra.trim()) return;
    setFormR(f => ({ ...f, docsExtras: [...f.docsExtras, f.docExtra.trim()], docExtra: '' }));
  };

  const removeDocExtra = (i) => {
    setFormR(f => ({ ...f, docsExtras: f.docsExtras.filter((_, idx) => idx !== i) }));
  };

  const toggleDocBase = (doc) => {
    setFormR(f => ({
      ...f,
      docsBase: f.docsBase.includes(doc) ? f.docsBase.filter(d => d !== doc) : [...f.docsBase, doc],
    }));
  };

  const pendentes = orcamentos.filter(o => o.status === 'SOLICITACAO').length;
  const emAndamento = orcamentos.filter(o => !['CONCLUIDO', 'COMISSAO', 'SOLICITACAO'].includes(o.status)).length;
  const concluidos = orcamentos.filter(o => ['CONCLUIDO', 'COMISSAO'].includes(o.status)).length;

  const FILTROS = ['TODOS', 'SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];
  const orcamentosFiltrados = filtro === 'TODOS' ? orcamentos : orcamentos.filter(o => o.status === filtro);

  const renderActionPanel = () => {
    if (!selected) return null;
    const s = selected.status;

    if (s === 'SOLICITACAO') return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Responder com orçamento</p>
        <div className="space-y-1.5">
          <Label className="text-sm">Valor da mensalidade (R$) *</Label>
          <Input value={formR.valor} onChange={e => setFormR(f => ({ ...f, valor: e.target.value }))}
            placeholder="Ex: 350,00" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Descrição do orçamento *</Label>
          <textarea value={formR.descricao} onChange={e => setFormR(f => ({ ...f, descricao: e.target.value }))}
            rows={3} placeholder="Plano, operadora, coberturas, carência..."
            className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] resize-none" />
        </div>
        {/* Docs base */}
        <div className="space-y-1.5">
          <Label className="text-sm">Documentos necessários (pré-selecionados pelo segmento)</Label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2">
            {(DOCS_POR_SEGMENTO[selected.segmento] || []).map(doc => (
              <label key={doc} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formR.docsBase.includes(doc)} onChange={() => toggleDocBase(doc)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-[#003580]" />
                {doc}
              </label>
            ))}
          </div>
        </div>
        {/* Docs extras */}
        <div className="space-y-1.5">
          <Label className="text-sm">Documentos extras (opcional)</Label>
          {formR.docsExtras.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-1 bg-gray-50 px-2 py-1 rounded">{d}</span>
              <button onClick={() => removeDocExtra(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={formR.docExtra} onChange={e => setFormR(f => ({ ...f, docExtra: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addDocExtra()}
              placeholder="Ex: Formulário médico preenchido"
              className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] text-sm" />
            <Button size="sm" variant="outline" onClick={addDocExtra} className="shrink-0"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <Button onClick={handleResponder} disabled={enviando} className="w-full rounded-lg text-white font-semibold gap-2" style={{ background: '#003580' }}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {enviando ? 'Enviando...' : 'Responder e Gerar Link'}
        </Button>
      </div>
    );

    if (s === 'ORCAMENTO') return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Link público para o cliente</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 truncate flex-1 font-mono">{window.location.origin}/orcamento/{selected.slug}</span>
            <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => copyLink(selected.slug)}>
              {copiedSlug === selected.slug ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-blue-500 mt-1.5">Passe este link para o parceiro repassar ao cliente</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">Orçamento enviado</p>
          <p>Mensalidade: <span className="font-semibold text-gray-800">R$ {Number(selected.valor_mensalidade).toFixed(2).replace('.', ',')}</span></p>
          {selected.descricao_orcamento && <p className="mt-1 text-xs">{selected.descricao_orcamento}</p>}
        </div>
        <p className="text-xs text-gray-400 text-center">Aguardando o cliente aceitar a proposta...</p>
      </div>
    );

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
        <Button onClick={() => handleAvancar('ASSINATURA')} disabled={enviando} className="w-full rounded-lg text-white font-semibold gap-2" style={{ background: '#7c3aed' }}>
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
        <Button onClick={() => handleAvancar('CONCLUIDO')} disabled={enviando} className="w-full rounded-lg text-white font-semibold gap-2 bg-green-600 hover:bg-green-700">
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
          const aposImp = base * (1 - 6 / 100);
          const comissao = aposImp * (pct / 100);
          return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm">
              <p className="text-xs text-gray-500">Base: R$ {base.toFixed(2).replace('.', ',')} → após 6% imposto: R$ {aposImp.toFixed(2).replace('.', ',')}</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">Comissão: R$ {comissao.toFixed(2).replace('.', ',')}</p>
            </div>
          );
        })()}
        <Button onClick={handleComissao} disabled={enviando} className="w-full rounded-lg text-white font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          Registrar Comissão
        </Button>
      </div>
    );

    if (s === 'COMISSAO') return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Comissão registrada</p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-xs text-gray-500">Parceiro: {selected.parceiros?.nome_completo}</p>
          <p className="text-base font-bold text-emerald-700 mt-1">Contrato concluído ✅</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Upload do comprovante de pagamento</p>
          <input ref={compInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleUploadComprovante(e.target.files?.[0])} />
          <Button onClick={() => compInputRef.current?.click()} disabled={uploadingComp} variant="outline" className="w-full rounded-lg gap-2 text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            {uploadingComp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingComp ? 'Enviando...' : 'Enviar comprovante e marcar como pago'}
          </Button>
        </div>
      </div>
    );

    return null;
  };

  return (
    <>
      <Helmet><title>Parceiros — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          <h1 className="text-2xl font-bold tracking-tight text-white">Orçamentos de Parceiros</h1>

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

          {/* Filtro de status */}
          <div className="flex gap-2 flex-wrap">
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${filtro === f ? 'bg-white text-[#003580] border-white' : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'}`}>
                {f === 'TODOS' ? 'Todos' : (STATUS_CONFIG[f]?.label || f)}
                {f !== 'TODOS' && ` (${orcamentos.filter(o => o.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Layout: lista + painel detalhe */}
          <div className={`flex gap-4 ${selected ? 'flex-col lg:flex-row' : ''}`}>
            {/* Lista */}
            <div className={`space-y-3 ${selected ? 'lg:w-1/2' : 'w-full'}`}>
              {loading ? (
                <p className="text-center text-gray-400 py-8">Carregando...</p>
              ) : orcamentosFiltrados.length === 0 ? (
                <Card className="border shadow-sm">
                  <CardContent className="text-center py-16">
                    <Handshake className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">Nenhum orçamento {filtro !== 'TODOS' ? `com status "${STATUS_CONFIG[filtro]?.label}"` : 'ainda'}</p>
                  </CardContent>
                </Card>
              ) : (
                orcamentosFiltrados.map(o => {
                  const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.SOLICITACAO;
                  const step = FUNIL.indexOf(o.status);
                  const isSelected = selected?.id === o.id;
                  return (
                    <Card key={o.id}
                      className={`border shadow-sm cursor-pointer transition-all border-l-4 ${cfg.border} ${isSelected ? 'ring-2 ring-[#003580]' : 'hover:shadow-md'}`}
                      onClick={() => openDetail(o)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{o.cliente_nome || 'Cliente não informado'}</p>
                            <p className="text-xs text-gray-400">{SEGMENTO_LABEL[o.segmento] || o.segmento}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Parceiro: <span className="font-medium">{o.parceiros?.nome_completo || '—'}</span></p>
                            {o.valor_mensalidade && (
                              <p className="text-xs text-gray-500 mt-0.5">R$ {Number(o.valor_mensalidade).toFixed(2).replace('.', ',')}/mês</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-1">
                          {FUNIL.map((s, i) => (
                            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#003580]' : 'bg-gray-200'}`} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Painel de detalhe */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  key="detalhe"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="lg:w-1/2 lg:sticky lg:top-4 lg:self-start"
                >
                  <Card className="border shadow-md">
                    <CardContent className="p-5">
                      {/* Header do painel */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-800 text-base">{selected.cliente_nome}</p>
                          <p className="text-xs text-gray-400">{SEGMENTO_LABEL[selected.segmento]}</p>
                          <Badge className={`text-xs mt-1 ${STATUS_CONFIG[selected.status]?.color}`}>{STATUS_CONFIG[selected.status]?.label}</Badge>
                        </div>
                        <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600 p-1">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Dados do cliente */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dados do cliente</p>
                        {selected.cliente_telefone && <p><span className="text-gray-500">Tel:</span> {selected.cliente_telefone}</p>}
                        {selected.cliente_email && <p><span className="text-gray-500">Email:</span> {selected.cliente_email}</p>}
                        {selected.cliente_cpf && <p><span className="text-gray-500">CPF:</span> {selected.cliente_cpf}</p>}
                        {selected.observacoes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 font-medium mb-0.5">Dados da solicitação</p>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{selected.observacoes}</pre>
                          </div>
                        )}
                      </div>

                      {/* Ação específica por status */}
                      {renderActionPanel()}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminParceirosPage;
