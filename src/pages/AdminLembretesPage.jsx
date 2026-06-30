import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle2, Send } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminLembretesPage = () => {
  const { user } = useAuth();
  const autor = user?.perfil === 'CEO' ? 'ceo' : 'adm';

  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const msgEndRef = useRef(null);

  const fetchMensagens = async () => {
    const { data } = await supabase
      .from('lembretes_adm')
      .select('*')
      .order('created_at', { ascending: true });
    setMensagens(data || []);

    const outroAutor = autor === 'ceo' ? 'adm' : 'ceo';
    const unread = (data || []).filter(l => l.autor === outroAutor && !l.lida).map(l => l.id);
    if (unread.length > 0) {
      await supabase.from('lembretes_adm').update({ lida: true }).in('id', unread);
    }

    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const enviar = async () => {
    if (!texto.trim() || saving) return;
    setSaving(true);
    await supabase.from('lembretes_adm').insert({ texto: texto.trim(), autor, lida: false });
    setTexto('');
    await fetchMensagens();
    setSaving(false);
  };

  const excluir = async (id, autorMsg) => {
    if (autorMsg !== autor) return;
    await supabase.from('lembretes_adm').delete().eq('id', id);
    setMensagens(prev => prev.filter(l => l.id !== id));
  };

  useEffect(() => {
    fetchMensagens();
  }, []);

  return (
    <>
      <Helmet><title>Lembretes — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">Lembretes</h1>

          <Card className="max-w-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-[#003580]" />
                  <CardTitle className="text-base">Mensagens internas</CardTitle>
                </div>
                <button onClick={fetchMensagens} className="text-xs text-[#003580] hover:underline">Atualizar</button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Comunicação interna entre CEO e ADM — somente dentro do app.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Histórico */}
              <div className="space-y-2 min-h-[200px] max-h-[480px] overflow-y-auto pr-1">
                {mensagens.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhuma mensagem ainda.</p>
                ) : (
                  mensagens.map(l => {
                    const minha = l.autor === autor;
                    return (
                      <div key={l.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`group relative max-w-[80%] rounded-2xl px-4 py-2.5 ${minha ? 'bg-[#003580] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{l.texto}</p>
                          <div className={`flex items-center gap-1.5 mt-1 ${minha ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${minha ? 'text-white/60' : 'text-gray-400'}`}>
                              {l.autor === 'ceo' ? 'CEO' : 'ADM'} · {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {minha && l.lida && <CheckCircle2 className="h-3 w-3 text-white/50" />}
                            {minha && !l.lida && <span className="text-[10px] text-white/40">enviado</span>}
                          </div>
                          {minha && (
                            <button
                              onClick={() => excluir(l.id, l.autor)}
                              className="absolute -top-2 -left-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold"
                              title="Excluir"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={msgEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 pt-2 border-t">
                <input
                  placeholder="Escrever mensagem..."
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003580]"
                />
                <button
                  onClick={enviar}
                  disabled={saving || !texto.trim()}
                  className="px-3 py-2 rounded-lg bg-[#003580] text-white hover:bg-[#002060] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminLembretesPage;
