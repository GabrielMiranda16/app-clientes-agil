import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';

import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, CalendarDays, Building, DollarSign,
  Download, AlertTriangle, CheckCircle, Clock, Loader2,
  Car, Plane, Home, PawPrint, Building2, HeartPulse,
  Users, ClipboardList, ChevronRight, Package, Monitor,
  Menu, X, LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCpfCnpj } from '@/lib/masks';

const SEGMENTO_ICONS = {
  AUTO_FROTA:        Car,
  VIAGEM:            Plane,
  RESIDENCIAL:       Home,
  PET_SAUDE:         PawPrint,
  EMPRESARIAL:       Building2,
  SAUDE_VIDA_ODONTO: HeartPulse,
  CARGAS:            Package,
  EQUIPAMENTOS:      Monitor,
};

const STATUS_CONFIG = {
  green:  { icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800',  label: 'Ativa' },
  yellow: { icon: Clock,         color: 'text-yellow-500', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800', label: 'Vencendo em breve' },
  red:    { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800',      label: 'Vencida' },
  gray:   { icon: FileText,      color: 'text-gray-400',   bg: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-600',    label: 'Sem vigência' },
};

const STATUS_SOL_COLORS = {
  'PENDENTE':          'bg-yellow-100 text-yellow-800',
  'EM PROCESSAMENTO':  'bg-blue-100 text-blue-800',
  'CONCLUIDA':         'bg-green-100 text-green-800',
  'REJEITADA':         'bg-red-100 text-red-800',
};

const ApoliceDashboard = () => {
  const { apoliceId } = useParams();
  const { user, logout } = useAuth();
  const { setSelectedCompanyId } = useCompany();
  const navigate = useNavigate();

  const isAdmin = user?.perfil === 'CEO' || user?.perfil === 'ADM';
  const isCliente = user?.perfil === 'CLIENTE';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  const [loading, setLoading] = useState(true);
  const [apolice, setApolice] = useState(null);

  // Tabs de Beneficiários/Solicitações/Coparticipação apenas para SVD (só ADM)
  const isSVD = apolice?.segmento === 'SAUDE_VIDA_ODONTO';
  const showTabs = isAdmin && isSVD;
  const showGestaoButton = isCliente && isSVD;
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [loadingBen, setLoadingBen] = useState(false);
  const [loadingSol, setLoadingSol] = useState(false);
  const [loadingCopat, setLoadingCopat] = useState(false);

  const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(async (ap) => {
        setApolice(ap);
        if (ap?.empresa_id) {
          setLoadingBen(true);
          setLoadingSol(true);
          const isSVDSegmento = ap.segmento === 'SAUDE_VIDA_ODONTO';
          if (isSVDSegmento) setLoadingCopat(true);
          const [ben, sol, copat] = await Promise.all([
            beneficiariosService.getBeneficiariosByEmpresa(ap.empresa_id).catch(() => []),
            solicitacoesService.getSolicitacoesByEmpresa(ap.empresa_id).catch(() => []),
            isSVDSegmento ? coparticipacaoService.getCoparticipacoesByEmpresa(ap.empresa_id).catch(() => []) : Promise.resolve([]),
          ]);
          setBeneficiarios(ben);
          setSolicitacoes(sol);
          setCoparticipacoes(copat);
          setLoadingBen(false);
          setLoadingSol(false);
          setLoadingCopat(false);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const formatCurrency = (v) => {
    if (!v) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const goToCoparticipacao = () => {
    setSelectedCompanyId(Number(apolice.empresa_id));
    navigate('/coparticipacao');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!apolice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-gradient">
        <FileText className="h-12 w-12 text-white/30 mb-4" />
        <p className="text-white/70">Apólice não encontrada.</p>
        <Button className="mt-4 border-white/30 text-white hover:bg-white/10" variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const isSVDSemVigencia = isSVD && !apolice.vigencia_fim;
  const statusRaw = apolicesService.getStatusApolice(apolice.vigencia_fim);
  const status = isSVDSemVigencia ? { color: 'green', dias: undefined } : statusRaw;
  const statusCfg = STATUS_CONFIG[status.color];
  const StatusIcon = statusCfg.icon;
  const SegIcon = SEGMENTO_ICONS[apolice.segmento] || FileText;
  const segLabel = SEGMENTOS[apolice.segmento]?.label || apolice.segmento;

  const pendentes = solicitacoes.filter(s => s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO').length;

  return (
    <>
      <Helmet>
        <title>Apólice {apolice.numero_apolice || apoliceId} - Ágil Seguros</title>
      </Helmet>
      <div className="min-h-screen bg-soft-gradient flex flex-col">

        {/* Header */}
        <header className="z-40" style={{ background: 'transparent' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-24">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/80 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <img src={logoUrl} alt="Ágil Seguros" className="h-10 sm:h-20 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 text-white/80 text-sm">
                  <SegIcon className="h-4 w-4" />
                  <span>{segLabel}</span>
                </div>
                <button
                  className="sm:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                  onClick={() => setMobileMenuOpen(v => !v)}
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {(() => {
                  if (apolice.numero_apolice) return `Apólice ${apolice.numero_apolice}`;
                  if (isSVD) {
                    const nums = (apolice.dados_adicionais?.sub_apolices || []).map(s => s.numero).filter(Boolean);
                    if (nums.length > 0) return `Apólice ${nums.join(' / ')}`;
                  }
                  return segLabel;
                })()}
              </h1>
              {apolice.empresas && (
                <p className="text-white/90 text-base font-medium mt-0.5 flex items-center gap-1.5">
                  {apolice.empresas.nome_fantasia || apolice.empresas.razao_social}
                  {apolice.empresas.tipo && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${apolice.empresas.tipo === 'MATRIZ' ? 'bg-blue-500/30 text-blue-200' : 'bg-white/20 text-white/80'}`}>
                      {apolice.empresas.tipo === 'MATRIZ' ? 'Matriz' : 'Filial'}
                    </span>
                  )}
                </p>
              )}
            </div>
            {showGestaoButton && (
              <Button variant="ghost" onClick={() => navigate(`/cliente/${apolice.empresa_id}`)} className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20">
                <Users className="mr-2 h-4 w-4" /> Acessar Gestão <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Tabs defaultValue="dados" className="space-y-4">
              <TabsList className={`bg-white/10 w-full ${showTabs ? 'flex overflow-x-auto sm:grid sm:grid-cols-4' : 'grid grid-cols-1'}`}>
                <TabsTrigger value="dados" className="flex-shrink-0 text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
                  <FileText className="h-4 w-4 mr-1.5" /> Apólice
                </TabsTrigger>
                {showTabs && (
                  <>
                    <TabsTrigger value="beneficiarios" className="flex-shrink-0 text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
                      <Users className="h-4 w-4 mr-1.5" />
                      Beneficiários
                      {isAdmin && !loadingBen && <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{beneficiarios.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="solicitacoes" className="flex-shrink-0 text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
                      <ClipboardList className="h-4 w-4 mr-1.5" />
                      Solicitações
                      {isAdmin && pendentes > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendentes}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="coparticipacao" className="flex-shrink-0 text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
                      <DollarSign className="h-4 w-4 mr-1.5" /> Coparticipação
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Tab: Dados da Apólice */}
              <TabsContent value="dados">
                <div className="max-w-4xl mx-auto space-y-4">
                  {(status.color === 'yellow' || status.color === 'red') && (
                    <div className={`${statusCfg.bg} border rounded-xl p-4 flex items-center gap-3`}>
                      <StatusIcon className={`h-5 w-5 ${statusCfg.color} flex-shrink-0`} />
                      <div>
                        <p className={`font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                        <p className="text-sm text-gray-600">
                          {status.color === 'red'
                            ? `Esta apólice venceu há ${Math.abs(status.dias)} dias.`
                            : `Esta apólice vence em ${status.dias} dias.`}
                        </p>
                      </div>
                    </div>
                  )}

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Dados da Apólice</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
                          <Badge className={statusCfg.badge}><StatusIcon className="h-3 w-3 mr-1" />{statusCfg.label}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Segmento</p>
                          <p className="font-semibold text-gray-800">{segLabel}</p>
                        </div>
                        {!isSVD && (
                          <>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Número da Apólice</p>
                              <p className="font-semibold text-gray-800">{apolice.numero_apolice || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Seguradora</p>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <p className="font-semibold text-gray-800">{apolice.seguradora || '—'}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {isSVD && (apolice.dados_adicionais?.sub_apolices || []).length > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          {apolice.dados_adicionais.sub_apolices.map((sub, i) => {
                            const tipoLabel = sub.tipo === 'saude' ? 'Saúde' : sub.tipo === 'vida' ? 'Vida' : sub.tipo === 'odonto' ? 'Odonto' : sub.tipo;
                            return (
                              <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">Tipo</p>
                                  <p className="font-semibold text-gray-800">{tipoLabel || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">Número da Apólice</p>
                                  <p className="font-semibold text-gray-800">{sub.numero || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">Seguradora</p>
                                  <p className="font-semibold text-gray-800">{sub.seguradora || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">Prêmio</p>
                                  <p className="font-semibold text-gray-800">{sub.valor_premio ? formatCurrency(sub.valor_premio) : '—'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {(apolice.vigencia_inicio || apolice.vigencia_fim || isSVDSemVigencia) && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" /> {isSVDSemVigencia ? 'Data de Inclusão' : 'Vigência'}</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isSVDSemVigencia ? 'Data de Inclusão do Plano' : 'Início'}</p>
                          <p className="font-semibold text-gray-800">{formatDate(apolice.vigencia_inicio || (isSVDSemVigencia ? apolice.created_at?.split('T')[0] : null))}</p>
                        </div>
                        {!isSVDSemVigencia && (
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Término</p>
                            <p className={`font-semibold ${status.color === 'red' ? 'text-red-600' : status.color === 'yellow' ? 'text-yellow-600' : 'text-gray-800'}`}>
                              {formatDate(apolice.vigencia_fim)}
                            </p>
                          </div>
                        )}
                        {isSVDSemVigencia && (
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Término</p>
                            <p className="font-semibold text-green-600">Plano contínuo</p>
                          </div>
                        )}
                        {status.dias !== undefined && !isSVDSemVigencia && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Dias restantes</p>
                            <p className={`font-semibold ${status.color === 'red' ? 'text-red-600' : status.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                              {status.color === 'red' ? `Vencida há ${Math.abs(status.dias)} dias` : `${status.dias} dias`}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {apolice.valor_premio && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4" /> Valor</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prêmio</p>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(apolice.valor_premio)}</p>
                      </CardContent>
                    </Card>
                  )}

                  {apolice.descricao && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
                      <CardContent><p className="text-gray-600 text-sm leading-relaxed">{apolice.descricao}</p></CardContent>
                    </Card>
                  )}

                  {/* Dados Adicionais por Segmento */}
                  {apolice.dados_adicionais && apolice.segmento === 'AUTO_FROTA' && (apolice.dados_adicionais.veiculos || []).length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Car className="h-4 w-4" /> Veículos</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {apolice.dados_adicionais.veiculos.map((v, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-800 text-sm">{v.placa || `Veículo ${i+1}`}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1 text-xs text-gray-500">
                              {v.marca && <span>Marca: {v.marca}</span>}
                              {v.modelo && <span>Modelo: {v.modelo}</span>}
                              {v.cor && <span>Cor: {v.cor}</span>}
                              {v.ano && <span>Ano: {v.ano}</span>}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {apolice.dados_adicionais && apolice.segmento === 'VIAGEM' && (apolice.dados_adicionais.segurados || []).length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plane className="h-4 w-4" /> Segurados</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {apolice.dados_adicionais.segurados.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-gray-800">{s.nome || '—'}</span>
                              <span className="text-gray-400 text-xs">{s.cpf ? formatCpfCnpj(s.cpf) : ''}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {apolice.dados_adicionais && (apolice.segmento === 'RESIDENCIAL' || apolice.segmento === 'EMPRESARIAL') && apolice.dados_adicionais.rua && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Home className="h-4 w-4" /> Endereço do Risco</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-gray-800 text-sm">
                          {[apolice.dados_adicionais.rua, apolice.dados_adicionais.numero && `nº ${apolice.dados_adicionais.numero}`, apolice.dados_adicionais.complemento, apolice.dados_adicionais.bairro, apolice.dados_adicionais.cidade && apolice.dados_adicionais.estado ? `${apolice.dados_adicionais.cidade}/${apolice.dados_adicionais.estado}` : apolice.dados_adicionais.cidade, apolice.dados_adicionais.cep && `CEP ${apolice.dados_adicionais.cep}`].filter(Boolean).join(', ')}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {apolice.dados_adicionais && apolice.segmento === 'PET_SAUDE' && apolice.dados_adicionais.nome_pet && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PawPrint className="h-4 w-4" /> Dados do Pet</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-gray-400 uppercase">Nome</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.nome_pet}</p></div>
                        {apolice.dados_adicionais.especie && <div><p className="text-xs text-gray-400 uppercase">Espécie</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.especie}</p></div>}
                        {apolice.dados_adicionais.raca && <div><p className="text-xs text-gray-400 uppercase">Raça</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.raca}</p></div>}
                        {apolice.dados_adicionais.idade && <div><p className="text-xs text-gray-400 uppercase">Idade</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.idade}</p></div>}
                      </CardContent>
                    </Card>
                  )}

                  {apolice.dados_adicionais && apolice.segmento === 'EQUIPAMENTOS' && (apolice.dados_adicionais.marca || apolice.dados_adicionais.tipo_equipamento) && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Monitor className="h-4 w-4" /> Equipamento</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {apolice.dados_adicionais.tipo_equipamento && <div><p className="text-xs text-gray-400 uppercase">Tipo</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.tipo_equipamento}</p></div>}
                        {apolice.dados_adicionais.marca && <div><p className="text-xs text-gray-400 uppercase">Marca</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.marca}</p></div>}
                        {apolice.dados_adicionais.modelo && <div><p className="text-xs text-gray-400 uppercase">Modelo</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.modelo}</p></div>}
                        {apolice.dados_adicionais.numero_serie && <div><p className="text-xs text-gray-400 uppercase">Série</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.numero_serie}</p></div>}
                        {apolice.dados_adicionais.memoria_armazenamento && <div><p className="text-xs text-gray-400 uppercase">Armazenamento</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.memoria_armazenamento}</p></div>}
                        {apolice.dados_adicionais.outros_detalhes && <div className="col-span-2"><p className="text-xs text-gray-400 uppercase">Outros</p><p className="font-semibold text-gray-800">{apolice.dados_adicionais.outros_detalhes}</p></div>}
                      </CardContent>
                    </Card>
                  )}

                  {isSVD && (apolice.dados_adicionais?.sub_apolices || []).length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4" /> Contratos</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {apolice.dados_adicionais.sub_apolices.map((sub, i) => {
                          const tipoLabel = sub.tipo === 'saude' ? 'Saúde' : sub.tipo === 'vida' ? 'Vida' : sub.tipo === 'odonto' ? 'Odonto' : sub.tipo;
                          return (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{tipoLabel || `Apólice ${i + 1}`}</p>
                                {sub.seguradora && <p className="text-xs text-gray-500">{sub.seguradora}</p>}
                                {sub.numero && <p className="text-xs text-gray-400">Nº {sub.numero}</p>}
                              </div>
                              {sub.contrato_url ? (
                                <a href={sub.contrato_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline"><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button>
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">Sem contrato</span>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                  {!isSVD && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4" /> Contrato</CardTitle></CardHeader>
                      <CardContent>
                        {apolice.contrato_url ? (
                          <a href={apolice.contrato_url} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" />Baixar Contrato (PDF)</Button>
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400">Nenhum contrato disponível. Entre em contato com o administrador.</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                </div>
              </TabsContent>

              {/* Tab: Beneficiários */}
              {showTabs && (
                <TabsContent value="beneficiarios">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4" /> Beneficiários
                      </CardTitle>
                      <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => navigate(`/cliente/${apolice.empresa_id}`)}>
                        Gerenciar <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingBen ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                      ) : (() => {
                        const ativos = beneficiarios.filter(b => !b.data_exclusao);
                        const saude  = ativos.filter(b => b.saude_ativo);
                        const odonto = ativos.filter(b => b.odonto_ativo);
                        const vida   = ativos.filter(b => b.vida_ativo);
                        const cards = [
                          { label: 'Beneficiários Ativos', value: ativos.length,  color: 'bg-[#003580]', text: 'text-white' },
                          { label: 'Planos de Saúde',      value: saude.length,   color: 'bg-[#003580]/10', text: 'text-[#003580]' },
                          { label: 'Planos de Odonto',     value: odonto.length,  color: 'bg-[#003580]/10', text: 'text-[#003580]' },
                          { label: 'Seguros de Vida',      value: vida.length,    color: 'bg-[#003580]/10', text: 'text-[#003580]' },
                        ];
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              {cards.map(({ label, value, color, text }) => (
                                <div key={label} className={`${color} rounded-xl p-4`}>
                                  <p className={`text-xs font-semibold uppercase mb-1 ${text} opacity-70`}>{label}</p>
                                  <p className={`text-3xl font-bold ${text}`}>{value}</p>
                                </div>
                              ))}
                            </div>
                            <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => navigate(`/cliente/${apolice.empresa_id}`)}>
                              Ver e gerenciar beneficiários <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Tab: Solicitações */}
              {showTabs && (
                <TabsContent value="solicitacoes">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4" /> Solicitações
                        {isAdmin && pendentes > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>}
                      </CardTitle>
                      <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => {
                        if (isAdmin) { setSelectedCompanyId(Number(apolice.empresa_id)); navigate('/solicitacoes'); }
                        else navigate(`/cliente/${apolice.empresa_id}`);
                      }}>
                        {isAdmin ? 'Gerenciar' : 'Ver'} <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingSol ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                      ) : solicitacoes.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhuma solicitação registrada.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {[...solicitacoes].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5).map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border text-sm">
                              <div>
                                <p className="font-medium text-gray-800">{s.tipo_solicitacao}</p>
                                <p className="text-xs text-gray-400">{s.beneficiarios?.nome_completo || '—'}</p>
                              </div>
                              <Badge className={STATUS_SOL_COLORS[s.status] || 'bg-gray-100 text-gray-600'}>{s.status}</Badge>
                            </div>
                          ))}
                          {solicitacoes.length > 5 && (
                            <p className="text-xs text-gray-400 text-center pt-1">+{solicitacoes.length - 5} outras</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Tab: Coparticipação */}
              {showTabs && (
                <TabsContent value="coparticipacao">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <DollarSign className="h-4 w-4" /> Coparticipação
                        {(() => { const now = new Date(); return <span className="text-xs font-normal text-gray-400 ml-1">{String(now.getMonth()+1).padStart(2,'0')}/{now.getFullYear()}</span>; })()}
                      </CardTitle>
                      <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => {
                        if (isAdmin) goToCoparticipacao();
                        else navigate(`/cliente/${apolice.empresa_id}/coparticipacao`);
                      }}>
                        {isAdmin ? 'Gerenciar' : 'Ver'} <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingCopat ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                      ) : (() => {
                        const now = new Date();
                        const periodo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
                        const doMes = coparticipacoes.filter(c => c.competencia === periodo);
                        const totalSaude = doMes.filter(c => c.tipo === 'saude' || !c.tipo).reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
                        const totalOdonto = doMes.filter(c => c.tipo === 'odonto').reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
                        const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 bg-[#003580]/10 rounded-xl border border-[#003580]/20">
                                <p className="text-xs text-[#003580] uppercase font-semibold mb-1">Saúde</p>
                                <p className="text-xl font-bold text-[#003580]">{fmt(totalSaude)}</p>
                                <p className="text-xs text-[#003580]/60 mt-0.5">{doMes.filter(c => c.tipo === 'saude' || !c.tipo).length} lançamento(s)</p>
                              </div>
                              <div className="p-4 bg-[#003580]/10 rounded-xl border border-[#003580]/20">
                                <p className="text-xs text-[#003580] uppercase font-semibold mb-1">Odonto</p>
                                <p className="text-xl font-bold text-[#003580]">{fmt(totalOdonto)}</p>
                                <p className="text-xs text-[#003580]/60 mt-0.5">{doMes.filter(c => c.tipo === 'odonto').length} lançamento(s)</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border text-sm">
                              <span className="text-gray-500">Total do mês</span>
                              <span className="font-bold text-gray-800">{fmt(totalSaude + totalOdonto)}</span>
                            </div>
                            {doMes.length === 0 && (
                              <p className="text-center text-xs text-gray-400 pt-1">Nenhum lançamento registrado neste mês.</p>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default ApoliceDashboard;
