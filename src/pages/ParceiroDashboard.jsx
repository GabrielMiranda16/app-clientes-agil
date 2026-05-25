import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, FileText, CheckCircle2, DollarSign,
  Plus, TrendingUp, Users, Clock, Copy, Check,
  ChevronRight, ArrowUpRight,
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

const SEGMENTO_LABEL = {
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto',
  AUTO_FROTA:        'Auto / Frota',
  VIAGEM:            'Viagem',
  RESIDENCIAL:       'Residencial',
  PET_SAUDE:         'Pet Saúde',
  EMPRESARIAL:       'Empresarial',
  CARGAS:            'Cargas',
  EQUIPAMENTOS:      'Equipamentos Portáteis',
};

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const ParceiroDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [parceiro, setParceiro] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState(null);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [parceiroRes, orcamentosRes] = await Promise.allSettled([
        supabase.from('parceiros').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('orcamentos').select('*, comissoes(*)').eq('parceiro_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (parceiroRes.status === 'fulfilled' && parceiroRes.value.data) {
        const p = parceiroRes.value.data;
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
        {/* Funil visual */}
        <div className="mt-3 flex gap-1">
          {FUNIL.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#003580]' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">Solicitação</span>
          <span className="text-[10px] text-gray-400">Comissão</span>
        </div>
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

              {/* Orçamentos recentes */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-800">Orçamentos em andamento</CardTitle>
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
                <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 rounded-lg">
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
    </>
  );
};

export default ParceiroDashboard;
