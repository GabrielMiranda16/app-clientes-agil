import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
  Building2, Loader2,
  MessageCircle, Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, Shield,
} from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import ApoliceExpandableRow from '@/components/clienteTeste/ApoliceExpandableRow';
import { SEGMENTO_CONFIG, SEGMENTOS_IMPORTANTES } from '@/components/clienteTeste/segmentoConfig';

const ITENS_POR_PAGINA_OPCOES = [5, 10, 15, 25];

const SelectSegmentoTestePage = () => {
  const { user } = useAuth();
  const { selectedCompanyId, isViewingAsClient } = useCompany();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [apolicesPorSegmento, setApolicesPorSegmento] = useState({});
  const [apolicesFlat, setApolicesFlat] = useState([]);
  const [empresa, setEmpresa] = useState(null);

  const [busca, setBusca] = useState('');
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [pagina, setPagina] = useState(1);

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
          setApolicesFlat(apolices || []);

          const agrupadas = (apolices || []).reduce((acc, ap) => {
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
    navigate(`/select-apolice/${slug}/teste`);
  };

  const segmentosDisponiveis = Object.keys(SEGMENTOS).filter(
    seg => (apolicesPorSegmento[seg]?.length || 0) > 0
  );

  const segmentosImportantesContratados = SEGMENTOS_IMPORTANTES.filter(
    seg => segmentosDisponiveis.includes(seg)
  );
  const segmentosOutrosContratados = segmentosDisponiveis.filter(
    seg => !SEGMENTOS_IMPORTANTES.includes(seg)
  );

  const segmentosNaoContratados = Object.keys(SEGMENTO_CONFIG).filter(
    seg => !segmentosDisponiveis.includes(seg)
  );

  const linkWhatsapp = (label) => {
    const msg = `Olá! Sou cliente da Ágil Seguros e gostaria de saber mais sobre ${label}.`;
    return `https://wa.me/5511999996863?text=${encodeURIComponent(msg)}`;
  };

  const apolicesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return apolicesFlat;
    return apolicesFlat.filter((ap) => {
      const label = SEGMENTO_CONFIG[ap.segmento]?.label || '';
      return (
        ap.seguradora?.toLowerCase().includes(termo) ||
        ap.numero_apolice?.toLowerCase().includes(termo) ||
        label.toLowerCase().includes(termo)
      );
    });
  }, [apolicesFlat, busca]);

  const totalPaginas = Math.max(1, Math.ceil(apolicesFiltradas.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const apolicesPagina = apolicesFiltradas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const primeiroNome = (empresa?.razao_social || '').trim().split(' ')[0] || '';
  const horaAtual = new Date().getHours();
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Meus Seguros - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
              {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''}.
            </h1>
            <p className="text-gray-400 text-sm">Esse é o seu painel de seguros.</p>
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
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {segmentosImportantesContratados.map((seg) => {
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

              {segmentosOutrosContratados.length > 0 && (
                <motion.button
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                  onClick={() => navigate('/select-segmento/teste/outros')}
                  className="group flex items-center gap-3 bg-white border border-gray-100 hover:border-[#003580] hover:bg-[#F0F5FC] rounded-2xl shadow-sm px-4 py-2.5 text-left transition-colors"
                >
                  <span className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-gray-700 group-hover:text-[#003580] transition-colors" />
                  </span>
                  <span className="font-bold text-gray-900 text-sm flex-1">Outros Seguros</span>
                  <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#003580] flex items-center justify-center flex-shrink-0 transition-colors">
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                  </span>
                </motion.button>
              )}
            </motion.div>
          )}

          {segmentosNaoContratados.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 mb-1 mt-6">Outros serviços Ágil</h2>
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

          {/* Apólices — lista completa, com busca/paginação */}
          <div className="pt-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Apólices</h2>
            <p className="text-gray-400 text-sm mb-5">Todas suas apólices abaixo.</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                    placeholder="Buscar por Seguradora/Operadora"
                    className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#003580]/20 focus:border-[#003580]"
                  />
                </div>
                <button
                  title="Em breve"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="hidden sm:inline">Itens por página</span>
                <div className="relative">
                  <select
                    value={itensPorPagina}
                    onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPagina(1); }}
                    className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 bg-white focus:outline-none"
                  >
                    {ITENS_POR_PAGINA_OPCOES.map((n) => (
                      <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <span>{paginaAtual} de {totalPaginas}</span>
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual >= totalPaginas}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <span>Apólice</span>
                <span className="hidden sm:block">Vigente desde</span>
                <span className="hidden sm:block">Número da apólice</span>
                <span></span>
              </div>

              {apolicesPagina.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">Nenhuma apólice encontrada.</div>
              ) : (
                apolicesPagina.map((ap) => (
                  <ApoliceExpandableRow key={ap.id} apolice={ap} />
                ))
              )}
            </div>
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default SelectSegmentoTestePage;
