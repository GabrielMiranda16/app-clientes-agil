import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserCheck, UserX, UserMinus, Plus, Edit, Trash2, Search, Loader2, Info, Heart, Smile, Hotel as Hospital, ExternalLink, CheckCircle2, Calendar, Timer, RotateCcw, AlertCircle, X, User, ClipboardList, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, DollarSign, Upload, FileSpreadsheet, FileText as FilePdf, CheckCheck, AlertTriangle, Receipt, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { applyCpfMask, applyPhoneMask, applyCepMask, formatCpfCnpj } from '@/lib/masks';
import { calculateAge, formatCurrency, formatDate } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';

// Services
import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { boletosService } from '@/services/boletosService';
import { supabase } from '@/lib/customSupabaseClient';

const emptyBeneficiario = {
  nome_completo: '', cpf: '', parentesco: '', data_nascimento: '', nome_mae: '', nome_titular: '', celular: '', email_beneficiario: '', 
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  matricula_empresa: '', data_admissao: '', observacoes: '', situacao: 'ATIVO', data_inatividade: '', data_afastamento: '', motivo_afastamento: '',
  saude_ativo: false, saude_plano_nome: '', saude_acomodacao: '', saude_data_inclusao: '', saude_data_exclusao: '', saude_numero_carteirinha: '', saude_link_carteirinha: '', saude_valor_fatura: 0, saude_coparticipacao: 'Não', saude_codigo_empresa: '', saude_produto: '',
  vida_ativo: false, vida_plano_nome: '', vida_data_inclusao: '', vida_data_exclusao: '', vida_numero_carteirinha: '', vida_link_carteirinha: '', vida_valor_fatura: 0, vida_codigo_empresa: '', vida_produto: '',
  odonto_ativo: false, odonto_plano_nome: '', odonto_data_inclusao: '', odonto_data_exclusao: '', odonto_numero_carteirinha: '', odonto_link_carteirinha: '', odonto_valor_fatura: 0, odonto_codigo_empresa: '', odonto_produto: '',
};

const FormField = ({ id, label, children, tooltip }) => (
  <div className="space-y-2"><div className="flex items-center space-x-2"><Label htmlFor={id}>{label}</Label>{tooltip && (<TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger type="button"><Info className="h-4 w-4 text-gray-500" /></TooltipTrigger><TooltipContent><p>{tooltip}</p></TooltipContent></Tooltip></TooltipProvider>)}</div>{children}</div>
);

const DateInput = ({ id, value, onChange, disabled }) => {
  const ref = React.useRef(null);
  const openPicker = () => { if (ref.current) { if (ref.current.showPicker) ref.current.showPicker(); else ref.current.click(); } };
  return (
    <div className="flex items-center gap-2">
      <Input ref={ref} id={id} type="date" value={value} onChange={onChange} disabled={disabled}
        className="flex-1 min-w-[120px] [&::-webkit-calendar-picker-indicator]:hidden" />
      {!disabled && (
        <button type="button" onClick={openPicker} className="shrink-0 p-2 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 transition-colors">
          <Calendar className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const verificarPlanoPreenchido = (tipoPlano, formData) => {
  const camposPlano = Object.keys(formData).filter(key => key.startsWith(`${tipoPlano}_`) && key !== `${tipoPlano}_ativo`);
  for (const campo of camposPlano) {
    const valor = formData[campo];
    if (valor !== '' && valor !== 0 && valor !== '0' && valor !== null && valor !== undefined) {
      return true;
    }
  }
  return false;
};

const getTempoDecorrido = (dataStr) => {
    if (!dataStr) return '-';
    const start = new Date(dataStr);
    const end = new Date();
    const diffMins = Math.max(0, differenceInMinutes(end, start));
    const days = Math.floor(diffMins / (24 * 60));
    const hours = Math.floor((diffMins % (24 * 60)) / 60);
    return `${days}d ${hours}h`;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'PENDENTE': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800 hover:bg-yellow-100 border-yellow-200';
    case 'EM PROCESSAMENTO': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800 hover:bg-blue-100 border-blue-200';
    case 'CONCLUIDA': return 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 hover:bg-green-100 border-green-200';
    case 'REJEITADA': return 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 hover:bg-red-100 border-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const PlanCheckboxIcon = ({ label, checked }) => (
  <div className="flex items-center gap-2 cursor-default pointer-events-none" onClick={(e) => e.stopPropagation()}>
    <div className="flex items-center justify-center h-5 w-5">
       {checked ? <CheckCircle2 className="h-5 w-5 text-[#003580]" /> : <div className="h-5 w-5" />}
    </div>
    <span className="text-sm font-medium leading-none">{label}</span>
  </div>
);

const ModalFormContent = React.memo(({ formData, setFormData, age, titulares, isCliente, openSolicitacaoDialog, renderPlanStatusCard, setIsExclusaoModalOpen, setExclusaoData, beneficiario, handleSolicitarAlteracao }) => {
  const { toast } = useToast();
  const [isCepLoading, setIsCepLoading] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    let finalValue = value;
    if (id === 'cpf') finalValue = applyCpfMask(value);
    if (id === 'celular') finalValue = applyPhoneMask(value);
    if (id === 'cep') finalValue = applyCepMask(value);
    
    setFormData(prev => {
      const newFormData = { ...prev, [id]: finalValue };
      if (id.startsWith('saude_') && id !== 'saude_ativo') {
        newFormData.saude_ativo = verificarPlanoPreenchido('saude', newFormData);
      } else if (id.startsWith('vida_') && id !== 'vida_ativo') {
        newFormData.vida_ativo = verificarPlanoPreenchido('vida', newFormData);
      } else if (id.startsWith('odonto_') && id !== 'odonto_ativo') {
        newFormData.odonto_ativo = verificarPlanoPreenchido('odonto', newFormData);
      }
      return newFormData;
    });
  };

  const buscarCep = async (cepValue) => {
    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setIsCepLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      if (!response.ok) throw new Error('CEP não encontrado');
      const data = await response.json();
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado', description: 'Por favor, verifique o CEP digitado.' });
        return;
      }
      setFormData(prev => ({ ...prev, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP', description: 'Não foi possível buscar o endereço. Tente novamente.' });
    } finally {
      clearTimeout(timeout);
      setIsCepLoading(false);
    }
  };

  const handleCepBlur = (e) => buscarCep(e.target.value);

  const handleSelectChange = (id, value) => {
    setFormData(prev => {
      const newState = { ...prev, [id]: value };
      if (id === 'situacao') {
          if (value !== 'AFASTADO') {
            newState.data_afastamento = '';
            newState.motivo_afastamento = '';
          }
          if (value !== 'INATIVO') {
            newState.data_inatividade = '';
          }
      }
      if (id === 'parentesco') {
        if (value === 'TITULAR') {
          newState.nome_titular = '';
        }
      }
      return newState;
    });
  };

  const totalGeralBeneficiario = useMemo(() => {
    return (Number(formData.saude_valor_fatura) || 0) + (Number(formData.vida_valor_fatura) || 0) + (Number(formData.odonto_valor_fatura) || 0);
  }, [formData]);

  return (
    <div className="flex-1 overflow-y-auto max-h-[calc(90vh-150px)] px-4 py-4">
      <Accordion type="multiple" defaultValue={['personal', 'work', 'contact', 'values']} className="w-full">
        <AccordionItem value="personal"><AccordionTrigger>Dados Pessoais</AccordionTrigger><AccordionContent className="grid grid-cols-1 gap-4">
          <FormField id="nome_completo" label="Nome Completo *"><Input id="nome_completo" value={formData.nome_completo} onChange={handleInputChange} /></FormField>
          <FormField id="cpf" label="CPF *"><Input id="cpf" value={formData.cpf} onChange={handleInputChange} /></FormField>
          <FormField id="parentesco" label="Parentesco *"><Select value={formData.parentesco} onValueChange={(v) => handleSelectChange('parentesco', v)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="TITULAR">TITULAR</SelectItem><SelectItem value="CONJUGE">CÔNJUGE</SelectItem><SelectItem value="FILHO(A)">FILHO(A)</SelectItem><SelectItem value="IRMÃO(Ã)">IRMÃO(Ã)</SelectItem><SelectItem value="NETO(A)">NETO(A)</SelectItem><SelectItem value="PAI">PAI</SelectItem><SelectItem value="MÃE">MÃE</SelectItem></SelectContent></Select></FormField>
          <FormField id="data_nascimento" label="Data de Nascimento"><DateInput id="data_nascimento" value={formData.data_nascimento} onChange={handleInputChange} /></FormField>
          <FormField id="idade" label="Idade"><Input id="idade" value={age} disabled className="bg-gray-200" /></FormField>
          <FormField id="nome_mae" label="Nome da Mãe"><Input id="nome_mae" value={formData.nome_mae} onChange={handleInputChange} /></FormField>
          
          <FormField id="nome_titular" label="Nome do Titular" tooltip="Selecione o titular para este dependente">
            {formData.parentesco === 'TITULAR' ? (
                <Input id="nome_titular" value={formData.nome_titular} disabled placeholder="Não aplicável para titulares" />
            ) : (
                <Select value={formData.nome_titular} onValueChange={(v) => handleSelectChange('nome_titular', v)} disabled={titulares.length === 0}>
                    <SelectTrigger>
                        <SelectValue placeholder={titulares.length > 0 ? "Selecione o titular..." : "Nenhum titular cadastrado"} />
                    </SelectTrigger>
                    <SelectContent>
                        {titulares.map(titular => (
                            <SelectItem key={titular.id} value={titular.nome_completo}>
                                {titular.nome_completo}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
          </FormField>
          
          <FormField id="situacao" label="Situação Geral *"><Select value={formData.situacao} onValueChange={(v) => handleSelectChange('situacao', v)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="ATIVO">ATIVO</SelectItem><SelectItem value="INATIVO">INATIVO</SelectItem><SelectItem value="AFASTADO">AFASTADO</SelectItem></SelectContent></Select></FormField>
          {formData.situacao === 'INATIVO' && (
            <FormField id="data_inatividade" label="Data de Inatividade *">
              <DateInput id="data_inatividade" value={formData.data_inatividade} onChange={handleInputChange} />
            </FormField>
          )}
          {formData.situacao === 'AFASTADO' && (
            <>
              <FormField id="data_afastamento" label="Data de Afastamento *"><DateInput id="data_afastamento" value={formData.data_afastamento} onChange={handleInputChange} /></FormField>
              <FormField id="motivo_afastamento" label="Motivo do Afastamento *"><Input id="motivo_afastamento" value={formData.motivo_afastamento} onChange={handleInputChange} /></FormField>
            </>
          )}
        </AccordionContent></AccordionItem>

        <AccordionItem value="work"><AccordionTrigger>Dados Trabalhistas</AccordionTrigger><AccordionContent className="grid grid-cols-1 gap-4">
          <FormField id="matricula_empresa" label="Matrícula e Dígito"><Input id="matricula_empresa" value={formData.matricula_empresa} onChange={handleInputChange} /></FormField>
          <FormField id="data_admissao" label="Data de Admissão"><DateInput id="data_admissao" value={formData.data_admissao} onChange={handleInputChange} /></FormField>
        </AccordionContent></AccordionItem>

        <AccordionItem value="contact"><AccordionTrigger>Contato e Endereço</AccordionTrigger><AccordionContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="celular" label="Celular"><Input id="celular" value={formData.celular} onChange={handleInputChange} /></FormField>
            <FormField id="email_beneficiario" label="E-mail"><Input id="email_beneficiario" type="email" value={formData.email_beneficiario} onChange={handleInputChange} /></FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <FormField id="cep" label="CEP">
              <div className="flex gap-2">
                <Input id="cep" value={formData.cep} placeholder="00000-000" maxLength={9} onChange={handleInputChange} onBlur={handleCepBlur} />
                <button type="button" onClick={() => buscarCep(formData.cep)} disabled={isCepLoading} className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:bg-gray-50 hover:text-gray-600 flex items-center gap-1 text-sm">
                  {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <div className="md:col-span-2"><FormField id="rua" label="Rua"><Input id="rua" value={formData.rua} onChange={handleInputChange} /></FormField></div>
            <FormField id="numero" label="Número"><Input id="numero" value={formData.numero} onChange={handleInputChange} /></FormField>
            <FormField id="complemento" label="Complemento"><Input id="complemento" value={formData.complemento} onChange={handleInputChange} /></FormField>
            <FormField id="bairro" label="Bairro"><Input id="bairro" value={formData.bairro} onChange={handleInputChange} /></FormField>
            <FormField id="cidade" label="Cidade"><Input id="cidade" value={formData.cidade} onChange={handleInputChange} /></FormField>
            <FormField id="estado" label="Estado"><Input id="estado" value={formData.estado} onChange={handleInputChange} /></FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="health_plan"><AccordionTrigger className="text-[#003580]"><PlanCheckboxIcon label="Plano de Saúde" checked={formData.saude_ativo} /></AccordionTrigger><AccordionContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="saude_plano_nome" label="Nome do Plano"><Input id="saude_plano_nome" value={formData.saude_plano_nome} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_acomodacao" label="Acomodação"><Input id="saude_acomodacao" value={formData.saude_acomodacao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_codigo_empresa" label="Código da Empresa"><Input id="saude_codigo_empresa" value={formData.saude_codigo_empresa} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_produto" label="Produto"><Input id="saude_produto" value={formData.saude_produto} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_data_inclusao" label="Data Inclusão"><DateInput id="saude_data_inclusao" value={formData.saude_data_inclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_data_exclusao" label="Data Exclusão"><DateInput id="saude_data_exclusao" value={formData.saude_data_exclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_numero_carteirinha" label="Número Carteirinha"><Input id="saude_numero_carteirinha" value={formData.saude_numero_carteirinha} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_link_carteirinha" label="Link Carteirinha">
              {isCliente && formData.saude_link_carteirinha && /^https?:\/\//i.test(formData.saude_link_carteirinha) ? (
                <a href={formData.saude_link_carteirinha} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'link', className: 'p-0 h-auto' })} >Acessar Carteirinha <ExternalLink className="ml-2 h-4 w-4" /></a>
              ) : ( <Input id="saude_link_carteirinha" type="url" value={formData.saude_link_carteirinha} onChange={handleInputChange} disabled={isCliente} /> )}
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
            <FormField id="saude_valor_fatura" label="Valor Fatura"><Input id="saude_valor_fatura" type="number" step="0.01" value={formData.saude_valor_fatura} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_coparticipacao" label="Coparticipação"><Select value={formData.saude_coparticipacao} onValueChange={(v) => handleSelectChange('saude_coparticipacao', v)} disabled={isCliente}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select></FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="life_plan"><AccordionTrigger className="text-[#003580]"><PlanCheckboxIcon label="Seguro de Vida" checked={formData.vida_ativo} /></AccordionTrigger><AccordionContent className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="vida_plano_nome" label="Nome do Plano"><Input id="vida_plano_nome" value={formData.vida_plano_nome} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_valor_fatura" label="Valor Fatura"><Input id="vida_valor_fatura" type="number" step="0.01" value={formData.vida_valor_fatura} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_codigo_empresa" label="Código da Empresa"><Input id="vida_codigo_empresa" value={formData.vida_codigo_empresa} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_produto" label="Produto"><Input id="vida_produto" value={formData.vida_produto} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_data_inclusao" label="Data Inclusão"><DateInput id="vida_data_inclusao" value={formData.vida_data_inclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_data_exclusao" label="Data Exclusão"><DateInput id="vida_data_exclusao" value={formData.vida_data_exclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_numero_carteirinha" label="Número Carteirinha"><Input id="vida_numero_carteirinha" value={formData.vida_numero_carteirinha} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_link_carteirinha" label="Link Carteirinha">
              {isCliente && formData.vida_link_carteirinha && /^https?:\/\//i.test(formData.vida_link_carteirinha) ? (
                <a href={formData.vida_link_carteirinha} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'link', className: 'p-0 h-auto' })} >Acessar Carteirinha <ExternalLink className="ml-2 h-4 w-4" /></a>
              ) : ( <Input id="vida_link_carteirinha" type="url" value={formData.vida_link_carteirinha} onChange={handleInputChange} disabled={isCliente} /> )}
            </FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="dental_plan"><AccordionTrigger className="text-[#003580]"><PlanCheckboxIcon label="Plano Odonto" checked={formData.odonto_ativo} /></AccordionTrigger><AccordionContent className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="odonto_plano_nome" label="Nome do Plano"><Input id="odonto_plano_nome" value={formData.odonto_plano_nome} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_valor_fatura" label="Valor Fatura"><Input id="odonto_valor_fatura" type="number" step="0.01" value={formData.odonto_valor_fatura} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_codigo_empresa" label="Código da Empresa"><Input id="odonto_codigo_empresa" value={formData.odonto_codigo_empresa} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_produto" label="Produto"><Input id="odonto_produto" value={formData.odonto_produto} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_data_inclusao" label="Data Inclusão"><DateInput id="odonto_data_inclusao" value={formData.odonto_data_inclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_data_exclusao" label="Data Exclusão"><DateInput id="odonto_data_exclusao" value={formData.odonto_data_exclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_numero_carteirinha" label="Número Carteirinha"><Input id="odonto_numero_carteirinha" value={formData.odonto_numero_carteirinha} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_link_carteirinha" label="Link Carteirinha">
              {isCliente && formData.odonto_link_carteirinha && /^https?:\/\//i.test(formData.odonto_link_carteirinha) ? (
                <a href={formData.odonto_link_carteirinha} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'link', className: 'p-0 h-auto' })} >Acessar Carteirinha <ExternalLink className="ml-2 h-4 w-4" /></a>
              ) : ( <Input id="odonto_link_carteirinha" type="url" value={formData.odonto_link_carteirinha} onChange={handleInputChange} disabled={isCliente} /> )}
            </FormField>
          </div>
        </AccordionContent></AccordionItem>

<AccordionItem value="obs"><AccordionTrigger>Observações</AccordionTrigger><AccordionContent>
          <FormField id="observacoes" label="Observações"><Textarea id="observacoes" value={formData.observacoes} onChange={handleInputChange} className="h-24" /></FormField>
        </AccordionContent></AccordionItem>
      </Accordion>
      
      {beneficiario && isCliente && (
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Solicitar Inclusão e Exclusão</h4>
            <Button type="button" onClick={openSolicitacaoDialog} className="bg-[#003580] hover:bg-[#002060] text-white shadow-md hover:shadow-lg transition-all">
                Solicitações
            </Button>
        </div>

        {/* Status Cards Area */}
        <div className="space-y-2">
            {renderPlanStatusCard('saude', 'Plano de Saúde', Hospital, 'text-[#003580]')}
            {renderPlanStatusCard('vida', 'Seguro de Vida', Heart, 'text-[#003580]')}
            {renderPlanStatusCard('odonto', 'Plano Odonto', Smile, 'text-[#003580]')}
        </div>
      </div>
    )}
    </div>
  );
});

ModalFormContent.displayName = 'ModalFormContent';

const ClientDashboard = () => {
  // 1. All Hooks Declaration
  const { empresaId: paramEmpresaId } = useParams();
  const { setSelectedCompanyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const empresaId = Number(paramEmpresaId);
  const empresaId_num = empresaId;

  // State Hooks
  const [empresas, setEmpresas] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);

  // Boletos
  const [boletos, setBoletos] = useState([]);
  const [boletoPreviewCliente, setBoletoPreviewCliente] = useState(null); // { url, mes }
  const [loadingBoletoPreview, setLoadingBoletoPreview] = useState(false);
  const [boletoSelectorOpen, setBoletoSelectorOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeneficiario, setEditingBeneficiario] = useState(null);
  const [formData, setFormData] = useState(emptyBeneficiario);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [sortAge, setSortAge] = useState(null);
  const [age, setAge] = useState('');
  const [expandedBenefId, setExpandedBenefId] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [solCurrentPage, setSolCurrentPage] = useState(1);
  const SOL_PER_PAGE = 10;
  
  const [isExclusaoModalOpen, setIsExclusaoModalOpen] = useState(false);
  const [exclusaoData, setExclusaoData] = useState({ beneficiarioId: null, tipoPlano: null, motivo: '', dataExclusao: '', observacao: '' });

  const [isAlteracaoModalOpen, setIsAlteracaoModalOpen] = useState(false);
  const [alteracaoData, setAlteracaoData] = useState({ beneficiarioId: null, tipoPlano: null });

  const [isSolicitacaoDialogOpen, setIsSolicitacaoDialogOpen] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);

  const [isInclusaoDetalheOpen, setIsInclusaoDetalheOpen] = useState(false);
  const [pendingInclusaoBenefId, setPendingInclusaoBenefId] = useState(null);
  const [pendingInclusaoPlanos, setPendingInclusaoPlanos] = useState([]);
  const [inclusaoData, setInclusaoData] = useState({ motivo: '', dataInclusao: '', observacao: '' });

  const [showInclusaoAlert, setShowInclusaoAlert] = useState(true);
  const [showExclusaoAlert, setShowExclusaoAlert] = useState(true);

  // Import Planos
  const [isImportPlanosOpen, setIsImportPlanosOpen] = useState(false);
  const [importPlanosStep, setImportPlanosStep] = useState('upload');
  const [importPlanosRows, setImportPlanosRows] = useState([]);
  const [isParsingPlanos, setIsParsingPlanos] = useState(false);
  const [importPlanosSaving, setImportPlanosSaving] = useState(false);

  // Import Beneficiários
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'parsing' | 'preview' | 'saving'
  const [importedRows, setImportedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importSaving, setImportSaving] = useState(false);

  // Effects and Memos
  useEffect(() => {
    if (empresaId) {
      setSelectedCompanyId(empresaId);
    }
  }, [empresaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
     try {
       setIsLoading(true);
       const empresaId_num = Number(empresaId);

       if (!empresaId_num || isNaN(empresaId_num)) {
          setIsLoading(false);
          return;
       }

       const [empresasResult, beneficiariosResult, solicitacoesResult] = await Promise.allSettled([
           empresasService.getEmpresas(),
           beneficiariosService.getAllBeneficiarios(),
           solicitacoesService.getAllSolicitacoes()
       ]);

       setEmpresas(empresasResult.status === 'fulfilled' ? (empresasResult.value || []) : []);
       setBeneficiarios(beneficiariosResult.status === 'fulfilled' ? (beneficiariosResult.value || []) : []);
       setSolicitacoes(solicitacoesResult.status === 'fulfilled' ? (solicitacoesResult.value || []) : []);
     } catch (error) {
       console.error("Error fetching client data:", error);
       toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar dados.' });
     } finally {
       setIsLoading(false);
     }
  };
  
  useEffect(() => { if (empresaId_num) { fetchData(); } }, [empresaId_num]);

  // Carrega boletos a partir do apoliceId da navegação (se disponível)
  useEffect(() => {
    const apoliceId = location.state?.apoliceId;
    if (!apoliceId) return;
    boletosService.getBoletosByApolice(apoliceId).then(setBoletos).catch(() => {});
  }, [location.state?.apoliceId]);

  const mesAtual = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const MES_OPTS_CLIENTE = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 2 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      return { val, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }, []);

  const temBoletoMesAtual = useMemo(() => boletos.some(b => b.mes_referencia === mesAtual), [boletos, mesAtual]);

  const beneficiariosDaEmpresa = useMemo(() => {
    if (!empresaId) return [];
    return beneficiarios.filter(b => Number(b.empresa_id) === empresaId);
  }, [beneficiarios, empresaId]);

  const empresa = useMemo(() => empresas.find(e => e.id === empresaId), [empresas, empresaId]);
  
  const titulares = useMemo(() => 
    beneficiariosDaEmpresa.filter(b => b.parentesco === 'TITULAR'), 
    [beneficiariosDaEmpresa]
  );

  const filteredBeneficiarios = useMemo(() => {
    let result = beneficiariosDaEmpresa
      .filter(b => (filter === 'Todos' || b.situacao === filter))
      .filter(b => (b.nome_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.cpf || '').includes(searchTerm) || (b.saude_numero_carteirinha || '').includes(searchTerm) || (b.vida_numero_carteirinha || '').includes(searchTerm) || (b.odonto_numero_carteirinha || '').includes(searchTerm));
    if (sortAge === 'asc') result = [...result].sort((a, b) => new Date(b.data_nascimento || 0) - new Date(a.data_nascimento || 0));
    if (sortAge === 'desc') result = [...result].sort((a, b) => new Date(a.data_nascimento || 0) - new Date(b.data_nascimento || 0));
    return result;
  }, [beneficiariosDaEmpresa, filter, searchTerm, sortAge]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBeneficiarios = filteredBeneficiarios.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBeneficiarios.length / itemsPerPage);

  const metrics = useMemo(() => ({
      total: beneficiariosDaEmpresa.length,
      titulares: beneficiariosDaEmpresa.filter(b => b.parentesco === 'TITULAR').length,
      dependentes: beneficiariosDaEmpresa.filter(b => b.parentesco !== 'TITULAR').length,
      ativos: beneficiariosDaEmpresa.filter(b => b.situacao === 'ATIVO').length,
  }), [beneficiariosDaEmpresa]);
  
  const solicitacoesInclusaoConcluidas = useMemo(() => 
    solicitacoes.filter(s => s.empresa_id === parseInt(empresaId) && s.status === 'CONCLUIDA' && s.tipo_solicitacao === 'INCLUSAO'),
    [solicitacoes, empresaId]
  );

  const solicitacoesExclusaoConcluidas = useMemo(() =>
    solicitacoes.filter(s => s.empresa_id === parseInt(empresaId) && s.status === 'CONCLUIDA' && s.tipo_solicitacao === 'EXCLUSAO'),
    [solicitacoes, empresaId]
  );

  const todasSolicitacoesDaEmpresa = useMemo(() =>
    solicitacoes
      .filter(s => s.empresa_id === parseInt(empresaId))
      .sort((a, b) => new Date(b.data_solicitacao) - new Date(a.data_solicitacao)),
    [solicitacoes, empresaId]
  );

  const solTotalPages = Math.ceil(todasSolicitacoesDaEmpresa.length / SOL_PER_PAGE);
  const solPaginadas = todasSolicitacoesDaEmpresa.slice((solCurrentPage - 1) * SOL_PER_PAGE, solCurrentPage * SOL_PER_PAGE);

  useEffect(() => { setAge(formData.data_nascimento ? calculateAge(formData.data_nascimento) : ''); }, [formData.data_nascimento]);

  const openModalToAdd = () => { setEditingBeneficiario(null); setFormData(emptyBeneficiario); setIsModalOpen(true); };
  const openModalToEdit = (b) => { setEditingBeneficiario(b); setFormData({ ...emptyBeneficiario, ...b, cpf: b.cpf ? formatCpfCnpj(b.cpf) : '', parentesco: normalizeParentesco(b.parentesco) }); setIsModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!formData.nome_completo) errors.push('Nome Completo');
    if (!formData.cpf) errors.push('CPF');
    if (!formData.parentesco) errors.push('Parentesco');
    if (formData.parentesco !== 'TITULAR' && !formData.nome_titular) errors.push('Nome do Titular');
    if (formData.situacao === 'INATIVO' && !formData.data_inatividade) {
      errors.push('Data de Inatividade');
    }
    if (formData.situacao === 'AFASTADO' && (!formData.data_afastamento || !formData.motivo_afastamento)) {
      errors.push('Data e Motivo do Afastamento');
    }

    if (errors.length > 0) {
      toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: `Por favor, preencha: ${errors.join(', ')}.` });
      return;
    }
    const unmaskedCpf = formData.cpf.replace(/\D/g, '');
    if (beneficiarios.some(b => Number(b.empresa_id) === empresaId && b.cpf.replace(/\D/g, '') === unmaskedCpf && b.id !== editingBeneficiario?.id)) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "CPF já cadastrado nesta empresa." });
      return;
    }
    setIsSubmitting(true);
    const dataToSave = { ...formData, saude_valor_fatura: Number(formData.saude_valor_fatura) || 0, vida_valor_fatura: Number(formData.vida_valor_fatura) || 0, odonto_valor_fatura: Number(formData.odonto_valor_fatura) || 0, empresa_id: empresaId };
    
    try {
      if (editingBeneficiario) {
        await beneficiariosService.updateBeneficiario(editingBeneficiario.id, dataToSave);
        setBeneficiarios(prev => prev.map(b => b.id === editingBeneficiario.id ? { ...dataToSave, id: b.id } : b));
        toast({ title: 'Sucesso', description: 'Beneficiário atualizado.' });
      } else {
        const created = await beneficiariosService.createBeneficiario(dataToSave);
        setBeneficiarios(prev => [...prev, created]);
        toast({ title: 'Sucesso', description: 'Beneficiário adicionado.' });
      }
      setIsModalOpen(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao salvar beneficiário', description: error?.message || JSON.stringify(error) });
    } finally {
       setIsSubmitting(false);
    }
  };
  
  const deleteBeneficiario = async (id) => {
    try {
        await beneficiariosService.deleteBeneficiario(id);
        setBeneficiarios(beneficiarios.filter(b => b.id !== id));
        toast({ title: 'Sucesso', description: 'Beneficiário excluído permanentemente.' });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir beneficiário', description: error?.message || JSON.stringify(error) });
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    setIsBulkDeleting(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        await beneficiariosService.deleteBeneficiario(id);
        ok++;
      } catch { fail++; }
    }
    setBeneficiarios(prev => prev.filter(b => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    toast({ title: `${ok} excluído(s)${fail ? ` • ${fail} erro(s)` : ''}` });
  };

  const handleSolicitarInclusao = async (beneficiarioId, planosSelecionados, detalhes = {}) => {
    if (!planosSelecionados || planosSelecionados.length === 0) return;

    // Filter out plans that already have pending or processing requests
    const validPlans = planosSelecionados.map(p => p.toLowerCase()).filter(plano => {
      const hasDuplicate = solicitacoes.some(s =>
        s.beneficiario_id === beneficiarioId &&
        s.tipo_plano?.toLowerCase() === plano &&
        s.tipo_solicitacao === 'INCLUSAO' &&
        ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status)
      );
      
      if (hasDuplicate) {
        toast({
          variant: 'destructive',
          title: 'Solicitação Duplicada',
          description: `Já existe uma solicitação em andamento para o plano ${plano}.`,
        });
      }
      return !hasDuplicate;
    });

    if (validPlans.length === 0) return;

    try {
        const promises = validPlans.map((plano) => {
            const novaSolicitacao = {
              beneficiario_id: beneficiarioId,
              empresa_id: parseInt(empresaId),
              usuario_solicitante_id: user.id,
              tipo_plano: plano.toLowerCase(),
              tipo_solicitacao: 'INCLUSAO',
              status: 'PENDENTE',
              data_solicitacao: new Date().toISOString(),
              data_aprovacao: null,
              dados_inclusao: {
                dataInclusao: detalhes.dataInclusao || '',
                motivo: detalhes.motivo || '',
                observacao: detalhes.observacao || ''
              }
            };
            return solicitacoesService.createSolicitacao(novaSolicitacao);
        });

        const newSolicitacoes = await Promise.all(promises);
        setSolicitacoes(prev => [...prev, ...newSolicitacoes]);
      
        toast({
          title: 'Solicitações Enviadas!',
          description: `Solicitações de inclusão para os planos ${validPlans.join(', ')} foram enviadas com sucesso.`,
        });
    } catch (error) {
        console.error("Erro ao enviar solicitação:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao enviar solicitação.' });
    }
  };

  const handleSolicitarExclusao = async (beneficiarioId, tipoPlano, motivo, dataExclusao, observacao = '') => {
    // 1. Check for duplicates
    const tipoPlanoNorm = tipoPlano?.toLowerCase();
    const hasOpenExclusion = solicitacoes.some(s =>
      s.beneficiario_id === beneficiarioId &&
      s.tipo_plano?.toLowerCase() === tipoPlanoNorm &&
      s.tipo_solicitacao === 'EXCLUSAO' &&
      ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status)
    );

    if (hasOpenExclusion) {
      toast({ 
        variant: 'destructive', 
        title: 'Solicitação Duplicada', 
        description: 'Já existe uma solicitação de exclusão em andamento para este plano.' 
      });
      return;
    }

    // 2. Validate dataExclusao
    if (!dataExclusao) {
      toast({ 
        variant: 'destructive', 
        title: 'Data Obrigatória', 
        description: 'Por favor, informe a data de exclusão.' 
      });
      return;
    }

    // 3. Validate motivo
    if (!motivo || motivo.length < 3) {
      toast({ 
        variant: 'destructive', 
        title: 'Motivo Obrigatório', 
        description: 'Por favor, informe o motivo da exclusão (mínimo 3 caracteres).' 
      });
      return;
    }

    try {
      // 4. Create object
      const novaSolicitacao = {
        beneficiario_id: beneficiarioId,
        empresa_id: parseInt(empresaId),
        usuario_solicitante_id: user.id,
        tipo_plano: tipoPlano,
        tipo_solicitacao: 'EXCLUSAO',
        status: 'PENDENTE',
        data_solicitacao: new Date().toISOString(),
        dados_exclusao: {
          dataExclusao,
          motivo,
          observacao
        }
      };

      // 5. Call service
      const createdRequest = await solicitacoesService.createSolicitacao(novaSolicitacao);

      // 6. Update state
      setSolicitacoes(prev => [...prev, createdRequest]);

      // 7. Show success toast
      toast({ 
        title: 'Solicitação Enviada', 
        description: `A exclusão do plano ${tipoPlano} foi solicitada com sucesso.` 
      });

      // 8 & 9. Close modal and reset data
      setIsExclusaoModalOpen(false);
      setExclusaoData({ beneficiarioId: null, tipoPlano: null, motivo: '', dataExclusao: '', observacao: '' });

    } catch (error) {
      console.error('Erro ao solicitar exclusão:', error);
      // 9. Handle errors
      toast({ 
        variant: 'destructive', 
        title: 'Erro', 
        description: 'Não foi possível enviar a solicitação de exclusão. Tente novamente.' 
      });
    }
  };

  const handleSolicitarAlteracao = (beneficiarioId, tipoPlano) => {
    const hasOpenAlteracao = solicitacoes.some(s =>
      s.beneficiario_id === beneficiarioId &&
      s.tipo_plano?.toLowerCase() === tipoPlano?.toLowerCase() &&
      s.tipo_solicitacao === 'ALTERACAO' &&
      ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status)
    );

    if (hasOpenAlteracao) {
      toast({ 
        variant: 'destructive', 
        title: 'Solicitação já existente', 
        description: 'Já existe uma solicitação de alteração em andamento para este plano.' 
      });
      return;
    }

    setAlteracaoData({ beneficiarioId, tipoPlano });
    setIsAlteracaoModalOpen(true);
  };

  const confirmAlteracao = async () => {
    const { beneficiarioId, tipoPlano } = alteracaoData;
    if (!beneficiarioId || !tipoPlano) return;

    try {
      const novaSolicitacao = {
        beneficiario_id: beneficiarioId,
        empresa_id: parseInt(empresaId),
        usuario_solicitante_id: user.id,
        tipo_plano: tipoPlano,
        tipo_solicitacao: 'ALTERACAO',
        status: 'PENDENTE',
        data_solicitacao: new Date().toISOString(),
        data_aprovacao: null
      };
      
      const created = await solicitacoesService.createSolicitacao(novaSolicitacao);
      setSolicitacoes(prev => [...prev, created]);

      toast({ 
        title: 'Solicitação de Alteração Enviada', 
        description: `Sua solicitação para alterar o plano ${tipoPlano} foi enviada com sucesso.` 
      });

      setIsAlteracaoModalOpen(false);
      setAlteracaoData({ beneficiarioId: null, tipoPlano: null });
    } catch (error) {
      console.error('Erro ao enviar solicitação de alteração:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro', 
        description: 'Não foi possível enviar a solicitação de alteração. Tente novamente.' 
      });
    }
  };

  const getLatestSolicitacaoForPlan = (beneficiarioId, tipoPlano) => {
    const userSolicitacoes = solicitacoes.filter(s =>
      String(s.beneficiario_id) === String(beneficiarioId) &&
      String(s.tipo_plano) === String(tipoPlano) &&
      s.status !== 'CANCELADA'
    );

    if (userSolicitacoes.length === 0) return null;

    userSolicitacoes.sort((a, b) =>
      new Date(b.data_solicitacao) - new Date(a.data_solicitacao)
    );

    return userSolicitacoes[0];
  };

  const isPlanAtivo = (beneficiario, type) => {
    if (!beneficiario[`${type}_ativo`]) return false;
    const latest = getLatestSolicitacaoForPlan(beneficiario.id, type);
    if (latest?.tipo_solicitacao === 'EXCLUSAO' && latest?.status === 'CONCLUIDA') return false;
    return true;
  };

  const openSolicitacaoDialog = () => { setSelectedPlans([]); setIsSolicitacaoDialogOpen(true); };
  
  const togglePlanSelection = (plan) => {
    setSelectedPlans(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]);
  };

  const confirmSolicitacao = () => {
    if (selectedPlans.length === 0) return toast({ variant: 'destructive', title: 'Selecione um plano', description: 'Selecione ao menos um plano para solicitar.' });
    setPendingInclusaoBenefId(editingBeneficiario.id);
    setPendingInclusaoPlanos([...selectedPlans]);
    setInclusaoData({ motivo: '', dataInclusao: '', observacao: '' });
    setIsSolicitacaoDialogOpen(false);
    setSelectedPlans([]);
    setIsInclusaoDetalheOpen(true);
  };

  const confirmarInclusaoComDetalhes = async () => {
    await handleSolicitarInclusao(pendingInclusaoBenefId, pendingInclusaoPlanos, inclusaoData);
    setIsInclusaoDetalheOpen(false);
    setInclusaoData({ motivo: '', dataInclusao: '', observacao: '' });
  };

  const renderPlanSelectionItem = (type, label, Icon, colorClass) => {
    const solicitacao = getLatestSolicitacaoForPlan(editingBeneficiario.id, type);
    const isPendingOrProcessing = solicitacao && ['PENDENTE', 'EM PROCESSAMENTO'].includes(solicitacao.status);
    const isExcluded = solicitacao?.tipo_solicitacao === 'EXCLUSAO' && solicitacao?.status === 'CONCLUIDA';
    const isActive = formData[`${type}_ativo`] && !isExcluded;

    if (isPendingOrProcessing) {
        return (
            <div key={type} className="border border-blue-100 bg-blue-50 rounded-lg p-4 space-y-3 relative">
                 <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#003580]/10"><Icon className="h-4 w-4 text-[#003580]" /></div>
                    <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
                 </div>
                 <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-blue-100 text-[#003580] hover:bg-blue-100 hover:text-[#003580] border-blue-200 hover:bg-blue-100 shadow-none">
                        {solicitacao.status === 'PENDENTE' ? 'Solicitação Pendente' : 'Em Processamento'}
                    </Badge>
                    <span className="text-xs text-gray-500 font-medium">
                        {formatDate(solicitacao.data_solicitacao)}
                    </span>
                 </div>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSolicitacaoDialogOpen(false)} 
                    className="w-full h-8 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-900 bg-transparent"
                 >
                    Fechar
                 </Button>
            </div>
        );
    }

    if (isActive) {
        return (
             <div key={type} className="border border-blue-100 bg-blue-50 rounded-lg p-4 space-y-3 relative">
                 <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#003580]/10"><Icon className="h-4 w-4 text-[#003580]" /></div>
                    <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#003580]" />
                    <span className="text-sm font-medium text-[#003580]">Plano Ativo</span>
                 </div>
                 <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setIsSolicitacaoDialogOpen(false); handleSolicitarAlteracao(editingBeneficiario.id, type); }}
                        className="w-full h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-900 bg-transparent"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Alterar Plano
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setIsSolicitacaoDialogOpen(false); setExclusaoData({ beneficiarioId: editingBeneficiario.id, tipoPlano: type, motivo: '', dataExclusao: '' }); setIsExclusaoModalOpen(true); }}
                        className="w-full h-8 text-xs"
                    >
                        <UserMinus className="h-3.5 w-3.5 mr-1.5" />Solicitar Exclusão
                    </Button>
                 </div>
            </div>
        );
    }

    if (isExcluded) {
        return (
            <div key={type} className="border border-blue-100 bg-blue-50 rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#003580]/10"><Icon className="h-4 w-4 text-[#003580]" /></div>
                    <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4 text-[#003580]" />
                    <span className="text-sm font-medium text-[#003580]">Plano Excluído</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setIsSolicitacaoDialogOpen(false); setPendingInclusaoBenefId(editingBeneficiario.id); setPendingInclusaoPlanos([type]); setInclusaoData({ motivo: '', dataInclusao: '', observacao: '' }); setIsInclusaoDetalheOpen(true); }}
                    className="w-full h-8 text-xs border-blue-200 text-[#003580] hover:bg-blue-100 hover:text-[#002060] bg-transparent"
                >
                    Solicitar Inclusão
                </Button>
            </div>
        );
    }

    return (
        <div 
            key={type} 
            className={`flex items-center space-x-3 border p-4 rounded-lg transition-all cursor-pointer ${selectedPlans.includes(type) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`} 
            onClick={() => togglePlanSelection(type)}
        >
            <Checkbox 
                id={`check_${type}`} 
                checked={selectedPlans.includes(type)} 
                onCheckedChange={() => togglePlanSelection(type)} 
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
            />
            <div className="flex-1 cursor-pointer pointer-events-none select-none">
                 <Label htmlFor={`check_${type}`} className="font-medium flex items-center gap-2 cursor-pointer text-gray-700">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    {label}
                 </Label>
            </div>
        </div>
    );
  };

  const renderPlanStatusCard = (type, label, Icon, colorClass) => {
    if (!editingBeneficiario) return null;
    const solicitacao = getLatestSolicitacaoForPlan(editingBeneficiario.id, type);
    
    if (!solicitacao && !formData[`${type}_ativo`]) return null;
    
    if (!solicitacao) {
      if (formData[`${type}_ativo`]) {
        return (
          <Card className="mb-4 overflow-hidden border-l-4 border-l-[#003580]">
             <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2"><div className="p-2 rounded-full bg-[#003580]/10"><Icon className="h-5 w-5 text-[#003580]" /></div><div><h4 className="font-bold text-sm flex items-center gap-2">{label}</h4><Badge variant="outline" className="w-fit bg-blue-100 text-[#003580] hover:bg-blue-100 hover:text-[#003580] border-blue-200">Ativo</Badge></div></div>
             </CardHeader>
             <CardContent className="p-4 pt-2">
                <div className="text-sm text-gray-600">Este plano está ativo.</div>
             </CardContent>
          </Card>
        );
      }
      return null;
    }

    const status = solicitacao.status;
    const isRejected = status === 'REJEITADA';
    const isExclusion = solicitacao.tipo_solicitacao === 'EXCLUSAO';

    return (
      <Card className="mb-4 overflow-hidden border-l-4" style={{ borderLeftColor: '#003580' }}>
        <CardHeader className="p-4 pb-2"><div className="flex items-center gap-2"><div className="p-2 rounded-full bg-[#003580]/10"><Icon className="h-5 w-5 text-[#003580]" /></div><div><h4 className="font-bold text-sm flex items-center gap-2">{label}{isExclusion && (<Badge variant="destructive" className="ml-1 text-[10px] h-5 px-1">Exclusão</Badge>)}</h4><div className="flex flex-col mt-1"><Badge variant="outline" className={`w-fit ${getStatusColor(status)}`}>{status === 'PENDENTE' && (isExclusion ? 'Exclusão Pendente' : 'Inclusão Pendente')}{status === 'EM PROCESSAMENTO' && (isExclusion ? 'Exclusão em Andamento' : 'Inclusão em Andamento')}{status === 'CONCLUIDA' && (isExclusion ? 'Exclusão Concluída' : 'Inclusão Concluída')}{status === 'REJEITADA' && 'Solicitação Rejeitada'}</Badge></div></div></div></CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-3"><div className="flex items-center gap-2" title="Data Solicitação"><Calendar className="h-4 w-4" /><span>{formatDate(solicitacao.data_solicitacao)}</span></div><div className="flex items-center gap-2" title="Tempo Decorrido"><Timer className="h-4 w-4" /><span>{getTempoDecorrido(solicitacao.data_solicitacao)}</span></div>{solicitacao.data_aprovacao && !isExclusion && (<div className="flex items-center gap-2 col-span-2" title="Data Aprovação"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Aprovado: {formatDate(solicitacao.data_aprovacao)}</span></div>)}</div>
          {isExclusion && status === 'CONCLUIDA' && (<div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100"><p className="text-sm font-semibold text-[#003580] flex items-center gap-2"><UserMinus className="h-4 w-4" /> Plano Excluído</p><p className="text-xs text-[#003580] mt-1">Data: {formatDate(solicitacao.data_conclusao)}</p>{solicitacao.dados_exclusao?.motivo && (<p className="text-xs text-[#003580]">Motivo: {solicitacao.dados_exclusao.motivo}</p>)}</div>)}
          {isRejected && (<div className="space-y-3"><Alert variant="destructive" className="py-2"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs ml-2">{solicitacao.motivo_rejeicao || 'Motivo não informado.'}</AlertDescription></Alert></div>)}
        </CardContent>
      </Card>
    );
  };
  
  // ── Import Beneficiários ────────────────────────────────────────────────────

  const PARENTESCO_OPTS = ['TITULAR','CONJUGE','FILHO(A)','IRMÃO(Ã)','NETO(A)','PAI','MÃE'];

  const normalizeParentesco = (p) => {
    if (!p) return '';
    const map = { 'FILHO':'FILHO(A)', 'FILHA':'FILHO(A)', 'MAE':'MÃE', 'IRMÃO':'IRMÃO(Ã)', 'IRMÃ':'IRMÃO(Ã)', 'NETO':'NETO(A)', 'NETA':'NETO(A)', 'CÔNJUGE':'CONJUGE' };
    return map[p.toUpperCase()] || p;
  };

  const buildRowFromParsed = (item, existingCpfs) => {
    const cpf = (item.cpf || '').replace(/\D/g,'');
    return {
      nome_completo:      (item.nome_completo || '').toUpperCase().trim(),
      cpf,
      data_nascimento:    item.data_nascimento || '',
      parentesco:         item.parentesco || 'TITULAR',
      nome_titular:       (item.nome_titular || '').toUpperCase().trim(),
      nome_mae:           (item.nome_mae || '').toUpperCase().trim(),
      matricula:          item.matricula || '',
      data_admissao:      item.data_admissao || '',
      situacao:           item.situacao || 'ATIVO',
      celular:            (item.celular || '').replace(/\D/g,''),
      email_beneficiario: item.email_beneficiario || '',
      cep:                (item.cep || '').replace(/\D/g,''),
      rua:                item.rua || '',
      numero:             item.numero || '',
      bairro:             item.bairro || '',
      cidade:             item.cidade || '',
      estado:             item.estado || '',
      saude_plano_nome:   item.saude_plano_nome || '',
      saude_ativo:        item.saude_ativo === true || item.saude_ativo === 'true',
      _jaExiste:          cpf.length === 11 && existingCpfs.has(cpf),
    };
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

      const { data: result, error } = await supabase.functions.invoke('parse-beneficiarios-pdf', {
        body: { pdfBase64 },
      });

      if (error) throw new Error(error.message || 'Erro na Edge Function.');
      if (!result?.data?.length) throw new Error('O PDF não contém dados de beneficiários reconhecíveis.');

      const existingCpfs = new Set(beneficiariosDaEmpresa.map(b => (b.cpf || '').replace(/\D/g,'')));
      const rows = result.data
        .filter(item => item.nome_completo)
        .map(item => buildRowFromParsed(item, existingCpfs));

      setImportedRows(rows);
      setImportStep('preview');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao processar PDF', description: err.message });
      setImportStep('upload');
    } finally {
      setIsParsing(false);
    }
  };

  const handleExcelImport = async (file) => {
    setIsParsing(true);
    setImportStep('parsing');
    try {
      const rows = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            if (file.name.match(/\.csv$/i)) {
              const wb = XLSX.read(e.target.result, { type: 'string' });
              resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }));
            } else {
              const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
              const sheetName = wb.SheetNames.includes('PlanilhaDeVidas') ? 'PlanilhaDeVidas' : wb.SheetNames[0];
              resolve(XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }));
            }
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        file.name.match(/\.csv$/i) ? reader.readAsText(file, 'utf-8') : reader.readAsArrayBuffer(file);
      });

      if (!rows.length) throw new Error('Planilha vazia ou sem dados.');

      const existingCpfs = new Set(beneficiariosDaEmpresa.map(b => (b.cpf || '').replace(/\D/g,'')));
      const headers = Object.keys(rows[0]).join(',');

      // Divide em lotes de 40 linhas e envia todos em paralelo para a IA
      const CHUNK_SIZE = 40;
      const chunks = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunks.push(rows.slice(i, i + CHUNK_SIZE));
      }

      const results = await Promise.allSettled(
        chunks.map(chunk => {
          const csvText = [
            headers,
            ...chunk.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
          ].join('\n');
          return supabase.functions.invoke('parse-beneficiarios-pdf', { body: { csvText } });
        })
      );

      const allItems = [];
      let hasErrors = false;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { data, error } = result.value;
          if (error) { hasErrors = true; continue; }
          if (data?.data?.length) allItems.push(...data.data);
        } else {
          hasErrors = true;
        }
      }

      if (!allItems.length) throw new Error('A IA não conseguiu extrair beneficiários da planilha.');

      if (hasErrors) {
        toast({ title: 'Atenção', description: 'Alguns blocos da planilha não foram processados, mas os demais foram importados.' });
      }

      const importRows = allItems
        .filter(item => item.nome_completo)
        .map(item => buildRowFromParsed(item, existingCpfs));

      setImportedRows(importRows);
      setImportStep('preview');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao processar planilha', description: err.message });
      setImportStep('upload');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportFile = (file) => {
    if (!file) return;
    if (file.name.match(/\.pdf$/i)) return handlePdfImport(file);
    if (file.name.match(/\.(xlsx|xls|csv)$/i)) return handleExcelImport(file);
    toast({ variant: 'destructive', title: 'Formato não suportado', description: 'Use .pdf, .xlsx, .xls ou .csv.' });
  };

  // ── Import Planos ────────────────────────────────────────────────────────────
  const handlePlanosFile = async (file) => {
    if (!file || !file.name.match(/\.pdf$/i)) {
      toast({ variant: 'destructive', title: 'Envie um arquivo PDF.' });
      return;
    }
    setIsParsingPlanos(true);
    setImportPlanosStep('parsing');
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = (e) => res(e.target.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const { data: result, error } = await supabase.functions.invoke('parse-relatorio-matriz', { body: { pdfBase64: base64 } });
      if (error || !result?.data) throw new Error(error?.message || 'Falha ao processar PDF.');
      const benefs = beneficiarios.filter(b => String(b.empresa_id) === String(empresaId));
      const rows = result.data.map(item => {
        const cpf = (item.cpf || '').replace(/\D/g, '');
        const matched = benefs.find(b => (b.cpf || '').replace(/\D/g, '') === cpf && cpf.length === 11);
        return { ...item, _matchedId: matched?.id || null, _matchedName: matched?.nome_completo || null };
      });
      setImportPlanosRows(rows);
      setImportPlanosStep('preview');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao processar PDF.', description: err.message });
      setImportPlanosStep('upload');
    } finally {
      setIsParsingPlanos(false);
    }
  };

  const handleSavePlanos = async () => {
    const toUpdate = importPlanosRows.filter(r => r._matchedId);
    if (!toUpdate.length) {
      toast({ variant: 'destructive', title: 'Nenhum beneficiário encontrado para atualizar.' });
      return;
    }
    setImportPlanosSaving(true);
    let ok = 0, fail = 0;
    for (const r of toUpdate) {
      try {
        const tipo = r.tipo_plano || 'saude';
        const upd = {
          [`${tipo}_numero_carteirinha`]: r.cod_identificacao || null,
          [`${tipo}_plano_nome`]: r.plano || null,
          [`${tipo}_data_inclusao`]: r.inicio_vigencia || null,
          [`${tipo}_valor_fatura`]: r.premio || null,
          [`${tipo}_ativo`]: true,
        };
        if (r.id_funcional) upd.matricula_empresa = r.id_funcional;
        await beneficiariosService.updateBeneficiario(r._matchedId, upd);
        ok++;
      } catch { fail++; }
    }
    setImportPlanosSaving(false);
    toast({ title: `${ok} plano(s) atualizado(s)!`, description: fail > 0 ? `${fail} erro(s)` : undefined });
    setIsImportPlanosOpen(false);
    setImportPlanosStep('upload');
    setImportPlanosRows([]);
    fetchData();
  };
  // ── End Import Planos ────────────────────────────────────────────────────────

  const handleSaveImport = async () => {
    const toSave = importedRows.filter(r => !r._jaExiste && !r._skip);
    if (!toSave.length) {
      toast({ variant: 'destructive', title: 'Nada para salvar' });
      return;
    }
    setImportSaving(true);
    setImportStep('saving');
    let saved = 0, errors = 0;
    for (const row of toSave) {
      try {
        await beneficiariosService.createBeneficiario({
          ...emptyBeneficiario,
          empresa_id:         empresaId,
          nome_completo:      row.nome_completo,
          cpf:                row.cpf || '',
          data_nascimento:    row.data_nascimento || null,
          parentesco:         row.parentesco,
          nome_titular:       row.nome_titular || '',
          nome_mae:           row.nome_mae || '',
          matricula_empresa:  row.matricula || '',
          data_admissao:      row.data_admissao || null,
          situacao:           row.situacao,
          cep:                row.cep || '',
          rua:                row.rua || '',
          numero:             row.numero || '',
          complemento:        row.complemento || '',
          bairro:             row.bairro || '',
          cidade:             row.cidade || '',
          estado:             row.estado || '',
          email_beneficiario: row.email_beneficiario || '',
          celular:            row.celular || '',
          saude_ativo:        row.saude_ativo || false,
          saude_plano_nome:   row.saude_plano_nome || '',
          saude_data_inclusao: row.data_admissao || null,
        });
        saved++;
      } catch { errors++; }
    }
    setImportSaving(false);
    toast({ title: `${saved} beneficiário(s) importado(s)${errors ? ` • ${errors} erro(s)` : ''}` });
    setIsImportOpen(false);
    setImportStep('upload');
    setImportedRows([]);
    fetchData();
  };

  // ── End Import ───────────────────────────────────────────────────────────────

  const getBadgeClass = (situacao) => {
    switch (situacao) { 
        case 'ATIVO': return 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 border-green-200 hover:bg-green-100'; 
        case 'INATIVO': return 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 border-red-200 hover:bg-red-100'; 
        case 'AFASTADO': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800 border-yellow-200 hover:bg-yellow-100'; 
        default: return 'bg-gray-100 text-gray-800 border-gray-200'; 
    } 
  };

  // 2. Conditional Returns (Guards) - MOVED TO END
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!empresaId_num || isNaN(empresaId_num)) {
    return <Navigate to="/select-segmento" />;
  }

  if (user.perfil === 'CLIENTE') {
    const matriz = empresas.find(e => e.id === user.empresa_matriz_id);
    const filiais = empresas.filter(e => e.empresa_matriz_id === user.empresa_matriz_id);
    const accessibleEmpresasIds = [matriz?.id, ...filiais.map(f => f.id)].filter(Boolean);
    if (empresas.length > 0 && !accessibleEmpresasIds.includes(empresaId)) { return <Navigate to="/select-segmento" replace />; }
  }

  if (!empresa && !isLoading && empresas.length > 0) { 
      return <DashboardLayout><div className="text-center"><h1 className="text-2xl font-bold text-white">Empresa não encontrada.</h1></div></DashboardLayout>;
  }

  return (
    <>
      <Helmet><title>Beneficiários - {empresa?.nome_fantasia || 'Cliente'}</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

          {/* Breadcrumb */}
          {(() => {
            const isAdmin = user?.perfil === 'CEO' || user?.perfil === 'ADM';
            const fromState = location.state;
            if (isAdmin) {
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate('/admin/clientes')} className="text-sm text-white/60 hover:text-white transition-colors">Clientes</button>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                  <span className="text-sm text-white">{empresa?.nome_fantasia || empresa?.razao_social || 'Empresa'}</span>
                </div>
              );
            }
            return (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => navigate('/select-segmento')} className="text-sm text-white/60 hover:text-white transition-colors">Meus Seguros</button>
                {fromState?.segLabel && (
                  <>
                    <ChevronRight className="h-4 w-4 text-white/30" />
                    <button onClick={() => navigate(`/select-apolice/${fromState.segmento?.toLowerCase()}`)} className="text-sm text-white/60 hover:text-white transition-colors">{fromState.segLabel}</button>
                  </>
                )}
                {fromState?.apoliceId && (
                  <>
                    <ChevronRight className="h-4 w-4 text-white/30" />
                    <button onClick={() => navigate(`/apolice/${fromState.apoliceId}`)} className="text-sm text-white/60 hover:text-white transition-colors">
                      {fromState.apoliceNum ? `Apólice ${fromState.apoliceNum}` : 'Apólice'}
                    </button>
                  </>
                )}
                <ChevronRight className="h-4 w-4 text-white/30" />
                <span className="text-sm text-white">Gestão</span>
              </div>
            );
          })()}

          {/* Título */}
          {empresa && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {empresa.nome_fantasia || empresa.razao_social}
                </h1>
                <p className="text-white/80 text-base font-medium mt-0.5 flex items-center gap-1.5">
                  {empresa.razao_social && empresa.nome_fantasia && <span className="text-white/60 text-sm">{empresa.razao_social}</span>}
                  {empresa.tipo && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${empresa.tipo === 'MATRIZ' ? 'bg-blue-500/30 text-blue-200' : 'bg-white/20 text-white/80'}`}>
                      {empresa.tipo === 'MATRIZ' ? 'Matriz' : 'Filial'}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {user?.perfil === 'CLIENTE' && (
                  <Button variant="ghost" onClick={() => navigate(`/cliente/${empresaId}/coparticipacao`, { state: location.state })} className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20 shrink-0">
                    <DollarSign className="mr-2 h-4 w-4" /> Minha Coparticipação <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {user?.perfil === 'CLIENTE' && (
                  <Button
                    variant="ghost"
                    onClick={() => setBoletoSelectorOpen(true)}
                    className={temBoletoMesAtual
                      ? "text-white hover:text-white bg-white/20 hover:bg-white/30 border border-white/40 shrink-0 font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/10 border border-white/20 shrink-0"
                    }
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    {temBoletoMesAtual ? 'Boleto Disponível' : 'Boleto'}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => { setImportStep('upload'); setImportedRows([]); setIsImportOpen(true); }} className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20 shrink-0">
                  <Upload className="mr-2 h-4 w-4" /> Importar Beneficiários
                </Button>
                {(user?.perfil === 'ADM' || user?.perfil === 'CEO') && (
                  <Button variant="ghost" onClick={() => { setImportPlanosStep('upload'); setImportPlanosRows([]); setIsImportPlanosOpen(true); }} className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20 shrink-0">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar Planos
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />) : (
                  <>
                    <MetricCard title="Total de Beneficiários" value={metrics.total} icon={Users} color="text-[#003580]" />
                    <MetricCard title="Titulares" value={metrics.titulares} icon={User} color="text-[#003580]" />
                    <MetricCard title="Dependentes" value={metrics.dependentes} icon={Users} color="text-[#003580]" />
                    <MetricCard title="Beneficiários Ativos" value={metrics.ativos} icon={UserCheck} color="text-[#003580]" />
                  </>
               )}
            </div>
          </div>
          
          <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>Beneficiários</CardTitle>
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                        {selectedIds.size > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={isBulkDeleting}>
                                {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Excluir {selectedIds.size} selecionado(s)
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
                                <AlertDialogDescription>Você está prestes a excluir <strong>{selectedIds.size} beneficiário(s)</strong>. Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={deleteSelected} className={buttonVariants({ variant: 'destructive' })}>Excluir todos</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Buscar por nome, CPF ou carteirinha..." className="pl-10 w-full sm:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos</SelectItem>
                                <SelectItem value="ATIVO">Ativos</SelectItem>
                                <SelectItem value="INATIVO">Inativos</SelectItem>
                                <SelectItem value="AFASTADO">Afastados</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => setSortAge(v => v === 'asc' ? null : 'asc')}
                            className={`text-xs px-2 ${sortAge === 'asc' ? 'bg-[#003580] text-white border-[#003580]' : ''}`}
                            title="Idade: menor → maior">↑ Idade</Button>
                          <Button variant="outline" size="sm" onClick={() => setSortAge(v => v === 'desc' ? null : 'desc')}
                            className={`text-xs px-2 ${sortAge === 'desc' ? 'bg-[#003580] text-white border-[#003580]' : ''}`}
                            title="Idade: maior → menor">↓ Idade</Button>
                        </div>
                        <Button onClick={openModalToAdd} className="w-full sm:w-auto bg-[#003580] hover:bg-[#002060] text-white"> Adicionar</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                     </div>
                ) : filteredBeneficiarios.length > 0 ? (
                    <>
                        {/* Mobile: cards accordion */}
                        <div className="sm:hidden space-y-2">
                            {currentBeneficiarios.map((b) => {
                                const isOpen = expandedBenefId === b.id;
                                return (
                                    <div key={b.id} className={`rounded-lg border ${selectedIds.has(b.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                        <button
                                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                                            onClick={() => setExpandedBenefId(isOpen ? null : b.id)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Checkbox
                                                    checked={selectedIds.has(b.id)}
                                                    onCheckedChange={(v) => setSelectedIds(prev => {
                                                        const next = new Set(prev);
                                                        v ? next.add(b.id) : next.delete(b.id);
                                                        return next;
                                                    })}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-gray-900 truncate">{b.nome_completo}</p>
                                                    {b.parentesco !== 'TITULAR' && <p className="text-xs text-gray-400 truncate">Titular: {b.nome_titular}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <Badge className={getBadgeClass(b.situacao)} variant="secondary">{b.situacao}</Badge>
                                                {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                            </div>
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <div><span className="text-xs text-gray-400 block">CPF</span><span className="font-medium">{formatCpfCnpj(b.cpf)}</span></div>
                                                    <div><span className="text-xs text-gray-400 block">Parentesco</span><span className="font-medium">{b.parentesco}</span></div>
                                                    <div><span className="text-xs text-gray-400 block">Idade</span><span className="font-medium">{b.data_nascimento ? `${calculateAge(b.data_nascimento)} anos` : <span className="text-gray-400">-</span>}</span></div>
                                                    <div>
                                                        <span className="text-xs text-gray-400 block">Planos</span>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                            {isPlanAtivo(b, 'saude') && <Badge variant="outline" className="text-xs bg-blue-50 text-[#003580] border-blue-200">Saúde</Badge>}
                                                            {isPlanAtivo(b, 'vida') && <Badge variant="outline" className="text-xs bg-blue-50 text-[#003580] border-blue-200">Vida</Badge>}
                                                            {isPlanAtivo(b, 'odonto') && <Badge variant="outline" className="text-xs bg-blue-50 text-[#003580] border-blue-200">Odonto</Badge>}
                                                            {!isPlanAtivo(b, 'saude') && !isPlanAtivo(b, 'vida') && !isPlanAtivo(b, 'odonto') && <span className="text-gray-400 text-xs">-</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <Button variant="outline" size="sm" className="flex-1 text-[#003580] border-[#003580]" onClick={() => openModalToEdit(b)}><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-300"><Trash2 className="h-3.5 w-3.5 mr-1" />Excluir</Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita. Tem certeza que deseja excluir <strong>{b.nome_completo}</strong>?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteBeneficiario(b.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: tabela */}
                        <div className="hidden sm:block rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                          <Checkbox
                                            checked={currentBeneficiarios.length > 0 && currentBeneficiarios.every(b => selectedIds.has(b.id))}
                                            onCheckedChange={(v) => {
                                              setSelectedIds(prev => {
                                                const next = new Set(prev);
                                                if (v) filteredBeneficiarios.forEach(b => next.add(b.id));
                                                else filteredBeneficiarios.forEach(b => next.delete(b.id));
                                                return next;
                                              });
                                            }}
                                          />
                                        </TableHead>
                                        <TableHead>Nome Completo</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Parentesco</TableHead>
                                        <TableHead>Idade</TableHead>
                                        <TableHead>Planos Ativos</TableHead>
                                        <TableHead>Situação</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentBeneficiarios.map((b) => (
                                        <TableRow key={b.id} data-selected={selectedIds.has(b.id)} className={selectedIds.has(b.id) ? 'bg-blue-50' : ''}>
                                            <TableCell>
                                              <Checkbox
                                                checked={selectedIds.has(b.id)}
                                                onCheckedChange={(v) => setSelectedIds(prev => {
                                                  const next = new Set(prev);
                                                  v ? next.add(b.id) : next.delete(b.id);
                                                  return next;
                                                })}
                                              />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{b.nome_completo}</span>
                                                    {b.parentesco !== 'TITULAR' && <span className="text-xs text-gray-500">Titular: {b.nome_titular}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatCpfCnpj(b.cpf)}</TableCell>
                                            <TableCell>{b.parentesco}</TableCell>
                                            <TableCell>{b.data_nascimento ? `${calculateAge(b.data_nascimento)} anos` : <span className="text-gray-400 text-xs">-</span>}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {isPlanAtivo(b, 'saude') && <Badge variant="outline" className="bg-blue-50 text-[#003580] hover:bg-blue-50 hover:text-[#003580] border-blue-200">Saúde</Badge>}
                                                    {isPlanAtivo(b, 'vida') && <Badge variant="outline" className="bg-blue-50 text-[#003580] hover:bg-blue-50 hover:text-[#003580] border-blue-200">Vida</Badge>}
                                                    {isPlanAtivo(b, 'odonto') && <Badge variant="outline" className="bg-blue-50 text-[#003580] hover:bg-blue-50 hover:text-[#003580] border-blue-200">Odonto</Badge>}
                                                    {!isPlanAtivo(b, 'saude') && !isPlanAtivo(b, 'vida') && !isPlanAtivo(b, 'odonto') && <span className="text-gray-400 text-xs">-</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge className={getBadgeClass(b.situacao)} variant="secondary">{b.situacao}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openModalToEdit(b)} title="Editar"><Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita. Tem certeza que deseja excluir <strong>{b.nome_completo}</strong>?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteBeneficiario(b.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                            <div className="text-sm text-gray-600">Página {currentPage} de {totalPages}</div>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>Próxima</Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                         <div className="bg-gray-100 p-4 rounded-full mb-4"><Search className="h-8 w-8 text-gray-400" /></div>
                         <h3 className="text-lg font-medium text-gray-900">Nenhum beneficiário encontrado</h3>
                         <p className="text-gray-500 max-w-sm mt-1">Não encontramos beneficiários com os filtros atuais. Tente mudar o termo de busca ou adicionar um novo.</p>
                         <Button onClick={openModalToAdd} variant="link" className="mt-2">Adicionar novo beneficiário</Button>
                    </div>
                )}
            </CardContent>
          </Card>

          {/* Card de Solicitações */}
          {todasSolicitacoesDaEmpresa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" /> Histórico de Solicitações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todasSolicitacoesDaEmpresa.slice(0, 10).map(s => {
                        const ben = beneficiarios.find(b => b.id === s.beneficiario_id);
                        const statusColors = {
                          'PENDENTE': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800',
                          'EM PROCESSAMENTO': 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800',
                          'CONCLUIDA': 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800',
                          'REJEITADA': 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800',
                          'CANCELADA': 'bg-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-600',
                        };
                        const tipoColors = { 'INCLUSAO': 'bg-green-600 hover:bg-green-600', 'EXCLUSAO': 'bg-red-600', 'ALTERACAO': 'bg-blue-600' };
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{ben?.nome_completo || '—'}</TableCell>
                            <TableCell className="capitalize">{s.tipo_plano}</TableCell>
                            <TableCell><Badge className={`text-white ${tipoColors[s.tipo_solicitacao] || 'bg-gray-500'}`}>{s.tipo_solicitacao}</Badge></TableCell>
                            <TableCell><Badge className={statusColors[s.status] || 'bg-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-600'}>{s.status}</Badge></TableCell>
                            <TableCell className="text-sm text-gray-500">{formatDate(s.data_solicitacao)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden"><DialogHeader className="px-4 pt-4"><DialogTitle>{editingBeneficiario ? 'Editar' : 'Adicionar'} Beneficiário</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">{isModalOpen && <ModalFormContent formData={formData} setFormData={setFormData} age={age} titulares={titulares} beneficiario={editingBeneficiario} isCliente={user.perfil === 'CLIENTE'} openSolicitacaoDialog={openSolicitacaoDialog} renderPlanStatusCard={renderPlanStatusCard} setIsExclusaoModalOpen={setIsExclusaoModalOpen} setExclusaoData={setExclusaoData} handleSolicitarAlteracao={handleSolicitarAlteracao} />}<DialogFooter className="px-4 mt-4 pb-4"><Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter></form></DialogContent></Dialog>
        {editingBeneficiario && user.perfil === 'CLIENTE' && (<Dialog open={isSolicitacaoDialogOpen} onOpenChange={(open) => { if (!open) setIsSolicitacaoDialogOpen(false); }}><DialogContent className="sm:max-w-[425px] sm:max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Solicitar Inclusão</DialogTitle><DialogDescription>Selecione os planos que deseja solicitar para este beneficiário.</DialogDescription></DialogHeader><div className="py-4 space-y-4">{renderPlanSelectionItem('saude', 'Plano de Saúde', Hospital, 'text-[#003580]')}{renderPlanSelectionItem('vida', 'Seguro de Vida', Heart, 'text-[#003580]')}{renderPlanSelectionItem('odonto', 'Plano Odonto', Smile, 'text-[#003580]')}</div><DialogFooter><Button variant="outline" onClick={() => setIsSolicitacaoDialogOpen(false)}>Fechar</Button><Button onClick={confirmSolicitacao}>Confirmar Solicitação</Button></DialogFooter></DialogContent></Dialog>)}
        <Dialog open={isExclusaoModalOpen} onOpenChange={setIsExclusaoModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Solicitar Exclusão de Plano</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dataExclusao">Data da Exclusão</Label>
                <Input id="dataExclusao" type="date" value={exclusaoData.dataExclusao} onChange={(e) => setExclusaoData({...exclusaoData, dataExclusao: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Textarea id="motivo" value={exclusaoData.motivo} onChange={(e) => setExclusaoData({...exclusaoData, motivo: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="obsExclusao">Observação</Label>
                <Textarea id="obsExclusao" placeholder="Observações adicionais (opcional)" value={exclusaoData.observacao} onChange={(e) => setExclusaoData({...exclusaoData, observacao: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExclusaoModalOpen(false)}>Cancelar</Button>
              <Button onClick={() => { handleSolicitarExclusao(exclusaoData.beneficiarioId, exclusaoData.tipoPlano, exclusaoData.motivo, exclusaoData.dataExclusao, exclusaoData.observacao); }}>Enviar Solicitação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isInclusaoDetalheOpen} onOpenChange={setIsInclusaoDetalheOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dados da Inclusão</DialogTitle>
              <DialogDescription>Informe os detalhes da solicitação de inclusão.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dataInclusao">Data de Inclusão</Label>
                <Input id="dataInclusao" type="date" value={inclusaoData.dataInclusao} onChange={(e) => setInclusaoData({...inclusaoData, dataInclusao: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="motivoInclusao">Motivo</Label>
                <Textarea id="motivoInclusao" placeholder="Motivo da inclusão" value={inclusaoData.motivo} onChange={(e) => setInclusaoData({...inclusaoData, motivo: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="obsInclusao">Observação</Label>
                <Textarea id="obsInclusao" placeholder="Observações adicionais (opcional)" value={inclusaoData.observacao} onChange={(e) => setInclusaoData({...inclusaoData, observacao: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInclusaoDetalheOpen(false)}>Cancelar</Button>
              <Button onClick={confirmarInclusaoComDetalhes} className="bg-[#003580] hover:bg-[#002060] text-white">Confirmar Solicitação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isAlteracaoModalOpen} onOpenChange={setIsAlteracaoModalOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar Alteração de Plano</DialogTitle><DialogDescription>Você está solicitando a alteração do plano <strong>{alteracaoData.tipoPlano}</strong>.</DialogDescription></DialogHeader><div className="py-4 text-sm text-gray-600"><p>Ao confirmar, uma solicitação de alteração será enviada para a administração.</p><p className="mt-2">Você poderá acompanhar o status desta solicitação no painel do beneficiário.</p></div><DialogFooter><Button variant="outline" onClick={() => setIsAlteracaoModalOpen(false)}>Cancelar</Button><Button onClick={confirmAlteracao} className="bg-blue-600 hover:bg-blue-700 text-white">Confirmar Alteração</Button></DialogFooter></DialogContent></Dialog>

        {/* ── Modal Importar Beneficiários ── */}
        <Dialog open={isImportOpen} onOpenChange={(v) => { if (!isParsing && !importSaving) { setIsImportOpen(v); if (!v) { setImportStep('upload'); setImportedRows([]); } } }}>
          <DialogContent className="w-[95vw] max-w-[90vw] xl:max-w-7xl rounded-2xl p-0 overflow-hidden">
            <div className="overflow-y-auto max-h-[90vh] p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#003580]" /> Importar Beneficiários
              </DialogTitle>
            </DialogHeader>

            {/* Step: upload */}
            {importStep === 'upload' && (
              <div className="space-y-6 py-4">
                <p className="text-sm text-gray-500">Selecione um arquivo da seguradora. Suportamos PDF (IA extrai os dados automaticamente) e Excel/CSV.</p>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#003580]/50 hover:bg-blue-50/30 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Clique ou arraste o arquivo aqui</span>
                  <span className="text-xs text-gray-400 mt-1">.pdf, .xlsx, .xls, .csv</span>
                  <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800">
                    <FilePdf className="h-4 w-4 mb-1" /><strong>PDF</strong><br/>IA da Anthropic lê o documento e extrai todos os beneficiários automaticamente, inclusive dependentes vinculados ao titular.
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-xs text-green-800">
                    <FileSpreadsheet className="h-4 w-4 mb-1" /><strong>Excel / CSV</strong><br/>Detecta colunas automaticamente: nome, CPF, nascimento, parentesco, matrícula, situação, nome do titular.
                  </div>
                </div>
              </div>
            )}

            {/* Step: parsing */}
            {importStep === 'parsing' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#003580]" />
                <p className="text-sm font-medium text-gray-600">Analisando arquivo com IA…</p>
                <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
              </div>
            )}

            {/* Step: preview */}
            {importStep === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <strong>{importedRows.filter(r => !r._jaExiste).length}</strong> novos · <span className="text-yellow-600"><strong>{importedRows.filter(r => r._jaExiste).length}</strong> já cadastrados (serão ignorados)</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setImportStep('upload')}>Trocar arquivo</Button>
                </div>

                <div className="overflow-auto rounded-lg border max-h-[45vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Nome</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">CPF</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Nascimento</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Parentesco</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Titular</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600">Planos</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importedRows.map((row, i) => (
                        <tr key={i} className={row._jaExiste ? 'bg-yellow-50' : row._skip ? 'bg-gray-50 opacity-50' : 'bg-white'}>
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">{row.nome_completo}</td>
                          <td className="px-3 py-2 text-gray-500">{row.cpf ? row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{row.data_nascimento ? row.data_nascimento.split('-').reverse().join('/') : '—'}</td>
                          <td className="px-3 py-2">
                            <Select value={row.parentesco} onValueChange={v => setImportedRows(prev => prev.map((r,j) => j===i ? {...r, parentesco: v} : r))}>
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>{PARENTESCO_OPTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-[130px] truncate">{row.nome_titular || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {[['S','saude_ativo','bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700'],['O','odonto_ativo','bg-purple-100 text-purple-700'],['V','vida_ativo','bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700']].map(([lbl, key, cls]) => (
                                <button key={key} onClick={() => setImportedRows(prev => prev.map((r,j) => j===i ? {...r, [key]: !r[key]} : r))}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-opacity ${row[key] ? cls : 'bg-gray-100 text-gray-400'}`}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row._jaExiste
                              ? <span className="text-yellow-600 font-medium flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3"/>Existe</span>
                              : <span className="text-green-600 font-medium flex items-center justify-center gap-1"><CheckCheck className="h-3 w-3"/>Novo</span>
                            }
                          </td>
                          <td className="px-3 py-2 text-center">
                            {!row._jaExiste && (
                              <button onClick={() => setImportedRows(prev => prev.map((r,j) => j===i ? {...r, _skip: !r._skip} : r))}
                                className={`text-xs px-2 py-0.5 rounded ${row._skip ? 'bg-gray-200 text-gray-500' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                                {row._skip ? 'Incluir' : 'Ignorar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400">Clique nos botões S/O/V para ativar/desativar planos (Saúde, Odonto, Vida). Ajuste o parentesco se necessário.</p>
              </div>
            )}

            {/* Step: saving */}
            {importStep === 'saving' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#003580]" />
                <p className="text-sm font-medium text-gray-600">Salvando beneficiários…</p>
              </div>
            )}

            {importStep === 'preview' && (
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setIsImportOpen(false); setImportStep('upload'); setImportedRows([]); }}>Cancelar</Button>
                <Button onClick={handleSaveImport} disabled={importedRows.filter(r => !r._jaExiste && !r._skip).length === 0} className="bg-[#003580] hover:bg-[#002060] text-white">
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Importar {importedRows.filter(r => !r._jaExiste && !r._skip).length} beneficiário(s)
                </Button>
              </DialogFooter>
            )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal Importar Planos (Relatório Matriz) — só ADM/CEO ── */}
        <Dialog open={isImportPlanosOpen} onOpenChange={(v) => { if (!isParsingPlanos && !importPlanosSaving) { setIsImportPlanosOpen(v); if (!v) { setImportPlanosStep('upload'); setImportPlanosRows([]); } } }}>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#003580]" /> Importar Planos — Relatório Matriz
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4">

              {/* Upload */}
              {importPlanosStep === 'upload' && (
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-[#003580] hover:bg-blue-50/40 transition-colors">
                  <FileSpreadsheet className="h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Clique ou arraste o PDF do Relatório Matriz aqui</p>
                  <p className="text-xs text-gray-400">Relação de Segurados Ativos (Sul América, Bradesco, Amil, etc.)</p>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handlePlanosFile(e.target.files[0])} />
                </label>
              )}

              {/* Parsing */}
              {importPlanosStep === 'parsing' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-[#003580]" />
                  <p className="text-sm font-medium text-gray-600">Lendo Relatório Matriz com IA…</p>
                </div>
              )}

              {/* Saving */}
              {importPlanosStep === 'saving' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-[#003580]" />
                  <p className="text-sm font-medium text-gray-600">Atualizando beneficiários…</p>
                </div>
              )}

              {/* Preview */}
              {importPlanosStep === 'preview' && (() => {
                const matched = importPlanosRows.filter(r => r._matchedId);
                const notFound = importPlanosRows.filter(r => !r._matchedId);
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700 px-2 py-0.5 rounded-full font-medium">{matched.length} encontrado(s)</span>
                      {notFound.length > 0 && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{notFound.length} não encontrado(s)</span>}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                          <tr>
                            <th className="px-3 py-2 text-left">Nome</th>
                            <th className="px-3 py-2 text-left">CPF</th>
                            <th className="px-3 py-2 text-left">Plano</th>
                            <th className="px-3 py-2 text-left">Carteirinha</th>
                            <th className="px-3 py-2 text-left">Início Vig.</th>
                            <th className="px-3 py-2 text-right">Prêmio</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importPlanosRows.map((r, i) => (
                            <tr key={i} className={r._matchedId ? 'bg-white' : 'bg-gray-50 opacity-60'}>
                              <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">{r.nome_completo}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono">{r.cpf ? `${r.cpf.substring(0,3)}.***.***-${r.cpf.substring(9)}` : '—'}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{r.plano}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{r.cod_identificacao}</td>
                              <td className="px-3 py-2 text-gray-500">{r.inicio_vigencia ? r.inicio_vigencia.split('-').reverse().join('/') : '—'}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{r.premio ? `R$ ${Number(r.premio).toFixed(2).replace('.', ',')}` : '—'}</td>
                              <td className="px-3 py-2 text-center">
                                {r._matchedId
                                  ? <span className="text-green-600 font-semibold">✓ Encontrado</span>
                                  : <span className="text-gray-400">Não encontrado</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {notFound.length > 0 && (
                      <p className="text-xs text-gray-400">* Beneficiários "não encontrados" não serão alterados (CPF não cadastrado nesta empresa).</p>
                    )}
                  </div>
                );
              })()}

            </div>

            {importPlanosStep === 'preview' && (
              <div className="px-5 py-3 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsImportPlanosOpen(false); setImportPlanosStep('upload'); setImportPlanosRows([]); }}>Cancelar</Button>
                <Button onClick={handleSavePlanos} disabled={importPlanosRows.filter(r => r._matchedId).length === 0} className="bg-[#003580] hover:bg-[#002060] text-white">
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Atualizar {importPlanosRows.filter(r => r._matchedId).length} beneficiário(s)
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

      {/* Modal Seletor de Mês — Boleto cliente */}
      <Dialog open={boletoSelectorOpen} onOpenChange={setBoletoSelectorOpen}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#003580]" /> Selecionar Mês
            </DialogTitle>
            <DialogDescription>Escolha o mês para visualizar o boleto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {MES_OPTS_CLIENTE.map(({ val, label }) => {
              const boleto = boletos.find(b => b.mes_referencia === val);
              return (
                <button
                  key={val}
                  onClick={async () => {
                    setBoletoSelectorOpen(false);
                    if (!boleto) {
                      toast({ title: 'Boleto não disponível', description: `Nenhum boleto cadastrado para ${label}.` });
                      return;
                    }
                    setLoadingBoletoPreview(true);
                    setBoletoPreviewCliente({ url: null, mes: val });
                    try {
                      const url = await boletosService.getSignedUrl(boleto.arquivo_url);
                      setBoletoPreviewCliente({ url, mes: val });
                    } catch { setBoletoPreviewCliente({ url: boleto.arquivo_url, mes: val }); }
                    finally { setLoadingBoletoPreview(false); }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                    boleto
                      ? 'border-[#003580]/20 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <span className="font-medium text-gray-800">{label}</span>
                  {boleto
                    ? <span className="text-xs font-medium text-[#003580] bg-blue-100 px-2 py-0.5 rounded-full">Disponível</span>
                    : <span className="text-xs text-gray-400">Não disponível</span>
                  }
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Boleto — cliente */}
      <Dialog open={!!boletoPreviewCliente} onOpenChange={(open) => { if (!open) setBoletoPreviewCliente(null); }}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-5 pt-4 pb-3 border-b flex flex-row items-center justify-between pr-12">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-[#003580]" />
              Boleto{boletoPreviewCliente ? ` — ${(() => { try { const [y,m] = boletoPreviewCliente.mes.split('-'); const d = new Date(Number(y), Number(m)-1, 1); const l = d.toLocaleString('pt-BR',{month:'long',year:'numeric'}); return l.charAt(0).toUpperCase()+l.slice(1); } catch { return boletoPreviewCliente.mes; } })()}` : ''}
            </DialogTitle>
            {boletoPreviewCliente?.url && (
              <a href={boletoPreviewCliente.url} download target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white">
                  <Download className="h-4 w-4 mr-1.5" /> Baixar PDF
                </Button>
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-gray-100">
            {loadingBoletoPreview || !boletoPreviewCliente?.url ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
              </div>
            ) : (
              <iframe src={boletoPreviewCliente.url} className="w-full h-full border-0" title="Boleto PDF" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      </DashboardLayout>
    </>
  );
};

export default ClientDashboard;