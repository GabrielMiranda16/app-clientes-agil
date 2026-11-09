import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import ApoliceExpandableRow from '@/components/clienteTeste/ApoliceExpandableRow';

const SelectApoliceTestePage = () => {
  const { segmento } = useParams();
  const { user } = useAuth();
  const { selectedCompanyId, isViewingAsClient } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apolices, setApolices] = useState([]);

  const segConfig = SEGMENTOS[segmento] || SEGMENTOS[segmento?.toUpperCase()] || Object.values(SEGMENTOS).find(s => s.slug === segmento);

  useEffect(() => {
    const empresaId = user?.perfil !== 'CLIENTE' && isViewingAsClient && selectedCompanyId
      ? selectedCompanyId
      : (user?.empresa_matriz_id || user?.empresa_id);
    if (!empresaId) { setLoading(false); return; }

    apolicesService.getApolicesByMatriz(empresaId)
      .then(all => {
        const filtered = all.filter(ap => ap.segmento?.toLowerCase().replace(/_/g, '-') === segmento?.toLowerCase().replace(/_/g, '-'));
        setApolices(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, segmento, selectedCompanyId, isViewingAsClient]);

  const segLabel = segConfig?.label || segmento?.toLowerCase().replace(/_/g, ' ');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{segLabel} - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate('/select-segmento/teste')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Meus Seguros
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">{segLabel}</h1>
            <p className="text-gray-400 text-sm">{apolices.length} {apolices.length === 1 ? 'apólice encontrada' : 'apólices encontradas'}</p>
          </div>

          {apolices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Nenhuma apólice encontrada</h2>
              <p className="text-gray-400 mt-2">Entre em contato com o administrador.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <span>Apólice</span>
                <span className="hidden sm:block">Vigente desde</span>
                <span className="hidden sm:block">Número da apólice</span>
                <span></span>
              </div>
              {apolices.map((ap) => (
                <ApoliceExpandableRow key={ap.id} apolice={ap} showSegmento={false} />
              ))}
            </div>
          )}
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default SelectApoliceTestePage;
