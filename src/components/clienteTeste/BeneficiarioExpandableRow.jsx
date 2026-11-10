import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PLANOS = [
  { key: 'saude',  label: 'Saúde'  },
  { key: 'odonto', label: 'Odonto' },
  { key: 'vida',   label: 'Vida'   },
];

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(`${d}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario = hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
};

const Campo = ({ label, value }) => (
  !value ? null : (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
);

const BeneficiarioExpandableRow = ({ beneficiario: b }) => {
  const [expanded, setExpanded] = useState(false);
  const idade = calcularIdade(b.data_nascimento);

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1.6fr_1fr_1fr_1fr_40px] gap-4 items-center px-5 py-4 bg-white transition-colors text-left"
      >
        <span className="font-bold text-gray-900 text-sm truncate">{b.nome_completo}</span>
        <span className="hidden sm:block text-sm text-gray-900">{b.cpf ? formatCpfCnpj(b.cpf) : '—'}</span>
        <span className="hidden sm:block text-sm text-gray-900 capitalize">{(b.parentesco || '—').toLowerCase()}</span>
        <span className="text-sm text-gray-900">{idade !== null ? `${idade} anos` : '—'}</span>
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
            <div className="px-5 py-5 space-y-3">
              {PLANOS.map(({ key, label }) => {
                const ativo = !!b[`${key}_ativo`];
                return (
                  <div key={key} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm w-14 flex-shrink-0">{label}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        {ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {ativo && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                        <Campo label="Nome do Plano" value={b[`${key}_plano_nome`]} />
                        <Campo label="Número Carteirinha" value={b[`${key}_numero_carteirinha`]} />
                        <Campo label="Data Inclusão" value={formatDate(b[`${key}_data_inclusao`])} />
                        <Campo label="Data Exclusão" value={b[`${key}_data_exclusao`] ? formatDate(b[`${key}_data_exclusao`]) : null} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BeneficiarioExpandableRow;
