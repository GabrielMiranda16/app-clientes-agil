import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const LoginPage                = lazy(() => import('@/pages/Login'));
const CEODashboard             = lazy(() => import('@/pages/CEODashboard'));
const AdminDashboard           = lazy(() => import('@/pages/AdminDashboard'));
const AdminSelecaoPage         = lazy(() => import('@/pages/AdminSelecaoPage'));
const AdminParceirosPage       = lazy(() => import('@/pages/AdminParceirosPage'));
const AdminLembretesPage       = lazy(() => import('@/pages/AdminLembretesPage'));
const AdminLeadsPage           = lazy(() => import('@/pages/AdminLeadsPage'));
const ParceiroDashboard        = lazy(() => import('@/pages/ParceiroDashboard'));
const AdminClientePage         = lazy(() => import('@/pages/AdminClientePage'));
const AdminSegmentoPage        = lazy(() => import('@/pages/AdminSegmentoPage'));
const ClientDashboard          = lazy(() => import('@/pages/ClientDashboard'));
const UnauthorizedPage         = lazy(() => import('@/pages/Unauthorized'));
const SelectSegmento           = lazy(() => import('@/pages/SelectSegmento'));
const SelectApolice            = lazy(() => import('@/pages/SelectApolice'));
const ApoliceDashboard         = lazy(() => import('@/pages/ApoliceDashboard'));
const SolicitacoesPage         = lazy(() => import('@/pages/SolicitacoesPage'));
const CoparticipacaoPage       = lazy(() => import('@/pages/CoparticipacaoPage'));
const CoparticipacaoClientePage = lazy(() => import('@/pages/CoparticipacaoClientePage'));
const ForceChangePassword      = lazy(() => import('@/pages/ForceChangePassword'));
const TermosAceite             = lazy(() => import('@/pages/TermosAceite'));
const OrcamentoPublicoPage     = lazy(() => import('@/pages/OrcamentoPublicoPage'));
const NotFound                 = lazy(() => import('@/pages/NotFound'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
    <Loader2 className="h-8 w-8 animate-spin text-white" />
  </div>
);

const AppRoutes = () => {
  const { user, authLoading } = useAuth();

  const getHomeRoute = () => {
    if (!user) return '/login';
    switch (user.perfil) {
      case 'CEO': return '/ceo';
      case 'ADM': return '/admin';
      case 'CLIENTE': return '/select-segmento';
      case 'PARCEIRO': return '/parceiro';
      default: return '/login';
    }
  };

  if (authLoading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route path="/termos-aceite" element={<ProtectedRoute allowedRoles={['CEO', 'ADM', 'CLIENTE', 'PARCEIRO']}><TermosAceite /></ProtectedRoute>} />
        <Route path="/ceo" element={<ProtectedRoute allowedRoles={['CEO']}><CEODashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminSelecaoPage /></ProtectedRoute>} />
        <Route path="/admin/clientes" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/orcamentos" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminParceirosPage /></ProtectedRoute>} />
        <Route path="/admin/parceiros" element={<Navigate to="/admin/orcamentos" replace />} />
        <Route path="/admin/lembretes" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminLembretesPage /></ProtectedRoute>} />
        <Route path="/admin/leads" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminLeadsPage /></ProtectedRoute>} />
        <Route path="/parceiro" element={<ProtectedRoute allowedRoles={['PARCEIRO']}><ParceiroDashboard /></ProtectedRoute>} />
        <Route path="/admin/cliente/:matrizId" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminClientePage /></ProtectedRoute>} />
        <Route path="/admin/cliente/:matrizId/segmento/:segmento" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><AdminSegmentoPage /></ProtectedRoute>} />
        <Route path="/solicitacoes" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><SolicitacoesPage /></ProtectedRoute>} />
        <Route path="/coparticipacao" element={<ProtectedRoute allowedRoles={['CEO', 'ADM']}><CoparticipacaoPage /></ProtectedRoute>} />
        <Route path="/cliente/:empresaId" element={<ProtectedRoute allowedRoles={['CEO', 'ADM', 'CLIENTE']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="/cliente/:empresaId/coparticipacao" element={<ProtectedRoute allowedRoles={['CEO', 'ADM', 'CLIENTE']}><CoparticipacaoClientePage /></ProtectedRoute>} />
        <Route path="/select-segmento" element={<ProtectedRoute allowedRoles={['CLIENTE']}><SelectSegmento /></ProtectedRoute>} />
        <Route path="/select-apolice/:segmento" element={<ProtectedRoute allowedRoles={['CLIENTE']}><SelectApolice /></ProtectedRoute>} />
        <Route path="/apolice/:apoliceId" element={<ProtectedRoute allowedRoles={['CLIENTE', 'CEO', 'ADM']}><ApoliceDashboard /></ProtectedRoute>} />
        <Route path="/force-change-password" element={<ProtectedRoute allowedRoles={['CEO','ADM','CLIENTE','PARCEIRO']}><ForceChangePassword /></ProtectedRoute>} />
        <Route path="/orcamento/:slug" element={<OrcamentoPublicoPage />} />
        <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <Router>
            <AppRoutes />
            <Toaster />
          </Router>
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
