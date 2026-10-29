import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { authService } from '@/services/authService';

const LoginPage = () => {
  const savedEmail = localStorage.getItem('agil_remember_email') || '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!savedEmail);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rememberMe) localStorage.setItem('agil_remember_email', email);
    else localStorage.removeItem('agil_remember_email');
    setIsLoggingIn(true);

    try {
      const user = await login(email, password);

      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo de volta, ${user.email}! Redirecionando...`,
        className: "bg-green-600 border-green-700 text-white"
      });

      if (user.must_change_password) navigate('/force-change-password');
      else if (user.aceite_termos !== true) navigate('/termos-aceite');
      else if (user.perfil === 'CEO') navigate('/ceo');
      else if (user.perfil === 'ADM') navigate('/admin');
      else if (user.perfil === 'CLIENTE') navigate('/select-segmento');
      else if (user.perfil === 'PARCEIRO') navigate('/parceiro');
    } catch (error) {
      console.error("Login error caught in component:", error);
      toast({
        variant: "destructive",
        title: "Falha no login",
        description: error.message === 'Credenciais inválidas.'
          ? "E-mail ou senha incorretos."
          : `Erro: ${error.message || JSON.stringify(error)}`,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsSendingReset(true);
    try {
      // O envio do e-mail com a senha temporária acontece no servidor —
      // a resposta nunca traz a senha de volta pro navegador.
      await authService.resetPassword(forgotEmail);
      toast({ title: 'E-mail enviado!', description: 'Se o e-mail estiver cadastrado, você vai receber uma nova senha em instantes.' });
      setIsForgotOpen(false);
      setForgotEmail('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Ágil Seguros</title>
        <meta name="description" content="Acesse sua conta no sistema Ágil Seguros." />
      </Helmet>
      <div className="w-full bg-white flex flex-col lg:flex-row overflow-hidden" style={{ height: '100dvh' }}>
        {/* Desktop: imagem no lado esquerdo */}
        <div className="hidden lg:block lg:w-1/2 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full rounded-[32px] overflow-hidden"
          >
            <img
              src="/login-familia.jpg"
              alt="Família protegida pela Ágil Seguros"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Login */}
        <div className="w-full lg:w-1/2 flex-1 flex items-center justify-center p-6 lg:p-16 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm lg:max-w-md"
          >
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-5 lg:mb-10">
              <img
                src="/logo.png"
                alt="Ágil Seguros"
                className="w-44 lg:w-64 h-auto mb-4 lg:mb-6"
              />
              <h1
                className="font-light text-black leading-[1.1] tracking-tight"
                style={{ fontSize: "clamp(1.7rem, 2.4vw, 2.1rem)" }}
              >
                Bem-vindo ao app da Ágil Seguros
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-5">
              <div className="space-y-1.5 lg:space-y-2">
                <Label htmlFor="email" className="text-gray-700 lg:text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff] lg:h-12 lg:text-base lg:px-4"
                />
              </div>
              <div className="space-y-1.5 lg:space-y-2">
                <Label htmlFor="password" className="text-gray-700 lg:text-base">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                    required
                    className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff] pr-10 lg:h-12 lg:text-base lg:px-4"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#003580] cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm lg:text-base text-gray-600 cursor-pointer select-none">
                  Lembrar de mim
                </label>
              </div>
              <Button type="submit" className="w-full rounded-full font-bold text-white lg:h-12 lg:text-base" style={{ background: '#003580' }} disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : 'Entrar'}
              </Button>
              <button
                type="button"
                onClick={() => { setIsForgotOpen(true); setForgotEmail(email); }}
                className="w-full text-center text-sm lg:text-base text-[#003580] hover:underline mt-1"
              >
                Esqueci minha senha
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
            <div>
              <Label htmlFor="forgot-email">E-mail da conta</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="mt-1 border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsForgotOpen(false)}>Cancelar</Button>
              <Button type="submit" style={{ background: '#003580' }} className="text-white" disabled={isSendingReset}>
                {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar senha temporária
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoginPage;