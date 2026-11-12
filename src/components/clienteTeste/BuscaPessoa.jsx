import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';

const semAcento = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const soDigitos = (s) => (s || '').replace(/\D/g, '');

const BuscaPessoa = ({ pessoas, value, onChange }) => {
  const [termo, setTermo] = useState('');
  const escolhida = pessoas.find((p) => String(p.id) === String(value)) || null;

  const resultados = useMemo(() => {
    const texto = semAcento(termo);
    const digitos = soDigitos(termo);
    if (!texto) return [];
    return pessoas.filter((p) => {
      if (digitos.length >= 3 && soDigitos(p.cpf).includes(digitos)) return true;
      if (/[a-z]/.test(texto) && semAcento(p.nome_completo).includes(texto)) return true;
      return !!p.matricula_empresa && semAcento(p.matricula_empresa).includes(texto);
    }).slice(0, 50);
  }, [pessoas, termo]);

  if (escolhida) {
    return (
      <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-md px-3 py-2">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900 truncate">{escolhida.nome_completo}</span>
          <span className="block text-xs text-gray-400">
            CPF {escolhida.cpf ? formatCpfCnpj(escolhida.cpf) : '—'}
            {escolhida.matricula_empresa ? ` · Matrícula ${escolhida.matricula_empresa}` : ''}
            {escolhida.setor ? ` · ${escolhida.setor}` : ''}
          </span>
        </span>
        <button type="button" onClick={() => { onChange(''); setTermo(''); }} title="Trocar pessoa" className="text-gray-400 hover:text-[#003580] flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Digite o CPF, o nome ou a matrícula"
          className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-[#003580]"
        />
      </div>
      {termo.trim() && (
        <div className="mt-1 border border-gray-200 rounded-md max-h-[280px] overflow-y-auto">
          {resultados.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">Ninguém encontrado.</p>
          ) : (
            resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(String(p.id)); setTermo(''); }}
                className="w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <span className="block text-sm font-semibold text-gray-900 truncate">{p.nome_completo}</span>
                <span className="block text-xs text-gray-400">
                  CPF {p.cpf ? formatCpfCnpj(p.cpf) : '—'}{p.matricula_empresa ? ` · Matrícula ${p.matricula_empresa}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BuscaPessoa;
