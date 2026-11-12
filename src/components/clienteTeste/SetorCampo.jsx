import React, { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const SETORES_PADRAO = [
  'Administrativo', 'Almoxarifado', 'Atendimento', 'Comercial', 'Compras', 'Contabilidade', 'Cozinha', 'Diretoria',
  'Engenharia', 'Estoque', 'Expedição', 'Financeiro', 'Jurídico', 'Limpeza', 'Logística', 'Loja', 'Manutenção',
  'Marketing', 'Obras', 'Operacional', 'Portaria', 'Produção', 'Qualidade', 'Recepção', 'Recursos Humanos',
  'Segurança', 'Suporte', 'Tecnologia (TI)', 'Transporte', 'Vendas',
];

const OUTRO = '__OUTRO__';
const VAZIO = '__VAZIO__';

const SetorCampo = ({ value, onChange, existentes = [], className = '' }) => {
  const opcoes = [...new Set([...SETORES_PADRAO, ...existentes.filter(Boolean)])].sort((a, b) => a.localeCompare(b));
  const [digitando, setDigitando] = useState(!!value && !opcoes.includes(value));
  const estilo = `w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-[#003580] ${className}`;

  if (digitando) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite o nome do setor"
          className={estilo}
        />
        <button type="button" onClick={() => { setDigitando(false); onChange(''); }} className="text-xs font-semibold text-gray-400 hover:text-[#003580] flex-shrink-0">
          Ver lista
        </button>
      </div>
    );
  }

  return (
    <Select
      value={value || VAZIO}
      onValueChange={(v) => {
        if (v === OUTRO) { setDigitando(true); onChange(''); } else onChange(v === VAZIO ? '' : v);
      }}
    >
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-[336px] bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <SelectItem value={VAZIO}>Não informado</SelectItem>
        {opcoes.map((nome) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}
        <SelectItem value={OUTRO}>Outro (digitar)</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default SetorCampo;
