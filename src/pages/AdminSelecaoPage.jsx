import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, HeartHandshake, ClipboardList, CheckCircle2, Send } from 'lucide-react';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

const AdminSelecaoPage = () => {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState(0);

  // Lembretes CEO↔ADM
  const [lembretesAdm, setLembretesAdm] = useState([]);
  const [textoAdm, setTextoAdm] = useState('');
  const [savingAdm, setSavingAdm] = useState(false);
  const [unreadCEO, setUnreadCEO] = useState(0);
  const msgEndRef = useRef(null);

  useEffect(() => {
    supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'SOLICITACAO')
      .then(({ count }) => setPendentes(count || 0))
      .catch(() => {});
  }, []);

  const fetchLembretesAdm = async () => {
    const { data } = await supabase.from('lembretes_adm').select('*').order('created_at', { ascending: true });
    setLembretesAdm(data || []);
    const unread = (data || []).filter(l => l.autor === 'ceo' && !l.lida);
    setUnreadCEO(unread.length);
    if (unread.length > 0) {
      await supabase.from('lembretes_adm').update({ lida: true }).in('id', unread.map(l => l.id));
    }
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const enviarMensagemAdm = async () => {
    if (!textoAdm.trim() || savingAdm) return;
    setSavingAdm(true);
    await supabase.from('lembretes_adm').insert({ texto: textoAdm.trim(), autor: 'adm', lida: false });
    setTextoAdm('');
    await fetchLembretesAdm();
    setSavingAdm(false);
  };

  useEffect(() => {
    fetchLembretesAdm();
  }, []);

  const cards = [
    {
      icon: Users,
      title: 'Clientes',
      description: 'Gerencie empresas, apólices, beneficiários e solicitações dos clientes.',
      route: '/admin/clientes',
      badge: null,
    },
    {
      icon: HeartHandshake,
      title: 'Parceiros',
      description: 'Gerencie orçamentos, documentos e comissões dos parceiros de vendas.',
      route: '/admin/parceiros',
      badge: pendentes > 0 ? pendentes : null,
    },
  ];

  return (
    <>
      <Helmet><title>Área do ADM — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <h1 className="text-2xl font-bold tracking-tight text-white">O que deseja gerenciar?</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            {cards.map(({ icon: Icon, title, description, route, badge }, i) => (
              <motion.button
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(route)}
                className="relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                {badge && (
                  <span className="absolute top-3 right-3 flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                    {badge}
                  </span>
                )}
                <div className="p-4 rounded-full bg-white/10">
                  <Icon className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{title}</p>
                  <p className="text-sm text-white/70 mt-1">{description}</p>
                  {badge && (
                    <p className="text-xs text-red-300 font-semibold mt-2">
                      {badge} solicitação{badge > 1 ? 'ões' : ''} aguardando resposta
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Card Lembretes CEO↔ADM */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-2xl">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[#003580]" />
                    <CardTitle className="text-base">Lembretes</CardTitle>
                    {unreadCEO > 0 && (
                      <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">{unreadCEO}</span>
                    )}
                  </div>
                  <button onClick={fetchLembretesAdm} className="text-xs text-[#003580] hover:underline">Atualizar</button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Mensagens internas com o CEO.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Histórico */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {lembretesAdm.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem ainda.</p>
                  ) : (
                    lembretesAdm.map(l => (
                      <div key={l.id} className={`flex ${l.autor === 'adm' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${l.autor === 'adm' ? 'bg-[#003580] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                          <p className="text-sm">{l.texto}</p>
                          <div className={`flex items-center gap-1.5 mt-1 ${l.autor === 'adm' ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${l.autor === 'adm' ? 'text-white/60' : 'text-gray-400'}`}>
                              {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {l.autor === 'adm' && l.lida && <CheckCircle2 className="h-3 w-3 text-white/50" />}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={msgEndRef} />
                </div>
                {/* Input */}
                <div className="flex gap-2 pt-2 border-t">
                  <input
                    placeholder="Responder ao CEO..."
                    value={textoAdm}
                    onChange={e => setTextoAdm(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') enviarMensagemAdm(); }}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003580]"
                  />
                  <button
                    onClick={enviarMensagemAdm}
                    disabled={savingAdm || !textoAdm.trim()}
                    className="px-3 py-2 rounded-lg bg-[#003580] text-white hover:bg-[#002060] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminSelecaoPage;
