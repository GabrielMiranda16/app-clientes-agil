import React, { useState } from 'react';
import { FileText, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import AtestadoAcompanhamento from '@/components/clienteTeste/AtestadoAcompanhamento';
import { custoEstimado, diasDoAtestado, ETAPAS_AFASTAMENTO, MOTIVOS_RECUSA, STATUS_ATESTADO, TIPOS_ATESTADO } from '@/services/atestadosService';
import { avisosDoAcompanhamento, ehAfastamento, geraCusto, marcasDoAtestado } from '@/services/atestadosAnalise';

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(`${d}T00:00:00`), 'dd/MM/yyyy'); } catch { return d; }
};
const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const marcaClasse = (m) => (m === 'Risco alto' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700');
const AVISO_CLASSE = { URGENTE: 'bg-red-50 text-red-700', ATENCAO: 'bg-amber-50 text-amber-700', INFO: 'bg-blue-50 text-[#003580]' };

const AtestadoCard = ({ atestado: a, config, salarioMensal, autor, abrirAcompanhamento, onAtualizar, onDecidir, onEditar, onExcluir, onVerArquivo }) => {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [acompanhando, setAcompanhando] = useState(!!abrirAcompanhamento);

  const status = a.status || 'PENDENTE';
  const estilo = STATUS_ATESTADO[status];
  const dias = a.tipo === 'COMPARECIMENTO' ? 0 : diasDoAtestado(a);
  const marcas = marcasDoAtestado(a, config.prazo_entrega_dias);
  const tipoLabel = TIPOS_ATESTADO.find((t) => t.value === a.tipo)?.label || a.tipo;
  const motivoSalvo = MOTIVOS_RECUSA.find((m) => m.value === a.motivo_recusa);
  const etapaLabel = ETAPAS_AFASTAMENTO.find((e) => e.value === a.etapa)?.label;
  const avisos = avisosDoAcompanhamento(a);

  return (
    <div className="border border-gray-100 rounded-2xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">
            {formatDate(a.data_inicio)}{a.data_fim && a.data_fim !== a.data_inicio ? ` a ${formatDate(a.data_fim)}` : ''}
          </p>
          <p className="text-xs text-gray-500">
            {tipoLabel}
            {dias ? ` · ${dias} ${dias === 1 ? 'dia' : 'dias'}` : ''}
            {a.horas ? ` · ${Number(a.horas)} h` : ''}
            {dias && geraCusto(a) ? ` · ${formatBRL(custoEstimado(dias, salarioMensal))}` : ''}
            {a.cid ? ` · CID ${a.cid}` : ''}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {a.medico_nome || 'Profissional não informado'}{a.crm ? ` · ${a.tipo === 'ODONTOLOGICO' ? 'CRO' : 'CRM'} ${a.crm}${a.crm_uf ? `/${a.crm_uf}` : ''}` : ''}
          </p>
          {a.motivo && <p className="text-xs text-gray-500 truncate">{a.motivo}</p>}
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${estilo.classe}`}>{estilo.label}</span>
      </div>

      {marcas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {marcas.map((m) => (
            <span key={m} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${marcaClasse(m)}`}>{m}</span>
          ))}
        </div>
      )}

      {a.ia_dados?.risco?.sinais?.length > 0 && (
        <ul className="list-disc pl-4 mt-2 text-xs text-gray-500 space-y-0.5">
          {a.ia_dados.risco.sinais.map((sinal) => <li key={sinal}>{sinal}</li>)}
        </ul>
      )}

      {(etapaLabel || avisos.length > 0) && (
        <div className="mt-2 space-y-1">
          {etapaLabel && <p className="text-xs font-semibold text-gray-900">Etapa: {etapaLabel}</p>}
          {avisos.map((av) => (
            <p key={av.texto} className={`text-xs rounded-xl px-3 py-1.5 ${AVISO_CLASSE[av.nivel]}`}>{av.texto}</p>
          ))}
        </div>
      )}

      {status === 'RECUSADO' && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
          Motivo: {motivoSalvo?.label || a.motivo_recusa || 'não informado'}{a.recusa_detalhe ? ` — ${a.recusa_detalhe}` : ''}
        </p>
      )}

      {a.decidido_em && status !== 'PENDENTE' && (
        <p className="mt-2 text-[11px] text-gray-400">
          Decidido por {a.decidido_por || '—'} em {format(new Date(a.decidido_em), 'dd/MM/yyyy HH:mm')}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          {status !== 'PENDENTE' && (
            <button
              type="button"
              onClick={() => onDecidir(a, { status: 'PENDENTE', motivo_recusa: null, recusa_detalhe: null })}
              className="text-xs font-semibold text-gray-400 hover:text-[#003580] transition-colors"
            >
              Desfazer decisão
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {confirmandoExclusao ? (
            <>
              <button onClick={() => setConfirmandoExclusao(false)} className="text-xs text-gray-500 hover:text-gray-900">Cancelar</button>
              <button onClick={() => onExcluir(a)} className="text-xs font-semibold text-red-600 hover:text-red-700">Excluir de vez</button>
            </>
          ) : (
            <>
              {a.arquivo_path && (
                <button onClick={() => onVerArquivo(a)} title="Ver arquivo" className="text-gray-400 hover:text-[#003580] transition-colors">
                  <FileText className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => onEditar(a)} title="Editar" className="text-gray-400 hover:text-[#003580] transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setConfirmandoExclusao(true)} title="Excluir" className="text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {ehAfastamento(a) && status !== 'RECUSADO' && (
        <>
          <button
            type="button"
            onClick={() => setAcompanhando((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#003580] transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${acompanhando ? 'rotate-180' : ''}`} />
            {acompanhando ? 'Fechar acompanhamento' : 'Acompanhamento do afastamento'}
          </button>
          {acompanhando && <AtestadoAcompanhamento atestado={a} autor={autor} onSalvar={onAtualizar} />}
        </>
      )}
    </div>
  );
};

export default AtestadoCard;
