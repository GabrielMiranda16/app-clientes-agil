import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldCheck, Users, Wallet, ChevronLeft, ChevronRight, LogOut, Menu, X,
  Lock, UserCog, Loader2,
} from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';
import { validatePasswordStrength } from '@/lib/userValidator';
import { supabaseClient } from '@/lib/supabase';

const SIDEBAR_COLLAPSED_KEY = 'cliente_teste_sidebar_collapsed';

const ClienteSidebarLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const [clientEmpresa, setClientEmpresa] = useState(null);

  // Modal Alterar Senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPassSubmitting, setIsPassSubmitting] = useState(false);

  // Modal Meus Dados
  const [isDadosModalOpen, setIsDadosModalOpen] = useState(false);
  const [dadosForm, setDadosForm] = useState({});
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isSavingDados, setIsSavingDados] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const empresaId = user?.empresa_matriz_id || user?.empresa_id;

  useEffect(() => {
    if (!empresaId) return;
    supabaseClient.from('empresas').select('*').eq('id', empresaId).single()
      .then(({ data }) => { if (data) setClientEmpresa(data); });
  }, [empresaId]);

  const isPF = clientEmpresa?.cnpj && clientEmpresa.cnpj.replace(/\D/g, '').length === 11;

  const navItems = [
    { to: '/select-segmento/teste', icon: ShieldCheck, label: 'Meus Seguros' },
    ...(empresaId ? [
      { to: `/cliente/${empresaId}`, icon: Users, label: 'Beneficiários' },
      { to: `/cliente/${empresaId}/coparticipacao`, icon: Wallet, label: 'Coparticipação' },
    ] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
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
      const { data, error } = await supabaseClient.functions.invoke('change-own-password', {
        body: { oldPassword, newPassword },
      });
      if (error || data?.error) {
        toast({ variant: 'destructive', title: 'Erro', description: data?.error || 'Senha antiga incorreta.' });
        return;
      }
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

  const NavItem = ({ to, icon: Icon, label, onClick }) => (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'text-[#003580]' : 'text-gray-500 hover:text-[#003580]'
        } ${collapsed ? 'justify-center' : ''}`
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  const AccountButton = ({ icon: Icon, label, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-[#003580] transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar — desktop */}
      <aside
        className={`hidden sm:flex fixed inset-y-0 left-0 z-30 flex-col bg-white border-r border-gray-100 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        <div className="h-20 flex items-center justify-center border-b border-gray-100 px-4 flex-shrink-0">
          {collapsed ? (
            <span className="text-2xl font-extrabold text-[#003580]">Á</span>
          ) : (
            <img src="/logo.png" alt="Ágil Seguros" className="h-10 w-auto object-contain" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="border-t border-gray-100 p-3 space-y-1 flex-shrink-0">
          <AccountButton icon={UserCog} label={isPF ? 'Meus Dados' : 'Dados da Empresa'} onClick={openDados} />
          <AccountButton icon={Lock} label="Alterar Senha" onClick={() => setIsPasswordModalOpen(true)} />
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-[#003580] transition-colors w-full"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Topbar — mobile */}
      <div className="sm:hidden fixed top-0 inset-x-0 z-30 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4">
        <img src="/logo.png" alt="Ágil Seguros" className="h-8 w-auto object-contain" />
        <button
          className="p-2 rounded-lg text-[#003580] hover:bg-gray-100"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="sm:hidden fixed top-16 inset-x-0 z-30 bg-white border-b border-gray-100 overflow-hidden"
          >
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
              ))}
              <div className="border-t border-gray-100 pt-2 mt-1 space-y-1">
                <AccountButton icon={UserCog} label={isPF ? 'Meus Dados' : 'Dados da Empresa'} onClick={() => { openDados(); setMobileOpen(false); }} />
                <AccountButton icon={Lock} label="Alterar Senha" onClick={() => { setIsPasswordModalOpen(true); setMobileOpen(false); }} />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 transition-colors w-full"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <main
        className={`flex-1 min-h-screen transition-all duration-200 pt-16 sm:pt-0 ${
          collapsed ? 'sm:ml-[72px]' : 'sm:ml-[240px]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-10 py-8 sm:py-12">
          {children}
        </div>
      </main>

      {/* Modal Alterar Senha */}
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
              <Button type="submit" disabled={isPassSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isPassSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Meus Dados / Dados da Empresa */}
      <Dialog open={isDadosModalOpen} onOpenChange={setIsDadosModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isPF ? 'Meus Dados' : 'Dados da Empresa'}</DialogTitle>
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

export default ClienteSidebarLayout;
