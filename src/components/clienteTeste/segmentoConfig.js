import { HeartPulse, Car, Plane, Home, PawPrint, Building2, Package, Monitor, Heart, Smile } from 'lucide-react';

export const TIPOS_SVD = {
  saude:  { label: 'Saúde',  descricao: 'Plano de saúde para você, sua família ou sua empresa', Icon: HeartPulse },
  vida:   { label: 'Vida',   descricao: 'Seguro de vida individual ou em grupo',                Icon: Heart      },
  odonto: { label: 'Odonto', descricao: 'Plano odontológico individual ou empresarial',         Icon: Smile      },
};

const normalizarTipo = (t) => (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const tiposDaApolice = (apolice) => {
  const tipos = (apolice?.dados_adicionais?.sub_apolices || [])
    .map((s) => normalizarTipo(s.tipo))
    .filter((t) => TIPOS_SVD[t]);
  return tipos.length > 0 ? [...new Set(tipos)] : ['saude'];
};

export const mesmoTipo = (a, b) => normalizarTipo(a) === normalizarTipo(b);

export const SEGMENTO_CONFIG = {
  SAUDE_VIDA_ODONTO: { label: 'Saúde, Vida e Odonto', descricao: 'Planos de saúde, seguro de vida e planos odontológicos', Icon: HeartPulse },
  AUTO_FROTA:        { label: 'Auto e Frota',          descricao: 'Proteção completa para veículos e frotas',             Icon: Car      },
  VIAGEM:            { label: 'Viagem',                descricao: 'Cobertura nacional e internacional para viagens',      Icon: Plane    },
  RESIDENCIAL:       { label: 'Residencial',           descricao: 'Proteção completa para sua residência',               Icon: Home     },
  PET_SAUDE:         { label: 'Pet Saúde',             descricao: 'Cuidados veterinários para seu pet',                  Icon: PawPrint },
  EMPRESARIAL:       { label: 'Empresarial',           descricao: 'Proteção para patrimônio e operações empresariais',   Icon: Building2},
  CARGAS:            { label: 'Cargas',                descricao: 'Proteção para transporte de cargas e mercadorias',    Icon: Package  },
  EQUIPAMENTOS:      { label: 'Equipamentos',          descricao: 'Cobertura para equipamentos e maquinários',           Icon: Monitor  },
};

// Os 5 segmentos de maior relevância pro negócio aparecem como cards
// próprios na Meus Seguros — o restante entra agrupado em "Outros Seguros".
export const SEGMENTOS_IMPORTANTES = ['SAUDE_VIDA_ODONTO', 'AUTO_FROTA', 'RESIDENCIAL', 'VIAGEM', 'EMPRESARIAL'];
