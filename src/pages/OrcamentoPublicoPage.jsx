import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Loader2, ShieldCheck, CheckCircle2, Upload, FileText,
  AlertCircle, ArrowRight, Check, Star, ChevronDown, ChevronUp,
  ExternalLink, Shield, Heart, Car, Home, Plane, PawPrint,
  Building2, Package, Laptop, Truck, HeartHandshake,
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

const PERFIL_LABEL = {
  AUTO: 'Perfil do Veículo', SAUDE: 'Perfil de Vidas', RESIDENCIAL: 'Perfil do Imóvel',
  EMPRESARIAL: 'Perfil da Empresa', ODONTOLOGICO: 'Perfil de Vidas', VIAGEM: 'Detalhes da Viagem',
  PET_SAUDE: 'Perfil do Pet', PET_SEGURO: 'Perfil do Pet', VIDA: 'Perfil do Segurado',
  FROTA: 'Perfil da Frota', CARGAS: 'Detalhes da Carga', EQUIPAMENTOS: 'Detalhes do Equipamento',
  SAUDE_VIDA_ODONTO: 'Perfil de Vidas', AUTO_FROTA: 'Perfil do Veículo / Frota',
};

const SAUDE_SEGS = ['SAUDE', 'ODONTOLOGICO', 'SAUDE_VIDA_ODONTO'];

const fmtValor = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

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
  const [aceitandoIdx, setAceitandoIdx] = useState(null);
  const [propostaEscolhida, setPropostaEscolhida] = useState(null);
  const [docStatus, setDocStatus] = useState({});
  const [docsEnviados, setDocsEnviados] = useState([]);
  const [expandedDifs, setExpandedDifs] = useState({});

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

  const handleAceitarProposta = async (proposta = null, idx = null) => {
    if (idx !== null) setAceitandoIdx(idx);
    setAceitando(true);
    try {
      const updateData = { status: 'DOCUMENTOS', data_documentos: new Date().toISOString() };
      if (proposta) {
        updateData.valor_mensalidade = Number(proposta.valor) || 0;
        updateData.descricao_orcamento = proposta.descricao || null;
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
      setAceitandoIdx(null);
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
  const propostaDestaque = propostas[destaqueIdx >= 0 ? destaqueIdx : 0];
  const outrasPropostas = propostas.filter((_, i) => i !== (destaqueIdx >= 0 ? destaqueIdx : 0));
  const segmento = orcamento?.segmento;
  const SegIcon = SEGMENTO_ICON[segmento] || Shield;

  /* ── Loading / Error screens ── */
  if (stage === 'loading') return (
    <div className="min-h-screen bg-soft-gradient flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );

  if (stage === 'erro') return (
    <div className="min-h-screen bg-soft-gradient flex flex-col items-center justify-center p-4 text-center">
      <AlertCircle className="h-12 w-12 text-white/60 mb-4" />
      <p className="text-white font-bold text-xl">Link inválido ou expirado</p>
      <p className="text-white/70 text-sm mt-2">Este link não existe ou não está mais disponível.</p>
    </div>
  );

  if (stage === 'encerrado') return (
    <div className="min-h-screen bg-soft-gradient flex flex-col items-center justify-center p-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-400 mb-4" />
      <p className="text-white font-bold text-xl">Proposta em andamento</p>
      <p className="text-white/70 text-sm mt-2">Seus documentos foram recebidos e o processo está em andamento.<br />Em breve entraremos em contato.</p>
      <img src={logoUrl} alt="Ágil Seguros" className="h-12 mt-8 opacity-70 object-contain" />
    </div>
  );

  return (
    <div className="min-h-screen bg-soft-gradient">
      <div className="flex justify-center pt-8 pb-4 px-4">
        <img src={logoUrl} alt="Ágil Seguros" className="h-14 w-auto object-contain" />
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">

          {/* ── Verificação CPF ── */}
          {stage === 'verificacao' && (
            <motion.div key="verificacao" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/95 rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-[#003580] px-6 py-5 flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-white shrink-0" />
                <div>
                  <h1 className="text-white font-bold text-lg">Verificação de identidade</h1>
                  <p className="text-white/70 text-xs mt-0.5">Para sua segurança, confirme os 3 primeiros dígitos do seu CPF</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-sm">Olá, <strong>{orcamento?.cliente_nome}</strong>! Uma proposta foi preparada para você pela <strong>Ágil Seguros</strong>.</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Primeiros 3 dígitos do seu CPF</label>
                  <input type="tel" maxLength={3} value={cpfInput}
                    onChange={e => { setCpfInput(e.target.value.replace(/\D/g, '')); setCpfError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerificarCpf()}
                    placeholder="000"
                    className="w-full rounded-xl border border-gray-200 bg-[#f0f7ff] px-4 py-3 text-2xl text-center font-bold tracking-[1rem] focus:outline-none focus:border-[#003580] focus:ring-2 focus:ring-[#003580]/20" />
                  {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
                </div>
                <button onClick={handleVerificarCpf} disabled={verificando || cpfInput.replace(/\D/g, '').length < 3}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                  style={{ background: '#003580' }}>
                  {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {verificando ? 'Verificando...' : 'Acessar proposta'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Proposta (novo layout completo) ── */}
          {stage === 'proposta' && (
            <motion.div key="proposta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* 1. Resumo da Proposta */}
              <div className="bg-white/95 rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#003580] to-[#0B7EC4] px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 rounded-2xl p-3 shrink-0">
                      <SegIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-widest font-medium">Proposta personalizada</p>
                      <h1 className="text-white font-bold text-xl mt-0.5">{SEGMENTO_LABEL[segmento] || segmento}</h1>
                      <p className="text-white/80 text-sm mt-0.5">Preparada para <strong>{orcamento?.cliente_nome}</strong></p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#003580]" />
                    <p className="text-xs text-gray-400">Ágil Seguros · SUSEP 252166308</p>
                  </div>
                  {propostas.length > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 font-medium">
                      {propostas.length} opç{propostas.length > 1 ? 'ões' : 'ão'}
                      {propostas.find(p => p.destaque) ? ' · ⭐ recomendada' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Cenário Atual */}
              {orcamento?.cenario_atual && (
                <div className="bg-white/95 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Cenário Atual</p>
                  </div>
                  <div className="px-5 py-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {orcamento.cenario_atual}
                  </div>
                </div>
              )}

              {/* 3. Melhor Proposta (destaque) */}
              {propostas.length > 0 && propostaDestaque && (
                <div>
                  {propostaDestaque.destaque && propostas.length > 1 && (
                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3 px-1">⭐ Melhor Opção</p>
                  )}
                  <PropostaCard
                    proposta={propostaDestaque}
                    destaque
                    onEscolher={() => handleAceitarProposta(propostaDestaque, 0)}
                    aceitando={aceitando && aceitandoIdx === 0}
                    expanded={expandedDifs[0]}
                    onToggleExpand={() => setExpandedDifs(e => ({ ...e, 0: !e[0] }))}
                  />
                </div>
              )}

              {/* 4. Outras Opções */}
              {outrasPropostas.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest px-1">Outras Opções</p>
                  {outrasPropostas.map((p, i) => {
                    const realIdx = i + 1;
                    return (
                      <PropostaCard key={i} proposta={p} destaque={false}
                        onEscolher={() => handleAceitarProposta(p, realIdx)}
                        aceitando={aceitando && aceitandoIdx === realIdx}
                        expanded={expandedDifs[realIdx]}
                        onToggleExpand={() => setExpandedDifs(e => ({ ...e, [realIdx]: !e[realIdx] }))}
                      />
                    );
                  })}
                </div>
              )}

              {/* Backward compat: sem propostas array */}
              {propostas.length === 0 && (
                <div className="bg-white/95 rounded-3xl shadow-xl overflow-hidden">
                  <div className="p-6 space-y-5">
                    <div className="bg-gradient-to-r from-[#003580]/5 to-[#0B7EC4]/5 rounded-2xl p-5 text-center border border-[#003580]/10">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Mensalidade</p>
                      <p className="text-4xl font-bold text-[#003580] mt-1">{fmtValor(orcamento?.valor_mensalidade)}</p>
                      <p className="text-xs text-gray-400 mt-1">por mês</p>
                    </div>
                    {orcamento?.descricao_orcamento && (
                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {orcamento.descricao_orcamento}
                      </div>
                    )}
                    {todosOsDocs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos necessários</p>
                        {todosOsDocs.map(doc => (
                          <div key={doc} className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="h-3.5 w-3.5 text-[#003580] shrink-0" />{doc}
                          </div>
                        ))}
                      </div>
                    )}
                    <div ref={bottomRef} className="pt-2 space-y-3">
                      <button onClick={() => handleAceitarProposta(null)} disabled={aceitando}
                        className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{ background: 'linear-gradient(135deg, #003580, #0B7EC4)' }}>
                        {aceitando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                        {aceitando ? 'Processando...' : 'Seguir com a proposta'}
                      </button>
                      <p className="text-xs text-gray-400 text-center">Ao confirmar, nossa equipe entrará em contato.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Tabela comparativa de custos */}
              {propostas.length > 1 && (
                <div className="bg-white/95 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-[#003580]">
                    <p className="text-xs font-bold text-white uppercase tracking-wide">Comparativo de Custo</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Seguradora</th>
                          <th className="text-center px-4 py-2 text-xs text-gray-500 font-medium">Mensalidade</th>
                          <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium hidden sm:table-cell">Principais diferenciais</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propostas.map((p, i) => (
                          <tr key={i} className={`border-b border-gray-50 ${p.destaque ? 'bg-blue-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {p.logo_url
                                  ? <img src={p.logo_url} alt={p.operadora} className="h-6 w-auto max-w-[70px] object-contain" />
                                  : <Shield className="h-4 w-4 text-gray-300" />}
                                <span className="font-medium text-gray-800 text-xs">{p.operadora}</span>
                                {p.destaque && <span className="text-[10px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">⭐ rec.</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-[#003580] text-sm">{fmtValor(p.valor)}</span>
                              <span className="text-[10px] text-gray-400 block">/mês</span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <p className="text-xs text-gray-500">{p.diferenciais?.slice(0, 2).join(' · ') || '—'}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. Perfil (dados coletados pelo parceiro) */}
              {orcamento?.observacoes && (
                <div className="bg-white/95 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{PERFIL_LABEL[segmento] || 'Dados Informados'}</p>
                  </div>
                  <div className="px-5 py-4">
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{orcamento.observacoes}</pre>
                  </div>
                </div>
              )}

              {/* 7. Redes credenciadas (saúde/odonto) */}
              {SAUDE_SEGS.includes(segmento) && propostas.some(p => p.rede_url) && (
                <div className="bg-white/95 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-green-50 border-b border-green-100">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Rede Credenciada</p>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {propostas.filter(p => p.rede_url).map((p, i) => (
                      <a key={i} href={p.rede_url} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#003580]/30 hover:bg-blue-50/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          {p.logo_url && <img src={p.logo_url} alt={p.operadora} className="h-5 w-auto max-w-[60px] object-contain" />}
                          <span className="text-sm text-gray-700 font-medium">{p.operadora}</span>
                        </div>
                        <span className="text-xs text-[#003580] flex items-center gap-1 group-hover:underline">
                          Ver rede <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. Documentos (se houver propostas) */}
              {propostas.length > 0 && todosOsDocs.length > 0 && (
                <div className="bg-white/95 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Documentos necessários</p>
                  </div>
                  <div className="px-5 py-4 space-y-1.5">
                    {todosOsDocs.map(doc => (
                      <div key={doc} className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-3.5 w-3.5 text-[#003580] shrink-0" />{doc}
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-2">Você enviará estes documentos após escolher uma opção.</p>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
              <p className="text-center text-white/40 text-xs">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
            </motion.div>
          )}

          {/* ── Upload de documentos ── */}
          {stage === 'documentos' && (
            <motion.div key="documentos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-white/95 rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-[#003580] px-6 py-5 flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-green-300 shrink-0" />
                  <div>
                    <h1 className="text-white font-bold text-lg">Proposta aceita! ✅</h1>
                    {propostaEscolhida && (
                      <p className="text-white/80 text-xs mt-0.5">
                        Opção escolhida: <strong>{propostaEscolhida.operadora}</strong> — {fmtValor(propostaEscolhida.valor)}/mês
                      </p>
                    )}
                    <p className="text-white/70 text-xs mt-0.5">Envie seus documentos para prosseguirmos</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {todosOsDocs.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Tudo certo!</p>
                      <p className="text-sm text-gray-400 mt-1">Nossa equipe entrará em contato em breve.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">Envie cada documento abaixo. Formatos aceitos: PDF, JPG, PNG.</p>
                      <div className="space-y-3">
                        {todosOsDocs.map(tipo => {
                          const status = docStatus[tipo];
                          const jaEnviado = docsEnviados.includes(tipo) || status === 'done';
                          return <DocUploadItem key={tipo} tipo={tipo} jaEnviado={jaEnviado} status={status} onUpload={file => handleUploadDoc(tipo, file)} />;
                        })}
                      </div>
                      {todosEnviados && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center mt-4">
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="font-bold text-green-700">Todos os documentos enviados!</p>
                          <p className="text-sm text-green-600 mt-1">Nossa equipe irá analisar e entrar em contato. 🎉</p>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="text-center text-white/40 text-xs">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Componente: Card de Proposta ── */
const PropostaCard = ({ proposta, destaque, onEscolher, aceitando, expanded, onToggleExpand }) => {
  const hasMore = (proposta.diferenciais?.length > 4) || (proposta.coberturas?.length > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white/95 rounded-3xl shadow-xl overflow-hidden ${destaque ? 'ring-2 ring-[#003580]/25' : ''}`}>

      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between ${destaque ? 'bg-gradient-to-r from-[#003580] to-[#0B7EC4]' : 'bg-gray-50 border-b border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${destaque ? 'bg-white/20' : 'bg-white border border-gray-200'}`}>
            {proposta.logo_url
              ? <img src={proposta.logo_url} alt={proposta.operadora} className="h-8 w-auto max-w-[90px] object-contain" />
              : <Shield className={`h-6 w-6 ${destaque ? 'text-white' : 'text-gray-400'}`} />}
          </div>
          <div>
            <p className={`font-bold text-sm ${destaque ? 'text-white' : 'text-gray-800'}`}>{proposta.operadora || 'Seguradora'}</p>
            {proposta.descricao && <p className={`text-xs mt-0.5 ${destaque ? 'text-white/70' : 'text-gray-500'}`}>{proposta.descricao}</p>}
          </div>
        </div>
        {destaque && proposta.destaque && (
          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
            <Star className="h-3 w-3 fill-current" /> Melhor Opção
          </span>
        )}
      </div>

      {/* Preço */}
      <div className={`px-5 py-5 text-center border-b border-gray-50 ${destaque ? '' : 'bg-white'}`}>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Mensalidade</p>
        <p className={`font-bold mt-1 ${destaque ? 'text-4xl text-[#003580]' : 'text-3xl text-gray-700'}`}>
          {fmtValor(proposta.valor)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">por mês</p>
      </div>

      {/* Diferenciais */}
      {proposta.diferenciais?.length > 0 && (
        <div className="px-5 py-4 space-y-2.5 border-b border-gray-50">
          {proposta.diferenciais.slice(0, expanded ? undefined : 4).map((d, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{d}</span>
            </div>
          ))}
        </div>
      )}

      {/* Coberturas (expanded) */}
      {expanded && proposta.coberturas?.length > 0 && (
        <div className="px-5 py-4 space-y-2 border-b border-gray-50 bg-blue-50/30">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">O que está coberto</p>
          <div className="grid grid-cols-2 gap-1.5">
            {proposta.coberturas.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                <ShieldCheck className="h-3.5 w-3.5 text-[#003580] shrink-0" />{c}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand toggle */}
      {hasMore && (
        <button onClick={onToggleExpand}
          className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-[#003580] font-medium border-b border-gray-50 hover:bg-gray-50 transition-colors">
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</> : <><ChevronDown className="h-3.5 w-3.5" /> Ver mais detalhes</>}
        </button>
      )}

      {/* CTA */}
      <div className="px-5 py-4">
        <button onClick={onEscolher} disabled={aceitando}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
            destaque
              ? 'text-white shadow-lg hover:scale-[1.01] active:scale-[0.99]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
          }`}
          style={destaque ? { background: 'linear-gradient(135deg, #003580, #0B7EC4)' } : {}}>
          {aceitando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {aceitando ? 'Processando...' : 'Quero este plano'}
        </button>
      </div>
    </motion.div>
  );
};

/* ── Componente: Upload de documento ── */
const DocUploadItem = ({ tipo, jaEnviado, status, onUpload }) => {
  const inputRef = useRef(null);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${jaEnviado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className={`p-2 rounded-lg shrink-0 ${jaEnviado ? 'bg-green-100' : 'bg-white border border-gray-200'}`}>
        {jaEnviado ? <Check className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-gray-400" />}
      </div>
      <span className={`text-sm flex-1 ${jaEnviado ? 'text-green-700 font-medium' : 'text-gray-700'}`}>{tipo}</span>
      {!jaEnviado && (
        <>
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => onUpload(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={status === 'uploading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003580] text-white text-xs font-medium disabled:opacity-60 shrink-0">
            {status === 'uploading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {status === 'uploading' ? 'Enviando...' : status === 'error' ? 'Tentar novamente' : 'Enviar'}
          </button>
        </>
      )}
      {jaEnviado && <span className="text-xs text-green-600 shrink-0">Enviado ✓</span>}
    </div>
  );
};

export default OrcamentoPublicoPage;
