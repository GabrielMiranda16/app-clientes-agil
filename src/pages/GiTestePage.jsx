import React from 'react';
import { Helmet } from 'react-helmet';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const GiTestePage = () => {
  return (
    <>
      <Helmet><title>Fale com a Gi - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="flex flex-col" style={{ height: '78vh' }}>
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Fale com a Gi</h1>
            <p className="text-gray-400 text-sm">Nossa assistente virtual pode te ajudar com dúvidas sobre seguros, apólices, coparticipação e muito mais.</p>
          </div>
          <div className="flex-1 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <iframe
              src="https://agil-seguros.fly.dev/"
              title="Gi — Assistente Virtual Ágil Seguros"
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default GiTestePage;
