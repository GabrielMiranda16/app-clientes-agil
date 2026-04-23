import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, ArrowLeft, Loader2, Search } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Services
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { empresasService } from '@/services/empresasService';
import { apolicesService } from '@/services/apolicesService';
import { cleanCoparticipacaoData, validateCoparticipacao } from '@/lib/coparticipacaoValidator';
import { formatCpfCnpj } from '@/lib/masks';

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const CoparticipacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { selectedCompanyId } = useCompany();

  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [apolices, setApolices] = useState([]);
  const [logoBase64, setLogoBase64] = useState(null);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState('__all__');

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoTab, setTipoTab] = useState('saude');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [currentDependents, setCurrentDependents] = useState([]);
  const [selectedDependentId, setSelectedDependentId] = useState('titular');

  const [formData, setFormData] = useState({
    empresa_id: '',
    cnpj: '',
    beneficiario_id: '',
    nome_quem_utilizou: '',
    cpf_quem_utilizou: '',
    valor: '',
    mes: '',
    descricao: '',
    tipo: 'saude'
  });

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = 0; i < 6; i++) arr.push(currentYear - i);
    return arr;
  }, []);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch('https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png', { mode: 'cors' });
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      } catch { /* logo é opcional */ }
    };
    loadLogo();
  }, []);

  const getSeguradora = (tipo) => {
    if (!selectedCompanyId) return null;
    const ap = apolices.find(a =>
      String(a.empresa_id) === String(selectedCompanyId) &&
      a.segmento === 'saude-vida-odonto'
    );
    return ap?.seguradora || null;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [copData, benData, empData, apolData] = await Promise.all([
        coparticipacaoService.getAllCoparticipacoes(),
        beneficiariosService.getAllBeneficiarios(),
        empresasService.getEmpresas(),
        apolicesService.getAllApolices()
      ]);
      setCoparticipacoes(copData);
      setBeneficiarios(benData);
      setEmpresas(empData);
      setApolices(apolData);
    } catch (error) {
      console.error("Error fetching data", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getBeneficiarioName = (id) => {
    const ben = beneficiarios.find(b => String(b.id) === String(id));
    return ben ? ben.nome_completo : 'Desconhecido';
  };

  const getMonthName = (monthValue) => {
    const month = months.find(m => m.value === monthValue);
    return month ? month.label : '';
  };

  const getCoparticipacoesByTipo = (tipo) => {
    if (!selectedCompanyId) return [];
    const selectedId = String(selectedCompanyId);
    const monthPadded = String(selectedMonth).padStart(2, '0');
    const selectedPeriod = `${selectedYear}-${monthPadded}`;

    let filtered = coparticipacoes.filter(c =>
      String(c.empresa_id) === selectedId &&
      c.competencia === selectedPeriod &&
      (c.tipo === tipo || (!c.tipo && tipo === 'saude'))
    );

    if (selectedColaboradorId && selectedColaboradorId !== '__all__') {
      filtered = filtered.filter(item => String(item.beneficiario_id) === String(selectedColaboradorId));
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        getBeneficiarioName(item.beneficiario_id).toLowerCase().includes(lower) ||
        (item.descricao || '').toLowerCase().includes(lower) ||
        (item.competencia || '').toLowerCase().includes(lower)
      );
    }

    return filtered;
  };

  const coparticipacoesFiltradas = useMemo(
    () => getCoparticipacoesByTipo(tipoTab),
    [coparticipacoes, selectedCompanyId, tipoTab, selectedMonth, selectedYear, searchTerm, beneficiarios, selectedColaboradorId]
  );

  const beneficiariosFiltrados = useMemo(() => {
    if (!selectedCompanyId) return [];
    const empresaSelecionada = empresas.find(e => String(e.id) === String(selectedCompanyId));
    if (!empresaSelecionada) return [];
    let idsDasEmpresas = [];
    if (empresaSelecionada.tipo === 'MATRIZ') {
      const filiais = empresas.filter(e => String(e.empresa_matriz_id) === String(selectedCompanyId));
      idsDasEmpresas = [selectedCompanyId, ...filiais.map(f => f.id)].map(String);
    } else {
      idsDasEmpresas = [String(selectedCompanyId)];
    }
    return beneficiarios.filter(b => idsDasEmpresas.includes(String(b.empresa_id)) && !b.data_exclusao);
  }, [beneficiarios, selectedCompanyId, empresas]);

  const handleAddClick = (tipo) => {
    if (!selectedCompanyId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione uma empresa antes de adicionar um registro." });
      return;
    }
    const empresaSelecionada = empresas.find(e => e.id === selectedCompanyId);
    const cnpjEmpresa = empresaSelecionada?.cnpj || '';
    if (!cnpjEmpresa) {
      toast({ variant: "destructive", title: "Erro", description: "Empresa selecionada não possui CNPJ configurado." });
      return;
    }
    setEditingId(null);
    setCurrentDependents([]);
    setSelectedDependentId('titular');
    const monthPadded = String(selectedMonth).padStart(2, '0');
    setFormData({
      empresa_id: String(selectedCompanyId),
      cnpj: cnpjEmpresa,
      beneficiario_id: '',
      nome_quem_utilizou: '',
      cpf_quem_utilizou: '',
      valor: '',
      mes: `${selectedYear}-${monthPadded}`,
      descricao: '',
      tipo: tipo || tipoTab
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (coparticipacao) => {
    setEditingId(coparticipacao.id);
    const beneficiary = beneficiarios.find(b => String(b.id) === String(coparticipacao.beneficiario_id));
    let dependents = [];
    if (beneficiary) {
      dependents = beneficiarios.filter(b =>
        b.nome_titular === beneficiary.nome_completo && b.id !== beneficiary.id
      );
    }
    setCurrentDependents(dependents);
    let whoUtilizedId = 'titular';
    if (beneficiary && coparticipacao.nome_quem_utilizou !== beneficiary.nome_completo) {
      const foundDep = dependents.find(d => d.nome_completo === coparticipacao.nome_quem_utilizou);
      if (foundDep) whoUtilizedId = String(foundDep.id);
    }
    setSelectedDependentId(whoUtilizedId);
    setFormData({
      empresa_id: String(coparticipacao.empresa_id),
      cnpj: empresas.find(e => e.id === coparticipacao.empresa_id)?.cnpj || '',
      beneficiario_id: String(coparticipacao.beneficiario_id),
      nome_quem_utilizou: coparticipacao.nome_quem_utilizou || '',
      cpf_quem_utilizou: coparticipacao.cpf_quem_utilizou || '',
      valor: coparticipacao.valor,
      mes: coparticipacao.competencia,
      descricao: coparticipacao.descricao || '',
      tipo: coparticipacao.tipo || tipoTab
    });
    setIsModalOpen(true);
  };

  const handleBeneficiaryChange = (value) => {
    const beneficiary = beneficiarios.find(b => String(b.id) === String(value));
    if (beneficiary) {
      const dependents = beneficiarios.filter(b =>
        b.nome_titular === beneficiary.nome_completo && b.id !== beneficiary.id
      );
      setCurrentDependents(dependents);
      setSelectedDependentId('titular');
      setFormData(prev => ({
        ...prev,
        beneficiario_id: value,
        nome_quem_utilizou: beneficiary.nome_completo || '',
        cpf_quem_utilizou: beneficiary.cpf || ''
      }));
    } else {
      setCurrentDependents([]);
      setSelectedDependentId('titular');
      setFormData(prev => ({ ...prev, beneficiario_id: value, nome_quem_utilizou: '', cpf_quem_utilizou: '' }));
    }
  };

  const handleDependentChange = (value) => {
    setSelectedDependentId(value);
    if (value === 'titular') {
      const beneficiary = beneficiarios.find(b => String(b.id) === String(formData.beneficiario_id));
      if (beneficiary) {
        setFormData(prev => ({ ...prev, nome_quem_utilizou: beneficiary.nome_completo, cpf_quem_utilizou: beneficiary.cpf }));
      }
    } else {
      const dependent = currentDependents.find(d => d.id === parseInt(value));
      if (dependent) {
        setFormData(prev => ({ ...prev, nome_quem_utilizou: dependent.nome_completo, cpf_quem_utilizou: dependent.cpf }));
      }
    }
  };

  const handleSave = async () => {
    const rawData = {
      empresa_id: formData.empresa_id,
      beneficiario_id: formData.beneficiario_id,
      competencia: formData.mes,
      valor: formData.valor,
      descricao: formData.descricao,
      nome_quem_utilizou: formData.nome_quem_utilizou,
      cpf_quem_utilizou: formData.cpf_quem_utilizou,
      tipo: formData.tipo,
      data_registro: new Date().toISOString()
    };

    const cleanedData = cleanCoparticipacaoData(rawData);
    const errors = validateCoparticipacao(cleanedData);

    if (errors.length > 0) {
      toast({ variant: "destructive", title: "Erro de Validação", description: errors[0] });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await coparticipacaoService.updateCoparticipacao(editingId, cleanedData);
        setCoparticipacoes(prev => prev.map(item => item.id === editingId ? { ...item, ...cleanedData } : item));
        toast({ title: "Sucesso", description: "Registro atualizado com sucesso." });
      } else {
        const created = await coparticipacaoService.createCoparticipacao(cleanedData);
        setCoparticipacoes(prev => [...prev, created]);
        toast({ title: "Sucesso", description: "Coparticipação registrada com sucesso." });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar registro." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      try {
        await coparticipacaoService.deleteCoparticipacao(id);
        setCoparticipacoes(prev => prev.filter(item => item.id !== id));
        toast({ title: "Excluído", description: "Registro removido com sucesso." });
      } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir registro." });
      }
    }
  };

  const handleExportPDF = (data, tipo) => {
    if (data.length === 0) {
      toast({ variant: "warning", description: "Não há dados para exportar." });
      return;
    }
    const tipoExport = tipo || tipoTab;
    const tipoLabel = tipoExport === 'saude' ? 'Saúde' : 'Odonto';
    const monthPadded = String(selectedMonth).padStart(2, '0');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho azul
    doc.setFillColor(0, 53, 128);
    doc.rect(0, 0, pageWidth, 36, 'F');

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 8, 6, 26, 20);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Ágil Seguros', logoBase64 ? 40 : 14, 15);

    const empAtual = empresas.find(e => String(e.id) === String(selectedCompanyId));
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    if (empAtual) {
      doc.text(empAtual.nome_fantasia || empAtual.razao_social || '', logoBase64 ? 40 : 14, 22);
      doc.text(`CNPJ: ${formatCpfCnpj(empAtual.cnpj || '')}`, logoBase64 ? 40 : 14, 28);
    }

    const seguradora = getSeguradora(tipoExport);
    if (seguradora) {
      doc.text(`Seguradora: ${seguradora}`, pageWidth - 8, 22, { align: 'right' });
    }

    // Título do relatório
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`Relatório de Coparticipação — ${tipoLabel}`, 14, 48);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${getMonthName(selectedMonth)} de ${selectedYear}`, 14, 55);

    const tableColumn = ["Mês", "Beneficiário", "CNPJ/CPF", "Quem Utilizou", "CPF Utilizador", "Valor (R$)", "Descrição"];
    const tableRows = data.map(item => {
      const emp = empresas.find(e => e.id === item.empresa_id);
      return [
        item.competencia,
        getBeneficiarioName(item.beneficiario_id),
        emp?.cnpj ? formatCpfCnpj(emp.cnpj) : (emp?.cpf || '-'),
        item.nome_quem_utilizou || '-',
        item.cpf_quem_utilizou ? formatCpfCnpj(item.cpf_quem_utilizou) : '-',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor),
        item.descricao || '-'
      ];
    });

    const total = data.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    tableRows.push([
      { content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total), styles: { halign: 'right', fontStyle: 'bold' } },
      ''
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      headStyles: { fillColor: [0, 53, 128], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, h - 8, { align: 'right' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, h - 8);
    }

    doc.save(`coparticipacao_${tipoExport}_${selectedCompanyId}_${selectedYear}-${monthPadded}.pdf`);
    toast({ description: "Exportação PDF concluída!" });
  };

  const handleExportExcel = (data, tipo) => {
    if (data.length === 0) {
      toast({ variant: "warning", description: "Não há dados para exportar." });
      return;
    }
    const tipoExport = tipo || tipoTab;
    const exportData = data.map(item => {
      const emp = empresas.find(e => e.id === item.empresa_id);
      return {
        "Mês": item.competencia,
        "Beneficiário": getBeneficiarioName(item.beneficiario_id),
        "CNPJ/CPF": emp?.cnpj || emp?.cpf || '-',
        "Quem Utilizou": item.nome_quem_utilizou || '-',
        "CPF Utilizador": item.cpf_quem_utilizou || '-',
        "Valor": item.valor,
        "Descrição": item.descricao || ''
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Coparticipacao");
    XLSX.writeFile(workbook, `coparticipacao_${tipoExport}_${selectedCompanyId}_${selectedYear}-${String(selectedMonth).padStart(2,'0')}.xlsx`);
    toast({ description: "Exportação Excel concluída!" });
  };

  const HistoricoCard = ({ tipo }) => {
    const data = getCoparticipacoesByTipo(tipo);
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Histórico de Lançamentos</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId}>
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os colaboradores</SelectItem>
                  {beneficiariosFiltrados.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full md:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExportPDF(data, tipo)} disabled={data.length === 0}>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportExcel(data, tipo)} disabled={data.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button onClick={() => handleAddClick(tipo)} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!selectedCompanyId}>
                <Plus className="mr-2 h-4 w-4" /> Registrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />Carregando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Mês</th>
                    <th className="px-4 py-3">Beneficiário</th>
                    <th className="px-4 py-3">CNPJ Vinculado</th>
                    <th className="px-4 py-3">Quem Utilizou</th>
                    <th className="px-4 py-3">CPF Utilizador</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Valor (R$)</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.length > 0 ? (
                    data.map((item) => {
                      const emp = empresas.find(e => e.id === item.empresa_id);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.competencia}</td>
                          <td className="px-4 py-3">{getBeneficiarioName(item.beneficiario_id)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{emp?.cnpj ? formatCpfCnpj(emp.cnpj) : '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{item.nome_quem_utilizou || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{item.cpf_quem_utilizou ? formatCpfCnpj(item.cpf_quem_utilizou) : '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{item.descricao || '-'}</td>
                          <td className="px-4 py-3 text-green-600 font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                                <Edit2 className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {selectedCompanyId
                          ? `Nenhum registro de ${tipo === 'saude' ? 'Saúde' : 'Odonto'} encontrado para ${getMonthName(selectedMonth)}/${selectedYear}.`
                          : 'Selecione uma empresa no dashboard para visualizar os registros.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Coparticipação - Gestão</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Coparticipação</h1>
            {(() => { const emp = empresas.find(e => String(e.id) === String(selectedCompanyId)); return emp ? <p className="text-white font-medium">{emp.nome_fantasia || emp.razao_social} · <span className="text-white/70">{formatCpfCnpj(emp.cnpj || emp.cpf)}</span></p> : null; })()}
            <p className="text-white/70">Gerencie os valores de coparticipação mensal por empresa.</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>

        <Tabs value={tipoTab} onValueChange={setTipoTab} className="space-y-4">
          <TabsList className="bg-white/10">
            <TabsTrigger value="saude" className="text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              Saúde
            </TabsTrigger>
            <TabsTrigger value="odonto" className="text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#003580]">
              Odonto
            </TabsTrigger>
          </TabsList>

          {['saude', 'odonto'].map((tipo) => (
            <TabsContent key={tipo} value={tipo} className="space-y-4">
              {/* Month/Year selector */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <Label>Mês</Label>
                      <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(m => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Ano</Label>
                      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <HistoricoCard tipo={tipo} />
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Coparticipação' : 'Registrar Coparticipação'} — {formData.tipo === 'saude' ? 'Saúde' : 'Odonto'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="cnpj_vinculado">CNPJ/CPF (Vinculado)</Label>
                <Input id="cnpj_vinculado" value={formData.cnpj ? formatCpfCnpj(formData.cnpj) : ''} readOnly disabled className="bg-gray-100 text-gray-600" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="beneficiario">Beneficiário (Titular) *</Label>
                <Select value={String(formData.beneficiario_id)} onValueChange={handleBeneficiaryChange}>
                  <SelectTrigger id="beneficiario">
                    <SelectValue placeholder="Selecione o beneficiário titular..." />
                  </SelectTrigger>
                  <SelectContent>
                    {beneficiariosFiltrados.length > 0 ? (
                      beneficiariosFiltrados.map((ben) => (
                        <SelectItem key={ben.id} value={String(ben.id)}>{ben.nome_completo}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-center text-muted-foreground">Nenhum beneficiário encontrado.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quem_utilizou">Quem Utilizou</Label>
                  <Select value={selectedDependentId} onValueChange={handleDependentChange} disabled={!formData.beneficiario_id}>
                    <SelectTrigger id="quem_utilizou">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="titular">Titular</SelectItem>
                      {currentDependents.map((dep) => (
                        <SelectItem key={dep.id} value={String(dep.id)}>Dep: {dep.nome_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cpf_quem_utilizou">CPF de Quem Utilizou</Label>
                  <Input id="cpf_quem_utilizou" value={formData.cpf_quem_utilizou} readOnly className="bg-gray-50" placeholder="CPF será preenchido automaticamente" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input id="valor" type="number" step="0.01" min="0" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} placeholder="0,00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mes">Competência (Mês/Ano) *</Label>
                  <Input id="mes" type="month" value={formData.mes} onChange={(e) => setFormData({...formData, mes: e.target.value})} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição (Opcional)</Label>
                <Input id="descricao" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Ex: Consulta dermatologista" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CoparticipacaoPage;
