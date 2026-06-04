import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { SEGURADORAS } from '@/data/seguradoras';
import {
  Loader2, ShieldCheck, CheckCircle2, Upload, FileText,
  AlertCircle, ArrowRight, Check, Star, ChevronDown, ChevronUp,
  ExternalLink, Shield, Heart, Car, Home, Plane, PawPrint,
  Building2, Package, Laptop, Truck, HeartHandshake, Info,
} from 'lucide-react';

const logoUrl = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png';

const SEGMENTO_LABEL = {
  AUTO: 'Seguro Auto', SAUDE: 'Plano de Saúde', RESIDENCIAL: 'Seguro Residencial',
  EMPRESARIAL: 'Seguro Empresarial', ODONTOLOGICO: 'Plano Odontológico', VIAGEM: 'Seguro Viagem',
  PET_SAUDE: 'Plano de Saúde Pet', PET_SEGURO: 'Seguro Pet', VIDA: 'Seguro de Vida',
  FROTA: 'Seguro Frota', CARGAS: 'Seguro de Cargas', EQUIPAMENTOS: 'Equipamentos Portáteis',
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto', AUTO_FROTA: 'Auto / Frota',
};

const SEGMENTO_ICON = {
  AUTO: Car, SAUDE: Heart, RESIDENCIAL: Home, EMPRESARIAL: Building2,
  ODONTOLOGICO: Shield, VIAGEM: Plane, PET_SAUDE: PawPrint, PET_SEGURO: PawPrint,
  VIDA: HeartHandshake, FROTA: Truck, CARGAS: Package, EQUIPAMENTOS: Laptop,
  SAUDE_VIDA_ODONTO: Heart, AUTO_FROTA: Car,
};

const SAUDE_SEGS = ['SAUDE', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'];

const fmtValor = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const parseValor = (v) => parseFloat(String(v || '0').replace(',', '.')) || 0;
const getPropostaValor = (p) => parseValor(p?.planos?.find(pl => pl.valor)?.valor || '0');

const cardBg = { background: 'linear-gradient(to top right, #6b9fd4, #2a6db5, #003580)' };

const OrcamentoPublicoPage = () => {
  const { slug } = useParams();
  const bottomRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const scrolledRef = useRef(false);
  const acessoIdRef = useRef(null);

  const [stage, setStage] = useState('loading');
  const [orcamento, setOrcamento] = useState(null);
  const [cpfInput, setCpfInput] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [propostaEscolhida, setPropostaEscolhida] = useState(null);
  const [docStatus, setDocStatus] = useState({});
  const [docsEnviados, setDocsEnviados] = useState([]);
  const [expandedDifs, setExpandedDifs] = useState(false);

  useEffect(() => { loadOrcamento(); }, [slug]);

  useEffect(() => {
    if (stage !== 'proposta') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !scrolledRef.current) {
        scrolledRef.current = true;
        if (acessoIdRef.current)
          supabase.from('orcamento_acessos').update({ scroll_fim: true }).eq('id', acessoIdRef.current).then(() => {});
      }
    }, { threshold: 0.5 });
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    return () => {
      if (acessoIdRef.current) {
        const tempo = Math.round((Date.now() - startTimeRef.current) / 1000);
        supabase.from('orcamento_acessos').update({ tempo_pagina: tempo }).eq('id', acessoIdRef.current).then(() => {});
      }
    };
  }, []);

  const loadOrcamento = async () => {
    const { data, error } = await supabase.from('orcamentos').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) { setStage('erro'); return; }
    setOrcamento(data);
    if (['ASSINATURA', 'CONCLUIDO', 'COMISSAO'].includes(data.status)) {
      setStage('encerrado');
    } else if (data.status === 'DOCUMENTOS') {
      const { data: sent } = await supabase.from('orcamento_documentos').select('tipo_documento').eq('orcamento_id', data.id);
      setDocsEnviados((sent || []).map(d => d.tipo_documento));
      setStage('documentos');
    } else if (data.status === 'ORCAMENTO') {
      setStage('verificacao');
    } else {
      setStage('erro');
    }
  };

  const handleVerificarCpf = async () => {
    const digits = cpfInput.replace(/\D/g, '');
    if (digits.length < 3) { setCpfError('Digite os 3 primeiros dígitos do seu CPF.'); return; }
    const primeiros3 = digits.slice(0, 3);
    setVerificando(true);
    setCpfError('');
    try {
      const cpfCadastrado = orcamento.cliente_cpf;
      if (cpfCadastrado && !cpfCadastrado.replace(/\D/g, '').startsWith(primeiros3)) {
        setCpfError('CPF incorreto. Verifique os primeiros 3 dígitos.');
        setVerificando(false);
        return;
      }
      const { data: acesso } = await supabase.from('orcamento_acessos').insert({
        orcamento_id: orcamento.id, cpf_3dig: primeiros3,
        acessado_em: new Date().toISOString(), ip: '', user_agent: navigator.userAgent,
      }).select().maybeSingle();
      if (acesso) acessoIdRef.current = acesso.id;
      startTimeRef.current = Date.now();
      setStage('proposta');
    } catch {
      setStage('proposta');
    } finally {
      setVerificando(false);
    }
  };

  const handleAceitarProposta = async (proposta = null) => {
    setAceitando(true);
    try {
      const updateData = { status: 'DOCUMENTOS', data_documentos: new Date().toISOString() };
      if (proposta) {
        const pl0 = proposta.planos?.find(pl => pl.valor) || proposta.planos?.[0];
        updateData.valor_mensalidade = parseValor(pl0?.valor);
        updateData.descricao_orcamento = `${proposta.operadora}${pl0?.nome ? ` — ${pl0.nome}` : ''}`;
        updateData.operadora_escolhida = proposta.operadora || null;
      }
      await supabase.from('orcamentos').update(updateData).eq('id', orcamento.id);
      if (acessoIdRef.current)
        await supabase.from('orcamento_acessos').update({ aceitou_proposta: true, aceitou_em: new Date().toISOString() }).eq('id', acessoIdRef.current);
      supabase.functions.invoke('notify-orcamento-aceito', { body: { orcamento_id: orcamento.id } }).catch(() => {});
      setPropostaEscolhida(proposta);
      setOrcamento(prev => ({ ...prev, status: 'DOCUMENTOS' }));
      setStage('documentos');
    } catch (err) {
      console.error(err);
    } finally {
      setAceitando(false);
    }
  };

  const handleUploadDoc = async (tipo, file) => {
    if (!file) return;
    setDocStatus(prev => ({ ...prev, [tipo]: 'uploading' }));
    try {
      const ext = file.name.split('.').pop();
      const safeTipo = tipo.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const path = `orcamentos/${orcamento.id}/${safeTipo}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('orcamento-documentos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('orcamento-documentos').getPublicUrl(path);
      await supabase.from('orcamento_documentos').insert({
        orcamento_id: orcamento.id, tipo_documento: tipo, nome_arquivo: file.name,
        storage_path: publicUrl, enviado_em: new Date().toISOString(), obrigatorio: true, enviado_por: 'CLIENTE',
      });
      setDocStatus(prev => ({ ...prev, [tipo]: 'done' }));
      setDocsEnviados(prev => prev.includes(tipo) ? prev : [...prev, tipo]);
    } catch (err) {
      console.error(err);
      setDocStatus(prev => ({ ...prev, [tipo]: 'error' }));
    }
  };

  const todosOsDocs = [...(orcamento?.lista_documentos || []), ...(orcamento?.docs_extras || [])];
  const todosEnviados = todosOsDocs.length > 0 && todosOsDocs.every(d => docsEnviados.includes(d) || docStatus[d] === 'done');

  const propostas = orcamento?.propostas || [];
  const destaqueIdx = propostas.findIndex(p => p.destaque);
  const effectiveDestaqueIdx = destaqueIdx >= 0 ? destaqueIdx : 0;
  const propostaDestaque = propostas[effectiveDestaqueIdx];
  const cenarios = (orcamento?.cenarios_atuais || []).filter(c => c.tem_plano);
  const segmento = orcamento?.segmento;
  const SegIcon = SEGMENTO_ICON[segmento] || Shield;
  const isSaude = SAUDE_SEGS.includes(segmento);

  const segData = propostaDestaque ? SEGURADORAS.find(s => s.nome === propostaDestaque.operadora) : null;
  const diferenciais = segData?.diferenciais || [];

  if (stage === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #003580 0%, #1a5599 25%, #6b9fd4 52%, #c8e0f5 70%, #f0f7ff 84%, #ffffff 100%)' }}>
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );

  if (stage === 'erro') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: 'linear-gradient(180deg, #003580 0%, #1a5599 25%, #6b9fd4 52%, #c8e0f5 70%, #f0f7ff 84%, #ffffff 100%)' }}>
      <AlertCircle className="h-12 w-12 text-white/60 mb-4" />
      <p className="text-white font-bold text-xl">Link inválido ou expirado</p>
      <p className="text-white/70 text-sm mt-2">Este link não existe ou não está mais disponível.</p>
    </div>
  );

  if (stage === 'encerrado') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: 'linear-gradient(180deg, #003580 0%, #1a5599 25%, #6b9fd4 52%, #c8e0f5 70%, #f0f7ff 84%, #ffffff 100%)' }}>
      <CheckCircle2 className="h-12 w-12 text-green-400 mb-4" />
      <p className="text-white font-bold text-xl">Proposta em andamento</p>
      <p className="text-white/70 text-sm mt-2">Seus documentos foram recebidos e o processo está em andamento.<br />Em breve entraremos em contato.</p>
      <img src={logoUrl} alt="Ágil Seguros" className="h-12 mt-8 opacity-70 object-contain" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div
        className="relative"
        style={{ background: 'linear-gradient(180deg, #003580 0%, #1a5599 25%, #6b9fd4 52%, #c8e0f5 70%, #f0f7ff 84%, #ffffff 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,178,255,0.22) 0%, transparent 70%)' }} />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 sm:h-24">
            <img src={logoUrl} alt="Ágil Seguros" className="h-12 sm:h-20 w-auto object-contain" />
          </div>

          {stage === 'proposta' && (
            <div className="w-full max-w-2xl mx-auto pb-48 sm:pb-64">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 bg-white/15 rounded-xl w-14 h-14 flex items-center justify-center">
                  <SegIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-2 block">Proposta personalizada</span>
                  <p className="text-white font-semibold text-2xl sm:text-4xl leading-tight mb-1">
                    {SEGMENTO_LABEL[segmento] || segmento}
                  </p>
                  <p className="text-white/60 text-base mb-4">
                    Preparada para <strong className="text-white/80">{orcamento?.cliente_nome}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 bg-white/15 text-white/75 rounded-full font-medium text-sm">SUSEP 252166308</span>
                    {propostas.length > 0 && (
                      <span className="px-2.5 py-0.5 bg-white/15 text-white/75 rounded-full font-medium text-sm">
                        {propostas.length} opç{propostas.length > 1 ? 'ões' : 'ão'}
                        {propostas.find(p => p.destaque) ? ' · ⭐ recomendada' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {stage !== 'proposta' && <div className="pb-48 sm:pb-64" />}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-16">
        <AnimatePresence mode="wait">

          {/* Verificação CPF */}
          {stage === 'verificacao' && (
            <motion.div key="verificacao" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                <div className="px-6 pt-7 pb-0 flex items-center gap-3">
                  <ShieldCheck className="h-7 w-7 text-white shrink-0" />
                  <div>
                    <h1 className="text-white font-bold text-lg">Verificação de identidade</h1>
                    <p className="text-white/60 text-xs mt-0.5">Para sua segurança, confirme os 3 primeiros dígitos do seu CPF</p>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <p className="text-white/70 text-sm">Olá, <strong className="text-white">{orcamento?.cliente_nome}</strong>! Uma proposta foi preparada para você pela <strong className="text-white">Ágil Seguros</strong>.</p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80">Primeiros 3 dígitos do seu CPF</label>
                    <input type="tel" maxLength={3} value={cpfInput}
                      onChange={e => { setCpfInput(e.target.value.replace(/\D/g, '')); setCpfError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleVerificarCpf()}
                      placeholder="000"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-2xl text-center font-bold tracking-[1rem] text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20" />
                    {cpfError && <p className="text-xs text-red-300">{cpfError}</p>}
                  </div>
                  <button onClick={handleVerificarCpf} disabled={verificando || cpfInput.replace(/\D/g, '').length < 3}
                    className="w-full py-3 rounded-xl font-bold text-[#003580] bg-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity">
                    {verificando ? <Loader2 className="h-4 w-4 animate-spin text-[#003580]" /> : <ArrowRight className="h-4 w-4" />}
                    {verificando ? 'Verificando...' : 'Acessar proposta'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Proposta */}
          {stage === 'proposta' && (
            <motion.div key="proposta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-32">

              {/* Cenário Atual */}
              {cenarios.length > 0 && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-3">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Cenário Atual</span>
                    <p className="text-white/60 text-xs mt-0.5">O que você tem hoje</p>
                  </div>
                  <div className="px-6 pb-6 space-y-3">
                    {cenarios.map((c, i) => {
                      const segLogo = SEGURADORAS.find(s => s.nome === c.operadora)?.logo;
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/15">
                          <div className="flex items-center gap-3">
                            {segLogo
                              ? <img src={segLogo} alt={c.operadora} className="h-7 w-auto max-w-[80px] object-contain" />
                              : <Shield className="h-5 w-5 text-white/50" />}
                            <span className="text-sm font-medium text-white">{c.operadora || 'Plano atual'}</span>
                          </div>
                          {c.valor && (
                            <div className="text-right">
                              <p className="font-bold text-white text-sm">{fmtValor(c.valor)}</p>
                              <p className="text-[10px] text-white/50">/mês</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Propostas */}
              {propostas.length > 0 && (
                <div className="space-y-4">
                  {propostas.length > 1 && (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                      {propostas.length} opções disponíveis
                    </p>
                  )}
                  {propostas.map((p, i) => (
                    <PropostaCard key={i} proposta={p} isSaude={isSaude}
                      onEscolher={() => handleAceitarProposta(p)} aceitando={aceitando} />
                  ))}
                </div>
              )}

              {/* Backward compat: sem propostas array */}
              {propostas.length === 0 && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="p-6 space-y-5">
                    <div className="bg-white/10 rounded-2xl p-5 text-center border border-white/15">
                      <p className="text-xs text-white/50 uppercase tracking-wide">Mensalidade</p>
                      <p className="text-4xl font-bold text-white mt-1">{fmtValor(orcamento?.valor_mensalidade)}</p>
                      <p className="text-xs text-white/40 mt-1">por mês</p>
                    </div>
                    {orcamento?.descricao_orcamento && (
                      <div className="bg-white/10 rounded-xl p-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap border border-white/15">
                        {orcamento.descricao_orcamento}
                      </div>
                    )}
                    <button onClick={() => handleAceitarProposta(null)} disabled={aceitando}
                      className="w-full py-4 rounded-2xl font-bold text-[#003580] bg-white text-base flex items-center justify-center gap-2 disabled:opacity-60">
                      {aceitando ? <Loader2 className="h-5 w-5 animate-spin text-[#003580]" /> : <CheckCircle2 className="h-5 w-5" />}
                      {aceitando ? 'Processando...' : 'Seguir com a proposta'}
                    </button>
                  </div>
                </div>
              )}

              {/* Comparação de Custo */}
              {(() => {
                const bars = [
                  ...cenarios.filter(c => c.valor).map(c => ({
                    label: c.operadora || 'Atual', valor: parseValor(c.valor),
                    tipo: 'atual', logo: SEGURADORAS.find(s => s.nome === c.operadora)?.logo,
                  })),
                  ...propostas.filter(p => getPropostaValor(p) > 0).map(p => ({
                    label: p.operadora, valor: getPropostaValor(p),
                    tipo: 'proposta', destaque: p.destaque, logo: p.logo_url,
                  })),
                ];
                if (bars.length < 2) return null;
                const max = Math.max(...bars.map(b => b.valor), 1);
                return (
                  <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                    <div className="px-6 pt-6 pb-3">
                      <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Comparação de Custo</span>
                      <p className="text-white/60 text-[10px] mt-0.5">Mensalidade comparada entre planos</p>
                    </div>
                    <div className="px-6 pb-6 space-y-3">
                      {bars.map((b, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {b.logo
                                ? <img src={b.logo} alt={b.label} className="h-5 w-auto max-w-[60px] object-contain shrink-0" />
                                : <div className={`w-2 h-2 rounded-full shrink-0 ${b.tipo === 'atual' ? 'bg-amber-300' : 'bg-white'}`} />}
                              <span className="text-xs text-white/80 truncate">{b.label}</span>
                              {b.tipo === 'atual' && <span className="text-[10px] bg-amber-400/20 text-amber-200 rounded px-1.5 shrink-0">atual</span>}
                              {b.destaque && <span className="text-[10px] bg-white/15 text-white rounded px-1.5 shrink-0">⭐ rec.</span>}
                            </div>
                            <span className="text-xs font-bold text-white shrink-0 ml-2">{fmtValor(b.valor)}</span>
                          </div>
                          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(b.valor / max) * 100}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1 }}
                              className="h-full rounded-full"
                              style={{
                                background: b.tipo === 'atual'
                                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                  : b.destaque
                                    ? 'rgba(255,255,255,0.9)'
                                    : 'rgba(255,255,255,0.45)',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Comparação de Planos */}
              {propostas.length > 1 && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-3">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Comparação de Planos</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/10">
                          <th className="text-left px-4 py-2.5 text-white/60 font-medium">Operadora</th>
                          {isSaude && <th className="text-center px-3 py-2.5 text-white/60 font-medium">Abrangência</th>}
                          {isSaude && <th className="text-center px-3 py-2.5 text-white/60 font-medium">Acomodação</th>}
                          <th className="text-center px-3 py-2.5 text-white/60 font-medium">Coparticipação</th>
                          {isSaude && <th className="text-center px-3 py-2.5 text-white/60 font-medium">Carência</th>}
                          <th className="text-center px-3 py-2.5 text-white/60 font-medium">Recomendação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propostas.map((p, i) => (
                          <tr key={i} className={`border-b border-white/10 ${p.destaque ? 'bg-white/10' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {p.logo_url
                                  ? <img src={p.logo_url} alt={p.operadora} className="h-5 w-auto max-w-[60px] object-contain" />
                                  : <Shield className="h-3.5 w-3.5 text-white/40" />}
                                <span className="font-medium text-white">{p.operadora}</span>
                              </div>
                            </td>
                            {isSaude && <td className="px-3 py-3 text-center text-white/70">{p.abrangencia || '—'}</td>}
                            {isSaude && <td className="px-3 py-3 text-center text-white/70">{p.acomodacao || '—'}</td>}
                            <td className="px-3 py-3 text-center">
                              {p.coparticipacao?.tem
                                ? <span className="text-amber-300 font-medium">{p.coparticipacao.percentual ? `${p.coparticipacao.percentual}%` : 'Sim'}</span>
                                : <span className="text-green-300 font-medium">Não</span>}
                            </td>
                            {isSaude && (
                              <td className="px-3 py-3 text-center">
                                {p.carencia
                                  ? <span className="text-amber-300 font-medium">Sim</span>
                                  : <span className="text-green-300 font-medium">Não</span>}
                              </td>
                            )}
                            <td className="px-3 py-3 text-center">
                              {p.destaque
                                ? <span className="inline-flex items-center gap-1 bg-white/20 text-white rounded-full px-2 py-0.5 text-[10px] font-bold"><Star className="h-2.5 w-2.5 fill-current" /> Melhor</span>
                                : <span className="text-white/30">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pb-2" />
                </div>
              )}

              {/* Tabela Comparativa */}
              {propostas.length > 1 && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-3">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Tabela Comparativa</span>
                    <p className="text-white/60 text-[10px] mt-0.5">Valores por plano/faixa etária</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/10">
                          <th className="text-left px-4 py-2.5 text-white/60 font-medium w-32">
                            {isSaude ? 'Faixa / Plano' : 'Item'}
                          </th>
                          {propostas.map((p, i) => (
                            <th key={i} className="text-center px-3 py-2.5 font-medium text-white/60">
                              <div className="flex flex-col items-center gap-1">
                                {p.logo_url
                                  ? <img src={p.logo_url} alt={p.operadora} className="h-5 w-auto max-w-[60px] object-contain" />
                                  : <span className="text-white">{p.operadora}</span>}
                                {p.destaque && <span className="text-[9px] bg-white/20 text-white rounded px-1.5">⭐ rec.</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const maxPlanos = Math.max(...propostas.map(p => p.planos?.length || 0), 0);
                          if (maxPlanos === 0) return null;
                          return Array.from({ length: maxPlanos }, (_, pli) => (
                            <tr key={pli} className="border-b border-white/10">
                              <td className="px-4 py-2.5 text-white/70">
                                {propostas.find(p => p.planos?.[pli]?.nome)?.planos?.[pli]?.nome || `Plano ${pli + 1}`}
                              </td>
                              {propostas.map((p, i) => (
                                <td key={i} className={`px-3 py-2.5 text-center ${p.destaque ? 'bg-white/5' : ''}`}>
                                  {p.planos?.[pli]?.valor
                                    ? <span className="font-bold text-white">{fmtValor(p.planos[pli].valor)}</span>
                                    : <span className="text-white/30">—</span>}
                                </td>
                              ))}
                            </tr>
                          ));
                        })()}
                        {isSaude && propostas.some(p => p.abrangencia) && (
                          <tr className="border-b border-white/10 bg-white/5">
                            <td className="px-4 py-2.5 text-white/60 font-medium">Abrangência</td>
                            {propostas.map((p, i) => (
                              <td key={i} className={`px-3 py-2.5 text-center text-white/70 ${p.destaque ? 'bg-white/5' : ''}`}>{p.abrangencia || '—'}</td>
                            ))}
                          </tr>
                        )}
                        {isSaude && propostas.some(p => p.acomodacao) && (
                          <tr className="border-b border-white/10">
                            <td className="px-4 py-2.5 text-white/60 font-medium">Acomodação</td>
                            {propostas.map((p, i) => (
                              <td key={i} className={`px-3 py-2.5 text-center text-white/70 ${p.destaque ? 'bg-white/5' : ''}`}>{p.acomodacao || '—'}</td>
                            ))}
                          </tr>
                        )}
                        {propostas.some(p => p.coparticipacao) && (
                          <tr className="border-b border-white/10 bg-white/5">
                            <td className="px-4 py-2.5 text-white/60 font-medium">Copart.</td>
                            {propostas.map((p, i) => (
                              <td key={i} className={`px-3 py-2.5 text-center ${p.destaque ? 'bg-white/5' : ''}`}>
                                {p.coparticipacao?.tem
                                  ? <span className="text-amber-300 font-medium">{p.coparticipacao.percentual ? `${p.coparticipacao.percentual}%` : 'Sim'}</span>
                                  : <span className="text-green-300">Não</span>}
                              </td>
                            ))}
                          </tr>
                        )}
                        {isSaude && (
                          <tr className="border-b border-white/10">
                            <td className="px-4 py-2.5 text-white/60 font-medium">Carência</td>
                            {propostas.map((p, i) => (
                              <td key={i} className={`px-3 py-2.5 text-center ${p.destaque ? 'bg-white/5' : ''}`}>
                                {p.carencia
                                  ? <span className="text-amber-300">Sim</span>
                                  : <span className="text-green-300">Não</span>}
                              </td>
                            ))}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="pb-2" />
                </div>
              )}

              {/* Perfil de Vidas */}
              {isSaude && propostas.some(p => p.planos?.length > 1) && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Perfil de Vidas por Faixa Etária</p>
                  {propostas.filter(p => p.planos?.length > 0).map((p, i) => (
                    <div key={i} className="rounded-[24px] overflow-hidden" style={cardBg}>
                      <div className="px-5 py-4 flex items-center gap-3 border-b border-white/15">
                        {p.logo_url
                          ? <img src={p.logo_url} alt={p.operadora} className="h-6 w-auto max-w-[70px] object-contain" />
                          : <Shield className="h-4 w-4 text-white" />}
                        <p className="text-sm font-bold text-white">{p.operadora}</p>
                        {p.destaque && <span className="ml-auto text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">⭐ Melhor Opção</span>}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-white/10">
                              <th className="text-left px-4 py-2 text-white/60 font-medium">Faixa / Plano</th>
                              <th className="text-right px-4 py-2 text-white/60 font-medium">Mensalidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.planos.filter(pl => pl.nome || pl.valor).map((pl, pli) => (
                              <tr key={pli} className="border-b border-white/10">
                                <td className="px-4 py-2.5 text-white/80">{pl.nome || `Plano ${pli + 1}`}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-white">
                                  {pl.valor ? fmtValor(pl.valor) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Coparticipação */}
              {propostaDestaque?.coparticipacao?.tem && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-300 shrink-0" />
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">Coparticipação</span>
                  </div>
                  <div className="px-6 pb-6 space-y-3">
                    <p className="text-sm text-white/80">
                      Este plano possui coparticipação de{' '}
                      <strong className="text-amber-300">
                        {propostaDestaque.coparticipacao.percentual
                          ? `${propostaDestaque.coparticipacao.percentual}%`
                          : 'valor variável'}
                      </strong>{' '}
                      sobre os procedimentos utilizados.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/15">
                        <div className={`w-2 h-2 rounded-full ${propostaDestaque.coparticipacao.limitada ? 'bg-green-400' : 'bg-amber-400'}`} />
                        <span className="text-xs text-white/80">
                          {propostaDestaque.coparticipacao.limitada ? 'Coparticipação limitada' : 'Coparticipação ilimitada'}
                        </span>
                      </div>
                      {propostaDestaque.coparticipacao.limitada && (
                        <p className="text-xs text-white/60">O valor cobrado tem um teto mensal, protegendo contra gastos excessivos.</p>
                      )}
                    </div>
                    <p className="text-xs text-white/50">A coparticipação é cobrada apenas quando você utiliza o plano. Consultas, exames e procedimentos geram uma taxa proporcional ao serviço.</p>
                  </div>
                </div>
              )}

              {/* Diferenciais */}
              {diferenciais.length > 0 && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-2 flex items-center gap-3">
                    {propostaDestaque?.logo_url && (
                      <img src={propostaDestaque.logo_url} alt={propostaDestaque.operadora} className="h-6 w-auto max-w-[70px] object-contain brightness-0 invert" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Diferenciais</span>
                      <p className="text-white/60 text-[10px]">{propostaDestaque?.operadora}</p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 space-y-3">
                    {diferenciais.slice(0, expandedDifs ? undefined : 3).map((d, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/10 rounded-xl border border-white/15">
                        <div className="bg-white/20 rounded-lg p-1.5 shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{d.titulo}</p>
                          <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{d.descricao}</p>
                        </div>
                      </div>
                    ))}
                    {diferenciais.length > 3 && (
                      <button onClick={() => setExpandedDifs(v => !v)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-blue-300 font-medium hover:bg-white/10 rounded-xl transition-colors">
                        {expandedDifs
                          ? <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</>
                          : <><ChevronDown className="h-3.5 w-3.5" /> Ver mais {diferenciais.length - 3} diferenciais</>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Rede Credenciada */}
              {propostaDestaque?.rede_url && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-2">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Rede Credenciada</span>
                  </div>
                  <div className="px-6 pb-6">
                    <p className="text-xs text-white/60 mb-3">Consulte todos os hospitais, clínicas e laboratórios disponíveis na rede da {propostaDestaque.operadora}.</p>
                    <a href={propostaDestaque.rede_url} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 transition-colors group">
                      <div className="flex items-center gap-3">
                        {propostaDestaque.logo_url && (
                          <img src={propostaDestaque.logo_url} alt={propostaDestaque.operadora} className="h-6 w-auto max-w-[70px] object-contain" />
                        )}
                        <span className="text-sm text-white font-medium">{propostaDestaque.operadora}</span>
                      </div>
                      <span className="text-xs text-blue-300 flex items-center gap-1 font-medium">
                        Ver rede <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  </div>
                </div>
              )}

              {/* Outras redes */}
              {propostas.some((p, i) => i !== effectiveDestaqueIdx && p.rede_url) && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-2">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Rede Credenciada — Outras Opções</span>
                  </div>
                  <div className="px-6 pb-6 space-y-2">
                    {propostas.filter((p, i) => i !== effectiveDestaqueIdx && p.rede_url).map((p, i) => (
                      <a key={i} href={p.rede_url} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 transition-colors group">
                        <div className="flex items-center gap-3">
                          {p.logo_url && <img src={p.logo_url} alt={p.operadora} className="h-5 w-auto max-w-[60px] object-contain" />}
                          <span className="text-sm text-white">{p.operadora}</span>
                        </div>
                        <span className="text-xs text-blue-300 flex items-center gap-1">
                          Ver rede <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentos necessários */}
              {propostas.length > 0 && todosOsDocs.length > 0 && (
                <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                  <div className="px-6 pt-6 pb-2">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest block">Documentos necessários</span>
                  </div>
                  <div className="px-6 pb-6 space-y-1.5">
                    {todosOsDocs.map(doc => (
                      <div key={doc} className="flex items-center gap-2 text-sm text-white/80">
                        <FileText className="h-3.5 w-3.5 text-blue-300 shrink-0" />{doc}
                      </div>
                    ))}
                    <p className="text-xs text-white/40 mt-2">Você enviará estes documentos após escolher uma opção.</p>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
              <p className="text-center text-gray-300 text-xs">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
            </motion.div>
          )}

          {/* Upload de documentos */}
          {stage === 'documentos' && (
            <motion.div key="documentos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                <div className="px-6 pt-7 pb-0 flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-green-300 shrink-0" />
                  <div>
                    <h1 className="text-white font-bold text-lg">Proposta aceita! ✅</h1>
                    {propostaEscolhida && (
                      <p className="text-white/70 text-xs mt-0.5">
                        Opção escolhida: <strong className="text-white">{propostaEscolhida.operadora}</strong>
                        {getPropostaValor(propostaEscolhida) > 0 && ` — ${fmtValor(getPropostaValor(propostaEscolhida))}/mês`}
                      </p>
                    )}
                    <p className="text-white/60 text-xs mt-0.5">Envie seus documentos para prosseguirmos</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {todosOsDocs.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-3" />
                      <p className="text-white font-medium">Tudo certo!</p>
                      <p className="text-sm text-white/60 mt-1">Nossa equipe entrará em contato em breve.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-white/70">Envie cada documento abaixo. Formatos aceitos: PDF, JPG, PNG.</p>
                      <div className="space-y-3">
                        {todosOsDocs.map(tipo => {
                          const status = docStatus[tipo];
                          const jaEnviado = docsEnviados.includes(tipo) || status === 'done';
                          return <DocUploadItem key={tipo} tipo={tipo} jaEnviado={jaEnviado} status={status} onUpload={file => handleUploadDoc(tipo, file)} />;
                        })}
                      </div>
                      {todosEnviados && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-green-400/20 border border-green-400/30 rounded-2xl p-4 text-center mt-4">
                          <CheckCircle2 className="h-8 w-8 text-green-300 mx-auto mb-2" />
                          <p className="font-bold text-green-300">Todos os documentos enviados!</p>
                          <p className="text-sm text-white/70 mt-1">Nossa equipe irá analisar e entrar em contato. 🎉</p>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="text-center text-gray-300 text-xs">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating CTA */}
      {stage === 'proposta' && propostas.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl px-4 pt-3 pb-5">
            <div className="max-w-2xl mx-auto">
              {propostaDestaque && (
                <p className="text-xs text-gray-500 text-center mb-2">
                  Opção recomendada: <strong className="text-[#003580]">{propostaDestaque.operadora}</strong>
                  {getPropostaValor(propostaDestaque) > 0 && <> · <strong className="text-[#003580]">{fmtValor(getPropostaValor(propostaDestaque))}</strong>/mês</>}
                </p>
              )}
              <button onClick={() => handleAceitarProposta(propostaDestaque)} disabled={aceitando}
                className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 active:scale-[0.99] transition-transform"
                style={{ background: 'linear-gradient(135deg, #003580, #0B7EC4)' }}>
                {aceitando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {aceitando ? 'Processando...' : 'Aceitar proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PropostaCard = ({ proposta, isSaude, onEscolher, aceitando }) => {
  const [expanded, setExpanded] = useState(false);
  const primeiroValor = proposta.planos?.find(pl => pl.valor)?.valor;
  const temMultiplosPlanos = proposta.planos?.filter(pl => pl.nome || pl.valor).length > 1;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] overflow-hidden"
      style={{ background: 'linear-gradient(to top right, #6b9fd4, #2a6db5, #003580)' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/15">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2 bg-white/15 flex items-center justify-center">
            {proposta.logo_url
              ? <img src={proposta.logo_url} alt={proposta.operadora} className="h-8 w-auto max-w-[90px] object-contain" />
              : <Shield className="h-6 w-6 text-white" />}
          </div>
          <div>
            <p className="font-bold text-sm text-white">{proposta.operadora || 'Seguradora'}</p>
            {isSaude && proposta.abrangencia && (
              <p className="text-xs mt-0.5 text-white/60">{proposta.abrangencia} · {proposta.acomodacao || 'Sem acomodação'}</p>
            )}
          </div>
        </div>
        {proposta.destaque && (
          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
            <Star className="h-3 w-3 fill-current" /> Melhor Opção
          </span>
        )}
      </div>

      {/* Preço */}
      <div className="px-5 py-5 text-center border-b border-white/15">
        {primeiroValor ? (
          <>
            {temMultiplosPlanos && <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">a partir de</p>}
            {!temMultiplosPlanos && <p className="text-xs text-white/50 uppercase tracking-wide">Mensalidade</p>}
            <p className="font-bold mt-0.5 text-4xl text-white">{fmtValor(primeiroValor)}</p>
            <p className="text-xs text-white/50 mt-0.5">por mês</p>
          </>
        ) : (
          <p className="text-sm text-white/50 italic">Valores sob consulta</p>
        )}
      </div>

      {/* Faixas colapsável */}
      {temMultiplosPlanos && (
        <>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-b border-white/15">
                <div className="px-5 py-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide mb-2">Valores por faixa</p>
                  {proposta.planos.filter(pl => pl.nome || pl.valor).map((pl, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/10 last:border-0">
                      <span className="text-white/70">{pl.nome || `Plano ${i + 1}`}</span>
                      <span className="font-bold text-white">{pl.valor ? fmtValor(pl.valor) : '—'}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-blue-300 font-medium border-b border-white/15 hover:bg-white/10 transition-colors">
            {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Ocultar faixas</> : <><ChevronDown className="h-3.5 w-3.5" /> Ver todos os valores</>}
          </button>
        </>
      )}

      {/* Chips */}
      {isSaude && (
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-white/15">
          {proposta.abrangencia && (
            <span className="text-[11px] bg-white/15 text-white/80 rounded-full px-2.5 py-1">{proposta.abrangencia}</span>
          )}
          {proposta.acomodacao && (
            <span className="text-[11px] bg-white/15 text-white/80 rounded-full px-2.5 py-1">{proposta.acomodacao}</span>
          )}
          {proposta.coparticipacao?.tem ? (
            <span className="text-[11px] bg-amber-400/20 text-amber-200 rounded-full px-2.5 py-1">
              Copart. {proposta.coparticipacao.percentual ? `${proposta.coparticipacao.percentual}%` : 'sim'}
            </span>
          ) : (
            <span className="text-[11px] bg-green-400/20 text-green-200 rounded-full px-2.5 py-1">Sem coparticipação</span>
          )}
          {proposta.carencia !== undefined && (
            <span className={`text-[11px] rounded-full px-2.5 py-1 ${proposta.carencia ? 'bg-amber-400/20 text-amber-200' : 'bg-green-400/20 text-green-200'}`}>
              {proposta.carencia ? 'Com carência' : 'Sem carência'}
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="px-5 py-4">
        <button onClick={onEscolher} disabled={aceitando}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
            proposta.destaque
              ? 'bg-white text-[#003580] hover:bg-white/90 shadow-lg hover:scale-[1.01] active:scale-[0.99]'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}>
          {aceitando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {aceitando ? 'Processando...' : 'Quero este plano'}
        </button>
      </div>
    </motion.div>
  );
};

const DocUploadItem = ({ tipo, jaEnviado, status, onUpload }) => {
  const inputRef = useRef(null);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${jaEnviado ? 'bg-green-400/20 border-green-400/30' : 'bg-white/10 border-white/15'}`}>
      <div className={`p-2 rounded-lg shrink-0 ${jaEnviado ? 'bg-green-400/20' : 'bg-white/15'}`}>
        {jaEnviado ? <Check className="h-4 w-4 text-green-300" /> : <FileText className="h-4 w-4 text-white/70" />}
      </div>
      <span className={`text-sm flex-1 ${jaEnviado ? 'text-green-200 font-medium' : 'text-white/80'}`}>{tipo}</span>
      {!jaEnviado && (
        <>
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => onUpload(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={status === 'uploading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#003580] text-xs font-medium disabled:opacity-60 shrink-0">
            {status === 'uploading' ? <Loader2 className="h-3 w-3 animate-spin text-[#003580]" /> : <Upload className="h-3 w-3" />}
            {status === 'uploading' ? 'Enviando...' : status === 'error' ? 'Tentar novamente' : 'Enviar'}
          </button>
        </>
      )}
      {jaEnviado && <span className="text-xs text-green-300 shrink-0">Enviado ✓</span>}
    </div>
  );
};

export default OrcamentoPublicoPage;
