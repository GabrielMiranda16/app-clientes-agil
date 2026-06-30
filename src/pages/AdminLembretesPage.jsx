import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Trash2, X } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminLembretesPage = () => {
  const { user } = useAuth();
  const autor = user?.perfil === 'CEO' ? 'ceo' : 'adm';

  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetch = async () => {
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
    await supabase.from('lembretes_adm').insert({ texto: texto.trim(), autor, lida: false });
    setTexto('');
    setAddOpen(false);
    await fetch();
    setSaving(false);
  };

  const excluir = async (id) => {
    await supabase.from('lembretes_adm').delete().eq('id', id);
    setLembretes(prev => prev.filter(l => l.id !== id));
    setConfirmDelete(null);
  };

  useEffect(() => { fetch(); }, []);

  const fmtData = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Helmet><title>Lembretes — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-4 max-w-2xl">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Lembretes</h1>
            </div>
            <button
              onClick={() => { setAddOpen(o => !o); setTexto(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#003580] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {addOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {addOpen ? 'Cancelar' : 'Adicionar lembrete'}
            </button>
          </div>

          {/* Formulário de adicionar */}
          <AnimatePresence>
            {addOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
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
                      <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
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

          {/* Lista */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : lembretes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">Nenhum lembrete ainda.</p>
                <p className="text-xs text-gray-300 mt-1">Clique em "Adicionar lembrete" para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {lembretes.map(l => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group hover:shadow-md transition-shadow">
                      <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{l.texto}</p>
                          <p className="text-xs text-gray-400 mt-1.5">
                            📅 {fmtData(l.created_at)}
                            <span className="ml-2 text-gray-300">·</span>
                            <span className="ml-2 text-gray-400">{l.autor === 'ceo' ? 'CEO' : 'ADM'}</span>
                          </p>
                        </div>
                        <div className="shrink-0">
                          {confirmDelete === l.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => excluir(l.id)} className="text-xs text-red-600 font-semibold hover:underline">Excluir</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Não</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(l.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
