import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ShieldCheck, Users, Wallet, ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'cliente_teste_sidebar_collapsed';

const ClienteSidebarLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const empresaId = user?.empresa_matriz_id || user?.empresa_id;

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
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 transition-colors w-full"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Sair</span>
              </button>
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
    </div>
  );
};

export default ClienteSidebarLayout;
