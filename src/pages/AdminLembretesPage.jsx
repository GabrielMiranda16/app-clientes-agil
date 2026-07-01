import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Trash2, X, Check, Pencil } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminLembretesPage = () => {
  const { user } = useAuth();
  const autor = user?.perfil === 'CEO' ? 'ceo' : 'adm';

  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendentes');
  const [addOpen, setAddOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

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
    await supabase.from('lembretes_adm').insert({
      texto: texto.trim(),
      autor,
      lida: false,
      concluido: false,
    });
    setTexto('');
    setAddOpen(false);
    await fetchLembretes();
    setSaving(false);
  };

  const salvarEdicao = async (id) => {
    if (!editTexto.trim()) return;
    await supabase.from('lembretes_adm').update({
      texto: editTexto.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
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

  const pendentesCount = lembretes.filter(l => !l.concluido).length;
  const concluidosCount = lembretes.filter(l => l.concluido).length;

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
            </div>
            <button
              onClick={() => { setAddOpen(o => !o); setTexto(''); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#003580] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {addOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {addOpen ? 'Cancelar' : 'Adicionar lembrete'}
            </button>
          </div>

          {/* Formulário de adicionar */}
          <AnimatePresence>
            {addOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <textarea
                      autoFocus
                      placeholder="Escreva o lembrete..."
                      value={texto}
                      onChange={e => setTexto(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adicionar(); } }}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#003580] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700">
                        Cancelar
                      </button>
                      <button
                        onClick={adicionar}
                        disabled={saving || !texto.trim()}
                        className="px-4 py-1.5 rounded-lg bg-[#003580] text-white text-sm font-medium hover:bg-[#002060] disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filtro */}
          <div className="flex gap-2">
            <button
              onClick={() => setFiltro('pendentes')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === 'pendentes' ? 'bg-white text-[#003580]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
            >
              Pendentes {pendentesCount > 0 && <span className="ml-1 text-xs">({pendentesCount})</span>}
            </button>
            <button
              onClick={() => setFiltro('concluidos')}
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
                {lista.map(l => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className={`flex flex-col h-44 ${l.concluido ? 'opacity-70' : ''}`}>
                      {/* Topo — informações */}
                      <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-gray-100">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold text-[#003580] uppercase tracking-wide">
                            {l.autor === 'ceo' ? 'CEO' : 'ADM'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {l.updated_at
                              ? `Editado ${fmtData(l.updated_at)}`
                              : fmtData(l.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {/* Editar */}
                          {!l.concluido && (
                            <button
                              onClick={() => { setEditId(l.id); setEditTexto(l.texto); }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#003580] transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Concluir / Reabrir */}
                          {l.concluido ? (
                            <button
                              onClick={() => reabrir(l.id)}
                              className="p-1 rounded hover:bg-gray-100 text-green-500 hover:text-gray-500 transition-colors"
                              title="Reabrir"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => concluir(l.id)}
                              className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                              title="Marcar como concluído"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Excluir */}
                          {confirmDelete === l.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => excluir(l.id)} className="text-[11px] text-red-600 font-semibold hover:underline">Sim</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-gray-400 hover:text-gray-600">Não</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(l.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Corpo — texto */}
                      <CardContent className="flex-1 px-4 py-3 overflow-hidden">
                        {editId === l.id ? (
                          <div className="space-y-2 h-full flex flex-col">
                            <textarea
                              autoFocus
                              value={editTexto}
                              onChange={e => setEditTexto(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); salvarEdicao(l.id); } if (e.key === 'Escape') setEditId(null); }}
                              className="flex-1 w-full rounded border border-[#003580] bg-blue-50 px-2 py-1 text-sm focus:outline-none resize-none"
                            />
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
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminLembretesPage;
