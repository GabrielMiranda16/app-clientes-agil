import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { SEGURADORAS } from '@/data/seguradoras';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const STATUS_STYLE = {
  green:  { bar: 'bg-emerald-500',  chip: 'bg-emerald-50 text-emerald-700',  label: 'Ativa'             },
  yellow: { bar: 'bg-amber-500',    chip: 'bg-amber-50 text-amber-700',      label: 'Vencendo em breve' },
  red:    { bar: 'bg-red-500',      chip: 'bg-red-50 text-red-700',          label: 'Vencida'           },
  gray:   { bar: 'bg-gray-300',     chip: 'bg-gray-100 text-gray-500',       label: 'Sem vigência'      },
};

const TIPO_LABELS = { saude: 'Saúde', odonto: 'Odonto', vida: 'Vida' };
const normalizeTipo = (tipo) => TIPO_LABELS[tipo?.toLowerCase()] || tipo;

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

// % do período já decorrido entre início e fim de vigência — alimenta a
// barra de progresso visual do card (o "surpresa" pedido: em vez de só um
// selo de status, dá pra ver de relance o quanto falta pra vencer).
const progressoVigencia = (inicio, fim) => {
  if (!inicio || !fim) return null;
  const ini = new Date(inicio).getTime();
  const end = new Date(fim).getTime();
  const hoje = Date.now();
  if (end <= ini) return null;
  return Math.min(100, Math.max(0, ((hoje - ini) / (end - ini)) * 100));
};

const logoDaSeguradora = (nome) => SEGURADORAS.find(s => s.nome === nome)?.logo;

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
        filtered.sort((a, b) => {
          const aIsMatriz = a.empresa?.tipo === 'MATRIZ' ? 0 : 1;
          const bIsMatriz = b.empresa?.tipo === 'MATRIZ' ? 0 : 1;
          return aIsMatriz - bIsMatriz;
        });
        setApolices(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, segmento, selectedCompanyId, isViewingAsClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  const segLabel = segConfig?.label || segmento?.toLowerCase().replace(/_/g, ' ');

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
            <motion.div
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {apolices.map((apolice) => {
                const isSVDSemVigencia = apolice.segmento === 'SAUDE_VIDA_ODONTO' && !apolice.vigencia_fim;
                const statusRaw = apolicesService.getStatusApolice(apolice.vigencia_fim);
                const status = isSVDSemVigencia ? { color: 'green', dias: undefined } : statusRaw;
                const style = STATUS_STYLE[status.color];
                const progresso = isSVDSemVigencia ? null : progressoVigencia(apolice.vigencia_inicio, apolice.vigencia_fim);
                const logo = logoDaSeguradora(apolice.seguradora);
                const subs = apolice.dados_adicionais?.sub_apolices?.filter(s => s.tipo || s.numero);

                return (
                  <motion.button
                    key={apolice.id}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                    onClick={() => navigate(`/apolice/${apolice.id}`)}
                    className="group text-left bg-white border border-gray-100 hover:border-[#003580]/30 rounded-2xl shadow-sm hover:shadow-md p-5 flex flex-col gap-4 transition-all"
                  >
                    {/* Seguradora + status */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {logo ? <img src={logo} alt={apolice.seguradora} className="w-full h-full object-contain p-1.5" /> : <Building2 className="w-4 h-4 text-gray-400" />}
                        </span>
                        <span className="font-bold text-gray-900 text-sm truncate">{apolice.seguradora || 'Seguradora'}</span>
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${style.chip}`}>
                        {isSVDSemVigencia ? 'Ativa' : style.label}
                      </span>
                    </div>

                    {/* Empresa (matriz/filial), quando o grupo tem mais de uma empresa */}
                    {apolice.empresa && (
                      <div className="flex items-center gap-1.5 -mt-2 text-xs text-gray-400">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{apolice.empresa.nome_fantasia || apolice.empresa.razao_social}</span>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${apolice.empresa.tipo === 'MATRIZ' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {apolice.empresa.tipo === 'MATRIZ' ? 'Matriz' : 'Filial'}
                        </span>
                      </div>
                    )}

                    {/* Número(s) da apólice */}
                    <div className="flex-1">
                      {subs?.length > 0 ? (
                        <div className="space-y-2.5">
                          {subs.map((s, i) => (
                            <div key={i}>
                              {s.tipo && <p className="text-[11px] text-[#003580] font-bold uppercase tracking-wide">{normalizeTipo(s.tipo)}</p>}
                              <p className="text-sm font-semibold text-gray-700">{s.numero || '—'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Número da apólice</p>
                          <p className="text-sm font-semibold text-gray-700">{apolice.numero_apolice || (isSVDSemVigencia ? 'Plano Saúde/Vida/Odonto' : '—')}</p>
                        </div>
                      )}
                    </div>

                    {/* Barra de vigência */}
                    <div className="pt-1">
                      {isSVDSemVigencia ? (
                        <p className="text-xs text-emerald-600 font-medium">Plano contínuo</p>
                      ) : progresso !== null ? (
                        <>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${progresso}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400">
                            <span>{formatDate(apolice.vigencia_inicio)}</span>
                            <span>{formatDate(apolice.vigencia_fim)}</span>
                          </div>
                          {status.dias !== undefined && status.color !== 'green' && (
                            <p className="text-xs font-medium mt-1" style={{ color: status.color === 'red' ? '#dc2626' : '#d97706' }}>
                              {status.color === 'red' ? `Venceu há ${Math.abs(status.dias)} dias` : `Vence em ${status.dias} dias`}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Sem data de vigência</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#003580] flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default SelectApoliceTestePage;
