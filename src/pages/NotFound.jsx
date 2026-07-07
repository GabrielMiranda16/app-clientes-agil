import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  return (
    <>
      <Helmet>
        <title>Página não encontrada - Ágil Seguros</title>
      </Helmet>
      <div className="min-h-screen bg-soft-gradient flex flex-col">
        <header style={{ background: 'transparent' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 sm:h-24">
              <img src={logoUrl} alt="Ágil Seguros" className="h-10 sm:h-20 w-auto object-contain" />
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <p className="text-white/60 text-8xl font-bold mb-4 leading-none">404</p>
          <FileQuestion className="h-16 w-16 text-white mb-6 opacity-80" />
          <h1 className="text-3xl font-bold text-white mb-2">Página não encontrada</h1>
          <p className="text-white/70 text-base mb-8">O endereço que você acessou não existe.</p>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 bg-transparent"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button
              onClick={() => navigate(getHomeRoute())}
              className="bg-white text-[#003580] hover:bg-white/90 font-semibold"
            >
              <Home className="mr-2 h-4 w-4" /> Início
            </Button>
          </div>
        </main>
      </div>
    </>
  );
};

export default NotFound;
