import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  LogOut,
  Repeat,
  ChevronsRight,
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Lock,
  Loader2,
  User,
  UserCog,
  Menu,
  X,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardList,
  Shield
} from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';
import useDateTime from '@/hooks/use-date-time';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ChatWidget from '@/components/ChatWidget';
import { empresasService } from '@/services/empresasService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { authService } from '@/services/authService';
import { validatePasswordStrength } from '@/lib/userValidator';
import { supabaseClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresaId } = useParams();
  const { toast } = useToast();
  
  const [empresas, setEmpresas] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const { formattedDate, formattedTime } = useDateTime('America/Sao_Paulo');

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [empData, solData, userResult] = await Promise.allSettled([
          empresasService.getEmpresas(),
          solicitacoesService.getAllSolicitacoes(),
          supabaseClient.from('users').select('*').eq('id', user?.id).single()
        ]);

        setEmpresas(empData.status === 'fulfilled' ? (empData.value || []) : []);
        setSolicitacoes(solData.status === 'fulfilled' ? (solData.value || []) : []);
        if (userResult.status === 'fulfilled' && userResult.value?.data) {
          setCurrentUserData(userResult.value.data);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Password Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPassSubmitting, setIsPassSubmitting] = useState(false);

  // Dados Modal (CLIENTE)
  const [isDadosModalOpen, setIsDadosModalOpen] = useState(false);
  const [dadosForm, setDadosForm] = useState({});
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isSavingDados, setIsSavingDados] = useState(false);

  const clientEmpresa = user?.perfil === 'CLIENTE'
    ? empresas.find(e => e.id === (user?.empresa_id || user?.empresa_matriz_id)) || empresas[0]
    : null;
  const isPF = clientEmpresa?.cnpj && clientEmpresa.cnpj.replace(/\D/g, '').length === 11;

  const openDados = () => {
    if (!clientEmpresa) return;
    setDadosForm({
      razao_social: clientEmpresa.razao_social || '',
      cnpj: clientEmpresa.cnpj || '',
      data_nascimento: clientEmpresa.data_nascimento || '',
      endereco_completo: clientEmpresa.endereco_completo || '',
      cep_busca: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    });
    setIsDadosModalOpen(true);
  };

  const buscarCepDados = async (cep) => {
    const nums = cep.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setDadosForm(prev => ({ ...prev, rua: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', estado: data.uf || '' }));
      } else {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      }
    } catch {} finally { setIsCepLoading(false); }
  };

  const handleSaveDados = async (e) => {
    e.preventDefault();
    setIsSavingDados(true);
    try {
      const parts = [
        dadosForm.rua, dadosForm.numero && `nº ${dadosForm.numero}`,
        dadosForm.complemento, dadosForm.bairro,
        dadosForm.cidade && dadosForm.estado ? `${dadosForm.cidade}/${dadosForm.estado}` : (dadosForm.cidade || dadosForm.estado),
        dadosForm.cep_busca && `CEP ${dadosForm.cep_busca}`,
      ].filter(Boolean);
      const endereco_completo = parts.length > 0 ? parts.join(', ') : (dadosForm.endereco_completo || '');
      await supabaseClient.from('empresas').update({
        razao_social: dadosForm.razao_social,
        endereco_completo,
        ...(isPF && { data_nascimento: dadosForm.data_nascimento || null }),
      }).eq('id', clientEmpresa.id);
      toast({ title: 'Dados atualizados com sucesso.' });
      setIsDadosModalOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar dados' });
    } finally { setIsSavingDados(false); }
  };

  const pendingCount = solicitacoes.filter(s => s.status === 'PENDENTE').length;

  const logoUrl = "https://horizons-cdn.hostinger.com/2e9adf63-57d2-437e-87b2-25ae49f4c5b7/dc37b5512fc0e73a5c418dd52548e59c.png";

  const getHomeLink = () => {
    if (!user) return '/login';
    switch (user.perfil) {
      case 'CEO': return '/ceo';
      case 'ADM': return '/admin';
      case 'CLIENTE': return '/select-segmento';
      default: return '/login';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoBack = () => {
    if (user?.perfil === 'CEO') {
      navigate('/ceo');
    } else if (user?.perfil === 'ADM') {
      navigate('/admin');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentUserData) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não encontrado.' });
      return;
    }

    // Suporta senhas em bcrypt (novas) e texto puro (legado)
    const storedPassword = currentUserData.password || '';
    const isBcrypt = storedPassword.startsWith('$2');
    const isOldCorrect = isBcrypt
      ? await bcrypt.compare(oldPassword, storedPassword)
      : oldPassword === storedPassword;

    if (!isOldCorrect) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Senha antiga incorreta.' });
      return;
    }
    const passErrors = validatePasswordStrength(newPassword);
    if (passErrors.length > 0) {
      toast({ variant: 'destructive', title: 'Senha fraca', description: passErrors[0] });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A confirmação não confere.' });
      return;
    }

    setIsPassSubmitting(true);
    try {
      await authService.updateUser(user.id, { password: newPassword });
      toast({ title: 'Sucesso', description: 'Senha alterada com sucesso.' });
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a nova senha.' });
    } finally {
      setIsPassSubmitting(false);
    }
  };

  const isClientDashboard = location.pathname.startsWith('/cliente/');
  const isAdminViewingClient = (user?.perfil === 'CEO' || user?.perfil === 'ADM') && isClientDashboard;
  const currentEmpresa = isClientDashboard ? empresas.find(e => e.id === Number(empresaId)) : null;
  const isApolicePage = location.pathname.startsWith('/apolice/');

  return (
    <div className="min-h-screen flex flex-col bg-soft-gradient">
      <header className="z-40 relative" style={{ background: 'transparent' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-24">
            {/* Logo + breadcrumb */}
            <div className="flex items-center space-x-3 min-w-0">
              <Link to={getHomeLink()} className="shrink-0">
                <img
                  src="https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png"
                  alt="Ágil Seguros"
                  className={`${isApolicePage ? 'h-10' : 'h-12'} sm:h-20 w-auto object-contain`}
                />
              </Link>
              {currentEmpresa && (
                <div className="hidden md:flex items-center text-sm min-w-0">
                  <ChevronsRight className="h-5 w-5 text-white/40 mx-1 shrink-0" />
                  <span className="font-semibold text-white/80 truncate max-w-xs">
                    {currentEmpresa.nome_fantasia || currentEmpresa.razao_social}
                  </span>
                  <Badge variant={currentEmpresa.tipo === 'MATRIZ' ? 'default' : 'secondary'} className="ml-2 shrink-0">{currentEmpresa.tipo}</Badge>
                </div>
              )}
            </div>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
              {(user?.perfil === 'CEO' || user?.perfil === 'ADM') && (
                <div className="hidden lg:flex items-center space-x-4 text-sm font-medium text-white/80">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    <Calendar className="h-4 w-4 text-white/70" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    <Clock className="h-4 w-4 text-white/70" />
                    <span>{formattedTime} (Brasília)</span>
                  </div>
                </div>
              )}

              {isClientDashboard && empresaId && (
                <NavLink
                  to={`/cliente/${empresaId}/coparticipacao`}
                  className={({ isActive }) =>
                    `flex items-center p-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
                  }
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  <span>Minha Coparticipação</span>
                </NavLink>
              )}

              {isAdminViewingClient && (
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20" onClick={handleGoBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Voltar</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-white/10 text-white">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-white">{user?.email}</p>
                      <p className="text-xs text-blue-200 font-semibold">{user?.perfil}</p>
                    </div>
                    <User className="h-5 w-5 text-white/80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Button variant="ghost" className="w-full justify-start cursor-pointer font-normal" onClick={() => setIsPasswordModalOpen(true)}>
                      <Lock className="mr-2 h-4 w-4" /> Alterar Senha
                    </Button>
                  </DropdownMenuItem>
                  {user?.perfil === 'CLIENTE' && clientEmpresa && (
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start cursor-pointer font-normal" onClick={openDados}>
                        <UserCog className="mr-2 h-4 w-4" /> {isPF ? 'Dados Pessoais' : 'Dados da Empresa'}
                      </Button>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Button variant="ghost" className="w-full justify-start cursor-pointer text-red-600 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Sair
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: hamburger button */}
            <button
              className="sm:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-[#003580]/95 backdrop-blur px-4 py-4 space-y-1">
            {/* User info */}
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-semibold text-white">{user?.email}</p>
              <p className="text-xs text-blue-200">{user?.perfil}</p>
            </div>
            <div className="border-t border-white/10 pt-2 space-y-1">

              {/* CEO nav */}
              {user?.perfil === 'CEO' && (
                <>
                  <NavLink to="/ceo" onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <LayoutDashboard className="h-5 w-5" /> Dashboard CEO
                  </NavLink>
                  <NavLink to="/admin" onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <Shield className="h-5 w-5" /> Administração
                  </NavLink>
                  <NavLink to="/solicitacoes" onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <ClipboardList className="h-5 w-5" /> Solicitações
                  </NavLink>
                </>
              )}

              {/* ADM nav */}
              {user?.perfil === 'ADM' && (
                <>
                  <NavLink to="/admin" onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <Users className="h-5 w-5" /> Clientes
                  </NavLink>
                  <NavLink to="/solicitacoes" onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <ClipboardList className="h-5 w-5" /> Solicitações
                  </NavLink>
                  {isAdminViewingClient && (
                    <button onClick={() => { handleGoBack(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full">
                      <ArrowLeft className="h-5 w-5" /> Voltar ao Painel
                    </button>
                  )}
                </>
              )}

              {/* CLIENT nav */}
              {user?.perfil === 'CLIENTE' && (
                <>
                  <NavLink to="/select-segmento" onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <FileText className="h-5 w-5" /> Meus Seguros
                  </NavLink>
                  {isClientDashboard && empresaId && (
                    <NavLink to={`/cliente/${empresaId}/coparticipacao`} onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                      <DollarSign className="h-5 w-5" /> Minha Coparticipação
                    </NavLink>
                  )}
                </>
              )}

              <div className="border-t border-white/10 pt-2 mt-1 space-y-1">
                <button onClick={() => { setIsPasswordModalOpen(true); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full">
                  <Lock className="h-5 w-5" /> Alterar Senha
                </button>
                {user?.perfil === 'CLIENTE' && clientEmpresa && (
                  <button onClick={() => { openDados(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full">
                    <UserCog className="h-5 w-5" /> {isPF ? 'Dados Pessoais' : 'Dados da Empresa'}
                  </button>
                )}
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors w-full">
                  <LogOut className="h-5 w-5" /> Sair
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-8">
        {children}
      </main>

      <ChatWidget />
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label>Senha antiga</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <div className="mt-2 bg-gray-50 rounded-lg p-2.5 space-y-1">
                {[
                  { ok: newPassword.length >= 6,            txt: 'Mínimo 6 caracteres' },
                  { ok: /[A-Z]/.test(newPassword),          txt: '1 letra maiúscula' },
                  { ok: /[a-z]/.test(newPassword),          txt: '1 letra minúscula' },
                  { ok: /[0-9]/.test(newPassword),          txt: '1 número' },
                  { ok: /[^a-zA-Z0-9]/.test(newPassword),   txt: '1 caractere especial' },
                ].map(({ ok, txt }) => (
                  <div key={txt} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{ok ? '✓' : '○'}</span> {txt}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPassSubmitting}>
                {isPassSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dados Pessoais / Empresa (CLIENTE) */}
      <Dialog open={isDadosModalOpen} onOpenChange={setIsDadosModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isPF ? 'Dados Pessoais' : 'Dados da Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDados} className="space-y-4 py-2">
            <div>
              <Label>{isPF ? 'Nome Completo' : 'Razão Social'}</Label>
              <Input value={dadosForm.razao_social || ''} onChange={e => setDadosForm(p => ({ ...p, razao_social: e.target.value }))} />
            </div>
            <div>
              <Label>{isPF ? 'CPF' : 'CNPJ'}</Label>
              <Input value={dadosForm.cnpj ? formatCpfCnpj(dadosForm.cnpj) : ''} readOnly className="bg-gray-50 text-gray-500" />
            </div>
            {isPF && (
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" value={dadosForm.data_nascimento || ''} onChange={e => setDadosForm(p => ({ ...p, data_nascimento: e.target.value }))} />
              </div>
            )}
            {dadosForm.endereco_completo && (
              <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600">
                <p className="text-xs font-medium text-gray-400 mb-1">Endereço atual</p>
                {dadosForm.endereco_completo}
              </div>
            )}
            <div>
              <Label>Atualizar Endereço via CEP</Label>
              <div className="flex gap-2">
                <Input placeholder="00000-000" maxLength={9} value={dadosForm.cep_busca || ''}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2'); setDadosForm(p => ({ ...p, cep_busca: v })); }}
                  onBlur={e => buscarCepDados(e.target.value)} />
                <Button type="button" variant="outline" disabled={isCepLoading} onClick={() => buscarCepDados(dadosForm.cep_busca || '')}>
                  {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Rua / Logradouro</Label>
              <Input value={dadosForm.rua || ''} onChange={e => setDadosForm(p => ({ ...p, rua: e.target.value }))} placeholder="Preenchido automaticamente pelo CEP" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Número</Label><Input value={dadosForm.numero || ''} onChange={e => setDadosForm(p => ({ ...p, numero: e.target.value }))} /></div>
              <div><Label>Complemento</Label><Input value={dadosForm.complemento || ''} onChange={e => setDadosForm(p => ({ ...p, complemento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Bairro</Label><Input value={dadosForm.bairro || ''} readOnly className="bg-gray-50 text-gray-500" /></div>
              <div><Label>Cidade</Label><Input value={dadosForm.cidade || ''} readOnly className="bg-gray-50 text-gray-500" /></div>
            </div>
            <div><Label>Estado</Label><Input value={dadosForm.estado || ''} readOnly className="bg-gray-50 text-gray-500 w-full sm:w-24" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDadosModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSavingDados} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSavingDados && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;