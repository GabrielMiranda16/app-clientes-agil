import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { authService } from '@/services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = async (email) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (!data) return null;
    const { password: _, ...safe } = data;
    return safe;
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
        // Fallback: usuários ainda não migrados para Supabase Auth não têm sessão JWT,
        // então restauramos do sessionStorage para não deslogar no F5.
        const stored = sessionStorage.getItem('agil_session_user');
        if (stored) {
          try { setUser(JSON.parse(stored)); } catch { sessionStorage.removeItem('agil_session_user'); }
        }
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
      sessionStorage.setItem('agil_session_user', JSON.stringify(profile));
      setUser(profile);
      return profile;
    }

    // 2. Supabase Auth falhou — tenta bcrypt (usuário ainda não migrado)
    const userData = await authService.loginUser(email, password); // lança se errado

    // 3. Sincroniza com Supabase Auth via Edge Function (usa chave de admin no servidor)
    try {
      await supabase.functions.invoke('sync-auth-password', { body: { email, password } });
      // 4. Agora tenta login com Supabase Auth — deve funcionar após o sync
      await supabase.auth.signInWithPassword({ email, password });
    } catch {
      // Não crítico — app continua funcionando
    }

    const { password: _, ...safeUser } = userData;
    sessionStorage.setItem('agil_session_user', JSON.stringify(safeUser));
    setUser(safeUser);
    return safeUser;
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignora */ }
    sessionStorage.removeItem('agil_session_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    if (userData) sessionStorage.setItem('agil_session_user', JSON.stringify(userData));
    else sessionStorage.removeItem('agil_session_user');
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
