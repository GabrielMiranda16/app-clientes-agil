import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  HeartHandshake, FileText, Clock, CheckCircle2, DollarSign,
  X, Send, Loader2, ChevronRight, Copy, Check,
  Upload, Eye, Plus, Minus, Trash2, ArrowRight, Star,
  Link as LinkIcon, ChevronDown, Shield, ArrowUp, ArrowDown, Edit2,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { SEGURADORAS } from '@/data/seguradoras';

const STATUS_CONFIG = {
  SOLICITACAO: { label: 'Solicitação',        color: 'bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700',    border: 'border-l-gray-400' },
  ORCAMENTO:   { label: 'Orçamento',          color: 'bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700',    border: 'border-l-blue-400' },
  DOCUMENTOS:  { label: 'Documentos',         color: 'bg-blue-100 text-[#003580] hover:bg-blue-100 hover:text-[#003580]',   border: 'border-l-[#003580]' },
  ASSINATURA:  { label: 'Assinatura/Transmitida', color: 'bg-blue-100 text-[#003580] hover:bg-blue-100 hover:text-[#003580]', border: 'border-l-[#003580]' },
  CONCLUIDO:   { label: 'Concluído',          color: 'bg-blue-100 text-[#003580] hover:bg-blue-100 hover:text-[#003580]',   border: 'border-l-[#003580]' },
  COMISSAO:    { label: 'Comissão',           color: 'bg-blue-100 text-[#003580] hover:bg-blue-100 hover:text-[#003580]',   border: 'border-l-[#003580]' },
};
const assinaturaLabel = seg => ['SAUDE', 'VIDA', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'].includes(seg) ? 'Assinatura' : 'Transmitida';

const SEGMENTO_LABEL = {
  AUTO:         'Seguro Auto',
  SAUDE:        'Plano de Saúde',
  RESIDENCIAL:  'Seguro Residencial',
  EMPRESARIAL:  'Seguro Empresarial',
  ODONTOLOGICO: 'Plano Odontológico',
  VIAGEM:       'Seguro Viagem',
  PET_SAUDE:    'Plano de Saúde Pet',
  PET_SEGURO:   'Seguro Pet',
  VIDA:         'Seguro de Vida',
  FROTA:        'Seguro Frota',
  CARGAS:       'Seguro de Cargas',
  EQUIPAMENTOS: 'Equipamentos Portáteis',
};

const DOCS_POR_SEGMENTO = {
  AUTO:         ['CRLV', 'CNH', 'CPF'],
  RESIDENCIAL:  ['RG', 'CPF', 'Comprovante de residência', 'Escritura ou contrato do imóvel'],
  EMPRESARIAL:  ['CNPJ', 'Contrato Social', 'Comprovante de endereço da empresa'],
  VIAGEM:       ['RG ou Passaporte', 'CPF'],
  PET_SAUDE:    ['CPF do titular', 'Cartão de vacinação do pet'],
  PET_SEGURO:   ['CPF do titular', 'Cartão de vacinação do pet'],
  VIDA:         ['RG', 'CPF', 'Comprovante de renda'],
  FROTA:        ['CNPJ', 'CRLV de todos os veículos', 'CNH dos motoristas'],
  CARGAS:       ['CPF ou CNPJ', 'Nota fiscal da carga'],
  EQUIPAMENTOS: ['CPF ou CNPJ', 'Nota fiscal do equipamento'],
};

const DOCS_POR_MODALIDADE = {
  SAUDE: {
    INDIVIDUAL: [
      'RG e CPF ou CNH — Titular',
      'Comprovante de residência — Titular',
      'Carta de permanência — Plano anterior (se houver)',
    ],
    MEI: [
      'RG e CPF ou CNH — Titular',
      'Comprovante de residência — Titular',
      'Certificado MEI (requerimento do microempreendedor)',
      'Cartão do CNPJ',
      'RG e CPF ou CNH — Dependentes',
      'Comprovante de parentesco — Dependentes e agregados',
      'Carta de permanência — Plano anterior (se houver)',
    ],
    PME: [
      'Contrato Social / Estatuto Social (Ata)',
      'Cartão do CNPJ',
      'Relação atualizada do FGTS com quitação e capa GFIP',
      'Relação atualizada do plano anterior — se 100% de adesão (se houver)',
      'RG e CPF ou CNH — Todos os beneficiários',
      'Comprovante de parentesco — Dependentes e agregados',
    ],
    PJ: [
      'Contrato Social / Estatuto Social (Ata)',
      'Cartão do CNPJ',
      'Relação atualizada do FGTS com quitação e capa GFIP',
      'Relação atualizada do plano anterior — se 100% de adesão (se houver)',
      'RG e CPF ou CNH — Todos os beneficiários',
      'Comprovante de parentesco — Dependentes e agregados',
    ],
  },
  ODONTOLOGICO: {
    INDIVIDUAL: [
      'RG e CPF ou CNH — Titular',
      'Comprovante de residência — Titular',
      'Carta de permanência — Plano anterior (se houver)',
    ],
    MEI: [
      'RG e CPF ou CNH — Titular',
      'Comprovante de residência — Titular',
      'Certificado MEI (requerimento do microempreendedor)',
      'Cartão do CNPJ',
      'RG e CPF ou CNH — Dependentes',
      'Comprovante de parentesco — Dependentes e agregados',
      'Carta de permanência — Plano anterior (se houver)',
    ],
    PME: [
      'Contrato Social / Estatuto Social (Ata)',
      'Cartão do CNPJ',
      'Relação atualizada do FGTS com quitação e capa GFIP',
      'RG e CPF ou CNH — Todos os beneficiários',
      'Comprovante de parentesco — Dependentes e agregados',
    ],
    PJ: [
      'Contrato Social / Estatuto Social (Ata)',
      'Cartão do CNPJ',
      'Relação atualizada do FGTS com quitação e capa GFIP',
      'RG e CPF ou CNH — Todos os beneficiários',
      'Comprovante de parentesco — Dependentes e agregados',
    ],
  },
};

const AGE_BRACKETS = [
  { id: '0-18',  label: '0 a 18 anos' },
  { id: '19-23', label: '19 a 23 anos' },
  { id: '24-28', label: '24 a 28 anos' },
  { id: '29-33', label: '29 a 33 anos' },
  { id: '34-38', label: '34 a 38 anos' },
  { id: '39-43', label: '39 a 43 anos' },
  { id: '44-48', label: '44 a 48 anos' },
  { id: '49-53', label: '49 a 53 anos' },
  { id: '54-58', label: '54 a 58 anos' },
  { id: '59+',   label: '59+ anos' },
];
const faixaKey = (id) => `faixa_${id.replace(/-/g, '_').replace('+', 'plus')}`;

const CAMPOS_SEGMENTO = {
  SAUDE: [
    { key: 'tipo', label: 'Modalidade do plano', type: 'select', options: ['INDIVIDUAL', 'MEI', 'PME', 'PJ'] },
    { key: 'vidas', label: 'Nº de vidas', type: 'number', placeholder: 'Ex: 3' },
  ],
  ODONTOLOGICO: [
    { key: 'tipo', label: 'Modalidade do plano', type: 'select', options: ['INDIVIDUAL', 'MEI', 'PME', 'PJ'] },
    { key: 'vidas', label: 'Nº de vidas', type: 'number', placeholder: 'Ex: 2' },
  ],
  AUTO: [
    { key: 'placa',          label: 'Placa',              header: 'Dados do veículo', type: 'plate', placeholder: 'Ex: ABC1D23' },
    { key: 'chassi',         label: 'Chassi',             type: 'text',   placeholder: 'Auto-preenchido pela placa', optional: true },
    { key: 'modelo_veiculo', label: 'Modelo',             type: 'text',   placeholder: 'Auto-preenchido pela placa', optional: true },
    { key: 'ano_fabricacao', label: 'Ano de fabricação',  type: 'number', placeholder: 'Ex: 2023' },
    { key: 'tipo_uso',       label: 'Tipo de uso',        header: 'Uso do veículo', type: 'select',
      options: ['Particular','Táxi','Frete','Misto','Lotação','Bombeiro','Ambulância','Policiamento','Escolar','Test Drive','Diferenciado','Transporte por Aplicativo'] },
    { key: 'cep',            label: 'CEP',                header: 'Endereço', type: 'cep', placeholder: 'Ex: 01310-100' },
    { key: 'rua',            label: 'Rua / Logradouro',   type: 'text',   placeholder: 'Auto-preenchido pelo CEP', optional: true },
    { key: 'numero',         label: 'Número',             type: 'text',   placeholder: 'Ex: 123' },
    { key: 'complemento',    label: 'Complemento',        type: 'text',   placeholder: 'Ex: Apto 42', optional: true },
    { key: 'cor',            label: 'Cor',                type: 'text',   optional: true, hidden: true },
    { key: 'municipio',      label: 'Município',          type: 'text',   optional: true, hidden: true },
    { key: 'origem',         label: 'Origem',             type: 'text',   optional: true, hidden: true },
    { key: 'logo_marca',     label: 'Logo',               type: 'text',   optional: true, hidden: true },
  ],
  RESIDENCIAL: [
    { key: 'tipo_imovel',  label: 'Tipo de imóvel',        type: 'select', options: ['Casa', 'Apartamento', 'Sobrado'] },
    { key: 'cep',          label: 'CEP do imóvel',          header: 'Endereço', type: 'cep', placeholder: 'Ex: 01310-100' },
    { key: 'rua',          label: 'Rua / Logradouro',       type: 'text',   placeholder: 'Auto-preenchido pelo CEP', optional: true },
    { key: 'numero',       label: 'Número',                 type: 'text',   placeholder: 'Ex: 123' },
    { key: 'complemento',  label: 'Complemento',            type: 'text',   placeholder: 'Ex: Apto 42', optional: true },
    { key: 'valor_imovel', label: 'Valor aproximado (R$)',  type: 'text',   placeholder: 'Ex: 350.000,00', money: true },
  ],
  EMPRESARIAL: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Empresa ABC Ltda' },
    { key: 'cnpj_empresa', label: 'CNPJ da empresa', type: 'text', placeholder: 'Ex: 00.000.000/0001-00' },
    { key: 'qtd_vidas', label: 'Número de vidas', type: 'number', placeholder: 'Ex: 10' },
    { key: 'segmento_empresa', label: 'Segmento da empresa', type: 'text', placeholder: 'Ex: Tecnologia, Varejo, Saúde' },
  ],
  VIDA: [
    { key: 'cobertura_desejada', label: 'Valor de cobertura desejado (R$)', type: 'text', placeholder: 'Ex: 100.000' },
  ],
  VIAGEM: [
    { key: 'tipo_viagem',  label: 'Tipo da viagem',                  type: 'select', options: ['Nacional', 'Internacional'] },
    { key: 'destino',      label: 'Destino',                         type: 'text',   placeholder: 'Ex: Portugal, EUA, Nordeste' },
    { key: 'data_saida',   label: 'Data de saída',                   type: 'date' },
    { key: 'data_retorno', label: 'Data de retorno',                 type: 'date' },
    { key: 'utiliza_moto', label: 'Utilizará moto?',                 type: 'select', options: ['Não', 'Sim'] },
    { key: 'pax_0_70',     label: 'Passageiros de 0 a 70 anos',     type: 'number', placeholder: 'Ex: 2' },
    { key: 'pax_71_90',    label: 'Passageiros de 71 a 90 anos',    type: 'number', placeholder: 'Ex: 0', optional: true },
  ],
  PET_SAUDE: [
    { key: 'nome_pet', label: 'Nome do pet', type: 'text', placeholder: 'Ex: Rex' },
    { key: 'raca_pet', label: 'Raça do pet', type: 'text', placeholder: 'Ex: Golden Retriever' },
    { key: 'idade_pet', label: 'Idade do pet', type: 'text', placeholder: 'Ex: 3 anos' },
  ],
  PET_SEGURO: [
    { key: 'nome_pet', label: 'Nome do pet', type: 'text', placeholder: 'Ex: Rex' },
    { key: 'raca_pet', label: 'Raça do pet', type: 'text', placeholder: 'Ex: Golden Retriever' },
    { key: 'idade_pet', label: 'Idade do pet', type: 'text', placeholder: 'Ex: 3 anos' },
  ],
  FROTA: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Transportadora ABC' },
    { key: 'qtd_veiculos', label: 'Número de veículos', type: 'number', placeholder: 'Ex: 5' },
    { key: 'tipo_veiculos', label: 'Tipo de veículos', type: 'text', placeholder: 'Ex: Caminhões, Vans, Carros' },
  ],
  CARGAS: [
    { key: 'nome_empresa', label: 'Nome da empresa', type: 'text', placeholder: 'Ex: Transportadora ABC' },
    { key: 'tipo_mercadoria', label: 'Tipo de carga', type: 'text', placeholder: 'Ex: Eletrônicos, Alimentos' },
    { key: 'trajeto', label: 'Trajeto (origem → destino)', type: 'text', placeholder: 'Ex: São Paulo → Rio de Janeiro' },
    { key: 'valor_carga', label: 'Valor da carga (R$)', type: 'text', placeholder: 'Ex: 50.000,00', money: true },
  ],
  EQUIPAMENTOS: [
    { key: 'tipo_equip', label: 'Tipo de equipamento', type: 'text', placeholder: 'Ex: Notebook, Câmera, Drone' },
    { key: 'descricao_equip', label: 'Descrição do equipamento', type: 'text', placeholder: 'Ex: MacBook Pro M3 14"' },
    { key: 'valor_equip', label: 'Valor do equipamento (R$)', type: 'text', placeholder: 'Ex: 8.000,00', money: true },
  ],
};

const FUNIL = ['SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];

const COBERTURAS_VIAGEM = [
  { key: 'morte_acidental',             label: 'Morte Acidental' },
  { key: 'extravio_bagagem',            label: 'Extravio de Bagagem' },
  { key: 'despesas_medicas',            label: 'Despesas Médicas, Hospitalares e Odontológicas' },
  { key: 'invalidez_permanente',        label: 'Invalidez Permanente Total ou Parcial por Acidente' },
  { key: 'traslado_corpo',              label: 'Traslado de Corpo' },
  { key: 'traslado_medico',             label: 'Traslado Médico' },
  { key: 'regresso_sanitario',          label: 'Regresso Sanitário' },
  { key: 'assistencia_funeral',         label: 'Assistência Funeral Individual' },
  { key: 'hospedagem_apos_alta',        label: 'Hospedagem Após Alta Hospitalar' },
  { key: 'remarcacao_passagem',         label: 'Remarcação de Passagem para Regresso' },
  { key: 'acompanhante_hosp',           label: 'Acompanhante em caso de Hospitalização Prolongada' },
  { key: 'hospedagem_acompanhante',     label: 'Hospedagem para Acompanhante em caso de Hospitalização Prolongada' },
  { key: 'acompanhamento_menor',        label: 'Acompanhamento de Menor' },
  { key: 'remarcacao_familia',          label: 'Remarcação de Passagem para Regresso de Membros da Família' },
  { key: 'despesas_farmaceuticas',      label: 'Despesas Farmacêuticas' },
  { key: 'danos_bagagem',               label: 'Danos de Bagagem' },
];
const BOOL_COBERTURAS_VIAGEM = [
  { key: 'extensao_vigencia',   label: 'Extensão de Vigência por Razões Médicas' },
  { key: 'localizacao_bagagem', label: 'Localização e Encaminhamento de Bagagem' },
  { key: 'perda_documentos',    label: 'Orientação e Envio em caso de Perda de Documentos' },
  { key: 'esportes_lazer',      label: 'Esportes de Lazer e Turismo de Aventura' },
];
const MOEDAS_VIAGEM = ['R$', 'US$', '€'];

const COBERTURAS_RESIDENCIAL = [
  { key: 'incendio_raio_explosao', label: 'Incêndio, raio e explosão',       valKey: 'incendio_raio_explosao_valor' },
  { key: 'vendaval_granizo',       label: 'Vendaval, granizo e fumaça',      valKey: 'vendaval_granizo_valor' },
  { key: 'danos_eletricos',        label: 'Danos elétricos',                 valKey: 'danos_eletricos_valor' },
  { key: 'roubo_bens',             label: 'Roubo e furto de bens',           valKey: 'roubo_bens_valor' },
  { key: 'resp_civil_familiar',    label: 'Responsabilidade civil familiar', valKey: 'resp_civil_familiar_valor' },
  { key: 'perda_aluguel',          label: 'Perda ou pagamento de aluguel',   valKey: 'perda_aluguel_valor' },
  { key: 'danos_terceiros',        label: 'Danos a terceiros',               valKey: 'danos_terceiros_valor' },
  { key: 'quebra_vidros',          label: 'Quebra de vidros',                valKey: null },
  { key: 'assistencia_24h',        label: 'Assistência residencial 24h',     valKey: null },
];

const planoVazio = () => ({ nome: '', valor: '' });
const propVazio = () => ({
  operadora: '', logo_url: '',
  planos: [planoVazio()],
  abrangencia: '',
  acomodacao: '',
  coparticipacao: { tem: false, percentual: '', limitada: false },
  carencia: false,
  rede_url: '',
  destaque: false,
  combinar_com: [],
  cobertura_tipo: '',
  franquia: '',
  lmi_percentual: '',
  franquia_percentual: '',
  franquia_valor: '',
  assistencia_24h: false,
  carro_reserva: false,
  carro_reserva_dias: '',
  cobre_terceiros: false,
  cobre_vidros: false,
  vidros_valor: '',
  rastreador: false,
  rcfv_materiais: false, rcfv_materiais_valor: '',
  rcfv_corporais: false, rcfv_corporais_valor: '',
  danos_morais: false,   danos_morais_valor: '',
  custos_defesa: false,  custos_defesa_valor: '',
  app_passageiros: false, app_passageiros_valor: '',
  blindagem: false,      blindagem_valor: '',
  assistencias: false,
});
const cenarioVazio = () => ({ tem_plano: false, operadora: '', valor: '', vidas: {} });

const parseBRL = (v) => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;
const fmtBRL = (v) => (typeof v === 'string' ? parseBRL(v) : Number(v || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const maskBRL = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10);
  const cents = n % 100;
  const reais = Math.floor(n / 100);
  const reaisStr = reais === 0 ? '0' : reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisStr},${String(cents).padStart(2, '0')}`;
};

const formatPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const formatCpfCnpj = (v) => {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) {
    return d.slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }
  return d.slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
};

const validarCpfDigitos = (cpf) => {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0;
  return r === +d[10];
};

const validarCpfCnpj = (val) => {
  const d = (val || '').replace(/\D/g, '');
  if (d.length === 11) return validarCpfDigitos(val);
  return d.length === 14;
};

const validarTelefone = (tel) => {
  const d = tel.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 11;
};

const validarEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || '').trim());

const generateSlug = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const gerarProtocolo = async (supabaseClient) => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const prefixo = `AGI-${ano}${mes}`;
  // Numeração atômica via função no banco (proximo_numero_protocolo) — imune a
  // corrida entre envios simultâneos e a reuso de número após exclusão de orçamento
  // (o antigo COUNT() recontava as linhas existentes a cada chamada).
  const { data, error } = await supabaseClient.rpc('proximo_numero_protocolo', { p_prefixo: prefixo });
  if (error) throw error;
  return data;
};

const ToggleBtn = ({ value, onChange, labelFalse = 'Não', labelTrue = 'Sim', color = '#003580' }) => (
  <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
    <button type="button" onClick={() => onChange(false)}
      className={`px-3 py-1.5 transition-colors ${!value ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      style={!value ? { background: color } : {}}>
      {labelFalse}
    </button>
    <button type="button" onClick={() => onChange(true)}
      className={`px-3 py-1.5 transition-colors ${value ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      style={value ? { background: color } : {}}>
      {labelTrue}
    </button>
  </div>
);

const AdminParceirosPage = () => {
  const { toast } = useToast();
  const location = useLocation();
  const compInputRef = useRef(null);

  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODOS');
  const [pagina, setPagina] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [uploadingComp, setUploadingComp] = useState(false);

  // Builder
  const [cenarios, setCenarios] = useState([cenarioVazio()]);
  const [propostas, setPropostas] = useState([propVazio()]);
  const [expandedPropIdx, setExpandedPropIdx] = useState(0);

  // Docs form
  const [formR, setFormR] = useState({ docsBase: [], docExtra: '', docsExtras: [] });
  // Comissão
  const [formC, setFormC] = useState({ valor_base: '', comissao_percentual: '', numero_apolice: '', data_vencimento: '' });
  // ORCAMENTO edit modes
  const [editandoProposta, setEditandoProposta] = useState(false);
  const [novaPropostaMode, setNovaPropostaMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({ cliente_nome: '', cliente_telefone: '', cliente_email: '', cliente_cpf: '' });
  const [editandoSolicitacao, setEditandoSolicitacao] = useState(false);
  const [acessos, setAcessos] = useState([]);
  const [selectedComissao, setSelectedComissao] = useState(null);
  const [clienteOnline, setClienteOnline] = useState(false);
  const realtimeSubRef = useRef(null);
  const onlineTimeoutRef = useRef(null);

  // Criar orçamento
  const [parceiros, setParceiros] = useState([]);
  const [criarModal, setCriarModal] = useState(false);
  const [criando, setCriando] = useState(false);
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [novoForm, setNovoForm] = useState({ parceiro_id: '', cliente_nome: '', cliente_telefone: '', cliente_email: '', cliente_cpf: '', cliente_data_nascimento: '', segmento: '', observacoes: '' });
  const [temParceiro, setTemParceiro] = useState(false);
  const [segData, setSegData] = useState({});
  const [cenariosCriar, setCenariosCriar] = useState([{ tem_plano: false, operadora: '', valor: '', vidas: {} }]);
  const addCenarioCriar = () => setCenariosCriar(cs => [...cs, { tem_plano: false, operadora: '', valor: '', vidas: {} }]);
  const removeCenarioCriar = (i) => setCenariosCriar(cs => cs.filter((_, idx) => idx !== i));
  const updCenarioCriar = (i, key, val) => setCenariosCriar(cs => cs.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  const updCenarioCriarVidas = (ci, id, val) => setCenariosCriar(cs => cs.map((c, idx) => idx === ci ? { ...c, vidas: { ...(c.vidas || {}), [id]: val } } : c));

  const handleSegDataChange = async (key, value) => {
    const val = key === 'placa' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value;
    if (key === 'placa') {
      // limpa dados derivados da placa anterior — só reaparecem se a busca desta placa der certo
      setSegData(d => ({ ...d, placa: val, chassi: '', modelo_veiculo: '', ano_fabricacao: '', cor: '', municipio: '', origem: '', logo_marca: '' }));
    } else {
      setSegData(d => ({ ...d, [key]: val }));
    }

    if (key === 'cep') {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 8) {
        try {
          const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
          const json = await res.json();
          if (!json.erro) {
            setSegData(d => ({ ...d, cep: val, rua: json.logradouro || '', bairro: json.bairro || '', cidade: json.localidade || '' }));
          }
        } catch {}
      }
    }

    if (key === 'placa' && val.length === 7) {
      setBuscandoPlaca(true);
      try {
        const { data: json, error } = await supabase.functions.invoke('buscar-placa', { body: { placa: val } });
        if (!error && json && !json.error) {
          setSegData(d => {
            if (d.placa !== val) return d;
            return {
            ...d,
            chassi: json.chassi || d.chassi || '',
            modelo_veiculo: [json.marca || json.MARCA, json.modelo || json.MODELO].filter(Boolean).join(' ').trim() || d.modelo_veiculo || '',
            ano_fabricacao: String(json.extra?.ano_fabricacao || json.ano || d.ano_fabricacao || ''),
            cor: json.cor || d.cor || '',
            municipio: json.municipio ? `${json.municipio}${json.uf ? ' - ' + json.uf : ''}` : d.municipio || '',
            origem: json.origem || d.origem || '',
            logo_marca: json.logo || d.logo_marca || '',
            };
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Placa não encontrada',
            description: json?.error || 'Não foi possível consultar essa placa agora. Preencha os dados manualmente.',
          });
        }
      } catch {
        toast({ variant: 'destructive', title: 'Falha ao consultar placa', description: 'Preencha os dados manualmente.' });
      }
      finally { setBuscandoPlaca(false); }
    }
  };

  const renderCamposSegmento = (segmento, titulo) => {
    const campos = CAMPOS_SEGMENTO[segmento] || [];
    if (!campos.length) return null;
    return (
      <div className="space-y-2 border border-blue-100 rounded-xl p-3 bg-blue-50">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{titulo || `Dados do ${SEGMENTO_LABEL[segmento]}`}</p>
        {campos.map(campo => {
          if (campo.hidden) return null;
          const vazio = !campo.optional && !String(segData[campo.key] || '').trim();
          return (
            <React.Fragment key={campo.key}>
              {campo.header && (
                <p className="text-xs font-semibold text-[#003580] uppercase tracking-wide pt-2">{campo.header}</p>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">
                  {campo.label} {!campo.optional && <span className="text-red-500">*</span>}
                  {campo.key === 'placa' && buscandoPlaca && <span className="text-[#003580] ml-1">buscando...</span>}
                </Label>
                {campo.type === 'select' ? (
                  <select value={segData[campo.key] || ''} onChange={e => handleSegDataChange(campo.key, e.target.value)}
                    className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-[#003580] ${vazio ? 'border-red-300' : 'border-gray-200'}`}>
                    <option value="">Selecionar...</option>
                    {campo.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input value={segData[campo.key] || ''} onChange={e => handleSegDataChange(campo.key, campo.money ? maskBRL(e.target.value) : e.target.value)}
                    type={['cep','plate'].includes(campo.type) ? 'text' : campo.type}
                    maxLength={campo.type === 'cep' ? 9 : campo.type === 'plate' ? 7 : undefined}
                    placeholder={campo.placeholder}
                    className={`bg-white focus:border-[#003580] h-8 text-sm ${vazio ? 'border-red-300' : 'border-gray-200'}`} />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    loadData();
    supabase.from('parceiros').select('id, nome_completo').order('nome_completo').then(({ data }) => setParceiros(data || []));
  }, []);

  useEffect(() => {
    const ld = location.state?.leadData;
    if (!ld) return;
    setNovoForm(f => ({
      ...f,
      cliente_nome: ld.cliente_nome || '',
      cliente_telefone: ld.cliente_telefone || '',
      cliente_email: ld.cliente_email || '',
      cliente_cpf: ld.cliente_cpf || '',
      cliente_data_nascimento: ld.cliente_data_nascimento || '',
      segmento: ld.segmento || '',
    }));
    setCriarModal(true);
    window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    if (!criarModal) { setTemParceiro(false); setNovoForm(f => ({ ...f, parceiro_id: '' })); return; }
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [criarModal]);

  const loadData = async (expandId = null) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orcamentos')
        .select('*, parceiros(nome_completo, modalidade, comissao_percentual, telefone)')
        .order('created_at', { ascending: false });
      setOrcamentos(data || []);
      if (expandId && data) {
        const o = data.find(x => x.id === expandId);
        if (o) {
          setExpandedId(o.id);
          setSelected(o);
          setEditandoProposta(false);
          setNovaPropostaMode(false);
          setConfirmDelete(false);
          setEditandoCliente(false);
          setCenarios([cenarioVazio()]);
          setPropostas([propVazio()]);
          setExpandedPropIdx(0);
          setFormR({ docsBase: DOCS_POR_SEGMENTO[o.segmento] || [], docExtra: '', docsExtras: [] });
          setFormC({ valor_base: '', comissao_percentual: '50' });
          setDocs([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const subscribeAcessos = (orcamentoId) => {
    if (realtimeSubRef.current) supabase.removeChannel(realtimeSubRef.current);
    const channel = supabase
      .channel(`acessos-${orcamentoId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orcamento_acessos', filter: `orcamento_id=eq.${orcamentoId}` }, (payload) => {
        setClienteOnline(true);
        setAcessos(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
        if (onlineTimeoutRef.current) clearTimeout(onlineTimeoutRef.current);
        onlineTimeoutRef.current = setTimeout(() => setClienteOnline(false), 10000);
      })
      .subscribe();
    realtimeSubRef.current = channel;
  };

  const unsubscribeAcessos = () => {
    if (realtimeSubRef.current) { supabase.removeChannel(realtimeSubRef.current); realtimeSubRef.current = null; }
    if (onlineTimeoutRef.current) { clearTimeout(onlineTimeoutRef.current); onlineTimeoutRef.current = null; }
    setClienteOnline(false);
  };

  const toggleExpand = async (o) => {
    if (expandedId === o.id) {
      setExpandedId(null);
      setSelected(null);
      setDocs([]);
      setAcessos([]);
      setConfirmDelete(false);
      unsubscribeAcessos();
      return;
    }
    setExpandedId(o.id);
    setSelected(o);
    setEditandoProposta(false);
    setNovaPropostaMode(false);
    setConfirmDelete(false);
    setEditandoCliente(false);
    setEditandoSolicitacao(false);
    setFormR({
      docsBase: o.lista_documentos || DOCS_POR_SEGMENTO[o.segmento] || [],
      docExtra: '',
      docsExtras: o.docs_extras || [],
    });
    setCenarios(
      o.cenarios_atuais?.length > 0
        ? o.cenarios_atuais.map(c => ({ ...cenarioVazio(), ...c, vidas: (c.vidas && typeof c.vidas === 'object' && !Array.isArray(c.vidas)) ? c.vidas : {} }))
        : [cenarioVazio()]
    );
    setPropostas(
      o.propostas?.length > 0
        ? o.propostas.map(p => ({ ...propVazio(), ...p, planos: p.planos?.length > 0 ? p.planos : [planoVazio()] }))
        : [propVazio()]
    );
    setExpandedPropIdx(0);
    setFormC({
      valor_base: o.valor_mensalidade ? fmtBRL(o.valor_mensalidade) : '',
      comissao_percentual: o.parceiros?.comissao_percentual ? String(o.parceiros.comissao_percentual) : '50',
    });
    const [{ data: docData }, { data: acessoData }] = await Promise.all([
      supabase.from('orcamento_documentos').select('*').eq('orcamento_id', o.id).order('enviado_em', { ascending: true }),
      supabase.from('orcamento_acessos').select('*').eq('orcamento_id', o.id).order('acessado_em', { ascending: false }),
    ]);
    setDocs(docData || []);
    setAcessos(acessoData || []);
    subscribeAcessos(o.id);
    if (o.status === 'COMISSAO') {
      const { data: comData } = await supabase.from('comissoes').select('*').eq('orcamento_id', o.id).maybeSingle();
      setSelectedComissao(comData || null);
    } else {
      setSelectedComissao(null);
    }
  };

  const refreshSelected = async (id) => {
    const [orcRes, docsRes, comRes, acessosRes] = await Promise.allSettled([
      supabase.from('orcamentos').select('*, parceiros(nome_completo, modalidade, comissao_percentual, telefone)').eq('id', id).maybeSingle(),
      supabase.from('orcamento_documentos').select('*').eq('orcamento_id', id).order('enviado_em', { ascending: true }),
      supabase.from('comissoes').select('*').eq('orcamento_id', id).maybeSingle(),
      supabase.from('orcamento_acessos').select('*').eq('orcamento_id', id).order('acessado_em', { ascending: false }),
    ]);
    if (orcRes.status === 'fulfilled' && orcRes.value.data) {
      const data = orcRes.value.data;
      setSelected(data);
      setOrcamentos(prev => prev.map(o => o.id === id ? data : o));
    }
    if (docsRes.status === 'fulfilled') setDocs(docsRes.value.data || []);
    if (comRes.status === 'fulfilled') setSelectedComissao(comRes.value.data || null);
    if (acessosRes.status === 'fulfilled') setAcessos(acessosRes.value.data || []);
  };

  // ── Cenários ──
  const updCenario = (i, field, val) => setCenarios(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  const updCenarioVidasFaixa = (ci, id, val) => setCenarios(cs => cs.map((c, idx) => idx === ci ? { ...c, vidas: { ...(c.vidas || {}), [id]: val } } : c));
  const addCenario = () => setCenarios(cs => [...cs, cenarioVazio()]);
  const removeCenario = (i) => setCenarios(cs => cs.filter((_, idx) => idx !== i));

  // ── Propostas ──
  const addProposta = () => { setPropostas(ps => [...ps, propVazio()]); setExpandedPropIdx(propostas.length); };
  const removeProposta = (i) => {
    setPropostas(ps => ps.length === 1 ? [propVazio()] : ps.filter((_, idx) => idx !== i));
    setExpandedPropIdx(0);
  };
  const updProposta = (i, field, val) => setPropostas(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  const updCopart = (i, field, val) => setPropostas(ps => ps.map((p, idx) => idx === i ? { ...p, coparticipacao: { ...p.coparticipacao, [field]: val } } : p));
  const onSelectSeg = (i, nome) => {
    const seg = SEGURADORAS.find(s => s.nome === nome);
    setPropostas(ps => ps.map((p, idx) => idx === i ? { ...p, operadora: nome, logo_url: seg?.logo || '' } : p));
  };
  const toggleDestaque = (i) => setPropostas(ps => ps.map((p, idx) => ({ ...p, destaque: idx === i })));
  const moveProposta = (i, dir) => {
    setPropostas(ps => {
      const a = [...ps];
      [a[i], a[i + dir]] = [a[i + dir], a[i]];
      return a;
    });
    setExpandedPropIdx(i + dir);
  };

  const toggleCombinarCom = (pi, cenario) => {
    setPropostas(ps => ps.map((p, idx) => {
      if (idx !== pi) return p;
      const exists = (p.combinar_com || []).some(c => c.operadora === cenario.operadora);
      const combinar_com = exists
        ? (p.combinar_com || []).filter(c => c.operadora !== cenario.operadora)
        : [...(p.combinar_com || []), { operadora: cenario.operadora, valor: cenario.valor }];
      return { ...p, combinar_com };
    }));
  };

  // ── Planos dentro de proposta ──
  const addPlano = (pi) => setPropostas(ps => ps.map((p, idx) => idx === pi ? { ...p, planos: [...p.planos, planoVazio()] } : p));
  const removePlano = (pi, pli) => setPropostas(ps => ps.map((p, idx) => idx === pi ? { ...p, planos: p.planos.filter((_, j) => j !== pli) } : p));
  const updPlano = (pi, pli, field, val) => setPropostas(ps => ps.map((p, idx) => idx === pi ? { ...p, planos: p.planos.map((pl, j) => j === pli ? { ...pl, [field]: val } : pl) } : p));
  const updCobertura = (pi, key, field, val) => setPropostas(ps => ps.map((p, idx) => {
    if (idx !== pi) return p;
    const prev = (p.coberturas || {})[key];
    const next = field === null ? val : { ...(prev || {}), [field]: val };
    return { ...p, coberturas: { ...(p.coberturas || {}), [key]: next } };
  }));

  // ── Docs ──
  const toggleDocBase = (doc) => setFormR(f => ({
    ...f, docsBase: f.docsBase.includes(doc) ? f.docsBase.filter(d => d !== doc) : [...f.docsBase, doc],
  }));
  const addDocExtra = () => {
    if (!formR.docExtra.trim()) return;
    setFormR(f => ({ ...f, docsExtras: [...f.docsExtras, f.docExtra.trim()], docExtra: '' }));
  };
  const removeDocExtra = (i) => setFormR(f => ({ ...f, docsExtras: f.docsExtras.filter((_, idx) => idx !== i) }));

  // ── Enviar orçamento ──
  const handleResponder = async () => {
    const isViagem = selected?.segmento === 'VIAGEM';
    const valid = propostas.filter(p => p.operadora && p.planos.some(pl => pl.valor));
    if (valid.length === 0) return toast({ variant: 'destructive', title: 'Informe ao menos uma proposta com operadora e valor.' });
    setEnviando(true);
    try {
      const slug = generateSlug();
      const dest = valid.find(p => p.destaque) || valid[0];
      const pl0 = dest.planos?.find(pl => pl.valor) || dest.planos?.[0];
      const validComDestaque = valid.map(p => ({ ...p, destaque: p === dest }));

      // Retry com protocolo novo em caso de colisão (dois envios quase simultâneos)
      let protocolo, error;
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        protocolo = await gerarProtocolo(supabase);
        ({ error } = await supabase.from('orcamentos').update({
          status: 'ORCAMENTO',
          slug,
          numero_protocolo: protocolo,
          valor_mensalidade: parseBRL(pl0?.valor) || null,
          descricao_orcamento: `${dest.operadora}${!isViagem && pl0?.nome ? ` — ${pl0.nome}` : ''}`,
          propostas: validComDestaque,
          lista_documentos: DOCS_POR_MODALIDADE[selected?.segmento]?.[selected?.modalidade] || DOCS_POR_MODALIDADE[selected?.segmento]?.['INDIVIDUAL'] || DOCS_POR_SEGMENTO[selected?.segmento] || [],
          docs_extras: ['PME', 'PJ'].includes(selected?.modalidade) ? ['Declaração de Saúde (DS) — beneficiários acima de 59 anos (preenchida pelo próprio beneficiário)'] : [],
          data_orcamento: new Date().toISOString(),
        }).eq('id', expandedId));
        if (!error || error.code !== '23505') break;
      }
      if (error) throw error;
      toast({ title: 'Orçamento enviado!', description: `Link gerado — Protocolo ${protocolo}` });

      const parceiroTel = selected?.parceiros?.telefone;
      const segLabel = SEGMENTO_LABEL[selected.segmento] || selected.segmento;
      if (parceiroTel) {
        supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: parceiroTel,
            message: `📋 *Orçamento pronto!*\n\nOlá, ${selected.parceiros?.nome_completo?.split(' ')[0] || 'Parceiro'}! O orçamento para *${selected.cliente_nome}* (${segLabel}) está pronto.\n\nProtocolo: *${protocolo}*\n🔗 ${window.location.origin}/orcamento/${slug}`,
          },
        }).catch(() => {});
      }

      if (selected?.cliente_email) {
        const primeiroNome = selected.cliente_nome?.split(' ')[0] || 'Cliente';
        const linkOrcamento = `${window.location.origin}/orcamento/${slug}`;
        supabase.functions.invoke('send-email', {
          body: {
            to: selected.cliente_email,
            subject: `Seu orçamento de ${segLabel} está pronto — Ágil Seguros`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:#003580;padding:28px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Ágil Seguros</h1>
    <p style="color:#cce0ff;margin:6px 0 0;font-size:14px;">Seu orçamento está pronto</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#222;">Olá, <strong>${primeiroNome}</strong>!</p>
    <p style="font-size:15px;color:#444;line-height:1.6;">
      Preparamos um orçamento personalizado de <strong>${segLabel}</strong> especialmente para você.
      Clique no botão abaixo para visualizar as opções disponíveis e escolher a que melhor se adapta ao seu perfil.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${linkOrcamento}" style="background:#003580;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">
        Ver meu orçamento →
      </a>
    </div>
    <p style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:16px;margin-top:8px;">
      Ou copie o link: <a href="${linkOrcamento}" style="color:#003580;">${linkOrcamento}</a>
    </p>
    <p style="font-size:13px;color:#bbb;margin-top:8px;">
      Protocolo: <strong style="color:#003580;">${protocolo}</strong>
    </p>
    <p style="font-size:13px;color:#aaa;margin-top:16px;">
      Ágil Seguros · SUSEP 252166308 · <a href="mailto:contato@segurosagil.com.br" style="color:#003580;">contato@segurosagil.com.br</a>
    </p>
  </div>
</div>`,
          },
        }).catch(() => {});
      }

      await loadData();
      await refreshSelected(expandedId);
      setNovaPropostaMode(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleEditarProposta = async () => {
    const isViagem = selected?.segmento === 'VIAGEM';
    const valid = propostas.filter(p => p.operadora && p.planos.some(pl => pl.valor));
    if (valid.length === 0) return toast({ variant: 'destructive', title: 'Informe ao menos uma proposta com operadora e valor.' });
    setEnviando(true);
    try {
      const dest = valid.find(p => p.destaque) || valid[0];
      const pl0 = dest.planos?.find(pl => pl.valor) || dest.planos?.[0];
      const validComDestaque = valid.map(p => ({ ...p, destaque: p === dest }));
      const { error } = await supabase.from('orcamentos').update({
        valor_mensalidade: parseBRL(pl0?.valor) || null,
        descricao_orcamento: `${dest.operadora}${!isViagem && pl0?.nome ? ` — ${pl0.nome}` : ''}`,
        propostas: validComDestaque,
      }).eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Proposta atualizada!', description: 'O link continua o mesmo.' });
      setEditandoProposta(false);
      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleAvancar = async (novoStatus) => {
    setEnviando(true);
    try {
      const update = { status: novoStatus };
      if (novoStatus === 'DOCUMENTOS') update.data_documentos = new Date().toISOString();
      if (novoStatus === 'ASSINATURA') update.data_assinatura = new Date().toISOString();
      if (novoStatus === 'CONCLUIDO') update.data_conclusao = new Date().toISOString();
      const { error } = await supabase.from('orcamentos').update(update).eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Status atualizado!' });

      const parceiroTel = selected?.parceiros?.telefone;
      if (parceiroTel) {
        const nome = selected.parceiros?.nome_completo?.split(' ')[0] || 'Parceiro';
        const msgs = {
          ASSINATURA: `📄 *Processo avançou para assinatura!*\n\nOlá, ${nome}! Os documentos do cliente *${selected.cliente_nome}* foram recebidos. Quase lá! 🎯`,
          CONCLUIDO: `🎉 *Contrato fechado!*\n\nOlá, ${nome}! O contrato de *${selected.cliente_nome}* foi concluído. A comissão será registrada em breve. 💰`,
        };
        if (msgs[novoStatus]) supabase.functions.invoke('send-whatsapp', { body: { phone: parceiroTel, message: msgs[novoStatus] } }).catch(() => {});
      }

      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleComissao = async () => {
    if (!formC.valor_base || !formC.comissao_percentual) return toast({ variant: 'destructive', title: 'Preencha valor e percentual.' });
    setEnviando(true);
    try {
      const { data: existente } = await supabase.from('comissoes').select('id').eq('orcamento_id', expandedId).maybeSingle();
      const base = parseBRL(formC.valor_base);
      const pct = parseFloat(formC.comissao_percentual);
      if (existente) {
        const { error } = await supabase.from('comissoes').update({ valor_base: base, comissao_percentual: pct, status: 'PENDENTE' }).eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comissoes').insert({ orcamento_id: expandedId, parceiro_id: selected.parceiro_id, valor_base: base, comissao_percentual: pct, status: 'PENDENTE' });
        if (error) throw error;
      }
      const { error: orcError } = await supabase.from('orcamentos').update({
        status: 'COMISSAO',
        ...(formC.numero_apolice ? { numero_apolice: formC.numero_apolice } : {}),
        ...(formC.data_vencimento ? { data_vencimento: formC.data_vencimento } : {}),
      }).eq('id', expandedId);
      if (orcError) throw orcError;
      toast({ title: 'Comissão registrada!' });

      const parceiroTel = selected?.parceiros?.telefone;
      if (parceiroTel) {
        const comissao = base * (1 - 0.06) * (pct / 100);
        supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: parceiroTel,
            message: `🎉 *Comissão registrada*\n\nParabéns, ${selected.parceiros?.nome_completo?.split(' ')[0] || 'Parceiro'}! Contrato de *${selected.cliente_nome}* concluído.\n\n💰 Sua comissão: *R$ ${fmtBRL(comissao)}*`,
          },
        }).catch(() => {});
      }

      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const parseComprovantes = (path) => {
    if (!path) return [];
    try { const arr = JSON.parse(path); return Array.isArray(arr) ? arr : [path]; } catch { return [path]; }
  };

  const handleExcluirComprovante = async (index) => {
    try {
      const { data: com } = await supabase.from('comissoes').select('id, comprovante_path').eq('orcamento_id', expandedId).maybeSingle();
      if (!com) return;
      const existentes = parseComprovantes(com.comprovante_path);
      const novoArray = existentes.filter((_, i) => i !== index);
      const novoPath = novoArray.length === 0 ? null : JSON.stringify(novoArray);
      const updates = { comprovante_path: novoPath };
      if (novoArray.length === 0) updates.status = 'PENDENTE';
      const { error } = await supabase.from('comissoes').update(updates).eq('id', com.id);
      if (error) throw error;
      toast({ title: 'Comprovante removido.' });
      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao remover.', description: err?.message });
    }
  };

  const handleUploadComprovante = async (file) => {
    if (!file) return;
    setUploadingComp(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `comissoes/${expandedId}/comprovante_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('orcamento-documentos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('orcamento-documentos').getPublicUrl(path);
      const { data: com } = await supabase.from('comissoes').select('id, comprovante_path').eq('orcamento_id', expandedId).maybeSingle();
      if (com) {
        const existentes = parseComprovantes(com.comprovante_path);
        const novoArray = [...existentes, publicUrl];
        const { error: updError } = await supabase.from('comissoes').update({ comprovante_path: JSON.stringify(novoArray), status: 'PAGO', data_pagamento: new Date().toISOString() }).eq('id', com.id);
        if (updError) throw updError;
      }
      toast({ title: 'Comprovante enviado!' });
      await loadData();
      await refreshSelected(expandedId);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro no upload.', description: err?.message });
    } finally {
      setUploadingComp(false);
    }
  };

  const handleAbrirEditarCliente = () => {
    setClienteForm({
      cliente_nome: selected.cliente_nome || '',
      cliente_telefone: selected.cliente_telefone || '',
      cliente_email: selected.cliente_email || '',
      cliente_cpf: selected.cliente_cpf || '',
    });
    setEditandoSolicitacao(false);
    setEditandoCliente(true);
  };

  const handleSalvarCliente = async () => {
    if (!clienteForm.cliente_nome || !clienteForm.cliente_telefone)
      return toast({ variant: 'destructive', title: 'Nome e telefone são obrigatórios.' });
    setEnviando(true);
    try {
      const { error } = await supabase.from('orcamentos').update({
        cliente_nome: clienteForm.cliente_nome,
        cliente_telefone: clienteForm.cliente_telefone,
        cliente_email: clienteForm.cliente_email,
        cliente_cpf: clienteForm.cliente_cpf,
      }).eq('id', selected.id);
      if (error) throw error;
      const updated = { ...selected, ...clienteForm };
      setSelected(updated);
      setOrcamentos(prev => prev.map(o => o.id === selected.id ? updated : o));
      setEditandoCliente(false);
      toast({ title: 'Dados do cliente atualizados.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleAbrirEditarSolicitacao = () => {
    const campos = CAMPOS_SEGMENTO[selected.segmento] || [];
    const parsed = {};
    (selected.observacoes || '').split('\n').forEach(line => {
      const idx = line.indexOf(': ');
      if (idx === -1) return;
      const label = line.slice(0, idx).trim();
      const campo = campos.find(c => c.label === label);
      if (campo) parsed[campo.key] = line.slice(idx + 2).trim();
    });
    setSegData(parsed);
    setEditandoCliente(false);
    setEditandoSolicitacao(true);
  };

  const handleSalvarSolicitacao = async () => {
    const campos = CAMPOS_SEGMENTO[selected.segmento] || [];
    const campoFaltando = campos.find(c => !c.optional && !String(segData[c.key] || '').trim());
    if (campoFaltando) return toast({ variant: 'destructive', title: `Informe: ${campoFaltando.label}.` });
    setEnviando(true);
    try {
      const labels = new Set(campos.map(c => c.label));
      const outrasLinhas = (selected.observacoes || '').split('\n').filter(line => {
        const idx = line.indexOf(': ');
        if (idx === -1) return true;
        return !labels.has(line.slice(0, idx).trim());
      }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      const obsSegmento = campos.filter(f => segData[f.key]).map(f => `${f.label}: ${segData[f.key]}`).join('\n');
      const obsCompleto = [obsSegmento, outrasLinhas].filter(Boolean).join('\n\n');
      const payload = { observacoes: obsCompleto || null };
      if (['SAUDE', 'ODONTOLOGICO'].includes(selected.segmento)) payload.modalidade = segData.tipo || null;
      const { error } = await supabase.from('orcamentos').update(payload).eq('id', selected.id);
      if (error) throw error;
      const updated = { ...selected, ...payload };
      setSelected(updated);
      setOrcamentos(prev => prev.map(o => o.id === selected.id ? updated : o));
      setEditandoSolicitacao(false);
      toast({ title: 'Dados da solicitação atualizados.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleExcluir = async () => {
    setEnviando(true);
    try {
      await supabase.from('comissoes').delete().eq('orcamento_id', expandedId);
      await supabase.from('orcamento_documentos').delete().eq('orcamento_id', expandedId);
      await supabase.from('orcamento_acessos').delete().eq('orcamento_id', expandedId);
      const { error } = await supabase.from('orcamentos').delete().eq('id', expandedId);
      if (error) throw error;
      toast({ title: 'Orçamento excluído.' });
      setExpandedId(null);
      setSelected(null);
      setConfirmDelete(false);
      await loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir.', description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleCriarOrcamento = async () => {
    if (!novoForm.cliente_nome || !novoForm.cliente_telefone || !novoForm.cliente_email || !novoForm.cliente_cpf || !novoForm.cliente_data_nascimento || !novoForm.segmento)
      return toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios.' });
    if (!validarTelefone(novoForm.cliente_telefone))
      return toast({ variant: 'destructive', title: 'Telefone inválido.', description: 'Informe um número com DDD.' });
    if (!validarEmail(novoForm.cliente_email))
      return toast({ variant: 'destructive', title: 'E-mail inválido.' });
    if (!validarCpfCnpj(novoForm.cliente_cpf))
      return toast({ variant: 'destructive', title: 'CPF ou CNPJ inválido.', description: 'Verifique o número digitado.' });
    const campoFaltando = (CAMPOS_SEGMENTO[novoForm.segmento] || []).find(c => !c.optional && !String(segData[c.key] || '').trim());
    if (campoFaltando) return toast({ variant: 'destructive', title: `Informe: ${campoFaltando.label}.` });
    const totalVidasAdm = parseInt(segData.vidas || '0');
    const distribuiVidasAdm = AGE_BRACKETS.reduce((s, { id }) => s + parseInt(segData[faixaKey(id)] || '0'), 0);
    if (['SAUDE', 'ODONTOLOGICO'].includes(novoForm.segmento) && totalVidasAdm > 0 && distribuiVidasAdm !== totalVidasAdm)
      return toast({ variant: 'destructive', title: 'Distribua todas as vidas por faixa etária.', description: `Faltam ${totalVidasAdm - distribuiVidasAdm} vida(s).` });
    setCriando(true);
    try {
      const campos = CAMPOS_SEGMENTO[novoForm.segmento] || [];
      const obsSegmento = campos.filter(f => segData[f.key]).map(f => `${f.label}: ${segData[f.key]}`).join('\n');
      let obsFaixas = '';
      if (['SAUDE', 'ODONTOLOGICO'].includes(novoForm.segmento)) {
        const lines = AGE_BRACKETS
          .map(({ id, label }) => {
            const val = parseInt(segData[faixaKey(id)] || '0');
            return val > 0 ? `  ${label}: ${val}` : null;
          })
          .filter(Boolean);
        if (lines.length) obsFaixas = `Distribuição por faixa etária:\n${lines.join('\n')}`;
      }
      const obsCompleto = [obsSegmento, obsFaixas, novoForm.observacoes].filter(Boolean).join('\n\n');
      const perfilVidas = ['SAUDE', 'ODONTOLOGICO'].includes(novoForm.segmento)
        ? AGE_BRACKETS
            .map(({ id, label }) => ({ id, label, vidas: parseInt(segData[faixaKey(id)] || '0') }))
            .filter(b => b.vidas > 0)
        : [];
      const { data, error } = await supabase.from('orcamentos').insert({
        parceiro_id: novoForm.parceiro_id || null,
        cliente_nome: novoForm.cliente_nome,
        cliente_telefone: novoForm.cliente_telefone,
        cliente_email: novoForm.cliente_email,
        cliente_cpf: novoForm.cliente_cpf || null,
        cliente_data_nascimento: novoForm.cliente_data_nascimento || null,
        segmento: novoForm.segmento,
        modalidade: segData.tipo || null,
        observacoes: obsCompleto || null,
        status: 'SOLICITACAO',
        perfil_vidas: perfilVidas.length > 0 ? perfilVidas : null,
        cenarios_atuais: cenariosCriar.some(c => c.tem_plano) ? cenariosCriar.filter(c => c.tem_plano).map(c => ({ tem_plano: true, operadora: c.operadora || '', valor: c.valor || '', vidas: c.vidas || {} })) : null,
      }).select('*, parceiros(nome_completo, modalidade, comissao_percentual, telefone)').single();
      if (error) throw error;
      toast({ title: 'Orçamento criado!', description: 'Agora preencha as propostas.' });
      setCriarModal(false);
      setFiltro('TODOS');
      setNovoForm({ parceiro_id: '', cliente_nome: '', cliente_telefone: '', cliente_email: '', cliente_cpf: '', cliente_data_nascimento: '', segmento: '', observacoes: '' });
      setSegData({});
      setCenariosCriar([{ tem_plano: false, operadora: '', valor: '', vidas: {} }]);
      await loadData(data.id);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao criar.', description: err?.message });
    } finally {
      setCriando(false);
    }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/orcamento/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({ title: 'Link copiado!' });
  };

  // ── Builder (SOLICITACAO + editar + nova proposta) ──
  const renderBuilder = (mode) => {
    const isAutoSeg        = selected?.segmento === 'AUTO';
    const isViagemSeg      = selected?.segmento === 'VIAGEM';
    const isResidencialSeg = selected?.segmento === 'RESIDENCIAL';
    const isGenericoSeg    = !isAutoSeg && !isViagemSeg && !isResidencialSeg;
    return (
    <div className="space-y-5">
      {/* Cenário atual — somente leitura (preenchido na solicitação) */}
      {(() => {
        const cenAtivos = (selected?.cenarios_atuais || []).filter(c => c.tem_plano);
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Cenário atual do cliente</p>
            {cenAtivos.length > 0 ? (
              <div className="space-y-2">
                {cenAtivos.map((c, ci) => {
                  const logo = SEGURADORAS.find(s => s.nome === c.operadora)?.logo;
                  return (
                    <div key={ci} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                      {logo
                        ? <img src={logo} alt={c.operadora} className="h-5 w-10 object-contain shrink-0" />
                        : <Shield className="h-4 w-4 text-gray-400 shrink-0" />}
                      <span className="text-sm font-medium text-gray-700 flex-1 truncate">{c.operadora || 'Operadora não informada'}</span>
                      {c.valor && <span className="text-xs text-gray-400 shrink-0">R$ {c.valor}/mês</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Nenhum plano atual informado pelo parceiro.</p>
            )}
          </div>
        );
      })()}

      {/* Propostas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Propostas ({propostas.length})</p>
          <Button size="sm" variant="outline" onClick={addProposta} className="h-7 text-xs border-dashed border-[#003580]/40 text-[#003580] hover:bg-[#f0f7ff]">
             Adicionar
          </Button>
        </div>

        {propostas.map((p, pi) => (
          <div key={pi} className={`border rounded-xl overflow-hidden transition-all ${p.destaque ? 'border-[#003580] shadow-sm' : 'border-gray-200'}`}>
            {/* Header da proposta */}
            <div
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer select-none ${p.destaque ? 'bg-[#003580] text-white' : 'bg-gray-50 text-gray-700'}`}
              onClick={() => setExpandedPropIdx(expandedPropIdx === pi ? -1 : pi)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {p.logo_url
                  ? <img src={p.logo_url} alt={p.operadora} className="h-5 w-10 object-contain shrink-0" />
                  : <Shield className={`h-4 w-4 shrink-0 ${p.destaque ? 'text-white/60' : 'text-gray-400'}`} />
                }
                <span className="text-sm font-medium truncate">{p.operadora || `Proposta ${pi + 1}`}</span>
                {p.destaque && <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300 shrink-0" />}
                {propostas.length > 1 && (
                  <span className={`text-xs ${p.destaque ? 'text-blue-200' : 'text-gray-400'}`}>
                    {p.destaque ? '· Melhor opção' : `· ${pi + 1}ª opção`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {pi > 0 && (
                  <button type="button" onClick={() => moveProposta(pi, -1)}
                    className={`p-1 rounded hover:bg-black/10 ${p.destaque ? 'text-white/70' : 'text-gray-400'}`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                )}
                {pi < propostas.length - 1 && (
                  <button type="button" onClick={() => moveProposta(pi, 1)}
                    className={`p-1 rounded hover:bg-black/10 ${p.destaque ? 'text-white/70' : 'text-gray-400'}`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => removeProposta(pi)}
                  className={`p-1 rounded ${p.destaque ? 'text-white/70 hover:text-red-300' : 'text-gray-400 hover:text-red-500'}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedPropIdx === pi ? 'rotate-180' : ''} ${p.destaque ? 'text-white/70' : 'text-gray-400'}`}
                  onClick={() => setExpandedPropIdx(expandedPropIdx === pi ? -1 : pi)} />
              </div>
            </div>

            {/* Corpo da proposta */}
            {expandedPropIdx === pi && (
              <div className="p-3 space-y-3 bg-white border-t border-gray-100">
                {/* Operadora */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Seguradora / Operadora</Label>
                  <div className="flex gap-2 items-center">
                    <select value={p.operadora} onChange={e => onSelectSeg(pi, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-sm focus:outline-none focus:border-[#003580]">
                      <option value="">Selecionar...</option>
                      {SEGURADORAS.filter(s => !selected?.segmento || s.categorias.includes(selected.segmento)).map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
                    </select>
                    {p.logo_url && (
                      <img src={p.logo_url} alt={p.operadora} className="h-8 w-16 object-contain rounded border border-gray-100 p-1 bg-white shrink-0" />
                    )}
                  </div>
                </div>

                {/* VIAGEM: Coberturas */}
                {isViagemSeg && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Valor do seguro (R$) *</Label>
                      <Input value={p.planos?.[0]?.valor || ''} onChange={e => updPlano(pi, 0, 'valor', maskBRL(e.target.value))}
                        placeholder="Ex: 350,00"
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">Capital (cobertura)</Label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-400 mr-1">Tudo em:</span>
                        {MOEDAS_VIAGEM.map(m => (
                          <button key={m} type="button"
                            onClick={() => setPropostas(ps => ps.map((prop, idx) => {
                              if (idx !== pi) return prop;
                              const cobAtual = prop.coberturas || {};
                              const cobNova = {};
                              COBERTURAS_VIAGEM.forEach(({ key }) => { cobNova[key] = { ...(cobAtual[key] || {}), moeda: m }; });
                              return { ...prop, coberturas: { ...cobAtual, ...cobNova } };
                            }))}
                            className="px-2.5 py-0.5 rounded-full border border-[#003580] text-[#003580] text-xs font-medium hover:bg-[#003580] hover:text-white transition-colors">
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    {COBERTURAS_VIAGEM.map(({ key, label }) => {
                      const cob = (p.coberturas || {})[key] || {};
                      const isOutro = cob.moeda && !MOEDAS_VIAGEM.includes(cob.moeda);
                      return (
                        <div key={key} className="space-y-0.5">
                          <Label className="text-xs text-gray-500">{label}</Label>
                          <div className="flex gap-1.5 items-center">
                            <select value={isOutro ? 'Outro' : (cob.moeda || '')}
                              onChange={e => updCobertura(pi, key, 'moeda', e.target.value === 'Outro' ? '' : e.target.value)}
                              className="w-16 rounded-lg border border-gray-200 bg-[#f0f7ff] px-1.5 py-1 text-xs focus:outline-none focus:border-[#003580]">
                              <option value="">--</option>
                              {MOEDAS_VIAGEM.map(m => <option key={m} value={m}>{m}</option>)}
                              <option value="Outro">Outro</option>
                            </select>
                            {isOutro && (
                              <Input value={cob.moeda || ''} onChange={e => updCobertura(pi, key, 'moeda', e.target.value)}
                                placeholder="Moeda" className="w-14 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                            )}
                            <Input value={cob.valor || ''} onChange={e => updCobertura(pi, key, 'valor', maskBRL(e.target.value))}
                              placeholder="Ex: 30.000,00" className="flex-1 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                          </div>
                        </div>
                      );
                    })}
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">Coberturas Adicionais</Label>
                      {BOOL_COBERTURAS_VIAGEM.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3 flex-wrap">
                          <Label className="text-xs text-gray-500 flex-1">{label}</Label>
                          <ToggleBtn value={(p.coberturas || {})[key] || false} onChange={v => updCobertura(pi, key, null, v)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AUTO: Tipo de cobertura + Mensalidade */}
                {isAutoSeg && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Tipo de cobertura</Label>
                      <select value={p.cobertura_tipo || ''} onChange={e => updProposta(pi, 'cobertura_tipo', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-xs focus:outline-none focus:border-[#003580]">
                        <option value="">Selecionar...</option>
                        {['Básica', 'Intermediária', 'Completa', 'Premium'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Valor total do seguro (R$) *</Label>
                      <Input value={p.planos?.[0]?.valor || ''} onChange={e => updPlano(pi, 0, 'valor', maskBRL(e.target.value))}
                        placeholder="Ex: 3.000,00"
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                    </div>
                  </div>
                )}

                {/* RESIDENCIAL: Valor do seguro + Coberturas */}
                {isResidencialSeg && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Valor do seguro (R$) *</Label>
                      <Input value={p.planos?.[0]?.valor || ''} onChange={e => updPlano(pi, 0, 'valor', maskBRL(e.target.value))}
                        placeholder="Ex: 350,00"
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs font-semibold text-gray-600 block uppercase tracking-wide">Coberturas</Label>
                      {COBERTURAS_RESIDENCIAL.map(({ key, label, valKey }) => (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs text-gray-500 flex-1 shrink-0">{label}</Label>
                            <ToggleBtn value={p[key] || false} onChange={v => updProposta(pi, key, v)} />
                          </div>
                          {valKey && p[key] && (
                            <div className="flex items-center gap-2 pl-2">
                              <Label className="text-xs text-gray-400 shrink-0">R$</Label>
                              <Input value={p[valKey] || ''} onChange={e => updProposta(pi, valKey, maskBRL(e.target.value))}
                                placeholder="Ex: 100.000,00"
                                className="w-36 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SAUDE/outros: Planos */}
                {isGenericoSeg && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-500">Planos *</Label>
                      <button type="button" onClick={() => addPlano(pi)} className="text-xs text-[#003580] hover:underline flex items-center gap-0.5">
                         plano
                      </button>
                    </div>
                    {p.planos.map((pl, pli) => (
                      <div key={pli} className="flex gap-2 items-center">
                        <Input value={pl.nome} onChange={e => updPlano(pi, pli, 'nome', e.target.value)}
                          placeholder="Nome do plano (opcional)"
                          className="flex-1 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                        <Input value={pl.valor} onChange={e => updPlano(pi, pli, 'valor', maskBRL(e.target.value))}
                          placeholder="R$ valor *"
                          className="w-24 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                        {p.planos.length > 1 && (
                          <button type="button" onClick={() => removePlano(pi, pli)} className="text-gray-400 hover:text-red-500 shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* SAUDE/outros: Abrangência + Acomodação */}
                {isGenericoSeg && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Abrangência</Label>
                      <select value={p.abrangencia} onChange={e => updProposta(pi, 'abrangencia', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-xs focus:outline-none focus:border-[#003580]">
                        <option value="">Selecionar...</option>
                        {['Nacional', 'Regional', 'Estadual', 'Municipal'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Acomodação</Label>
                      <select value={p.acomodacao} onChange={e => updProposta(pi, 'acomodacao', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-xs focus:outline-none focus:border-[#003580]">
                        <option value="">Selecionar...</option>
                        {['Enfermaria', 'Apartamento'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* AUTO: LMI + Franquia */}
                {isAutoSeg && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">LMI — Limite Máximo de Indenização (%)</Label>
                      <Input value={p.lmi_percentual || ''} onChange={e => updProposta(pi, 'lmi_percentual', e.target.value)}
                        placeholder="Ex: 100"
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Franquia (%)</Label>
                        <select value={p.franquia_percentual || ''} onChange={e => updProposta(pi, 'franquia_percentual', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-xs focus:outline-none focus:border-[#003580]">
                          <option value="">Selecionar...</option>
                          {['25%','50%','75%','100%'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Valor da franquia (R$)</Label>
                        <Input value={p.franquia_valor || ''} onChange={e => updProposta(pi, 'franquia_valor', maskBRL(e.target.value))}
                          placeholder="Ex: 3.000,00"
                          className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                )}

                {/* SAUDE/outros: Coparticipação */}
                {isGenericoSeg && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Label className="text-xs text-gray-500 shrink-0">Coparticipação</Label>
                      <ToggleBtn value={p.coparticipacao.tem} onChange={v => updCopart(pi, 'tem', v)} />
                    </div>
                    {p.coparticipacao.tem && (
                      <div className="flex items-center gap-3 pl-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-gray-500 shrink-0">%</Label>
                          <Input value={p.coparticipacao.percentual} onChange={e => updCopart(pi, 'percentual', e.target.value)}
                            placeholder="30" className="w-16 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500 shrink-0">Limitada</Label>
                          <ToggleBtn value={p.coparticipacao.limitada} onChange={v => updCopart(pi, 'limitada', v)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AUTO: Assistência 24h + Carro reserva */}
                {isAutoSeg && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Label className="text-xs text-gray-500 shrink-0">Assistência 24h</Label>
                      <ToggleBtn value={p.assistencia_24h || false} onChange={v => updProposta(pi, 'assistencia_24h', v)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Label className="text-xs text-gray-500 shrink-0">Carro reserva</Label>
                        <ToggleBtn value={p.carro_reserva || false} onChange={v => updProposta(pi, 'carro_reserva', v)} />
                      </div>
                      {p.carro_reserva && (
                        <div className="flex items-center gap-2 pl-1">
                          <Label className="text-xs text-gray-500 shrink-0">Dias</Label>
                          <Input value={p.carro_reserva_dias || ''} onChange={e => updProposta(pi, 'carro_reserva_dias', e.target.value)}
                            placeholder="Ex: 15" className="w-20 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SAUDE/outros: Carência */}
                {isGenericoSeg && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label className="text-xs text-gray-500 shrink-0">Carência</Label>
                    <ToggleBtn value={p.carencia} onChange={v => updProposta(pi, 'carencia', v)} />
                  </div>
                )}

                {/* AUTO: Coberturas adicionais */}
                {isAutoSeg && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-semibold text-gray-600 block uppercase tracking-wide">Coberturas adicionais</Label>
                    {[
                      { key: 'rcfv_materiais',  label: 'RCF-V Danos materiais',          valKey: 'rcfv_materiais_valor' },
                      { key: 'rcfv_corporais',  label: 'RCF-V Danos corporais',          valKey: 'rcfv_corporais_valor' },
                      { key: 'danos_morais',    label: 'Danos morais e estéticos',       valKey: 'danos_morais_valor' },
                      { key: 'custos_defesa',   label: 'Custos de defesa auto',          valKey: 'custos_defesa_valor' },
                      { key: 'app_passageiros', label: 'Acidentes pessoais passageiros', valKey: 'app_passageiros_valor' },
                      { key: 'blindagem',       label: 'Blindagem',                      valKey: 'blindagem_valor' },
                      { key: 'cobre_vidros',    label: 'Vidros',                         valKey: 'vidros_valor' },
                      { key: 'cobre_terceiros', label: 'Terceiros (RCF-V)',              valKey: null },
                      { key: 'rastreador',      label: 'Rastreador',                     valKey: null },
                      { key: 'assistencias',    label: 'Assistências',                   valKey: null },
                    ].map(({ key, label, valKey }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Label className="text-xs text-gray-500 flex-1 shrink-0">{label}</Label>
                          <ToggleBtn value={p[key] || false} onChange={v => updProposta(pi, key, v)} />
                        </div>
                        {valKey && p[key] && (
                          <div className="flex items-center gap-2 pl-2">
                            <Label className="text-xs text-gray-400 shrink-0">R$</Label>
                            <Input value={p[valKey] || ''} onChange={e => updProposta(pi, valKey, maskBRL(e.target.value))}
                              placeholder="Ex: 100.000,00"
                              className="w-36 border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* SAUDE/outros: Rede credenciada */}
                {isGenericoSeg && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Link de redes credenciadas (opcional)</Label>
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <Input value={p.rede_url} onChange={e => updProposta(pi, 'rede_url', e.target.value)}
                        placeholder="https://..."
                        className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-7 text-xs" />
                    </div>
                  </div>
                )}

                {/* Destaque */}
                {propostas.length > 1 && (
                  <button type="button" onClick={() => toggleDestaque(pi)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-colors ${p.destaque ? 'text-white border-[#003580]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#003580] hover:text-[#003580]'}`}
                    style={p.destaque ? { background: '#003580' } : {}}>
                    <Star className={`h-3.5 w-3.5 ${p.destaque ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                    {p.destaque ? 'Melhor opção (destaque ativo)' : 'Marcar como melhor opção'}
                  </button>
                )}

                {/* Combinar com cenário atual */}
                {cenarios.filter(c => c.tem_plano && c.operadora).length > 1 && (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <Label className="text-xs text-gray-500">Combinar com cenário atual (opcional)</Label>
                    <p className="text-xs text-gray-400">Selecione qual plano atual será mantido junto com esta proposta</p>
                    <div className="space-y-1.5">
                      {cenarios.filter(c => c.tem_plano && c.operadora).map((c, ci) => {
                        const isChecked = (p.combinar_com || []).some(x => x.operadora === c.operadora);
                        return (
                          <label key={ci} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border transition-colors ${isChecked ? 'bg-[#f0f7ff] border-[#003580]/30' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={isChecked}
                              onChange={() => toggleCombinarCom(pi, c)}
                              className="rounded border-gray-300 text-[#003580] focus:ring-[#003580]" />
                            <span className="text-xs text-gray-600 flex-1">
                              {c.operadora}
                              {c.valor && <span className="text-gray-400"> — R$ {c.valor}</span>}
                            </span>
                            <span className="text-xs text-gray-400">(mantida)</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>


      {/* Botões de ação */}
      {mode === 'responder' && (
        <Button onClick={handleResponder} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2 py-5" style={{ background: '#003580' }}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {enviando ? 'Enviando...' : 'Enviar orçamento e gerar link'}
        </Button>
      )}
      {mode === 'editar' && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditandoProposta(false)} disabled={enviando} className="flex-1">Cancelar</Button>
          <Button onClick={handleEditarProposta} disabled={enviando} className="flex-1 text-white gap-1.5" style={{ background: '#003580' }}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      )}
      {mode === 'nova' && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNovaPropostaMode(false)} disabled={enviando} className="flex-1">Cancelar</Button>
          <Button onClick={handleResponder} disabled={enviando} className="flex-1 text-white gap-1.5" style={{ background: '#003580' }}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar nova proposta
          </Button>
        </div>
      )}
    </div>
  );};

  const renderAtividade = () => {
    if (!selected?.slug || acessos === undefined) return null;
    const ultimo = acessos[0];
    const total = acessos.length;
    const leuTudo = acessos.some(a => a.scroll_fim);
    const propostaClicada = acessos.find(a => a.proposta_clicada)?.proposta_clicada;
    const device = ultimo?.device;
    const tempoUltimo = ultimo?.tempo_pagina || 0;
    const tempoTotal = acessos.reduce((sum, a) => sum + (a.tempo_pagina || 0), 0);
    const fmtTempo = (s) => s >= 60 ? `${Math.floor(s / 60)}min ${s % 60}s` : `${s}s`;
    const score = Math.min(100,
      Math.min(30, total * 10) +
      Math.min(30, Math.floor(tempoTotal / 30)) +
      (leuTudo ? 20 : 0) +
      (propostaClicada ? 20 : 0)
    );
    const scoreCor = score >= 61 ? 'bg-green-500' : score >= 31 ? 'bg-yellow-400' : 'bg-red-400';
    const scoreLabel = score >= 61 ? 'Quente 🔥' : score >= 31 ? 'Morno' : 'Frio';
    const tempoRelativo = (d) => {
      if (!d) return '';
      const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
      if (diff < 60) return 'agora mesmo';
      if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
      return `há ${Math.floor(diff / 86400)} dias`;
    };
    const quente = total > 0 && (Date.now() - new Date(ultimo?.acessado_em).getTime()) < 3600000;
    return (
      <div className={`rounded-xl p-3 text-xs border ${total === 0 ? 'bg-gray-50 border-gray-100 text-gray-400' : quente ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-100'}`}>
        <div className="flex items-center gap-2 mb-2">
          <p className={`font-semibold uppercase tracking-wide ${total === 0 ? 'text-gray-400' : quente ? 'text-orange-700' : 'text-green-700'}`}>Atividade do cliente</p>
          {clienteOnline && (
            <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Online agora
            </span>
          )}
          {quente && !clienteOnline && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">🔥 Quente</span>}
          {total >= 3 && !quente && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">👀 {total}x</span>}
        </div>
        {total === 0 ? (
          <p>Cliente ainda não acessou o link.</p>
        ) : (
          <div className="space-y-1 text-gray-600">
            <div className="mb-2">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-gray-400">Score de interesse</span>
                <span className={`font-bold ${score >= 61 ? 'text-green-600' : score >= 31 ? 'text-yellow-600' : 'text-red-500'}`}>{scoreLabel} ({score})</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${scoreCor}`} style={{ width: `${score}%` }} />
              </div>
            </div>
            <p><span className="text-gray-400">Acessos:</span> <strong className={total >= 3 ? 'text-orange-600' : ''}>{total}x</strong></p>
            <p><span className="text-gray-400">Último acesso:</span> <strong>{tempoRelativo(ultimo?.acessado_em)}</strong></p>
            {tempoUltimo > 0 && <p><span className="text-gray-400">Última sessão:</span> {fmtTempo(tempoUltimo)}</p>}
            {tempoTotal > 0 && <p><span className="text-gray-400">Tempo total:</span> {fmtTempo(tempoTotal)}</p>}
            <p><span className="text-gray-400">Leu até o fim:</span> {leuTudo ? '✅ Sim' : '❌ Não'}</p>
            {device && <p><span className="text-gray-400">Dispositivo:</span> {device === 'mobile' ? '📱 Mobile' : '💻 Desktop'}</p>}
            {propostaClicada && <p className="mt-1 font-semibold text-green-700">💡 Clicou em: {propostaClicada}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderActionPanel = () => {
    if (!selected) return null;
    const s = selected.status;

    if (s === 'SOLICITACAO') return renderBuilder('responder');

    if (s === 'ORCAMENTO') {
      if (editandoProposta) return renderBuilder('editar');
      if (novaPropostaMode) return renderBuilder('nova');
      return (
        <div className="space-y-4">
          {selected.numero_protocolo && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#003580', color: '#fff' }}>{selected.numero_protocolo}</span>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1.5">Link público para o cliente</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 truncate flex-1 font-mono">{window.location.origin}/orcamento/{selected.slug}</span>
              <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => window.open(`${window.location.origin}/orcamento/${selected.slug}?preview=1`, '_blank')} title="Ver como o cliente vê, sem contar acesso">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => copyLink(selected.slug)}>
                {copiedSlug === selected.slug ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-blue-500 mt-1">Passe este link ao parceiro para repassar ao cliente</p>
          </div>

          {/* Atividade do cliente */}
          {renderAtividade()}

          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-gray-700">Proposta enviada</p>
              <Button size="sm" variant="outline" onClick={() => setEditandoProposta(true)}
                className="shrink-0 text-xs border-[#003580]/30 text-[#003580] hover:bg-[#f0f7ff]">
                Editar
              </Button>
            </div>
            {selected.propostas?.length > 0 ? (
              <div className="space-y-2">
                {selected.propostas.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${p.destaque ? 'border-[#003580]/30 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.operadora} className="h-6 w-12 object-contain shrink-0" />
                      : <Shield className="h-4 w-4 text-gray-400 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{p.operadora || `Opção ${i + 1}`}</p>
                      <p className="text-xs text-gray-500">
                        {p.planos?.length > 0 ? p.planos.map(pl => `R$ ${fmtBRL(parseBRL(pl.valor))}`).join(' / ') : `R$ ${fmtBRL(parseBRL(p.valor))}`}
                      </p>
                    </div>
                    {p.destaque && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400 shrink-0" />}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p>{['AUTO', 'VIAGEM', 'RESIDENCIAL'].includes(selected.segmento) ? 'Valor do seguro' : 'Mensalidade'}: <span className="font-semibold text-gray-800">R$ {fmtBRL(selected.valor_mensalidade)}</span></p>
                {selected.descricao_orcamento && <p className="mt-1 text-xs">{selected.descricao_orcamento}</p>}
              </>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">Aguardando o cliente aceitar a proposta...</p>
          <Button variant="outline" size="sm" onClick={() => {
            setNovaPropostaMode(true);
            setEditandoProposta(false);
            setCenarios([cenarioVazio()]);
            setPropostas([propVazio()]);
            setExpandedPropIdx(0);
          }} className="w-full text-xs border-dashed border-gray-300 text-gray-500 hover:border-[#003580] hover:text-[#003580]">
            + Nova proposta (gera novo link)
          </Button>
        </div>
      );
    }

    if (s === 'DOCUMENTOS') return (
      <div className="space-y-3">
        {renderAtividade()}
        {selected.operadora_escolhida && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">Proposta aceita: <strong>{selected.descricao_orcamento || selected.operadora_escolhida}</strong></p>
          </div>
        )}
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Documentos enviados pelo cliente</p>
        {docs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum documento recebido ainda.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-700 truncate flex-1">{d.tipo_documento}</span>
                <span className="text-xs text-gray-400 mr-2">{d.nome_arquivo}</span>
                <a href={d.storage_path} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                  <Eye className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
        <Button onClick={() => handleAvancar('ASSINATURA')} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2" style={{ background: '#003580' }}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Avançar para {assinaturaLabel(selected?.segmento)}
        </Button>
      </div>
    );

    if (s === 'ASSINATURA') return (
      <div className="space-y-3">
        {renderAtividade()}
        {selected.operadora_escolhida && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">Proposta aceita: <strong>{selected.descricao_orcamento || selected.operadora_escolhida}</strong></p>
          </div>
        )}
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Aguardando assinatura da proposta</p>
        {docs.length > 0 && (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-700 truncate flex-1">{d.tipo_documento}</span>
                <a href={d.storage_path} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                  <Eye className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
        <Button onClick={() => handleAvancar('CONCLUIDO')} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2 bg-green-600 hover:bg-green-600 hover:bg-green-700">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Marcar como Assinado / Concluído
        </Button>
      </div>
    );

    if (s === 'CONCLUIDO') return (
      <div className="space-y-4">
        {renderAtividade()}
        {selected.operadora_escolhida && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">Proposta aceita: <strong>{selected.descricao_orcamento || selected.operadora_escolhida}</strong></p>
          </div>
        )}
        {!selected.parceiro_id ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-semibold text-green-700">Contrato concluído</p>
            <p className="text-xs text-gray-500 mt-1">Orçamento direto — sem comissão de parceiro.</p>
          </div>
        ) : (<>
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Registrar comissão do parceiro</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Valor base (R$) *</Label>
            <Input value={formC.valor_base} onChange={e => setFormC(f => ({ ...f, valor_base: maskBRL(e.target.value) }))}
              placeholder="Ex: 350,00" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">% do parceiro *</Label>
            <Input value={formC.comissao_percentual} onChange={e => setFormC(f => ({ ...f, comissao_percentual: e.target.value }))}
              placeholder="Ex: 50" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
          </div>
        </div>
        {formC.valor_base && formC.comissao_percentual && (() => {
          const base = parseBRL(formC.valor_base) || 0;
          const pct = parseFloat(formC.comissao_percentual) || 0;
          const aposImp = base * (1 - 0.06);
          const comissao = aposImp * (pct / 100);
          return (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
              <p className="text-xs text-gray-500">Base: R$ {fmtBRL(base)} → após 6% imposto: R$ {fmtBRL(aposImp)}</p>
              <p className="text-lg font-bold text-[#003580] mt-1">Comissão: R$ {fmtBRL(comissao)}</p>
            </div>
          );
        })()}
        <Button onClick={handleComissao} disabled={enviando} className="w-full rounded-xl text-white font-semibold gap-2" style={{ background: '#003580' }}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          Registrar Comissão
        </Button>
        </>)}
      </div>
    );

    if (s === 'COMISSAO') return (
      <div className="space-y-3">
        {renderAtividade()}
        {selected.operadora_escolhida && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">Proposta aceita: <strong>{selected.descricao_orcamento || selected.operadora_escolhida}</strong></p>
          </div>
        )}
        <p className="text-sm font-semibold text-gray-700 border-b pb-2">Comissão registrada</p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-gray-500">Parceiro: {selected.parceiros?.nome_completo}</p>
          {selectedComissao && (
            <p className="text-xs text-gray-500 mt-0.5">
              R$ {Number(selectedComissao.valor_base || 0).toFixed(2).replace('.', ',')} · {selectedComissao.comissao_percentual}% · 6% imposto = <span className="font-semibold text-[#003580]">R$ {Number(selectedComissao.valor_comissao || 0).toFixed(2).replace('.', ',')}</span>
            </p>
          )}
          <p className="text-base font-bold text-[#003580] mt-1">
            {selectedComissao?.status === 'PAGO' ? 'Pagamento realizado ✅' : 'Contrato concluído ✅'}
          </p>
        </div>
        {(() => {
          const comps = parseComprovantes(selectedComissao?.comprovante_path);
          return comps.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Comprovantes enviados ({comps.length})</p>
              {comps.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <a href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#003580] hover:underline font-medium flex-1">
                    <Eye className="h-4 w-4" /> Comprovante {comps.length > 1 ? i + 1 : ''}
                  </a>
                  <button onClick={() => handleExcluirComprovante(i)}
                    className="text-red-400 hover:text-red-600 p-0.5 rounded transition-colors" title="Excluir comprovante">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          );
        })()}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">
            {selectedComissao?.comprovante_path ? 'Adicionar comprovante' : 'Upload do comprovante de pagamento'}
          </p>
          <input ref={compInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleUploadComprovante(e.target.files?.[0])} />
          <Button onClick={() => compInputRef.current?.click()} disabled={uploadingComp} variant="outline" className="w-full rounded-xl gap-2 text-sm border-[#003580]/30 text-[#003580] hover:bg-blue-50">
            {uploadingComp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingComp ? 'Enviando...' : selectedComissao?.comprovante_path ? 'Adicionar comprovante' : 'Enviar comprovante e marcar como pago'}
          </Button>
        </div>
      </div>
    );

    return null;
  };

  const pendentes = orcamentos.filter(o => o.status === 'SOLICITACAO').length;
  const emAndamento = orcamentos.filter(o => !['CONCLUIDO', 'COMISSAO', 'SOLICITACAO'].includes(o.status)).length;
  const concluidos = orcamentos.filter(o => ['CONCLUIDO', 'COMISSAO'].includes(o.status)).length;
  const FILTROS = ['TODOS', 'SOLICITACAO', 'ORCAMENTO', 'DOCUMENTOS', 'ASSINATURA', 'CONCLUIDO', 'COMISSAO'];
  const orcamentosFiltrados = filtro === 'TODOS' ? orcamentos : orcamentos.filter(o => o.status === filtro);
  const totalFiltrado = orcamentosFiltrados.length;
  const totalPaginas = Math.ceil(totalFiltrado / 10);
  const orcamentoPagina = orcamentosFiltrados.slice((pagina - 1) * 10, pagina * 10);

  return (
    <>
      <Helmet><title>Orçamentos — Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Orçamentos</h1>
            <Button onClick={() => { setSegData({}); setCriarModal(true); }} variant="ghost" className="text-white font-semibold border border-white/40 bg-white/10 hover:bg-white/20 hover:text-white">
              Novo orçamento
            </Button>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Solicitações novas', value: pendentes, icon: Clock, color: 'text-gray-600' },
              { label: 'Em andamento', value: emAndamento, icon: FileText, color: 'text-blue-600' },
              { label: 'Concluídos', value: concluidos, icon: CheckCircle2, color: 'text-green-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-800">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {FILTROS.map(f => (
              <button key={f} onClick={() => { setFiltro(f); setPagina(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${filtro === f ? 'bg-white text-[#003580] border-white' : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'}`}>
                {f === 'TODOS' ? 'Todos' : (STATUS_CONFIG[f]?.label || f)}
                {f !== 'TODOS' && ` (${orcamentos.filter(o => o.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Lista de cards */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : orcamentosFiltrados.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="text-center py-16">
                  <HeartHandshake className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">
                    Nenhum orçamento {filtro !== 'TODOS' ? `com status "${STATUS_CONFIG[filtro]?.label}"` : 'ainda'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              orcamentoPagina.map(o => {
                const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.SOLICITACAO;
                const step = FUNIL.indexOf(o.status);
                const isExpanded = expandedId === o.id;
                return (
                  <Card key={o.id} className="border shadow-sm transition-all">
                    {/* Header do card */}
                    <CardContent
                      className="p-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(o)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{o.cliente_nome || 'Cliente não informado'}</p>
                          <p className="text-xs text-gray-400">{SEGMENTO_LABEL[o.segmento] || o.segmento}</p>
                          {o.numero_protocolo && (
                            <p className="text-xs font-mono font-semibold mt-0.5" style={{ color: '#003580' }}>{o.numero_protocolo}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">Parceiro: <span className="font-medium">{o.parceiros?.nome_completo || '—'}</span></p>
                          {o.valor_mensalidade && (
                            <p className="text-xs text-gray-500 mt-0.5">{['AUTO', 'VIAGEM', 'RESIDENCIAL'].includes(o.segmento) ? 'Valor do seguro' : 'Mensalidade'}: R$ {fmtBRL(o.valor_mensalidade)}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-2">
                            {o.status === 'SOLICITACAO' && (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                              </span>
                            )}
                            <Badge className={`text-xs ${cfg.color}`}>{o.status === 'ASSINATURA' ? assinaturaLabel(o.segmento) : cfg.label}</Badge>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          {(o.descricao_orcamento || o.operadora_escolhida) && (
                            <p className="text-xs text-green-700 font-medium text-right max-w-[160px]">Proposta aceita: <strong>{o.descricao_orcamento || o.operadora_escolhida}</strong></p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center px-1">
                        {FUNIL.map((s, i) => {
                          const isPast = i < step;
                          const isCurrent = i === step;
                          const isLast = i === FUNIL.length - 1;
                          const shouldPulse = isCurrent && step < FUNIL.length - 1;
                          return (
                            <React.Fragment key={s}>
                              <div className="relative flex items-center justify-center shrink-0">
                                {shouldPulse && (
                                  <span className="absolute inline-flex h-4 w-4 rounded-full bg-[#003580] opacity-50 animate-ping" />
                                )}
                                <div className={`rounded-full transition-all duration-300 relative z-10 shadow-sm ${
                                  isPast ? 'h-3.5 w-3.5 bg-[#003580]' :
                                  isCurrent ? 'h-4 w-4 bg-[#003580]' :
                                  'h-2.5 w-2.5 bg-gray-200 border-2 border-gray-300'
                                }`} />
                              </div>
                              {!isLast && (
                                <div className={`flex-1 h-1 mx-2.5 rounded-full transition-colors duration-300 ${isPast ? 'bg-[#003580]' : 'bg-gray-200'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </CardContent>

                    {/* Conteúdo expandido inline */}
                    <AnimatePresence>
                      {isExpanded && selected?.id === o.id && (
                        <motion.div
                          key="detail"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
                            {/* Dados do cliente */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do cliente</p>
                                <div className="flex items-center gap-2">
                                  {!editandoCliente && (
                                    <button type="button" onClick={handleAbrirEditarCliente}
                                      className="text-xs text-[#003580] hover:text-[#002060] transition-colors flex items-center gap-1">
                                      <Edit2 className="h-3.5 w-3.5" /> Editar
                                    </button>
                                  )}
                                  {!confirmDelete && !editandoCliente ? (
                                    <button type="button" onClick={() => setConfirmDelete(true)}
                                      className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                                    </button>
                                  ) : !editandoCliente && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-red-600 font-medium">Confirmar?</span>
                                      <button type="button" onClick={handleExcluir} disabled={enviando}
                                        className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
                                        {enviando ? 'Excluindo...' : 'Sim'}
                                      </button>
                                      <button type="button" onClick={() => setConfirmDelete(false)}
                                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                        Não
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {editandoCliente ? (
                                <div className="space-y-2 pt-1">
                                  <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Nome</p>
                                    <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#003580]"
                                      value={clienteForm.cliente_nome} onChange={e => setClienteForm(f => ({ ...f, cliente_nome: e.target.value }))} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Telefone</p>
                                    <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#003580]"
                                      value={clienteForm.cliente_telefone} onChange={e => setClienteForm(f => ({ ...f, cliente_telefone: formatPhone(e.target.value) }))} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-0.5">E-mail</p>
                                    <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#003580]"
                                      value={clienteForm.cliente_email} onChange={e => setClienteForm(f => ({ ...f, cliente_email: e.target.value }))} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-0.5">CPF / CNPJ</p>
                                    <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#003580]"
                                      value={clienteForm.cliente_cpf} onChange={e => setClienteForm(f => ({ ...f, cliente_cpf: formatCpfCnpj(e.target.value) }))} />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setEditandoCliente(false)} disabled={enviando}
                                      className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 text-gray-600 hover:bg-gray-100 transition-colors">
                                      Cancelar
                                    </button>
                                    <button type="button" onClick={handleSalvarCliente} disabled={enviando}
                                      className="flex-1 text-xs rounded-lg py-1.5 text-white font-semibold transition-colors disabled:opacity-50"
                                      style={{ background: '#003580' }}>
                                      {enviando ? 'Salvando...' : 'Salvar'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {selected.cliente_telefone && <p><span className="text-gray-400">Tel:</span> {selected.cliente_telefone}</p>}
                                  {selected.cliente_email && <p><span className="text-gray-400">Email:</span> {selected.cliente_email}</p>}
                                  {selected.cliente_cpf && <p><span className="text-gray-400">CPF/CNPJ:</span> {selected.cliente_cpf}</p>}
                                </>
                              )}
                              {(selected.observacoes || (CAMPOS_SEGMENTO[selected.segmento] || []).length > 0) && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-xs text-gray-500 font-medium">Dados da solicitação</p>
                                    {!editandoSolicitacao && (CAMPOS_SEGMENTO[selected.segmento] || []).length > 0 && (
                                      <button type="button" onClick={handleAbrirEditarSolicitacao}
                                        className="text-xs text-[#003580] hover:text-[#002060] transition-colors flex items-center gap-1">
                                        <Edit2 className="h-3.5 w-3.5" /> Editar
                                      </button>
                                    )}
                                  </div>
                                  {editandoSolicitacao ? (
                                    <div className="space-y-2 pt-1">
                                      <div className="flex justify-end">
                                        <button type="button" onClick={() => setSegData({})}
                                          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                          <Trash2 className="h-3.5 w-3.5" /> Limpar dados
                                        </button>
                                      </div>
                                      {renderCamposSegmento(selected.segmento, 'Editar dados')}
                                      <div className="flex gap-2 pt-1">
                                        <button type="button" onClick={() => setEditandoSolicitacao(false)} disabled={enviando}
                                          className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 text-gray-600 hover:bg-gray-100 transition-colors">
                                          Cancelar
                                        </button>
                                        <button type="button" onClick={handleSalvarSolicitacao} disabled={enviando}
                                          className="flex-1 text-xs rounded-lg py-1.5 text-white font-semibold transition-colors disabled:opacity-50"
                                          style={{ background: '#003580' }}>
                                          {enviando ? 'Salvando...' : 'Salvar'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    selected.observacoes && <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{selected.observacoes}</pre>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Painel de ação por status */}
                            {renderActionPanel()}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })
            )}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded-lg text-sm bg-white/10 text-white/70 border border-white/20 disabled:opacity-30 hover:bg-white/20">
                ← Anterior
              </button>
              <span className="text-sm text-white/60">{pagina} / {totalPaginas}</span>
              <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded-lg text-sm bg-white/10 text-white/70 border border-white/20 disabled:opacity-30 hover:bg-white/20">
                Próxima →
              </button>
            </div>
          )}

        </motion.div>
      </DashboardLayout>

      {/* Modal — Novo orçamento */}
      {criarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-hidden" onClick={() => setCriarModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden overscroll-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Novo orçamento</h2>
              <button onClick={() => setCriarModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3 overflow-y-auto px-6 pb-8">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={temParceiro}
                    onChange={e => { setTemParceiro(e.target.checked); if (!e.target.checked) setNovoForm(f => ({ ...f, parceiro_id: '' })); }}
                    className="h-4 w-4 rounded border-gray-300 accent-[#003580]"
                  />
                  <span className="text-sm text-gray-700">Este orçamento é de um parceiro</span>
                </label>
                {temParceiro && (
                  <select value={novoForm.parceiro_id} onChange={e => setNovoForm(f => ({ ...f, parceiro_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580]">
                    <option value="">Selecionar parceiro...</option>
                    {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Segmento *</Label>
                <select value={novoForm.segmento} onChange={e => { setNovoForm(f => ({ ...f, segmento: e.target.value })); setSegData({}); }}
                  className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-3 py-2 text-sm focus:outline-none focus:border-[#003580]">
                  <option value="">Selecionar segmento...</option>
                  {Object.entries(SEGMENTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-semibold text-[#003580] uppercase tracking-wide mb-3">Dados do cliente</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Nome completo *</Label>
                <Input value={novoForm.cliente_nome} onChange={e => setNovoForm(f => ({ ...f, cliente_nome: e.target.value }))}
                  placeholder="Nome completo" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Telefone / WhatsApp *</Label>
                <Input value={novoForm.cliente_telefone} onChange={e => setNovoForm(f => ({ ...f, cliente_telefone: formatPhone(e.target.value) }))}
                  placeholder="(11) 99999-9999"
                  className={`border bg-[#f0f7ff] focus:border-[#003580] ${novoForm.cliente_telefone && !validarTelefone(novoForm.cliente_telefone) ? 'border-red-400' : 'border-gray-200'}`} />
                {novoForm.cliente_telefone && !validarTelefone(novoForm.cliente_telefone) && (
                  <p className="text-xs text-red-500 mt-0.5">Informe um número com DDD</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">E-mail *</Label>
                <Input value={novoForm.cliente_email} onChange={e => setNovoForm(f => ({ ...f, cliente_email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className={`border bg-[#f0f7ff] focus:border-[#003580] ${novoForm.cliente_email && !validarEmail(novoForm.cliente_email) ? 'border-red-400' : 'border-gray-200'}`} />
                {novoForm.cliente_email && !validarEmail(novoForm.cliente_email) && (
                  <p className="text-xs text-red-500 mt-0.5">Informe um e-mail válido</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">CPF / CNPJ *</Label>
                  <Input value={novoForm.cliente_cpf} onChange={e => setNovoForm(f => ({ ...f, cliente_cpf: formatCpfCnpj(e.target.value) }))}
                    placeholder="000.000.000-00"
                    className={`border bg-[#f0f7ff] focus:border-[#003580] ${novoForm.cliente_cpf && !validarCpfCnpj(novoForm.cliente_cpf) ? 'border-red-400' : 'border-gray-200'}`} />
                  {novoForm.cliente_cpf && !validarCpfCnpj(novoForm.cliente_cpf) && (
                    <p className="text-xs text-red-500 mt-0.5">CPF ou CNPJ inválido</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Data de nascimento *</Label>
                  <Input type="date" value={novoForm.cliente_data_nascimento} onChange={e => setNovoForm(f => ({ ...f, cliente_data_nascimento: e.target.value }))}
                    className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
                </div>
              </div>

              {/* Campos específicos do segmento */}
              {novoForm.segmento && renderCamposSegmento(novoForm.segmento)}

              {/* Faixas etárias — igual ao formulário do parceiro */}
              {['SAUDE', 'ODONTOLOGICO'].includes(novoForm.segmento) && parseInt(segData.vidas || '0') > 0 && (() => {
                const totalVidas = parseInt(segData.vidas || '0');
                const distribuiVidas = AGE_BRACKETS.reduce((s, { id }) => s + parseInt(segData[faixaKey(id)] || '0'), 0);
                const remaining = totalVidas - distribuiVidas;
                return (
                  <div className="space-y-2 border border-blue-100 rounded-xl p-3 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Distribuição por faixa etária</p>
                      <span className={`text-xs font-bold ${remaining === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {remaining === 0 ? 'Completo ✓' : `${remaining} restante(s)`}
                      </span>
                    </div>
                    {AGE_BRACKETS.map(({ id, label }) => {
                      const key = faixaKey(id);
                      const val = parseInt(segData[key] || '0');
                      const atingiuTotal = distribuiVidas >= totalVidas;
                      return (
                        <div key={id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex-1">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <button type="button"
                              onClick={() => setSegData(d => ({ ...d, [key]: String(Math.max(0, val - 1)) }))}
                              disabled={val === 0}
                              className="w-6 h-6 rounded-md border border-gray-300 bg-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-300">
                              <Minus className="h-3 w-3 text-gray-700" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold text-gray-800">{val}</span>
                            <button type="button"
                              onClick={() => { if (!atingiuTotal) setSegData(d => ({ ...d, [key]: String(val + 1) })); }}
                              disabled={atingiuTotal}
                              className="w-6 h-6 rounded-md border border-gray-300 bg-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-300">
                              <Plus className="h-3 w-3 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Cenário Atual do Cliente — só para SAUDE e ODONTOLOGICO com vidas preenchidas */}
              {['SAUDE', 'ODONTOLOGICO'].includes(novoForm.segmento) && parseInt(segData.vidas || '0') > 0 && (
              <div className="space-y-2 border border-blue-100 rounded-xl p-3 bg-blue-50">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Cenário atual do cliente</p>
                  <button type="button" onClick={addCenarioCriar} className="text-xs text-[#003580] hover:underline flex items-center gap-1">
                     Adicionar plano
                  </button>
                </div>
                {(() => {
                  const cenAtivosAdm = cenariosCriar.filter(c => c.tem_plano);
                  const temMultiplosAdm = cenAtivosAdm.length > 1;
                  const showDistAdm = temMultiplosAdm && ['SAUDE', 'ODONTOLOGICO'].includes(novoForm.segmento) && parseInt(segData.vidas || '0') > 0;
                  return (
                    <>
                      {cenariosCriar.map((c, ci) => (
                        <div key={ci} className="space-y-2 bg-white rounded-lg p-2 border border-blue-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-500">Possui plano atual?</Label>
                              <div className="flex rounded border border-gray-200 overflow-hidden text-xs font-semibold">
                                <button type="button" onClick={() => updCenarioCriar(ci, 'tem_plano', false)} className={`px-2 py-1 transition-colors ${!c.tem_plano ? 'bg-[#003580] text-white' : 'bg-white text-gray-400'}`}>Não</button>
                                <button type="button" onClick={() => updCenarioCriar(ci, 'tem_plano', true)} className={`px-2 py-1 transition-colors ${c.tem_plano ? 'bg-[#003580] text-white' : 'bg-white text-gray-400'}`}>Sim</button>
                              </div>
                            </div>
                            {cenariosCriar.length > 1 && <button type="button" onClick={() => removeCenarioCriar(ci)} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>}
                          </div>
                          {c.tem_plano && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Operadora atual</Label>
                                  <select value={c.operadora} onChange={e => updCenarioCriar(ci, 'operadora', e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-[#f0f7ff] px-2 py-1.5 text-sm focus:outline-none focus:border-[#003580]">
                                    <option value="">Selecionar...</option>
                                    {SEGURADORAS.filter(s => !novoForm.segmento || s.categorias.includes(novoForm.segmento)).map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Valor mensal (R$)</Label>
                                  <Input value={c.valor} onChange={e => updCenarioCriar(ci, 'valor', maskBRL(e.target.value))}
                                    placeholder="Ex: 520,00" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580] h-8 text-sm" />
                                </div>
                              </div>
                              {showDistAdm && (
                                <div className="pt-1.5 border-t border-blue-100 space-y-1.5">
                                  <p className="text-xs font-semibold text-gray-600">Vidas por faixa etária</p>
                                  {AGE_BRACKETS.filter(({ id }) => parseInt(segData[faixaKey(id)] || '0') > 0).map(({ id, label }) => {
                                    const meta = parseInt(segData[faixaKey(id)] || '0');
                                    const val = parseInt((c.vidas || {})[id] || 0);
                                    const totalFaixa = cenAtivosAdm.reduce((s, c2) => s + parseInt((c2.vidas || {})[id] || 0), 0);
                                    const atingiuLimite = totalFaixa >= meta;
                                    return (
                                      <div key={id} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{label}</span>
                                        <span className="text-xs text-gray-300 shrink-0">{totalFaixa}/{meta}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button type="button" onClick={() => updCenarioCriarVidas(ci, id, Math.max(0, val - 1))} disabled={val === 0}
                                            className="w-5 h-5 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-100">−</button>
                                          <span className="w-6 text-center text-xs font-semibold text-gray-800">{val}</span>
                                          <button type="button" onClick={() => { if (!atingiuLimite) updCenarioCriarVidas(ci, id, val + 1); }} disabled={atingiuLimite}
                                            className="w-5 h-5 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-gray-100">+</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div className="flex justify-between pt-1 border-t border-gray-100">
                                    <span className="text-xs font-semibold text-gray-600">Total deste cenário</span>
                                    <span className="text-xs font-bold text-gray-800">
                                      {AGE_BRACKETS.reduce((s, { id }) => s + parseInt((c.vidas || {})[id] || 0), 0)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {showDistAdm && (() => {
                        const porFaixa = AGE_BRACKETS.filter(({ id }) => parseInt(segData[faixaKey(id)] || '0') > 0).map(({ id, label }) => {
                          const meta = parseInt(segData[faixaKey(id)] || '0');
                          const dist = cenAtivosAdm.reduce((s, c) => s + parseInt((c.vidas || {})[id] || 0), 0);
                          return { id, label, vidas: meta, distribuido: dist, faltam: meta - dist };
                        });
                        const totalMeta = porFaixa.reduce((s, f) => s + f.vidas, 0);
                        const totalDist = porFaixa.reduce((s, f) => s + f.distribuido, 0);
                        const totalFaltam = totalMeta - totalDist;
                        const completo = totalFaltam === 0 && totalMeta > 0;
                        const excede = totalFaltam < 0;
                        return (
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className={`flex items-center justify-between px-3 py-2 border-b ${completo ? 'bg-green-50 border-green-200' : excede ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                              <span className={`text-xs font-semibold ${completo ? 'text-green-700' : excede ? 'text-red-600' : 'text-amber-700'}`}>
                                {completo ? '✓ Todas as vidas distribuídas' : excede ? `Excede em ${Math.abs(totalFaltam)} vidas` : `${totalFaltam} vidas para distribuir`}
                              </span>
                              <span className="text-xs text-gray-400">{totalDist}/{totalMeta}</span>
                            </div>
                            <table className="w-full text-xs">
                              <thead><tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Faixa</th>
                                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Meta</th>
                                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Dist.</th>
                                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Faltam</th>
                              </tr></thead>
                              <tbody>
                                {porFaixa.map((f, i) => (
                                  <tr key={i} className={`border-b border-gray-100 ${f.faltam === 0 ? 'bg-green-50/40' : f.faltam < 0 ? 'bg-red-50/40' : ''}`}>
                                    <td className="px-3 py-1 text-gray-700">{f.label}</td>
                                    <td className="px-3 py-1 text-right text-gray-400">{f.vidas}</td>
                                    <td className="px-3 py-1 text-right font-semibold text-gray-800">{f.distribuido}</td>
                                    <td className={`px-3 py-1 text-right font-semibold ${f.faltam === 0 ? 'text-green-600' : f.faltam < 0 ? 'text-red-500' : 'text-amber-600'}`}>{f.faltam === 0 ? '✓' : f.faltam}</td>
                                  </tr>
                                ))}
                                <tr className="bg-gray-50">
                                  <td className="px-3 py-1.5 font-bold text-gray-700">Total</td>
                                  <td className="px-3 py-1.5 text-right font-semibold text-gray-400">{totalMeta}</td>
                                  <td className="px-3 py-1.5 text-right font-black text-gray-800">{totalDist}</td>
                                  <td className={`px-3 py-1.5 text-right font-black ${completo ? 'text-green-600' : 'text-amber-600'}`}>{completo ? '✓' : totalFaltam}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Observações adicionais</Label>
                <Input value={novoForm.observacoes} onChange={e => setNovoForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Informações extras (opcional)" className="border-gray-200 bg-[#f0f7ff] focus:border-[#003580]" />
              </div>
            </div>

            <div className="flex gap-3 px-6 pt-2 pb-6 shrink-0">
              <Button variant="outline" className="flex-1" onClick={() => setCriarModal(false)}>Cancelar</Button>
              <Button onClick={handleCriarOrcamento} disabled={criando} className="flex-1 text-white font-semibold gap-2" style={{ background: '#003580' }}>
                {criando && <Loader2 className="h-4 w-4 animate-spin" />}
                {criando ? 'Criando...' : 'Criar orçamento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminParceirosPage;
