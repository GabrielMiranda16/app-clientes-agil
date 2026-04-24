import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft, FileText, CalendarDays, Building, ChevronRight, Loader2, AlertTriangle, Menu, X } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCpfCnpj } from '@/lib/masks';

const STATUS_STYLE = {
  green:  { badge: 'bg-green-100 text-green-800 border-green-200',   label: 'Ativa',             card: 'bg-white border-gray-100'   },
  yellow: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Vencendo em breve', card: 'bg-yellow-50 border-yellow-200' },
  red:    { badge: 'bg-red-100 text-red-800 border-red-200',          label: 'Vencida',           card: 'bg-red-50 border-red-200'   },
  gray:   { badge: 'bg-gray-100 text-gray-600 border-gray-200',       label: 'Sem vigência',      card: 'bg-white border-gray-100'   },
};

const TIPO_LABELS = {
  saude: 'Saúde', Saude: 'Saúde', SAUDE: 'Saúde',
  odonto: 'Odonto', Odonto: 'Odonto', ODONTO: 'Odonto',
  vida: 'Vida', Vida: 'Vida', VIDA: 'Vida',
};
const normalizeTipo = (tipo) => TIPO_LABELS[tipo] || tipo;

const SelectApolice = () => {
  const { segmento } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apolices, setApolices] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const segConfig = SEGMENTOS[segmento] || SEGMENTOS[segmento?.toUpperCase()] || Object.values(SEGMENTOS).find(s => s.slug === segmento);

  useEffect(() => {
    const empresaId = user?.empresa_matriz_id || user?.empresa_id;
    if (!empresaId) { setLoading(false); return; }

    apolicesService.getApolicesByMatriz(empresaId)
      .then(all => {
        const filtered = all.filter(ap => ap.segmento === segmento);
        filtered.sort((a, b) => {
          const aIsMatriz = a.empresa?.tipo === 'MATRIZ' ? 0 : 1;
          const bIsMatriz = b.empresa?.tipo === 'MATRIZ' ? 0 : 1;
          return aIsMatriz - bIsMatriz;
        });
        setApolices(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, segmento]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{segConfig?.label || segmento?.replace(/_/g, ' ').toLowerCase()} - Ágil Seguros</title>
      </Helmet>
      <div className="min-h-screen bg-soft-gradient flex flex-col">

        {/* Header */}
        <header className="z-40" style={{ background: 'transparent' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-24">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/select-segmento')} className="text-white/80 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <img src={logoUrl} alt="Ágil Seguros" className="h-10 sm:h-20 w-auto object-contain" />
              </div>
              <Button variant="ghost" onClick={handleLogout} className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/10 border border-white/20">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Button>
              <button
                className="sm:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                onClick={() => setMobileMenuOpen(v => !v)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-white/10 bg-[#003580]/95 backdrop-blur px-4 py-4 space-y-1">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-semibold text-white">{user?.email}</p>
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1">
                <button onClick={() => { navigate('/select-segmento'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full">
                  <ArrowLeft className="h-5 w-5" /> Meus Seguros
                </button>
                <div className="border-t border-white/10 pt-1 mt-1">
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors w-full">
                    <LogOut className="h-5 w-5" /> Sair
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
          <h1 className="text-2xl font-bold text-white mb-6">{segConfig?.label || segmento?.toLowerCase().replace(/_/g, ' ')}</h1>

          {apolices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-white">Nenhuma apólice encontrada</h2>
              <p className="text-white/60 mt-2">Entre em contato com o administrador.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {apolices.map((apolice) => {
                const isSVDSemVigencia = apolice.segmento === 'SAUDE_VIDA_ODONTO' && !apolice.vigencia_fim;
                const statusRaw = apolicesService.getStatusApolice(apolice.vigencia_fim);
                const status = isSVDSemVigencia ? { color: 'green', dias: undefined } : statusRaw;
                const style = STATUS_STYLE[status.color];

                return (
                  <motion.div
                    key={apolice.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      onClick={() => navigate(`/apolice/${apolice.id}`)}
                      className={`relative w-full p-6 rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col gap-4 cursor-pointer border ${style.card}`}
                    >
                      {(status.color === 'yellow' || status.color === 'red') && (
                        <div className="absolute top-3 right-3">
                          <AlertTriangle className={`h-5 w-5 ${status.color === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />
                        </div>
                      )}

                      <div>
                        {/* Empresa: nome + tipo + CNPJ */}
                        {apolice.empresa && (
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-gray-400 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-700 leading-tight">
                                {apolice.empresa.nome_fantasia || apolice.empresa.razao_social}
                                <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${apolice.empresa.tipo === 'MATRIZ' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {apolice.empresa.tipo === 'MATRIZ' ? 'Matriz' : 'Filial'}
                                </span>
                              </p>
                              {apolice.empresa.cnpj && (
                                <p className="text-xs text-gray-400">{apolice.empresa.cnpj.replace(/\D/g,'').length === 11 ? 'CPF' : 'CNPJ'} {formatCpfCnpj(apolice.empresa.cnpj)}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Sub-apólices SVD ou número principal */}
                        {(() => {
                          const subs = apolice.dados_adicionais?.sub_apolices?.filter(s => s.tipo || s.numero);
                          if (subs?.length > 0) {
                            return (
                              <div className="space-y-0.5">
                                {subs.map((s, i) => (
                                  <p key={i} className="text-sm font-bold text-gray-800">
                                    {s.tipo && <span className="text-[#003580]">{normalizeTipo(s.tipo)}</span>}
                                    {s.numero && <span className="font-normal text-gray-600"> · Apólice {s.numero}</span>}
                                    {s.seguradora && <span className="font-normal text-[#0B7EC4] text-xs"> · {s.seguradora}</span>}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <>
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Apólice</p>
                              <p className="text-lg font-bold text-gray-800">{apolice.numero_apolice || (isSVDSemVigencia ? 'Plano Saúde/Vida/Odonto' : '—')}</p>
                              {apolice.seguradora && (
                                <p className="text-sm text-[#0B7EC4] mt-0.5">{apolice.seguradora}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CalendarDays className="h-4 w-4 text-gray-400" />
                          {isSVDSemVigencia ? (
                            <span>Ativo desde {formatDate(apolice.vigencia_inicio || apolice.created_at?.split('T')[0])}</span>
                          ) : (
                            <span>{formatDate(apolice.vigencia_inicio)} → {formatDate(apolice.vigencia_fim)}</span>
                          )}
                        </div>
                        {status.dias !== undefined && status.color !== 'green' && (
                          <p className="text-xs text-gray-400">
                            {status.color === 'red'
                              ? `Venceu há ${Math.abs(status.dias)} dias`
                              : `Vence em ${status.dias} dias`}
                          </p>
                        )}
                        {isSVDSemVigencia && (
                          <p className="text-xs text-green-600">Plano contínuo</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className={`border ${style.badge}`}>{isSVDSemVigencia ? 'Ativa' : style.label}</Badge>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>
      <ChatWidget />
    </>
  );
};

export default SelectApolice;
