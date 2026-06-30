import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, HeartHandshake, ClipboardList } from 'lucide-react';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/customSupabaseClient';

const AdminSelecaoPage = () => {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState(0);
  const [unreadCEO, setUnreadCEO] = useState(0);

  useEffect(() => {
    supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'SOLICITACAO')
      .then(({ count }) => setPendentes(count || 0))
      .catch(() => {});

    supabase
      .from('lembretes_adm')
      .select('id', { count: 'exact', head: true })
      .eq('autor', 'ceo')
      .eq('lida', false)
      .then(({ count }) => setUnreadCEO(count || 0))
      .catch(() => {});
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
      title: 'Orçamentos',
      description: 'Gerencie orçamentos, documentos e comissões dos parceiros de vendas.',
      route: '/admin/orcamentos',
      badge: pendentes > 0 ? pendentes : null,
    },
    {
      icon: ClipboardList,
      title: 'Lembretes',
      description: 'Mensagens internas entre ADM e CEO.',
      route: '/admin/lembretes',
      badge: unreadCEO > 0 ? unreadCEO : null,
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
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
                  {title === 'Orçamentos' && badge && (
                    <p className="text-xs text-red-300 font-semibold mt-2">
                      {badge} solicitação{badge > 1 ? 'ões' : ''} aguardando resposta
                    </p>
                  )}
                  {title === 'Lembretes' && badge && (
                    <p className="text-xs text-red-300 font-semibold mt-2">
                      {badge} mensagem{badge > 1 ? 'ns' : ''} não lida{badge > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminSelecaoPage;
