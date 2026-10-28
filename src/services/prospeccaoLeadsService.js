import { supabase } from '@/lib/customSupabaseClient';

const PAGE_SIZE = 24;

export const prospeccaoLeadsService = {
  async listarTodos({ tier = 'Hot' } = {}) {
    const { data, error } = await supabase
      .from('prospeccao_leads')
      .select('*')
      .eq('tier', tier)
      .order('score', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listarAgrupadoPorEmpresa({ tier = 'Hot' } = {}) {
    const { data, error } = await supabase
      .from('prospeccao_leads')
      .select('*')
      .eq('tier', tier)
      .order('empresa', { ascending: true })
      .order('score', { ascending: false });
    if (error) throw error;

    const porEmpresa = new Map();
    for (const row of data ?? []) {
      if (!porEmpresa.has(row.empresa)) {
        porEmpresa.set(row.empresa, {
          empresa: row.empresa,
          cnpj: row.cnpj,
          setor: row.setor,
          func_min: row.func_min,
          faturamento: row.faturamento,
          score: row.score,
          decisores: [],
        });
      }
      porEmpresa.get(row.empresa).decisores.push(row);
    }
    return Array.from(porEmpresa.values());
  },

  async listar({ page = 0, tier = null, status = null, busca = '' } = {}) {
    let query = supabase
      .from('prospeccao_leads')
      .select('*', { count: 'exact' })
      .order('score', { ascending: false });

    if (tier) query = query.eq('tier', tier);
    if (status === '__sem_status__') query = query.is('status', null);
    else if (status) query = query.eq('status', status);
    if (busca) query = query.ilike('empresa', `%${busca}%`);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE };
  },

  async atualizar(id, patch) {
    const { error } = await supabase.from('prospeccao_leads').update(patch).eq('id', id);
    if (error) throw error;
  },
};
