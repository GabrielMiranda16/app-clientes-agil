import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useLocation } from 'react-router-dom';
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
  AlertCircle, TrendingUp, AlertTriangle, Download, FileSpreadsheet, HeartHandshake, Plus, Bot, Pencil, ChevronDown
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
  const location = useLocation();
  
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

  useEffect(() => {
    const tab = location.state?.tab;
    if (tab) {
      setActiveTab(tab);
      if (tab === 'lembretes_adm') fetchLembretesAdm();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  // Empresas Pagination
  const [empresasCurrentPage, setEmpresasCurrentPage] = useState(1);
  const EMPRESAS_PER_PAGE = 10;

  // Solicitacoes Pagination
  const [solicitacaoCurrentPage, setSolicitacaoCurrentPage] = useState(1);
  const SOLICITACOES_PER_PAGE = 10;

  // Edit Admin State
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);

  // Gi métricas
  const [giMetricas, setGiMetricas] = useState(null);
  const [expandedEmpresaId, setExpandedEmpresaId] = useState(null);
  const [expandedSolId, setExpandedSolId] = useState(null);
  const [isLoadingGi, setIsLoadingGi] = useState(true);

  // Orcamentos da semana
  const [orcamentosSemana, setOrcamentosSemana] = useState([]);

  // Lembretes Ágil
  const [lembretes, setLembretes] = useState([]);
  const [loadingLembretes, setLoadingLembretes] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ descricao: '', data: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ descricao: '', data: '' });
  const [savingLembrete, setSavingLembrete] = useState(false);

  const fetchLembretes = async () => {
    try {
      const r = await fetch('https://agil-instagram.fly.dev/api/lembretes?token=agil-lembretes-2026&empresa=agil');
      if (r.ok) setLembretes(await r.json());
    } catch {}
    setLoadingLembretes(false);
  };

  const concluirLembrete = async (id) => {
    await fetch(`https://agil-instagram.fly.dev/api/lembretes/${id}/concluir`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'agil-lembretes-2026' }),
    });
    setLembretes(prev => prev.filter(l => l.id !== id));
  };

  const adicionarLembrete = async () => {
    if (!addForm.descricao.trim() || savingLembrete) return;
    setSavingLembrete(true);
    try {
      const body = { token: 'agil-lembretes-2026', empresa: 'agil', descricao: addForm.descricao.trim() };
      if (addForm.data) body.data_lembrete = new Date(addForm.data).toISOString();
      const r = await fetch('https://agil-instagram.fly.dev/api/lembretes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setAddForm({ descricao: '', data: '' });
        setAddOpen(false);
        await fetchLembretes();
      }
    } catch {}
    setSavingLembrete(false);
  };

  const salvarEdicao = async () => {
    if (!editForm.descricao.trim() || savingLembrete) return;
    setSavingLembrete(true);
    try {
      const body = {
        token: 'agil-lembretes-2026',
        descricao: editForm.descricao.trim(),
        data_lembrete: editForm.data ? new Date(editForm.data).toISOString() : null,
      };
      const r = await fetch(`https://agil-instagram.fly.dev/api/lembretes/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setEditId(null);
        await fetchLembretes();
      }
    } catch {}
    setSavingLembrete(false);
  };

  // Lembretes CEO↔ADM (internos)
  const [lembretesAdm, setLembretesAdm] = useState([]);
  const [unreadAdm, setUnreadAdm] = useState(0);
  const [textoNovoCEO, setTextoNovoCEO] = useState('');
  const [savingCEO, setSavingCEO] = useState(false);
  const [addOpenAdm, setAddOpenAdm] = useState(false);

  const fetchLembretesAdm = async () => {
    const { data } = await supabaseClient.from('lembretes_adm').select('*').order('created_at', { ascending: true });
    setLembretesAdm(data || []);
    const unread = (data || []).filter(l => l.autor === 'adm' && !l.lida);
    if (unread.length > 0) {
      setUnreadAdm(0);
      await supabaseClient.from('lembretes_adm').update({ lida: true }).in('id', unread.map(l => l.id));
    }
  };

  const enviarLembreteCEO = async () => {
    if (!textoNovoCEO.trim() || savingCEO) return;
    setSavingCEO(true);
    await supabaseClient.from('lembretes_adm').insert({ texto: textoNovoCEO.trim(), autor: 'ceo', lida: false });
    setTextoNovoCEO('');
    await fetchLembretesAdm();
    setSavingCEO(false);
  };

  const excluirMensagemCEO = async (id) => {
    await supabaseClient.from('lembretes_adm').delete().eq('id', id);
    setLembretesAdm(prev => prev.filter(l => l.id !== id));
  };

  // Parceiros state
  const [parceiros, setParceiros] = useState([]);
  const [isNovoParceiro, setIsNovoParceiro] = useState(false);
  const [isSubmittingParceiro, setIsSubmittingParceiro] = useState(false);
  const [novoParceiro, setNovoParceiro] = useState({
    nome_completo: '', email: '', telefone: '', modalidade: 'PF',
    cpf_cnpj: '',
  });
  const [editingParceiro, setEditingParceiro] = useState(null);
  const [isEditParceiroOpen, setIsEditParceiroOpen] = useState(false);
  const [isSubmittingEditParceiro, setIsSubmittingEditParceiro] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [
        empresasResult,
        beneficiariosResult,
        solicitacoesResult,
        coparticipacoesResult,
        usersResult,
        parceirosResult,
      ] = await Promise.allSettled([
        empresasService.getEmpresas(),
        beneficiariosService.getAllBeneficiarios(),
        solicitacoesService.getAllSolicitacoes(),
        coparticipacaoService.getAllCoparticipacoes(),
        supabaseClient.from('users').select('*'),
        supabaseClient.from('parceiros').select('*, users(name, email, ativo)').order('created_at', { ascending: false }),
      ]);

      setEmpresas(empresasResult.status === 'fulfilled' ? (empresasResult.value || []) : []);
      setBeneficiarios(beneficiariosResult.status === 'fulfilled' ? (beneficiariosResult.value || []) : []);
      setSolicitacoes(solicitacoesResult.status === 'fulfilled' ? (solicitacoesResult.value || []) : []);
      setCoparticipacoes(coparticipacoesResult.status === 'fulfilled' ? (coparticipacoesResult.value || []) : []);
      setUsers(usersResult.status === 'fulfilled' ? (usersResult.value?.data || []) : []);
      setParceiros(parceirosResult.status === 'fulfilled' ? (parceirosResult.value?.data || []) : []);
      try {
        const apolicesData = await apolicesService.getAllApolices();
        setApolices(apolicesData);
      } catch { setApolices([]); }

      try {
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        const { data: orcSemana } = await supabaseClient
          .from('orcamentos')
          .select('id, status, created_at, segmento, cliente_nome, parceiro_id')
          .gte('created_at', seteDiasAtras.toISOString());
        setOrcamentosSemana(orcSemana || []);
      } catch { setOrcamentosSemana([]); }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGiMetricas = async () => {
    try {
      const res = await fetch('https://agil-seguros.fly.dev/api/metricas?token=agil-gi-metricas-2026');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setGiMetricas(data);
    } catch (err) {
      console.error('Erro ao buscar métricas da Gi:', err);
    } finally {
      setIsLoadingGi(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchGiMetricas();
    const interval = setInterval(fetchGiMetricas, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLembretes();
  }, []);

  useEffect(() => {
    supabaseClient
      .from('lembretes_adm')
      .select('id', { count: 'exact', head: true })
      .eq('autor', 'adm')
      .eq('lida', false)
      .then(({ count }) => setUnreadAdm(count || 0))
      .catch(() => {});
  }, []);

  const handleRefresh = () => {
    fetchData();
    toast({ title: "Atualizado", description: "Dados atualizados com sucesso." });
  };

  const handleEditParceiro = async (e) => {
    e.preventDefault();
    if (!editingParceiro) return;
    setIsSubmittingEditParceiro(true);
    try {
      const { supabase: sb } = await import('@/lib/customSupabaseClient');
      const { error } = await sb.from('parceiros').update({
        nome_completo: editingParceiro.nome_completo,
        modalidade: editingParceiro.modalidade,
        cpf_cnpj: editingParceiro.cpf_cnpj || null,
        telefone: editingParceiro.telefone || null,
      }).eq('id', editingParceiro.id);
      if (error) throw new Error(error.message);
      const { error: userErr } = await sb.from('users').update({ ativo: editingParceiro.ativo }).eq('id', editingParceiro.user_id);
      if (userErr) throw new Error(userErr.message);
      toast({ title: 'Parceiro atualizado!' });
      setIsEditParceiroOpen(false);
      setTimeout(() => setEditingParceiro(null), 300);
      fetchData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsSubmittingEditParceiro(false);
    }
  };

  const handleDeleteParceiro = async (p) => {
    try {
      const { supabase: sb } = await import('@/lib/customSupabaseClient');
      const { error: parcErr } = await sb.from('parceiros').delete().eq('id', p.id);
      if (parcErr) throw new Error(parcErr.message);
      const { error: userErr } = await sb.from('users').delete().eq('id', p.user_id);
      if (userErr) throw new Error(userErr.message);
      toast({ title: 'Parceiro excluído.' });
      fetchData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setSolicitacaoCurrentPage(1);
  }, [solicitacaoStatusFilter, solicitacaoTypeFilter, solicitacaoEmpresaFilter]);

  useEffect(() => {
    setEmpresasCurrentPage(1);
  }, [searchTerm, statusFilter]);

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

  // Top 5 empresas por prêmio total — filiais agrupadas na matriz
  const top5EmpresasPremio = useMemo(() => {
    const getGrupoId = (empresaId) => {
      const emp = empresas.find(e => String(e.id) === String(empresaId));
      return emp?.empresa_matriz_id ? String(emp.empresa_matriz_id) : String(empresaId);
    };
    const getEmpresasDoGrupo = (grupoId) =>
      empresas.filter(e => String(e.id) === grupoId || String(e.empresa_matriz_id) === grupoId);

    const premioByGrupo = {};
    apolices.forEach(ap => {
      if (!ap.empresa_id) return;
      const grupoId = getGrupoId(ap.empresa_id);
      let total;
      if (ap.segmento === 'SAUDE_VIDA_ODONTO') {
        total = (ap.dados_adicionais?.sub_apolices || []).reduce((s, sub) => s + (Number(sub.valor_premio) || 0), 0);
      } else {
        total = Number(ap.valor_premio) || 0;
      }
      premioByGrupo[grupoId] = (premioByGrupo[grupoId] || 0) + total;
    });

    return Object.entries(premioByGrupo)
      .map(([grupoId, total]) => {
        const matriz = empresas.find(e => String(e.id) === grupoId);
        const grupEmps = getEmpresasDoGrupo(grupoId);
        const grupIds = grupEmps.map(e => String(e.id));
        const fullName = matriz ? (matriz.nome_fantasia || matriz.razao_social || `ID: ${grupoId}`) : `ID: ${grupoId}`;
        return {
          id: grupoId,
          name: fullName.substring(0, 18),
          full_name: fullName,
          cnpj: matriz?.cnpj || matriz?.cpf || '—',
          total,
          beneficiariosCount: beneficiarios.filter(b => grupIds.includes(String(b.empresa_id))).length,
          apolicesCount: apolices.filter(ap => grupIds.includes(String(ap.empresa_id))).length,
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

  const sortedEmpresas = useMemo(() =>
    [...filteredEmpresas].sort((a, b) =>
      (a.razao_social || a.nome_fantasia || '').localeCompare(b.razao_social || b.nome_fantasia || '', 'pt-BR', { sensitivity: 'base' })
    ), [filteredEmpresas]);

  const totalEmpresasPages = Math.max(1, Math.ceil(sortedEmpresas.length / EMPRESAS_PER_PAGE));
  const paginatedEmpresas = useMemo(() =>
    sortedEmpresas.slice((empresasCurrentPage - 1) * EMPRESAS_PER_PAGE, empresasCurrentPage * EMPRESAS_PER_PAGE),
    [sortedEmpresas, empresasCurrentPage]);

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
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{(() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })()}, Gabriel!</h1>
            <div className="hidden sm:block overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsList className="inline-flex h-auto gap-1 bg-white/10 border border-white/20 rounded-lg p-1 min-w-max">
                {[
                  { value: 'dashboard',    label: 'Dashboard' },
                  { value: 'empresas',     label: 'Clientes' },
                  { value: 'solicitacoes', label: 'Gestão de Solicitações' },
                  { value: 'admins',       label: 'Admins' },
                  { value: 'parceiros',    label: 'Parceiros' },
                  { value: 'relatorios',   label: 'Relatórios' },
                  { value: 'lembretes_adm',label: 'Lembretes', badge: unreadAdm },
                ].map(({ value, label, badge }) => (
                  <TabsTrigger key={value} value={value}
                    onClick={() => { if (value === 'lembretes_adm') fetchLembretesAdm(); }}
                    className="shrink-0 text-xs md:text-sm rounded-md text-white/70 data-[state=active]:bg-white/25 data-[state=active]:text-white data-[state=active]:font-semibold hover:text-white px-3 py-1.5 relative">
                    {label}
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{badge}</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value="dashboard" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[126px]" />) : metricItems.map((item, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (index + 1) }}>
                    <MetricCard title={item.title} value={item.value} icon={item.icon} color={item.color} isCurrency={item.isCurrency} />
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mt-4 lg:items-stretch">
                {/* Gráfico Top 5 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ minWidth: 0 }} className="flex flex-col">
                  <Card className="overflow-hidden flex flex-col h-full">
                    <CardHeader className="pb-2 px-3"><CardTitle className="text-sm sm:text-base">Top 5 — Gráfico</CardTitle></CardHeader>
                    <CardContent className="px-2 pb-3 flex-1 flex flex-col">
                      {top5EmpresasPremio.length > 0 ? (
                        <div className="w-full h-[180px] lg:flex-1 lg:min-h-0 overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...top5EmpresasPremio].reverse()} layout="vertical" margin={{ left: 0, right: 32, top: 2, bottom: 2 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 9 }} />
                              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 9 }} />
                              <Tooltip formatter={(v, name, props) => [formatCurrency(v), props.payload?.full_name || name]} />
                              <Bar dataKey="total" fill="#003580" name="Prêmio Total" radius={[0, 3, 3, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Sem dados de apólices</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Card detalhado Top 5 — sempre visível */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col">
                  <Card className="overflow-hidden h-full">
                    <CardHeader className="pb-2"><CardTitle className="text-base">Top 5 — Ranking</CardTitle></CardHeader>
                    <CardContent className="space-y-2 px-3 pb-4">
                      {top5EmpresasPremio.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Sem dados de apólices</div>
                      ) : top5EmpresasPremio.map((emp, i) => (
                        <div key={emp.id} className="flex gap-2 p-2.5 bg-gray-50 rounded-lg border">
                          <span className="text-sm font-bold text-[#003580] w-5 flex-shrink-0 pt-0.5">#{i + 1}</span>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-semibold text-gray-800 text-xs leading-tight truncate">{emp.full_name}</p>
                              <span className="font-bold text-[#003580] text-xs flex-shrink-0 ml-1 whitespace-nowrap">{formatCurrency(emp.total)}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{emp.apolicesCount} apólice(s) · {emp.beneficiariosCount} benef.</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Gi — Métricas do Agente Virtual */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-[#003580]" />
                      <CardTitle className="text-base">Gi — Agente Virtual</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={fetchGiMetricas} className="text-xs text-[#003580] hover:underline flex items-center gap-1">
                        {isLoadingGi ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Atualizar
                      </button>
                      {giMetricas && (
                        <span className="text-xs text-gray-400">
                          {new Date(giMetricas.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingGi ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : giMetricas ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          {[
                            { label: 'Sessões ativas', hoje: giMetricas.sessoes_ativas, mes: null },
                            { label: 'Conversas', hoje: giMetricas.hoje.conversas, mes: giMetricas.mes.conversas },
                            { label: 'Cotações', hoje: giMetricas.hoje.cotacoes_iniciadas, mes: giMetricas.mes.cotacoes_iniciadas },
                            { label: 'Concluídas', hoje: giMetricas.hoje.cotacoes_concluidas, mes: giMetricas.mes.cotacoes_concluidas },
                            { label: 'Leads', hoje: giMetricas.hoje.leads_gerados, mes: giMetricas.mes.leads_gerados },
                            { label: 'Urgências', hoje: giMetricas.hoje.urgencias, mes: giMetricas.mes.urgencias },
                          ].map((m, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg border p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                              <p className="text-2xl font-bold text-[#003580]">{m.hoje}</p>
                              {m.mes !== null && <p className="text-xs text-gray-400">{m.mes} no mês</p>}
                            </div>
                          ))}
                        </div>
                        {giMetricas.mes.por_produto && Object.keys(giMetricas.mes.por_produto).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Cotações por produto (mês)</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(giMetricas.mes.por_produto)
                                .sort(([, a], [, b]) => b - a)
                                .map(([produto, count]) => (
                                  <span key={produto} className="inline-flex items-center gap-1 bg-blue-50 text-[#003580] hover:bg-blue-50 hover:text-[#003580] text-xs font-medium px-2 py-1 rounded-full border border-blue-100">
                                    {produto} <span className="font-bold">{count}</span>
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Não foi possível carregar métricas da Gi.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Funil da semana — Parceiros */}
              {(() => {
                const agora = new Date();
                const tresDiasAtras = new Date(agora - 3 * 24 * 60 * 60 * 1000);
                const novas = orcamentosSemana.length;
                const aguardando = orcamentosSemana.filter(o => o.status === 'SOLICITACAO').length;
                const emAndamento = orcamentosSemana.filter(o => ['ORCAMENTO','DOCUMENTOS','ASSINATURA'].includes(o.status)).length;
                const concluidas = orcamentosSemana.filter(o => ['CONCLUIDO','COMISSAO'].includes(o.status)).length;
                const paradas = orcamentosSemana.filter(o => o.status === 'SOLICITACAO' && new Date(o.created_at) < tresDiasAtras);
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-[#003580]" />
                          <CardTitle className="text-base">Funil da Semana — Parceiros</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Novas', value: novas, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
                            { label: 'Aguardando ADM', value: aguardando, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
                            { label: 'Em andamento', value: emAndamento, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
                            { label: 'Concluídas', value: concluidas, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                          ].map((m, i) => (
                            <div key={i} className={`rounded-lg border p-3 text-center ${m.bg}`}>
                              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        {paradas.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {paradas.length} solicitação(ões) sem resposta há +3 dias
                            </p>
                            <div className="space-y-1">
                              {paradas.slice(0, 5).map(o => (
                                <div key={o.id} className="flex items-center justify-between text-xs bg-red-50 border border-red-100 rounded px-3 py-1.5">
                                  <span className="font-medium text-gray-700">{o.cliente_nome}</span>
                                  <span className="text-gray-400">{o.segmento} · {new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })()}

              {/* Lembretes Ágil */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-[#003580]" />
                        <CardTitle className="text-base">Lembretes Ágil</CardTitle>
                        {lembretes.length > 0 && (
                          <Badge className="bg-[#003580] text-white text-xs">{lembretes.length}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={fetchLembretes} className="text-xs text-[#003580] hover:underline">Atualizar</button>
                        <button
                          onClick={() => { setAddOpen(o => !o); setEditId(null); }}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-[#003580] hover:bg-[#002060] rounded-md px-2 py-1"
                        >
                           Adicionar
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Formulário de adicionar */}
                    {addOpen && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                        <input
                          autoFocus
                          placeholder="Descrição do lembrete..."
                          value={addForm.descricao}
                          onChange={e => setAddForm(f => ({ ...f, descricao: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') adicionarLembrete(); if (e.key === 'Escape') setAddOpen(false); }}
                          className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-[#003580]"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={addForm.data}
                            onChange={e => setAddForm(f => ({ ...f, data: e.target.value }))}
                            className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:border-[#003580]"
                          />
                          <button
                            onClick={adicionarLembrete}
                            disabled={savingLembrete || !addForm.descricao.trim()}
                            className="text-xs font-medium text-white bg-[#003580] hover:bg-[#002060] disabled:opacity-50 rounded px-3 py-1.5"
                          >
                            {savingLembrete ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setAddOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                        </div>
                      </div>
                    )}

                    {loadingLembretes ? (
                      <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                    ) : lembretes.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">Nenhum lembrete pendente ✨</p>
                    ) : (
                      <div className="space-y-2">
                        {lembretes.map(l => (
                          <div key={l.id}>
                            {editId === l.id ? (
                              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 space-y-2">
                                <input
                                  autoFocus
                                  value={editForm.descricao}
                                  onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditId(null); }}
                                  className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-[#003580]"
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    type="datetime-local"
                                    value={editForm.data}
                                    onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))}
                                    className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:border-[#003580]"
                                  />
                                  <button
                                    onClick={salvarEdicao}
                                    disabled={savingLembrete || !editForm.descricao.trim()}
                                    className="text-xs font-medium text-white bg-[#003580] hover:bg-[#002060] disabled:opacity-50 rounded px-3 py-1.5"
                                  >
                                    {savingLembrete ? 'Salvando...' : 'Salvar'}
                                  </button>
                                  <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                                </div>
                              </div>
                            ) : (() => {
                              const isApolice = l.descricao.startsWith('⚠️ Apólice');
                              return (
                                <div className={`relative flex items-center justify-between rounded-lg px-3 py-2 group ${isApolice ? 'bg-orange-50 border border-orange-300' : 'bg-gray-50 border border-gray-100'}`}>
                                  {isApolice && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </span>
                                  )}
                                  <div className="min-w-0">
                                    <p className={`text-sm font-medium truncate ${isApolice ? 'text-orange-900' : 'text-gray-800'}`}>{l.descricao}</p>
                                    {l.data_lembrete && (
                                      <p className={`text-xs mt-0.5 ${isApolice ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                                        📅 {new Date(l.data_lembrete).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-3 shrink-0">
                                    <button
                                      onClick={() => { setEditId(l.id); setEditForm({ descricao: l.descricao, data: l.data_lembrete ? new Date(l.data_lembrete).toISOString().slice(0,16) : '' }); setAddOpen(false); }}
                                      className="text-xs text-gray-400 hover:text-[#003580] opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Editar"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => concluirLembrete(l.id)}
                                      className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="h-4 w-4" /> Concluir
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <div className="mt-8 pt-4 border-t border-white/20 text-center text-sm text-white/60">Dashboard do CEO - Seguros Ágil | Última atualização: {getCurrentDateTime()}</div>
            </motion.div>
          </TabsContent>

          <TabsContent value="empresas">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Gestão de Clientes</CardTitle>
                  <CardDescription>Gerencie todos os clientes cadastrados no sistema.</CardDescription>
                  <div className="flex flex-col md:flex-row gap-4 mt-4"><div className="relative flex-1"><Input placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Ativa">Ativa</SelectItem><SelectItem value="Inativa">Inativa</SelectItem></SelectContent></Select></div>
                </CardHeader>
                <CardContent>
                  {filteredEmpresas.length > 0 ? (
                    <>
                      {/* Desktop: tabela */}
                      <div className="hidden sm:block rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Empresa</TableHead>
                              <TableHead>CNPJ</TableHead>
                              <TableHead className="text-center">Beneficiários</TableHead>
                              <TableHead className="text-center">ADMs</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedEmpresas.map((empresa) => (
                              <TableRow key={empresa.id}>
                                <TableCell>
                                  <div className="font-medium">{empresa.nome_fantasia}</div>
                                  <div className="text-xs text-muted-foreground">{empresa.razao_social}</div>
                                </TableCell>
                                <TableCell>{formatCpfCnpj(empresa.cnpj)}</TableCell>
                                <TableCell className="text-center">{empresa.beneficiariosCount}</TableCell>
                                <TableCell className="text-center">{empresa.adminsCount}</TableCell>
                                <TableCell>
                                  <Badge className={empresa.status === 'Ativa' ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 hover:bg-red-200'}>{empresa.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewCompany(empresa)}>Visualizar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile: cards expansíveis */}
                      <div className="sm:hidden space-y-2">
                        {paginatedEmpresas.map((empresa) => {
                          const isOpen = expandedEmpresaId === empresa.id;
                          const isFilial = !!empresa.empresa_matriz_id;
                          const displayName = empresa.razao_social || empresa.nome_fantasia;
                          return (
                            <div key={empresa.id} className="rounded-lg border bg-white overflow-hidden">
                              <button
                                className="w-full px-4 py-3 text-left"
                                onClick={() => setExpandedEmpresaId(isOpen ? null : empresa.id)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-sm leading-snug">
                                    {isFilial ? <span className="text-gray-400 mr-1">└─</span> : null}{displayName}
                                  </p>
                                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 mt-0.5 ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{formatCpfCnpj(empresa.cnpj)}</span>
                                  <Badge className={empresa.status === 'Ativa' ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 text-xs hover:bg-green-100 hover:text-green-800' : 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 text-xs hover:bg-red-100 hover:text-red-800'}>{empresa.status}</Badge>
                                </div>
                              </button>
                              {isOpen && (
                                <div className="px-4 pb-4 border-t pt-3 space-y-2 bg-gray-50">
                                  {isFilial && empresa.matriz && (
                                    <div className="text-xs text-muted-foreground">Matriz: {empresa.matriz.nome_fantasia || empresa.matriz.razao_social}</div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-xs text-muted-foreground block">Beneficiários</span><span className="font-semibold">{empresa.beneficiariosCount}</span></div>
                                    <div><span className="text-xs text-muted-foreground block">ADMs</span><span className="font-semibold">{empresa.adminsCount}</span></div>
                                  </div>
                                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleViewCompany(empresa)}>Visualizar</Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Paginação */}
                      {totalEmpresasPages > 1 && (
                        <div className="flex items-center justify-between px-1 py-4 border-t mt-2">
                          <div className="text-sm text-muted-foreground">Página {empresasCurrentPage} de {totalEmpresasPages}</div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEmpresasCurrentPage(p => Math.max(1, p - 1))} disabled={empresasCurrentPage === 1}>
                              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEmpresasCurrentPage(p => Math.min(totalEmpresasPages, p + 1))} disabled={empresasCurrentPage >= totalEmpresasPages}>
                              Próximo<ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (<div className="text-center py-10"><p className="text-muted-foreground">Nenhum cliente encontrado.</p></div>)}
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
                    <>
                      {/* Desktop */}
                      <div className="hidden sm:block rounded-md border">
                        <Table>
                          <TableHeader><TableRow><TableHead className="w-[80px]">ID</TableHead><TableHead>Empresa</TableHead><TableHead>Beneficiário</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                          <TableBody>{paginatedSolicitacoes.map((solicitacao) => (<TableRow key={solicitacao.id}><TableCell className="font-mono text-xs">{String(solicitacao.id).substring(0,8)}...</TableCell><TableCell>{solicitacao.empresa?.nome_fantasia || 'N/A'}</TableCell><TableCell>{solicitacao.beneficiario?.nome_completo || 'N/A'}</TableCell><TableCell>{solicitacao.tipo_solicitacao}</TableCell><TableCell><Badge variant="outline" className={solicitacao.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 border-green-200' : solicitacao.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800 border-yellow-200' : solicitacao.status === 'EM PROCESSAMENTO' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800 border-blue-200' : 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 border-red-200'}>{solicitacao.status}</Badge></TableCell><TableCell>{formatDate(solicitacao.data_solicitacao)}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleViewSolicitacao(solicitacao)}>Visualizar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody>
                        </Table>
                        <div className="flex items-center justify-between px-4 py-4 border-t"><div className="flex-1 text-sm text-muted-foreground">Página {solicitacaoCurrentPage} de {totalSolicitacaoPages > 0 ? totalSolicitacaoPages : 1}</div><div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={solicitacaoCurrentPage === 1}><ChevronLeft className="h-4 w-4 mr-2" />Anterior</Button><Button variant="outline" size="sm" onClick={handleNextPage} disabled={solicitacaoCurrentPage >= totalSolicitacaoPages}>Próximo<ChevronRight className="h-4 w-4 ml-2" /></Button></div></div>
                      </div>

                      {/* Mobile cards */}
                      <div className="sm:hidden space-y-2">
                        {paginatedSolicitacoes.map((sol) => {
                          const isOpen = expandedSolId === sol.id;
                          const badgeClass = sol.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 border-green-200 hover:bg-green-100 hover:text-green-800'
                            : sol.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800 border-yellow-200 hover:bg-yellow-100 hover:text-yellow-800'
                            : sol.status === 'EM PROCESSAMENTO' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800 border-blue-200 hover:bg-blue-100 hover:text-blue-800'
                            : 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 border-red-200 hover:bg-red-100 hover:text-red-800';
                          return (
                            <div key={sol.id} className="rounded-lg border bg-white overflow-hidden">
                              <button className="w-full px-4 py-3 text-left" onClick={() => setExpandedSolId(isOpen ? null : sol.id)}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-sm leading-snug">{sol.beneficiario?.nome_completo || 'N/A'}</p>
                                  <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground">{sol.empresa?.nome_fantasia || 'N/A'}</span>
                                  <Badge variant="outline" className={`text-xs ${badgeClass}`}>{sol.status}</Badge>
                                </div>
                              </button>
                              {isOpen && (
                                <div className="px-4 pb-4 border-t pt-3 space-y-2 bg-gray-50 text-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{sol.tipo_solicitacao || '—'}</p></div>
                                    <div><p className="text-xs text-muted-foreground">Data</p><p className="font-medium">{formatDate(sol.data_solicitacao)}</p></div>
                                  </div>
                                  <div><p className="text-xs text-muted-foreground">ID</p><p className="font-mono text-xs">{String(sol.id).substring(0,8)}...</p></div>
                                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleViewSolicitacao(sol)}>Visualizar</Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm text-muted-foreground">Pág. {solicitacaoCurrentPage} de {totalSolicitacaoPages > 0 ? totalSolicitacaoPages : 1}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={solicitacaoCurrentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={solicitacaoCurrentPage >= totalSolicitacaoPages}><ChevronRight className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (<div className="text-center py-12 text-muted-foreground"><p>Nenhuma solicitação encontrada.</p></div>)}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="admins">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div><CardTitle>Gestão de Administradores</CardTitle><CardDescription>Adicione e gerencie os administradores do sistema.</CardDescription></div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate('/admin')}
                      variant="outline"
                    >
                      Administração
                    </Button>
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />) :
                      admins.length > 0 ? admins.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow gap-2 overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0 flex-1"><div className="bg-[#003580]/10 p-2 rounded-xl flex-shrink-0"><Shield className="h-5 w-5 text-[#003580]" /></div><div className="min-w-0"><p className="font-semibold text-gray-800 truncate">{admin.email}</p><div className="flex items-center gap-1 mt-1 flex-wrap"><Badge variant="outline" className="text-xs">{admin.perfil}</Badge><Badge variant={admin.ativo ? 'default' : 'destructive'} className={admin.ativo ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 border-green-200 hover:bg-green-100 hover:text-green-800' : 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 border-red-200 hover:bg-red-100 hover:text-red-800'}>{admin.ativo ? 'Ativo' : 'Inativo'}</Badge></div></div></div>
                          <div className="flex items-center space-x-1 flex-shrink-0"><Button variant="ghost" size="icon" onClick={() => openEditModal(admin)} title="Editar Administrador" className="hover:bg-blue-50 hover:text-blue-600"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => toggleAdminStatus(admin.id)} title={admin.ativo ? "Desativar" : "Ativar"} className={admin.ativo ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-green-50 hover:text-green-600"}>{admin.ativo ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o administrador.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteAdmin(admin.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
                        </div>
                      )) : (<div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed"><Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">Nenhum administrador cadastrado.</p><p className="text-sm text-gray-400">Adicione novos administradores para gerenciar o sistema.</p></div>)
                    }
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Parceiros ── */}
          <TabsContent value="parceiros" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">{parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} cadastrado{parceiros.length !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 rounded-lg" onClick={() => navigate('/admin/orcamentos')}>
                  Gerenciar
                </Button>
                <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 rounded-lg" onClick={() => setIsNovoParceiro(true)}>
                   Novo Parceiro
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {parceiros.length === 0 ? (
                <Card className="border shadow-sm">
                  <CardContent className="text-center py-14">
                    <HeartHandshake className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">Nenhum parceiro cadastrado</p>
                    <p className="text-xs text-gray-400 mt-1">Clique em "Novo Parceiro" para adicionar o primeiro.</p>
                  </CardContent>
                </Card>
              ) : (
                parceiros.map(p => (
                  <Card key={p.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-[#003580]/10">
                          <HeartHandshake className="h-5 w-5 text-[#003580]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{p.nome_completo}</p>
                          <p className="text-xs text-gray-400">{p.users?.email} · {p.modalidade}</p>
                          {p.telefone && <p className="text-xs text-gray-400">{p.telefone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={p.users?.ativo !== false ? 'bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700' : 'bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700'}>
                          {p.users?.ativo !== false ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingParceiro({ ...p, ativo: p.users?.ativo !== false }); setIsEditParceiroOpen(true); }}>
                          <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação é permanente. O acesso de <strong>{p.nome_completo}</strong> será removido.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteParceiro(p)} className={buttonVariants({ variant: 'destructive' })}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="relatorios">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-all">
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
                <Card className="hover:shadow-lg transition-all">
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
                <Card className="hover:shadow-lg transition-all">
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
                <Card className="hover:shadow-lg transition-all">
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
          {/* ── Lembretes ADM ── */}
          <TabsContent value="lembretes_adm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="max-w-2xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">Lembretes internos — visíveis para CEO e ADM.</p>
                <div className="flex items-center gap-3">
                  <button onClick={fetchLembretesAdm} className="text-xs text-white/60 hover:text-white hover:underline">Atualizar</button>
                  <button
                    onClick={() => { setAddOpenAdm(o => !o); setTextoNovoCEO(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#003580] text-xs font-semibold hover:bg-white/90"
                  >
                     Adicionar
                  </button>
                </div>
              </div>

              {addOpenAdm && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <textarea
                      autoFocus
                      placeholder="Escreva o lembrete..."
                      value={textoNovoCEO}
                      onChange={e => setTextoNovoCEO(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarLembreteCEO(); } }}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-[#003580] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setAddOpenAdm(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                      <button
                        onClick={enviarLembreteCEO}
                        disabled={savingCEO || !textoNovoCEO.trim()}
                        className="px-4 py-1.5 rounded-lg bg-[#003580] text-white text-sm font-medium hover:bg-[#002060] disabled:opacity-50"
                      >
                        {savingCEO ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {lembretesAdm.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Nenhum lembrete ainda.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {lembretesAdm.map(l => {
                    const isApolice = l.texto?.startsWith('⚠️ Apólice');
                    return (
                    <Card key={l.id} className={`group hover:shadow-md transition-shadow relative ${isApolice ? 'border-orange-300 bg-orange-50' : ''}`}>
                      {isApolice && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                      )}
                      <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm whitespace-pre-wrap ${isApolice ? 'text-orange-900 font-medium' : 'text-gray-800'}`}>{l.texto}</p>
                          <p className="text-xs text-gray-400 mt-1.5">
                            📅 {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-1.5 text-gray-300">·</span>
                            {l.autor === 'ceo' ? 'CEO' : l.autor === 'bot' || l.autor === 'sistema' ? 'BOT' : 'ADM'}
                          </p>
                        </div>
                        <button
                          onClick={() => excluirMensagemCEO(l.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </CardContent>
                    </Card>
                  );})}
                </div>
              )}
            </motion.div>
          </TabsContent>

        </Tabs>

        {/* Modal Novo Parceiro */}
        <Dialog open={isNovoParceiro} onOpenChange={setIsNovoParceiro}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Parceiro</DialogTitle>
              <DialogDescription>Crie uma conta de parceiro. Uma senha temporária será enviada por e-mail.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmittingParceiro(true);
              try {
                const tempPassword = generateTempPassword();
                const userCreated = await authService.createUser({
                  name: novoParceiro.nome_completo,
                  email: novoParceiro.email,
                  password: tempPassword,
                  perfil: 'PARCEIRO',
                  ativo: true,
                  must_change_password: true,
                });
                const { supabase: sb } = await import('@/lib/customSupabaseClient');
                const { error: parcErr } = await sb.from('parceiros').insert([{
                  user_id: userCreated.id,
                  nome_completo: novoParceiro.nome_completo,
                  modalidade: novoParceiro.modalidade,
                  cpf_cnpj: novoParceiro.cpf_cnpj || null,
                  telefone: novoParceiro.telefone || null,
                }]);
                if (parcErr) throw new Error(parcErr.message);
                await sendWelcomeEmail({ nomeCliente: novoParceiro.nome_completo, emailCliente: novoParceiro.email, senhaTemporaria: tempPassword });
                toast({ title: 'Parceiro criado!', description: `Senha temporária enviada para ${novoParceiro.email}.`, className: 'bg-green-600 hover:bg-green-600 text-white border-green-700' });
                setIsNovoParceiro(false);
                setNovoParceiro({ nome_completo: '', email: '', telefone: '', modalidade: 'PF', cpf_cnpj: '' });
                fetchData();
              } catch (err) {
                toast({ variant: 'destructive', title: 'Erro', description: err.message });
              } finally {
                setIsSubmittingParceiro(false);
              }
            }} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Nome completo *</Label>
                  <Input value={novoParceiro.nome_completo} onChange={e => setNovoParceiro(p => ({...p, nome_completo: e.target.value}))} required />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>E-mail *</Label>
                  <Input type="email" value={novoParceiro.email} onChange={e => setNovoParceiro(p => ({...p, email: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label>Modalidade *</Label>
                  <Select value={novoParceiro.modalidade} onValueChange={v => setNovoParceiro(p => ({...p, modalidade: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">Pessoa Física</SelectItem>
                      <SelectItem value="CORRETOR">Corretor Autônomo</SelectItem>
                      <SelectItem value="EMPRESA">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>CPF / CNPJ *</Label>
                  <Input value={novoParceiro.cpf_cnpj} onChange={e => setNovoParceiro(p => ({...p, cpf_cnpj: e.target.value}))} placeholder="000.000.000-00" required />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Telefone *</Label>
                  <Input value={novoParceiro.telefone} onChange={e => setNovoParceiro(p => ({...p, telefone: e.target.value}))} placeholder="(11) 99999-0000" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNovoParceiro(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmittingParceiro} className="bg-[#003580] hover:bg-[#002060] text-white">
                  {isSubmittingParceiro && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar parceiro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Parceiro */}
        <Dialog open={isEditParceiroOpen} onOpenChange={(v) => { if (!v) { setIsEditParceiroOpen(false); setTimeout(() => setEditingParceiro(null), 300); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Parceiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditParceiro} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Nome completo *</Label>
                  <Input value={editingParceiro?.nome_completo || ''} onChange={e => setEditingParceiro(p => ({...p, nome_completo: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label>Modalidade</Label>
                  <Select value={editingParceiro?.modalidade} onValueChange={v => setEditingParceiro(p => ({...p, modalidade: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">Pessoa Física</SelectItem>
                      <SelectItem value="CORRETOR">Corretor Autônomo</SelectItem>
                      <SelectItem value="EMPRESA">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editingParceiro?.ativo ? 'true' : 'false'} onValueChange={v => setEditingParceiro(p => ({...p, ativo: v === 'true'}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>CPF / CNPJ *</Label>
                  <Input value={editingParceiro?.cpf_cnpj || ''} onChange={e => setEditingParceiro(p => ({...p, cpf_cnpj: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label>Telefone *</Label>
                  <Input value={editingParceiro?.telefone || ''} onChange={e => setEditingParceiro(p => ({...p, telefone: e.target.value}))} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsEditParceiroOpen(false); setTimeout(() => setEditingParceiro(null), 300); }}>Cancelar</Button>
                <Button type="submit" disabled={isSubmittingEditParceiro} className="bg-[#003580] hover:bg-[#002060] text-white">
                  {isSubmittingEditParceiro && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Editar Administrador</DialogTitle></DialogHeader><form onSubmit={handleEditAdmin}><div className="grid gap-4 py-4"><div className="space-y-2"><Label htmlFor="edit-email">Email</Label><Input id="edit-email" type="email" value={editAdminEmail} onChange={e => setEditAdminEmail(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-password">Senha</Label><Input id="edit-password" type="password" value={editAdminPassword} onChange={e => setEditAdminPassword(e.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Alterações</Button></DialogFooter></form></DialogContent></Dialog>
        
        <Dialog open={!isLoading && empresas.length === 0 && isWelcomeModalOpen} onOpenChange={(open) => setIsWelcomeModalOpen(open)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bem-vindo ao Dashboard do CEO</DialogTitle>
              <DialogDescription>Nenhuma empresa cadastrada ainda. Crie uma empresa ou um administrador para começar.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => { setIsWelcomeModalOpen(false); navigate('/admin/clientes'); }}>Ir para Administração</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Detalhes da Empresa</DialogTitle></DialogHeader>{selectedCompany && (<div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div><Label className="text-xs text-muted-foreground">Nome Fantasia</Label><div className="font-medium text-base">{selectedCompany.nome_fantasia}</div></div><div><Label className="text-xs text-muted-foreground">Razão Social</Label><div className="font-medium text-base">{selectedCompany.razao_social}</div></div><div><Label className="text-xs text-muted-foreground">CNPJ</Label><div className="font-medium text-base">{selectedCompany.cnpj}</div></div><div><Label className="text-xs text-muted-foreground">Status</Label><div><Badge variant={selectedCompany.status === 'Ativa' ? 'default' : 'destructive'} className={selectedCompany.status === 'Ativa' ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800' : 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800'}>{selectedCompany.status}</Badge></div></div><div><Label className="text-xs text-muted-foreground">Total de Beneficiários</Label><div className="font-medium text-base">{selectedCompany.beneficiariosCount}</div></div><div><Label className="text-xs text-muted-foreground">Administradores</Label><div className="font-medium text-base">{selectedCompany.adminsCount}</div></div></div></div>)}<DialogFooter><Button type="button" variant="outline" onClick={() => setIsCompanyModalOpen(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isSolicitacaoModalOpen} onOpenChange={setIsSolicitacaoModalOpen}><DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Detalhes da Solicitação</DialogTitle><DialogDescription>Visualizar informações completas da solicitação.</DialogDescription></DialogHeader>{selectedSolicitacao && (<div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">ID da Solicitação</Label><div className="font-mono text-sm">{selectedSolicitacao.id}</div></div><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">Data</Label><div className="text-sm">{formatDate(selectedSolicitacao.data_solicitacao)}</div></div><div className="col-span-2"><Label className="text-xs text-muted-foreground">Empresa</Label><div className="text-base font-medium">{selectedSolicitacao.empresa?.nome_fantasia || 'N/A'}</div></div><div className="col-span-2"><Label className="text-xs text-muted-foreground">Beneficiário</Label><div className="text-base font-medium">{selectedSolicitacao.beneficiario?.nome_completo || 'N/A'}</div></div><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">Tipo</Label><div className="text-sm font-medium">{selectedSolicitacao.tipo_solicitacao}</div></div><div className="col-span-2 sm:col-span-1"><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><Badge variant={selectedSolicitacao.status === 'REJEITADA' ? 'destructive' : selectedSolicitacao.status === 'CONCLUIDA' ? 'default' : 'outline'} className={selectedSolicitacao.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 border-green-200' : selectedSolicitacao.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800 border-yellow-200' : selectedSolicitacao.status === 'EM PROCESSAMENTO' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800 border-blue-200' : ''}>{selectedSolicitacao.status}</Badge></div></div>{selectedSolicitacao.motivo && (<div className="col-span-2"><Label className="text-xs text-muted-foreground">Motivo</Label><div className="text-sm p-2 bg-slate-50 rounded border mt-1">{selectedSolicitacao.motivo}</div></div>)}</div></div>)}<DialogFooter><Button type="button" onClick={() => setIsSolicitacaoModalOpen(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>

      </DashboardLayout>
    </>
  );
};

export default CEODashboard;