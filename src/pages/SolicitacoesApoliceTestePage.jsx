import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { apolicesService } from '@/services/apolicesService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { ArrowLeft, Loader2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const formatDateTime = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const STATUS_STYLE = {
  'PENDENTE':         'bg-amber-50 text-amber-700',
  'EM PROCESSAMENTO': 'bg-blue-50 text-blue-700',
  'CONCLUIDA':        'bg-emerald-50 text-emerald-700',
  'REJEITADA':        'bg-red-50 text-red-700',
};

const SolicitacoesApoliceTestePage = () => {
  const { apoliceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState([]);

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(async (ap) => {
        if (!ap?.empresa_id) return;
        const sol = await solicitacoesService.getSolicitacoesByEmpresa(ap.empresa_id).catch(() => []);
        setSolicitacoes(sol);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Solicitações - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Solicitações</h1>
            <p className="text-gray-400 text-sm">Inclusões e exclusões relacionadas a essa apólice.</p>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-white text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span>Beneficiário</span>
              <span>Tipo</span>
              <span>Data</span>
              <span>Status</span>
            </div>

            {solicitacoes.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                <ClipboardList className="w-8 h-8 text-gray-300" />
                Nenhuma solicitação encontrada.
              </div>
            ) : (
              solicitacoes.map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 items-center px-5 py-4 border-t border-gray-100 first:border-t-0">
                  <span className="font-bold text-gray-900 text-sm truncate">{s.beneficiarios?.nome_completo || '—'}</span>
                  <span className="hidden sm:block text-sm text-gray-900">{s.tipo_solicitacao || '—'}</span>
                  <span className="hidden sm:block text-sm text-gray-900">{formatDateTime(s.data_solicitacao || s.created_at)}</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit ${STATUS_STYLE[s.status] || 'bg-gray-100 text-gray-500'}`}>
                    {s.status || '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default SolicitacoesApoliceTestePage;
