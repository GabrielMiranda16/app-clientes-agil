import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { apolicesService } from '@/services/apolicesService';
import { boletosService } from '@/services/boletosService';
import { SEGURADORAS } from '@/data/seguradoras';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2, ChevronRight, Download, ArrowRight, Users, Loader2, Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SEGMENTO_CONFIG } from './segmentoConfig';

const STATUS_STYLE = {
  green:  { chip: 'bg-emerald-50 text-emerald-700', label: 'Ativa'             },
  yellow: { chip: 'bg-amber-50 text-amber-700',     label: 'Vencendo em breve' },
  red:    { chip: 'bg-red-50 text-red-700',         label: 'Vencida'           },
  gray:   { chip: 'bg-gray-100 text-gray-500',      label: 'Sem vigência'      },
};

const TIPO_LABELS = { saude: 'Saúde', odonto: 'Odonto', vida: 'Vida' };
const normalizeTipo = (tipo) => TIPO_LABELS[tipo?.toLowerCase()] || tipo;

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const logoDaSeguradora = (nome) => SEGURADORAS.find(s => s.nome === nome)?.logo;

const formatMesReferencia = (mesRef) => {
  if (!mesRef) return '—';
  try { return format(new Date(`${mesRef}-01T00:00:00`), 'MMMM/yyyy', { locale: ptBR }); } catch { return mesRef; }
};

const Campo = ({ label, value }) => (
  !value ? null : (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
);

const ApoliceExpandableRow = ({ apolice, showSegmento = true, displayOverride }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [boletos, setBoletos] = useState(null);
  const [loadingBoletos, setLoadingBoletos] = useState(false);
  const [baixandoBoletoId, setBaixandoBoletoId] = useState(null);

  const isSVD = apolice.segmento === 'SAUDE_VIDA_ODONTO';
  const isSVDSemVigencia = isSVD && !apolice.vigencia_fim;
  const statusRaw = apolicesService.getStatusApolice(apolice.vigencia_fim);
  const status = isSVDSemVigencia ? { color: 'green', dias: undefined } : statusRaw;
  const style = STATUS_STYLE[status.color];
  const displaySeguradora = displayOverride?.seguradora || apolice.seguradora;
  const displayNumero = displayOverride?.numero || apolice.numero_apolice;
  const logo = logoDaSeguradora(displaySeguradora);
  const segLabel = displayOverride?.tipoLabel || SEGMENTO_CONFIG[apolice.segmento]?.label || apolice.segmento;
  const subs = apolice.dados_adicionais?.sub_apolices?.filter(s => s.tipo || s.numero);
  const dados = apolice.dados_adicionais || {};

  // Boletos só existem pra Saúde/Vida/Odonto — busca só quando expande, e só
  // uma vez (boletos continua null até o primeiro fetch terminar).
  useEffect(() => {
    if (!expanded || !isSVD || boletos !== null) return;
    setLoadingBoletos(true);
    boletosService.getBoletosByApolice(apolice.id)
      .then((lista) => setBoletos(lista || []))
      .catch(() => setBoletos([]))
      .finally(() => setLoadingBoletos(false));
  }, [expanded, isSVD, apolice.id, boletos]);

  const handleBaixarBoleto = (boleto) => {
    setBaixandoBoletoId(boleto.id);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    boletosService.getSignedUrl(boleto.arquivo_url).then((url) => {
      if (url && win) win.location.href = url;
      else {
        win?.close();
        toast({ variant: 'destructive', title: 'Erro ao abrir boleto.' });
      }
    }).finally(() => setBaixandoBoletoId(null));
  };

  const handleBaixarContrato = () => {
    if (!apolice.contrato_url) return;
    setBaixando(true);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    apolicesService.getContratoSignedUrl(apolice.contrato_url).then((url) => {
      if (url && win) win.location.href = url;
      else {
        win?.close();
        toast({ variant: 'destructive', title: 'Erro ao abrir contrato.' });
      }
    }).finally(() => setBaixando(false));
  };

  const handleAcessarGestao = () => {
    navigate(`/cliente/${apolice.empresa_id}`, {
      state: { from: 'apolice', apoliceId: apolice.id, segmento: apolice.segmento, segLabel, apoliceNum: apolice.numero_apolice },
    });
  };

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_40px] gap-4 items-center px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logo ? <img src={logo} alt={displaySeguradora} className="w-full h-full object-contain p-1" /> : <Building2 className="w-4 h-4 text-gray-400" />}
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-gray-900 text-sm truncate">{displaySeguradora}</span>
            {(showSegmento || displayOverride?.tipoLabel) && <span className="block text-xs text-gray-400 truncate">{segLabel}</span>}
          </span>
        </span>
        <span className="hidden sm:block text-sm text-gray-600">{formatDate(apolice.vigencia_inicio)}</span>
        <span className="hidden sm:block text-sm text-gray-600">{displayNumero || '—'}</span>
        <ChevronRight className={`w-4 h-4 text-gray-300 justify-self-end transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden bg-gray-50/60"
          >
            <div className="px-5 py-5 space-y-5">
              {/* Status + vigência */}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${style.chip}`}>
                  {isSVDSemVigencia ? 'Ativa' : style.label}
                </span>
                {isSVDSemVigencia ? (
                  <span className="text-xs text-emerald-600 font-medium">Plano contínuo</span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {formatDate(apolice.vigencia_inicio)} → {formatDate(apolice.vigencia_fim)}
                    {status.dias !== undefined && status.color !== 'green' && (
                      <span className="ml-1 font-medium" style={{ color: status.color === 'red' ? '#dc2626' : '#d97706' }}>
                        · {status.color === 'red' ? `venceu há ${Math.abs(status.dias)} dias` : `vence em ${status.dias} dias`}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Campos gerais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Campo label="Seguradora" value={displaySeguradora} />
                {!isSVD && <Campo label="Valor do Prêmio" value={apolice.valor_premio ? `R$ ${Number(apolice.valor_premio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />}
                {apolice.descricao && <Campo label="Observações" value={apolice.descricao} />}
              </div>

              {/* Sub-apólices (SVD) */}
              {subs?.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {subs.map((s, i) => (
                    <div key={i}>
                      {s.tipo && <p className="text-[11px] text-[#003580] font-bold uppercase tracking-wide">{normalizeTipo(s.tipo)}</p>}
                      <Campo label="Apólice" value={s.numero} />
                    </div>
                  ))}
                </div>
              )}

              {/* Dados específicos por segmento */}
              {apolice.segmento === 'AUTO_FROTA' && (dados.veiculos || []).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {dados.veiculos.map((v, i) => (
                    <React.Fragment key={i}>
                      <Campo label="Placa" value={v.placa} />
                      <Campo label="Veículo" value={[v.marca, v.modelo].filter(Boolean).join(' ')} />
                      <Campo label="Cor" value={v.cor} />
                      <Campo label="Ano" value={v.ano} />
                    </React.Fragment>
                  ))}
                </div>
              )}
              {apolice.segmento === 'VIAGEM' && (dados.segurados || []).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {dados.segurados.map((s, i) => <Campo key={i} label="Segurado" value={s.nome} />)}
                </div>
              )}
              {(apolice.segmento === 'RESIDENCIAL' || apolice.segmento === 'EMPRESARIAL') && dados.rua && (
                <Campo label="Endereço" value={[dados.rua, dados.numero && `nº ${dados.numero}`, dados.complemento, dados.bairro, dados.cidade && dados.estado ? `${dados.cidade}/${dados.estado}` : dados.cidade, dados.cep && `CEP ${dados.cep}`].filter(Boolean).join(', ')} />
              )}
              {apolice.segmento === 'PET_SAUDE' && dados.nome_pet && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Campo label="Nome" value={dados.nome_pet} />
                  <Campo label="Espécie" value={dados.especie} />
                  <Campo label="Raça" value={dados.raca} />
                  <Campo label="Idade" value={dados.idade} />
                </div>
              )}
              {apolice.segmento === 'EQUIPAMENTOS' && (dados.marca || dados.tipo_equipamento) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Campo label="Tipo" value={dados.tipo_equipamento} />
                  <Campo label="Marca" value={dados.marca} />
                  <Campo label="Modelo" value={dados.modelo} />
                  <Campo label="Série" value={dados.numero_serie} />
                </div>
              )}

              {/* Boletos — só Saúde/Vida/Odonto */}
              {isSVD && (
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2">
                    <Receipt className="w-3 h-3" /> Boletos
                  </p>
                  {loadingBoletos ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                  ) : boletos?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {boletos.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleBaixarBoleto(b)}
                          disabled={baixandoBoletoId === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:border-[#003580] hover:text-[#003580] transition-colors disabled:opacity-50 capitalize"
                        >
                          {baixandoBoletoId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          {formatMesReferencia(b.mes_referencia)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Nenhum boleto disponível no momento.</p>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!isSVD && (
                  apolice.contrato_url ? (
                    <button
                      onClick={handleBaixarContrato}
                      disabled={baixando}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:border-[#003580] hover:text-[#003580] transition-colors disabled:opacity-50"
                    >
                      {baixando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Baixar Contrato
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Nenhum contrato disponível. Entre em contato com o administrador.</span>
                  )
                )}
                {isSVD && (
                  <button
                    onClick={handleAcessarGestao}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:border-[#003580] hover:text-[#003580] transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" /> Acessar Gestão
                  </button>
                )}
                <button
                  onClick={() => navigate(`/apolice/${apolice.id}`)}
                  className="flex items-center gap-1.5 ml-auto px-4 py-2 rounded-full bg-[#003580] text-white text-xs font-semibold hover:bg-[#002060] transition-colors"
                >
                  Acessar apólice <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApoliceExpandableRow;
