import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { authService } from '@/services/authService';
import { sendWelcomeEmail } from '@/services/emailService';

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

  const logoUrl = "https://horizons-cdn.hostinger.com/2e9adf63-57d2-437e-87b2-25ae49f4c5b7/dc37b5512fc0e73a5c418dd52548e59c.png";

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
      const { user, tempPassword } = await authService.resetPassword(forgotEmail);
      const emailResult = await sendWelcomeEmail({
        nomeCliente: user.name || user.email,
        emailCliente: user.email,
        senhaTemporaria: tempPassword,
      });
      if (emailResult.ok) {
        toast({ title: 'E-mail enviado!', description: 'Verifique sua caixa de entrada com a senha temporária.' });
      } else {
        toast({ variant: 'destructive', title: 'E-mail não enviado', description: 'Sua senha foi redefinida, mas não conseguimos enviar o e-mail com a senha temporária. Anote: entre em contato com o suporte para receber sua nova senha.', duration: 10000 });
      }
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
      <div className="flex flex-col items-center justify-center p-4 bg-soft-gradient overflow-hidden" style={{ height: '100dvh' }}>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center w-full max-w-sm"
        >
          {/* Logo fora do card */}
          <img
            src="https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png"
            alt="Ágil Seguros"
            className="h-24 w-auto object-contain mb-3"
          />

          <Card className="w-full bg-white/90 border-0 backdrop-blur-md shadow-2xl">
            <CardHeader className="text-center pt-4 pb-2">
              <CardDescription className="text-gray-500">Bem-vindo ao app da Ágil Seguros</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                      required
                      className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff] pr-10"
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
                  <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
                    Lembrar de mim
                  </label>
                </div>
                <Button type="submit" className="w-full rounded-full font-bold text-white" style={{ background: '#003580' }} disabled={isLoggingIn}>
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
                  className="w-full text-center text-sm text-[#003580] hover:underline mt-1"
                >
                  Esqueci minha senha
                </button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
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