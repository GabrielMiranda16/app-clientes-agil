import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Flame, Users, Search, RefreshCw, Phone, Calendar, Monitor, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';

const STATUS_LABEL = {
  SOLICITACAO: 'Solicitação',
  ORCAMENTO:   'Orçamento enviado',
  DOCUMENTOS:  'Documentos',
  ASSINATURA:  'Assinatura',
  CONCLUIDO:   'Concluído',
  COMISSAO:    'Comissão',
};

const STATUS_COLOR = {
  SOLICITACAO: 'bg-yellow-100 text-yellow-700',
  ORCAMENTO:   'bg-blue-100 text-blue-700',
  DOCUMENTOS:  'bg-purple-100 text-purple-700',
  ASSINATURA:  'bg-orange-100 text-orange-700',
  CONCLUIDO:   'bg-green-100 text-green-700',
  COMISSAO:    'bg-emerald-100 text-emerald-700',
};

const SEG_LABEL = {
  SAUDE: 'Saúde', AUTO: 'Auto', RESIDENCIAL: 'Residencial',
  EMPRESARIAL: 'Empresarial', ODONTOLOGICO: 'Odontológico',
  VIAGEM: 'Viagem', PET_SAUDE: 'Pet Saúde', PET_SEGURO: 'Pet Seguro',
  VIDA: 'Vida', FROTA: 'Frota', CARGAS: 'Cargas', EQUIPAMENTOS: 'Equipamentos',
  SAUDE_VIDA_ODONTO: 'Saúde/Vida/Odonto', AUTO_FROTA: 'Auto/Frota',
};

const tempoRelativo = (iso) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
};

const isQuente = (iso) => {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 60 * 60 * 1000;
};

const AdminLeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [expandido, setExpandido] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data: orcamentos } = await supabase
      .from('orcamentos')
      .select('*, parceiros(nome_completo)')
      .order('created_at', { ascending: false });

    if (!orcamentos?.length) { setLeads([]); setLoading(false); return; }

    const { data: acessos } = await supabase
      .from('orcamento_acessos')
      .select('*')
      .in('orcamento_id', orcamentos.map(o => o.id))
      .order('acessado_em', { ascending: false });

    const acessosPorId = {};
    (acessos || []).forEach(a => {
      if (!acessosPorId[a.orcamento_id]) acessosPorId[a.orcamento_id] = [];
      acessosPorId[a.orcamento_id].push(a);
    });

    setLeads(orcamentos.map(o => ({
      ...o,
      acessos: acessosPorId[o.id] || [],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const lista = leads.filter(l => {
    const q = busca.toLowerCase();
    const matchBusca = !q ||
      l.cliente_nome?.toLowerCase().includes(q) ||
      l.cliente_telefone?.includes(q) ||
      l.cliente_email?.toLowerCase().includes(q) ||
      l.parceiros?.nome_completo?.toLowerCase().includes(q) ||
      l.segmento?.toLowerCase().includes(q);
    const matchStatus = filtroStatus === 'todos' || l.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const quentesCount = leads.filter(l => {
    const ultimo = l.acessos[0]?.acessado_em;
    return isQuente(ultimo);
  }).length;

  const statusTabs = ['todos', 'SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

  return (
    <>
      <Helmet><title>Leads — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Leads</h1>
              <span className="text-white/60 text-sm">{leads.length} total</span>
              {quentesCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                  <Flame className="h-3 w-3" /> {quentesCount} quente{quentesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button onClick={fetchLeads} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
          </div>

          {/* Busca */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone, email ou parceiro..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20"
            />
          </div>

          {/* Filtro por status */}
          <div className="flex gap-2 flex-wrap">
            {statusTabs.map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroStatus === s ? 'bg-white text-[#003580]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
              >
                {s === 'todos' ? `Todos (${leads.length})` : `${STATUS_LABEL[s]} (${leads.filter(l => l.status === s).length})`}
              </button>
            ))}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-white/10 animate-pulse" />)}
            </div>
          ) : lista.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">Nenhum lead encontrado.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {lista.map(l => {
                const ultimoAcesso = l.acessos[0];
                const quente = isQuente(ultimoAcesso?.acessado_em);
                const aceitou = l.acessos.some(a => a.aceitou_proposta);
                const propostaClicada = l.acessos.find(a => a.proposta_clicada)?.proposta_clicada;
                const device = ultimoAcesso?.device;
                const aberto = expandido === l.id;

                return (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`transition-all ${quente ? 'ring-2 ring-orange-400 shadow-orange-100 shadow-md' : ''}`}>
                      {/* Linha principal */}
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {quente && (
                                <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-500 animate-pulse">
                                  <Flame className="h-3 w-3" /> Quente
                                </span>
                              )}
                              {aceitou && (
                                <span className="text-[11px] font-bold text-green-600">✅ Aceitou proposta</span>
                              )}
                              <h3 className="text-sm font-semibold text-gray-900 truncate">{l.cliente_nome || '—'}</h3>
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[l.status] || 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABEL[l.status] || l.status}
                              </span>
                              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {SEG_LABEL[l.segmento] || l.segmento}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                              {l.cliente_telefone && (
                                <a href={`https://wa.me/55${l.cliente_telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 hover:text-green-600">
                                  <Phone className="h-3 w-3" /> {l.cliente_telefone}
                                </a>
                              )}
                              {l.parceiros?.nome_completo && (
                                <span className="text-gray-400">Parceiro: {l.parceiros.nome_completo}</span>
                              )}
                              <span className="flex items-center gap-1 text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(l.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {/* Resumo de acesso */}
                            {ultimoAcesso && (
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className={`font-medium ${quente ? 'text-orange-500' : 'text-gray-500'}`}>
                                  👁 {l.acessos.length} acesso{l.acessos.length > 1 ? 's' : ''} · último {tempoRelativo(ultimoAcesso.acessado_em)}
                                </span>
                                {device && (
                                  <span className="text-gray-400 flex items-center gap-0.5">
                                    {device === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                    {device === 'mobile' ? 'Mobile' : 'Desktop'}
                                  </span>
                                )}
                                {propostaClicada && (
                                  <span className="text-blue-500 font-medium">Clicou: {propostaClicada}</span>
                                )}
                              </div>
                            )}
                            {!ultimoAcesso && l.slug && (
                              <span className="text-xs text-gray-300">Link nunca aberto</span>
                            )}
                          </div>

                          {/* Botão expandir */}
                          <button
                            onClick={() => setExpandido(aberto ? null : l.id)}
                            className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-[#003580] hover:bg-gray-50 transition-colors"
                          >
                            {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {/* Detalhe expandido */}
                        {aberto && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 pt-4 border-t border-gray-100 space-y-3"
                          >
                            {/* Dados do cliente */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {l.cliente_email && (
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
                                  <p className="text-xs text-gray-700">{l.cliente_email}</p>
                                </div>
                              )}
                              {l.cliente_cpf && (
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">CPF</p>
                                  <p className="text-xs text-gray-700">{l.cliente_cpf}</p>
                                </div>
                              )}
                              {l.valor_mensalidade && (
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Valor proposta</p>
                                  <p className="text-xs font-semibold text-green-600">R$ {Number(l.valor_mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                              )}
                              {l.operadora_escolhida && (
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Operadora</p>
                                  <p className="text-xs text-gray-700">{l.operadora_escolhida}</p>
                                </div>
                              )}
                              {l.slug && (
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Link</p>
                                  <a href={`${window.location.origin}/orcamento/${l.slug}`} target="_blank" rel="noreferrer"
                                    className="text-xs text-[#003580] hover:underline truncate block">
                                    Ver proposta ↗
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Histórico de acessos */}
                            {l.acessos.length > 0 && (
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Histórico de acessos</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {l.acessos.map((a, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                                      <span className="text-gray-400 shrink-0">
                                        {new Date(a.acessado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {a.device && (
                                        <span className="flex items-center gap-0.5 text-gray-400">
                                          {a.device === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                        </span>
                                      )}
                                      {a.proposta_clicada && <span className="text-blue-500">Clicou: {a.proposta_clicada}</span>}
                                      {a.aceitou_proposta && <span className="text-green-600 font-semibold">✅ Aceitou</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Observações */}
                            {l.observacoes && (
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Observações</p>
                                <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5">{l.observacoes}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminLeadsPage;
