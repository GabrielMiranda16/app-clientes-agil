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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, ChevronRight, Building, Users, Heart, Car, Plane, Home, PawPrint,
  Building2, Package, Monitor, Plus, Edit, Trash2, Loader2, AlertTriangle,
  FileText, ExternalLink, DollarSign, FileClock, CheckCircle2, Clock, Search, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask } from '@/lib/masks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';

const SEGMENTOS_CONFIG = {
  'saude-vida-odonto': { key: 'SAUDE_VIDA_ODONTO', label: 'Saúde, Vida e Odonto', Icon: Heart,     isSVD: true  },
  'auto-frota':        { key: 'AUTO_FROTA',         label: 'Auto e Frota',          Icon: Car,       isSVD: false },
  'viagem':            { key: 'VIAGEM',              label: 'Viagem',                Icon: Plane,     isSVD: false },
  'residencial':       { key: 'RESIDENCIAL',         label: 'Residencial',           Icon: Home,      isSVD: false },
  'pet-saude':         { key: 'PET_SAUDE',           label: 'Pet Saúde',             Icon: PawPrint,  isSVD: false },
  'empresarial':       { key: 'EMPRESARIAL',         label: 'Empresarial',           Icon: Building2, isSVD: false },
  'cargas':            { key: 'CARGAS',              label: 'Cargas',                Icon: Package,   isSVD: false },
  'equipamentos':      { key: 'EQUIPAMENTOS',        label: 'Equipamentos',          Icon: Monitor,   isSVD: false },
};

const STATUS_COLORS = {
  green:  { badge: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  card: 'bg-gray-50 border-gray-200'      },
  yellow: { badge: 'bg-yellow-100 text-yellow-800',dot: 'bg-yellow-500', card: 'bg-yellow-50 border-yellow-200'  },
  red:    { badge: 'bg-red-100 text-red-800',      dot: 'bg-red-500',    card: 'bg-red-50 border-red-200'        },
  gray:   { badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   card: 'bg-gray-50 border-gray-200'      },
};

const emptyApoliceForm = { numero_apolice: '', seguradora: '', vigencia_inicio: '', vigencia_fim: '', valor_premio: '', descricao: '' };

const emptyDadosAdicionais = (segKey) => {
  if (segKey === 'AUTO_FROTA') return { veiculos: [{ placa: '', marca: '', modelo: '', cor: '', ano: '' }] };
  if (segKey === 'VIAGEM') return { segurados: [{ nome: '', cpf: '' }] };
  if (segKey === 'RESIDENCIAL' || segKey === 'EMPRESARIAL') return { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };
  if (segKey === 'PET_SAUDE') return { nome_pet: '', especie: '', raca: '', idade: '' };
  if (segKey === 'EQUIPAMENTOS') return { tipo_equipamento: '', marca: '', modelo: '', numero_serie: '', memoria_armazenamento: '', outros_detalhes: '' };
  return {};
};

const AdminSegmentoPage = () => {
  const { matrizId, segmento } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedCompanyId } = useCompany();
  const { toast } = useToast();

  const segConfig = SEGMENTOS_CONFIG[segmento];

  const [matriz, setMatriz] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apolice modal
  const [isApoliceModalOpen, setIsApoliceModalOpen] = useState(false);
  const [editingApolice, setEditingApolice] = useState(null);
  const [apoliceForm, setApoliceForm] = useState(emptyApoliceForm);
  const [apoliceEmpresaId, setApoliceEmpresaId] = useState('');
  const [contratoFile, setContratoFile] = useState(null);
  const [subApolicesFiles, setSubApolicesFiles] = useState([]);
  const [dadosAdicionais, setDadosAdicionais] = useState({});
  const [isCepApoliceLoading, setIsCepApoliceLoading] = useState(false);

  const canManage = user.perfil === 'CEO' || user.perfil === 'ADM';
  const isSVD = segConfig?.isSVD;

  useEffect(() => {
    if (!segConfig) { navigate('/admin'); return; }
    const load = async () => {
      try {
        setIsLoading(true);
        const id = Number(matrizId);
        const [todasEmpresas, todasSolicitacoes] = await Promise.all([
          empresasService.getEmpresas(),
          solicitacoesService.getAllSolicitacoes(),
        ]);

        const matrizData = todasEmpresas.find(e => e.id === id && e.tipo === 'MATRIZ');
        if (!matrizData) { navigate('/admin'); return; }
        const filiaisData = todasEmpresas.filter(e => e.tipo === 'FILIAL' && e.empresa_matriz_id === id);
        const todasIds = [id, ...filiaisData.map(f => f.id)];

        setMatriz(matrizData);
        setFiliais(filiaisData);
        setSolicitacoes(todasSolicitacoes.filter(s => todasIds.includes(Number(s.empresa_id))));

        // Always load apólices for all segments (including SVD)
        try {
          const apData = await apolicesService.getApolicesByMatriz(id);
          setApolices(apData.filter(a => a.segmento === segConfig.key));
        } catch (e) {
          console.warn('Tabela apolices não encontrada:', e);
        }

        if (isSVD) {
          const benData = await beneficiariosService.getAllBeneficiarios();
          setBeneficiarios(benData.filter(b => todasIds.includes(Number(b.empresa_id)) && !b.data_exclusao));
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
        navigate(`/admin/cliente/${matrizId}`);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [matrizId, segmento]);

  const getSolicitacoesPendentes = (empresaId) =>
    solicitacoes.filter(s => Number(s.empresa_id) === empresaId && (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')).length;

  const getBeneficiariosEmpresa = (empresaId) =>
    beneficiarios.filter(b => Number(b.empresa_id) === Number(empresaId));

  const getApolicesEmpresa = (empresaId) =>
    apolices.filter(a => Number(a.empresa_id) === Number(empresaId) && a.ativo !== false);

  const todasEmpresas = useMemo(() => matriz ? [{ ...matriz, isMatriz: true }, ...filiais.map(f => ({ ...f, isMatriz: false }))] : [], [matriz, filiais]);

  const buscarCepApolice = async (cep) => {
    const nums = (cep || '').replace(/\D/g, '');
    if (nums.length !== 8) return;
    setIsCepApoliceLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();
      if (data.erro) return toast({ variant: 'destructive', title: 'CEP não encontrado' });
      setDadosAdicionais(prev => ({
        ...prev,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }));
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setIsCepApoliceLoading(false);
    }
  };

  const openNewApolice = (empresaId) => {
    setEditingApolice(null);
    setApoliceForm(emptyApoliceForm);
    setApoliceEmpresaId(String(empresaId));
    setContratoFile(null);
    setSubApolicesFiles([]);
    setDadosAdicionais(emptyDadosAdicionais(segConfig?.key));
    setIsApoliceModalOpen(true);
  };

  const openEditApolice = (ap) => {
    setEditingApolice(ap);
    setApoliceForm({
      numero_apolice: ap.numero_apolice || '',
      seguradora: ap.seguradora || '',
      vigencia_inicio: ap.vigencia_inicio || '',
      vigencia_fim: ap.vigencia_fim || '',
      valor_premio: ap.valor_premio || '',
      descricao: ap.descricao || '',
    });
    setApoliceEmpresaId(String(ap.empresa_id));
    setContratoFile(null);
    setSubApolicesFiles([]);
    const defaultDados = emptyDadosAdicionais(segConfig?.key);
    setDadosAdicionais(ap.dados_adicionais ? { ...defaultDados, ...ap.dados_adicionais } : defaultDados);
    setIsApoliceModalOpen(true);
  };

  const handleDeleteContrato = async () => {
    if (!editingApolice?.id) return;
    try {
      const updated = await apolicesService.deleteContrato(editingApolice.id, editingApolice.contrato_url);
      setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingApolice(prev => ({ ...prev, contrato_url: null }));
      toast({ title: 'PDF excluído.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const handleSaveApolice = async (e) => {
    e.preventDefault();
    if (!apoliceEmpresaId) return toast({ variant: 'destructive', title: 'Selecione a empresa.' });
    setIsSubmitting(true);
    try {
      const payload = {
        ...apoliceForm,
        segmento: segConfig.key,
        empresa_id: Number(apoliceEmpresaId),
        valor_premio: apoliceForm.valor_premio ? Number(apoliceForm.valor_premio) : null,
        ativo: true,
        dados_adicionais: dadosAdicionais,
      };
      // Remove valor_premio and descricao for SVD
      if (isSVD) { delete payload.valor_premio; delete payload.vigencia_inicio; delete payload.vigencia_fim; delete payload.descricao; }
      // Remove vigência for PET_SAUDE (plano mensal sem data fim)
      if (segConfig.key === 'PET_SAUDE') { delete payload.vigencia_inicio; delete payload.vigencia_fim; }

      let saved;
      if (editingApolice) {
        saved = await apolicesService.updateApolice(editingApolice.id, payload);
        setApolices(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        saved = await apolicesService.createApolice(payload);
        // Don't add to state yet — wait for upload result
      }

      // Upload SVD sub-apólice PDFs
      let updatedDados = { ...dadosAdicionais };
      if (isSVD) {
        const subApolices = [...(dadosAdicionais.sub_apolices || [])];
        let hasUpload = false;
        for (let i = 0; i < subApolices.length; i++) {
          if (subApolicesFiles[i]) {
            const seg = `${subApolices[i].tipo || 'sub'}_${i}`;
            const url = await apolicesService.uploadContratoSegmento(subApolicesFiles[i], saved.id, seg);
            subApolices[i] = { ...subApolices[i], contrato_url: url };
            hasUpload = true;
          }
        }
        if (hasUpload) {
          updatedDados.sub_apolices = subApolices;
          const updated = await apolicesService.updateApolice(saved.id, { dados_adicionais: updatedDados });
          if (editingApolice) {
            setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
          } else {
            setApolices(prev => [updated, ...prev]);
          }
        } else if (!editingApolice) {
          setApolices(prev => [saved, ...prev]);
        }
      } else if (contratoFile) {
        try {
          const url = await apolicesService.uploadContrato(contratoFile, saved.id);
          const updated = await apolicesService.updateApolice(saved.id, { contrato_url: url });
          if (editingApolice) {
            setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
          } else {
            setApolices(prev => [updated, ...prev]);
          }
        } catch (uploadErr) {
          if (!editingApolice) await apolicesService.deleteApolice(saved.id);
          throw new Error(`Upload falhou: ${uploadErr.message}`);
        }
      } else if (!editingApolice) {
        setApolices(prev => [saved, ...prev]);
      }

      toast({ title: editingApolice ? 'Apólice atualizada.' : 'Apólice criada.' });
      setIsApoliceModalOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApolice = async (id) => {
    try {
      await apolicesService.deleteApolice(id);
      const restantes = apolices.filter(a => a.id !== id);
      setApolices(restantes);

      // Cancela todas as solicitações pendentes de todas as empresas do grupo
      const todasIds = todasEmpresas.map(e => e.id);
      await Promise.allSettled(todasIds.map(eid => solicitacoesService.cancelPendingByEmpresa(eid)));
      setSolicitacoes(prev => prev.map(s =>
        todasIds.includes(Number(s.empresa_id)) &&
        (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')
          ? { ...s, status: 'CANCELADA' }
          : s
      ));

      toast({ title: 'Apólice removida.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const goToCoparticipacao = (empresaId) => {
    setSelectedCompanyId(Number(empresaId));
    navigate('/coparticipacao');
  };

  const goToSolicitacoes = (empresaId) => {
    setSelectedCompanyId(Number(empresaId));
    navigate('/solicitacoes');
  };

  if (!segConfig) return null;
  const { Icon, label } = segConfig;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!matriz) return null;

  return (
    <>
      <Helmet><title>{label} — {matriz.nome_fantasia || matriz.razao_social}</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/admin')} className="text-sm text-white/60 hover:text-white transition-colors">Clientes</button>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <button onClick={() => navigate(`/admin/cliente/${matrizId}`)} className="text-sm text-white/70 hover:text-white transition-colors">
              {matriz.nome_fantasia || matriz.razao_social}
            </button>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <span className="text-sm text-white">{label}</span>
          </div>

          {/* Header */}
          <h1 className="text-2xl font-bold tracking-tight text-white">{label}</h1>

          {/* Empresas */}
          {todasEmpresas.map((empresa) => {
            const pendentes = getSolicitacoesPendentes(empresa.id);
            const empApolices = getApolicesEmpresa(empresa.id);
            const empBeneficiarios = getBeneficiariosEmpresa(empresa.id);

            return (
              <Card key={empresa.id} className="border shadow-sm overflow-hidden">
                {/* Empresa Header */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${empresa.isMatriz ? 'bg-[#f0f7ff]' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <Building className={`h-4 w-4 ${empresa.isMatriz ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{empresa.nome_fantasia || empresa.razao_social}</span>
                      <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${empresa.isMatriz ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                        {empresa.isMatriz ? 'Matriz' : 'Filial'}
                      </span>
                    </div>
                    {pendentes > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                        <AlertTriangle className="h-3 w-3" /> {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 hidden sm:block">{applyCnpjMask(empresa.cnpj)}</p>
                </div>

                <CardContent className="pt-4 pb-4">
                  {/* All segments (including SVD): list apólices first */}
                  {isSVD ? (
                    <div className="space-y-2">
                      {empApolices.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhuma apólice cadastrada. Registre uma apólice para acessar Beneficiários, Solicitações e Coparticipação.</p>
                        </div>
                      ) : (
                        empApolices.map(ap => (
                          <div key={ap.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100 hover:shadow-sm transition-shadow">
                            <div>
                              {(() => {
                                const subs = ap.dados_adicionais?.sub_apolices?.filter(s => s.tipo || s.numero);
                                if (subs?.length > 0) {
                                  return (
                                    <div className="space-y-0.5">
                                      {subs.map((s, i) => (
                                        <p key={i} className="font-semibold text-gray-800 text-sm">
                                          {s.tipo && <span className="text-[#003580]">{s.tipo}</span>}
                                          {s.numero && <span className="font-normal text-gray-600"> · Apólice {s.numero}</span>}
                                          {s.seguradora && <span className="font-normal text-gray-400"> · {s.seguradora}</span>}
                                        </p>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <p className="font-semibold text-gray-800 text-sm">
                                    {ap.numero_apolice ? `Apólice ${ap.numero_apolice}` : 'Apólice sem número'}
                                    {ap.seguradora && <span className="ml-1.5 text-gray-500 font-normal">· {ap.seguradora}</span>}
                                  </p>
                                );
                              })()}
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Beneficiários, Solicitações e Coparticipação disponíveis dentro</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => navigate(`/apolice/${ap.id}`)}>
                                Acessar
                              </Button>
                              {canManage && (
                                <>
                                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditApolice(ap)}><Edit className="h-3.5 w-3.5" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover apólice?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteApolice(ap.id)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {canManage && (
                        <Button size="sm" variant="outline" className="mt-1 w-full border-dashed" onClick={() => openNewApolice(empresa.id)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> {empApolices.length === 0 ? 'Registrar Apólice' : 'Nova Apólice'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Other segments: list of apolices */
                    <div className="space-y-2">
                      {empApolices.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhuma apólice cadastrada para esta empresa</p>
                        </div>
                      ) : (
                        empApolices.map(ap => {
                          const status = apolicesService.getStatusApolice(ap.vigencia_fim);
                          const sc = STATUS_COLORS[status.color] || STATUS_COLORS.gray;
                          return (
                            <div key={ap.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border hover:shadow-sm transition-shadow ${sc.card}`}>
                              <div className="flex items-start gap-3">
                                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">
                                    {ap.numero_apolice ? `Apólice ${ap.numero_apolice}` : 'Apólice sem número'}
                                    {ap.seguradora && <span className="ml-1.5 text-gray-500 font-normal">· {ap.seguradora}</span>}
                                  </p>
                                  {(ap.vigencia_inicio || ap.vigencia_fim) && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Vigência: {ap.vigencia_inicio || '—'} → {ap.vigencia_fim || '—'}
                                      {status.dias !== undefined && status.color === 'red' && (
                                        <span className="ml-2 font-medium text-red-600">
                                          (venceu há {Math.abs(status.dias)} dias)
                                        </span>
                                      )}
                                      {status.dias !== undefined && status.color === 'yellow' && (
                                        <span className="ml-2 font-medium text-yellow-600">
                                          ({status.dias} dias restantes)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {ap.valor_premio && (
                                    <p className="text-xs text-gray-400">
                                      Prêmio: R$ {Number(ap.valor_premio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                  {/* Dados adicionais por segmento */}
                                  {ap.dados_adicionais && segConfig?.key === 'AUTO_FROTA' && ap.dados_adicionais.veiculos?.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">{ap.dados_adicionais.veiculos.map(v => [v.placa, v.marca, v.modelo].filter(Boolean).join(' ')).join(' | ')}</p>
                                  )}
                                  {ap.dados_adicionais && segConfig?.key === 'VIAGEM' && ap.dados_adicionais.segurados?.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">{ap.dados_adicionais.segurados.length} segurado(s)</p>
                                  )}
                                  {ap.dados_adicionais && (segConfig?.key === 'RESIDENCIAL' || segConfig?.key === 'EMPRESARIAL') && ap.dados_adicionais.rua && (
                                    <p className="text-xs text-gray-400 mt-0.5">{[ap.dados_adicionais.rua, ap.dados_adicionais.numero && `nº ${ap.dados_adicionais.numero}`, ap.dados_adicionais.cidade].filter(Boolean).join(', ')}</p>
                                  )}
                                  {ap.dados_adicionais && segConfig?.key === 'PET_SAUDE' && ap.dados_adicionais.nome_pet && (
                                    <p className="text-xs text-gray-400 mt-0.5">{ap.dados_adicionais.nome_pet} · {ap.dados_adicionais.especie} {ap.dados_adicionais.raca ? `(${ap.dados_adicionais.raca})` : ''}</p>
                                  )}
                                  {ap.dados_adicionais && segConfig?.key === 'EQUIPAMENTOS' && ap.dados_adicionais.marca && (
                                    <p className="text-xs text-gray-400 mt-0.5">{[ap.dados_adicionais.tipo_equipamento, ap.dados_adicionais.marca, ap.dados_adicionais.modelo].filter(Boolean).join(' · ')}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {(status.color === 'yellow' || status.color === 'red') && (
                                  <AlertTriangle className={`h-4 w-4 ${status.color === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.badge}`}>{status.label}</span>
                                {ap.contrato_url && (
                                  <a href={ap.contrato_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => navigate(`/apolice/${ap.id}`)}>
                                  Acessar
                                </Button>
                                {canManage && (
                                  <>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditApolice(ap)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover apólice?</AlertDialogTitle><AlertDialogDescription>A apólice deixará de aparecer para o cliente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteApolice(ap.id)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      {canManage && (
                        <Button size="sm" variant="outline" className="mt-1 w-full border-dashed" onClick={() => openNewApolice(empresa.id)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova Apólice
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

        </motion.div>
      </DashboardLayout>

      {/* Modal Apólice */}
      <Dialog open={isApoliceModalOpen} onOpenChange={setIsApoliceModalOpen}>
        <DialogContent className="sm:max-w-xl sm:max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editingApolice ? 'Editar Apólice' : 'Nova Apólice'}</DialogTitle>
            <p className="text-sm text-muted-foreground">{label}</p>
          </DialogHeader>
          <form onSubmit={handleSaveApolice} className="space-y-4 py-2">
            {/* Empresa/Cliente selector */}
            <div>
              <Label>{segConfig?.key === 'VIAGEM' ? 'Cliente' : 'Empresa'}</Label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={apoliceEmpresaId}
                onChange={e => setApoliceEmpresaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {todasEmpresas.map(emp => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.isMatriz ? '(Matriz) ' : '(Filial) '}{emp.nome_fantasia || emp.razao_social}
                  </option>
                ))}
              </select>
            </div>

            {/* Fields only for non-SVD segments */}
            {!isSVD && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número da Apólice</Label>
                    <Input value={apoliceForm.numero_apolice} onChange={e => setApoliceForm(p => ({ ...p, numero_apolice: e.target.value }))} placeholder="Ex: 000123456" />
                  </div>
                  <div>
                    <Label>Seguradora</Label>
                    <Input value={apoliceForm.seguradora} onChange={e => setApoliceForm(p => ({ ...p, seguradora: e.target.value }))} placeholder="Ex: SulAmérica" />
                  </div>
                </div>
                {/* Pet Saúde: sem vigência (plano mensal) */}
                {segConfig?.key !== 'PET_SAUDE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Vigência Início</Label><Input type="date" value={apoliceForm.vigencia_inicio} onChange={e => setApoliceForm(p => ({ ...p, vigencia_inicio: e.target.value }))} /></div>
                    <div><Label>Vigência Fim</Label><Input type="date" value={apoliceForm.vigencia_fim} onChange={e => setApoliceForm(p => ({ ...p, vigencia_fim: e.target.value }))} /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Valor do Prêmio (R$)</Label><Input type="number" step="0.01" value={apoliceForm.valor_premio} onChange={e => setApoliceForm(p => ({ ...p, valor_premio: e.target.value }))} placeholder="0,00" /></div>
                  <div><Label>Contrato (PDF)</Label><Input type="file" accept=".pdf" onChange={e => setContratoFile(e.target.files?.[0] || null)} /></div>
                </div>
                <div><Label>Observações</Label><Input value={apoliceForm.descricao} onChange={e => setApoliceForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Informações adicionais" /></div>
              </>
            )}

            {/* SVD: sub-apólices dinâmicas */}
            {isSVD && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Apólices (Saúde / Vida / Odonto)</Label>
                  <Button
                    type="button" size="sm" variant="outline"
                    disabled={(dadosAdicionais.sub_apolices || []).length >= 3}
                    onClick={() => setDadosAdicionais(p => ({
                      ...p,
                      sub_apolices: [...(p.sub_apolices || []), { tipo: '', numero: '', seguradora: '' }]
                    }))}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                {(dadosAdicionais.sub_apolices || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Clique em "Adicionar" para incluir apólices de Saúde, Vida e/ou Odonto
                  </p>
                )}
                {(dadosAdicionais.sub_apolices || []).map((sub, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-2 relative">
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      onClick={() => setDadosAdicionais(p => ({ ...p, sub_apolices: p.sub_apolices.filter((_, idx) => idx !== i) }))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <select
                          className="w-full mt-1 h-8 px-2 rounded-md border border-input bg-background text-sm"
                          value={sub.tipo}
                          onChange={e => setDadosAdicionais(p => {
                            const arr = [...(p.sub_apolices || [])];
                            arr[i] = { ...arr[i], tipo: e.target.value };
                            return { ...p, sub_apolices: arr };
                          })}
                        >
                          <option value="">Selecione...</option>
                          <option value="saude">Saúde</option>
                          <option value="vida">Vida</option>
                          <option value="odonto">Odonto</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Nº Apólice</Label>
                        <Input
                          className="mt-1 h-8 text-sm"
                          value={sub.numero || ''}
                          onChange={e => setDadosAdicionais(p => {
                            const arr = [...(p.sub_apolices || [])];
                            arr[i] = { ...arr[i], numero: e.target.value };
                            return { ...p, sub_apolices: arr };
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Seguradora</Label>
                        <Input
                          className="mt-1 h-8 text-sm"
                          value={sub.seguradora || ''}
                          onChange={e => setDadosAdicionais(p => {
                            const arr = [...(p.sub_apolices || [])];
                            arr[i] = { ...arr[i], seguradora: e.target.value };
                            return { ...p, sub_apolices: arr };
                          })}
                          placeholder="Ex: SulAmérica"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Prêmio (R$)</Label>
                        <Input
                          type="number" step="0.01" min="0"
                          className="mt-1 h-8 text-sm"
                          value={sub.valor_premio || ''}
                          onChange={e => setDadosAdicionais(p => {
                            const arr = [...(p.sub_apolices || [])];
                            arr[i] = { ...arr[i], valor_premio: e.target.value };
                            return { ...p, sub_apolices: arr };
                          })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">
                        {sub.tipo ? `Contrato ${sub.tipo === 'saude' ? 'Saúde' : sub.tipo === 'vida' ? 'Vida' : 'Odonto'} (PDF)` : 'Contrato (PDF)'}
                      </Label>
                      <Input
                        type="file" accept=".pdf" className="mt-1 h-8 text-sm"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setSubApolicesFiles(prev => {
                            const arr = [...prev];
                            arr[i] = file;
                            return arr;
                          });
                        }}
                      />
                      {sub.contrato_url && (
                        <a href={sub.contrato_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> PDF atual
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show current PDF with delete option when editing */}
            {editingApolice?.contrato_url && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <a href={editingApolice.contrato_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex-1 truncate">PDF atual</a>
                <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-7 px-2" onClick={handleDeleteContrato}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* ---- CAMPOS ESPECÍFICOS POR SEGMENTO ---- */}

            {/* AUTO_FROTA: veículos */}
            {segConfig?.key === 'AUTO_FROTA' && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Veículos</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDadosAdicionais(p => ({ ...p, veiculos: [...(p.veiculos || []), { placa: '', marca: '', modelo: '', cor: '', ano: '' }] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                {(dadosAdicionais.veiculos || []).map((v, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-2 relative">
                    {(dadosAdicionais.veiculos || []).length > 1 && (
                      <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-red-500" onClick={() => setDadosAdicionais(p => ({ ...p, veiculos: p.veiculos.filter((_, idx) => idx !== i) }))}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <p className="text-xs font-medium text-gray-500">Veículo {i + 1}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Placa</Label><Input className="h-8 text-sm" value={v.placa} onChange={e => setDadosAdicionais(p => { const arr = [...p.veiculos]; arr[i] = { ...arr[i], placa: e.target.value.toUpperCase() }; return { ...p, veiculos: arr }; })} placeholder="ABC-1234" /></div>
                      <div><Label className="text-xs">Ano</Label><Input className="h-8 text-sm" value={v.ano} onChange={e => setDadosAdicionais(p => { const arr = [...p.veiculos]; arr[i] = { ...arr[i], ano: e.target.value }; return { ...p, veiculos: arr }; })} placeholder="2023" /></div>
                      <div><Label className="text-xs">Marca</Label><Input className="h-8 text-sm" value={v.marca} onChange={e => setDadosAdicionais(p => { const arr = [...p.veiculos]; arr[i] = { ...arr[i], marca: e.target.value }; return { ...p, veiculos: arr }; })} placeholder="Toyota" /></div>
                      <div><Label className="text-xs">Modelo</Label><Input className="h-8 text-sm" value={v.modelo} onChange={e => setDadosAdicionais(p => { const arr = [...p.veiculos]; arr[i] = { ...arr[i], modelo: e.target.value }; return { ...p, veiculos: arr }; })} placeholder="Corolla" /></div>
                      <div className="col-span-2"><Label className="text-xs">Cor</Label><Input className="h-8 text-sm" value={v.cor} onChange={e => setDadosAdicionais(p => { const arr = [...p.veiculos]; arr[i] = { ...arr[i], cor: e.target.value }; return { ...p, veiculos: arr }; })} placeholder="Prata" /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIAGEM: segurados */}
            {segConfig?.key === 'VIAGEM' && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Segurados</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDadosAdicionais(p => ({ ...p, segurados: [...(p.segurados || []), { nome: '', cpf: '' }] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                {(dadosAdicionais.segurados || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input className="h-8 text-sm" placeholder="Nome completo" value={s.nome} onChange={e => setDadosAdicionais(p => { const arr = [...p.segurados]; arr[i] = { ...arr[i], nome: e.target.value }; return { ...p, segurados: arr }; })} />
                      <Input className="h-8 text-sm" placeholder="CPF" value={s.cpf} onChange={e => setDadosAdicionais(p => { const arr = [...p.segurados]; arr[i] = { ...arr[i], cpf: e.target.value }; return { ...p, segurados: arr }; })} />
                    </div>
                    {(dadosAdicionais.segurados || []).length > 1 && (
                      <button type="button" className="text-gray-400 hover:text-red-500 shrink-0" onClick={() => setDadosAdicionais(p => ({ ...p, segurados: p.segurados.filter((_, idx) => idx !== i) }))}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* RESIDENCIAL ou EMPRESARIAL: endereço com CEP */}
            {(segConfig?.key === 'RESIDENCIAL' || segConfig?.key === 'EMPRESARIAL') && (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Endereço do Risco</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs">CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-sm"
                        placeholder="00000-000"
                        maxLength={9}
                        value={dadosAdicionais.cep || ''}
                        onChange={e => setDadosAdicionais(p => ({ ...p, cep: e.target.value }))}
                        onBlur={() => buscarCepApolice(dadosAdicionais.cep || '')}
                      />
                      <button type="button" onClick={() => buscarCepApolice(dadosAdicionais.cep || '')} disabled={isCepApoliceLoading}
                        className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center gap-1 text-sm">
                        {isCepApoliceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2"><Label className="text-xs">Rua</Label><Input className="h-8 text-sm" value={dadosAdicionais.rua || ''} onChange={e => setDadosAdicionais(p => ({ ...p, rua: e.target.value }))} /></div>
                    <div><Label className="text-xs">Número</Label><Input className="h-8 text-sm" value={dadosAdicionais.numero || ''} onChange={e => setDadosAdicionais(p => ({ ...p, numero: e.target.value }))} placeholder="123" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Complemento</Label><Input className="h-8 text-sm" value={dadosAdicionais.complemento || ''} onChange={e => setDadosAdicionais(p => ({ ...p, complemento: e.target.value }))} placeholder="Apto, bloco..." /></div>
                    <div><Label className="text-xs">Bairro</Label><Input className="h-8 text-sm bg-gray-50 text-gray-600" readOnly value={dadosAdicionais.bairro || ''} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Cidade</Label><Input className="h-8 text-sm bg-gray-50 text-gray-600" readOnly value={dadosAdicionais.cidade || ''} /></div>
                    <div><Label className="text-xs">Estado</Label><Input className="h-8 text-sm bg-gray-50 text-gray-600" readOnly value={dadosAdicionais.estado || ''} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* PET_SAUDE: dados do pet */}
            {segConfig?.key === 'PET_SAUDE' && (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Dados do Pet</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nome do Pet</Label><Input className="h-8 text-sm" value={dadosAdicionais.nome_pet || ''} onChange={e => setDadosAdicionais(p => ({ ...p, nome_pet: e.target.value }))} placeholder="Ex: Rex" /></div>
                  <div><Label className="text-xs">Espécie</Label><Input className="h-8 text-sm" value={dadosAdicionais.especie || ''} onChange={e => setDadosAdicionais(p => ({ ...p, especie: e.target.value }))} placeholder="Cão, Gato..." /></div>
                  <div><Label className="text-xs">Raça</Label><Input className="h-8 text-sm" value={dadosAdicionais.raca || ''} onChange={e => setDadosAdicionais(p => ({ ...p, raca: e.target.value }))} placeholder="Ex: Labrador" /></div>
                  <div><Label className="text-xs">Idade</Label><Input className="h-8 text-sm" value={dadosAdicionais.idade || ''} onChange={e => setDadosAdicionais(p => ({ ...p, idade: e.target.value }))} placeholder="Ex: 2 anos" /></div>
                </div>
              </div>
            )}

            {/* EQUIPAMENTOS: dados do equipamento */}
            {segConfig?.key === 'EQUIPAMENTOS' && (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Dados do Equipamento</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Tipo</Label><Input className="h-8 text-sm" value={dadosAdicionais.tipo_equipamento || ''} onChange={e => setDadosAdicionais(p => ({ ...p, tipo_equipamento: e.target.value }))} placeholder="Notebook, Câmera..." /></div>
                  <div><Label className="text-xs">Marca</Label><Input className="h-8 text-sm" value={dadosAdicionais.marca || ''} onChange={e => setDadosAdicionais(p => ({ ...p, marca: e.target.value }))} placeholder="Ex: Dell" /></div>
                  <div><Label className="text-xs">Modelo</Label><Input className="h-8 text-sm" value={dadosAdicionais.modelo || ''} onChange={e => setDadosAdicionais(p => ({ ...p, modelo: e.target.value }))} placeholder="Ex: Inspiron 15" /></div>
                  <div><Label className="text-xs">Número de Série</Label><Input className="h-8 text-sm" value={dadosAdicionais.numero_serie || ''} onChange={e => setDadosAdicionais(p => ({ ...p, numero_serie: e.target.value }))} /></div>
                  <div><Label className="text-xs">Armazenamento</Label><Input className="h-8 text-sm" value={dadosAdicionais.memoria_armazenamento || ''} onChange={e => setDadosAdicionais(p => ({ ...p, memoria_armazenamento: e.target.value }))} placeholder="Ex: 512GB SSD" /></div>
                  <div><Label className="text-xs">Outros detalhes</Label><Input className="h-8 text-sm" value={dadosAdicionais.outros_detalhes || ''} onChange={e => setDadosAdicionais(p => ({ ...p, outros_detalhes: e.target.value }))} /></div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsApoliceModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingApolice ? 'Salvar' : 'Criar Apólice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSegmentoPage;
