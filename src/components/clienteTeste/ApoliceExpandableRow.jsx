import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { apolicesService } from '@/services/apolicesService';
import { boletosService } from '@/services/boletosService';
import { SEGURADORAS } from '@/data/seguradoras';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2, ChevronRight, Download, Users, Loader2, Receipt,
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
  // Saúde, Vida e Odonto são planos contínuos — nunca têm data de término.
  const isSVDSemVigencia = isSVD;
  const statusRaw = apolicesService.getStatusApolice(apolice.vigencia_fim);
  const status = isSVDSemVigencia ? { color: 'green', dias: undefined } : statusRaw;
  const style = STATUS_STYLE[status.color];
  const displaySeguradora = displayOverride?.seguradora || apolice.seguradora;
  const displayNumero = displayOverride?.numero || apolice.numero_apolice;
  const logo = logoDaSeguradora(displaySeguradora);
  const segLabel = displayOverride?.tipoLabel || SEGMENTO_CONFIG[apolice.segmento]?.label || apolice.segmento;
  const subs = apolice.dados_adicionais?.sub_apolices?.filter(s => s.tipo || s.numero);
  const dados = apolice.dados_adicionais || {};
  const premio = displayOverride ? displayOverride.valorPremio : apolice.valor_premio;
  const contratoUrl = displayOverride ? displayOverride.contratoUrl : apolice.contrato_url;
  // Quando a linha já representa uma sub-apólice específica (displayOverride) ou
  // o segmento não é SVD, trata como uma única apólice (1 número/seguradora/prêmio).
  // Só mostra o detalhamento por sub-tipo quando a linha representa o registro
  // combinado inteiro (ex: lista "Apólices" da home, sem flatten).
  const subsParaDetalhar = !displayOverride && isSVD ? subs : null;
  const formatMoney = (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null;
  // Apólice pode ser da matriz ou de uma filial do grupo — deixa isso visível em toda
  // linha. Matriz é única, então o rótulo é só "Matriz" (em negrito); filial mostra o
  // próprio nome (sem negrito) pra diferenciar qual delas é.
  const empresaIsMatriz = apolice.empresa?.tipo === 'MATRIZ';
  const empresaLabel = apolice.empresa
    ? (empresaIsMatriz ? 'Matriz' : (apolice.empresa.nome_fantasia || apolice.empresa.razao_social))
    : null;
  const segOuTipoLabel = (showSegmento || displayOverride?.tipoLabel) ? segLabel : null;

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

  const handleBaixarContrato = (url = contratoUrl) => {
    if (!url) return;
    setBaixando(true);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    apolicesService.getContratoSignedUrl(url).then((signedUrl) => {
      if (signedUrl && win) win.location.href = signedUrl;
      else {
        win?.close();
        toast({ variant: 'destructive', title: 'Erro ao abrir contrato.' });
      }
    }).finally(() => setBaixando(false));
  };

  const handleAcessarGestao = () => {
    navigate(`/gestao-apolice/${apolice.id}/teste`);
  };

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_40px] gap-4 items-center px-5 py-4 bg-white transition-colors text-left"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logo ? <img src={logo} alt={displaySeguradora} className="w-full h-full object-contain p-1" /> : <Building2 className="w-4 h-4 text-gray-400" />}
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-gray-900 text-sm truncate">{displaySeguradora}</span>
            {(segOuTipoLabel || empresaLabel) && (
              <span className="block text-xs text-gray-400 truncate">
                {segOuTipoLabel}
                {segOuTipoLabel && empresaLabel && ' · '}
                {empresaLabel && <span className={empresaIsMatriz ? 'font-bold text-gray-500' : ''}>{empresaLabel}</span>}
              </span>
            )}
          </span>
        </span>
        <span className="hidden sm:block text-sm text-gray-600">{formatDate(apolice.vigencia_inicio)}</span>
        <span className="hidden sm:block text-sm text-gray-600">{displayNumero || '—'}</span>
        <ChevronRight className={`w-4 h-4 text-gray-900 justify-self-end transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden bg-white"
          >
            <div className="px-5 py-5 space-y-5">
              {/* Status, Segmento, Número, Seguradora */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Status</p>
                  <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${style.chip}`}>
                    {isSVDSemVigencia ? 'Ativa' : style.label}
                  </span>
                </div>
                <Campo label="Segmento" value={segLabel} />
                {empresaLabel && (
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Empresa</p>
                    <p className={`text-sm text-gray-800 ${empresaIsMatriz ? 'font-bold' : 'font-semibold'}`}>{empresaLabel}</p>
                  </div>
                )}
                {(!isSVD || displayOverride) && (
                  <>
                    <Campo label="Número da Apólice" value={displayNumero} />
                    <Campo label="Seguradora" value={displaySeguradora} />
                  </>
                )}
                {(!isSVD || displayOverride) && <Campo label="Prêmio" value={formatMoney(premio)} />}
              </div>

              {/* Detalhamento por sub-tipo — só quando a linha representa o registro combinado inteiro */}
              {subsParaDetalhar?.length > 0 && (
                <div className="space-y-2">
                  {subsParaDetalhar.map((s, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                      <Campo label="Tipo" value={normalizeTipo(s.tipo)} />
                      <Campo label="Número da Apólice" value={s.numero} />
                      <Campo label="Seguradora" value={s.seguradora} />
                      <Campo label="Prêmio" value={formatMoney(s.valor_premio)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Vigência / Data de Inclusão */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Campo label={isSVDSemVigencia ? 'Data de Inclusão do Plano' : 'Início'} value={formatDate(apolice.vigencia_inicio)} />
                <Campo label="Término" value={isSVDSemVigencia ? 'Plano contínuo' : formatDate(apolice.vigencia_fim)} />
                {status.dias !== undefined && !isSVDSemVigencia && (
                  <Campo label="Dias restantes" value={status.color === 'red' ? `Vencida há ${Math.abs(status.dias)} dias` : `${status.dias} dias`} />
                )}
              </div>

              {apolice.descricao && <Campo label="Observações" value={apolice.descricao} />}

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

              {/* Contratos */}
              {subsParaDetalhar?.length > 0 ? (
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Contratos</p>
                  <div className="space-y-2">
                    {subsParaDetalhar.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{normalizeTipo(s.tipo) || `Apólice ${i + 1}`}</p>
                          {s.seguradora && <p className="text-xs text-gray-500">{s.seguradora}</p>}
                          {s.numero && <p className="text-xs text-gray-400">Nº {s.numero}</p>}
                        </div>
                        {s.contrato_url ? (
                          <button
                            onClick={() => handleBaixarContrato(s.contrato_url)}
                            disabled={baixando}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 bg-white hover:text-[#003580] transition-colors disabled:opacity-50"
                          >
                            {baixando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Sem contrato</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Contrato</p>
                  {contratoUrl ? (
                    <button
                      onClick={() => handleBaixarContrato()}
                      disabled={baixando}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-gray-700 bg-white hover:text-[#003580] transition-colors disabled:opacity-50"
                    >
                      {baixando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Baixar Contrato
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400">Nenhum contrato disponível. Entre em contato com o administrador.</p>
                  )}
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 bg-white hover:text-[#003580] transition-colors disabled:opacity-50 capitalize"
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
                {isSVD && (
                  <button
                    onClick={handleAcessarGestao}
                    className="flex items-center gap-1.5 ml-auto px-4 py-2 rounded-full text-xs font-semibold text-gray-900 bg-white hover:text-[#003580] transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" /> Acessar Gestão
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApoliceExpandableRow;
