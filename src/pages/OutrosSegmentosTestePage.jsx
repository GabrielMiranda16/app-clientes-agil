import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { motion } from 'framer-motion';
import { HeartPulse, Car, Plane, Home, PawPrint, Building2, Package, Monitor, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const SEGMENTO_CONFIG = {
  SAUDE_VIDA_ODONTO: { label: 'Saúde, Vida e Odonto', Icon: HeartPulse },
  AUTO_FROTA:        { label: 'Auto e Frota',          Icon: Car      },
  VIAGEM:            { label: 'Viagem',                Icon: Plane    },
  RESIDENCIAL:       { label: 'Residencial',           Icon: Home     },
  PET_SAUDE:         { label: 'Pet Saúde',             Icon: PawPrint },
  EMPRESARIAL:       { label: 'Empresarial',           Icon: Building2},
  CARGAS:            { label: 'Cargas',                Icon: Package  },
  EQUIPAMENTOS:      { label: 'Equipamentos',          Icon: Monitor  },
};

const SEGMENTOS_IMPORTANTES = ['SAUDE_VIDA_ODONTO', 'AUTO_FROTA', 'RESIDENCIAL', 'VIAGEM', 'EMPRESARIAL'];

const OutrosSegmentosTestePage = () => {
  const { user } = useAuth();
  const { selectedCompanyId, isViewingAsClient } = useCompany();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [segmentosOutros, setSegmentosOutros] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const empresaId = user.perfil !== 'CLIENTE' && isViewingAsClient && selectedCompanyId
          ? selectedCompanyId
          : (user.empresa_matriz_id || user.empresa_id);
        if (empresaId) {
          const apolices = await apolicesService.getApolicesByMatriz(empresaId);
          const contratados = [...new Set((apolices || []).map(a => a.segmento))];
          setSegmentosOutros(contratados.filter(seg => !SEGMENTOS_IMPORTANTES.includes(seg)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, selectedCompanyId, isViewingAsClient]);

  const handleSelectSegmento = (segmento) => {
    const slug = SEGMENTOS[segmento]?.slug || segmento.toLowerCase().replace(/_/g, '-');
    navigate(`/select-apolice/${slug}/teste`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Outros Seguros - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate('/select-segmento/teste')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Meus Seguros
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Outros Seguros</h1>
            <p className="text-gray-400 text-sm">Demais apólices contratadas.</p>
          </div>

          <motion.div
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {segmentosOutros.map((seg) => {
              const config = SEGMENTO_CONFIG[seg];
              if (!config) return null;
              const { Icon, label } = config;
              return (
                <motion.button
                  key={seg}
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                  onClick={() => handleSelectSegmento(seg)}
                  className="group flex items-center gap-3 bg-white border border-gray-100 hover:border-[#003580] hover:bg-[#F0F5FC] rounded-2xl shadow-sm px-4 py-2.5 text-left transition-colors"
                >
                  <span className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-700 group-hover:text-[#003580] transition-colors" />
                  </span>
                  <span className="font-bold text-gray-900 text-sm flex-1">{label}</span>
                  <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#003580] flex items-center justify-center flex-shrink-0 transition-colors">
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default OutrosSegmentosTestePage;
