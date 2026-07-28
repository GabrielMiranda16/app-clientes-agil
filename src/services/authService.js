import { supabase } from '@/lib/customSupabaseClient';
import { cleanUserData } from '@/lib/userValidator';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Nunca incluir 'password' aqui — a coluna guarda hash e não deve trafegar pro browser.
const USER_SAFE_COLUMNS = 'id, email, name, perfil, empresa_id, empresa_matriz_id, ativo, created_at, updated_at, must_change_password, aceite_termos, aceite_whatsapp, aceite_email, data_aceite_termos, ip_aceite, versao_termos';

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

export const authService = {
  async createUser(userData) {
    try {
      const rawPassword = userData.password;
      const cleanedData = cleanUserData(userData);
      if (cleanedData.password) {
        cleanedData.password = await hashPassword(cleanedData.password);
      }

      const { data, error } = await supabase
        .from('users')
        .insert([cleanedData])
        .select(USER_SAFE_COLUMNS)
        .single();

      if (error) throw error;

      // Cria conta no Supabase Auth silenciosamente
      if (rawPassword && cleanedData.email) {
        try { await supabase.auth.signUp({ email: cleanedData.email, password: rawPassword }); } catch { /* não crítico */ }
      }

      return data;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  async updateUser(id, updateData) {
    try {
      const payload = { ...updateData };
      if (payload.password) {
        payload.password = await hashPassword(payload.password);
      }

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .select(USER_SAFE_COLUMNS)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      // Remove registros vinculados antes de excluir o usuário
      await supabase.from('termos_log').delete().eq('user_id', id);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  async resetPassword(email) {
    // A verificação do e-mail, a geração da senha temporária e o envio do
    // e-mail acontecem inteiramente no servidor — a resposta nunca traz a
    // senha nem confirma se aquele e-mail existe na base.
    const { data, error } = await supabase.functions.invoke('request-password-reset', { body: { email } });
    if (error || data?.error) throw new Error(data?.error || 'Não foi possível processar o pedido.');
    return data; // { ok: true }
  },

  logoutUser() {
    localStorage.removeItem('user');
    return true;
  }
};