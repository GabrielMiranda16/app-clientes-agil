import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { HeartPulse, Car, Plane, Home, PawPrint, Building2, Package, Monitor, Loader2, UserCog } from 'lucide-react';
import { formatCpfCnpj } from '@/lib/masks';
import DashboardLayout from '@/components/DashboardLayout';

const SEGMENTO_CONFIG = {
  SAUDE_VIDA_ODONTO: { label: 'Saúde, Vida e Odonto', descricao: 'Planos de saúde, seguro de vida e planos odontológicos', Icon: HeartPulse },
  AUTO_FROTA:        { label: 'Auto e Frota',          descricao: 'Proteção completa para veículos e frotas',             Icon: Car      },
  VIAGEM:            { label: 'Viagem',                descricao: 'Cobertura nacional e internacional para viagens',      Icon: Plane    },
  RESIDENCIAL:       { label: 'Residencial',           descricao: 'Proteção completa para sua residência',               Icon: Home     },
  PET_SAUDE:         { label: 'Pet Saúde',             descricao: 'Cuidados veterinários para seu pet',                  Icon: PawPrint },
  EMPRESARIAL:       { label: 'Empresarial',           descricao: 'Proteção para patrimônio e operações empresariais',   Icon: Building2},
  CARGAS:            { label: 'Cargas',                descricao: 'Proteção para transporte de cargas e mercadorias',    Icon: Package  },
  EQUIPAMENTOS:      { label: 'Equipamentos',          descricao: 'Cobertura para equipamentos e maquinários',           Icon: Monitor  },
};

const SelectSegmento = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [apolicesPorSegmento, setApolicesPorSegmento] = useState({});
  const [empresa, setEmpresa] = useState(null);

  // Modal dados pessoais
  const [isDadosModalOpen, setIsDadosModalOpen] = useState(false);
  const [dadosForm, setDadosForm] = useState({});
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isSavingDados, setIsSavingDados] = useState(false);

  const isPF = empresa?.cnpj && empresa.cnpj.replace(/\D/g, '').length === 11;

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // Support both empresa_matriz_id and empresa_id (for PF clients)
        const empresaId = user.empresa_matriz_id || user.empresa_id;
        if (empresaId) {
          const [empResult, apolices] = await Promise.all([
            supabaseClient.from('empresas').select('*').eq('id', empresaId).single(),
            apolicesService.getApolicesByMatriz(empresaId),
          ]);
          if (empResult.data) setEmpresa(empResult.data);

          const agrupadas = apolices.reduce((acc, ap) => {
            if (!acc[ap.segmento]) acc[ap.segmento] = [];
            acc[ap.segmento].push(ap);
            return acc;
          }, {});
          setApolicesPorSegmento(agrupadas);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSelectSegmento = (segmento) => {
    navigate(`/select-apolice/${segmento.toLowerCase()}`);
  };

  // --- Dados Pessoais ---
  const openDados = () => {
    if (!empresa) return;
    setDadosForm({
      razao_social: empresa.razao_social || '',
      cnpj: empresa.cnpj || '',
      data_nascimento: empresa.data_nascimento || '',
      endereco_completo: empresa.endereco_completo || '',
      cep_busca: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    });
    setIsDadosModalOpen(true);
  };

  const buscarCep = async (cep) => {
    const nums = cep.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setIsCepLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data.erro) {
        setDadosForm(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
      } else {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      }
    } catch {} finally {
      setIsCepLoading(false);
    }
  };

  const handleSaveDados = async (e) => {
    e.preventDefault();
    setIsSavingDados(true);
    try {
      const parts = [
        dadosForm.rua || '',
        dadosForm.numero && `nº ${dadosForm.numero}`,
        dadosForm.complemento,
        dadosForm.bairro,
        dadosForm.cidade && dadosForm.estado
          ? `${dadosForm.cidade}/${dadosForm.estado}`
          : dadosForm.cidade || dadosForm.estado,
        dadosForm.cep_busca && `CEP ${dadosForm.cep_busca}`,
      ].filter(Boolean);
      const endereco_completo = parts.length > 0 ? parts.join(', ') : (dadosForm.endereco_completo || '');
      const { error } = await supabaseClient.from('empresas').update({
        razao_social: dadosForm.razao_social,
        endereco_completo,
        ...(isPF && { data_nascimento: dadosForm.data_nascimento || null }),
      }).eq('id', empresa.id);
      if (error) throw error;
      setEmpresa(prev => ({ ...prev, razao_social: dadosForm.razao_social, endereco_completo, data_nascimento: dadosForm.data_nascimento }));
      toast({ title: 'Dados atualizados com sucesso.' });
      setIsDadosModalOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar dados', description: err?.message || JSON.stringify(err) });
    } finally {
      setIsSavingDados(false);
    }
  };

  const segmentosDisponiveis = Object.keys(SEGMENTOS).filter(
    seg => (apolicesPorSegmento[seg]?.length || 0) > 0
  );

  const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Meus Seguros - Ágil Seguros</title></Helmet>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Meus Seguros</h1>
              {empresaNome && <p className="text-white/70 text-sm">{empresaNome}</p>}
            </div>
            {empresa && (
              <Button variant="outline" size="sm" onClick={openDados} className="border-white/30 text-white hover:bg-white/10 shrink-0">
                <UserCog className="h-4 w-4 mr-2" /> {isPF ? 'Dados Pessoais' : 'Dados da Empresa'}
              </Button>
            )}
          </div>

          {segmentosDisponiveis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Building2 className="h-12 w-12 text-white/30 mb-4" />
              <h2 className="text-xl font-semibold text-white">Nenhum seguro ativo</h2>
              <p className="text-white/60 mt-2">Entre em contato com o administrador.</p>
              <p className="text-white/60 mt-4 text-sm">Use o menu acima para sair.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {segmentosDisponiveis.map((seg) => {
                const config = SEGMENTO_CONFIG[seg];
                if (!config) return null;
                const { Icon, label, descricao } = config;
                const count = apolicesPorSegmento[seg]?.length || 0;
                return (
                  <motion.div
                    key={seg}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="bg-white border border-gray-100 rounded-3xl shadow-md p-5 flex flex-col cursor-pointer"
                    onClick={() => handleSelectSegmento(seg)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#003580]/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#003580]" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-snug mb-1">{label}</p>
                    <p className="text-xs text-gray-400 mb-4 flex-grow">{descricao}</p>
                    <span className="block w-full text-center bg-[#003580] text-white text-xs font-semibold py-2 rounded-full mt-auto">
                      {count} {count === 1 ? 'apólice' : 'apólices'}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </DashboardLayout>

      {/* Modal Dados */}
      <Dialog open={isDadosModalOpen} onOpenChange={setIsDadosModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isPF ? 'Dados Pessoais' : 'Dados da Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDados} className="space-y-4 py-2">
            <div>
              <Label>{isPF ? 'Nome Completo' : 'Razão Social'}</Label>
              <Input value={dadosForm.razao_social || ''} onChange={e => setDadosForm(p => ({ ...p, razao_social: e.target.value }))} />
            </div>
            <div>
              <Label>{isPF ? 'CPF' : 'CNPJ'}</Label>
              <Input value={dadosForm.cnpj ? formatCpfCnpj(dadosForm.cnpj) : ''} readOnly className="bg-gray-50 text-gray-500" />
            </div>
            {isPF && (
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" value={dadosForm.data_nascimento || ''} onChange={e => setDadosForm(p => ({ ...p, data_nascimento: e.target.value }))} />
              </div>
            )}
            {/* Endereço atual */}
            {dadosForm.endereco_completo && (
              <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600">
                <p className="text-xs font-medium text-gray-400 mb-1">Endereço atual</p>
                {dadosForm.endereco_completo}
              </div>
            )}
            {/* Atualizar endereço via CEP */}
            <div>
              <Label>Atualizar Endereço via CEP</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="00000-000"
                  maxLength={9}
                  value={dadosForm.cep_busca || ''}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2');
                    setDadosForm(p => ({ ...p, cep_busca: v }));
                  }}
                  onBlur={e => buscarCep(e.target.value)}
                />
                <Button type="button" variant="outline" disabled={isCepLoading} onClick={() => buscarCep(dadosForm.cep_busca || '')}>
                  {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Rua / Logradouro</Label>
              <Input value={dadosForm.rua || ''} onChange={e => setDadosForm(p => ({ ...p, rua: e.target.value }))} placeholder="Preenchido automaticamente pelo CEP" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Número</Label>
                <Input value={dadosForm.numero || ''} onChange={e => setDadosForm(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: 123" />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={dadosForm.complemento || ''} onChange={e => setDadosForm(p => ({ ...p, complemento: e.target.value }))} placeholder="Apto, sala..." />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Bairro</Label>
                <Input value={dadosForm.bairro || ''} readOnly className="bg-gray-50 text-gray-500" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={dadosForm.cidade || ''} readOnly className="bg-gray-50 text-gray-500" />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={dadosForm.estado || ''} readOnly className="bg-gray-50 text-gray-500 w-full sm:w-24" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDadosModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSavingDados} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSavingDados && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelectSegmento;
