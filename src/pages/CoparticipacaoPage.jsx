import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, ArrowLeft, Loader2, Search, Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { supabase } from '@/lib/customSupabaseClient';

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

  // Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'parsing' | 'preview'
  const [importedRows, setImportedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importTipo, setImportTipo] = useState('saude');

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoTab, setTipoTab] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

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
      a.segmento === 'SAUDE_VIDA_ODONTO'
    );
    return ap?.seguradora || null;
  };

  // ── Importação de planilha ──────────────────────────────────────────
  const normalizeStr = (s) =>
    String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  const autoMatchBeneficiario = (nome) => {
    if (!nome) return null;
    const n = normalizeStr(nome);
    let found = beneficiariosFiltrados.find(b => normalizeStr(b.nome_completo) === n);
    if (!found) {
      const words = n.split(/\s+/).filter(w => w.length > 3);
      if (words.length > 0) {
        found = beneficiariosFiltrados.find(b => {
          const bw = normalizeStr(b.nome_completo);
          return words.filter(w => bw.includes(w)).length >= Math.min(2, words.length);
        });
      }
    }
    return found || null;
  };

  const detectCols = (headers) => {
    const cols = { beneficiario: -1, quemUtilizou: -1, cpf: -1, valor: -1, descricao: -1 };
    headers.forEach((h, i) => {
      const nh = normalizeStr(h);
      if (cols.beneficiario === -1 && /titular|beneficiario|nome|segurado|empregado|colaborador/.test(nh)) cols.beneficiario = i;
      if (cols.quemUtilizou === -1 && /utilizou|dependente|usuario|utilizador|paciente/.test(nh)) cols.quemUtilizou = i;
      if (cols.cpf === -1 && /cpf/.test(nh)) cols.cpf = i;
      if (cols.valor === -1 && /valor|custo|coparticip|total/.test(nh)) cols.valor = i;
      if (cols.descricao === -1 && /descri|procedimento|servico|especialidade|tipo/.test(nh)) cols.descricao = i;
    });
    return cols;
  };

  const handlePdfImport = async (file) => {
    setIsParsing(true);
    setImportStep('parsing');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);
      const pdfBase64 = btoa(binary);

      const { data: result, error } = await supabase.functions.invoke('parse-coparticipacao-pdf', {
        body: { pdfBase64 },
      });

      if (error) throw new Error(error.message || 'Erro na Edge Function.');
      if (!result?.data?.length) throw new Error('O PDF não contém dados de coparticipação reconhecíveis.');

      const rows = result.data.map(item => {
        const matched = autoMatchBeneficiario(item.nome_beneficiario);
        return {
          nome_detectado: item.nome_beneficiario || '',
          beneficiario_id: matched ? String(matched.id) : '',
          quem_utilizou: item.quem_utilizou || item.nome_beneficiario || '',
          cpf_quem_utilizou: (item.cpf_quem_utilizou || '').replace(/\D/g, ''),
          valor: parseFloat(item.valor) || 0,
          descricao: item.descricao || '',
        };
      }).filter(r => r.nome_detectado || r.valor > 0);

      if (rows.length === 0) {
        toast({ variant: 'destructive', title: 'Nenhum dado identificado', description: 'Verifique se o PDF é um relatório de coparticipação.' });
        setImportStep('upload');
        return;
      }
      setImportedRows(rows);
      setImportStep('preview');
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      toast({ variant: 'destructive', title: 'Erro ao processar PDF', description: err.message || 'Verifique se o arquivo é válido e tente novamente.' });
      setImportStep('upload');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileImport = async (file) => {
    if (!file) return;
    if (!selectedCompanyId) {
      toast({ variant: 'destructive', title: 'Selecione uma empresa', description: 'Selecione uma empresa antes de importar.' });
      return;
    }
    if (file.name.match(/\.pdf$/i)) {
      return handlePdfImport(file);
    }
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ variant: 'destructive', title: 'Formato não suportado', description: 'Use arquivos .pdf, .xlsx, .xls ou .csv.' });
      return;
    }
    try {
      const raw = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }));
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      // Encontra linha de cabeçalho
      let headerIdx = 0;
      for (let i = 0; i < Math.min(15, raw.length); i++) {
        if (raw[i].filter(c => c !== '').length >= 3) { headerIdx = i; break; }
      }
      const headers = raw[headerIdx].map(String);
      const cols = detectCols(headers);
      const dataRows = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

      const rows = dataRows.map(r => {
        const nomeDetectado = cols.beneficiario >= 0 ? String(r[cols.beneficiario] || '').trim() : '';
        const matched = autoMatchBeneficiario(nomeDetectado);
        const quemRaw = cols.quemUtilizou >= 0 ? String(r[cols.quemUtilizou] || '').trim() : '';
        const cpfRaw = cols.cpf >= 0 ? String(r[cols.cpf] || '').replace(/\D/g, '') : '';
        const valorRaw = cols.valor >= 0 ? r[cols.valor] : 0;
        const valor = parseFloat(String(valorRaw).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        const descricao = cols.descricao >= 0 ? String(r[cols.descricao] || '').trim() : '';
        return {
          nome_detectado: nomeDetectado,
          beneficiario_id: matched ? String(matched.id) : '',
          quem_utilizou: quemRaw || matched?.nome_completo || nomeDetectado,
          cpf_quem_utilizou: cpfRaw || (matched?.cpf || '').replace(/\D/g, ''),
          valor,
          descricao,
        };
      }).filter(r => r.nome_detectado || r.valor > 0);

      if (rows.length === 0) {
        toast({ variant: 'destructive', title: 'Nenhum dado identificado', description: 'Verifique se a planilha está no formato correto.' });
        return;
      }
      setImportedRows(rows);
      setImportStep('preview');
    } catch (err) {
      console.error('Erro ao parsear arquivo:', err);
      toast({ variant: 'destructive', title: 'Erro ao ler arquivo', description: 'Verifique se o arquivo não está corrompido.' });
    }
  };

  const handleConfirmImport = async () => {
    const validRows = importedRows.filter(r => r.beneficiario_id && r.valor > 0);
    if (validRows.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum registro válido', description: 'Atribua um beneficiário a pelo menos um registro.' });
      return;
    }
    setIsImporting(true);
    const monthPadded = String(selectedMonth).padStart(2, '0');
    const competencia = `${selectedYear}-${monthPadded}`;
    try {
      const results = await Promise.allSettled(validRows.map(r => {
        const ben = beneficiarios.find(b => String(b.id) === String(r.beneficiario_id));
        return coparticipacaoService.createCoparticipacao({
          empresa_id: selectedCompanyId,
          beneficiario_id: parseInt(r.beneficiario_id),
          competencia,
          valor: r.valor,
          descricao: r.descricao || '',
          nome_quem_utilizou: r.quem_utilizou || ben?.nome_completo || '',
          cpf_quem_utilizou: r.cpf_quem_utilizou || '',
          tipo: importTipo,
          data_registro: new Date().toISOString()
        });
      }));
      const created = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').length;
      setCoparticipacoes(prev => [...prev, ...created]);
      if (failed > 0) {
        toast({ variant: 'destructive', title: 'Importação parcial', description: `${created.length} importados, ${failed} falhou(aram).` });
      } else {
        toast({ title: 'Importação concluída!', description: `${created.length} registro(s) importados com sucesso.` });
      }
      setIsImportModalOpen(false);
      setImportStep('upload');
      setImportedRows([]);
    } catch (err) {
      console.error('Erro na importação:', err);
      toast({ variant: 'destructive', title: 'Erro na importação', description: 'Verifique os dados e tente novamente.' });
    } finally {
      setIsImporting(false);
    }
  };
  // ── Fim importação ─────────────────────────────────────────────────

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
    const month = months.find(m => String(m.value) === String(monthValue));
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
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    useEffect(() => { setCurrentPage(1); }, [selectedColaboradorId, searchTerm, selectedMonth, selectedYear, tipo]);
    const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
    const pageData = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
              <Button variant="outline" size="sm" onClick={() => { setImportTipo(tipo); setImportStep('upload'); setImportedRows([]); setIsImportModalOpen(true); }} disabled={!selectedCompanyId}>
                <Upload className="mr-2 h-4 w-4" /> Importar
              </Button>
              <Button size="sm" onClick={() => handleAddClick(tipo)} className="bg-[#003580] hover:bg-[#002060] text-white" disabled={!selectedCompanyId}>
                Registrar
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
                    pageData.map((item) => {
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
          {data.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t mt-2">
              <p className="text-sm text-gray-500">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, data.length)} de {data.length} registros
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Coparticipação</h1>
            {(() => { const emp = empresas.find(e => String(e.id) === String(selectedCompanyId)); return emp ? <p className="text-white font-medium">{emp.nome_fantasia || emp.razao_social} · <span className="text-white/70">{formatCpfCnpj(emp.cnpj || emp.cpf)}</span></p> : null; })()}
            <p className="text-white/70">Gerencie os valores de coparticipação mensal por empresa.</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>

        {/* Card de filtros em sequência */}
        <Card>
          <CardContent className="pt-5 space-y-5">

            {/* Passo 1 — Tipo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Tipo de Coparticipação</Label>
              <div className="flex gap-3">
                {['saude', 'odonto'].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => { setTipoTab(tipo); setSelectedMonth(''); setSelectedYear(''); setSearchTerm(''); setSelectedColaboradorId('__all__'); }}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      tipoTab === tipo
                        ? 'border-[#003580] bg-[#003580] text-white shadow'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#003580] hover:text-[#003580]'
                    }`}
                  >
                    {tipo === 'saude' ? 'Saúde' : 'Odonto'}
                  </button>
                ))}
              </div>
            </div>

            {/* Passo 2 — Mês e Ano (só aparece após escolher tipo) */}
            {tipoTab && (
              <div className="flex flex-wrap gap-4 items-end border-t pt-4">
                <div className="space-y-1">
                  <Label>Mês</Label>
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ano</Label>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(v)}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Ano" /></SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Passo 3 — Histórico (só aparece após escolher tipo + mês + ano) */}
        {tipoTab && selectedMonth && selectedYear && <HistoricoCard tipo={tipoTab} />}

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

        {/* Modal de Importação */}
        <Dialog open={isImportModalOpen} onOpenChange={(open) => { if (!open) { setIsImportModalOpen(false); setImportStep('upload'); setImportedRows([]); } }}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Importar Coparticipação — {importTipo === 'saude' ? 'Saúde' : 'Odonto'}
              </DialogTitle>
            </DialogHeader>

            {importStep === 'upload' && (
              <div className="py-6 space-y-6">
                <div className="flex gap-4 items-end">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select value={importTipo} onValueChange={setImportTipo}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="odonto">Odonto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-500">
                    Mês de competência: <strong>{getMonthName(selectedMonth)}/{selectedYear}</strong>
                  </div>
                </div>

                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Upload className="h-8 w-8 text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-blue-600">Clique para selecionar o arquivo</p>
                  <p className="text-xs text-gray-500 mt-1">Formatos aceitos: .pdf, .xlsx, .xls, .csv</p>
                  <p className="text-xs text-gray-400 mt-1">PDF da seguradora: Claude AI extrai os dados automaticamente</p>
                  <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => { if (e.target.files?.[0]) handleFileImport(e.target.files[0]); }} />
                </label>

                <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
                  <p className="font-medium text-gray-700">Como funciona:</p>
                  <p>1. <strong>PDF da seguradora:</strong> o sistema usa IA para ler e extrair os dados automaticamente.</p>
                  <p>2. <strong>Planilha (.xlsx/.csv):</strong> detecta as colunas de Beneficiário, Quem Utilizou, CPF e Valor.</p>
                  <p>3. Você revisa e confirma os dados antes de salvar.</p>
                </div>
              </div>
            )}

            {importStep === 'parsing' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-700">Lendo o PDF com IA...</p>
                <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
              </div>
            )}

            {importStep === 'preview' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-green-700">{importedRows.filter(r => r.beneficiario_id).length}</span> de <span className="font-medium">{importedRows.length}</span> registros com beneficiário identificado
                    {importedRows.filter(r => !r.beneficiario_id).length > 0 && (
                      <span className="ml-2 text-yellow-700">· {importedRows.filter(r => !r.beneficiario_id).length} sem correspondência</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setImportStep('upload'); setImportedRows([]); }}>
                    <X className="h-4 w-4 mr-1" /> Trocar arquivo
                  </Button>
                </div>
                <div className="overflow-auto flex-1 mt-2">
                  <table className="w-full text-xs text-left min-w-[700px]">
                    <thead className="bg-gray-100 text-gray-700 uppercase">
                      <tr>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Nome Detectado</th>
                        <th className="px-3 py-2">Beneficiário (Titular)</th>
                        <th className="px-3 py-2">Quem Utilizou</th>
                        <th className="px-3 py-2">Valor (R$)</th>
                        <th className="px-3 py-2">Descrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importedRows.map((row, i) => (
                        <tr key={i} className={row.beneficiario_id ? 'bg-white' : 'bg-yellow-50'}>
                          <td className="px-3 py-2">
                            {row.beneficiario_id
                              ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                              : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{row.nome_detectado || '-'}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={row.beneficiario_id || '__none__'}
                              onValueChange={(val) => setImportedRows(prev => prev.map((r, j) => {
                                if (j !== i) return r;
                                const ben = beneficiariosFiltrados.find(b => String(b.id) === val);
                                return { ...r, beneficiario_id: val === '__none__' ? '' : val, quem_utilizou: ben?.nome_completo || r.quem_utilizou, cpf_quem_utilizou: ben?.cpf?.replace(/\D/g,'') || r.cpf_quem_utilizou };
                              }))}
                            >
                              <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Não importar —</SelectItem>
                                {beneficiariosFiltrados.map(b => (
                                  <SelectItem key={b.id} value={String(b.id)}>{b.nome_completo}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{row.quem_utilizou || '-'}</td>
                          <td className="px-3 py-2 font-medium text-green-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor)}
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{row.descricao || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DialogFooter className="pt-4 border-t mt-2">
                  <Button variant="outline" onClick={() => { setIsImportModalOpen(false); setImportStep('upload'); setImportedRows([]); }}>Cancelar</Button>
                  <Button onClick={handleConfirmImport} className="bg-[#003580] hover:bg-[#002060] text-white" disabled={isImporting || importedRows.filter(r => r.beneficiario_id && r.valor > 0).length === 0}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importar {importedRows.filter(r => r.beneficiario_id && r.valor > 0).length} registro(s)
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CoparticipacaoPage;
