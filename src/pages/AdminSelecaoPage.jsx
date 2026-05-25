import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, HeartHandshake } from 'lucide-react';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout';

const AdminSelecaoPage = () => {
  const navigate = useNavigate();

  const cards = [
    {
      icon: Users,
      title: 'Clientes',
      description: 'Gerencie empresas, apólices, beneficiários e solicitações dos clientes.',
      route: '/admin',
    },
    {
      icon: HeartHandshake,
      title: 'Parceiros',
      description: 'Gerencie orçamentos, documentos e comissões dos parceiros de vendas.',
      route: '/admin/parceiros',
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
            {cards.map(({ icon: Icon, title, description, route }, i) => (
              <motion.button
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(route)}
                className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                <div className="p-4 rounded-full bg-white/10">
                  <Icon className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{title}</p>
                  <p className="text-sm text-white/70 mt-1">{description}</p>
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
