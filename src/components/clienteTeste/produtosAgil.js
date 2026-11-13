import { ClipboardCheck, Stethoscope, BarChart3, HeartPulse, Car, Home, Plane, Building2 } from 'lucide-react';

export const WHATSAPP_AGIL = '5511999996863';

export const linkWhatsappProduto = (produto) =>
  `https://wa.me/${WHATSAPP_AGIL}?text=${encodeURIComponent(`Olá! Vi ${produto.artigo} ${produto.nome} no app da Ágil e quero saber mais.`)}`;

export const SERVICOS = [
  {
    slug: 'gestao-de-planos',
    nome: 'Gestão de Planos',
    artigo: 'a',
    Icon: ClipboardCheck,
    foto: '/produtos/gestao-planos.jpg',
    resumo: 'Inclusões, exclusões, carteirinhas e boletos de todas as apólices num lugar só.',
    descricao: 'A Ágil cuida do dia a dia das suas apólices. Você pede inclusão ou exclusão pelo app, acompanha cada pedido até o fim e encontra contrato, boletos e coparticipação sem precisar procurar em e-mail.',
    itens: [
      'Inclusão e exclusão de colaboradores e dependentes',
      'Acompanhamento de cada pedido, do envio à operadora até a conclusão',
      'Contrato, boletos e coparticipação de cada apólice',
      'Aviso de dependente perto da idade limite',
      'Aviso de mudança de faixa etária',
      '2ª via de carteirinha',
    ],
    para: 'Empresas e pessoas com plano de saúde, vida ou odonto pela Ágil.',
  },
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
    para: 'Empresas com plano de saúde pela Ágil.',
  },
];

export const SEGUROS = [
  { slug: 'saude-vida-odonto', nome: 'Saúde, Vida e Odonto', artigo: 'o seguro de', Icon: HeartPulse, foto: '/produtos/saude.jpg', resumo: 'Planos para você, sua família ou sua empresa, nas principais operadoras.' },
  { slug: 'auto-frota', nome: 'Auto e Frota', artigo: 'o seguro', Icon: Car, foto: '/produtos/auto.jpg', resumo: 'Seguro para seu carro ou para a frota da empresa.' },
  { slug: 'residencial', nome: 'Residencial', artigo: 'o seguro', Icon: Home, foto: '/produtos/residencial.jpg', resumo: 'Proteção para sua casa ou apartamento, com assistências 24h.' },
  { slug: 'viagem', nome: 'Viagem', artigo: 'o seguro', Icon: Plane, foto: '/produtos/viagem.jpg', resumo: 'Cobertura médica e de bagagem no Brasil e no exterior.' },
  { slug: 'empresarial', nome: 'Empresarial', artigo: 'o seguro', Icon: Building2, foto: '/produtos/empresarial.jpg', resumo: 'Proteção para o patrimônio e a operação da sua empresa.' },
];
