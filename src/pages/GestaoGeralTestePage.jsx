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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit } from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';

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

  const [benSelecionado, setBenSelecionado] = useState(null);
  const [vinculoForm, setVinculoForm] = useState({});
  const [isSavingVinculo, setIsSavingVinculo] = useState(false);

  const [apoliceEditando, setApoliceEditando] = useState(null);
  const [apoliceForm, setApoliceForm] = useState({ seguradora: '', plano: '', numero: '', valor_premio: '', tipo: 'saude' });
  const [isSavingApolice, setIsSavingApolice] = useState(false);

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

  const abrirVinculos = (b) => {
    setBenSelecionado(b);
    const form = {};
    TIPOS.forEach(({ key }) => {
      const vinculo = planos.find(p => p.beneficiario_id === b.id && p.tipo === key);
      form[key] = {
        ativo: !!vinculo,
        apolice_id: vinculo ? String(vinculo.apolice_id) : '',
        numero_carteirinha: vinculo?.numero_carteirinha || '',
        valor_fatura: vinculo?.valor_fatura || '',
        data_inclusao: vinculo?.data_inclusao || '',
      };
    });
    setVinculoForm(form);
  };

  const salvarVinculos = async () => {
    if (!benSelecionado) return;
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
        await beneficiarioPlanosService.syncPlano(benSelecionado.id, key, {
          ativo: f.ativo,
          apoliceId: f.apolice_id ? Number(f.apolice_id) : null,
          numero_carteirinha: f.numero_carteirinha || null,
          valor_fatura: f.valor_fatura ? Number(f.valor_fatura) : null,
          data_inclusao: f.data_inclusao || null,
        });
      }
      toast({ title: 'Vínculos atualizados.' });
      setBenSelecionado(null);
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar vínculos', description: err.message });
    } finally {
      setIsSavingVinculo(false);
    }
  };

  const abrirEditarApolice = (ap) => {
    const sub = subApoliceOf(ap);
    setApoliceEditando(ap);
    setApoliceForm({
      tipo: sub.tipo || 'saude',
      seguradora: sub.seguradora || '',
      plano: sub.plano || '',
      numero: sub.numero || '',
      valor_premio: sub.valor_premio || '',
    });
  };

  const salvarApolice = async () => {
    if (!apoliceEditando) return;
    setIsSavingApolice(true);
    try {
      const novoSub = { tipo: apoliceForm.tipo, seguradora: apoliceForm.seguradora, plano: apoliceForm.plano, numero: apoliceForm.numero, valor_premio: apoliceForm.valor_premio };
      const dadosAtuais = apoliceEditando.dados_adicionais || {};
      const subs = [...(dadosAtuais.sub_apolices || [])];
      if (subs.length > 0) subs[0] = { ...subs[0], ...novoSub };
      else subs.push(novoSub);
      const updated = await apolicesService.updateApolice(apoliceEditando.id, { dados_adicionais: { ...dadosAtuais, sub_apolices: subs } });
      setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast({ title: 'Apólice atualizada.' });
      setApoliceEditando(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar apólice', description: err.message });
    } finally {
      setIsSavingApolice(false);
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
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 mb-1">🧪 Página de teste — não está no menu</Badge>
            <h1 className="text-2xl font-bold text-white">{matriz.nome_fantasia || matriz.razao_social} — Gestão Geral</h1>
          </div>
          <Button variant="outline" onClick={() => navigate(`/admin/cliente/${matriz.id}`)}>Voltar pra empresa</Button>
        </div>

        <Tabs defaultValue="beneficiarios">
          <TabsList>
            <TabsTrigger value="beneficiarios">Beneficiários Geral ({beneficiarios.length})</TabsTrigger>
            <TabsTrigger value="apolices">Apólices Geral ({apolices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiarios">
            <Card>
              <CardHeader><CardTitle>Beneficiários — matriz + filiais</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="Buscar nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
                  <Select value={filtroEmpresaBen} onValueChange={setFiltroEmpresaBen}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Empresa (CNPJ)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as empresas</SelectItem>
                      <SelectItem value={String(matriz.id)}>{matriz.nome_fantasia || matriz.razao_social} (Matriz)</SelectItem>
                      {filiais.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome_fantasia || f.razao_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filtroApoliceBen} onValueChange={setFiltroApoliceBen}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Apólice" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as apólices</SelectItem>
                      {apolices.map(a => <SelectItem key={a.id} value={String(a.id)}>{apoliceLabel(a)} — {empresaLabel(a.empresa_id)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Apólices vinculadas</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {beneficiariosFiltrados.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.nome_completo}</TableCell>
                          <TableCell>{formatCpfCnpj(b.cpf)}</TableCell>
                          <TableCell><Badge variant="outline">{empresaLabel(b.empresa_id)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {planosDoBeneficiario(b.id).length === 0 && <span className="text-xs text-gray-400">nenhuma</span>}
                              {planosDoBeneficiario(b.id).map(p => {
                                const ap = apolices.find(a => a.id === p.apolice_id);
                                return (
                                  <Badge key={p.id} className="bg-[#003580]/10 text-[#003580] hover:bg-[#003580]/10">
                                    {p.tipo} · {ap ? apoliceLabel(ap) : `#${p.apolice_id}`}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell><Button size="sm" variant="outline" onClick={() => abrirVinculos(b)}>Gerenciar vínculos</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {beneficiariosFiltrados.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum beneficiário com esse filtro.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apolices">
            <Card>
              <CardHeader><CardTitle>Apólices — matriz + filiais</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={filtroEmpresaApolice} onValueChange={setFiltroEmpresaApolice}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Empresa (CNPJ)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as empresas</SelectItem>
                    <SelectItem value={String(matriz.id)}>{matriz.nome_fantasia || matriz.razao_social} (Matriz)</SelectItem>
                    {filiais.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome_fantasia || f.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Seguradora</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Beneficiários</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apolicesFiltradas.map(a => {
                        const sub = subApoliceOf(a);
                        return (
                          <TableRow key={a.id}>
                            <TableCell><Badge variant="outline">{empresaLabel(a.empresa_id)}</Badge></TableCell>
                            <TableCell className="capitalize">{sub.tipo || '—'}</TableCell>
                            <TableCell>{sub.seguradora || '—'}</TableCell>
                            <TableCell>{sub.plano || '—'}</TableCell>
                            <TableCell>{contagemBeneficiariosApolice(a.id)}</TableCell>
                            <TableCell><Button size="sm" variant="outline" onClick={() => abrirEditarApolice(a)}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {apolicesFiltradas.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma apólice com esse filtro.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: gerenciar vínculos do beneficiário */}
      <Dialog open={!!benSelecionado} onOpenChange={(open) => !open && setBenSelecionado(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vínculos — {benSelecionado?.nome_completo}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {TIPOS.map(({ key, label }) => {
              const f = vinculoForm[key] || {};
              const apolicesDoTipo = apolices.filter(a => subApoliceOf(a).tipo === key);
              return (
                <div key={key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">{label}</Label>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenSelecionado(null)}>Cancelar</Button>
            <Button onClick={salvarVinculos} disabled={isSavingVinculo} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingVinculo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: editar apólice (seguradora + plano) */}
      <Dialog open={!!apoliceEditando} onOpenChange={(open) => !open && setApoliceEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar apólice</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={apoliceForm.tipo} onValueChange={(v) => setApoliceForm(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="saude">Saúde</SelectItem>
                  <SelectItem value="vida">Vida</SelectItem>
                  <SelectItem value="odonto">Odonto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Seguradora</Label><Input value={apoliceForm.seguradora} onChange={e => setApoliceForm(prev => ({ ...prev, seguradora: e.target.value }))} placeholder="Ex: SulAmérica" /></div>
            <div><Label>Plano</Label><Input value={apoliceForm.plano} onChange={e => setApoliceForm(prev => ({ ...prev, plano: e.target.value }))} placeholder="Ex: Direto Nacional" /></div>
            <div><Label>Número</Label><Input value={apoliceForm.numero} onChange={e => setApoliceForm(prev => ({ ...prev, numero: e.target.value }))} /></div>
            <div><Label>Valor prêmio</Label><Input value={apoliceForm.valor_premio} onChange={e => setApoliceForm(prev => ({ ...prev, valor_premio: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApoliceEditando(null)}>Cancelar</Button>
            <Button onClick={salvarApolice} disabled={isSavingApolice} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingApolice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GestaoGeralTestePage;
