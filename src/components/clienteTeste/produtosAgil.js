import { Stethoscope, BarChart3, HeartPulse, Heart, Smile, Car, Home, Plane, Building2 } from 'lucide-react';

export const WHATSAPP_AGIL = '5511999996863';

export const linkWhatsappProduto = (produto) =>
  `https://wa.me/${WHATSAPP_AGIL}?text=${encodeURIComponent(`Olá! Vi ${produto.artigo} ${produto.nome} no app da Ágil e quero saber mais.`)}`;

export const SERVICOS = [
  {
    slug: 'atestados',
    nome: 'Gestão de Atestados',
    artigo: 'a',
    Icon: Stethoscope,
    foto: '/produtos/atestados.jpg',
    resumo: 'Recebimento, análise e controle de atestados, com relatórios de absenteísmo.',
    descricao: 'Os atestados da sua empresa deixam de chegar por e-mail e WhatsApp. Cada documento é conferido pelas regras da empresa, e o RH acompanha afastamentos, retornos e o custo das ausências.',
    itens: [
      'Recebimento organizado de atestados e declarações',
      'Conferência de CRM, prazo de entrega e dados obrigatórios',
      'Status claro: em análise, pendente, aprovado ou recusado',
      'Acompanhamento de afastamentos acima de 15 dias (INSS)',
      'Relatórios de absenteísmo por setor, período e motivo',
      'Funciona mesmo sem plano de saúde com a Ágil',
      'Complementa o plano de saúde, se a empresa tiver',
    ],
    para: 'Empresas (CNPJ), com ou sem plano de saúde pela Ágil.',
  },
  {
    slug: 'agil-data',
    nome: 'Ágil Data',
    artigo: 'o',
    Icon: BarChart3,
    foto: '/produtos/agil-data.jpg',
    resumo: 'Entenda o uso do plano de saúde e chegue preparado à negociação do reajuste.',
    descricao: 'Lemos os relatórios da operadora e mostramos, em linguagem simples, como o plano está sendo usado: sinistralidade mês a mês, onde está o custo e o que dá para fazer antes do aniversário da apólice.',
    itens: [
      'Sinistralidade mês a mês',
      'Custo por tipo de uso (consultas, exames, internações)',
      'Alertas de tendência antes do reajuste',
      'Comparação com o ano anterior',
      'Apoio da Ágil na negociação com a operadora',
    ],
    para: 'Exclusivo para empresas com plano de saúde pela Ágil. Vida e odonto não entram.',
  },
];

export const SEGUROS = [
  { slug: 'saude', nome: 'Plano de Saúde', artigo: 'o', Icon: HeartPulse, foto: '/produtos/saude.jpg', resumo: 'Para você, sua família ou sua empresa, nas principais operadoras.' },
  { slug: 'vida', nome: 'Seguro de Vida', artigo: 'o', Icon: Heart, foto: '/produtos/vida.jpg', resumo: 'Individual ou em grupo, para proteger quem depende de você.' },
  { slug: 'odonto', nome: 'Plano Odontológico', artigo: 'o', Icon: Smile, foto: '/produtos/odonto.jpg', resumo: 'Individual ou empresarial, com rede ampla de dentistas.' },
  { slug: 'auto-frota', nome: 'Auto e Frota', artigo: 'o seguro', Icon: Car, foto: '/produtos/auto.jpg', resumo: 'Seguro para seu carro ou para a frota da empresa.' },
  { slug: 'residencial', nome: 'Residencial', artigo: 'o seguro', Icon: Home, foto: '/produtos/residencial.jpg', resumo: 'Proteção para sua casa ou apartamento, com assistências 24h.' },
  { slug: 'viagem', nome: 'Viagem', artigo: 'o seguro', Icon: Plane, foto: '/produtos/viagem.jpg', resumo: 'Cobertura médica e de bagagem no Brasil e no exterior.' },
  { slug: 'empresarial', nome: 'Empresarial', artigo: 'o seguro', Icon: Building2, foto: '/produtos/empresarial.jpg', resumo: 'Proteção para o patrimônio e a operação da sua empresa.' },
];
