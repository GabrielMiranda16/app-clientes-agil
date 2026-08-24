import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ChevronDown, ChevronLeft, ChevronRight, Users, FileText, Search, Trash2, DollarSign, ClipboardList, Clock, CheckCircle2, XCircle, SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react';
import { formatCpfCnpj, applyCpfMask, applyPhoneMask, applyCepMask } from '@/lib/masks';
import { calculateAge, formatCurrency } from '@/lib/utils';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { apolicesService } from '@/services/apolicesService';
import { beneficiarioPlanosService } from '@/services/beneficiarioPlanosService';
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { solicitacoesService } from '@/services/solicitacoesService';

const TIPOS = [
  { key: 'saude', label: 'Saúde' },
  { key: 'vida', label: 'Vida' },
  { key: 'odonto', label: 'Odonto' },
];

const ORDENAR_BEN_OPTIONS = [
  { key: 'nome_asc', label: 'Nome A-Z' },
  { key: 'nome_desc', label: 'Nome Z-A' },
  { key: 'idade_asc', label: 'Idade: menor → maior' },
  { key: 'idade_desc', label: 'Idade: maior → menor' },
];

const subApoliceOf = (ap) => (ap.dados_adicionais?.sub_apolices || [])[0] || {};

const maskBRL = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10);
  const cents = n % 100;
  const reais = Math.floor(n / 100);
  const reaisStr = reais === 0 ? '0' : reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
};
const parseBRL = (v) => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;

const emptyBenForm = {
  nome_completo: '', cpf: '', parentesco: 'TITULAR', data_nascimento: '', nome_mae: '', nome_titular: '',
  situacao: 'ATIVO', data_inatividade: '', data_afastamento: '', motivo_afastamento: '',
  matricula_empresa: '', data_admissao: '',
  celular: '', email_beneficiario: '',
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  empresa_id: '',
};

const emptyAddAp = { empresa_id: '', tipo: 'saude', seguradora: '', plano: '', numero: '', valor_premio: '' };

// Campos completos do beneficiário — usado tanto no "Adicionar" quanto no card expandido
const BeneficiarioFormFields = ({ form, setForm, titulares, empresaOptions, showEmpresa, cepLoading, onBuscarCep }) => {
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const idade = calculateAge(form.data_nascimento);

  return (
    <div className="space-y-4">
      {showEmpresa && (
        <div>
          <Label className="text-xs">Empresa *</Label>
          <Select value={form.empresa_id} onValueChange={(v) => set('empresa_id', v)}>
            <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Selecione..." className="truncate min-w-0" /></SelectTrigger>
            <SelectContent>{empresaOptions}</SelectContent>
          </Select>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Dados Pessoais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2"><Label className="text-xs">Nome Completo *</Label><Input value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} /></div>
          <div><Label className="text-xs">CPF *</Label><Input value={form.cpf} onChange={e => set('cpf', applyCpfMask(e.target.value))} /></div>
          <div>
            <Label className="text-xs">Parentesco *</Label>
            <Select value={form.parentesco} onValueChange={(v) => set('parentesco', v)}>
              <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Selecione..." className="truncate min-w-0" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TITULAR">TITULAR</SelectItem>
                <SelectItem value="CONJUGE">CÔNJUGE</SelectItem>
                <SelectItem value="FILHO">FILHO(A)</SelectItem>
                <SelectItem value="OUTRO">OUTRO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} /></div>
          <div><Label className="text-xs">Idade</Label><Input value={idade !== '' ? idade : ''} disabled className="bg-gray-100" /></div>
          <div><Label className="text-xs">Nome da Mãe</Label><Input value={form.nome_mae} onChange={e => set('nome_mae', e.target.value)} /></div>
          <div>
            <Label className="text-xs">Nome do Titular</Label>
            {form.parentesco === 'TITULAR' ? (
              <Input value="" disabled placeholder="Não aplicável para titulares" />
            ) : (
              <Select value={form.nome_titular} onValueChange={(v) => set('nome_titular', v)} disabled={titulares.length === 0}>
                <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder={titulares.length > 0 ? 'Selecione o titular...' : 'Nenhum titular cadastrado'} className="truncate min-w-0" /></SelectTrigger>
                <SelectContent>
                  {titulares.map(t => <SelectItem key={t.id} value={t.nome_completo}>{t.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Situação</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Situação Geral *</Label>
            <Select value={form.situacao} onValueChange={(v) => set('situacao', v)}>
              <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">ATIVO</SelectItem>
                <SelectItem value="INATIVO">INATIVO</SelectItem>
                <SelectItem value="AFASTADO">AFASTADO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.situacao === 'INATIVO' && (
            <div><Label className="text-xs">Data de Inatividade *</Label><Input type="date" value={form.data_inatividade} onChange={e => set('data_inatividade', e.target.value)} /></div>
          )}
          {form.situacao === 'AFASTADO' && (
            <>
              <div><Label className="text-xs">Data de Afastamento *</Label><Input type="date" value={form.data_afastamento} onChange={e => set('data_afastamento', e.target.value)} /></div>
              <div><Label className="text-xs">Motivo do Afastamento *</Label><Input value={form.motivo_afastamento} onChange={e => set('motivo_afastamento', e.target.value)} /></div>
            </>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Dados Trabalhistas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><Label className="text-xs">Matrícula e Dígito</Label><Input value={form.matricula_empresa} onChange={e => set('matricula_empresa', e.target.value)} /></div>
          <div><Label className="text-xs">Data de Admissão</Label><Input type="date" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} /></div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#003580] mb-2">Contato e Endereço</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><Label className="text-xs">Celular</Label><Input value={form.celular} onChange={e => set('celular', applyPhoneMask(e.target.value))} /></div>
          <div><Label className="text-xs">E-mail</Label><Input type="email" value={form.email_beneficiario} onChange={e => set('email_beneficiario', e.target.value)} /></div>
          <div>
            <Label className="text-xs">CEP</Label>
            <div className="flex gap-2">
              <Input value={form.cep} placeholder="00000-000" maxLength={9} onChange={e => set('cep', applyCepMask(e.target.value))} onBlur={() => onBuscarCep(form.cep)} />
              <button type="button" onClick={() => onBuscarCep(form.cep)} disabled={cepLoading} className="px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center">
                {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div><Label className="text-xs">Rua</Label><Input value={form.rua} onChange={e => set('rua', e.target.value)} /></div>
          <div><Label className="text-xs">Número</Label><Input value={form.numero} onChange={e => set('numero', e.target.value)} /></div>
          <div><Label className="text-xs">Complemento</Label><Input value={form.complemento} onChange={e => set('complemento', e.target.value)} /></div>
          <div><Label className="text-xs">Bairro</Label><Input value={form.bairro} onChange={e => set('bairro', e.target.value)} /></div>
          <div><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={e => set('cidade', e.target.value)} /></div>
          <div><Label className="text-xs">Estado</Label><Input value={form.estado} onChange={e => set('estado', e.target.value)} /></div>
        </div>
      </div>
    </div>
  );
};

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
  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [filtroStatusSol, setFiltroStatusSol] = useState('abertas');

  const [isSolDadosOpen, setIsSolDadosOpen] = useState(false);
  const [solDadosTarget, setSolDadosTarget] = useState(null);
  const [solDadosForm, setSolDadosForm] = useState({});
  const [isSavingSolDados, setIsSavingSolDados] = useState(false);
  const [isAceitandoSolId, setIsAceitandoSolId] = useState(null);

  const [filtroEmpresaBen, setFiltroEmpresaBen] = useState('todas');
  const [filtroApoliceBen, setFiltroApoliceBen] = useState('todas');
  const [filtroSituacaoBen, setFiltroSituacaoBen] = useState('todos');
  const [filtroParentescoBen, setFiltroParentescoBen] = useState('todos');
  const [ordenarBen, setOrdenarBen] = useState('nome_asc');
  const [filtroEmpresaApolice, setFiltroEmpresaApolice] = useState('todas');
  const [filtroEmpresaCopart, setFiltroEmpresaCopart] = useState('todas');
  const [busca, setBusca] = useState('');
  const [paginaBen, setPaginaBen] = useState(1);

  const [isFiltroBenOpen, setIsFiltroBenOpen] = useState(false);
  const [isOrdenarBenOpen, setIsOrdenarBenOpen] = useState(false);
  const filtroBenRef = useRef(null);
  const ordenarBenRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      // Selects dentro do painel abrem num portal fora dessa div — não conta como "fora"
      if (e.target.closest('[data-radix-popper-content-wrapper]')) return;
      if (filtroBenRef.current && !filtroBenRef.current.contains(e.target)) setIsFiltroBenOpen(false);
      if (ordenarBenRef.current && !ordenarBenRef.current.contains(e.target)) setIsOrdenarBenOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [expandedBenId, setExpandedBenId] = useState(null);
  const [expandedPlanoDetail, setExpandedPlanoDetail] = useState(null);

  const [isEditBenOpen, setIsEditBenOpen] = useState(false);
  const [editBenTarget, setEditBenTarget] = useState(null);
  const [editBenForm, setEditBenForm] = useState(emptyBenForm);
  const [isSavingBenEdit, setIsSavingBenEdit] = useState(false);
  const [isDeletingBen, setIsDeletingBen] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const [isVinculoOpen, setIsVinculoOpen] = useState(false);
  const [vinculoTarget, setVinculoTarget] = useState(null);
  const [vinculoForm, setVinculoForm] = useState({});
  const [isSavingVinculo, setIsSavingVinculo] = useState(false);

  const [expandedApId, setExpandedApId] = useState(null);
  const [apoliceForm, setApoliceForm] = useState({ seguradora: '', plano: '', numero: '', valor_premio: '', tipo: 'saude' });
  const [isSavingApolice, setIsSavingApolice] = useState(false);

  const [isAddBenOpen, setIsAddBenOpen] = useState(false);
  const [addBenForm, setAddBenForm] = useState(emptyBenForm);
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

      const [apData, benData, copartData, solData] = await Promise.all([
        apolicesService.getApolicesByMatriz(id),
        beneficiariosService.getAllBeneficiarios(),
        coparticipacaoService.getAllCoparticipacoes().catch(() => []),
        solicitacoesService.getAllSolicitacoes().catch(() => []),
      ]);
      const apSVD = apData.filter(a => a.segmento === 'SAUDE_VIDA_ODONTO');
      const benGrupo = benData.filter(b => ids.includes(Number(b.empresa_id)) && !b.data_exclusao);
      setSolicitacoes(solData.filter(s => ids.includes(Number(s.empresa_id))));
      setApolices(apSVD);
      setBeneficiarios(benGrupo);
      setCoparticipacoes(copartData.filter(c => ids.includes(Number(c.empresa_id))));

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
  useEffect(() => { setPaginaBen(1); }, [filtroEmpresaBen, filtroApoliceBen, busca, filtroSituacaoBen, filtroParentescoBen]);

  const empresaLabel = (empresaId) => {
    const e = todasEmpresas.find(x => x.id === Number(empresaId));
    if (!e) return '—';
    return e.nome_fantasia || e.razao_social || `Empresa ${empresaId}`;
  };

  const apoliceLabel = (ap) => {
    const sub = subApoliceOf(ap);
    return [sub.numero && `Apólice ${sub.numero}`, sub.seguradora].filter(Boolean).join(' · ') || `Apólice ${ap.id}`;
  };

  const titulares = useMemo(() => beneficiarios.filter(b => b.parentesco === 'TITULAR'), [beneficiarios]);
  const planosDoBeneficiario = (benId) => planos.filter(p => p.beneficiario_id === benId);

  const qtdFiltrosBenAtivos = [filtroEmpresaBen !== 'todas', filtroApoliceBen !== 'todas', filtroSituacaoBen !== 'todos', filtroParentescoBen !== 'todos'].filter(Boolean).length;

  const beneficiariosFiltrados = useMemo(() => {
    const lista = beneficiarios.filter(b => {
      if (filtroEmpresaBen !== 'todas' && Number(b.empresa_id) !== Number(filtroEmpresaBen)) return false;
      if (filtroApoliceBen !== 'todas') {
        const vinculado = planos.some(p => p.beneficiario_id === b.id && Number(p.apolice_id) === Number(filtroApoliceBen));
        if (!vinculado) return false;
      }
      if (busca && !(b.nome_completo || '').toLowerCase().includes(busca.toLowerCase()) && !(b.cpf || '').includes(busca)) return false;
      if (filtroSituacaoBen !== 'todos' && b.situacao !== filtroSituacaoBen) return false;
      if (filtroParentescoBen === 'TITULAR' && b.parentesco !== 'TITULAR') return false;
      if (filtroParentescoBen === 'DEPENDENTE' && b.parentesco === 'TITULAR') return false;
      return true;
    });
    const ordenada = [...lista];
    if (ordenarBen === 'nome_asc') ordenada.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''));
    if (ordenarBen === 'nome_desc') ordenada.sort((a, b) => (b.nome_completo || '').localeCompare(a.nome_completo || ''));
    if (ordenarBen === 'idade_asc') ordenada.sort((a, b) => new Date(b.data_nascimento || 0) - new Date(a.data_nascimento || 0));
    if (ordenarBen === 'idade_desc') ordenada.sort((a, b) => new Date(a.data_nascimento || 0) - new Date(b.data_nascimento || 0));
    return ordenada;
  }, [beneficiarios, planos, filtroEmpresaBen, filtroApoliceBen, busca, filtroSituacaoBen, filtroParentescoBen, ordenarBen]);

  const BEN_POR_PAGINA = 20;
  const totalPaginasBen = Math.max(1, Math.ceil(beneficiariosFiltrados.length / BEN_POR_PAGINA));
  const beneficiariosPaginados = useMemo(() => {
    const start = (paginaBen - 1) * BEN_POR_PAGINA;
    return beneficiariosFiltrados.slice(start, start + BEN_POR_PAGINA);
  }, [beneficiariosFiltrados, paginaBen]);

  const apolicesFiltradas = useMemo(() => {
    return apolices.filter(a => filtroEmpresaApolice === 'todas' || Number(a.empresa_id) === Number(filtroEmpresaApolice));
  }, [apolices, filtroEmpresaApolice]);

  const coparticipacoesFiltradas = useMemo(() => {
    return coparticipacoes.filter(c => filtroEmpresaCopart === 'todas' || Number(c.empresa_id) === Number(filtroEmpresaCopart));
  }, [coparticipacoes, filtroEmpresaCopart]);

  const solicitacoesFiltradas = useMemo(() => {
    if (filtroStatusSol === 'abertas') return solicitacoes.filter(s => ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status));
    if (filtroStatusSol === 'todas') return solicitacoes;
    return solicitacoes.filter(s => s.status === filtroStatusSol);
  }, [solicitacoes, filtroStatusSol]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDENTE': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'EM PROCESSAMENTO': return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Em Processamento</Badge>;
      case 'CONCLUIDA': return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>;
      case 'REJEITADA': return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejeitada</Badge>;
      case 'CANCELADA': return <Badge variant="outline" className="bg-gray-50 text-gray-600 hover:bg-gray-50 border-gray-200"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'INCLUSAO': return <Badge className="bg-green-600 hover:bg-green-600">Inclusão</Badge>;
      case 'EXCLUSAO': return <Badge variant="destructive">Exclusão</Badge>;
      default: return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const getTempoDecorrido = (dataStr) => {
    if (!dataStr) return '—';
    const diffMs = new Date() - new Date(dataStr);
    if (diffMs < 0) return '—';
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    return dias > 0 ? `${dias}d ${horas}h` : `${horas}h`;
  };

  const aceitarSolicitacao = async (s) => {
    setIsAceitandoSolId(s.id);
    try {
      const updated = await solicitacoesService.updateSolicitacao(s.id, { status: 'EM PROCESSAMENTO', data_aprovacao: new Date().toISOString() });
      setSolicitacoes(prev => prev.map(x => x.id === s.id ? { ...x, ...updated } : x));
      toast({ title: 'Solicitação aceita.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao aceitar', description: err.message });
    } finally {
      setIsAceitandoSolId(null);
    }
  };

  const cancelarSolicitacao = async (s) => {
    try {
      await solicitacoesService.cancelSolicitacao(s.id);
      setSolicitacoes(prev => prev.map(x => x.id === s.id ? { ...x, status: 'CANCELADA' } : x));
      toast({ title: 'Solicitação cancelada.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: err.message });
    }
  };

  const abrirAdicionarDadosSol = (s) => {
    const beneficiario = beneficiarios.find(b => b.id === s.beneficiario_id);
    if (!beneficiario) { toast({ variant: 'destructive', title: 'Beneficiário não encontrado.' }); return; }
    setSolDadosTarget({ solicitacao: s, beneficiario });
    const vinculo = planos.find(p => p.beneficiario_id === s.beneficiario_id && p.tipo === s.tipo_plano);
    setSolDadosForm({
      apolice_id: vinculo ? String(vinculo.apolice_id) : '',
      numero_carteirinha: vinculo?.numero_carteirinha || '',
      link_carteirinha: vinculo?.link_carteirinha || '',
      data_inclusao: vinculo?.data_inclusao || '',
      codigo_empresa: vinculo?.codigo_empresa || '',
      produto: vinculo?.produto || '',
      acomodacao: vinculo?.acomodacao || '',
    });
    setIsSolDadosOpen(true);
  };

  const salvarDadosSolicitacao = async () => {
    if (!solDadosTarget) return;
    const { solicitacao: s, beneficiario } = solDadosTarget;
    const isExclusao = s.tipo_solicitacao === 'EXCLUSAO';
    if (!isExclusao && !solDadosForm.apolice_id) {
      toast({ variant: 'destructive', title: 'Selecione a apólice.' });
      return;
    }
    setIsSavingSolDados(true);
    try {
      await beneficiarioPlanosService.syncPlano(beneficiario.id, s.tipo_plano, {
        ativo: !isExclusao,
        apoliceId: isExclusao ? null : Number(solDadosForm.apolice_id),
        numero_carteirinha: solDadosForm.numero_carteirinha || null,
        link_carteirinha: solDadosForm.link_carteirinha || null,
        data_inclusao: solDadosForm.data_inclusao || null,
        codigo_empresa: solDadosForm.codigo_empresa || null,
        produto: solDadosForm.produto || null,
        acomodacao: s.tipo_plano === 'saude' ? (solDadosForm.acomodacao || null) : null,
      });
      const updated = await solicitacoesService.updateSolicitacao(s.id, { status: 'CONCLUIDA', data_conclusao: new Date().toISOString() });
      setSolicitacoes(prev => prev.map(x => x.id === s.id ? { ...x, ...updated } : x));
      toast({ title: 'Solicitação concluída.' });
      setIsSolDadosOpen(false);
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao concluir', description: err.message });
    } finally {
      setIsSavingSolDados(false);
    }
  };

  const contagemBeneficiariosApolice = (apoliceId) =>
    new Set(planos.filter(p => Number(p.apolice_id) === Number(apoliceId)).map(p => p.beneficiario_id)).size;

  const empresaOptions = (
    <>
      <SelectItem value={String(matriz?.id)}>{matriz?.nome_fantasia || matriz?.razao_social} (Matriz)</SelectItem>
      {filiais.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome_fantasia || f.razao_social}</SelectItem>)}
    </>
  );

  const buscarCep = async (cepValue, setForm) => {
    const cep = (cepValue || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) { toast({ variant: 'destructive', title: 'CEP não encontrado.' }); return; }
      setForm(prev => ({ ...prev, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP.' });
    } finally {
      setIsCepLoading(false);
    }
  };

  // ---------- Seleção em massa ----------
  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? new Set(beneficiariosFiltrados.map(b => b.id)) : new Set());
  };
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const excluirSelecionados = async () => {
    setIsBulkDeleting(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try { await beneficiariosService.deleteBeneficiario(id); ok++; } catch { fail++; }
    }
    setBeneficiarios(prev => prev.filter(b => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    toast({ title: `${ok} excluído(s)${fail ? ` • ${fail} erro(s)` : ''}` });
  };

  // ---------- Beneficiário: expandir (mostra as ações) ----------
  const toggleExpandBen = (b) => {
    setExpandedBenId(prev => prev === b.id ? null : b.id);
  };

  const abrirEditarBen = (b) => {
    setEditBenTarget(b);
    setEditBenForm({
      nome_completo: b.nome_completo || '', cpf: b.cpf ? applyCpfMask(b.cpf) : '', parentesco: b.parentesco || 'TITULAR',
      data_nascimento: b.data_nascimento || '', nome_mae: b.nome_mae || '', nome_titular: b.nome_titular || '',
      situacao: b.situacao || 'ATIVO', data_inatividade: b.data_inatividade || '', data_afastamento: b.data_afastamento || '', motivo_afastamento: b.motivo_afastamento || '',
      matricula_empresa: b.matricula_empresa || '', data_admissao: b.data_admissao || '',
      celular: b.celular || '', email_beneficiario: b.email_beneficiario || '',
      cep: b.cep || '', rua: b.rua || '', numero: b.numero || '', complemento: b.complemento || '', bairro: b.bairro || '', cidade: b.cidade || '', estado: b.estado || '',
      empresa_id: String(b.empresa_id),
    });
    setIsEditBenOpen(true);
  };

  const salvarEdicaoBeneficiario = async () => {
    if (!editBenTarget) return;
    if (!editBenForm.nome_completo || !editBenForm.cpf || !editBenForm.parentesco) {
      toast({ variant: 'destructive', title: 'Preencha nome, CPF e parentesco.' });
      return;
    }
    const cpfLimpo = editBenForm.cpf.replace(/\D/g, '');
    if (beneficiarios.some(ben => ben.id !== editBenTarget.id && (ben.cpf || '').replace(/\D/g, '') === cpfLimpo)) {
      toast({ variant: 'destructive', title: 'CPF já cadastrado nesse grupo.' });
      return;
    }
    setIsSavingBenEdit(true);
    try {
      const updated = await beneficiariosService.updateBeneficiario(editBenTarget.id, editBenForm);
      setBeneficiarios(prev => prev.map(x => x.id === editBenTarget.id ? { ...x, ...updated } : x));
      toast({ title: 'Dados atualizados.' });
      setIsEditBenOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setIsSavingBenEdit(false);
    }
  };

  const excluirBeneficiario = async (b) => {
    setIsDeletingBen(true);
    try {
      await beneficiariosService.deleteBeneficiario(b.id);
      setBeneficiarios(prev => prev.filter(x => x.id !== b.id));
      setExpandedBenId(null);
      toast({ title: 'Beneficiário excluído.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    } finally {
      setIsDeletingBen(false);
    }
  };

  const abrirVincularApolice = (b) => {
    setVinculoTarget(b);
    const vform = {};
    TIPOS.forEach(({ key }) => {
      const vinculo = planos.find(p => p.beneficiario_id === b.id && p.tipo === key);
      vform[key] = {
        ativo: !!vinculo,
        apolice_id: vinculo ? String(vinculo.apolice_id) : '',
        numero_carteirinha: vinculo?.numero_carteirinha || '',
        link_carteirinha: vinculo?.link_carteirinha || '',
        data_inclusao: vinculo?.data_inclusao || '',
        data_exclusao: vinculo?.data_exclusao || '',
        codigo_empresa: vinculo?.codigo_empresa || '',
        produto: vinculo?.produto || '',
        acomodacao: vinculo?.acomodacao || '',
      };
    });
    setVinculoForm(vform);
    setIsVinculoOpen(true);
  };

  const salvarVinculos = async () => {
    if (!vinculoTarget) return;
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
        await beneficiarioPlanosService.syncPlano(vinculoTarget.id, key, {
          ativo: f.ativo,
          apoliceId: f.apolice_id ? Number(f.apolice_id) : null,
          numero_carteirinha: f.numero_carteirinha || null,
          link_carteirinha: f.link_carteirinha || null,
          data_inclusao: f.data_inclusao || null,
          data_exclusao: f.data_exclusao || null,
          codigo_empresa: f.codigo_empresa || null,
          produto: f.produto || null,
          acomodacao: key === 'saude' ? (f.acomodacao || null) : null,
        });
      }
      toast({ title: 'Vínculos atualizados.' });
      setIsVinculoOpen(false);
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
      valor_premio: sub.valor_premio ? maskBRL(String(Math.round(Number(sub.valor_premio) * 100))) : '',
    });
  };

  const salvarApolice = async (ap) => {
    setIsSavingApolice(true);
    try {
      const novoSub = { tipo: apoliceForm.tipo, seguradora: apoliceForm.seguradora, plano: apoliceForm.plano, numero: apoliceForm.numero, valor_premio: parseBRL(apoliceForm.valor_premio) };
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
      setAddBenForm(emptyBenForm);
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
          sub_apolices: [{ tipo: addApForm.tipo, seguradora: addApForm.seguradora, plano: addApForm.plano, numero: addApForm.numero, valor_premio: parseBRL(addApForm.valor_premio) }],
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
          <TabsList className="bg-white/10 w-full h-auto p-1 gap-1 grid grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="beneficiarios" className="group text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              <Users className="h-4 w-4 mr-1.5" /> Beneficiários <span className="ml-1.5 bg-white/20 text-white group-data-[state=active]:bg-[#003580]/10 group-data-[state=active]:text-[#003580] text-xs px-1.5 py-0.5 rounded-full">{beneficiarios.length}</span>
            </TabsTrigger>
            <TabsTrigger value="apolices" className="group text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              <FileText className="h-4 w-4 mr-1.5" /> Apólices <span className="ml-1.5 bg-white/20 text-white group-data-[state=active]:bg-[#003580]/10 group-data-[state=active]:text-[#003580] text-xs px-1.5 py-0.5 rounded-full">{apolices.length}</span>
            </TabsTrigger>
            <TabsTrigger value="solicitacoes" className="group text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              <ClipboardList className="h-4 w-4 mr-1.5" /> Solicitações <span className="ml-1.5 bg-white/20 text-white group-data-[state=active]:bg-[#003580]/10 group-data-[state=active]:text-[#003580] text-xs px-1.5 py-0.5 rounded-full">{solicitacoes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="coparticipacao" className="group text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              <DollarSign className="h-4 w-4 mr-1.5" /> Coparticipação <span className="ml-1.5 bg-white/20 text-white group-data-[state=active]:bg-[#003580]/10 group-data-[state=active]:text-[#003580] text-xs px-1.5 py-0.5 rounded-full">{coparticipacoes.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiarios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Beneficiários</CardTitle>
                <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => { setAddBenForm({ ...emptyBenForm, empresa_id: String(matriz.id) }); setIsAddBenOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input placeholder="Buscar nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />

                  <div className="relative" ref={filtroBenRef}>
                    <Button variant="outline" size="sm" onClick={() => setIsFiltroBenOpen(o => !o)} className="gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Filtro
                      {qtdFiltrosBenAtivos > 0 && <Badge className="bg-[#003580] hover:bg-[#003580] text-white h-5 min-w-5 px-1 rounded-full">{qtdFiltrosBenAtivos}</Badge>}
                    </Button>
                    {isFiltroBenOpen && (
                      <div className="absolute z-50 mt-1 w-72 rounded-lg border bg-white shadow-lg p-3 space-y-3">
                        <div>
                          <Label className="text-xs">Empresa (CNPJ)</Label>
                          <Select value={filtroEmpresaBen} onValueChange={setFiltroEmpresaBen}>
                            <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
                            <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem>{empresaOptions}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Apólice</Label>
                          <Select value={filtroApoliceBen} onValueChange={setFiltroApoliceBen}>
                            <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas">Todas as apólices</SelectItem>
                              {apolices.map(a => <SelectItem key={a.id} value={String(a.id)}>{apoliceLabel(a)} — {empresaLabel(a.empresa_id)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Situação</Label>
                          <Select value={filtroSituacaoBen} onValueChange={setFiltroSituacaoBen}>
                            <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todas situações</SelectItem>
                              <SelectItem value="ATIVO">Ativos</SelectItem>
                              <SelectItem value="INATIVO">Inativos</SelectItem>
                              <SelectItem value="AFASTADO">Afastados</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Parentesco</Label>
                          <Select value={filtroParentescoBen} onValueChange={setFiltroParentescoBen}>
                            <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos</SelectItem>
                              <SelectItem value="TITULAR">Titulares</SelectItem>
                              <SelectItem value="DEPENDENTE">Dependentes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {qtdFiltrosBenAtivos > 0 && (
                          <button type="button" className="text-xs text-[#003580] hover:underline" onClick={() => { setFiltroEmpresaBen('todas'); setFiltroApoliceBen('todas'); setFiltroSituacaoBen('todos'); setFiltroParentescoBen('todos'); }}>
                            Limpar filtros
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={ordenarBenRef}>
                    <Button variant="outline" size="sm" onClick={() => setIsOrdenarBenOpen(o => !o)} className="gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar
                    </Button>
                    {isOrdenarBenOpen && (
                      <div className="absolute z-50 mt-1 w-56 rounded-lg border bg-white shadow-lg py-1">
                        {ORDENAR_BEN_OPTIONS.map(opt => (
                          <button key={opt.key} type="button" onClick={() => { setOrdenarBen(opt.key); setIsOrdenarBenOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${ordenarBen === opt.key ? 'text-[#003580] font-medium' : 'text-gray-700'}`}>
                            {opt.label}
                            {ordenarBen === opt.key && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedIds.size > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={isBulkDeleting}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir beneficiários selecionados?</AlertDialogTitle>
                          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={excluirSelecionados} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Cabeçalho das colunas */}
                <div className="hidden sm:flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 grid grid-cols-4 gap-x-3">
                    <span>Nome Completo</span>
                    <span>CPF</span>
                    <span>Parentesco</span>
                    <span>Idade</span>
                  </div>
                  <div className="w-4 shrink-0" />
                </div>

                <div className="space-y-2">
                  {beneficiariosPaginados.map(b => {
                    const open = expandedBenId === b.id;
                    const idade = calculateAge(b.data_nascimento);
                    return (
                      <div key={b.id} className="border rounded-lg overflow-hidden bg-white">
                        <div className="w-full flex items-center gap-3 p-3">
                          <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => toggleSelectOne(b.id)} onClick={e => e.stopPropagation()} className="shrink-0" />
                          <button type="button" onClick={() => toggleExpandBen(b)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-sm min-w-0">
                              <span className="font-medium text-gray-800 truncate min-w-0">{b.nome_completo}</span>
                              <span className="text-gray-500 truncate min-w-0">{formatCpfCnpj(b.cpf)}</span>
                              <span className="text-gray-500 capitalize truncate min-w-0">{(b.parentesco || '—').toLowerCase()}</span>
                              <span className="text-gray-500 truncate min-w-0">{idade !== '' ? `${idade} anos` : '—'}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {open && (
                          <div className="p-3 border-t bg-gray-50 space-y-3">
                            <Badge variant="outline">{empresaLabel(b.empresa_id)}</Badge>
                            <div className="space-y-1.5">
                              {TIPOS.map(({ key, label }) => {
                                const vinculo = planosDoBeneficiario(b.id).find(p => p.tipo === key);
                                const ap = vinculo ? apolices.find(a => a.id === vinculo.apolice_id) : null;
                                const sub = ap ? subApoliceOf(ap) : {};
                                const detailKey = `${b.id}-${key}`;
                                const detailOpen = expandedPlanoDetail === detailKey;
                                return (
                                  <div key={key} className="bg-white border rounded-lg overflow-hidden">
                                    <div className="flex items-center gap-2 flex-wrap px-3 py-2 text-sm">
                                      <span className="font-medium w-14 shrink-0">{label}</span>
                                      {vinculo ? (
                                        <>
                                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
                                          <span className="text-gray-600">{ap ? apoliceLabel(ap) : `#${vinculo.apolice_id}`}</span>
                                          {vinculo.numero_carteirinha && <span className="text-gray-400">· carteirinha {vinculo.numero_carteirinha}</span>}
                                          <button type="button" className="ml-auto text-gray-400 hover:text-[#003580] flex items-center gap-1 text-xs" onClick={() => setExpandedPlanoDetail(detailOpen ? null : detailKey)}>
                                            Ampliar <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
                                          </button>
                                        </>
                                      ) : (
                                        <Badge variant="outline" className="text-gray-400">Inativo</Badge>
                                      )}
                                    </div>
                                    {vinculo && detailOpen && (
                                      <div className="border-t bg-gray-50 px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-xs">
                                        <div><span className="block text-gray-400">Nome do Plano</span><span className="text-gray-700">{sub.plano || '—'}</span></div>
                                        {key === 'saude' && <div><span className="block text-gray-400">Acomodação</span><span className="text-gray-700">{vinculo.acomodacao || '—'}</span></div>}
                                        <div><span className="block text-gray-400">Código da Empresa</span><span className="text-gray-700">{vinculo.codigo_empresa || '—'}</span></div>
                                        <div><span className="block text-gray-400">Produto</span><span className="text-gray-700">{vinculo.produto || '—'}</span></div>
                                        <div><span className="block text-gray-400">Data Inclusão</span><span className="text-gray-700">{vinculo.data_inclusao || '—'}</span></div>
                                        <div><span className="block text-gray-400">Data Exclusão</span><span className="text-gray-700">{vinculo.data_exclusao || '—'}</span></div>
                                        <div><span className="block text-gray-400">Número Carteirinha</span><span className="text-gray-700">{vinculo.numero_carteirinha || '—'}</span></div>
                                        <div>
                                          <span className="block text-gray-400">Link Carteirinha</span>
                                          {vinculo.link_carteirinha ? <a href={vinculo.link_carteirinha} target="_blank" rel="noreferrer" className="text-[#003580] underline">abrir</a> : <span className="text-gray-700">—</span>}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => abrirEditarBen(b)}>Editar beneficiário</Button>
                              <Button size="sm" variant="outline" onClick={() => abrirVincularApolice(b)}>Vincular apólice</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={isDeletingBen}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir {b.nome_completo}?</AlertDialogTitle>
                                    <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => excluirBeneficiario(b)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {beneficiariosFiltrados.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum beneficiário com esse filtro.</p>}
                </div>

                {totalPaginasBen > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-400">Página {paginaBen} de {totalPaginasBen} · {beneficiariosFiltrados.length} beneficiários</p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" disabled={paginaBen === 1} onClick={() => setPaginaBen(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" disabled={paginaBen === totalPaginasBen} onClick={() => setPaginaBen(p => Math.min(totalPaginasBen, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
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
                  <SelectTrigger className="w-56 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Empresa (CNPJ)" className="truncate min-w-0" /></SelectTrigger>
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
                            <span className="text-gray-500 capitalize truncate min-w-0">{sub.tipo || '—'}</span>
                            <span className="font-medium text-gray-800 truncate min-w-0">{sub.seguradora || '—'}</span>
                            <span className="text-gray-500 truncate min-w-0">{sub.plano || '—'}</span>
                            <span className="text-gray-500 truncate min-w-0">{contagemBeneficiariosApolice(a.id)} beneficiário{contagemBeneficiariosApolice(a.id) !== 1 ? 's' : ''}</span>
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
                                  <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
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
                              <div>
                                <Label className="text-xs">Valor prêmio (R$)</Label>
                                <Input value={apoliceForm.valor_premio} onChange={e => setApoliceForm(prev => ({ ...prev, valor_premio: maskBRL(e.target.value) }))} placeholder="0,00" />
                              </div>
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

          <TabsContent value="solicitacoes">
            <Card>
              <CardHeader><CardTitle>Solicitações</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={filtroStatusSol} onValueChange={setFiltroStatusSol}>
                  <SelectTrigger className="w-56 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abertas">Pendentes + Em Processamento</SelectItem>
                    <SelectItem value="PENDENTE">Pendentes</SelectItem>
                    <SelectItem value="EM PROCESSAMENTO">Em Processamento</SelectItem>
                    <SelectItem value="CONCLUIDA">Concluídas</SelectItem>
                    <SelectItem value="REJEITADA">Rejeitadas</SelectItem>
                    <SelectItem value="CANCELADA">Canceladas</SelectItem>
                    <SelectItem value="todas">Todas</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  {solicitacoesFiltradas.map(s => {
                    const beneficiario = beneficiarios.find(b => b.id === s.beneficiario_id);
                    const aberta = ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status);
                    return (
                      <div key={s.id} className="border rounded-lg bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{beneficiario?.nome_completo || 'Beneficiário removido'}</p>
                            <p className="text-xs text-gray-500">{empresaLabel(s.empresa_id)} · {getTempoDecorrido(s.data_solicitacao)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 capitalize">{s.tipo_plano}</span>
                            {getTipoBadge(s.tipo_solicitacao)}
                            {getStatusBadge(s.status)}
                          </div>
                        </div>
                        {(s.motivo || s.observacoes) && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                            {s.motivo && <span><strong>Motivo:</strong> {s.motivo} </span>}
                            {s.observacoes && <span><strong>Obs:</strong> {s.observacoes}</span>}
                          </p>
                        )}
                        {aberta && (
                          <div className="flex justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-600">Cancelar</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
                                  <AlertDialogDescription>O cliente poderá solicitar novamente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => cancelarSolicitacao(s)} className="bg-red-600 hover:bg-red-700">Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            {s.status === 'PENDENTE' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => aceitarSolicitacao(s)} disabled={isAceitandoSolId === s.id}>
                                {isAceitandoSolId === s.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aceitar
                              </Button>
                            )}
                            {s.status === 'EM PROCESSAMENTO' && (
                              <Button size="sm" variant="outline" onClick={() => abrirAdicionarDadosSol(s)}>Adicionar Dados</Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {solicitacoesFiltradas.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma solicitação com esse filtro.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coparticipacao">
            <Card>
              <CardHeader><CardTitle>Coparticipação</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={filtroEmpresaCopart} onValueChange={setFiltroEmpresaCopart}>
                  <SelectTrigger className="w-56 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Empresa (CNPJ)" className="truncate min-w-0" /></SelectTrigger>
                  <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem>{empresaOptions}</SelectContent>
                </Select>

                <div className="hidden sm:flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <div className="flex-1 grid grid-cols-5 gap-x-3">
                    <span>Beneficiário</span>
                    <span>Empresa</span>
                    <span>Competência</span>
                    <span>Valor</span>
                    <span>Descrição</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {coparticipacoesFiltradas.map(c => (
                    <div key={c.id} className="border rounded-lg bg-white p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium text-gray-800 truncate min-w-0">{c.beneficiarios?.nome_completo || '—'}</span>
                        <span className="text-gray-500 truncate min-w-0">{empresaLabel(c.empresa_id)}</span>
                        <span className="text-gray-500 truncate min-w-0">{c.competencia || '—'}</span>
                        <span className="text-gray-500 truncate min-w-0">{formatCurrency(c.valor)}</span>
                        <span className="text-gray-500 truncate min-w-0">{c.descricao || '—'}</span>
                      </div>
                    </div>
                  ))}
                  {coparticipacoesFiltradas.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma coparticipação com esse filtro.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: editar beneficiário */}
      <Dialog open={isEditBenOpen} onOpenChange={setIsEditBenOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar beneficiário</DialogTitle></DialogHeader>
          <BeneficiarioFormFields form={editBenForm} setForm={setEditBenForm} titulares={titulares.filter(t => t.id !== editBenTarget?.id)} empresaOptions={empresaOptions} showEmpresa cepLoading={isCepLoading} onBuscarCep={(cep) => buscarCep(cep, setEditBenForm)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBenOpen(false)}>Cancelar</Button>
            <Button onClick={salvarEdicaoBeneficiario} disabled={isSavingBenEdit} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingBenEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: vincular apólice */}
      <Dialog open={isVinculoOpen} onOpenChange={setIsVinculoOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vincular apólice — {vinculoTarget?.nome_completo}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {TIPOS.map(({ key, label }) => {
              const f = vinculoForm[key] || {};
              const apolicesDoTipo = apolices.filter(a => subApoliceOf(a).tipo === key);
              return (
                <div key={key} className="border rounded-lg p-3 space-y-2">
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
                          <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Selecione..." className="truncate min-w-0" /></SelectTrigger>
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
                        <Label className="text-xs">Link carteirinha</Label>
                        <Input value={f.link_carteirinha} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], link_carteirinha: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Data inclusão</Label>
                        <Input type="date" value={f.data_inclusao} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], data_inclusao: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Data exclusão</Label>
                        <Input type="date" value={f.data_exclusao} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], data_exclusao: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Código da empresa</Label>
                        <Input value={f.codigo_empresa} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], codigo_empresa: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Produto</Label>
                        <Input value={f.produto} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], produto: e.target.value } }))} />
                      </div>
                      {key === 'saude' && (
                        <div>
                          <Label className="text-xs">Acomodação</Label>
                          <Input value={f.acomodacao} onChange={e => setVinculoForm(prev => ({ ...prev, [key]: { ...prev[key], acomodacao: e.target.value } }))} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVinculoOpen(false)}>Cancelar</Button>
            <Button onClick={salvarVinculos} disabled={isSavingVinculo} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingVinculo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar vínculos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: adicionar dados da solicitação (concluir) */}
      <Dialog open={isSolDadosOpen} onOpenChange={setIsSolDadosOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar dados — {solDadosTarget?.beneficiario?.nome_completo}</DialogTitle>
          </DialogHeader>
          {solDadosTarget && (() => {
            const s = solDadosTarget.solicitacao;
            const isExclusao = s.tipo_solicitacao === 'EXCLUSAO';
            const apolicesDoTipo = apolices.filter(a => subApoliceOf(a).tipo === s.tipo_plano);
            return (
              <div className="space-y-3 py-2">
                <p className="text-sm text-gray-500">
                  {isExclusao ? 'Confirma a exclusão do plano de' : 'Complete os dados do plano de'} <span className="font-semibold uppercase">{s.tipo_plano}</span>.
                </p>
                {!isExclusao && (
                  <>
                    <div>
                      <Label className="text-xs">Apólice (de qualquer empresa do grupo)</Label>
                      <Select value={solDadosForm.apolice_id} onValueChange={(v) => setSolDadosForm(prev => ({ ...prev, apolice_id: v }))}>
                        <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Selecione..." className="truncate min-w-0" /></SelectTrigger>
                        <SelectContent>
                          {apolicesDoTipo.map(a => <SelectItem key={a.id} value={String(a.id)}>{apoliceLabel(a)} — {empresaLabel(a.empresa_id)}</SelectItem>)}
                          {apolicesDoTipo.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Nenhuma apólice de {s.tipo_plano} nesse grupo ainda</div>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><Label className="text-xs">Número carteirinha</Label><Input value={solDadosForm.numero_carteirinha} onChange={e => setSolDadosForm(prev => ({ ...prev, numero_carteirinha: e.target.value }))} /></div>
                      <div><Label className="text-xs">Link carteirinha</Label><Input value={solDadosForm.link_carteirinha} onChange={e => setSolDadosForm(prev => ({ ...prev, link_carteirinha: e.target.value }))} /></div>
                      <div><Label className="text-xs">Data inclusão</Label><Input type="date" value={solDadosForm.data_inclusao} onChange={e => setSolDadosForm(prev => ({ ...prev, data_inclusao: e.target.value }))} /></div>
                      <div><Label className="text-xs">Código da empresa</Label><Input value={solDadosForm.codigo_empresa} onChange={e => setSolDadosForm(prev => ({ ...prev, codigo_empresa: e.target.value }))} /></div>
                      <div><Label className="text-xs">Produto</Label><Input value={solDadosForm.produto} onChange={e => setSolDadosForm(prev => ({ ...prev, produto: e.target.value }))} /></div>
                      {s.tipo_plano === 'saude' && <div><Label className="text-xs">Acomodação</Label><Input value={solDadosForm.acomodacao} onChange={e => setSolDadosForm(prev => ({ ...prev, acomodacao: e.target.value }))} /></div>}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSolDadosOpen(false)}>Cancelar</Button>
            <Button onClick={salvarDadosSolicitacao} disabled={isSavingSolDados} className="bg-[#003580] hover:bg-[#002060]">
              {isSavingSolDados && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Concluir solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: adicionar beneficiário */}
      <Dialog open={isAddBenOpen} onOpenChange={setIsAddBenOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Adicionar beneficiário</DialogTitle></DialogHeader>
          <BeneficiarioFormFields form={addBenForm} setForm={setAddBenForm} titulares={titulares} empresaOptions={empresaOptions} showEmpresa cepLoading={isCepLoading} onBuscarCep={(cep) => buscarCep(cep, setAddBenForm)} />
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
                <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue placeholder="Selecione..." className="truncate min-w-0" /></SelectTrigger>
                <SelectContent>{empresaOptions}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={addApForm.tipo} onValueChange={(v) => setAddApForm(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger className="[&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1"><SelectValue className="truncate min-w-0" /></SelectTrigger>
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
            <div>
              <Label>Valor prêmio (R$)</Label>
              <Input value={addApForm.valor_premio} onChange={e => setAddApForm(prev => ({ ...prev, valor_premio: maskBRL(e.target.value) }))} placeholder="0,00" />
            </div>
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
