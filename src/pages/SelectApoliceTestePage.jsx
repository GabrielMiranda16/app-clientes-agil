import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { SEGURADORAS } from '@/data/seguradoras';
import { ArrowLeft, Loader2, FileText, Plus, Pencil, ArrowRight, Building2, HeartPulse, Smile, HeartHandshake } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import ApoliceExpandableRow from '@/components/clienteTeste/ApoliceExpandableRow';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const TIPOS_ATALHO = [
  { tipo: 'saude',  label: 'Saúde',  Icon: HeartPulse },
  { tipo: 'odonto', label: 'Odonto', Icon: Smile },
  { tipo: 'vida',   label: 'Vida',   Icon: HeartHandshake },
];

const logoDaSeguradora = (nome) => SEGURADORAS.find(s => s.nome === nome)?.logo;

const SelectApoliceTestePage = () => {
  const { segmento } = useParams();
  const { user } = useAuth();
  const { selectedCompanyId, isViewingAsClient } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apolices, setApolices] = useState([]);
  const [empresaId, setEmpresaId] = useState(null);
  const [atalhos, setAtalhos] = useState({});
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [selecaoModal, setSelecaoModal] = useState('');

  const segConfig = SEGMENTOS[segmento] || SEGMENTOS[segmento?.toUpperCase()] || Object.values(SEGMENTOS).find(s => s.slug === segmento);
  const isSVD = segmento?.toLowerCase().replace(/_/g, '-') === 'saude-vida-odonto';

  useEffect(() => {
    const id = user?.perfil !== 'CLIENTE' && isViewingAsClient && selectedCompanyId
      ? selectedCompanyId
      : (user?.empresa_matriz_id || user?.empresa_id);
    if (!id) { setLoading(false); return; }
    setEmpresaId(id);

    apolicesService.getApolicesByMatriz(id)
      .then(all => {
        const filtered = all.filter(ap => ap.segmento?.toLowerCase().replace(/_/g, '-') === segmento?.toLowerCase().replace(/_/g, '-'));
        setApolices(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, segmento, selectedCompanyId, isViewingAsClient]);

  useEffect(() => {
    if (!isSVD || !empresaId) return;
    try {
      const raw = localStorage.getItem(`atalhos_svd_${empresaId}`);
      if (raw) setAtalhos(JSON.parse(raw));
    } catch { /* localStorage indisponível ou corrompido — ignora */ }
  }, [isSVD, empresaId]);

  const opcoesPorTipo = useMemo(() => {
    const map = { saude: [], odonto: [], vida: [] };
    apolices.forEach((ap) => {
      (ap.dados_adicionais?.sub_apolices || []).forEach((sub) => {
        const tipo = sub.tipo?.toLowerCase();
        if (map[tipo] && !map[tipo].some(o => o.apoliceId === ap.id)) {
          map[tipo].push({ apoliceId: ap.id, seguradora: ap.seguradora, numero: sub.numero || ap.numero_apolice });
        }
      });
    });
    return map;
  }, [apolices]);

  const salvarAtalhos = (next) => {
    setAtalhos(next);
    try { localStorage.setItem(`atalhos_svd_${empresaId}`, JSON.stringify(next)); } catch { /* ignora */ }
  };

  const abrirEdicao = (tipo) => {
    setSelecaoModal(atalhos[tipo] ? String(atalhos[tipo]) : '');
    setEditandoTipo(tipo);
  };

  const handleSalvarAtalho = () => {
    if (!selecaoModal) return;
    salvarAtalhos({ ...atalhos, [editandoTipo]: Number(selecaoModal) });
    setEditandoTipo(null);
  };

  const handleAcessarAtalho = (tipo) => {
    const apoliceId = atalhos[tipo];
    const apolice = apolices.find(ap => ap.id === apoliceId);
    if (!apolice) return;
    navigate(`/cliente/${empresaId}`, {
      state: { from: 'apolice', apoliceId: apolice.id, segmento: apolice.segmento, segLabel: 'Saúde, Vida e Odonto', apoliceNum: apolice.numero_apolice },
    });
  };

  const segLabel = segConfig?.label || segmento?.toLowerCase().replace(/_/g, ' ');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{segLabel} - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate('/select-segmento/teste')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Meus Seguros
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">{segLabel}</h1>
            <p className="text-gray-400 text-sm">{apolices.length} {apolices.length === 1 ? 'apólice encontrada' : 'apólices encontradas'}</p>
          </div>

          {isSVD && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TIPOS_ATALHO.map(({ tipo, label, Icon }) => {
                const apoliceId = atalhos[tipo];
                const apolice = apoliceId ? apolices.find(ap => ap.id === apoliceId) : null;
                const logo = apolice ? logoDaSeguradora(apolice.seguradora) : null;
                const temOpcoes = opcoesPorTipo[tipo]?.length > 0;

                if (apolice) {
                  return (
                    <button
                      key={tipo}
                      onClick={() => handleAcessarAtalho(tipo)}
                      className="group relative flex items-center gap-3 bg-white border border-gray-100 hover:border-[#003580] hover:bg-[#F0F5FC] rounded-2xl shadow-sm px-4 py-3.5 text-left transition-colors"
                    >
                      <span
                        onClick={(e) => { e.stopPropagation(); abrirEdicao(tipo); }}
                        className="absolute top-2 right-2 p-1 rounded-full text-gray-300 hover:text-[#003580] hover:bg-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </span>
                      <span className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {logo ? <img src={logo} alt={apolice.seguradora} className="w-full h-full object-contain p-1.5" /> : <Building2 className="w-4 h-4 text-gray-400" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[#003580] font-bold uppercase tracking-wide">{label}</span>
                        <span className="block font-bold text-gray-900 text-sm truncate">{apolice.seguradora}</span>
                        <span className="block text-xs text-gray-400 truncate">{opcoesPorTipo[tipo]?.find(o => o.apoliceId === apolice.id)?.numero || apolice.numero_apolice}</span>
                      </span>
                      <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#003580] flex items-center justify-center flex-shrink-0 transition-colors">
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={tipo}
                    onClick={() => temOpcoes && abrirEdicao(tipo)}
                    disabled={!temOpcoes}
                    className="flex items-center gap-3 bg-white border border-dashed border-gray-200 hover:border-[#003580] rounded-2xl px-4 py-3.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-gray-400" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-gray-900 text-sm">{label}</span>
                      <span className="block text-xs text-gray-400">{temOpcoes ? 'Adicionar atalho' : 'Nenhuma apólice disponível'}</span>
                    </span>
                    <Icon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {apolices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Nenhuma apólice encontrada</h2>
              <p className="text-gray-400 mt-2">Entre em contato com o administrador.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <span>Apólice</span>
                <span className="hidden sm:block">Vigente desde</span>
                <span className="hidden sm:block">Número da apólice</span>
                <span></span>
              </div>
              {apolices.map((ap) => (
                <ApoliceExpandableRow key={ap.id} apolice={ap} showSegmento={false} />
              ))}
            </div>
          )}
        </div>
      </ClienteSidebarLayout>

      <Dialog open={!!editandoTipo} onOpenChange={(open) => !open && setEditandoTipo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atalho de {TIPOS_ATALHO.find(t => t.tipo === editandoTipo)?.label}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Escolha a apólice que vai aparecer como atalho direto pra gestão.</p>
          <Select value={selecaoModal} onValueChange={setSelecaoModal}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma apólice" />
            </SelectTrigger>
            <SelectContent>
              {(opcoesPorTipo[editandoTipo] || []).map((op) => (
                <SelectItem key={op.apoliceId} value={String(op.apoliceId)}>
                  {op.seguradora} {op.numero ? `· ${op.numero}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoTipo(null)}>Cancelar</Button>
            <Button className="bg-[#003580] hover:bg-[#002060]" disabled={!selecaoModal} onClick={handleSalvarAtalho}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelectApoliceTestePage;
