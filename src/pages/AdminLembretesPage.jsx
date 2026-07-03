import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Trash2, X, Check, Pencil, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Retorna o status do alerta:
// 'vencido'   → passou da hora (efeito vermelho pulsando)
// 'hoje'      → vence hoje (efeito laranja pulsando)
// 'em_breve'  → dentro de 3 dias (borda amarela)
// null        → sem alerta ou no futuro distante
const statusAlerta = (data_alerta) => {
  if (!data_alerta) return null;
  const agora = new Date();
  const alerta = new Date(data_alerta);
  const diffMs = alerta - agora;
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return 'vencido';
  if (diffDias <= 1) return 'hoje';
  if (diffDias <= 3) return 'em_breve';
  return null;
};

const estiloAlerta = {
  vencido:  'ring-2 ring-red-400 shadow-red-200 shadow-lg',
  hoje:     'ring-2 ring-orange-400 shadow-orange-200 shadow-lg',
  em_breve: 'ring-2 ring-yellow-400 shadow-yellow-100 shadow-md',
};

const corBadgeAlerta = {
  vencido:  'bg-red-100 text-red-600',
  hoje:     'bg-orange-100 text-orange-600',
  em_breve: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-700',
};

const labelAlerta = {
  vencido:  'Alerta vencido',
  hoje:     'Hoje!',
  em_breve: 'Em breve',
};

const AdminLembretesPage = () => {
  const { user } = useAuth();
  const autor = user?.perfil === 'CEO' ? 'ceo' : 'adm';

  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendentes');
  const [addOpen, setAddOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [dataAlerta, setDataAlerta] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState('');
  const [editDataAlerta, setEditDataAlerta] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchLembretes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lembretes_adm')
      .select('*')
      .order('created_at', { ascending: false });
    setLembretes(data || []);
    setLoading(false);
  };

  const adicionar = async () => {
    if (!texto.trim() || saving) return;
    setSaving(true);
    const payload = { texto: texto.trim(), autor, lida: false, concluido: false };
    if (dataAlerta) payload.data_alerta = new Date(dataAlerta).toISOString();
    await supabase.from('lembretes_adm').insert(payload);
    setTexto('');
    setDataAlerta('');
    setAddOpen(false);
    await fetchLembretes();
    setSaving(false);
  };

  const salvarEdicao = async (id) => {
    if (!editTexto.trim()) return;
    const payload = {
      texto: editTexto.trim(),
      updated_at: new Date().toISOString(),
      data_alerta: editDataAlerta ? new Date(editDataAlerta).toISOString() : null,
    };
    await supabase.from('lembretes_adm').update(payload).eq('id', id);
    setEditId(null);
    await fetchLembretes();
  };

  const concluir = async (id) => {
    await supabase.from('lembretes_adm').update({ concluido: true }).eq('id', id);
    setLembretes(prev => prev.map(l => l.id === id ? { ...l, concluido: true } : l));
  };

  const reabrir = async (id) => {
    await supabase.from('lembretes_adm').update({ concluido: false }).eq('id', id);
    setLembretes(prev => prev.map(l => l.id === id ? { ...l, concluido: false } : l));
  };

  const excluir = async (id) => {
    await supabase.from('lembretes_adm').delete().eq('id', id);
    setLembretes(prev => prev.filter(l => l.id !== id));
    setConfirmDelete(null);
  };

  useEffect(() => { fetchLembretes(); }, []);

  const fmtData = (iso) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const lista = lembretes.filter(l =>
    filtro === 'pendentes' ? !l.concluido : l.concluido
  );

  const porPagina = isMobile ? 5 : 12;
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const listaPage = lista.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  const mudarFiltro = (f) => { setFiltro(f); setPagina(1); };

  const pendentesCount = lembretes.filter(l => !l.concluido).length;
  const concluidosCount = lembretes.filter(l => l.concluido).length;
  const alertasAtivos = lembretes.filter(l => !l.concluido && ['vencido', 'hoje'].includes(statusAlerta(l.data_alerta))).length;

  return (
    <>
      <Helmet><title>Lembretes — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Lembretes</h1>
              {alertasAtivos > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                  <Bell className="h-3 w-3" /> {alertasAtivos}
                </span>
              )}
            </div>
            <button
              onClick={() => { setAddOpen(true); setTexto(''); setDataAlerta(''); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#003580] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
               Adicionar lembrete
            </button>
          </div>

          {/* Popup de adicionar */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo lembrete</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <textarea
                  autoFocus
                  placeholder="Escreva o lembrete..."
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adicionar(); } }}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#003580] resize-none"
                />
                <div>
                  <label className="flex items-center gap-1.5 text-sm text-gray-500 mb-1.5">
                    <Bell className="h-4 w-4 text-orange-400" /> Me lembre em (opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={dataAlerta}
                      onChange={e => setDataAlerta(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#003580]"
                    />
                    {dataAlerta && (
                      <button onClick={() => setDataAlerta('')} className="text-gray-300 hover:text-gray-500">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 border border-gray-200">
                    Cancelar
                  </button>
                  <button
                    onClick={adicionar}
                    disabled={saving || !texto.trim()}
                    className="px-4 py-2 rounded-lg bg-[#003580] text-white text-sm font-medium hover:bg-[#002060] disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar lembrete'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Filtro */}
          <div className="flex gap-2">
            <button
              onClick={() => mudarFiltro('pendentes')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === 'pendentes' ? 'bg-white text-[#003580]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
            >
              Pendentes {pendentesCount > 0 && <span className="ml-1 text-xs">({pendentesCount})</span>}
            </button>
            <button
              onClick={() => mudarFiltro('concluidos')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === 'concluidos' ? 'bg-white text-[#003580]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
            >
              Concluídos {concluidosCount > 0 && <span className="ml-1 text-xs">({concluidosCount})</span>}
            </button>
          </div>

          {/* Grid de cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-44 rounded-xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">
                  {filtro === 'pendentes' ? 'Nenhum lembrete pendente.' : 'Nenhum lembrete concluído.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {listaPage.map(l => {
                  const alerta = l.concluido ? null : statusAlerta(l.data_alerta);
                  return (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card className={`flex flex-col h-44 transition-all ${l.concluido ? 'opacity-60' : ''} ${alerta ? estiloAlerta[alerta] : ''} ${alerta === 'vencido' || alerta === 'hoje' ? 'animate-pulse' : ''}`}>
                        {/* Topo — informações */}
                        <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-gray-100">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[11px] font-semibold text-[#003580] uppercase tracking-wide">
                                {l.autor === 'ceo' ? 'CEO' : 'ADM'}
                              </p>
                              {alerta && (
                                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${corBadgeAlerta[alerta]}`}>
                                  <Bell className="h-2.5 w-2.5" />
                                  {labelAlerta[alerta]}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              {l.updated_at
                                ? `Editado ${fmtData(l.updated_at)}`
                                : fmtData(l.created_at)}
                            </p>
                            {l.data_alerta && (
                              <p className={`text-[11px] font-medium ${alerta ? (alerta === 'vencido' ? 'text-red-500' : alerta === 'hoje' ? 'text-orange-500' : 'text-yellow-600') : 'text-gray-400'}`}>
                                🔔 {fmtData(l.data_alerta)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {/* Concluir / Reabrir */}
                            {l.concluido ? (
                              <button onClick={() => reabrir(l.id)} className="p-1 rounded hover:bg-gray-100 text-green-500 hover:text-gray-500 transition-colors" title="Reabrir">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => concluir(l.id)} className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Concluir">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {/* Editar */}
                            {!l.concluido && (
                              <button
                                onClick={() => {
                                  setEditId(l.id);
                                  setEditTexto(l.texto);
                                  setEditDataAlerta(l.data_alerta ? new Date(l.data_alerta).toISOString().slice(0, 16) : '');
                                }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#003580] transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {/* Excluir */}
                            {confirmDelete === l.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => excluir(l.id)} className="text-[11px] text-red-600 font-semibold hover:underline">Sim</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-gray-400 hover:text-gray-600">Não</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(l.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Corpo — texto */}
                        <CardContent className="flex-1 px-4 py-3 overflow-hidden">
                          {editId === l.id ? (
                            <div className="space-y-1.5 h-full flex flex-col">
                              <textarea
                                autoFocus
                                value={editTexto}
                                onChange={e => setEditTexto(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Escape') setEditId(null); }}
                                className="flex-1 w-full rounded border border-[#003580] bg-blue-50 px-2 py-1 text-sm focus:outline-none resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <Bell className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                                <input
                                  type="datetime-local"
                                  value={editDataAlerta}
                                  onChange={e => setEditDataAlerta(e.target.value)}
                                  className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs focus:outline-none focus:border-[#003580]"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                                <button onClick={() => salvarEdicao(l.id)} className="text-xs text-[#003580] font-semibold hover:underline">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-sm leading-relaxed line-clamp-4 ${l.concluido ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {l.texto}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === paginaAtual ? 'bg-white text-[#003580]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminLembretesPage;
