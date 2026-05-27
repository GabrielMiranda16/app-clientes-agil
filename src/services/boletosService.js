import { supabase } from '@/lib/customSupabaseClient';

const BUCKET = 'boletos';

// Retorna boletos de uma apólice, deletando os com mais de 2 meses automaticamente
export const boletosService = {
  async getBoletosByApolice(apoliceId) {
    const { data, error } = await supabase
      .from('boletos')
      .select('*')
      .eq('apolice_id', apoliceId)
      .order('mes_referencia', { ascending: false });
    if (error) throw error;

    // Auto-cleanup: remove boletos com mais de 2 meses
    const now = new Date();
    const limite = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const limiteStr = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}`;
    const antigos = (data || []).filter(b => b.mes_referencia < limiteStr);
    if (antigos.length > 0) {
      for (const b of antigos) {
        (async () => {
          try {
            const path = b.arquivo_url?.split(`${BUCKET}/`)[1];
            if (path) await supabase.storage.from(BUCKET).remove([path]);
            await supabase.from('boletos').delete().eq('id', b.id);
          } catch {}
        })();
      }
    }
    return (data || []).filter(b => b.mes_referencia >= limiteStr);
  },

  async uploadBoleto(file, apoliceId, mesReferencia) {
    const path = `${apoliceId}/${mesReferencia}_${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data, error } = await supabase
      .from('boletos')
      .upsert({ apolice_id: Number(apoliceId), mes_referencia: mesReferencia, arquivo_url: publicUrl }, { onConflict: 'apolice_id,mes_referencia' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async replaceBoleto(boleto, file) {
    // Remove arquivo antigo
    const oldPath = boleto.arquivo_url?.split(`${BUCKET}/`)[1];
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});

    const path = `${boleto.apolice_id}/${boleto.mes_referencia}_${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data, error } = await supabase
      .from('boletos')
      .update({ arquivo_url: publicUrl })
      .eq('id', boleto.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBoleto(boleto) {
    const path = boleto.arquivo_url?.split(`${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    const { error } = await supabase.from('boletos').delete().eq('id', boleto.id);
    if (error) throw error;
  },

  async getSignedUrl(arquivoUrl) {
    const path = arquivoUrl?.split(`${BUCKET}/`)[1];
    if (!path) return arquivoUrl;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) return arquivoUrl;
    return data.signedUrl;
  },
};
