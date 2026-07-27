import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext({});

// Nunca incluir 'password' aqui — a coluna guarda hash e não deve trafegar pro browser.
const USER_SAFE_COLUMNS = 'id, email, name, perfil, empresa_id, empresa_matriz_id, ativo, created_at, updated_at, must_change_password, aceite_termos, aceite_whatsapp, aceite_email, data_aceite_termos, ip_aceite, versao_termos';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = async (email) => {
    const { data } = await supabase
      .from('users')
      .select(USER_SAFE_COLUMNS)
      .eq('email', email)
      .maybeSingle();
    return data ?? null;
  };

  // Restaura sessão ao montar
  useEffect(() => {
    const restore = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const profile = await fetchProfile(session.user.email);
          if (profile) {
            setUser(profile);
            return;
          }
        }
        // Sem sessão JWT válida = deslogado. O login() sempre estabelece uma
        // sessão real do Supabase Auth antes de gravar qualquer coisa em
        // sessionStorage, então getSession() já cobre todo usuário legítimo
        // que já logou uma vez — não confiar em dado não assinado do browser.
        sessionStorage.removeItem('agil_session_user');
      } catch (e) {
        console.error('[Auth] Erro ao restaurar sessão:', e);
      } finally {
        setAuthLoading(false);
      }
    };

    restore();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user?.email && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const profile = await fetchProfile(session.user.email);
        if (profile) setUser(profile);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    // 1. Tenta Supabase Auth primeiro
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (!authError) {
      const profile = await fetchProfile(email);
      if (!profile) throw new Error('Usuário não encontrado.');
      setUser(profile);
      return profile;
    }

    // 2. Supabase Auth falhou — usuário ainda não migrado do bcrypt legado.
    // A verificação da senha acontece no servidor (edge function), nunca no navegador.
    const { error: syncError } = await supabase.functions.invoke('sync-auth-password', { body: { email, password } });
    if (syncError) throw new Error('Credenciais inválidas.');

    // 3. Agora tenta login com Supabase Auth — deve funcionar após o sync
    const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
    if (retryError) throw new Error('Credenciais inválidas.');

    const profile = await fetchProfile(email);
    if (!profile) throw new Error('Usuário não encontrado.');
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignora */ }
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{
      user,
      authLoading,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
