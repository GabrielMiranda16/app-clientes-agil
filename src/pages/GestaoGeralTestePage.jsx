import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ChevronDown, Users, FileText } from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';
import { calculateAge } from '@/lib/utils';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { apolicesService } from '@/services/apolicesService';
import { beneficiarioPlanosService } from '@/services/beneficiarioPlanosService';

const TIPOS = [
  { key: 'saude', label: 'Saúde' },
  { key: 'vida', label: 'Vida' },
  { key: 'odonto', label: 'Odonto' },
];

const subApoliceOf = (ap) => (ap.dados_adicionais?.sub_apolices || [])[0] || {};

const emptyAddBen = { nome_completo: '', cpf: '', parentesco: 'TITULAR', data_nascimento: '', empresa_id: '' };
const emptyAddAp = { empresa_id: '', tipo: 'saude', seguradora: '', plano: '', numero: '', valor_premio: '' };

const GestaoGeralTestePage = () => {
  const { matrizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [matriz, setMatriz] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [todasEmpresas, setTodasEmpresas] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [planos, setPlanos] = useState([]);

  const [filtroEmpresaBen, setFiltroEmpresaBen] = useState('todas');
  const [filtroApoliceBen, setFiltroApoliceBen] = useState('todas');
  const [filtroEmpresaApolice, setFiltroEmpresaApolice] = useState('todas');
  const [busca, setBusca] = useState('');

  const [expandedBenId, setExpandedBenId] = useState(null);
  const [vinculoForm, setVinculoForm] = useState({});
  const [isSavingVinculo, setIsSavingVinculo] = useState(false);

  const [expandedApId, setExpandedApId] = useState(null);
  const [apoliceForm, setApoliceForm] = useState({ seguradora: '', plano: '', numero: '', valor_premio: '', tipo: 'saude' });
  const [isSavingApolice, setIsSavingApolice] = useState(false);

  const [isAddBenOpen, setIsAddBenOpen] = useState(false);
  const [addBenForm, setAddBenForm] = useState(emptyAddBen);
  const [isSavingBen, setIsSavingBen] = useState(false);

  const [isAddApOpen, setIsAddApOpen] = useState(false);
  const [addApForm, setAddApForm] = useState(emptyAddAp);
  const [isSavingAp, setIsSavingAp] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const id = Number(matrizId);
      const todas = await empresasService.getEmpresas();
      const matrizData = todas.find(e => e.id === id && e.tipo === 'MATRIZ');
      if (!matrizData) {
        toast({ variant: 'destructive', title: 'Empresa não encontrada ou não é matriz.' });
        setIsLoading(false);
        return;
      }
      const filiaisData = empresasService.getFiliais(todas, id);
      const ids = empresasService.getGrupoIds(todas, id);

      setMatriz(matrizData);
      setFiliais(filiaisData);
      setTodasEmpresas(todas);

      const [apData, benData] = await Promise.all([
        apolicesService.getApolicesByMatriz(id),
        beneficiariosService.getAllBeneficiarios(),
      ]);
      const apSVD = apData.filter(a => a.segmento === 'SAUDE_VIDA_ODONTO');
      const benGrupo = benData.filter(b => ids.includes(Number(b.empresa_id)) && !b.data_exclusao);
      setApolices(apSVD);
      setBeneficiarios(benGrupo);

      const planosData = await beneficiarioPlanosService.getByBeneficiarioIds(benGrupo.map(b => b.id));
      setPlanos(planosData);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (matrizId) load(); }, [matrizId]);

  const empresaLabel = (empresaId) => {
    const e = todasEmpresas.find(x => x.id === Number(empresaId));
    if (!e) return '—';
    return e.nome_fantasia || e.razao_social || `Empresa ${empresaId}`;
  };

  const apoliceLabel = (ap) => {
    const sub = subApoliceOf(ap);
    return [sub.seguradora, sub.plano].filter(Boolean).join(' · ') || `Apólice ${ap.id}`;
  };

  const planosDoBeneficiario = (benId) => planos.filter(p => p.beneficiario_id === benId);

  const beneficiariosFiltrados = useMemo(() => {
    return beneficiarios.filter(b => {
      if (filtroEmpresaBen !== 'todas' && Number(b.empresa_id) !== Number(filtroEmpresaBen)) return false;
      if (filtroApoliceBen !== 'todas') {
        const vinculado = planos.some(p => p.beneficiario_id === b.id && Number(p.apolice_id) === Number(filtroApoliceBen));
        if (!vinculado) return false;
      }
      if (busca && !(b.nome_completo || '').toLowerCase().includes(busca.toLowerCase()) && !(b.cpf || '').includes(busca)) return false;
      return true;
    });
  }, [beneficiarios, planos, filtroEmpresaBen, filtroApoliceBen, busca]);

  const apolicesFiltradas = useMemo(() => {
    return apolices.filter(a => filtroEmpresaApolice === 'todas' || Number(a.empresa_id) === Number(filtroEmpresaApolice));
  }, [apolices, filtroEmpresaApolice]);

  const contagemBeneficiariosApolice = (apoliceId) =>
    new Set(planos.filter(p => Number(p.apolice_id) === Number(apoliceId)).map(p => p.beneficiario_id)).size;

  const empresaOptions = (
    <>
      <SelectItem value={String(matriz?.id)}>{matriz?.nome_fantasia || matriz?.razao_social} (Matriz)</SelectItem>
      {filiais.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome_fantasia || f.razao_social}</SelectItem>)}
    </>
  );

  // ---------- Beneficiário: expandir + gerenciar vínculos ----------
  const toggleExpandBen = (b) => {
    if (expandedBenId === b.id) { setExpandedBenId(null); return; }
    setExpandedBenId(b.id);
    const form = {};
    TIPOS.forEach(({ key }) => {
      const vinculo = planos.find(p => p.beneficiario_id === b.id && p.tipo === key);
      form[key] = {
        ativo: !!vinculo,
        apolice_id: vinculo ? String(vinculo.apolice_id) : '',
        numero_carteirinha: vinculo?.numero_carteirinha || '',
        data_inclusao: vinculo?.data_inclusao || '',
      };
    });
    setVinculoForm(form);
  };

  const salvarVinculos = async (beneficiarioId) => {
    for (const { key, label } of TIPOS) {
      const f = vinculoForm[key];
      if (f.ativo && !f.apolice_id) {
        toast({ variant: 'destructive', title: `Selecione a apólice de ${label}.` });
        return;
      }
    }
    setIsSavingVinculo(true);
    try {
      for (const { key } of TIPOS) {
        const f = vinculoForm[key];
        await beneficiarioPlanosService.syncPlano(beneficiarioId, key, {
          ativo: f.ativo,
          apoliceId: f.apolice_id ? Number(f.apolice_id) : null,
          numero_carteirinha: f.numero_carteirinha || null,
          data_inclusao: f.data_inclusao || null,
        });
      }
      toast({ title: 'Vínculos atualizados.' });
      setExpandedBenId(null);
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar vínculos', description: err.message });
    } finally {
      setIsSavingVinculo(false);
    }
  };

  // ---------- Apólice: expandir + editar ----------
  const toggleExpandAp = (ap) => {
    if (expandedApId === ap.id) { setExpandedApId(null); return; }
    setExpandedApId(ap.id);
    const sub = subApoliceOf(ap);
    setApoliceForm({
      tipo: sub.tipo || 'saude',
      seguradora: sub.seguradora || '',
      plano: sub.plano || '',
      numero: sub.numero || '',
      valor_premio: sub.valor_premio || '',
    });
  };

  const salvarApolice = async (ap) => {
    setIsSavingApolice(true);
    try {
      const novoSub = { tipo: apoliceForm.tipo, seguradora: apoliceForm.seguradora, plano: apoliceForm.plano, numero: apoliceForm.numero, valor_premio: apoliceForm.valor_premio };
      const dadosAtuais = ap.dados_adicionais || {};
      const subs = [...(dadosAtuais.sub_apolices || [])];
      if (subs.length > 0) subs[0] = { ...subs[0], ...novoSub };
      else subs.push(novoSub);
      const updated = await apolicesService.updateApolice(ap.id, { dados_adicionais: { ...dadosAtuais, sub_apolices: subs } });
      setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast({ title: 'Apólice atualizada.' });
      setExpandedApId(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar apólice', description: err.message });
    } finally {
      setIsSavingApolice(false);
    }
  };

  // ---------- Adicionar beneficiário ----------
  const salvarNovoBeneficiario = async () => {
    if (!addBenForm.nome_completo || !addBenForm.cpf || !addBenForm.empresa_id) {
      toast({ variant: 'destructive', title: 'Preencha nome, CPF e empresa.' });
      return;
    }
    const cpfLimpo = addBenForm.cpf.replace(/\D/g, '');
    if (beneficiarios.some(b => (b.cpf || '').replace(/\D/g, '') === cpfLimpo)) {
      toast({ variant: 'destructive', title: 'CPF já cadastrado nesse grupo.' });
      return;
    }
    setIsSavingBen(true);
    try {
      const created = await beneficiariosService.createBeneficiario({ ...addBenForm, empresa_id: Number(addBenForm.empresa_id) });
      setBeneficiarios(prev => [...prev, created]);
      toast({ title: 'Beneficiário adicionado.' });
      setIsAddBenOpen(false);
      setAddBenForm(emptyAddBen);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar beneficiário', description: err.message });
    } finally {
      setIsSavingBen(false);
    }
  };

  // ---------- Adicionar apólice ----------
  const salvarNovaApolice = async () => {
    if (!addApForm.empresa_id || !addApForm.seguradora) {
      toast({ variant: 'destructive', title: 'Selecione a empresa e informe a seguradora.' });
      return;
    }
    setIsSavingAp(true);
    try {
      const payload = {
        empresa_id: Number(addApForm.empresa_id),
        segmento: 'SAUDE_VIDA_ODONTO',
        ativo: true,
        numero_apolice: '',
        seguradora: '',
        dados_adicionais: {
          sub_apolices: [{ tipo: addApForm.tipo, seguradora: addApForm.seguradora, plano: addApForm.plano, numero: addApForm.numero, valor_premio: addApForm.valor_premio }],
        },
      };
      const created = await apolicesService.createApolice(payload);
      setApolices(prev => [created, ...prev]);
      toast({ title: 'Apólice adicionada.' });
      setIsAddApOpen(false);
      setAddApForm(emptyAddAp);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar apólice', description: err.message });
    } finally {
      setIsSavingAp(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
      </DashboardLayout>
    );
  }

  if (!matriz) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-white">Empresa não encontrada — confira se o link tem o ID certo de uma matriz.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 mb-1">🧪 Página de teste — não está no menu</Badge>
            <h1 className="text-2xl font-bold text-white">{matriz.nome_fantasia || matriz.razao_social} — Gestão Geral</h1>
          </div>
          <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 rounded-lg" onClick={() => navigate(`/admin/cliente/${matriz.id}`)}>Voltar pra empresa</Button>
        </div>

        <Tabs defaultValue="beneficiarios" className="space-y-4">
          <TabsList className="bg-white/10 w-full h-auto p-1 gap-1 grid grid-cols-2">
            <TabsTrigger value="beneficiarios" className="text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              <Users className="h-4 w-4 mr-1.5" /> Beneficiários <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full data-[state=active]:bg-[#003580]/10 data-[state=active]:text-[#003580]">{beneficiarios.length}</span>
            </TabsTrigger>
            <TabsTrigger value="apolices" className="text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              <FileText className="h-4 w-4 mr-1.5" /> Apólices <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full data-[state=active]:bg-[#003580]/10 data-[state=active]:text-[#003580]">{apolices.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiarios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Beneficiários</CardTitle>
                <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => { setAddBenForm({ ...emptyAddBen, empresa_id: String(matriz.id) }); setIsAddBenOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="Buscar nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
                  <Select value={filtroEmpresaBen} onValueChange={setFiltroEmpresaBen}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Empresa (CNPJ)" /></SelectTrigger>
                    <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem>{empresaOptions}</SelectContent>
                  </Select>
                  <Select value={filtroApoliceBen} onValueChange={setFiltroApoliceBen}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Apólice" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as apólices</SelectItem>
                      {apolices.map(a => <SelectItem key={a.id} value={String(a.id)}>{apoliceLabel(a)} — {empresaLabel(a.empresa_id)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {beneficiariosFiltrados.map(b => {
                    const open = expandedBenId === b.id;
                    const idade = calculateAge(b.data_nascimento);
                    return (
                      <div key={b.id} className="border rounded-lg overflow-hidden bg-white">
                        <button type="button" onClick={() => toggleExpandBen(b)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50">
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-sm min-w-0">
                            <span className="font-medium text-gray-800 truncate">{b.nome_completo}</span>
                            <span className="text-gray-500">{formatCpfCnpj(b.cpf)}</span>
                            <span className="text-gray-500 capitalize">{(b.parentesco || '—').toLowerCase()}</span>
                            <span className="text-gray-500">{idade !== '' ? `${idade} anos` : '—'}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                          <div className="p-3 border-t bg-gray-50 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{empresaLabel(b.empresa_id)}</Badge>
                              {planosDoBeneficiario(b.id).length === 0 && <span className="text-xs text-gray-400">nenhuma apólice vinculada ainda</span>}
                              {planosDoBeneficiario(b.id).map(p => {
                                const ap = apolices.find(a => a.id === p.apolice_id);
                                return (
                                  <Badge key={p.id} className="bg-[#003580]/10 text-[#003580] hover:bg-[#003580]/10">
                                    {p.tipo} · {ap ? apoliceLabel(ap) : `#${p.apolice_id}`}
                                  </Badge>
                                );
                              })}
                            </div>

                            <div className="space-y-3">
                              {TIPOS.map(({ key, label }) => {
                                const f = vinculoForm[key] || {};
                                const apolicesDoTipo = apolices.filter(a => subApoliceOf(a).tipo === key);
                                return (
                                  <div key={key} className="border rounded-lg p-3 space-y-2 bg-white">
                                    <div className="flex items-center justify-between">
                                      <Label className="font-semibold text-sm">{label}</Label>
                                      <Button
                                        type="button" size="sm"
                                        variant={f.ativo ? 'default' : 'outline'}
                                        className={f.ativo ? 'bg-[#003580] hover:bg-[#002060]' : ''}
                                        onClick={() => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], ativo: !prev[key]?.ativo } }))}
                                      >
                                        {f.ativo ? 'Ativo' : 'Inativo'}
                                      </Button>
                                    </div>
                                    {f.ativo && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="sm:col-span-2">
                                          <Label className="text-xs">Apólice (de qualquer empresa do grupo)</Label>
                                          <Select value={f.apolice_id} onValueChange={(v) => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], apolice_id: v } }))}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                              {apolicesDoTipo.map(a => <SelectItem key={a.id} value={String(a.id)}>{apoliceLabel(a)} — {empresaLabel(a.empresa_id)}</SelectItem>)}
                                              {apolicesDoTipo.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Nenhuma apólice de {label.toLowerCase()} nesse grupo ainda</div>}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label className="text-xs">Número carteirinha</Label>
                                          <Input value={f.numero_carteirinha} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], numero_carteirinha: e.target.value } }))} />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Data inclusão</Label>
                                          <Input type="date" value={f.data_inclusao} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], data_inclusao: e.target.value } }))} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setExpandedBenId(null)}>Cancelar</Button>
                              <Button size="sm" onClick={() => salvarVinculos(b.id)} disabled={isSavingVinculo} className="bg-[#003580] hover:bg-[#002060] text-white">
                                {isSavingVinculo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar vínculos
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {beneficiariosFiltrados.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum beneficiário com esse filtro.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apolices">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Apólices</CardTitle>
                <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => { setAddApForm({ ...emptyAddAp, empresa_id: String(matriz.id) }); setIsAddApOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={filtroEmpresaApolice} onValueChange={setFiltroEmpresaApolice}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Empresa (CNPJ)" /></SelectTrigger>
                  <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem>{empresaOptions}</SelectContent>
                </Select>

                <div className="space-y-2">
                  {apolicesFiltradas.map(a => {
                    const sub = subApoliceOf(a);
                    const open = expandedApId === a.id;
                    return (
                      <div key={a.id} className="border rounded-lg overflow-hidden bg-white">
                        <button type="button" onClick={() => toggleExpandAp(a)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50">
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-sm min-w-0">
                            <span className="text-gray-500 capitalize">{sub.tipo || '—'}</span>
                            <span className="font-medium text-gray-800 truncate">{sub.seguradora || '—'}</span>
                            <span className="text-gray-500 truncate">{sub.plano || '—'}</span>
                            <span className="text-gray-500">{contagemBeneficiariosApolice(a.id)} beneficiário{contagemBeneficiariosApolice(a.id) !== 1 ? 's' : ''}</span>
                          </div>
                          <Badge variant="outline" className="shrink-0 hidden sm:inline-flex">{empresaLabel(a.empresa_id)}</Badge>
                          <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                          <div className="p-3 border-t bg-gray-50 space-y-3">
                            <Badge variant="outline" className="sm:hidden">{empresaLabel(a.empresa_id)}</Badge>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Tipo</Label>
                                <Select value={apoliceForm.tipo} onValueChange={(v) => setApoliceForm(prev => ({ ...prev, tipo: v }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="saude">Saúde</SelectItem>
                                    <SelectItem value="vida">Vida</SelectItem>
                                    <SelectItem value="odonto">Odonto</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div><Label className="text-xs">Número</Label><Input value={apoliceForm.numero} onChange={e => setApoliceForm(prev => ({ ...prev, numero: e.target.value }))} /></div>
                              <div><Label className="text-xs">Seguradora</Label><Input value={apoliceForm.seguradora} onChange={e => setApoliceForm(prev => ({ ...prev, seguradora: e.target.value }))} placeholder="Ex: SulAmérica" /></div>
                              <div><Label className="text-xs">Plano</Label><Input value={apoliceForm.plano} onChange={e => setApoliceForm(prev => ({ ...prev, plano: e.target.value }))} placeholder="Ex: Direto Nacional" /></div>
                              <div><Label className="text-xs">Valor prêmio</Label><Input value={apoliceForm.valor_premio} onChange={e => setApoliceForm(prev => ({ ...prev, valor_premio: e.target.value }))} /></div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setExpandedApId(null)}>Cancelar</Button>
                              <Button size="sm" onClick={() => salvarApolice(a)} disabled={isSavingApolice} className="bg-[#003580] hover:bg-[#002060] text-white">
                                {isSavingApolice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {apolicesFiltradas.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma apólice com esse filtro.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: adicionar beneficiário */}
      <Dialog open={isAddBenOpen} onOpenChange={setIsAddBenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar beneficiário</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nome completo</Label><Input value={addBenForm.nome_completo} onChange={e => setAddBenForm(prev => ({ ...prev, nome_completo: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={addBenForm.cpf} onChange={e => setAddBenForm(prev => ({ ...prev, cpf: e.target.value }))} /></div>
            <div>
              <Label>Parentesco</Label>
              <Select value={addBenForm.parentesco} onValueChange={(v) => setAddBenForm(prev => ({ ...prev, parentesco: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TITULAR">Titular</SelectItem>
                  <SelectItem value="CONJUGE">Cônjuge</SelectItem>
                  <SelectItem value="FILHO">Filho(a)</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data de nascimento</Label><Input type="date" value={addBenForm.data_nascimento} onChange={e => setAddBenForm(prev => ({ ...prev, data_nascimento: e.target.value }))} /></div>
            <div>
              <Label>Empresa</Label>
              <Select value={addBenForm.empresa_id} onValueChange={(v) => setAddBenForm(prev => ({ ...prev, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{empresaOptions}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBenOpen(false)}>Cancelar</Button>
            <Button onClick={salvarNovoBeneficiario} disabled={isSavingBen} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingBen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: adicionar apólice */}
      <Dialog open={isAddApOpen} onOpenChange={setIsAddApOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar apólice</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Empresa</Label>
              <Select value={addApForm.empresa_id} onValueChange={(v) => setAddApForm(prev => ({ ...prev, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{empresaOptions}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={addApForm.tipo} onValueChange={(v) => setAddApForm(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="saude">Saúde</SelectItem>
                  <SelectItem value="vida">Vida</SelectItem>
                  <SelectItem value="odonto">Odonto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Seguradora</Label><Input value={addApForm.seguradora} onChange={e => setAddApForm(prev => ({ ...prev, seguradora: e.target.value }))} placeholder="Ex: SulAmérica" /></div>
            <div><Label>Plano</Label><Input value={addApForm.plano} onChange={e => setAddApForm(prev => ({ ...prev, plano: e.target.value }))} placeholder="Ex: Direto Nacional" /></div>
            <div><Label>Número</Label><Input value={addApForm.numero} onChange={e => setAddApForm(prev => ({ ...prev, numero: e.target.value }))} /></div>
            <div><Label>Valor prêmio</Label><Input value={addApForm.valor_premio} onChange={e => setAddApForm(prev => ({ ...prev, valor_premio: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddApOpen(false)}>Cancelar</Button>
            <Button onClick={salvarNovaApolice} disabled={isSavingAp} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingAp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GestaoGeralTestePage;
