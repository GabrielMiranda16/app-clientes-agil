import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { SEGURADORAS } from '@/data/seguradoras';
import {
  ArrowLeft, Loader2, Building2, Users,
  ClipboardList, Wallet, Stethoscope, UserCheck, TrendingUp, CreditCard,
  Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import BeneficiarioExpandableRow from '@/components/clienteTeste/BeneficiarioExpandableRow';

const ITENS_POR_PAGINA_OPCOES = [5, 10, 15, 25];

const logoDaSeguradora = (nome) => SEGURADORAS.find(s => s.nome === nome)?.logo;

const GestaoApoliceTestePage = () => {
  const { apoliceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apolice, setApolice] = useState(null);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(async (ap) => {
        setApolice(ap);
        if (ap?.empresa_id) {
          const ben = await beneficiariosService.getBeneficiariosByEmpresa(ap.empresa_id).catch(() => []);
          setBeneficiarios(
            ben.filter(b => !b.data_exclusao).map(b => ({ ...b, empresa: ap.empresas }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  const beneficiariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return beneficiarios;
    return beneficiarios.filter((b) =>
      b.nome_completo?.toLowerCase().includes(termo) ||
      b.cpf?.toLowerCase().includes(termo)
    );
  }, [beneficiarios, busca]);

  const totalPaginas = Math.max(1, Math.ceil(beneficiariosFiltrados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const beneficiariosPagina = beneficiariosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  if (!apolice) {
    return (
      <ClienteSidebarLayout>
        <p className="text-gray-400">Apólice não encontrada.</p>
      </ClienteSidebarLayout>
    );
  }

  const segLabel = SEGMENTOS[apolice.segmento]?.label || apolice.segmento;
  const logo = logoDaSeguradora(apolice.seguradora);
  const empresaIsMatriz = apolice.empresas?.tipo === 'MATRIZ';
  const empresaLabel = apolice.empresas
    ? (empresaIsMatriz ? 'Matriz' : (apolice.empresas.nome_fantasia || apolice.empresas.razao_social))
    : null;

  const CARDS = [
    { key: 'solicitacoes', label: 'Solicitações', Icon: ClipboardList, onClick: () => navigate(`/gestao-apolice/${apoliceId}/solicitacoes/teste`) },
    { key: 'coparticipacao', label: 'Coparticipação', Icon: Wallet, onClick: () => navigate(`/cliente/${apolice.empresa_id}/coparticipacao`) },
    { key: 'atestado', label: 'Atestado', Icon: Stethoscope, onClick: () => navigate(`/gestao-apolice/${apoliceId}/atestados/teste`) },
    { key: 'maioridade', label: 'Controle de Maioridade', Icon: UserCheck, onClick: null },
    { key: 'faixa_etaria', label: 'Mudança de Faixa Etária', Icon: TrendingUp, onClick: null },
    { key: 'carteirinha', label: '2ª Via de Carteirinha', Icon: CreditCard, onClick: null },
  ];

  return (
    <>
      <Helmet><title>Gestão da Apólice - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate(`/select-apolice/${apolice.segmento}/teste`)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logo ? <img src={logo} alt={apolice.seguradora} className="w-full h-full object-contain p-1.5" /> : <Building2 className="w-5 h-5 text-gray-400" />}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{apolice.seguradora}</h1>
              <p className="text-gray-400 text-sm">
                {segLabel}
                {empresaLabel && ' · '}
                {empresaLabel && <span className={empresaIsMatriz ? 'font-bold text-gray-500' : ''}>{empresaLabel}</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CARDS.map(({ key, label, Icon, onClick }) => (
              <button
                key={key}
                onClick={onClick || undefined}
                disabled={!onClick}
                className={`group flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 text-left transition-colors ${onClick ? 'hover:border-[#003580]' : 'opacity-50 cursor-not-allowed'}`}
              >
                <span className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 text-gray-700 ${onClick ? 'group-hover:text-[#003580]' : ''} transition-colors`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-gray-900 text-sm">{label}</span>
                  {!onClick && <span className="block text-xs text-gray-400">Em breve</span>}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Vidas</h2>
            <p className="text-gray-400 text-sm mb-5">Pessoas vinculadas a essa apólice especificamente.</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                    placeholder="Buscar por Nome/CPF"
                    className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#003580]/20 focus:border-[#003580]"
                  />
                </div>
                <button
                  title="Em breve"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="hidden sm:inline">Itens por página</span>
                <div className="relative">
                  <select
                    value={itensPorPagina}
                    onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPagina(1); }}
                    className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 bg-white focus:outline-none"
                  >
                    {ITENS_POR_PAGINA_OPCOES.map((n) => (
                      <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <span>{paginaAtual} de {totalPaginas}</span>
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual >= totalPaginas}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-white text-xs font-bold text-gray-500 uppercase tracking-wide">
                <span>Nome</span>
                <span>CPF</span>
                <span>Parentesco</span>
                <span>Idade</span>
                <span></span>
              </div>

              {beneficiariosPagina.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 text-gray-300" />
                  Nenhuma vida encontrada.
                </div>
              ) : (
                beneficiariosPagina.map((b) => (
                  <BeneficiarioExpandableRow key={b.id} beneficiario={b} />
                ))
              )}
            </div>
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default GestaoApoliceTestePage;
