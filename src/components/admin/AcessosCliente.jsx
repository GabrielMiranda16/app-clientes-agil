import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, KeyRound, Trash2, Users, Power } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabaseClient } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { generateTempPassword, sendWelcomeEmail } from '@/services/emailService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

const AcessosCliente = ({ empresa }) => {
  const { toast } = useToast();
  const [acessos, setAcessos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [salvando, setSalvando] = useState(false);
  const [reenviando, setReenviando] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabaseClient
      .from('users')
      .select('id, email, name, created_at, must_change_password, ativo')
      .eq('perfil', 'CLIENTE')
      .or(`empresa_matriz_id.eq.${empresa.id},empresa_id.eq.${empresa.id}`)
      .order('created_at', { ascending: true });
    if (error) toast({ variant: 'destructive', title: 'Erro ao carregar acessos' });
    setAcessos(data || []);
    setCarregando(false);
  }, [empresa.id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!name || !EMAIL_RE.test(email)) {
      toast({ variant: 'destructive', title: 'Preencha nome e um e-mail válido.' });
      return;
    }
    setSalvando(true);
    try {
      const { data: existente } = await supabaseClient.from('users').select('id').eq('email', email).maybeSingle();
      if (existente) {
        toast({ variant: 'destructive', title: 'Esse e-mail já tem login no app.', description: 'Use outro e-mail para esse acesso.' });
        return;
      }
      const senhaTemporaria = generateTempPassword();
      await authService.createUser({
        name,
        email,
        password: senhaTemporaria,
        perfil: 'CLIENTE',
        empresa_matriz_id: empresa.id,
        ativo: true,
        must_change_password: true,
      });
      const envio = await sendWelcomeEmail({ nomeCliente: name, emailCliente: email, senhaTemporaria });
      toast({
        title: 'Acesso criado',
        description: envio.ok
          ? `Senha provisória enviada para ${email}.`
          : `O acesso foi criado, mas o e-mail não saiu. Use "Reenviar senha". Erro: ${envio.error}`,
        duration: 8000,
      });
      setNovoAberto(false);
      setForm({ name: '', email: '' });
      carregar();
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível criar o acesso.' });
    } finally {
      setSalvando(false);
    }
  };

  const reenviarSenha = async (acesso) => {
    setReenviando(acesso.id);
    try {
      await authService.resetPassword(acesso.email);
      toast({ title: 'Nova senha enviada', description: `Enviamos uma senha provisória para ${acesso.email}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível reenviar a senha.' });
    } finally {
      setReenviando(null);
    }
  };

  const alternarAtivo = async (acesso) => {
    const ativo = acesso.ativo === false;
    try {
      await authService.updateUser(acesso.id, { ativo });
      toast({ title: ativo ? 'Acesso reativado' : 'Acesso desativado', description: ativo ? `${acesso.email} voltou a ver os dados.` : `${acesso.email} não consegue mais entrar. Dá para reativar depois.` });
      carregar();
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível alterar o acesso.' });
    }
  };

  const remover = async (acesso) => {
    try {
      await authService.deleteUser(acesso.id);
      toast({ title: 'Acesso removido', description: `${acesso.email} não vê mais os dados desta empresa.` });
      carregar();
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível remover o acesso.' });
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-[#003580]" /> Acessos ({acessos.length})
        </p>
        <Button size="sm" variant="outline" onClick={() => setNovoAberto(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Adicionar acesso
        </Button>
      </div>
      <p className="text-xs text-gray-400 mb-3">Cada pessoa tem o próprio e-mail e senha, e todas veem os mesmos dados desta empresa e das filiais.</p>

      {carregando ? (
        <div className="py-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#003580]" /></div>
      ) : acessos.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum login cadastrado para esta empresa.</p>
      ) : (
        <div className="space-y-2">
          {acessos.map((a) => (
            <div key={a.id} className={`flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg border text-sm ${a.ativo === false ? 'opacity-60' : ''}`}>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {a.name || a.email}
                  {a.ativo === false && <span className="ml-2 text-[11px] font-semibold text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">Desativado</span>}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {a.name ? `${a.email} · ` : ''}desde {formatarData(a.created_at)}
                  {a.must_change_password && <span className="ml-1.5 text-amber-600">· ainda não trocou a senha provisória</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-[#003580]"
                  title="Reenviar senha provisória"
                  disabled={reenviando === a.id}
                  onClick={() => reenviarSenha(a)}
                >
                  {reenviando === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={`h-7 w-7 ${a.ativo === false ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-amber-600'}`}
                  title={a.ativo === false ? 'Reativar acesso' : 'Desativar acesso'}
                  onClick={() => alternarAtivo(a)}
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" title="Remover acesso">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover o acesso de {a.name || a.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A pessoa deixa de ver os dados desta empresa. Os dados da empresa e os outros acessos continuam iguais.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remover(a)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={novoAberto} onOpenChange={(o) => { setNovoAberto(o); if (!o) setForm({ name: '', email: '' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar acesso</DialogTitle>
            <DialogDescription>{empresa.nome_fantasia || empresa.razao_social}. A pessoa recebe uma senha provisória por e-mail e troca no primeiro acesso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={adicionar} className="space-y-3 py-2">
            <div>
              <Label htmlFor="acesso-nome">Nome</Label>
              <Input id="acesso-nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Ana, do RH" />
            </div>
            <div>
              <Label htmlFor="acesso-email">E-mail</Label>
              <Input id="acesso-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="ana@empresa.com.br" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovoAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando} className="bg-[#003580] hover:bg-[#002060] text-white">
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar acesso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcessosCliente;
