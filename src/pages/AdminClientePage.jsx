import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building, ChevronRight, AlertTriangle, Heart, Car, Plane, Home, PawPrint, Building2, Package, Monitor, Loader2, Users, FileText, Trash2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask, applyCpfMask } from '@/lib/masks';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { apolicesService } from '@/services/apolicesService';
import { authService } from '@/services/authService';
import { supabaseClient } from '@/lib/supabase';

const SEGMENTOS_CONFIG = [
  { key: 'SAUDE_VIDA_ODONTO', label: 'Saúde, Vida e Odonto', slug: 'saude-vida-odonto', Icon: Heart    },
  { key: 'AUTO_FROTA',        label: 'Auto e Frota',          slug: 'auto-frota',        Icon: Car      },
  { key: 'VIAGEM',            label: 'Viagem',                slug: 'viagem',            Icon: Plane    },
  { key: 'RESIDENCIAL',       label: 'Residencial',           slug: 'residencial',       Icon: Home     },
  { key: 'PET_SAUDE',         label: 'Pet Saúde',             slug: 'pet-saude',         Icon: PawPrint },
  { key: 'EMPRESARIAL',       label: 'Empresarial',           slug: 'empresarial',       Icon: Building2},
  { key: 'CARGAS',            label: 'Cargas',                slug: 'cargas',            Icon: Package  },
  { key: 'EQUIPAMENTOS',      label: 'Equipamentos',          slug: 'equipamentos',      Icon: Monitor  },
];

const AdminClientePage = () => {
  const { matrizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [matriz, setMatriz] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filial modal
  const [isAddFilialModalOpen, setIsAddFilialModalOpen] = useState(false);
  const [isEditFilialModalOpen, setIsEditFilialModalOpen] = useState(false);
  const [filialEditando, setFilialEditando] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filialFormData, setFilialFormData] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });

  const canManage = user.perfil === 'CEO' || user.perfil === 'ADM';

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [empresasResult, beneficiariosResult, solicitacoesResult] = await Promise.allSettled([
          empresasService.getEmpresas(),
          beneficiariosService.getAllBeneficiarios(),
          solicitacoesService.getAllSolicitacoes(),
        ]);
        const todasEmpresas = empresasResult.status === 'fulfilled' ? empresasResult.value : [];
        const todosBeneficios = beneficiariosResult.status === 'fulfilled' ? beneficiariosResult.value : [];
        const todasSolicitacoes = solicitacoesResult.status === 'fulfilled' ? solicitacoesResult.value : [];

        const id = Number(matrizId);
        const matrizEncontrada = todasEmpresas.find(e => e.id === id && e.tipo === 'MATRIZ');
        if (!matrizEncontrada) { navigate('/admin'); return; }

        const filiaisData = todasEmpresas.filter(e => e.tipo === 'FILIAL' && e.empresa_matriz_id === id);
        const todasIds = [id, ...filiaisData.map(f => f.id)];

        setMatriz(matrizEncontrada);
        setFiliais(filiaisData);
        setBeneficiarios(todosBeneficios.filter(b => todasIds.includes(Number(b.empresa_id)) && !b.data_exclusao));
        setSolicitacoes(todasSolicitacoes.filter(s => todasIds.includes(Number(s.empresa_id))));

        try {
          const apData = await apolicesService.getApolicesByMatriz(id);
          setApolices(apData);
        } catch (e) {
          console.warn('Tabela apolices não encontrada:', e);
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados do cliente.' });
        navigate('/admin');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [matrizId]);

  const getSolicitacoesPendentes = (empresaId) =>
    solicitacoes.filter(s => Number(s.empresa_id) === empresaId && (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')).length;

  const totalPendentesSVD = useMemo(() => {
    const ids = [Number(matrizId), ...filiais.map(f => f.id)];
    return solicitacoes.filter(s => ids.includes(Number(s.empresa_id)) && (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')).length;
  }, [solicitacoes, matrizId, filiais]);

  const getCountForSegmento = (key) => {
    if (key === 'SAUDE_VIDA_ODONTO') return beneficiarios.length;
    return apolices.filter(a => a.segmento === key && a.ativo !== false).length;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFilialFormData(prev => ({ ...prev, [id]: id === 'cnpj' ? applyCnpjMask(value) : value }));
  };

  const handleAddFilial = async (e) => {
    e.preventDefault();
    if (!filialFormData.razao_social || !filialFormData.cnpj)
      return toast({ variant: 'destructive', title: 'Erro', description: 'Razão Social e CNPJ são obrigatórios.' });
    setIsSubmitting(true);
    try {
      const created = await empresasService.createEmpresa({
        tipo: 'FILIAL',
        empresa_matriz_id: Number(matrizId),
        ...filialFormData,
        data_cadastro: new Date().toISOString(),
      });
      setFiliais(prev => [...prev, created]);
      toast({ title: 'Filial adicionada.' });
      setIsAddFilialModalOpen(false);
      setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao adicionar filial.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditFilial = (filial) => {
    setFilialEditando(filial);
    setFilialFormData({
      razao_social: filial.razao_social || '',
      nome_fantasia: filial.nome_fantasia || '',
      cnpj: filial.cnpj ? applyCnpjMask(filial.cnpj) : '',
      endereco_completo: filial.endereco_completo || '',
    });
    setIsEditFilialModalOpen(true);
  };

  const handleEditFilial = async (e) => {
    e.preventDefault();
    if (!filialFormData.razao_social || !filialFormData.cnpj)
      return toast({ variant: 'destructive', title: 'Erro', description: 'Razão Social e CNPJ são obrigatórios.' });
    setIsSubmitting(true);
    try {
      const updated = await empresasService.updateEmpresa(filialEditando.id, filialFormData);
      setFiliais(prev => prev.map(f => f.id === filialEditando.id ? { ...f, ...updated } : f));
      toast({ title: 'Filial atualizada.' });
      setIsEditFilialModalOpen(false);
      setFilialEditando(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar filial.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFilial = async (filialId) => {
    try {
      // Delete storage files for apolices with contrato_url
      const filialApolices = apolices.filter(a => Number(a.empresa_id) === filialId && a.contrato_url);
      if (filialApolices.length > 0) {
        const paths = filialApolices
          .map(a => a.contrato_url.split('/apolices-contratos/')[1])
          .filter(Boolean);
        if (paths.length > 0) {
          await supabaseClient.storage.from('apolices-contratos').remove(paths);
        }
      }

      await supabaseClient.from('coparticipacoes').delete().eq('empresa_id', filialId);
      await supabaseClient.from('solicitacoes').delete().eq('empresa_id', filialId);
      await supabaseClient.from('apolices').delete().eq('empresa_id', filialId);
      await supabaseClient.from('beneficiarios').delete().eq('empresa_id', filialId);
      await empresasService.deleteEmpresa(filialId);
      setFiliais(prev => prev.filter(f => f.id !== filialId));
      setApolices(prev => prev.filter(a => Number(a.empresa_id) !== filialId));
      toast({ title: 'Filial removida.' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao remover filial.' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!matriz) return null;

  return (
    <>
      <Helmet><title>{matriz.nome_fantasia || matriz.razao_social} - Seguros Ágil</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Clientes
            </button>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <span className="text-sm font-medium text-white">{matriz.nome_fantasia || matriz.razao_social}</span>
          </div>

          {/* Client Info Card */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-[#003580] p-5 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">{matriz.nome_fantasia || matriz.razao_social}</h1>
                    {matriz.nome_fantasia && <p className="text-blue-100 text-sm">{matriz.razao_social}</p>}
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold self-start sm:self-center">
                  MATRIZ
                </span>
              </div>
            </div>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">{matriz.cnpj && matriz.cnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'}</span>
                  <p className="font-medium mt-0.5">
                    {matriz.cnpj && matriz.cnpj.replace(/\D/g, '').length === 11 ? applyCpfMask(matriz.cnpj) : applyCnpjMask(matriz.cnpj)}
                  </p>
                </div>
                {matriz.email_cliente && <div><span className="text-gray-500">E-mail de acesso</span><p className="font-medium mt-0.5 truncate">{matriz.email_cliente}</p></div>}
                {matriz.endereco_completo && <div><span className="text-gray-500">Endereço</span><p className="font-medium mt-0.5">{matriz.endereco_completo}</p></div>}
              </div>

              {/* Filiais — apenas para PJ */}
              {!(matriz.cnpj && matriz.cnpj.replace(/\D/g, '').length === 11) && <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    Filiais ({filiais.length})
                  </p>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => setIsAddFilialModalOpen(true)}>
                      Adicionar Filial
                    </Button>
                  )}
                </div>
                {filiais.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma filial cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {filiais.map(f => {
                      const pend = getSolicitacoesPendentes(f.id);
                      return (
                        <div key={f.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border text-sm">
                          <div>
                            <span className="font-medium">{f.nome_fantasia || f.razao_social}</span>
                            <span className="ml-2 text-gray-400 text-xs">{applyCnpjMask(f.cnpj)}</span>
                            {pend > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                                <AlertTriangle className="h-3 w-3" /> {pend}
                              </span>
                            )}
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:text-blue-600" onClick={() => handleOpenEditFilial(f)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Remover filial?</AlertDialogTitle><AlertDialogDescription>Isso removerá a filial e todos os seus dados.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFilial(f.id)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>}
            </CardContent>
          </Card>

          {/* Segments Grid */}
          <div>
            <h2 className="text-base font-semibold text-white mb-3">Segmentos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SEGMENTOS_CONFIG.map(({ key, label, slug, Icon }) => {
                const count = getCountForSegmento(key);
                const pendentes = key === 'SAUDE_VIDA_ODONTO' ? totalPendentesSVD : 0;
                const isSVD = key === 'SAUDE_VIDA_ODONTO';
                return (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative bg-white border border-gray-100 rounded-3xl shadow-md p-5 flex flex-col cursor-pointer"
                    onClick={() => navigate(`/admin/cliente/${matrizId}/segmento/${slug}`)}
                  >
                    {pendentes > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                        {pendentes > 99 ? '99+' : pendentes}
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-2xl bg-[#003580]/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#003580]" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-snug mb-1">{label}</p>
                    <p className="text-xs text-gray-400 mb-4 flex-grow">
                      {count > 0
                        ? isSVD
                          ? `${count} beneficiário${count !== 1 ? 's' : ''}`
                          : `${count} apólice${count !== 1 ? 's' : ''}`
                        : 'Nenhum cadastro'}
                    </p>
                    <span className="block w-full text-center bg-[#003580] text-white text-xs font-semibold py-2 rounded-full mt-auto">
                      Acessar
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </motion.div>
      </DashboardLayout>

      {/* Modal Adicionar Filial */}
      <Dialog open={isAddFilialModalOpen} onOpenChange={setIsAddFilialModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Filial</DialogTitle>
            <p className="text-sm text-muted-foreground">{matriz.nome_fantasia || matriz.razao_social}</p>
          </DialogHeader>
          <form onSubmit={handleAddFilial} className="space-y-4 py-2">
            <div><Label>Razão Social *</Label><Input id="razao_social" value={filialFormData.razao_social} onChange={handleInputChange} /></div>
            <div><Label>Nome Fantasia</Label><Input id="nome_fantasia" value={filialFormData.nome_fantasia} onChange={handleInputChange} /></div>
            <div><Label>CNPJ *</Label><Input id="cnpj" value={filialFormData.cnpj} onChange={handleInputChange} /></div>
            <div><Label>Endereço</Label><Input id="endereco_completo" value={filialFormData.endereco_completo} onChange={handleInputChange} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddFilialModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal Editar Filial */}
      <Dialog open={isEditFilialModalOpen} onOpenChange={setIsEditFilialModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Filial</DialogTitle>
            <p className="text-sm text-muted-foreground">{filialEditando?.nome_fantasia || filialEditando?.razao_social}</p>
          </DialogHeader>
          <form onSubmit={handleEditFilial} className="space-y-4 py-2">
            <div><Label>Razão Social *</Label><Input id="razao_social" value={filialFormData.razao_social} onChange={handleInputChange} /></div>
            <div><Label>Nome Fantasia</Label><Input id="nome_fantasia" value={filialFormData.nome_fantasia} onChange={handleInputChange} /></div>
            <div><Label>CNPJ *</Label><Input id="cnpj" value={filialFormData.cnpj} onChange={handleInputChange} /></div>
            <div><Label>Endereço</Label><Input id="endereco_completo" value={filialFormData.endereco_completo} onChange={handleInputChange} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditFilialModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminClientePage;
