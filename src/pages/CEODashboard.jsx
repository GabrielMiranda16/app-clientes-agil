import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Users, Building, UserCheck, UserPlus, Trash2, ToggleLeft, ToggleRight, 
  Loader2, Edit, FileText, Briefcase, ClipboardList, Shield, 
  Clock, CheckCircle2, DollarSign, MoreHorizontal, ChevronLeft, ChevronRight,
  AlertCircle, TrendingUp, AlertTriangle, Download, FileSpreadsheet
} from 'lucide-react';
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency } from '@/lib/utils';
import { supabaseClient } from '@/lib/supabase';

// Services
import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { authService } from '@/services/authService';
import { apolicesService } from '@/services/apolicesService';
import { sendWelcomeEmail, generateTempPassword } from '@/services/emailService';
import { formatCpfCnpj } from '@/lib/masks';

const CEODashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [apolices, setApolices] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPerfil, setNewAdminPerfil] = useState('ADM');
  const [activeTab, setActiveTab] = useState("dashboard");
  const [closedAlerts, setClosedAlerts] = useState([]);

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Solicitacoes Filter State & Modal
  const [solicitacaoStatusFilter, setSolicitacaoStatusFilter] = useState("all");
  const [solicitacaoTypeFilter, setSolicitacaoTypeFilter] = useState("all");
  const [solicitacaoEmpresaFilter, setSolicitacaoEmpresaFilter] = useState("all");
  const [isSolicitacaoModalOpen, setIsSolicitacaoModalOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState(null);

  // Solicitacoes Pagination
  const [solicitacaoCurrentPage, setSolicitacaoCurrentPage] = useState(1);
  const SOLICITACOES_PER_PAGE = 10;

  // Edit Admin State
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [
        empresasResult,
        beneficiariosResult,
        solicitacoesResult,
        coparticipacoesResult,
        usersResult
      ] = await Promise.allSettled([
        empresasService.getEmpresas(),
        beneficiariosService.getAllBeneficiarios(),
        solicitacoesService.getAllSolicitacoes(),
        coparticipacaoService.getAllCoparticipacoes(),
        supabaseClient.from('users').select('*')
      ]);

      setEmpresas(empresasResult.status === 'fulfilled' ? (empresasResult.value || []) : []);
      setBeneficiarios(beneficiariosResult.status === 'fulfilled' ? (beneficiariosResult.value || []) : []);
      setSolicitacoes(solicitacoesResult.status === 'fulfilled' ? (solicitacoesResult.value || []) : []);
      setCoparticipacoes(coparticipacoesResult.status === 'fulfilled' ? (coparticipacoesResult.value || []) : []);
      setUsers(usersResult.status === 'fulfilled' ? (usersResult.value?.data || []) : []);
      try {
        const apolicesData = await apolicesService.getAllApolices();
        setApolices(apolicesData);
      } catch { setApolices([]); }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
    toast({ title: "Atualizado", description: "Dados atualizados com sucesso." });
  };

  // Reset pagination when filters change
  useEffect(() => {
    setSolicitacaoCurrentPage(1);
  }, [solicitacaoStatusFilter, solicitacaoTypeFilter, solicitacaoEmpresaFilter]);

  const admins = useMemo(() => users.filter(u => u.perfil === 'ADM' || u.perfil === 'CEO'), [users]);

  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Valor total de prêmios: não-SVD usa valor_premio, SVD soma sub_apolices.valor_premio
    const getApoliceTotal = (ap) => {
      if (ap.segmento === 'SAUDE_VIDA_ODONTO') {
        return (ap.dados_adicionais?.sub_apolices || []).reduce((s, sub) => s + (Number(sub.valor_premio) || 0), 0);
      }
      return Number(ap.valor_premio) || 0;
    };
    const valorTotalApolices = apolices.reduce((acc, ap) => acc + getApoliceTotal(ap), 0);

    return {
      totalEmpresas: empresas.length,
      totalBeneficiarios: beneficiarios.length,
      beneficiariosAtivos: beneficiarios.filter(b => b.situacao === 'ATIVO').length,
      totalAdmins: admins.length,
      solicitacoesPendentes: solicitacoes.filter(s => s.status === 'PENDENTE').length,
      solicitacoesConcluidas: solicitacoes.filter(s => s.status === 'CONCLUIDA').length,
      valorTotalApolices,
    };
  }, [empresas, beneficiarios, admins, solicitacoes, apolices]);

  // Top 5 empresas por prêmio total (todas as apólices)
  const top5EmpresasPremio = useMemo(() => {
    const premioByEmpresa = {};
    apolices.forEach(ap => {
      if (!ap.empresa_id) return;
      let total;
      if (ap.segmento === 'SAUDE_VIDA_ODONTO') {
        total = (ap.dados_adicionais?.sub_apolices || []).reduce((s, sub) => s + (Number(sub.valor_premio) || 0), 0);
      } else {
        total = Number(ap.valor_premio) || 0;
      }
      premioByEmpresa[ap.empresa_id] = (premioByEmpresa[ap.empresa_id] || 0) + total;
    });
    return Object.entries(premioByEmpresa)
      .map(([id, total]) => {
        const emp = empresas.find(e => String(e.id) === String(id));
        return {
          id,
          name: emp ? (emp.nome_fantasia || emp.razao_social || `ID: ${id}`).substring(0, 18) : `ID: ${id}`,
          full_name: emp ? (emp.nome_fantasia || emp.razao_social || `ID: ${id}`) : `ID: ${id}`,
          cnpj: emp?.cnpj || emp?.cpf || '—',
          total,
          beneficiariosCount: beneficiarios.filter(b => String(b.empresa_id) === String(id)).length,
          apolicesCount: apolices.filter(ap => String(ap.empresa_id) === String(id)).length,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [apolices, empresas, beneficiarios]);

  const alerts = useMemo(() => {
    const newAlerts = [];
    if (metrics.solicitacoesPendentes > 0) newAlerts.push({ id: 'pending_solicitations', type: 'warning', title: 'Solicitações Pendentes', description: `Existem ${metrics.solicitacoesPendentes} solicitações aguardando análise.`, icon: AlertCircle });
    const inactiveCompanies = empresas.filter(e => e.ativo === false);
    if (inactiveCompanies.length > 0) newAlerts.push({ id: 'inactive_companies', type: 'info', title: 'Empresas Inativas', description: `Existem ${inactiveCompanies.length} empresas marcadas como inativas.`, icon: AlertTriangle });
    if (metrics.totalBeneficiarios > 100) newAlerts.push({ id: 'beneficiaries_growth', type: 'success', title: 'Crescimento de Beneficiários', description: 'O sistema ultrapassou a marca de 100 beneficiários ativos!', icon: TrendingUp });
    return newAlerts;
  }, [metrics, empresas]);

  const handleCloseAlert = (alertId) => { setClosedAlerts(prev => [...prev, alertId]); };
  const visibleAlerts = useMemo(() => alerts.filter(alert => !closedAlerts.includes(alert.id)), [alerts, closedAlerts]);

  const filteredEmpresas = useMemo(() => {
    return empresas.map(empresa => {
      const beneficiariosCount = beneficiarios.filter(b => b.empresa_id === empresa.id).length;
      const adminsCount = users.filter(u => u.empresa_id === empresa.id && u.perfil === 'ADM').length;
      const status = empresa.ativo === false ? "Inativa" : "Ativa";
      return { ...empresa, beneficiariosCount, adminsCount, status };
    }).filter(empresa => {
      const matchesSearch = (empresa.nome_fantasia && empresa.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) || (empresa.razao_social && empresa.razao_social.toLowerCase().includes(searchTerm.toLowerCase())) || (empresa.cnpj && empresa.cnpj.includes(searchTerm));
      const matchesStatus = statusFilter === 'all' || empresa.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [empresas, beneficiarios, users, searchTerm, statusFilter]);

  const todasAsEmpresas = useMemo(() => {
    const matrices = empresas.filter(e => !e.empresa_matriz_id);
    const filiais = empresas.filter(e => e.empresa_matriz_id);
    matrices.sort((a, b) => (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''));
    const result = [];
    matrices.forEach(matriz => {
      result.push(matriz);
      const children = filiais.filter(f => f.empresa_matriz_id === matriz.id);
      children.sort((a, b) => (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''));
      children.forEach(child => { result.push({ ...child, isFilial: true }); });
    });
    const processedIds = new Set(result.map(r => r.id));
    const leftovers = empresas.filter(e => !processedIds.has(e.id));
    leftovers.sort((a, b) => (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''));
    return [...result, ...leftovers];
  }, [empresas]);

  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.map(solicitacao => {
      const empresa = empresas.find(e => e.id === solicitacao.empresa_id);
      const beneficiario = beneficiarios.find(b => b.id === solicitacao.beneficiario_id);
      return { ...solicitacao, empresa, beneficiario, nome_empresa: empresa ? empresa.nome_fantasia : 'Empresa não encontrada', nome_beneficiario: beneficiario ? beneficiario.nome_completo : 'N/A' };
    }).filter(solicitacao => {
      const matchesStatus = solicitacaoStatusFilter === "all" || solicitacao.status === solicitacaoStatusFilter;
      const matchesType = solicitacaoTypeFilter === "all" || solicitacao.tipo_solicitacao === solicitacaoTypeFilter;
      const matchesEmpresa = solicitacaoEmpresaFilter === "all" || String(solicitacao.empresa_id) === String(solicitacaoEmpresaFilter);
      return matchesStatus && matchesType && matchesEmpresa;
    });
  }, [solicitacoes, empresas, beneficiarios, solicitacaoStatusFilter, solicitacaoTypeFilter, solicitacaoEmpresaFilter]);

  const totalSolicitacaoPages = Math.ceil(filteredSolicitacoes.length / SOLICITACOES_PER_PAGE);
  const paginatedSolicitacoes = useMemo(() => {
    const startIndex = (solicitacaoCurrentPage - 1) * SOLICITACOES_PER_PAGE;
    return filteredSolicitacoes.slice(startIndex, startIndex + SOLICITACOES_PER_PAGE);
  }, [filteredSolicitacoes, solicitacaoCurrentPage]);

  const handleNextPage = () => { if (solicitacaoCurrentPage < totalSolicitacaoPages) setSolicitacaoCurrentPage(prev => prev + 1); };
  const handlePreviousPage = () => { if (solicitacaoCurrentPage > 1) setSolicitacaoCurrentPage(prev => prev - 1); };

  const handleViewCompany = (company) => { setSelectedCompany(company); setIsCompanyModalOpen(true); };
  const handleViewSolicitacao = (solicitacao) => { setSelectedSolicitacao(solicitacao); setIsSolicitacaoModalOpen(true); };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o e-mail.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const senhaTemporaria = generateTempPassword();
      const createdUser = await authService.createUser({
        email: newAdminEmail,
        password: senhaTemporaria,
        perfil: newAdminPerfil,
        empresa_id: null,
        ativo: true,
        must_change_password: true,
      });

      sendWelcomeEmail({
        nomeCliente: newAdminEmail,
        emailCliente: newAdminEmail,
        senhaTemporaria,
      }).then(r => {
        if (!r?.ok) toast({ variant: 'destructive', title: 'E-mail não enviado', description: 'Admin criado, mas o e-mail com a senha temporária falhou. Compartilhe a senha manualmente.' });
      }).catch(() => {
        toast({ variant: 'destructive', title: 'E-mail não enviado', description: 'Admin criado, mas o e-mail com a senha temporária falhou. Compartilhe a senha manualmente.' });
      });

      setUsers([...users, createdUser]);
      toast({ title: 'Sucesso', description: `${newAdminPerfil === 'CEO' ? 'CEO' : 'Administrador'} adicionado com sucesso.` });
      setNewAdminEmail('');
      setNewAdminPerfil('ADM');
      setIsModalOpen(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao criar', description: error?.message || JSON.stringify(error) });
    } finally {
       setIsSubmitting(false);
    }
  };

  const openEditModal = (admin) => {
    setEditingAdminId(admin.id);
    setEditAdminEmail(admin.email);
    setEditAdminPassword(admin.password);
    setIsEditModalOpen(true);
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    if (!editAdminEmail) return toast({ variant: 'destructive', title: 'Erro', description: 'O e-mail é obrigatório.' });
    if (!editAdminPassword || editAdminPassword.length < 6) return toast({ variant: 'destructive', title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.' });
    
    setIsSubmitting(true);
    try {
      await authService.updateUser(editingAdminId, { email: editAdminEmail, password: editAdminPassword });
      setUsers(users.map(u => u.id === editingAdminId ? { ...u, email: editAdminEmail, password: editAdminPassword } : u));
      toast({ title: 'Sucesso', description: 'Administrador atualizado com sucesso.' });
      setIsEditModalOpen(false);
      setEditingAdminId(null);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar administrador.' });
    } finally {
       setIsSubmitting(false);
    }
  };

  const toggleAdminStatus = async (id) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;
    
    try {
      await authService.updateUser(id, { ativo: !userToUpdate.ativo });
      setUsers(users.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
      toast({ title: 'Sucesso', description: 'Status do administrador atualizado.' });
    } catch(error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar status.' });
    }
  };

  const deleteAdmin = async (id) => {
    const admin = users.find(u => u.id === id);
    if (admin?.email === 'gabriel.miranda@segurosagil.com.br') {
      toast({ variant: 'destructive', title: 'Não permitido', description: 'Este usuário não pode ser excluído.' });
      return;
    }
    try {
       await authService.deleteUser(id);
       setUsers(users.filter(u => u.id !== id));
       toast({ title: 'Sucesso', description: 'Administrador excluído.' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao excluir', description: error?.message || JSON.stringify(error) });
    }
  };

  const formatDate = (dateString) => { if (!dateString) return '-'; return new Date(dateString).toLocaleDateString('pt-BR'); };

  const exportToCSV = (data, filename) => {
    if (!data || !data.length) return toast({ variant: "destructive", title: "Erro na exportação", description: "Não há dados para exportar." });
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(','), ...data.map(row => headers.map(fieldName => { const value = row[fieldName]?.toString().replace(/"/g, '""') || ''; return `"${value}"`; }).join(','))];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.setAttribute('href', url); link.setAttribute('download', `${filename}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast({ title: "Sucesso", description: "Relatório exportado com sucesso." });
  };

  const exportEmpresas = () => {
    const data = filteredEmpresas.map(emp => ({ 'Nome Fantasia': emp.nome_fantasia, 'Razão Social': emp.razao_social, 'CNPJ': emp.cnpj, 'Beneficiários': emp.beneficiariosCount, 'Administradores': emp.adminsCount, 'Status': emp.status }));
    exportToCSV(data, 'relatorio_empresas');
  };

  const exportSolicitacoes = () => {
    const data = filteredSolicitacoes.map(sol => ({ 'ID': sol.id, 'Empresa': sol.empresa?.nome_fantasia || 'N/A', 'Beneficiário': sol.beneficiario?.nome_completo || 'N/A', 'Tipo': sol.tipo_solicitacao, 'Status': sol.status, 'Data': formatDate(sol.data_solicitacao) }));
    exportToCSV(data, 'relatorio_solicitacoes');
  };

  const exportCoparticipacoes = () => {
    const currentYear = new Date().getFullYear();
    const data = coparticipacoes.filter(c => c.competencia && c.competencia.startsWith(String(currentYear))).map(cop => {
        const emp = empresas.find(e => e.id === cop.empresa_id);
        const ben = beneficiarios.find(b => b.id === cop.beneficiario_id);
        return { 'Competência': cop.competencia, 'Empresa': emp?.nome_fantasia || 'N/A', 'Beneficiário': ben?.nome_completo || 'N/A', 'Valor': formatCurrency(cop.valor || 0), 'Descrição': cop.descricao || '' };
    });
    if (data.length === 0) return toast({ variant: "destructive", title: "Aviso", description: "Não há coparticipações para o ano atual." });
    exportToCSV(data, 'relatorio_coparticipacoes');
  };

  const getCurrentDateTime = () => { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', }).format(new Date()); };

  const metricItems = [
    { title: "Empresas", value: metrics.totalEmpresas, icon: Building, color: "text-blue-600" },
    { title: "Beneficiários", value: metrics.totalBeneficiarios, icon: Users, color: "text-green-600" },
    { title: "Beneficiários Ativos", value: metrics.beneficiariosAtivos, icon: UserCheck, color: "text-emerald-600" },
    { title: "Administradores", value: metrics.totalAdmins, icon: Shield, color: "text-purple-600" },
    { title: "Valor Total Apólices", value: metrics.valorTotalApolices, icon: DollarSign, color: "text-orange-600", isCurrency: true },
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard CEO - Seguros Ágil</title>
        <meta name="description" content="Painel de controle do CEO para gestão de administradores e visualização de métricas." />
      </Helmet>
      <DashboardLayout>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard do CEO</h1>
              </div>
              <Button
                onClick={() => navigate('/admin')}
                className="bg-[#003580] hover:bg-[#002060] text-white flex items-center gap-2 ml-auto"
              >
                <Shield className="h-4 w-4" />
                Administração
              </Button>
            </div>
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto md:h-10 gap-1">
              <TabsTrigger className="text-xs md:text-sm" value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="empresas">Empresas</TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="solicitacoes">Solicitações</TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="admins">Admins</TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="relatorios">Relatórios</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="space-y-3 mb-6">
                {visibleAlerts.length > 0 && visibleAlerts.map((alert) => {
                  const Icon = alert.icon;
                  let className = "relative pr-10 ";
                  if (alert.type === 'warning') className += "bg-red-50 border-red-200 text-red-800";
                  if (alert.type === 'success') className += "bg-green-50 border-green-200 text-green-800";
                  if (alert.type === 'info') className += "bg-blue-50 border-blue-200 text-blue-800";
                  return (
                    <Alert key={alert.id} className={className}>
                      <Icon className="h-4 w-4" />
                      <AlertTitle>{alert.title}</AlertTitle>
                      <AlertDescription>{alert.description}</AlertDescription>
                      <button onClick={() => handleCloseAlert(alert.id)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Fechar alerta">
                         <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    </Alert>
                  );
                })}
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[126px]" />) : metricItems.map((item, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (index + 1) }}>
                    <MetricCard title={item.title} value={item.value} icon={item.icon} color={item.color} isCurrency={item.isCurrency} />
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mt-4">
                {/* Gráfico Top 5 por prêmio */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Top 5 Empresas — Maior Prêmio</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        {top5EmpresasPremio.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={[...top5EmpresasPremio].reverse()} layout="vertical" margin={{ left: 8, right: 24 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v, name, props) => [formatCurrency(v), props.payload?.full_name || name]} />
                              <Bar dataKey="total" fill="#003580" name="Prêmio Total" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de apólices</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Card detalhado Top 5 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Detalhes — Top 5 por Prêmio</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {top5EmpresasPremio.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Sem dados de apólices</div>
                      ) : top5EmpresasPremio.map((emp, i) => (
                        <div key={emp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                          <span className="text-lg font-bold text-[#003580] w-6 flex-shrink-0">#{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 truncate">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">{formatCpfCnpj(emp.cnpj)} · {emp.apolicesCount} apólice(s) · {emp.beneficiariosCount} benef.</p>
                          </div>
                          <span className="font-bold text-[#003580] text-sm flex-shrink-0">{formatCurrency(emp.total)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">Dashboard do CEO - Seguros Ágil | Última atualização: {getCurrentDateTime()}</div>
            </motion.div>
          </TabsContent>

          <TabsContent value="empresas">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Gestão de Empresas</CardTitle>
                  <CardDescription>Gerencie todas as empresas cadastradas no sistema.</CardDescription>
                  <div className="flex flex-col md:flex-row gap-4 mt-4"><div className="relative flex-1"><Input placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Ativa">Ativa</SelectItem><SelectItem value="Inativa">Inativa</SelectItem></SelectContent></Select></div>
                </CardHeader>
                <CardContent>
                  {filteredEmpresas.length > 0 ? (<div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>CNPJ</TableHead><TableHead className="text-center">Beneficiários</TableHead><TableHead className="text-center">ADMs</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredEmpresas.map((empresa) => (<TableRow key={empresa.id}><TableCell><div className="font-medium">{empresa.nome_fantasia}</div><div className="text-xs text-muted-foreground">{empresa.razao_social}</div></TableCell><TableCell>{formatCpfCnpj(empresa.cnpj)}</TableCell><TableCell className="text-center">{empresa.beneficiariosCount}</TableCell><TableCell className="text-center">{empresa.adminsCount}</TableCell><TableCell><Badge variant={empresa.status === 'Ativa' ? 'default' : 'destructive'} className={empresa.status === 'Ativa' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}>{empresa.status}</Badge></TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleViewCompany(empresa)}>Visualizar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody></Table></div>) : (<div className="text-center py-10"><p className="text-muted-foreground">Nenhuma empresa encontrada.</p></div>)}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="solicitacoes">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Gestão de Solicitações</CardTitle>
                  <CardDescription>Visualize e gerencie todas as solicitações do sistema.</CardDescription>
                  <div className="flex flex-col md:flex-row gap-4 mt-4">
                    <Select value={solicitacaoStatusFilter} onValueChange={setSolicitacaoStatusFilter}><SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Status: Todos</SelectItem><SelectItem value="PENDENTE">Pendente</SelectItem><SelectItem value="EM PROCESSAMENTO">Em Processamento</SelectItem><SelectItem value="CONCLUIDA">Concluída</SelectItem><SelectItem value="REJEITADA">Rejeitada</SelectItem></SelectContent></Select>
                    <Select value={solicitacaoTypeFilter} onValueChange={setSolicitacaoTypeFilter}><SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Tipo: Todos</SelectItem><SelectItem value="INCLUSAO">Inclusão</SelectItem><SelectItem value="EXCLUSAO">Exclusão</SelectItem><SelectItem value="ALTERACAO">Alteração</SelectItem></SelectContent></Select>
                    <Select value={solicitacaoEmpresaFilter} onValueChange={setSolicitacaoEmpresaFilter}><SelectTrigger className="w-full md:w-[250px]"><SelectValue placeholder="Empresa" /></SelectTrigger><SelectContent><SelectItem value="all">Empresa: Todas</SelectItem>{todasAsEmpresas.map(emp => (<SelectItem key={emp.id} value={String(emp.id)}>{emp.isFilial ? `└─ ${emp.nome_fantasia}` : emp.nome_fantasia}</SelectItem>))}</SelectContent></Select>
                  </div>
                </CardHeader>
                <CardContent>
                   {filteredSolicitacoes.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-[80px]">ID</TableHead><TableHead>Empresa</TableHead><TableHead>Beneficiário</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                        <TableBody>{paginatedSolicitacoes.map((solicitacao) => (<TableRow key={solicitacao.id}><TableCell className="font-mono text-xs">{String(solicitacao.id).substring(0,8)}...</TableCell><TableCell>{solicitacao.empresa?.nome_fantasia || 'N/A'}</TableCell><TableCell>{solicitacao.beneficiario?.nome_completo || 'N/A'}</TableCell><TableCell>{solicitacao.tipo_solicitacao}</TableCell><TableCell><Badge variant={solicitacao.status === 'REJEITADA' ? 'destructive' : solicitacao.status === 'CONCLUIDA' ? 'default' : 'outline'} className={solicitacao.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800 border-green-200' : solicitacao.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : solicitacao.status === 'EM PROCESSAMENTO' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>{solicitacao.status}</Badge></TableCell><TableCell>{formatDate(solicitacao.data_solicitacao)}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleViewSolicitacao(solicitacao)}>Visualizar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody>
                      </Table>
                      <div className="flex items-center justify-between px-4 py-4 border-t"><div className="flex-1 text-sm text-muted-foreground">Página {solicitacaoCurrentPage} de {totalSolicitacaoPages > 0 ? totalSolicitacaoPages : 1}</div><div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={solicitacaoCurrentPage === 1}><ChevronLeft className="h-4 w-4 mr-2" />Anterior</Button><Button variant="outline" size="sm" onClick={handleNextPage} disabled={solicitacaoCurrentPage >= totalSolicitacaoPages}>Próximo<ChevronRight className="h-4 w-4 ml-2" /></Button></div></div>
                    </div>
                   ) : (<div className="text-center py-12 text-muted-foreground"><p>Nenhuma solicitação encontrada.</p></div>)}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="admins">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Gestão de Administradores</CardTitle><CardDescription>Adicione e gerencie os administradores do sistema.</CardDescription></div>
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#003580] hover:bg-[#002060] text-white shadow-md hover:shadow-lg transition-all">
                        <UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader><DialogTitle>Adicionar Novo Usuário</DialogTitle></DialogHeader>
                      <form onSubmit={handleAddAdmin}>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label>Perfil</Label>
                            <Select value={newAdminPerfil} onValueChange={setNewAdminPerfil}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADM">ADM</SelectItem>
                                <SelectItem value="CEO">CEO</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="adm-email">Email</Label>
                            <Input id="adm-email" type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} />
                            <p className="text-xs text-gray-400">Uma senha temporária será gerada e enviada por e-mail automaticamente.</p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />) :
                      admins.length > 0 ? admins.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow gap-2 overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0 flex-1"><div className="bg-gray-100 p-2 rounded-full flex-shrink-0"><Shield className="h-5 w-5 text-gray-600" /></div><div className="min-w-0"><p className="font-semibold text-gray-800 truncate">{admin.email}</p><div className="flex items-center gap-1 mt-1 flex-wrap"><Badge variant="outline" className="text-xs">{admin.perfil}</Badge><Badge variant={admin.ativo ? 'default' : 'destructive'} className={admin.ativo ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>{admin.ativo ? 'Ativo' : 'Inativo'}</Badge></div></div></div>
                          <div className="flex items-center space-x-1 flex-shrink-0"><Button variant="ghost" size="icon" onClick={() => openEditModal(admin)} title="Editar Administrador" className="hover:bg-blue-50 hover:text-blue-600"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => toggleAdminStatus(admin.id)} title={admin.ativo ? "Desativar" : "Ativar"} className={admin.ativo ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-green-50 hover:text-green-600"}>{admin.ativo ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o administrador.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteAdmin(admin.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
                        </div>
                      )) : (<div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed"><Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">Nenhum administrador cadastrado.</p><p className="text-sm text-gray-400">Adicione novos administradores para gerenciar o sistema.</p></div>)
                    }
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="relatorios">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Empresas</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredEmpresas.length}</div>
                    <p className="text-xs text-muted-foreground mb-4">Empresas cadastradas</p>
                    <Button onClick={exportEmpresas} className="w-full" variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV</Button>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.filter(u => u.perfil === 'CLIENTE').length}</div>
                    <p className="text-xs text-muted-foreground mb-4">Usuários clientes</p>
                    <Button onClick={() => exportToCSV(users.filter(u => u.perfil === 'CLIENTE').map(u => ({ 'Email': u.email, 'Perfil': u.perfil, 'Ativo': u.ativo ? 'Sim' : 'Não' })), 'relatorio_clientes')} className="w-full" variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV</Button>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-purple-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Beneficiários</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{beneficiarios.length}</div>
                    <p className="text-xs text-muted-foreground mb-4">Beneficiários cadastrados</p>
                    <Button onClick={() => exportToCSV(beneficiarios.map(b => ({ 'Nome': b.nome_completo, 'CPF': b.cpf || '—', 'Tipo': b.tipo_beneficiario || '—', 'Situação': b.situacao || '—', 'Empresa ID': b.empresa_id })), 'relatorio_beneficiarios')} className="w-full" variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV</Button>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-orange-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Apólices</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{apolices.length}</div>
                    <p className="text-xs text-muted-foreground mb-4">Apólices cadastradas</p>
                    <Button onClick={() => exportToCSV(apolices.map(ap => { const emp = empresas.find(e => String(e.id) === String(ap.empresa_id)); return { 'Número': ap.numero_apolice || '—', 'Segmento': ap.segmento || '—', 'Empresa': emp?.nome_fantasia || '—', 'Seguradora': ap.seguradora || '—', 'Prêmio': ap.valor_premio || 0, 'Vigência Início': ap.vigencia_inicio || '—', 'Vigência Fim': ap.vigencia_fim || '—' }; }), 'relatorio_apolices')} className="w-full" variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV</Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Editar Administrador</DialogTitle></DialogHeader><form onSubmit={handleEditAdmin}><div className="grid gap-4 py-4"><div className="space-y-2"><Label htmlFor="edit-email">Email</Label><Input id="edit-email" type="email" value={editAdminEmail} onChange={e => setEditAdminEmail(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-password">Senha</Label><Input id="edit-password" type="password" value={editAdminPassword} onChange={e => setEditAdminPassword(e.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Alterações</Button></DialogFooter></form></DialogContent></Dialog>
        
        <Dialog open={!isLoading && empresas.length === 0 && isWelcomeModalOpen} onOpenChange={(open) => setIsWelcomeModalOpen(open)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bem-vindo ao Dashboard do CEO</DialogTitle>
              <DialogDescription>Nenhuma empresa cadastrada ainda. Crie uma empresa ou um administrador para começar.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => { setIsWelcomeModalOpen(false); navigate('/admin'); }}>Ir para Administração</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Detalhes da Empresa</DialogTitle></DialogHeader>{selectedCompany && (<div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div><Label className="text-xs text-muted-foreground">Nome Fantasia</Label><div className="font-medium text-base">{selectedCompany.nome_fantasia}</div></div><div><Label className="text-xs text-muted-foreground">Razão Social</Label><div className="font-medium text-base">{selectedCompany.razao_social}</div></div><div><Label className="text-xs text-muted-foreground">CNPJ</Label><div className="font-medium text-base">{selectedCompany.cnpj}</div></div><div><Label className="text-xs text-muted-foreground">Status</Label><div><Badge variant={selectedCompany.status === 'Ativa' ? 'default' : 'destructive'} className={selectedCompany.status === 'Ativa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{selectedCompany.status}</Badge></div></div><div><Label className="text-xs text-muted-foreground">Total de Beneficiários</Label><div className="font-medium text-base">{selectedCompany.beneficiariosCount}</div></div><div><Label className="text-xs text-muted-foreground">Administradores</Label><div className="font-medium text-base">{selectedCompany.adminsCount}</div></div></div></div>)}<DialogFooter><Button type="button" variant="outline" onClick={() => setIsCompanyModalOpen(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isSolicitacaoModalOpen} onOpenChange={setIsSolicitacaoModalOpen}><DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Detalhes da Solicitação</DialogTitle><DialogDescription>Visualizar informações completas da solicitação.</DialogDescription></DialogHeader>{selectedSolicitacao && (<div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">ID da Solicitação</Label><div className="font-mono text-sm">{selectedSolicitacao.id}</div></div><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">Data</Label><div className="text-sm">{formatDate(selectedSolicitacao.data_solicitacao)}</div></div><div className="col-span-2"><Label className="text-xs text-muted-foreground">Empresa</Label><div className="text-base font-medium">{selectedSolicitacao.empresa?.nome_fantasia || 'N/A'}</div></div><div className="col-span-2"><Label className="text-xs text-muted-foreground">Beneficiário</Label><div className="text-base font-medium">{selectedSolicitacao.beneficiario?.nome_completo || 'N/A'}</div></div><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">Tipo</Label><div className="text-sm font-medium">{selectedSolicitacao.tipo_solicitacao}</div></div><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><Badge variant={selectedSolicitacao.status === 'REJEITADA' ? 'destructive' : selectedSolicitacao.status === 'CONCLUIDA' ? 'default' : 'outline'} className={selectedSolicitacao.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800 border-green-200' : selectedSolicitacao.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : selectedSolicitacao.status === 'EM PROCESSAMENTO' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>{selectedSolicitacao.status}</Badge></div></div>{selectedSolicitacao.motivo && (<div className="col-span-2"><Label className="text-xs text-muted-foreground">Motivo</Label><div className="text-sm p-2 bg-slate-50 rounded border mt-1">{selectedSolicitacao.motivo}</div></div>)}</div></div>)}<DialogFooter><Button type="button" onClick={() => setIsSolicitacaoModalOpen(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>

      </DashboardLayout>
    </>
  );
};

export default CEODashboard;