import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Plus, Trash2, ArrowRight, Search, Loader2, GitBranchPlus, Edit, Users, FileText, AlertTriangle, X, User, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask, applyCpfMask, applyCepMask } from '@/lib/masks';
import { generateTempPassword, sendWelcomeEmail } from '@/services/emailService';
import { validatePasswordStrength } from '@/lib/userValidator';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { authService } from '@/services/authService';
import { apolicesService } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedCompanyId } = useCompany();

  const [empresas, setEmpresas] = useState([]);
  const [users, setUsers] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isNewClienteModalOpen, setIsNewClienteModalOpen] = useState(false);
  const [isEditEmpresaModalOpen, setIsEditEmpresaModalOpen] = useState(false);
  const [isAddFilialModalOpen, setIsAddFilialModalOpen] = useState(false);

  const [tipoPessoa, setTipoPessoa] = useState('PJ'); // 'PJ' | 'PF'
  const [newEmpresa, setNewEmpresa] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', data_nascimento: '', cep: '', rua: '', bairro: '', cidade: '', estado: '', numero: '', complemento: '' });
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [editingDocTipo, setEditingDocTipo] = useState('PJ'); // 'PJ' | 'PF'
  const [filialFormData, setFilialFormData] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
  const [editingFilial, setEditingFilial] = useState(null);
  const [selectedMatriz, setSelectedMatriz] = useState(null);

  const canManage = user.perfil === 'CEO' || user.perfil === 'ADM';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empresasResult, beneficiariosResult, solicitacoesResult, usersResult] = await Promise.allSettled([
        empresasService.getEmpresas(),
        beneficiariosService.getAllBeneficiarios(),
        solicitacoesService.getAllSolicitacoes(),
        supabaseClient.from('users').select('*'),
      ]);
      setEmpresas(empresasResult.status === 'fulfilled' ? (empresasResult.value || []) : []);
      setBeneficiarios(beneficiariosResult.status === 'fulfilled' ? (beneficiariosResult.value || []) : []);
      setSolicitacoes(solicitacoesResult.status === 'fulfilled' ? (solicitacoesResult.value || []) : []);
      setUsers(usersResult.status === 'fulfilled' ? (usersResult.value?.data || []) : []);
      try {
        const apolicesData = await apolicesService.getAllApolices();
        setApolices(apolicesData);
      } catch (apErr) {
        console.warn('Tabela apolices não encontrada:', apErr);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const matrizes = useMemo(() => empresas.filter(e => e.tipo === 'MATRIZ'), [empresas]);
  const filiais = useMemo(() => empresas.filter(e => e.tipo === 'FILIAL'), [empresas]);

  const getFiliaisForMatriz = (matrizId) => filiais.filter(f => f.empresa_matriz_id === matrizId);

  const getSolicitacoesPendentesCount = (empresaId) => {
    const id = Number(empresaId);
    return solicitacoes.filter(s => Number(s.empresa_id) === id && (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')).length;
  };

  const getTotalPendentesMatriz = (matrizId) => {
    const fromFiliais = getFiliaisForMatriz(matrizId).reduce((acc, f) => acc + getSolicitacoesPendentesCount(f.id), 0);
    return getSolicitacoesPendentesCount(matrizId) + fromFiliais;
  };

  const totalPendentes = useMemo(() =>
    solicitacoes.filter(s => s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO').length,
    [solicitacoes]
  );

  const apolicesAtivas = useMemo(() =>
    apolices.filter(a => {
      if (!a.vigencia_fim) return a.ativo !== false;
      return new Date(a.vigencia_fim) >= new Date() && a.ativo !== false;
    }).length,
    [apolices]
  );

  // Search across: empresa name/CNPJ, filial name/CNPJ, beneficiário name/CPF
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return matrizes;
    const term = searchTerm.toLowerCase().trim();
    const termNum = term.replace(/\D/g, '');

    const empresaMatches = matrizes.filter(e =>
      (e.nome_fantasia || '').toLowerCase().includes(term) ||
      (e.razao_social || '').toLowerCase().includes(term) ||
      (termNum && (e.cnpj || '').replace(/\D/g, '').includes(termNum))
    );

    const filialMatches = filiais.filter(f =>
      (f.nome_fantasia || '').toLowerCase().includes(term) ||
      (f.razao_social || '').toLowerCase().includes(term) ||
      (termNum && (f.cnpj || '').replace(/\D/g, '').includes(termNum))
    );

    const benefMatches = beneficiarios.filter(b =>
      (b.nome_completo || '').toLowerCase().includes(term) ||
      (termNum && (b.cpf || '').replace(/\D/g, '').includes(termNum))
    );

    const extraMatrizIds = new Set();
    [...filialMatches].forEach(f => {
      if (f.empresa_matriz_id) extraMatrizIds.add(f.empresa_matriz_id);
    });
    benefMatches.forEach(b => {
      const emp = empresas.find(e => e.id === b.empresa_id);
      if (emp) {
        if (emp.tipo === 'MATRIZ') extraMatrizIds.add(emp.id);
        else if (emp.empresa_matriz_id) extraMatrizIds.add(emp.empresa_matriz_id);
      }
    });

    const combined = [...empresaMatches];
    extraMatrizIds.forEach(id => {
      if (!combined.find(e => e.id === id)) {
        const m = matrizes.find(mx => mx.id === id);
        if (m) combined.push(m);
      }
    });

    return combined;
  }, [searchTerm, matrizes, filiais, beneficiarios, empresas]);

  const handleInputChange = (e, setter, isCpfField = false) => {
    const { id, value } = e.target;
    let formatted = value;
    if (id === 'cnpj') formatted = isCpfField ? applyCpfMask(value) : applyCnpjMask(value);
    if (id === 'cep') formatted = applyCepMask(value);
    setter(prev => ({ ...prev, [id]: formatted }));
  };

  const validarCPF = (cpf) => {
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
    let dig1 = (soma * 10) % 11; if (dig1 >= 10) dig1 = 0;
    if (dig1 !== parseInt(nums[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
    let dig2 = (soma * 10) % 11; if (dig2 >= 10) dig2 = 0;
    return dig2 === parseInt(nums[10]);
  };

  const buscarCep = async (cep) => {
    const nums = cep.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setIsCepLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.erro) return toast({ variant: 'destructive', title: 'CEP não encontrado' });
      setNewEmpresa(prev => ({
        ...prev,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }));
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setIsCepLoading(false);
    }
  };

  const validateAndSubmitMatriz = async (e) => {
    e.preventDefault();
    if (!canManage) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    const { razao_social, cnpj, email_cliente, data_nascimento, cep, rua, numero, bairro, cidade, estado } = newEmpresa;
    if (!razao_social || !cnpj || !email_cliente)
      return toast({ variant: 'destructive', title: 'Erro', description: 'Todos os campos obrigatórios devem ser preenchidos.' });
    if (!cep || cep.replace(/\D/g, '').length < 8)
      return toast({ variant: 'destructive', title: 'Erro', description: 'CEP obrigatório. Digite o CEP e aguarde o preenchimento automático.' });
    if (!numero)
      return toast({ variant: 'destructive', title: 'Erro', description: 'Número do endereço obrigatório.' });
    if (tipoPessoa === 'PF') {
      if (!validarCPF(cnpj))
        return toast({ variant: 'destructive', title: 'CPF inválido', description: 'Verifique o CPF informado.' });
      if (!data_nascimento)
        return toast({ variant: 'destructive', title: 'Erro', description: 'Data de nascimento obrigatória.' });
    }
    if (users.some(u => u.email === email_cliente))
      return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail já cadastrado.' });
    if (empresas.some(emp => emp.cnpj?.replace(/\D/g, '') === cnpj.replace(/\D/g, '')))
      return toast({ variant: 'destructive', title: 'Erro', description: tipoPessoa === 'PF' ? 'CPF já cadastrado.' : 'CNPJ já cadastrado.' });

    // Monta endereço completo para PF e PJ
    let endereco_completo = newEmpresa.endereco_completo;
    if (rua) {
      endereco_completo = [
        rua,
        numero && `nº ${numero}`,
        newEmpresa.complemento,
        bairro,
        cidade && estado ? `${cidade}/${estado}` : cidade || estado,
        cep && `CEP ${cep}`,
      ].filter(Boolean).join(', ');
    }

    setIsSubmitting(true);
    try {
      const senhaTemporaria = generateTempPassword();
      const { email_cliente: _e, data_nascimento: _dn, cep: _cep, rua: _r, bairro: _b, cidade: _c, estado: _est, numero: _n, complemento: _comp, ...empresaPayload } = {
        tipo: 'MATRIZ',
        empresa_matriz_id: null,
        ...newEmpresa,
        endereco_completo,
        data_cadastro: new Date().toISOString(),
      };
      if (tipoPessoa === 'PF' && data_nascimento) empresaPayload.data_nascimento = data_nascimento;
      empresaPayload.email_cliente = email_cliente;
      const createdEmpresa = await empresasService.createEmpresa(empresaPayload);
      const createdUser = await authService.createUser({
        email: email_cliente,
        password: senhaTemporaria,
        perfil: 'CLIENTE',
        empresa_matriz_id: createdEmpresa.id,
        ativo: true,
        must_change_password: true,
      });
      setEmpresas([...empresas, createdEmpresa]);
      setUsers([...users, createdUser]);

      // Envia email com senha temporária
      const emailResult = await sendWelcomeEmail({
        nomeCliente: razao_social,
        emailCliente: email_cliente,
        senhaTemporaria,
      });

      toast({
        title: 'Cliente criado com sucesso!',
        description: emailResult.ok
          ? `Senha temporária enviada para ${email_cliente}.`
          : `E-mail não enviado. Verifique as configurações de e-mail. Erro: ${emailResult.error}`,
        duration: 10000,
      });
      setIsNewClienteModalOpen(false);
      setNewEmpresa({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '' });
      setTipoPessoa('PJ');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar cliente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSubmitEditMatriz = async (e) => {
    e.preventDefault();
    if (!canManage || !editingEmpresa) return;
    const { email_cliente, senha_cliente, cnpj } = editingEmpresa;
    if (!email_cliente) return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail obrigatório.' });
    if (!cnpj) return toast({ variant: 'destructive', title: 'Erro', description: 'CPF/CNPJ obrigatório.' });
    const clientUser = users.find(u => u.empresa_matriz_id === editingEmpresa.id);
    if (!clientUser) return toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não encontrado.' });
    if (users.some(u => u.email === email_cliente && u.id !== clientUser.id))
      return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail já em uso.' });
    if (empresas.some(emp => emp.cnpj?.replace(/\D/g, '') === cnpj.replace(/\D/g, '') && emp.id !== editingEmpresa.id))
      return toast({ variant: 'destructive', title: 'Erro', description: 'CPF/CNPJ já cadastrado em outro cliente.' });
    if (senha_cliente) {
      const pwErrors = validatePasswordStrength(senha_cliente);
      if (pwErrors.length > 0) return toast({ variant: 'destructive', title: 'Senha fraca', description: pwErrors[0] });
    }
    setIsSubmitting(true);
    try {
      const updatePayload = { email: email_cliente };
      if (senha_cliente) updatePayload.password = senha_cliente;
      await authService.updateUser(clientUser.id, updatePayload);
      // Use direct supabase call to avoid cleanEmpresaData nullifying required fields
      const empUpdate = {
        razao_social: editingEmpresa.razao_social || null,
        endereco_completo: editingEmpresa.endereco_completo || null,
        email_cliente,
        cnpj: cnpj.replace(/\D/g, ''),
        ...(editingDocTipo === 'PF' && { data_nascimento: editingEmpresa.data_nascimento || null }),
      };
      const { error: empUpdateError } = await supabaseClient.from('empresas')
        .update(empUpdate)
        .eq('id', editingEmpresa.id);
      if (empUpdateError) throw empUpdateError;
      setUsers(prev => prev.map(u => u.id === clientUser.id ? { ...u, ...updatePayload } : u));
      setEmpresas(prev => prev.map(e => e.id === editingEmpresa.id ? { ...e, ...empUpdate } : e));
      toast({ title: 'Sucesso', description: 'Dados do cliente atualizados.' });
      setIsEditEmpresaModalOpen(false);
      setEditingEmpresa(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSubmitFilial = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const { razao_social, cnpj } = filialFormData;
    if (!razao_social || !cnpj) return toast({ variant: 'destructive', title: 'Erro', description: 'Razão Social e CNPJ são obrigatórios.' });
    if (empresas.some(emp => emp.cnpj === cnpj && emp.id !== editingFilial?.id))
      return toast({ variant: 'destructive', title: 'Erro', description: 'CNPJ já cadastrado.' });
    setIsSubmitting(true);
    try {
      if (editingFilial) {
        await empresasService.updateEmpresa(editingFilial.id, filialFormData);
        setEmpresas(prev => prev.map(emp => emp.id === editingFilial.id ? { ...emp, ...filialFormData } : emp));
        toast({ title: 'Sucesso', description: 'Filial atualizada.' });
      } else {
        const createdFilial = await empresasService.createEmpresa({ tipo: 'FILIAL', empresa_matriz_id: selectedMatriz.id, ...filialFormData, data_cadastro: new Date().toISOString() });
        setEmpresas([...empresas, createdFilial]);
        toast({ title: 'Sucesso', description: 'Filial adicionada.' });
      }
      setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
      setEditingFilial(null);
      setIsAddFilialModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar filial.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMatriz = async (id) => {
    if (!canManage) return;
    try {
      // Collect all empresa IDs (matriz + filiais)
      const todasFiliais = empresas.filter(e => e.empresa_matriz_id === id);
      const todasIds = [id, ...todasFiliais.map(f => f.id)];

      // Delete storage files for apolices with contrato_url
      const apolicesComContrato = apolices.filter(a => todasIds.includes(Number(a.empresa_id)) && a.contrato_url);
      if (apolicesComContrato.length > 0) {
        const paths = apolicesComContrato
          .map(a => a.contrato_url.split('/apolices-contratos/')[1])
          .filter(Boolean);
        if (paths.length > 0) {
          await supabaseClient.storage.from('apolices-contratos').remove(paths);
        }
      }

      // Delete all related DB records for every empresa
      for (const eid of todasIds) {
        await supabaseClient.from('coparticipacoes').delete().eq('empresa_id', eid);
        await supabaseClient.from('solicitacoes').delete().eq('empresa_id', eid);
        await supabaseClient.from('apolices').delete().eq('empresa_id', eid);
        await supabaseClient.from('beneficiarios').delete().eq('empresa_id', eid);
      }

      // Delete user linked to this matriz
      const userToDelete = users.find(u => u.empresa_matriz_id === id);
      if (userToDelete) await authService.deleteUser(userToDelete.id);

      // Delete filiais then matriz
      for (const filial of todasFiliais) {
        await empresasService.deleteEmpresa(filial.id);
      }
      await empresasService.deleteEmpresa(id);

      setEmpresas(empresas.filter(e => e.id !== id && e.empresa_matriz_id !== id));
      setUsers(users.filter(u => u.empresa_matriz_id !== id));
      setBeneficiarios(beneficiarios.filter(b => !todasIds.includes(Number(b.empresa_id))));
      setApolices(apolices.filter(a => !todasIds.includes(Number(a.empresa_id))));
      toast({ title: 'Cliente excluído com sucesso.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir.' });
    }
  };

  const openEditModal = (matriz) => {
    if (!canManage) return;
    const clientUser = users.find(u => u.empresa_matriz_id === matriz.id);
    setEditingEmpresa({ ...matriz, email_cliente: clientUser?.email || '', senha_cliente: '', data_nascimento: matriz.data_nascimento || '' });
    setEditingDocTipo(matriz.cnpj?.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ');
    setIsEditEmpresaModalOpen(true);
  };

  const openAddFilialModal = (matriz) => {
    setSelectedMatriz(matriz);
    setEditingFilial(null);
    setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
    setIsAddFilialModalOpen(true);
  };

  const goToSolicitacoes = (empresaId) => {
    setSelectedCompanyId(Number(empresaId));
    navigate('/solicitacoes');
  };

  return (
    <>
      <Helmet><title>Dashboard ADM - Seguros Ágil</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Clientes</h1>
            {canManage && (
              <Button onClick={() => setIsNewClienteModalOpen(true)} className="bg-[#003580] hover:bg-[#002060] text-white">
                <Plus className="mr-2 h-4 w-4" /> Novo Cliente
              </Button>
            )}
          </div>

          {/* Metric Cards */}
          <div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              <div className="min-w-[calc(100vw-3rem)] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink">
                <Card
                  className={`bg-white border border-gray-100 shadow-sm transition-all ${totalPendentes > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}
                  onClick={() => totalPendentes > 0 && navigate('/solicitacoes')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Solicitações</p>
                        <p className="text-5xl font-bold mt-1 text-gray-900">{isLoading ? '—' : totalPendentes}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {totalPendentes > 0 ? 'pendentes — clique para ver' : 'nenhuma pendente'}
                        </p>
                      </div>
                      <AlertTriangle className={`h-14 w-14 opacity-60 ${totalPendentes > 0 ? 'text-red-500' : 'text-gray-300'}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="min-w-[calc(100vw-3rem)] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink">
                <Card className="bg-white border border-gray-100 shadow-sm">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Clientes</p>
                        <p className="text-5xl font-bold mt-1 text-gray-900">{isLoading ? '—' : matrizes.length}</p>
                        <p className="text-gray-400 text-xs mt-1">empresas cadastradas</p>
                      </div>
                      <Users className="h-14 w-14 text-blue-500 opacity-60" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="min-w-[calc(100vw-3rem)] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink">
                <Card className="bg-white border border-gray-100 shadow-sm">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Apólices Ativas</p>
                        <p className="text-5xl font-bold mt-1 text-gray-900">{isLoading ? '—' : apolicesAtivas}</p>
                        <p className="text-gray-400 text-xs mt-1">em vigência</p>
                      </div>
                      <FileText className="h-14 w-14 text-emerald-500 opacity-60" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1 sm:hidden">arraste para ver mais →</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <Input
              className="pl-11 h-12 text-base rounded-xl border-gray-200 shadow-sm"
              placeholder="Buscar por CNPJ, Empresa ou Nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Company List */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building className="h-14 w-14 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-lg text-gray-500">Nenhum cliente encontrado</p>
                {searchTerm ? (
                  <p className="text-sm mt-1">
                    Nenhum resultado para <span className="font-medium text-gray-600">"{searchTerm}"</span>.{' '}
                    <button className="text-blue-500 underline" onClick={() => setIsNewClienteModalOpen(true)}>Criar novo cliente?</button>
                  </p>
                ) : (
                  <p className="text-sm mt-1">Clique em "Novo Cliente" para começar.</p>
                )}
              </div>
            ) : (
              searchResults.map(matriz => {
                const pendentes = getTotalPendentesMatriz(matriz.id);
                const filiaisCount = getFiliaisForMatriz(matriz.id).length;
                return (
                  <motion.div
                    key={matriz.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-[#dbeeff] p-2.5 rounded-xl shrink-0">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{matriz.nome_fantasia || matriz.razao_social}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {matriz.cnpj && matriz.cnpj.replace(/\D/g, '').length === 11
                              ? `CPF: ${applyCpfMask(matriz.cnpj)}`
                              : `CNPJ: ${applyCnpjMask(matriz.cnpj)}`
                            }
                            {filiaisCount > 0 && <span className="ml-2 text-gray-400">· {filiaisCount} filial(is)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {pendentes > 0 && (
                          <button
                            onClick={() => goToSolicitacoes(matriz.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                          </button>
                        )}
                        <Button
                          size="sm"
                          className="bg-[#003580] hover:bg-[#002060] text-white"
                          onClick={() => navigate(`/admin/cliente/${matriz.id}`)}
                        >
                          Acessar <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditModal(matriz)} title="Editar acesso">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:border-red-300">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                                  <AlertDialogDescription>Isso excluirá permanentemente o cliente e sua conta de acesso. Só é possível se não houver filiais cadastradas.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMatriz(matriz.id)} className={buttonVariants({ variant: 'destructive' })}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

        </motion.div>
      </DashboardLayout>

      {/* Modal Novo Cliente */}
      <Dialog open={isNewClienteModalOpen} onOpenChange={(open) => {
        setIsNewClienteModalOpen(open);
        if (!open) { setTipoPessoa('PJ'); setNewEmpresa({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', data_nascimento: '', cep: '', rua: '', bairro: '', cidade: '', estado: '', numero: '', complemento: '' }); }
      }}>
        <DialogContent className="sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <form onSubmit={validateAndSubmitMatriz}>
            <div className="py-4 space-y-4">

              {/* Seletor PF / PJ */}
              <div className="space-y-1">
                <Label>Tipo de Pessoa *</Label>
                <Select
                  value={tipoPessoa}
                  onValueChange={(val) => {
                    setTipoPessoa(val);
                    setNewEmpresa({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', data_nascimento: '', cep: '', rua: '', bairro: '', cidade: '', estado: '', numero: '', complemento: '' });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                    <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoPessoa === 'PJ' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="razao_social">Razão Social *</Label><Input id="razao_social" value={newEmpresa.razao_social} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
                  <div><Label htmlFor="nome_fantasia">Nome Fantasia</Label><Input id="nome_fantasia" value={newEmpresa.nome_fantasia} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
                  <div><Label htmlFor="cnpj">CNPJ *</Label><Input id="cnpj" value={newEmpresa.cnpj} placeholder="00.000.000/0000-00" onChange={e => handleInputChange(e, setNewEmpresa, false)} /></div>
                  <div>
                    <Label htmlFor="cep">CEP *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cep"
                        value={newEmpresa.cep}
                        placeholder="00000-000"
                        maxLength={9}
                        onChange={e => handleInputChange(e, setNewEmpresa)}
                        onBlur={() => buscarCep(newEmpresa.cep)}
                      />
                      <button
                        type="button"
                        onClick={() => buscarCep(newEmpresa.cep)}
                        disabled={isCepLoading}
                        className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center gap-1 text-sm"
                      >
                        {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="numero">Número *</Label>
                    <Input id="numero" value={newEmpresa.numero} placeholder="123" onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="rua">Rua</Label>
                    <Input id="rua" value={newEmpresa.rua} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" value={newEmpresa.complemento} placeholder="Apto, bloco..." onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" value={newEmpresa.bairro} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" value={newEmpresa.cidade} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input id="estado" value={newEmpresa.estado} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="razao_social">Nome Completo *</Label>
                    <Input id="razao_social" value={newEmpresa.razao_social} onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CPF *</Label>
                    <Input id="cnpj" value={newEmpresa.cnpj} placeholder="000.000.000-00" onChange={e => handleInputChange(e, setNewEmpresa, true)} maxLength={14} />
                  </div>
                  <div>
                    <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                    <Input id="data_nascimento" type="date" value={newEmpresa.data_nascimento} onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cep"
                        value={newEmpresa.cep}
                        placeholder="00000-000"
                        maxLength={9}
                        onChange={e => handleInputChange(e, setNewEmpresa)}
                        onBlur={() => buscarCep(newEmpresa.cep)}
                      />
                      <button
                        type="button"
                        onClick={() => buscarCep(newEmpresa.cep)}
                        disabled={isCepLoading}
                        className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center gap-1 text-sm"
                      >
                        {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="numero">Número *</Label>
                    <Input id="numero" value={newEmpresa.numero} placeholder="123" onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="rua">Rua</Label>
                    <Input id="rua" value={newEmpresa.rua} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" value={newEmpresa.complemento} placeholder="Apto, bloco..." onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" value={newEmpresa.bairro} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" value={newEmpresa.cidade} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input id="estado" value={newEmpresa.estado} readOnly className="bg-gray-50 text-gray-600" />
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-600 mb-3">Acesso do cliente</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="email_cliente">E-mail *</Label>
                    <Input id="email_cliente" type="email" value={newEmpresa.email_cliente} onChange={e => handleInputChange(e, setNewEmpresa)} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Uma senha temporária será gerada automaticamente e enviada para o e-mail do cliente.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewClienteModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Acesso do Cliente */}
      {editingEmpresa && (
        <Dialog open={isEditEmpresaModalOpen} onOpenChange={setIsEditEmpresaModalOpen}>
          <DialogContent className="sm:max-w-lg overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Editar Acesso do Cliente</DialogTitle>
              <p className="text-sm text-muted-foreground">{editingEmpresa.nome_fantasia || editingEmpresa.razao_social}</p>
            </DialogHeader>
            <form onSubmit={validateAndSubmitEditMatriz}>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label>Tipo de Documento *</Label>
                  <Select
                    value={editingDocTipo}
                    onValueChange={(val) => {
                      setEditingDocTipo(val);
                      setEditingEmpresa(prev => ({ ...prev, cnpj: '' }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PJ">CNPJ (Pessoa Jurídica)</SelectItem>
                      <SelectItem value="PF">CPF (Pessoa Física)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="razao_social">{editingDocTipo === 'PF' ? 'Nome Completo' : 'Razão Social'} *</Label>
                  <Input id="razao_social" value={editingEmpresa.razao_social || ''} onChange={e => handleInputChange(e, setEditingEmpresa)} />
                </div>
                <div>
                  <Label htmlFor="cnpj">{editingDocTipo === 'PF' ? 'CPF' : 'CNPJ'} *</Label>
                  <Input
                    id="cnpj"
                    value={editingEmpresa.cnpj || ''}
                    placeholder={editingDocTipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    onChange={e => handleInputChange(e, setEditingEmpresa, editingDocTipo === 'PF')}
                  />
                </div>
                {editingDocTipo === 'PF' && (
                  <div>
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input id="data_nascimento" type="date" value={editingEmpresa.data_nascimento || ''} onChange={e => handleInputChange(e, setEditingEmpresa)} />
                  </div>
                )}
                <div>
                  <Label htmlFor="endereco_completo">Endereço</Label>
                  <Input id="endereco_completo" value={editingEmpresa.endereco_completo || ''} onChange={e => handleInputChange(e, setEditingEmpresa)} />
                </div>
                <div><Label htmlFor="email_cliente">E-mail *</Label><Input id="email_cliente" type="email" value={editingEmpresa.email_cliente} onChange={e => handleInputChange(e, setEditingEmpresa)} /></div>
                <div>
                  <Label htmlFor="senha_cliente">Nova Senha (opcional)</Label>
                  <Input id="senha_cliente" type="password" placeholder="Deixe em branco para manter a atual" value={editingEmpresa.senha_cliente} onChange={e => handleInputChange(e, setEditingEmpresa)} />
                  {(() => {
                    const pwd = editingEmpresa.senha_cliente || '';
                    const checks = [
                      { label: 'Mínimo 6 caracteres', ok: pwd.length >= 6 },
                      { label: '1 letra maiúscula', ok: /[A-Z]/.test(pwd) },
                      { label: '1 letra minúscula', ok: /[a-z]/.test(pwd) },
                      { label: '1 número', ok: /[0-9]/.test(pwd) },
                      { label: '1 caractere especial (!@#$%...)', ok: /[^a-zA-Z0-9]/.test(pwd) },
                    ];
                    return (
                      <div className="mt-2 space-y-1">
                        {checks.map(c => (
                          <div key={c.label} className="flex items-center gap-1.5 text-xs">
                            {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
                            <span className={c.ok ? 'text-green-600' : 'text-gray-400'}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditEmpresaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Adicionar Filial */}
      {canManage && selectedMatriz && (
        <Dialog open={isAddFilialModalOpen} onOpenChange={setIsAddFilialModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Filial</DialogTitle>
              <p className="text-sm text-muted-foreground">{selectedMatriz.nome_fantasia || selectedMatriz.razao_social}</p>
            </DialogHeader>
            <form onSubmit={validateAndSubmitFilial} className="space-y-4 py-2">
              <div><Label>Razão Social *</Label><Input id="razao_social" value={filialFormData.razao_social} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <div><Label>Nome Fantasia</Label><Input id="nome_fantasia" value={filialFormData.nome_fantasia} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <div><Label>CNPJ *</Label><Input id="cnpj" value={filialFormData.cnpj} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <div><Label>Endereço</Label><Input id="endereco_completo" value={filialFormData.endereco_completo} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddFilialModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <GitBranchPlus className="mr-2 h-4 w-4" /> Adicionar Filial
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminDashboard;
