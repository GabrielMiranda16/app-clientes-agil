import React from 'react';
import { Helmet } from 'react-helmet';
import { Phone, Globe } from 'lucide-react';
import { SEGURADORAS } from '@/data/seguradoras';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const SeguradorasTestePage = () => {
  return (
    <>
      <Helmet><title>Seguradoras - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Seguradoras</h1>
            <p className="text-gray-400 text-sm">Nossas parceiras — contato direto para emergências e dúvidas</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEGURADORAS.map((s) => (
              <div key={s.nome} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col">
                <div className="h-10 flex items-center mb-4">
                  <img src={s.logo} alt={s.nome} className="h-8 max-w-[140px] object-contain" />
                </div>
                <p className="font-bold text-gray-900 text-sm mb-3">{s.nome}</p>
                <div className="space-y-2 mt-auto">
                  {s.phone && (
                    <a href={`tel:${s.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-[#003580] hover:underline">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {s.phone}
                    </a>
                  )}
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#003580] transition-colors">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" /> Site
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default SeguradorasTestePage;
