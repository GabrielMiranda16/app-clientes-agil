import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/customSupabaseClient';
import { validatePasswordStrength } from '@/lib/userValidator';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

const Requisito = ({ ok, texto }) => (
  <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-gray-500'}`}>
    {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
    {texto}
  </div>
);

const ForceChangePassword = () => {
  const { user, updateUser, authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const errors = validatePasswordStrength(newPassword);
  const isValid = errors.length === 0;

  const getHomeRoute = () => {
    if (!user) return '/login';
    if (user.perfil === 'CEO') return '/ceo';
    if (user.perfil === 'ADM') return '/admin-selecao';
    if (user.perfil === 'PARCEIRO') return '/parceiro';
    return '/select-segmento';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user || !user.must_change_password) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return toast({ variant: 'destructive', title: 'A senha não atende aos requisitos.' });
    if (newPassword !== confirmPassword) return toast({ variant: 'destructive', title: 'As senhas não conferem.' });

    setIsSubmitting(true);
    try {
      await authService.updateUser(user.id, { password: newPassword, must_change_password: false });
      // Atualiza também no Supabase Auth (silencioso se falhar)
      try { await supabase.auth.updateUser({ password: newPassword }); } catch { /* não crítico */ }
      updateUser({ ...user, must_change_password: false });
      toast({ title: 'Senha definida com sucesso!', description: 'Bem-vindo ao sistema.' });
      navigate(getHomeRoute());
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar senha. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-soft-gradient">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <img src={logoUrl} alt="Ágil Seguros" className="h-24 w-auto object-contain mx-auto mb-6" />

        <Card className="bg-white/90 border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="bg-[#003580]/10 p-3 rounded-full">
                <Lock className="h-6 w-6 text-[#003580]" />
              </div>
            </div>
            <CardTitle className="text-lg">Defina sua senha</CardTitle>
            <CardDescription>Este é seu primeiro acesso. Por segurança, crie uma senha pessoal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff] pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Requisitos */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <Requisito ok={newPassword.length >= 6}        texto="Mínimo 6 caracteres" />
                <Requisito ok={/[A-Z]/.test(newPassword)}      texto="1 letra maiúscula" />
                <Requisito ok={/[a-z]/.test(newPassword)}      texto="1 letra minúscula" />
                <Requisito ok={/[0-9]/.test(newPassword)}      texto="1 número" />
                <Requisito ok={/[^a-zA-Z0-9]/.test(newPassword)} texto="1 caractere especial (!@#$%...)" />
              </div>

              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff] pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500">As senhas não conferem.</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !isValid || newPassword !== confirmPassword}
                className="w-full rounded-full font-bold text-white"
                style={{ background: '#003580' }}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar e Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForceChangePassword;
