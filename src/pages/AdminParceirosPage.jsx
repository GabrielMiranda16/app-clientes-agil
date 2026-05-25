import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Handshake, FileText, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

const STATUS_CONFIG = {
  SOLICITACAO: { label: 'Solicitação',  color: 'bg-gray-100 text-gray-700' },
  ORCAMENTO:   { label: 'Orçamento',    color: 'bg-blue-100 text-blue-700' },
  DOCUMENTOS:  { label: 'Documentos',   color: 'bg-yellow-100 text-yellow-700' },
  ASSINATURA:  { label: 'Assinatura',   color: 'bg-purple-100 text-purple-700' },
  CONCLUIDO:   { label: 'Concluído',    color: 'bg-green-100 text-green-700' },
  COMISSAO:    { label: 'Comissão',     color: 'bg-emerald-100 text-emerald-700' },
};

const SEGMENTO_LABEL = {
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto',
  AUTO_FROTA: 'Auto / Frota',
  VIAGEM: 'Viagem',
  RESIDENCIAL: 'Residencial',
  PET_SAUDE: 'Pet Saúde',
  EMPRESARIAL: 'Empresarial',
  CARGAS: 'Cargas',
  EQUIPAMENTOS: 'Equipamentos Portáteis',
};

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const AdminParceirosPage = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orcamentos')
        .select('*, parceiros(nome_completo, modalidade)')
        .order('created_at', { ascending: false });
      setOrcamentos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const pendentes = orcamentos.filter(o => o.status === 'SOLICITACAO').length;
  const emAndamento = orcamentos.filter(o => !['CONCLUIDO', 'COMISSAO', 'SOLICITACAO'].includes(o.status)).length;
  const concluidos = orcamentos.filter(o => ['CONCLUIDO', 'COMISSAO'].includes(o.status)).length;

  return (
    <>
      <Helmet><title>Parceiros — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          <h1 className="text-2xl font-bold tracking-tight text-white">Orçamentos de Parceiros</h1>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Solicitações novas', value: pendentes, icon: Clock, color: 'text-gray-600' },
              { label: 'Em andamento', value: emAndamento, icon: FileText, color: 'text-blue-600' },
              { label: 'Concluídos', value: concluidos, icon: CheckCircle2, color: 'text-green-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-800">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lista de orçamentos */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : orcamentos.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="text-center py-16">
                  <Handshake className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Nenhum orçamento de parceiro ainda</p>
                  <p className="text-xs text-gray-400 mt-1">Os orçamentos solicitados pelos parceiros aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              orcamentos.map(o => {
                const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.SOLICITACAO;
                const step = FUNIL.indexOf(o.status);
                return (
                  <Card key={o.id} className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{o.cliente_nome || 'Cliente não informado'}</p>
                          <p className="text-xs text-gray-400">{SEGMENTO_LABEL[o.segmento] || o.segmento}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Parceiro: <span className="font-medium">{o.parceiros?.nome_completo || '—'}</span>
                          </p>
                          {o.valor_mensalidade && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Mensalidade: <span className="font-semibold text-gray-700">R$ {Number(o.valor_mensalidade).toFixed(2).replace('.', ',')}</span>
                            </p>
                          )}
                        </div>
                        <Badge className={`text-xs shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                      <div className="mt-3 flex gap-1">
                        {FUNIL.map((s, i) => (
                          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#003580]' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
};

export default AdminParceirosPage;
