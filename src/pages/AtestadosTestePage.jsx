import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { apolicesService } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { atestadosService } from '@/services/atestadosService';
import { ArrowLeft, Loader2, Stethoscope, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const EMPTY_FORM = { beneficiario_id: '', data_inicio: '', data_fim: '', motivo: '', observacoes: '' };

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(`${d}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const AtestadosTestePage = () => {
  const { apoliceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [apolice, setApolice] = useState(null);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [atestados, setAtestados] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(async (ap) => {
        setApolice(ap);
        const [ben, ats] = await Promise.all([
          beneficiariosService.getBeneficiariosByEmpresa(ap.empresa_id).catch(() => []),
          atestadosService.getAtestadosByApolice(apoliceId).catch(() => []),
        ]);
        setBeneficiarios(ben.filter(b => !b.data_exclusao));
        setAtestados(ats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  const handleCriar = async () => {
    if (!form.beneficiario_id || !form.data_inicio) {
      toast({ variant: 'destructive', title: 'Selecione a pessoa e a data de início.' });
      return;
    }
    setIsSaving(true);
    try {
      const created = await atestadosService.createAtestado({
        ...form,
        beneficiario_id: Number(form.beneficiario_id),
        empresa_id: apolice.empresa_id,
        apolice_id: Number(apoliceId),
        data_fim: form.data_fim || null,
      });
      setAtestados((prev) => [created, ...prev]);
      toast({ title: 'Atestado cadastrado.' });
      setIsAddOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao cadastrar', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluir = async (id) => {
    try {
      await atestadosService.deleteAtestado(id);
      setAtestados((prev) => prev.filter((a) => a.id !== id));
      toast({ title: 'Atestado removido.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Atestados - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Atestados</h1>
              <p className="text-gray-400 text-sm">Atestados vinculados a essa apólice.</p>
            </div>
            <button
              onClick={() => { setForm(EMPTY_FORM); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#003580] text-white text-sm font-semibold hover:bg-[#002060] transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Adicionar atestado
            </button>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1.4fr_40px] gap-4 px-5 py-3 bg-white text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span>Beneficiário</span>
              <span>Início</span>
              <span>Término</span>
              <span>Motivo</span>
              <span></span>
            </div>

            {atestados.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                <Stethoscope className="w-8 h-8 text-gray-300" />
                Nenhum atestado cadastrado.
              </div>
            ) : (
              atestados.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_1fr_1.4fr_40px] gap-4 items-center px-5 py-4 border-t border-gray-100 first:border-t-0">
                  <span className="font-bold text-gray-900 text-sm truncate">{a.beneficiarios?.nome_completo || '—'}</span>
                  <span className="hidden sm:block text-sm text-gray-900">{formatDate(a.data_inicio)}</span>
                  <span className="hidden sm:block text-sm text-gray-900">{formatDate(a.data_fim)}</span>
                  <span className="hidden sm:block text-sm text-gray-600 truncate">{a.motivo || '—'}</span>
                  <button onClick={() => handleExcluir(a.id)} className="justify-self-end text-gray-300 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </ClienteSidebarLayout>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white" style={{ fontFamily: "'DM Sans', sans-serif", '--background': '0 0% 100%' }}>
          <DialogHeader>
            <DialogTitle>Adicionar atestado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Beneficiário *</Label>
              <Select value={form.beneficiario_id} onValueChange={(v) => setForm((f) => ({ ...f, beneficiario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {beneficiarios.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data de Início *</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Data de Término</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Motivo</Label>
              <Input value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} placeholder="Ex: Gripe, pós-cirúrgico, CID..." />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button className="bg-[#003580] hover:bg-[#002060]" disabled={isSaving} onClick={handleCriar}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AtestadosTestePage;
