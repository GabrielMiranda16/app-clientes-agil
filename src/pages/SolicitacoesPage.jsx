import React, { useState, useEffect, useMemo } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

// Services
import { solicitacoesService } from '@/services/solicitacoesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { empresasService } from '@/services/empresasService';
import { formatCpfCnpj } from '@/lib/masks';

const SolicitacoesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab and Completed Requests State
  const [activeTab, setActiveTab] = useState('pendentes');
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState(null);
  
  // New State for Beneficiary Data Modal
  const [isEditBeneficiarioModalOpen, setIsEditBeneficiarioModalOpen] = useState(false);
  const [editingBeneficiarioData, setEditingBeneficiarioData] = useState(null);
  const [beneficiarioFormData, setBeneficiarioFormData] = useState({
    // Saúde
    saude_plano_nome: '',
    saude_numero_carteirinha: '',
    saude_link_carteirinha: '',
    saude_codigo_empresa: '',
    saude_acomodacao: '',
    saude_data_inclusao: '',
    saude_data_exclusao: '',
    saude_produto: '',
    saude_valor_fatura: '',
    saude_coparticipacao: '',
    
    // Vida
    vida_plano_nome: '',
    vida_numero_carteirinha: '',
    vida_link_carteirinha: '',
    vida_codigo_empresa: '',
    vida_data_inclusao: '',
    vida_data_exclusao: '',
    vida_produto: '',
    vida_valor_fatura: '',
    
    // Odonto
    odonto_plano_nome: '',
    odonto_numero_carteirinha: '',
    odonto_link_carteirinha: '',
    odonto_codigo_empresa: '',
    odonto_data_inclusao: '',
    odonto_data_exclusao: '',
    odonto_produto: '',
    odonto_valor_fatura: '',
  });

  const [formData, setFormData] = useState({
    beneficiario_id: '',
    tipo_plano: 'saude',
    tipo_solicitacao: 'INCLUSAO',
    status: 'PENDENTE',
    motivo_rejeicao: '',
    observacoes: ''
  });

  // Função para formatar mês/ano
  const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Filtrar solicitações concluídas (Status CONCLUIDA ou REJEITADA)
  const completedSolicitacoes = useMemo(() => {
    return solicitacoes
      .filter(s => ['CONCLUIDA', 'REJEITADA'].includes(s.status))
      .filter(s => {
        const beneficiario = beneficiarios.find(b => b.id === s.beneficiario_id);
        const nomeBeneficiario = beneficiario?.nome_completo?.toLowerCase() || '';
        const search = completedSearchTerm.toLowerCase();
        return nomeBeneficiario.includes(search) ||
               s.tipo_solicitacao.toLowerCase().includes(search) ||
               s.status.toLowerCase().includes(search);
      })
      .sort((a, b) => {
        const dateA = new Date(a.data_conclusao || a.data_rejeicao || a.updated_at);
        const dateB = new Date(b.data_conclusao || b.data_rejeicao || b.updated_at);
        return dateB - dateA;
      });
  }, [solicitacoes, beneficiarios, completedSearchTerm]);

  // Filtrar solicitações não concluídas (Status PENDENTE ou EM PROCESSAMENTO)
  const pendenteSolicitacoes = useMemo(() => {
    return solicitacoes
      .filter(s => ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status))
      .filter(s => {
        const beneficiario = beneficiarios.find(b => b.id === s.beneficiario_id);
        const nomeBeneficiario = beneficiario?.nome_completo?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return nomeBeneficiario.includes(search) || 
               s.tipo_solicitacao.toLowerCase().includes(search) ||
               s.status.toLowerCase().includes(search);
      })
      .sort((a, b) => new Date(b.data_solicitacao) - new Date(a.data_solicitacao));
  }, [solicitacoes, beneficiarios, searchTerm]);

  // Pagination Logic for Completed
  const totalCompletedPages = Math.ceil(completedSolicitacoes.length / ITEMS_PER_PAGE);
  const currentCompletedItems = useMemo(() => {
    const start = (completedCurrentPage - 1) * ITEMS_PER_PAGE;
    return completedSolicitacoes.slice(start, start + ITEMS_PER_PAGE);
  }, [completedCurrentPage, completedSolicitacoes]);

  // Agrupar itens da página atual por mês/ano
  const groupedCurrentCompletedItems = useMemo(() => {
    const grouped = {};
    currentCompletedItems.forEach(sol => {
      // Use data_conclusao, data_rejeicao or updated_at
      const dateToUse = sol.data_conclusao || sol.data_rejeicao || sol.updated_at;
      const monthYear = formatMonthYear(dateToUse);
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(sol);
    });
    return grouped;
  }, [currentCompletedItems]);

  const getTempoDecorrido = (dataStr) => {
    if (!dataStr) return '-';
    try {
      const data = new Date(dataStr);
      const agora = new Date();
      const diffMs = agora - data;
      
      if (diffMs < 0) return '-';
      
      const diffMinutesTotal = Math.floor(diffMs / (1000 * 60));
      const diffHoursTotal = Math.floor(diffMinutesTotal / 60);
      const diffDays = Math.floor(diffHoursTotal / 24);

      if (diffDays > 0) {
        const remainingHours = diffHoursTotal % 24;
        return `${diffDays}d ${remainingHours}h`;
      }
      
      if (diffHoursTotal > 0) {
        const remainingMinutes = diffMinutesTotal % 60;
        return `${diffHoursTotal}h ${remainingMinutes}m`;
      }
      
      return `${diffMinutesTotal}m`;
    } catch (e) {
      return '-';
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [solData, benData, empData] = await Promise.all([
        solicitacoesService.getAllSolicitacoes(),
        beneficiariosService.getAllBeneficiarios(),
        empresasService.getEmpresas()
      ]);
      setSolicitacoes(solData);
      setBeneficiarios(benData);
      setEmpresas(empData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar dados.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (solicitacao = null) => {
    if (solicitacao) {
      setEditingSolicitacao(solicitacao);
      setFormData({
        beneficiario_id: solicitacao.beneficiario_id?.toString() || '',
        tipo_plano: solicitacao.tipo_plano,
        tipo_solicitacao: solicitacao.tipo_solicitacao,
        status: solicitacao.status,
        motivo_rejeicao: solicitacao.motivo_rejeicao || '',
        observacoes: solicitacao.observacoes || ''
      });
    } else {
      setEditingSolicitacao(null);
      setFormData({
        beneficiario_id: '',
        tipo_plano: 'saude',
        tipo_solicitacao: 'INCLUSAO',
        status: 'PENDENTE',
        motivo_rejeicao: '',
        observacoes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.beneficiario_id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um beneficiário.' });
      return;
    }

    if (formData.status === 'REJEITADA' && !formData.motivo_rejeicao) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Informe o motivo da rejeição.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const beneficiario = beneficiarios.find(b => b.id.toString() === formData.beneficiario_id);
      if (!beneficiario) throw new Error('Beneficiário não encontrado');

      const payload = {
        beneficiario_id: parseInt(formData.beneficiario_id),
        empresa_id: beneficiario.empresa_id,
        tipo_plano: formData.tipo_plano,
        tipo_solicitacao: formData.tipo_solicitacao,
        status: formData.status,
        motivo_rejeicao: formData.status === 'REJEITADA' ? formData.motivo_rejeicao : null,
        observacoes: formData.observacoes,
        data_solicitacao: editingSolicitacao ? editingSolicitacao.data_solicitacao : new Date().toISOString(),
        data_conclusao: ['CONCLUIDA', 'REJEITADA'].includes(formData.status) ? new Date().toISOString() : null,
        data_aprovacao: formData.status === 'EM PROCESSAMENTO' ? new Date().toISOString() : (editingSolicitacao?.data_aprovacao || null)
      };

      if (editingSolicitacao) {
        // Atualizar beneficiário ANTES da solicitação — se falhar, a solicitação fica intacta
        if (formData.status === 'CONCLUIDA' && formData.tipo_solicitacao === 'EXCLUSAO' && formData.tipo_plano) {
          const planoField = `${formData.tipo_plano}_ativo`;
          await beneficiariosService.updateBeneficiario(beneficiario.id, {
            [planoField]: false,
            [`${formData.tipo_plano}_data_exclusao`]: new Date().toISOString().split('T')[0],
          });
          setBeneficiarios(prev => prev.map(b => b.id === beneficiario.id ? { ...b, [planoField]: false } : b));
        }

        if (formData.status === 'CONCLUIDA' && formData.tipo_solicitacao === 'INCLUSAO' && formData.tipo_plano) {
          const planoField = `${formData.tipo_plano}_ativo`;
          await beneficiariosService.updateBeneficiario(beneficiario.id, { [planoField]: true });
          setBeneficiarios(prev => prev.map(b => b.id === beneficiario.id ? { ...b, [planoField]: true } : b));
        }

        await solicitacoesService.updateSolicitacao(editingSolicitacao.id, payload);
        setSolicitacoes(prev => prev.map(s => s.id === editingSolicitacao.id ? { ...s, ...payload } : s));
        toast({ title: 'Sucesso', description: 'Solicitação atualizada com sucesso.' });
      } else {
        const newSolicitacao = await solicitacoesService.createSolicitacao(payload);
        setSolicitacoes(prev => [newSolicitacao, ...prev]);
        toast({ title: 'Sucesso', description: 'Solicitação criada com sucesso.' });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar solicitação.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (solicitacao) => {
    try {
      const updateData = {
        status: 'EM PROCESSAMENTO',
        data_aprovacao: new Date().toISOString()
      };
      
      await solicitacoesService.updateSolicitacao(solicitacao.id, updateData);
      
      setSolicitacoes(prev => prev.map(s => 
        s.id === solicitacao.id ? { ...s, ...updateData } : s
      ));
      
      toast({
        title: 'Solicitação Aceita',
        description: 'Status atualizado para Em Processamento.',
        className: 'bg-green-600 text-white border-none'
      });
    } catch (error) {
      console.error("Error accepting solicitacao:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao aceitar solicitação',
        description: error?.message || 'Erro desconhecido.'
      });
    }
  };

  const handleEditBeneficiarioData = (solicitacao) => {
    const beneficiario = beneficiarios.find(b => b.id === solicitacao.beneficiario_id);
    if (!beneficiario) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Beneficiário não encontrado.' });
      return;
    }

    setEditingBeneficiarioData({ solicitacao, beneficiario });
    
    // Populate form with all existing beneficiary data
    setBeneficiarioFormData({
      // Saúde
      saude_plano_nome: beneficiario.saude_plano_nome || '',
      saude_numero_carteirinha: beneficiario.saude_numero_carteirinha || '',
      saude_link_carteirinha: beneficiario.saude_link_carteirinha || '',
      saude_codigo_empresa: beneficiario.saude_codigo_empresa || '',
      saude_acomodacao: beneficiario.saude_acomodacao || '',
      saude_data_inclusao: beneficiario.saude_data_inclusao || '',
      saude_data_exclusao: beneficiario.saude_data_exclusao || '',
      saude_produto: beneficiario.saude_produto || '',
      saude_valor_fatura: beneficiario.saude_valor_fatura || '',
      saude_coparticipacao: beneficiario.saude_coparticipacao || '',
      
      // Vida
      vida_plano_nome: beneficiario.vida_plano_nome || '',
      vida_numero_carteirinha: beneficiario.vida_numero_carteirinha || '',
      vida_link_carteirinha: beneficiario.vida_link_carteirinha || '',
      vida_codigo_empresa: beneficiario.vida_codigo_empresa || '',
      vida_data_inclusao: beneficiario.vida_data_inclusao || '',
      vida_data_exclusao: beneficiario.vida_data_exclusao || '',
      vida_produto: beneficiario.vida_produto || '',
      vida_valor_fatura: beneficiario.vida_valor_fatura || '',
      
      // Odonto
      odonto_plano_nome: beneficiario.odonto_plano_nome || '',
      odonto_numero_carteirinha: beneficiario.odonto_numero_carteirinha || '',
      odonto_link_carteirinha: beneficiario.odonto_link_carteirinha || '',
      odonto_codigo_empresa: beneficiario.odonto_codigo_empresa || '',
      odonto_data_inclusao: beneficiario.odonto_data_inclusao || '',
      odonto_data_exclusao: beneficiario.odonto_data_exclusao || '',
      odonto_produto: beneficiario.odonto_produto || '',
      odonto_valor_fatura: beneficiario.odonto_valor_fatura || '',
    });

    setIsEditBeneficiarioModalOpen(true);
  };

  const handleSaveBeneficiarioData = async (e) => {
    e.preventDefault();
    if (!editingBeneficiarioData) return;

    setIsSubmitting(true);
    try {
      const { solicitacao, beneficiario } = editingBeneficiarioData;
      const updateFields = {};

      const isExclusao = solicitacao.tipo_solicitacao === 'EXCLUSAO';

      // Handle based on plan type to only update relevant fields
      if (solicitacao.tipo_plano === 'saude') {
        if (isExclusao) {
          updateFields.saude_ativo = false;
          updateFields.saude_data_exclusao = beneficiarioFormData.saude_data_exclusao || new Date().toISOString().split('T')[0];
        } else {
          updateFields.saude_ativo = true;
          updateFields.saude_plano_nome = beneficiarioFormData.saude_plano_nome;
          updateFields.saude_numero_carteirinha = beneficiarioFormData.saude_numero_carteirinha;
          updateFields.saude_link_carteirinha = beneficiarioFormData.saude_link_carteirinha;
          updateFields.saude_codigo_empresa = beneficiarioFormData.saude_codigo_empresa;
          updateFields.saude_acomodacao = beneficiarioFormData.saude_acomodacao;
          updateFields.saude_data_inclusao = beneficiarioFormData.saude_data_inclusao || null;
          updateFields.saude_data_exclusao = beneficiarioFormData.saude_data_exclusao || null;
          updateFields.saude_produto = beneficiarioFormData.saude_produto;
          updateFields.saude_valor_fatura = beneficiarioFormData.saude_valor_fatura ? parseFloat(beneficiarioFormData.saude_valor_fatura) : 0;
          updateFields.saude_coparticipacao = beneficiarioFormData.saude_coparticipacao;
        }
      } else if (solicitacao.tipo_plano === 'vida') {
        if (isExclusao) {
          updateFields.vida_ativo = false;
          updateFields.vida_data_exclusao = beneficiarioFormData.vida_data_exclusao || new Date().toISOString().split('T')[0];
        } else {
          updateFields.vida_ativo = true;
          updateFields.vida_plano_nome = beneficiarioFormData.vida_plano_nome;
          updateFields.vida_numero_carteirinha = beneficiarioFormData.vida_numero_carteirinha;
          updateFields.vida_link_carteirinha = beneficiarioFormData.vida_link_carteirinha;
          updateFields.vida_codigo_empresa = beneficiarioFormData.vida_codigo_empresa;
          updateFields.vida_data_inclusao = beneficiarioFormData.vida_data_inclusao || null;
          updateFields.vida_data_exclusao = beneficiarioFormData.vida_data_exclusao || null;
          updateFields.vida_produto = beneficiarioFormData.vida_produto;
          updateFields.vida_valor_fatura = beneficiarioFormData.vida_valor_fatura ? parseFloat(beneficiarioFormData.vida_valor_fatura) : 0;
        }
      } else if (solicitacao.tipo_plano === 'odonto') {
        if (isExclusao) {
          updateFields.odonto_ativo = false;
          updateFields.odonto_data_exclusao = beneficiarioFormData.odonto_data_exclusao || new Date().toISOString().split('T')[0];
        } else {
          updateFields.odonto_ativo = true;
          updateFields.odonto_plano_nome = beneficiarioFormData.odonto_plano_nome;
          updateFields.odonto_numero_carteirinha = beneficiarioFormData.odonto_numero_carteirinha;
          updateFields.odonto_link_carteirinha = beneficiarioFormData.odonto_link_carteirinha;
          updateFields.odonto_codigo_empresa = beneficiarioFormData.odonto_codigo_empresa;
          updateFields.odonto_data_inclusao = beneficiarioFormData.odonto_data_inclusao || null;
          updateFields.odonto_data_exclusao = beneficiarioFormData.odonto_data_exclusao || null;
          updateFields.odonto_produto = beneficiarioFormData.odonto_produto;
          updateFields.odonto_valor_fatura = beneficiarioFormData.odonto_valor_fatura ? parseFloat(beneficiarioFormData.odonto_valor_fatura) : 0;
        }
      }

      // 1. Update Beneficiario with specific fields
      const updatedBeneficiario = await beneficiariosService.updateBeneficiario(beneficiario.id, updateFields);

      // 2. Update Solicitacao to CONCLUIDA
      const solicitacaoUpdateData = {
        status: 'CONCLUIDA',
        data_aprovacao: new Date().toISOString(),
        data_conclusao: new Date().toISOString()
      };
      await solicitacoesService.updateSolicitacao(solicitacao.id, solicitacaoUpdateData);

      // 3. Update Local State
      setBeneficiarios(prev => prev.map(b => 
        b.id === beneficiario.id ? { ...b, ...updatedBeneficiario } : b
      ));
      
      setSolicitacoes(prev => prev.map(s => 
        s.id === solicitacao.id ? { ...s, ...solicitacaoUpdateData } : s
      ));

      toast({ 
        title: 'Sucesso', 
        description: 'Dados atualizados e solicitação concluída com sucesso!' 
      });
      
      setIsEditBeneficiarioModalOpen(false);
    } catch (error) {
      console.error("Error saving beneficiary data:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao concluir solicitação',
        description: error?.message || 'Erro desconhecido.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await solicitacoesService.cancelSolicitacao(id);
      setSolicitacoes(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELADA' } : s));
      toast({ title: 'Sucesso', description: 'Solicitação cancelada.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: error?.message || 'Erro desconhecido.' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDENTE': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'EM PROCESSAMENTO': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Em Processamento</Badge>;
      case 'CONCLUIDA': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>;
      case 'REJEITADA': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejeitada</Badge>;
      case 'CANCELADA': return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'INCLUSAO': return <Badge variant="default" className="bg-green-600">Inclusão</Badge>;
      case 'EXCLUSAO': return <Badge variant="destructive">Exclusão</Badge>;
      case 'ALTERACAO': return <Badge variant="secondary">Alteração</Badge>;
      default: return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <Helmet><title>Solicitações - Sistema</title></Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-white">Solicitações</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white/10 grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="pendentes" className="text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              Pendentes
              {pendenteSolicitacoes.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendenteSolicitacoes.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="concluidas" className="text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              Concluídas
            </TabsTrigger>
          </TabsList>

        {/* Tab Content: Pendentes */}
        <TabsContent value="pendentes">
        {activeTab === 'pendentes' && (
          <Card className="border-t-0 rounded-tl-none">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <CardTitle className="text-lg font-medium">Solicitações Pendentes</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendenteSolicitacoes.length > 0 ? (
                        pendenteSolicitacoes.map((solicitacao) => {
                          const beneficiario = beneficiarios.find(b => b.id === solicitacao.beneficiario_id);
                          return (
                            <TableRow key={solicitacao.id}>
                              <TableCell className="font-medium">
                                {beneficiario ? beneficiario.nome_completo : 'Beneficiário Removido'}
                                {beneficiario && (
                                  <div className="text-xs text-gray-500">
                                    CPF: {formatCpfCnpj(beneficiario.cpf)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="capitalize">{solicitacao.tipo_plano}</TableCell>
                              <TableCell>{getTipoBadge(solicitacao.tipo_solicitacao)}</TableCell>
                              <TableCell>{getStatusBadge(solicitacao.status)}</TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {getTempoDecorrido(solicitacao.data_solicitacao)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {solicitacao.status === 'PENDENTE' && (
                                    <Button 
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleAccept(solicitacao)}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Aceitar
                                    </Button>
                                  )}
                                  
                                  {solicitacao.status === 'EM PROCESSAMENTO' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleEditBeneficiarioData(solicitacao)}
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Adicionar Dados
                                    </Button>
                                  )}

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">
                                        Cancelar
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja cancelar esta solicitação? O cliente poderá solicitá-la novamente.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleCancel(solicitacao.id)} className="bg-red-600 text-white hover:bg-red-700">
                                          Confirmar Cancelamento
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                            Nenhuma solicitação pendente encontrada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </TabsContent>

        {/* Tab Content: Concluídas */}
        <TabsContent value="concluidas">
        {activeTab === 'concluidas' && (
          <Card className="border-t-0 rounded-tl-none">
             <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <CardTitle className="text-lg font-medium">Histórico de Solicitações</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9"
                    value={completedSearchTerm}
                    onChange={(e) => {
                      setCompletedSearchTerm(e.target.value);
                      setCompletedCurrentPage(1); // Reset page on search
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(groupedCurrentCompletedItems).length > 0 ? (
                    Object.entries(groupedCurrentCompletedItems).map(([monthYear, items]) => (
                      <div key={monthYear} className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-1">{monthYear}</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Beneficiário</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data Conclusão</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((solicitacao) => {
                                const beneficiario = beneficiarios.find(b => b.id === solicitacao.beneficiario_id);
                                return (
                                  <TableRow key={solicitacao.id}>
                                    <TableCell className="font-medium">
                                      {beneficiario ? beneficiario.nome_completo : 'Beneficiário Removido'}
                                    </TableCell>
                                    <TableCell className="capitalize">{solicitacao.tipo_plano}</TableCell>
                                    <TableCell>{getTipoBadge(solicitacao.tipo_solicitacao)}</TableCell>
                                    <TableCell>{getStatusBadge(solicitacao.status)}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      {formatDateTime(solicitacao.data_conclusao || solicitacao.data_rejeicao || solicitacao.updated_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">
                                            Cancelar
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Deseja cancelar este registro? O cliente poderá solicitar novamente.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleCancel(solicitacao.id)} className="bg-red-600 text-white hover:bg-red-700">
                                              Confirmar Cancelamento
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      Nenhuma solicitação concluída encontrada.
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalCompletedPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompletedCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={completedCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600">
                        Página {completedCurrentPage} de {totalCompletedPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompletedCurrentPage(prev => Math.min(totalCompletedPages, prev + 1))}
                        disabled={completedCurrentPage === totalCompletedPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingSolicitacao ? 'Editar Solicitação' : 'Nova Solicitação'}</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para {editingSolicitacao ? 'atualizar' : 'criar'} a solicitação.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="beneficiario">Beneficiário</Label>
                <Select 
                  value={formData.beneficiario_id} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, beneficiario_id: val }))}
                  disabled={!!editingSolicitacao}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um beneficiário" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {beneficiarios.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.nome_completo} ({formatCpfCnpj(b.cpf)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_plano">Tipo de Plano</Label>
                <Select 
                  value={formData.tipo_plano} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, tipo_plano: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="vida">Vida</SelectItem>
                    <SelectItem value="odonto">Odonto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_solicitacao">Tipo de Solicitação</Label>
                <Select 
                  value={formData.tipo_solicitacao} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, tipo_solicitacao: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCLUSAO">Inclusão</SelectItem>
                    <SelectItem value="EXCLUSAO">Exclusão</SelectItem>
                    <SelectItem value="ALTERACAO">Alteração</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="EM PROCESSAMENTO">Em Processamento</SelectItem>
                    <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                    <SelectItem value="REJEITADA">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'REJEITADA' && (
              <div className="space-y-2 bg-red-50 p-3 rounded-md border border-red-100 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="motivo_rejeicao" className="text-red-700">Motivo da Rejeição *</Label>
                <Textarea 
                  id="motivo_rejeicao" 
                  value={formData.motivo_rejeicao} 
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo_rejeicao: e.target.value }))}
                  placeholder="Explique o motivo da rejeição..."
                  className="bg-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea 
                id="observacoes" 
                value={formData.observacoes} 
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais..."
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Adicionar Dados do Beneficiário */}
      <Dialog open={isEditBeneficiarioModalOpen} onOpenChange={setIsEditBeneficiarioModalOpen}>
        <DialogContent className="sm:max-w-[800px] overflow-y-auto overflow-x-hidden sm:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Adicionar Dados do Beneficiário</DialogTitle>
            <DialogDescription>
              Complete os dados do plano de <span className="font-semibold uppercase">{editingBeneficiarioData?.solicitacao.tipo_plano}</span> para concluir a solicitação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBeneficiarioData} className="space-y-4 py-4">
            
            {/* Seção SAÚDE */}
            {editingBeneficiarioData?.solicitacao.tipo_plano === 'saude' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="saude_plano_nome">Nome do Plano</Label>
                  <Input 
                    id="saude_plano_nome"
                    value={beneficiarioFormData.saude_plano_nome}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_plano_nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_numero_carteirinha">Número Carteirinha</Label>
                  <Input 
                    id="saude_numero_carteirinha"
                    value={beneficiarioFormData.saude_numero_carteirinha}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_numero_carteirinha: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_link_carteirinha">Link Carteirinha</Label>
                  <Input 
                    id="saude_link_carteirinha"
                    value={beneficiarioFormData.saude_link_carteirinha}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_link_carteirinha: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_codigo_empresa">Código Empresa</Label>
                  <Input 
                    id="saude_codigo_empresa"
                    value={beneficiarioFormData.saude_codigo_empresa}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_codigo_empresa: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_acomodacao">Acomodação</Label>
                  <Input 
                    id="saude_acomodacao"
                    value={beneficiarioFormData.saude_acomodacao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_acomodacao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_data_inclusao">Data Inclusão</Label>
                  <Input 
                    id="saude_data_inclusao"
                    type="date"
                    value={beneficiarioFormData.saude_data_inclusao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_data_inclusao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_data_exclusao">Data Exclusão</Label>
                  <Input 
                    id="saude_data_exclusao"
                    type="date"
                    value={beneficiarioFormData.saude_data_exclusao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_data_exclusao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_produto">Produto</Label>
                  <Input 
                    id="saude_produto"
                    value={beneficiarioFormData.saude_produto}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_produto: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_valor_fatura">Valor Fatura</Label>
                  <Input 
                    id="saude_valor_fatura"
                    type="number"
                    step="0.01"
                    value={beneficiarioFormData.saude_valor_fatura}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, saude_valor_fatura: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saude_coparticipacao">Coparticipação</Label>
                  <Select 
                    value={beneficiarioFormData.saude_coparticipacao} 
                    onValueChange={(val) => setBeneficiarioFormData(prev => ({ ...prev, saude_coparticipacao: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Seção VIDA */}
            {editingBeneficiarioData?.solicitacao.tipo_plano === 'vida' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vida_plano_nome">Nome do Plano</Label>
                  <Input 
                    id="vida_plano_nome"
                    value={beneficiarioFormData.vida_plano_nome}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_plano_nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_numero_carteirinha">Número Carteirinha</Label>
                  <Input 
                    id="vida_numero_carteirinha"
                    value={beneficiarioFormData.vida_numero_carteirinha}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_numero_carteirinha: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_link_carteirinha">Link Carteirinha</Label>
                  <Input 
                    id="vida_link_carteirinha"
                    value={beneficiarioFormData.vida_link_carteirinha}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_link_carteirinha: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_codigo_empresa">Código Empresa</Label>
                  <Input 
                    id="vida_codigo_empresa"
                    value={beneficiarioFormData.vida_codigo_empresa}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_codigo_empresa: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_data_inclusao">Data Inclusão</Label>
                  <Input 
                    id="vida_data_inclusao"
                    type="date"
                    value={beneficiarioFormData.vida_data_inclusao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_data_inclusao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_data_exclusao">Data Exclusão</Label>
                  <Input 
                    id="vida_data_exclusao"
                    type="date"
                    value={beneficiarioFormData.vida_data_exclusao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_data_exclusao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_produto">Produto</Label>
                  <Input 
                    id="vida_produto"
                    value={beneficiarioFormData.vida_produto}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_produto: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vida_valor_fatura">Valor Fatura</Label>
                  <Input 
                    id="vida_valor_fatura"
                    type="number"
                    step="0.01"
                    value={beneficiarioFormData.vida_valor_fatura}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, vida_valor_fatura: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Seção ODONTO */}
            {editingBeneficiarioData?.solicitacao.tipo_plano === 'odonto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="odonto_plano_nome">Nome do Plano</Label>
                  <Input 
                    id="odonto_plano_nome"
                    value={beneficiarioFormData.odonto_plano_nome}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_plano_nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_numero_carteirinha">Número Carteirinha</Label>
                  <Input 
                    id="odonto_numero_carteirinha"
                    value={beneficiarioFormData.odonto_numero_carteirinha}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_numero_carteirinha: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_link_carteirinha">Link Carteirinha</Label>
                  <Input 
                    id="odonto_link_carteirinha"
                    value={beneficiarioFormData.odonto_link_carteirinha}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_link_carteirinha: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_codigo_empresa">Código Empresa</Label>
                  <Input 
                    id="odonto_codigo_empresa"
                    value={beneficiarioFormData.odonto_codigo_empresa}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_codigo_empresa: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_data_inclusao">Data Inclusão</Label>
                  <Input 
                    id="odonto_data_inclusao"
                    type="date"
                    value={beneficiarioFormData.odonto_data_inclusao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_data_inclusao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_data_exclusao">Data Exclusão</Label>
                  <Input 
                    id="odonto_data_exclusao"
                    type="date"
                    value={beneficiarioFormData.odonto_data_exclusao}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_data_exclusao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_produto">Produto</Label>
                  <Input 
                    id="odonto_produto"
                    value={beneficiarioFormData.odonto_produto}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_produto: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odonto_valor_fatura">Valor Fatura</Label>
                  <Input 
                    id="odonto_valor_fatura"
                    type="number"
                    step="0.01"
                    value={beneficiarioFormData.odonto_valor_fatura}
                    onChange={(e) => setBeneficiarioFormData(prev => ({ ...prev, odonto_valor_fatura: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditBeneficiarioModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e Concluir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SolicitacoesPage;