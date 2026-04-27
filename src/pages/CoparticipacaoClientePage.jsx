import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, FileText, ArrowLeft, Calendar, Loader2, Search, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Services
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { empresasService } from '@/services/empresasService';
import { apolicesService } from '@/services/apolicesService';
import { formatCpfCnpj } from '@/lib/masks';

const CoparticipacaoClientePage = () => {
  const navigate = useNavigate();
  const { empresaId } = useParams();
  const { setSelectedCompanyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();

  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [logoBase64, setLogoBase64] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tipoFiltro, setTipoFiltro] = useState('saude');
  const [selectedColaboradorId, setSelectedColaboradorId] = useState('__all__');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao carregar dados de coparticipação."
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (empresaId) {
      setSelectedCompanyId(parseInt(empresaId));
    }
  }, [empresaId, setSelectedCompanyId]);

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

  const getSeguradora = () => {
    const ap = apolices.find(a =>
      String(a.empresa_id) === String(empresaId) &&
      a.segmento === 'saude-vida-odonto'
    );
    return ap?.seguradora || null;
  };

  const beneficiariosDaEmpresa = useMemo(() =>
    beneficiarios.filter(b => String(b.empresa_id) === String(empresaId)),
    [beneficiarios, empresaId]
  );

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

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = 0; i < 6; i++) arr.push(currentYear - i);
    return arr;
  }, []);

  const filteredCoparticipacoes = useMemo(() => {
    if (!empresaId) return [];
    const monthPadded = String(selectedMonth).padStart(2, '0');
    const selectedPeriod = `${selectedYear}-${monthPadded}`;
    let result = coparticipacoes.filter(c =>
      String(c.empresa_id) === String(empresaId) &&
      c.competencia === selectedPeriod &&
      (c.tipo === tipoFiltro || (!c.tipo && tipoFiltro === 'saude'))
    );
    if (selectedColaboradorId && selectedColaboradorId !== '__all__') {
      result = result.filter(c => String(c.beneficiario_id) === String(selectedColaboradorId));
    }
    return result;
  }, [coparticipacoes, empresaId, selectedMonth, selectedYear, tipoFiltro, selectedColaboradorId]);

  const totalMes = useMemo(() => {
    return filteredCoparticipacoes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
  }, [filteredCoparticipacoes]);

  useEffect(() => { setCurrentPage(1); }, [filteredCoparticipacoes.length, tipoFiltro, selectedColaboradorId, selectedMonth, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredCoparticipacoes.length / ITEMS_PER_PAGE));
  const pageData = filteredCoparticipacoes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getBeneficiarioName = (id) => {
    const ben = beneficiarios.find(b => String(b.id) === String(id));
    return ben ? ben.nome_completo : 'Desconhecido';
  };

  const getMonthName = (monthValue) => {
    const month = months.find(m => m.value === monthValue);
    return month ? month.label : '';
  };

  const handleExportPDF = () => {
    if (filteredCoparticipacoes.length === 0) {
      toast({ variant: "destructive", description: "Não há dados para exportar." });
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const empresaAtual = empresas.find(e => String(e.id) === String(empresaId));
    const mesLabel = getMonthName(selectedMonth);
    const tipoLabel = tipoFiltro === 'saude' ? 'Saúde' : 'Odonto';
    const monthPadded = String(selectedMonth).padStart(2, '0');

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

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    if (empresaAtual) {
      doc.text(empresaAtual.nome_fantasia || empresaAtual.razao_social || '', logoBase64 ? 40 : 14, 22);
      doc.text(`CNPJ: ${formatCpfCnpj(empresaAtual.cnpj || '')}`, logoBase64 ? 40 : 14, 28);
    }

    const seguradora = getSeguradora();
    if (seguradora) {
      doc.text(`Seguradora: ${seguradora}`, pageWidth - 8, 22, { align: 'right' });
    }

    // Título
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`Relatório de Coparticipação — ${tipoLabel}`, 14, 48);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${mesLabel} de ${selectedYear}`, 14, 55);

    const tableColumn = ["Beneficiário Titular", "Quem Utilizou", "CPF Utilizador", "Descrição", "Valor (R$)"];
    const tableRows = filteredCoparticipacoes.map(item => [
      getBeneficiarioName(item.beneficiario_id),
      item.nome_quem_utilizou || '-',
      item.cpf_quem_utilizou ? formatCpfCnpj(item.cpf_quem_utilizou) : '-',
      item.descricao || '-',
      new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(item.valor)
    ]);
    tableRows.push([
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(totalMes), styles: { halign: 'right', fontStyle: 'bold' } }
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      headStyles: { fillColor: [0, 53, 128], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, h - 8, { align: 'right' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, h - 8);
    }

    doc.save(`coparticipacao_${tipoFiltro}_${empresaAtual?.cnpj}_${selectedYear}-${monthPadded}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredCoparticipacoes.length === 0) {
      toast({ variant: "destructive", description: "Não há dados para exportar." });
      return;
    }
    const empresaAtual = empresas.find(e => String(e.id) === String(empresaId));
    const dataToExport = filteredCoparticipacoes.map(item => ({
      "Beneficiário Titular": getBeneficiarioName(item.beneficiario_id),
      "Quem Utilizou": item.nome_quem_utilizou || '-',
      "CPF Utilizador": item.cpf_quem_utilizou || '-',
      "Descrição / Procedimento": item.descricao || '-',
      "Valor (R$)": item.valor
    }));
    dataToExport.push({ "Beneficiário Titular": "", "Quem Utilizou": "", "CPF Utilizador": "", "Descrição / Procedimento": "TOTAL", "Valor (R$)": totalMes });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Coparticipação");
    worksheet["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }];

    const monthPadded = String(selectedMonth).padStart(2, '0');
    XLSX.writeFile(workbook, `coparticipacao_${tipoFiltro}_${empresaAtual?.cnpj}_${selectedYear}-${monthPadded}.xlsx`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  const tipoLabel = tipoFiltro === 'saude' ? 'Saúde' : 'Odonto';

  return (
    <DashboardLayout>
      <Helmet>
        <title>Minha Coparticipação - Portal do Cliente</title>
      </Helmet>

      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/select-segmento')} className="text-sm text-white/60 hover:text-white transition-colors">Meus Seguros</button>
          <ChevronRight className="h-4 w-4 text-white/30" />
          <span className="text-sm text-white">Minha Coparticipação</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Minha Coparticipação</h1>
          <p className="text-white/70">Visualize os lançamentos mensais de coparticipação vinculados ao seu CNPJ.</p>
        </div>

        {/* Filter & Summary */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Filtrar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo selector */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="odonto">Odonto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Month & Year */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Mês</Label>
                  <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Ano</Label>
                  <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um ano" />
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

          <Card className="md:col-span-2 bg-[#003580] text-white border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5" /> Resumo {tipoLabel}
              </CardTitle>
              <CardDescription className="text-blue-100">
                {(() => { const emp = empresas.find(e => String(e.id) === String(empresaId)); return emp ? `${emp.nome_fantasia || emp.razao_social} · ${formatCpfCnpj(emp.cnpj || emp.cpf)}` : ''; })()}
              </CardDescription>
              <CardDescription className="text-blue-100">
                Total de coparticipações de {tipoLabel.toLowerCase()} lançadas em {getMonthName(selectedMonth)} de {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMes)}
                  </p>
                  <p className="text-sm text-blue-100 mt-1">
                    {filteredCoparticipacoes.length} {filteredCoparticipacoes.length === 1 ? 'lançamento' : 'lançamentos'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Detalhamento</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os colaboradores</SelectItem>
                  {beneficiariosDaEmpresa.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredCoparticipacoes.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Baixar Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredCoparticipacoes.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Baixar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Beneficiário Titular</th>
                    <th className="px-4 py-3">Quem Utilizou</th>
                    <th className="px-4 py-3">CPF Utilizador</th>
                    <th className="px-4 py-3">Descrição / Procedimento</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCoparticipacoes.length > 0 ? (
                    pageData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{getBeneficiarioName(item.beneficiario_id)}</td>
                        <td className="px-4 py-3 text-gray-600">{item.nome_quem_utilizou || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{item.cpf_quem_utilizou ? formatCpfCnpj(item.cpf_quem_utilizou) : '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.descricao || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Calendar className="h-10 w-10 mb-2 opacity-20" />
                          <p>Nenhuma coparticipação de {tipoLabel.toLowerCase()} encontrada para este período.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredCoparticipacoes.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-gray-600">TOTAL:</td>
                      <td className="px-4 py-3 text-right text-blue-700 text-base">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMes)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {filteredCoparticipacoes.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t mt-2">
                <p className="text-sm text-gray-500">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCoparticipacoes.length)} de {filteredCoparticipacoes.length} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm font-medium px-2">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Próximo</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CoparticipacaoClientePage;
