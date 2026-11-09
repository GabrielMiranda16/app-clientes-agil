import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { HeartPulse, Car, Plane, Home, PawPrint, Building2, Package, Monitor, Loader2, MessageCircle } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const SEGMENTO_CONFIG = {
  SAUDE_VIDA_ODONTO: { label: 'Saúde, Vida e Odonto', descricao: 'Planos de saúde, seguro de vida e planos odontológicos', Icon: HeartPulse },
  AUTO_FROTA:        { label: 'Auto e Frota',          descricao: 'Proteção completa para veículos e frotas',             Icon: Car      },
  VIAGEM:            { label: 'Viagem',                descricao: 'Cobertura nacional e internacional para viagens',      Icon: Plane    },
  RESIDENCIAL:       { label: 'Residencial',           descricao: 'Proteção completa para sua residência',               Icon: Home     },
  PET_SAUDE:         { label: 'Pet Saúde',             descricao: 'Cuidados veterinários para seu pet',                  Icon: PawPrint },
  EMPRESARIAL:       { label: 'Empresarial',           descricao: 'Proteção para patrimônio e operações empresariais',   Icon: Building2},
  CARGAS:            { label: 'Cargas',                descricao: 'Proteção para transporte de cargas e mercadorias',    Icon: Package  },
  EQUIPAMENTOS:      { label: 'Equipamentos',          descricao: 'Cobertura para equipamentos e maquinários',           Icon: Monitor  },
};

const SelectSegmentoTestePage = () => {
  const { user } = useAuth();
  const { selectedCompanyId, isViewingAsClient } = useCompany();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [apolicesPorSegmento, setApolicesPorSegmento] = useState({});
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const empresaId = user.perfil !== 'CLIENTE' && isViewingAsClient && selectedCompanyId
          ? selectedCompanyId
          : (user.empresa_matriz_id || user.empresa_id);
        if (empresaId) {
          const [empResult, apolices] = await Promise.all([
            supabaseClient.from('empresas').select('*').eq('id', empresaId).single(),
            apolicesService.getApolicesByMatriz(empresaId),
          ]);
          if (empResult.data) setEmpresa(empResult.data);

          const agrupadas = apolices.reduce((acc, ap) => {
            if (!acc[ap.segmento]) acc[ap.segmento] = [];
            acc[ap.segmento].push(ap);
            return acc;
          }, {});
          setApolicesPorSegmento(agrupadas);
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
    navigate(`/select-apolice/${slug}`);
  };

  const segmentosDisponiveis = Object.keys(SEGMENTOS).filter(
    seg => (apolicesPorSegmento[seg]?.length || 0) > 0
  );

  const segmentosNaoContratados = Object.keys(SEGMENTO_CONFIG).filter(
    seg => !segmentosDisponiveis.includes(seg)
  );

  const linkWhatsapp = (label) => {
    const msg = `Olá! Sou cliente da Ágil Seguros e gostaria de saber mais sobre ${label}.`;
    return `https://wa.me/5511999996863?text=${encodeURIComponent(msg)}`;
  };

  const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Meus Seguros - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Meus Seguros</h1>
            {empresaNome && <p className="text-gray-400 text-sm">{empresaNome}</p>}
          </div>

          {segmentosDisponiveis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Nenhum seguro ativo</h2>
              <p className="text-gray-400 mt-2">Entre em contato com o administrador.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {segmentosDisponiveis.map((seg) => {
                const config = SEGMENTO_CONFIG[seg];
                if (!config) return null;
                const { Icon, label, descricao } = config;
                const count = apolicesPorSegmento[seg]?.length || 0;
                return (
                  <motion.div
                    key={seg}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col cursor-pointer"
                    onClick={() => handleSelectSegmento(seg)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#003580]/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#003580]" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-snug mb-1">{label}</p>
                    <p className="text-xs text-gray-400 mb-4 flex-grow">{descricao}</p>
                    <span className="block w-full text-center bg-[#003580] text-white text-xs font-semibold py-2 rounded-full mt-auto">
                      {count} {count === 1 ? 'apólice' : 'apólices'}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {segmentosNaoContratados.length > 0 && (
            <div className="pt-6 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 mb-1">Outros serviços Ágil</h2>
              <p className="text-xs text-gray-400 mb-4">Fale com seu corretor e amplie sua proteção</p>

              <motion.div
                initial="hidden" animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {segmentosNaoContratados.map((seg) => {
                  const config = SEGMENTO_CONFIG[seg];
                  if (!config) return null;
                  const { Icon, label, descricao } = config;
                  return (
                    <motion.a
                      key={seg}
                      href={linkWhatsapp(label)}
                      target="_blank"
                      rel="noopener noreferrer"
                      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                      className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col hover:border-[#003580]/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="font-bold text-gray-900 text-sm leading-snug mb-1">{label}</p>
                      <p className="text-xs text-gray-400 mb-4 flex-grow">{descricao}</p>
                      <span className="flex items-center justify-center gap-1.5 w-full text-center border border-[#003580] text-[#003580] text-xs font-semibold py-2 rounded-full mt-auto">
                        <MessageCircle className="w-3.5 h-3.5" /> Fale com seu corretor
                      </span>
                    </motion.a>
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default SelectSegmentoTestePage;
