import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { atestadosService, ETAPAS_AFASTAMENTO, RESULTADOS_EXAME } from '@/services/atestadosService';
import { useToast } from '@/components/ui/use-toast';

const paraCampoDataHora = (iso) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '');

const formDe = (a) => ({
  etapa: a.etapa || 'NENHUMA',
  inss_encaminhado_em: a.inss_encaminhado_em || '',
  pericia_data: a.pericia_data || '',
  beneficio_numero: a.beneficio_numero || '',
  beneficio_inicio: a.beneficio_inicio || '',
  beneficio_fim: a.beneficio_fim || '',
  retorno_previsto: a.retorno_previsto || '',
  retorno_efetivo: a.retorno_efetivo || '',
  exame_retorno_data: paraCampoDataHora(a.exame_retorno_data),
  exame_retorno_local: a.exame_retorno_local || '',
  exame_retorno_medico: a.exame_retorno_medico || '',
  exame_retorno_resultado: a.exame_retorno_resultado || 'PENDENTE',
});

const AtestadoAcompanhamento = ({ atestado: a, autor, onSalvar }) => {
  const { toast } = useToast();
  const [form, setForm] = useState(formDe(a));
  const [salvando, setSalvando] = useState(false);
  const [anotacoes, setAnotacoes] = useState(null);
  const [nota, setNota] = useState('');

  useEffect(() => { setForm(formDe(a)); }, [a]);

  useEffect(() => {
    atestadosService.getAnotacoes(a.id).then(setAnotacoes).catch(() => setAnotacoes([]));
  }, [a.id]);

  const campo = (chave) => ({
    value: form[chave],
    onChange: (e) => setForm((f) => ({ ...f, [chave]: e.target.value })),
  });

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(a, {
        etapa: form.etapa === 'NENHUMA' ? null : form.etapa,
        inss_encaminhado_em: form.inss_encaminhado_em || null,
        pericia_data: form.pericia_data || null,
        beneficio_numero: form.beneficio_numero.trim() || null,
        beneficio_inicio: form.beneficio_inicio || null,
        beneficio_fim: form.beneficio_fim || null,
        retorno_previsto: form.retorno_previsto || null,
        retorno_efetivo: form.retorno_efetivo || null,
        exame_retorno_data: form.exame_retorno_data ? new Date(form.exame_retorno_data).toISOString() : null,
        exame_retorno_local: form.exame_retorno_local.trim() || null,
        exame_retorno_medico: form.exame_retorno_medico.trim() || null,
        exame_retorno_resultado: form.exame_retorno_resultado === 'PENDENTE' ? null : form.exame_retorno_resultado,
      });
      toast({ title: 'Acompanhamento salvo.' });
    } finally {
      setSalvando(false);
    }
  };

  const adicionarNota = async () => {
    if (!nota.trim()) return;
    try {
      const criada = await atestadosService.addAnotacao({ atestado_id: a.id, empresa_id: a.empresa_id, texto: nota.trim(), autor });
      setAnotacoes((prev) => [criada, ...(prev || [])]);
      setNota('');
    } catch (err) {
      toast({ variant: 'destructive', title: err.message });
    }
  };

  const removerNota = async (id) => {
    try {
      await atestadosService.deleteAnotacao(id);
      setAnotacoes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast({ variant: 'destructive', title: err.message });
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div>
        <Label className="text-xs">Etapa do afastamento</Label>
        <Select value={form.etapa} onValueChange={(v) => setForm((f) => ({ ...f, etapa: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NENHUMA">Sem acompanhamento</SelectItem>
            {ETAPAS_AFASTAMENTO.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#003580]">INSS</p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Encaminhado em</Label><Input type="date" {...campo('inss_encaminhado_em')} /></div>
        <div><Label className="text-xs">Data da perícia</Label><Input type="date" {...campo('pericia_data')} /></div>
        <div><Label className="text-xs">Início do benefício</Label><Input type="date" {...campo('beneficio_inicio')} /></div>
        <div><Label className="text-xs">Fim do benefício</Label><Input type="date" {...campo('beneficio_fim')} /></div>
      </div>
      <div><Label className="text-xs">Número do benefício</Label><Input {...campo('beneficio_numero')} /></div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#003580]">Retorno</p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Retorno previsto</Label><Input type="date" {...campo('retorno_previsto')} /></div>
        <div><Label className="text-xs">Retornou em</Label><Input type="date" {...campo('retorno_efetivo')} /></div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#003580]">Exame de retorno</p>
      <div><Label className="text-xs">Data e hora marcadas</Label><Input type="datetime-local" {...campo('exame_retorno_data')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Clínica ou local</Label><Input {...campo('exame_retorno_local')} /></div>
        <div><Label className="text-xs">Médico</Label><Input {...campo('exame_retorno_medico')} /></div>
      </div>
      <div>
        <Label className="text-xs">Resultado</Label>
        <Select value={form.exame_retorno_resultado} onValueChange={(v) => setForm((f) => ({ ...f, exame_retorno_resultado: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDENTE">Ainda não realizado</SelectItem>
            {RESULTADOS_EXAME.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" disabled={salvando} onClick={salvar}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar acompanhamento
        </Button>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#003580]">Anotações de contato</p>
      <div className="flex gap-2">
        <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex: liguei, segue em tratamento" onKeyDown={(e) => e.key === 'Enter' && adicionarNota()} />
        <Button size="sm" variant="outline" onClick={adicionarNota} disabled={!nota.trim()}>Anotar</Button>
      </div>
      {anotacoes === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : anotacoes.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhuma anotação.</p>
      ) : (
        <div className="space-y-2">
          {anotacoes.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="text-gray-900">{n.texto}</p>
                <p className="text-gray-400">{n.autor || '—'} · {format(new Date(n.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <button onClick={() => removerNota(n.id)} title="Excluir anotação" className="text-gray-300 hover:text-red-600 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AtestadoAcompanhamento;
