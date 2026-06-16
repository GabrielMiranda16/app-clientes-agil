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

const parseBRL = (v) => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;
const fmtValor = (v) => {
  const n = typeof v === 'string' ? parseBRL(v) : Number(v || 0);
  if (isNaN(n)) return 'R$ 0,00';
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const parseValor = (v) => parseBRL(v);
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
  const [extraNome, setExtraNome] = useState('');
  const [extraKey, setExtraKey] = useState(0);
  const extraInputRef = useRef(null);

  const docTipo = orcamento?.cliente_cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF';

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

  useEffect(() => {
    if (stage !== 'proposta') return;
    let cleanup = null;
    const timer = setTimeout(() => {
      const container = document.querySelector('.right-col-sections');
      if (!container) return;
      const sections = Array.from(container.children);
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateX(0)';
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -100px 0px' });
      sections.forEach((sec, i) => {
        sec.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
        const rect = sec.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          sec.style.opacity = '1';
          sec.style.transform = 'translateX(0)';
        } else {
          sec.style.opacity = '0';
          sec.style.transform = 'translateX(24px)';
          observer.observe(sec);
        }
      });
      const allItems = Array.from(container.querySelectorAll('.reveal-item'));
      allItems.forEach((item) => {
        const parent = item.parentElement;
        const siblings = Array.from(parent.querySelectorAll(':scope > .reveal-item'));
        const idx = siblings.indexOf(item);
        item.style.transition = `opacity 0.4s ease ${idx * 0.13}s, transform 0.4s ease ${idx * 0.13}s`;
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          item.style.opacity = '1';
          item.style.transform = 'translateX(0)';
        } else {
          item.style.opacity = '0';
          item.style.transform = 'translateX(24px)';
          observer.observe(item);
        }
      });
      cleanup = () => observer.disconnect();
    }, 200);
    return () => { clearTimeout(timer); if (cleanup) cleanup(); };
  }, [stage]);

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
    if (digits.length < 3) { setCpfError(`Digite os 3 primeiros dígitos do seu ${docTipo}.`); return; }
    const primeiros3 = digits.slice(0, 3);
    setVerificando(true);
    setCpfError('');
    try {
      const cpfCadastrado = orcamento.cliente_cpf;
      if (cpfCadastrado && !cpfCadastrado.replace(/\D/g, '').startsWith(primeiros3)) {
        setCpfError(`${docTipo} incorreto. Verifique os primeiros 3 dígitos.`);
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
      console.error('Upload error:', err);
      setDocStatus(prev => ({ ...prev, [tipo]: 'error', [`${tipo}__err`]: err?.message || String(err) }));
    }
  };

  const todosOsDocs = (() => {
    const saved = [...(orcamento?.lista_documentos || []), ...(orcamento?.docs_extras || [])];
    if (saved.length > 0) return saved;
    const mod = orcamento?.modalidade;
    const seg = orcamento?.segmento;
    const base = DOCS_POR_MODALIDADE[seg]?.[mod] || DOCS_POR_MODALIDADE[seg]?.['INDIVIDUAL'] || [];
    const ds = ['PME', 'PJ'].includes(mod)
      ? ['Declaração de Saúde (DS) — beneficiários acima de 59 anos (preenchida pelo próprio beneficiário)']
      : [];
    return [...base, ...ds];
  })();
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
  const diferenciais = (segmento === 'ODONTOLOGICO' ? segData?.diferenciais_odonto : null) || segData?.diferenciais || [];

  const destaqueCombinarCom = propostaDestaque?.combinar_com || [];
  const destaqueValorProposta = (propostaDestaque?.planos || []).reduce((sum, pl) => sum + parseValor(pl.valor), 0);
  const destaqueValorCombinados = destaqueCombinarCom.reduce((sum, c) => sum + parseValor(c.valor), 0);
  const destaqueTotalComCombinados = destaqueValorProposta + destaqueValorCombinados;

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

  if (stage === 'documentos') return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #003580 0%, #1a5599 25%, #6b9fd4 52%, #c8e0f5 70%, #f0f7ff 84%, #ffffff 100%)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 sm:h-20">
          <img src={logoUrl} alt="Ágil Seguros" className="h-16 sm:h-20 w-auto object-contain" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-4">
          <div className="rounded-[24px] overflow-hidden" style={cardBg}>
            <div className="px-6 pt-7 pb-0 flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-green-300 shrink-0" />
              <div>
                <h1 className="text-white font-bold text-lg">Proposta aceita! ✅</h1>
                {(propostaEscolhida || orcamento?.operadora_escolhida) && (
                  <p className="text-white/70 text-xs mt-0.5">
                    Opção escolhida: <strong className="text-white">{propostaEscolhida?.operadora || orcamento?.operadora_escolhida}</strong>
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
                      const errMsg = docStatus[`${tipo}__err`];
                      return <DocUploadItem key={tipo} tipo={tipo} jaEnviado={jaEnviado} status={status} errMsg={errMsg} onUpload={file => handleUploadDoc(tipo, file)} />;
                    })}
                  </div>
                  <div className="pt-3 border-t border-white/15 space-y-2">
                    <p className="text-xs text-white/50 font-medium">Adicionar documento extra (opcional)</p>
                    <div className="flex gap-2">
                      <input
                        value={extraNome}
                        onChange={e => setExtraNome(e.target.value)}
                        placeholder="Nome do documento..."
                        className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                      />
                      <input
                        key={extraKey}
                        ref={extraInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0] && extraNome.trim()) {
                            handleUploadDoc(extraNome.trim(), e.target.files[0]);
                            setExtraNome('');
                            setExtraKey(k => k + 1);
                          }
                        }}
                      />
                      <button
                        onClick={() => extraNome.trim() && extraInputRef.current?.click()}
                        disabled={!extraNome.trim()}
                        className="px-3 py-2 rounded-lg bg-white/20 text-white text-sm font-medium disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                      >
                        <Upload className="h-4 w-4" /> Enviar
                      </button>
                    </div>
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
          <p className="text-center text-white/40 text-xs">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div
        className="relative min-h-[520px] sm:min-h-[640px]"
        style={{ background: 'linear-gradient(180deg, #003580 0%, #1a5599 25%, #6b9fd4 52%, #c8e0f5 70%, #f0f7ff 84%, #ffffff 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,178,255,0.22) 0%, transparent 70%)' }} />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 sm:h-24">
            <img src={logoUrl} alt="Ágil Seguros" className="h-20 sm:h-28 w-auto object-contain" />
          </div>

          {stage === 'proposta' && (
            <div className="w-full max-w-3xl mx-auto mt-24 sm:mt-24 text-center">
              <div className="flex items-center justify-center gap-6 pb-10 sm:pb-14">
                <div className="bg-white/15 rounded-2xl w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
                  <SegIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-xl sm:text-2xl uppercase tracking-widest">Proposta personalizada</p>
                  <p className="text-white font-bold text-4xl sm:text-6xl leading-tight">
                    {SEGMENTO_LABEL[segmento] || segmento}
                  </p>
                </div>
              </div>
              <p className="text-gray-900 font-bold text-4xl sm:text-5xl mt-32 pb-16 sm:pb-24">
                Preparada para <span className="text-[#003580]">{orcamento?.cliente_nome}</span>
              </p>
            </div>
          )}

          {stage === 'verificacao' && (
            <div className="w-full max-w-2xl mx-auto mt-52 sm:mt-60 pb-16">
              <div className="rounded-[24px] overflow-hidden" style={cardBg}>
                <div className="px-6 pt-7 pb-0 flex items-center gap-3">
                  <ShieldCheck className="h-7 w-7 text-white shrink-0" />
                  <div>
                    <h1 className="text-white font-bold text-lg">Verificação de identidade</h1>
                    <p className="text-white/60 text-xs mt-0.5">Para sua segurança, confirme os 3 primeiros dígitos do seu {docTipo}</p>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <p className="text-white/70 text-sm">Olá, <strong className="text-white">{orcamento?.cliente_nome}</strong>! Uma proposta foi preparada para você pela <strong className="text-white">Ágil Seguros</strong>.</p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80">Primeiros 3 dígitos do seu {docTipo}</label>
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
            </div>
          )}

          {stage !== 'proposta' && stage !== 'verificacao' && <div className="pb-48 sm:pb-64" />}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <AnimatePresence mode="wait">

          {/* Proposta — big card layout */}
          {stage === 'proposta' && (
            <motion.div key="proposta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full pb-32 lg:pb-8">

              {/* ONE big card */}
              <div className="rounded-[24px]" style={{ ...cardBg, overflow: 'clip' }}>
                <div className={`grid grid-cols-1 ${propostas.length > 0 && propostaDestaque ? 'lg:grid-cols-[440px_1fr]' : ''}`}>

                  {/* Left sticky panel — desktop only */}
                  {propostas.length > 0 && propostaDestaque && (
                    <div className="hidden lg:block border-r border-white/15 p-10">
                      <div className="sticky top-8">
                        <p className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-6">Opção recomendada</p>
                        <div className="flex items-center gap-4 mb-8">
                          {propostaDestaque.logo_url && (
                            <div className="bg-white/15 rounded-xl px-3 py-2.5 inline-flex items-center justify-center shrink-0">
                              <img src={propostaDestaque.logo_url} alt={propostaDestaque.operadora} className="h-11 w-28 object-contain" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-lg leading-tight truncate">{propostaDestaque.operadora}</p>
                            {getPropostaValor(propostaDestaque) > 0 && (
                              <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                                <p className="text-xl font-bold text-white whitespace-nowrap">{fmtValor(getPropostaValor(propostaDestaque))}</p>
                                <p className="text-sm text-white/50 whitespace-nowrap">/mês</p>
                              </div>
                            )}
                            {destaqueCombinarCom.length > 0 && (
                              <div className="mt-2.5 pt-2.5 border-t border-white/15 space-y-1.5">
                                {destaqueCombinarCom.map((c, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                                    <span className="text-white/60 truncate">+ {c.operadora} <span className="text-white/40">(mantida)</span></span>
                                    <span className="text-white/80 font-semibold whitespace-nowrap shrink-0">{fmtValor(parseValor(c.valor))}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between text-sm font-bold pt-1.5 border-t border-white/20 mt-1 gap-2">
                                  <span className="text-white/80">Total/mês</span>
                                  <span className="text-white whitespace-nowrap shrink-0">{fmtValor(destaqueTotalComCombinados)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAceitarProposta(propostaDestaque)}
                          disabled={aceitando}
                          className="w-full py-4 rounded-2xl font-bold text-[#003580] bg-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 active:scale-[0.99] transition-all hover:bg-blue-50 hover:shadow-xl hover:scale-[1.02]"
                        >
                          {aceitando ? <Loader2 className="h-5 w-5 animate-spin text-[#003580]" /> : <CheckCircle2 className="h-5 w-5" />}
                          {aceitando ? 'Processando...' : 'Aceitar proposta'}
                        </button>

                        {propostas.filter(p => !p.destaque).length > 0 && (
                          <>
                            <div className="border-t border-white/15 mt-8 pt-8">
                              <p className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-4">Outras opções</p>
                              <div className="flex flex-col gap-3">
                                {propostas.filter(p => !p.destaque).map((p, i) => {
                                  const pCombinarCom = p.combinar_com || [];
                                  const pValorProposta = (p.planos || []).reduce((sum, pl) => sum + parseValor(pl.valor), 0);
                                  const pValorCombinados = pCombinarCom.reduce((sum, c) => sum + parseValor(c.valor), 0);
                                  const pTotalComCombinados = pValorProposta + pValorCombinados;
                                  return (
                                    <div key={i} className="bg-white/10 rounded-xl px-4 py-3 flex flex-col gap-2">
                                      <div className="flex items-center justify-between gap-3">
                                        {p.logo_url
                                          ? <div className="bg-white/15 rounded-lg px-2 py-1.5 inline-flex items-center justify-center">
                                              <img src={p.logo_url} alt={p.operadora} className="h-8 w-24 object-contain" />
                                            </div>
                                          : <p className="text-white font-semibold text-sm leading-tight">{p.operadora}</p>
                                        }
                                        <button
                                          onClick={() => handleAceitarProposta(p)}
                                          disabled={aceitando}
                                          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-[#003580] bg-white/90 hover:bg-white hover:scale-[1.03] transition-all disabled:opacity-50"
                                        >
                                          Escolher
                                        </button>
                                      </div>
                                      <div>
                                        {p.logo_url && <p className="text-white font-semibold text-sm leading-tight truncate mb-0.5">{p.operadora}</p>}
                                        {getPropostaValor(p) > 0 && (
                                          <div className="flex items-baseline gap-1">
                                            <p className="text-white/70 text-xs font-bold">{fmtValor(getPropostaValor(p))}</p>
                                            <p className="text-white/40 text-xs">/mês</p>
                                          </div>
                                        )}
                                        {pCombinarCom.length > 0 && (
                                          <div className="mt-1.5 pt-1.5 border-t border-white/15 space-y-1">
                                            {pCombinarCom.map((c, ci) => (
                                              <div key={ci} className="flex items-center justify-between text-xs">
                                                <span className="text-white/50">+ {c.operadora} <span className="text-white/35">(mantida)</span></span>
                                                <span className="text-white/70 font-semibold shrink-0 ml-1">{fmtValor(parseValor(c.valor))}</span>
                                              </div>
                                            ))}
                                            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-white/20">
                                              <span className="text-white/60">Total/mês</span>
                                              <span className="text-white/90">{fmtValor(pTotalComCombinados)}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Right column — all sections */}
                  <div className="divide-y divide-white/15 right-col-sections">

                    {/* Cenário Atual */}
                    {cenarios.length > 0 && (
                      <div className="px-6 sm:px-8 py-6">
                        <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block">Cenário Atual</span>
                        <p className="text-white/60 text-sm mt-1 mb-5">O que você tem hoje</p>
                        <div className="space-y-3">
                          {cenarios.map((c, i) => {
                            const segLogo = SEGURADORAS.find(s => s.nome === c.operadora)?.logo;
                            return (
                              <div key={i} className="flex items-center justify-between p-4 bg-white/10 rounded-xl border border-white/15 reveal-item">
                                <div className="flex items-center gap-4">
                                  {segLogo
                                    ? <div className="bg-white/15 rounded-xl px-3 py-2 inline-flex items-center justify-center shrink-0"><img src={segLogo} alt={c.operadora} className="h-11 w-28 object-contain" /></div>
                                    : <Shield className="h-6 w-6 text-white/50" />}
                                  <div>
                                    <span className="text-base font-medium text-white block">{c.operadora || 'Plano atual'}</span>
                                    {(() => { const tv = c.vidas && typeof c.vidas === 'object' ? Object.values(c.vidas).reduce((s,v)=>s+parseInt(v||0),0) : parseInt(c.vidas||0); return tv > 0 && <span className="text-xs text-white/50">{tv} vidas</span>; })()}
                                  </div>
                                </div>
                                {c.valor && (
                                  <div className="text-right">
                                    <p className="font-bold text-white text-base">{fmtValor(c.valor)}</p>
                                    <p className="text-xs text-white/50">/mês</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {cenarios.length > 1 && cenarios.some(c => c.valor) && (() => {
                            const total = cenarios.reduce((acc, c) => acc + (parseFloat(String(c.valor || '0').replace(',', '.')) || 0), 0);
                            return (
                              <div className="flex items-center justify-between px-4 py-4 bg-white/5 rounded-xl border border-white/10 reveal-item">
                                <span className="text-base font-bold text-white">Total atual</span>
                                <div className="text-right">
                                  <p className="font-black text-white text-2xl">{fmtValor(total)}</p>
                                  <p className="text-xs text-white/50">/mês</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Propostas */}
                    {propostas.length > 0 && (
                      <div className="px-6 sm:px-8 py-6">
                        {propostas.length > 1 && (
                          <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-5">
                            {propostas.length} opções disponíveis
                          </p>
                        )}
                        <div className={segmento === 'AUTO' && propostas.length > 1
                          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 items-start'
                          : 'space-y-4'}>
                          {[...propostas].sort((a, b) => {
                            if (a.destaque && !b.destaque) return -1;
                            if (!a.destaque && b.destaque) return 1;
                            return getPropostaValor(a) - getPropostaValor(b);
                          }).map((p, i) => (
                            <PropostaCard key={i} proposta={p} isSaude={isSaude} isAuto={segmento === 'AUTO'} cenarios={cenarios}
                              onEscolher={() => handleAceitarProposta(p)} aceitando={aceitando} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Backward compat: sem propostas array */}
                    {propostas.length === 0 && (
                      <div className="px-6 sm:px-8 py-6 space-y-5">
                        <div className="bg-white/10 rounded-2xl p-6 text-center border border-white/15">
                          <p className="text-sm text-white/50 uppercase tracking-wide">Valor total do seguro</p>
                          <p className="text-5xl font-bold text-white mt-1">{fmtValor(orcamento?.valor_mensalidade)}</p>
                        </div>
                        {orcamento?.descricao_orcamento && (
                          <div className="bg-white/10 rounded-xl p-5 text-base text-white/80 leading-relaxed whitespace-pre-wrap border border-white/15">
                            {orcamento.descricao_orcamento}
                          </div>
                        )}
                        <button onClick={() => handleAceitarProposta(null)} disabled={aceitando}
                          className="w-full py-4 rounded-2xl font-bold text-[#003580] bg-white text-base flex items-center justify-center gap-2 disabled:opacity-60">
                          {aceitando ? <Loader2 className="h-5 w-5 animate-spin text-[#003580]" /> : <CheckCircle2 className="h-5 w-5" />}
                          {aceitando ? 'Processando...' : 'Seguir com a proposta'}
                        </button>
                      </div>
                    )}

                    {/* Comparação de Custo */}
                    {(() => {
                      const totalAtualValor = cenarios.reduce((sum, c) => sum + parseValor(c.valor), 0);
                      const proposalBars = propostas
                        .filter(p => getPropostaValor(p) > 0)
                        .map(p => {
                          const cc = p.combinar_com || [];
                          const totalValor = getPropostaValor(p) + cc.reduce((sum, c) => sum + parseValor(c.valor), 0);
                          const economia = totalAtualValor > 0 ? totalAtualValor - totalValor : 0;
                          const economiaPct = totalAtualValor > 0 && economia > 0 ? (economia / totalAtualValor) * 100 : 0;
                          return { mainLabel: p.operadora, valor: totalValor, tipo: 'proposta', destaque: p.destaque, logo: p.logo_url, combinarCom: cc, economia, economiaPct };
                        })
                        .sort((a, b) => a.valor - b.valor);
                      const bars = [
                        ...(totalAtualValor > 0 ? [{
                          mainLabel: cenarios.length === 1 ? (cenarios[0].operadora || 'Plano Atual') : 'Total Atual',
                          subLabel: cenarios.length > 1 ? cenarios.map(c => c.operadora).filter(Boolean).join(' + ') : null,
                          valor: totalAtualValor, tipo: 'atual', combinarCom: [],
                          logo: cenarios.length === 1 ? SEGURADORAS.find(s => s.nome === cenarios[0].operadora)?.logo : null,
                          economia: 0, economiaPct: 0,
                        }] : []),
                        ...proposalBars,
                      ];
                      if (bars.length < 2) return null;
                      const max = Math.max(...bars.filter(b => b.tipo !== 'atual').map(b => b.valor), 1);
                      return (
                        <div className="px-6 sm:px-8 py-6">
                          <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block">Comparação de Custo</span>
                          <p className="text-white/60 text-sm mt-1 mb-5">Mensalidade total comparada</p>
                          <div className="space-y-5">
                            {bars.map((b, i) => (
                              <div key={i} className="reveal-item">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {b.logo
                                      ? <div className="bg-white/15 rounded-lg px-2 py-1.5 inline-flex items-center justify-center shrink-0"><img src={b.logo} alt={b.mainLabel} className="h-8 w-20 object-contain" /></div>
                                      : <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.destaque ? 'bg-yellow-300' : 'bg-white/60'}`} />}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-medium truncate ${b.tipo === 'atual' ? 'text-base text-white' : 'text-sm text-white/90'}`}>{b.mainLabel}</span>
                                        {b.tipo === 'atual' && <span className="text-xs bg-white/15 text-white/60 rounded px-2 py-0.5 shrink-0">atual</span>}
                                        {b.destaque && <span className="text-xs bg-yellow-400/25 text-yellow-200 rounded px-2 py-0.5 shrink-0">⭐ rec.</span>}
                                      </div>
                                      {b.subLabel && <p className="text-xs text-white/45 mt-0.5 truncate">{b.subLabel}</p>}
                                      {b.combinarCom?.length > 0 && (
                                        <p className="text-xs text-white/45 mt-0.5 truncate">+ {b.combinarCom.map(c => c.operadora).join(' + ')} (mantida)</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`font-bold text-white whitespace-nowrap ${b.tipo === 'atual' ? 'text-lg' : 'text-sm'}`}>{fmtValor(b.valor)}</span>
                                    {b.economiaPct > 0 && (
                                      <span className="text-xs font-bold text-green-300 whitespace-nowrap">-{Math.round(b.economiaPct)}%</span>
                                    )}
                                  </div>
                                </div>
                                {b.tipo === 'atual' && i < bars.length - 1 && (
                                  <div className="border-t border-white/15 mt-3" />
                                )}
                                {b.tipo !== 'atual' && (
                                  <div className="h-5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(b.valor / max) * 100}%` }}
                                      transition={{ duration: 0.7, delay: i * 0.12 }}
                                      className="h-full rounded-full flex items-center px-4 overflow-hidden"
                                      style={{
                                        background: b.destaque
                                          ? 'linear-gradient(90deg, #facc15, #eab308)'
                                          : 'rgba(255,255,255,1)',
                                      }}
                                    >
                                      {b.economia > 0 && (
                                        <span className="text-xs font-bold whitespace-nowrap" style={{ color: '#003580' }}>
                                          Economiza {fmtValor(b.economia)}/mês
                                        </span>
                                      )}
                                    </motion.div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Comparação de Planos / Coberturas */}
                    {propostas.length > 1 && (
                      <div className="px-6 sm:px-8 py-6">
                        <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block mb-4">
                          {segmento === 'AUTO' ? 'Comparação de Coberturas' : 'Comparação de Planos'}
                        </span>
                        <div className="flex flex-col gap-3">
                          {propostas.map((p, i) => (
                            <div key={i} className={`rounded-2xl border overflow-hidden reveal-item ${p.destaque ? 'border-white/30 bg-white/10' : 'border-white/15 bg-white/5'}`}>
                              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                                {p.logo_url
                                  ? <div className="bg-white/15 rounded-lg px-2 py-1.5 inline-flex items-center justify-center shrink-0"><img src={p.logo_url} alt={p.operadora} className="h-9 w-24 object-contain" /></div>
                                  : <Shield className="h-5 w-5 text-white/40" />}
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-white block truncate">{p.operadora}</span>
                                  {segmento === 'AUTO' && p.cobertura_tipo && (
                                    <span className="text-sm text-white/70 block">Cobertura {p.cobertura_tipo}</span>
                                  )}
                                  {segmento !== 'AUTO' && p.planos?.length === 1 && p.planos[0].nome && (
                                    <span className="text-sm text-white font-medium truncate block">Plano: {p.planos[0].nome}</span>
                                  )}
                                  {segmento !== 'AUTO' && p.planos?.length > 1 && (
                                    <span className="text-sm text-white font-medium block">{p.planos.length} faixas etárias</span>
                                  )}
                                </div>
                                {p.destaque && (
                                  <span className="inline-flex items-center gap-1 bg-white/20 text-white rounded-full px-3 py-1 text-xs font-bold shrink-0">
                                    <Star className="h-3 w-3 fill-current" /> Melhor opção
                                  </span>
                                )}
                              </div>
                              <div className="divide-y divide-white/10">
                                {segmento === 'AUTO' ? (
                                  <>
                                    {p.franquia && (
                                      <div className="flex items-center justify-between px-5 py-3">
                                        <span className="text-sm text-white/60">Franquia</span>
                                        <span className="text-sm font-medium text-white">R$ {p.franquia}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between px-5 py-3">
                                      <span className="text-sm text-white/60">Assistência 24h</span>
                                      {p.assistencia_24h ? <span className="text-sm font-medium text-green-300">✓ Incluso</span> : <span className="text-sm font-medium text-white/40">Não incluso</span>}
                                    </div>
                                    <div className="flex items-center justify-between px-5 py-3">
                                      <span className="text-sm text-white/60">Carro reserva</span>
                                      {p.carro_reserva
                                        ? <span className="text-sm font-medium text-green-300">✓ {p.carro_reserva_dias ? `${p.carro_reserva_dias} dias` : 'Incluso'}</span>
                                        : <span className="text-sm font-medium text-white/40">Não incluso</span>}
                                    </div>
                                    <div className="flex items-center justify-between px-5 py-3">
                                      <span className="text-sm text-white/60">Cobertura terceiros</span>
                                      {p.cobre_terceiros ? <span className="text-sm font-medium text-green-300">✓ Incluso</span> : <span className="text-sm font-medium text-white/40">Não incluso</span>}
                                    </div>
                                    <div className="flex items-center justify-between px-5 py-3">
                                      <span className="text-sm text-white/60">Cobertura vidros</span>
                                      {p.cobre_vidros ? <span className="text-sm font-medium text-green-300">✓ Incluso</span> : <span className="text-sm font-medium text-white/40">Não incluso</span>}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {isSaude && (
                                      <div className="flex items-center justify-between px-5 py-3">
                                        <span className="text-sm text-white/60">Abrangência</span>
                                        <span className="text-sm font-medium text-white">{p.abrangencia || '—'}</span>
                                      </div>
                                    )}
                                    {isSaude && (
                                      <div className="flex items-center justify-between px-5 py-3">
                                        <span className="text-sm text-white/60">Acomodação</span>
                                        <span className="text-sm font-medium text-white">{p.acomodacao || '—'}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between px-5 py-3">
                                      <span className="text-sm text-white/60">Coparticipação</span>
                                      {p.coparticipacao?.tem
                                        ? <span className="text-sm font-medium text-amber-300">{p.coparticipacao.percentual ? `${p.coparticipacao.percentual}%` : 'Sim'}</span>
                                        : <span className="text-sm font-medium text-green-300">Não</span>}
                                    </div>
                                    {isSaude && (
                                      <div className="flex items-center justify-between px-5 py-3">
                                        <span className="text-sm text-white/60">Carência</span>
                                        {p.carencia
                                          ? <span className="text-sm font-medium text-amber-300">Sim</span>
                                          : <span className="text-sm font-medium text-green-300">Não</span>}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tabela de Perfil */}
                    {orcamento?.perfil_vidas?.length > 0 && (() => {
                      const perfil = orcamento.perfil_vidas;
                      const cenariosComDist = cenarios.filter(c => c.vidas && typeof c.vidas === 'object' && Object.keys(c.vidas).length > 0);
                      const tabelaTotal = (
                        <div className="rounded-2xl overflow-hidden bg-white/10 border border-white/15">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-white/5">
                                <th className="text-left px-5 py-3 text-white/50 font-medium">Faixa Etária</th>
                                <th className="text-right px-5 py-3 text-white/50 font-medium">Nº de Vidas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {perfil.map((f, i) => (
                                <tr key={i} className="border-t border-white/10 reveal-item">
                                  <td className="px-5 py-3 text-white/80">{f.label}</td>
                                  <td className="px-5 py-3 text-right font-bold text-white">{f.vidas}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-white/20 bg-white/5">
                                <td className="px-5 py-3 font-bold text-white">Total</td>
                                <td className="px-5 py-3 text-right font-black text-white">{perfil.reduce((s, f) => s + f.vidas, 0)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                      return (
                        <div className="px-6 sm:px-8 py-6">
                          <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block">Tabela de Perfil</span>
                          <p className="text-white/60 text-sm mt-1 mb-5">Composição por faixa etária</p>
                          {cenariosComDist.length > 1 ? (
                            <div className="space-y-5">
                              {cenariosComDist.map((c, ci) => {
                                const totalC = Object.values(c.vidas).reduce((s, v) => s + parseInt(v || 0), 0);
                                const logo = SEGURADORAS.find(s => s.nome === c.operadora)?.logo;
                                return (
                                  <div key={ci}>
                                    <div className="flex items-center gap-3 mb-2">
                                      {logo
                                        ? <div className="bg-white/15 rounded-xl px-3 py-2 inline-flex items-center justify-center shrink-0"><img src={logo} alt={c.operadora} className="h-10 w-24 object-contain" /></div>
                                        : <p className="text-sm font-semibold text-white/80">{c.operadora || `Cenário ${ci + 1}`}</p>}
                                      {logo && <p className="text-sm font-semibold text-white/80">{c.operadora}</p>}
                                    </div>
                                    <div className="rounded-2xl overflow-hidden bg-white/10 border border-white/15">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="bg-white/5">
                                            <th className="text-left px-5 py-3 text-white/50 font-medium">Faixa Etária</th>
                                            <th className="text-right px-5 py-3 text-white/50 font-medium">Nº de Vidas</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {perfil.map(({ id, label }) => {
                                            const val = parseInt((c.vidas || {})[id] || 0);
                                            if (val === 0) return null;
                                            return (
                                              <tr key={id} className="border-t border-white/10 reveal-item">
                                                <td className="px-5 py-3 text-white/80">{label}</td>
                                                <td className="px-5 py-3 text-right font-bold text-white">{val}</td>
                                              </tr>
                                            );
                                          })}
                                          <tr className="border-t border-white/20 bg-white/5">
                                            <td className="px-5 py-3 font-bold text-white">Total</td>
                                            <td className="px-5 py-3 text-right font-black text-white">{totalC}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })}
                              <div>
                                <p className="text-base font-bold text-white mb-2">Total combinado</p>
                                {tabelaTotal}
                              </div>
                            </div>
                          ) : tabelaTotal}
                        </div>
                      );
                    })()}

                    {/* Coparticipação */}
                    {propostaDestaque?.coparticipacao?.tem && (
                      <div className="px-6 sm:px-8 py-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Info className="h-5 w-5 text-amber-300 shrink-0" />
                          <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest">Coparticipação</span>
                        </div>
                        <div className="space-y-4">
                          <p className="text-base text-white/80">
                            Este plano possui coparticipação de{' '}
                            <strong className="text-amber-300">
                              {propostaDestaque.coparticipacao.percentual
                                ? `${propostaDestaque.coparticipacao.percentual}%`
                                : 'valor variável'}
                            </strong>{' '}
                            sobre os procedimentos utilizados.
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 border border-white/15">
                              <div className={`w-2.5 h-2.5 rounded-full ${propostaDestaque.coparticipacao.limitada ? 'bg-green-400' : 'bg-amber-400'}`} />
                              <span className="text-sm text-white/80">
                                {propostaDestaque.coparticipacao.limitada ? 'Coparticipação limitada' : 'Coparticipação ilimitada'}
                              </span>
                            </div>
                            {propostaDestaque.coparticipacao.limitada && (
                              <p className="text-sm text-white/60">O valor cobrado tem um teto mensal, protegendo contra gastos excessivos.</p>
                            )}
                          </div>
                          <p className="text-sm text-white/50">A coparticipação é cobrada apenas quando você utiliza o plano. Consultas, exames e procedimentos geram uma taxa proporcional ao serviço.</p>
                        </div>
                      </div>
                    )}

                    {/* Detalhes da Cobertura — AUTO (removido: tabela agora está em cada card) */}
                    {false && segmento === 'AUTO' && propostaDestaque && (
                      <div className="px-6 sm:px-8 py-6">
                        <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block mb-4">O que está incluído</span>
                        <div className="rounded-2xl overflow-hidden bg-white/10 border border-white/15">
                          {propostaDestaque.cobertura_tipo && (
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                              <span className="text-sm text-white/70">Tipo de cobertura</span>
                              <span className="text-sm font-semibold text-white">{propostaDestaque.cobertura_tipo}</span>
                            </div>
                          )}
                          {propostaDestaque.lmi_percentual && (
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                              <span className="text-sm text-white/70">LMI</span>
                              <span className="text-sm font-semibold text-white">{propostaDestaque.lmi_percentual}%</span>
                            </div>
                          )}
                          {(propostaDestaque.franquia_percentual || propostaDestaque.franquia_valor || propostaDestaque.franquia) && (
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                              <span className="text-sm text-white/70">Franquia</span>
                              <span className="text-sm font-semibold text-white">
                                {propostaDestaque.franquia_percentual ? `${propostaDestaque.franquia_percentual} — ` : ''}
                                R$ {propostaDestaque.franquia_valor || propostaDestaque.franquia}
                              </span>
                            </div>
                          )}
                          {/* Serviços sempre exibidos */}
                          {[
                            { key: 'assistencia_24h', label: 'Assistência 24h' },
                            { key: 'assistencias',    label: 'Assistências' },
                            { key: 'carro_reserva',   label: 'Carro reserva', extra: propostaDestaque.carro_reserva_dias ? ` (${propostaDestaque.carro_reserva_dias} dias)` : '' },
                            { key: 'rastreador',      label: 'Rastreador incluso' },
                          ].map(({ key, label, extra = '' }) => (
                            <div key={key} className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                              <span className="text-sm text-white/70">{label}</span>
                              {propostaDestaque[key]
                                ? <span className="text-sm font-semibold text-green-300">✓ Incluso{extra}</span>
                                : <span className="text-sm text-white/30">Não incluso</span>}
                            </div>
                          ))}
                          {/* Coberturas adicionais — só mostra as que têm valor ou estão ativas */}
                          {[
                            { key: 'rcfv_materiais',  valKey: 'rcfv_materiais_valor',  label: 'RCF-V Danos materiais' },
                            { key: 'rcfv_corporais',  valKey: 'rcfv_corporais_valor',  label: 'RCF-V Danos corporais' },
                            { key: 'danos_morais',    valKey: 'danos_morais_valor',    label: 'Danos morais e estéticos' },
                            { key: 'custos_defesa',   valKey: 'custos_defesa_valor',   label: 'Custos de defesa auto' },
                            { key: 'app_passageiros', valKey: 'app_passageiros_valor', label: 'Acidentes pessoais passageiros' },
                            { key: 'blindagem',       valKey: 'blindagem_valor',       label: 'Blindagem' },
                            { key: 'cobre_vidros',    valKey: 'vidros_valor',          label: 'Cobertura de vidros' },
                            { key: 'cobre_terceiros', valKey: null,                    label: 'Cobertura de terceiros (RCF-V)' },
                          ].map(({ key, label, valKey }) => (
                            <div key={key} className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 last:border-0">
                              <span className="text-sm text-white/70">{label}</span>
                              {propostaDestaque[key]
                                ? <span className="text-sm font-semibold text-green-300">
                                    ✓{valKey && propostaDestaque[valKey] ? ` R$ ${propostaDestaque[valKey]}` : ' Incluso'}
                                  </span>
                                : <span className="text-sm text-white/30">Não incluso</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Diferenciais */}
                    {diferenciais.length > 0 && (
                      <div className="px-6 sm:px-8 py-6">
                        <div className="flex items-center gap-3 mb-5">
                          {propostaDestaque?.logo_url && (
                            <div className="bg-white/15 rounded-lg px-3 py-1.5 shrink-0">
                              <img src={propostaDestaque.logo_url} alt={propostaDestaque.operadora} className="h-11 w-28 object-contain" />
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block">Diferenciais</span>
                            <p className="text-white/60 text-sm">{propostaDestaque?.operadora}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {diferenciais.slice(0, expandedDifs ? undefined : 3).map((d, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-white/10 rounded-xl border border-white/15">
                              <div className="bg-white/20 rounded-lg p-2 shrink-0 mt-0.5">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{d.titulo}</p>
                                <p className="text-sm text-white/60 mt-1 leading-relaxed">{d.descricao}</p>
                              </div>
                            </div>
                          ))}
                          {diferenciais.length > 3 && (
                            <button onClick={() => setExpandedDifs(v => !v)}
                              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-300 font-medium hover:bg-white/10 rounded-xl transition-colors">
                              {expandedDifs
                                ? <><ChevronUp className="h-4 w-4" /> Ver menos</>
                                : <><ChevronDown className="h-4 w-4" /> Ver mais {diferenciais.length - 3} diferenciais</>}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rede Credenciada */}
                    {propostaDestaque?.rede_url && (
                      <div className="px-6 sm:px-8 py-6">
                        <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block mb-3">Rede Credenciada</span>
                        <p className="text-sm text-white/60 mb-4">
                          {segmento === 'ODONTOLOGICO'
                            ? `Consulte todos os dentistas e clínicas odontológicas disponíveis na rede da ${propostaDestaque.operadora}.`
                            : `Consulte todos os hospitais, clínicas e laboratórios disponíveis na rede da ${propostaDestaque.operadora}.`}
                        </p>
                        <a href={propostaDestaque.rede_url} target="_blank" rel="noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 transition-colors group">
                          <div className="flex items-center gap-4">
                            {propostaDestaque.logo_url && (
                              <div className="bg-white/15 rounded-xl px-3 py-2 inline-flex items-center justify-center shrink-0"><img src={propostaDestaque.logo_url} alt={propostaDestaque.operadora} className="h-11 w-28 object-contain" /></div>
                            )}
                            <span className="text-base text-white font-medium">{propostaDestaque.operadora}</span>
                          </div>
                          <span className="text-sm text-blue-300 flex items-center gap-1.5 font-medium">
                            Ver rede <ExternalLink className="h-4 w-4" />
                          </span>
                        </a>
                      </div>
                    )}

                    {/* Outras redes */}
                    {propostas.some((p, i) => i !== effectiveDestaqueIdx && p.rede_url) && (
                      <div className="px-6 sm:px-8 py-6">
                        <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest block mb-3">Rede Credenciada — Outras Opções</span>
                        <div className="space-y-3">
                          {propostas.filter((p, i) => i !== effectiveDestaqueIdx && p.rede_url).map((p, i) => (
                            <a key={i} href={p.rede_url} target="_blank" rel="noreferrer"
                              className="flex items-center justify-between p-4 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 transition-colors group">
                              <div className="flex items-center gap-4">
                                {p.logo_url && <div className="bg-white/15 rounded-xl px-3 py-2 inline-flex items-center justify-center shrink-0"><img src={p.logo_url} alt={p.operadora} className="h-11 w-28 object-contain" /></div>}
                                <span className="text-base text-white">{p.operadora}</span>
                              </div>
                              <span className="text-sm text-blue-300 flex items-center gap-1.5">
                                Ver rede <ExternalLink className="h-4 w-4" />
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}


                  </div>{/* end right column */}
                </div>{/* end grid */}
              </div>{/* end big card */}

              <div ref={bottomRef} />
              <p className="text-center text-gray-400 text-xs mt-4">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
            </motion.div>
          )}

          {/* Upload de documentos */}
          {stage === 'documentos' && (
            <motion.div key="documentos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-4">
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
                          const errMsg = docStatus[`${tipo}__err`];
                          return <DocUploadItem key={tipo} tipo={tipo} jaEnviado={jaEnviado} status={status} errMsg={errMsg} onUpload={file => handleUploadDoc(tipo, file)} />;
                        })}
                      </div>
                      <div className="pt-3 border-t border-white/15 space-y-2">
                        <p className="text-xs text-white/50 font-medium">Adicionar documento extra (opcional)</p>
                        <div className="flex gap-2">
                          <input
                            value={extraNome}
                            onChange={e => setExtraNome(e.target.value)}
                            placeholder="Nome do documento..."
                            className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                          />
                          <input
                            key={extraKey}
                            ref={extraInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0] && extraNome.trim()) {
                                handleUploadDoc(extraNome.trim(), e.target.files[0]);
                                setExtraNome('');
                                setExtraKey(k => k + 1);
                              }
                            }}
                          />
                          <button
                            onClick={() => extraNome.trim() && extraInputRef.current?.click()}
                            disabled={!extraNome.trim()}
                            className="px-3 py-2 rounded-lg bg-white/20 text-white text-sm font-medium disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                          >
                            <Upload className="h-4 w-4" /> Enviar
                          </button>
                        </div>
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

      {/* Floating CTA — mobile only */}
      {stage === 'proposta' && propostas.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl px-4 pt-3 pb-5">
            <div className="max-w-2xl mx-auto">
              {propostaDestaque && (
                <p className="text-xs text-gray-500 text-center mb-2">
                  Opção recomendada: <strong className="text-[#003580]">{propostaDestaque.operadora}</strong>
                  {getPropostaValor(propostaDestaque) > 0 && <> · <strong className="text-[#003580]">{fmtValor(getPropostaValor(propostaDestaque))}</strong>/mês</>}
                </p>
              )}
              <button onClick={() => handleAceitarProposta(propostaDestaque)} disabled={aceitando}
                className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 active:scale-[0.99] transition-all hover:brightness-110 hover:shadow-xl hover:scale-[1.02]"
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

const useCountUp = (target, shouldStart = false, duration = 1200) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!shouldStart || !target) { setValue(0); return; }
    let rafId;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) rafId = requestAnimationFrame(step);
      else setValue(target);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [shouldStart, target, duration]);
  return value;
};

const PropostaCard = ({ proposta, isSaude, isAuto = false, cenarios = [], onEscolher, aceitando }) => {
  const [expanded, setExpanded] = useState(false);
  const economiaRef = useRef(null);
  const [economiaVisible, setEconomiaVisible] = useState(false);
  const primeiroValor = proposta.planos?.find(pl => pl.valor)?.valor;
  const planosValidos = proposta.planos?.filter(pl => pl.nome || pl.valor) || [];
  const temMultiplosPlanos = planosValidos.length > 1;
  const nomePlano = !temMultiplosPlanos && planosValidos[0]?.nome ? planosValidos[0].nome : null;
  const d = proposta.destaque;

  const combinarCom = proposta.combinar_com || [];
  const totalAtual = cenarios.reduce((sum, c) => sum + parseValor(c.valor), 0);
  const valorProposta = (proposta.planos || []).reduce((sum, pl) => sum + parseValor(pl.valor), 0);
  const valorCombinados = combinarCom.reduce((sum, c) => sum + parseValor(c.valor), 0);
  const totalComCombinados = valorProposta + valorCombinados;
  const baseComparacao = totalAtual > 0 ? totalAtual : 0;
  const economiaMensal = baseComparacao > 0 ? baseComparacao - totalComCombinados : 0;
  const economiaAnual = economiaMensal * 12;
  const economiaPct = baseComparacao > 0 ? (economiaMensal / baseComparacao) * 100 : 0;
  const temEconomia = economiaMensal > 0 && baseComparacao > 0;

  useEffect(() => {
    const el = economiaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setEconomiaVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animMensal = useCountUp(temEconomia ? economiaMensal : 0, economiaVisible);
  const animAnual = useCountUp(temEconomia ? economiaAnual : 0, economiaVisible);
  const animPct = useCountUp(temEconomia ? economiaPct : 0, economiaVisible);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20px' }}
      className={`rounded-[20px] overflow-hidden border ${d ? 'bg-white border-white shadow-2xl' : 'bg-white/10 border-white/15'}`}>

      {/* Header */}
      <div className={`px-6 py-5 flex items-center justify-between border-b ${d ? 'border-gray-100' : 'border-white/15'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <div className={`rounded-xl p-2.5 flex items-center justify-center shrink-0 ${d ? 'bg-gray-50' : 'bg-white/15'}`}>
            {proposta.logo_url
              ? <img src={proposta.logo_url} alt={proposta.operadora} className="h-11 w-28 object-contain" />
              : <Shield className={`h-7 w-7 ${d ? 'text-[#003580]' : 'text-white'}`} />}
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-base ${d ? 'text-[#003580]' : 'text-white'}`}>{proposta.operadora || 'Seguradora'}</p>
            {nomePlano && !isAuto && (
              <p className={`text-sm font-medium mt-0.5 ${d ? 'text-[#003580]/70' : 'text-white/70'}`}>Plano: {nomePlano}</p>
            )}
            {isAuto && proposta.cobertura_tipo && (
              <p className={`text-sm font-medium mt-0.5 ${d ? 'text-[#003580]/70' : 'text-white/70'}`}>Cobertura {proposta.cobertura_tipo}</p>
            )}
            {isSaude && proposta.abrangencia && (
              <p className={`text-sm mt-0.5 ${d ? 'text-[#003580]/60' : 'text-white/60'}`}>{proposta.abrangencia} · {proposta.acomodacao || 'Sem acomodação'}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
          {d && (
            <span className="bg-[#003580] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current" /> Melhor Opção
            </span>
          )}
          {temEconomia && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${d ? 'bg-green-100 text-green-700' : 'bg-green-400/20 text-green-300'}`}>
              Você economiza {Math.round(economiaPct)}%
            </span>
          )}
        </div>
      </div>

      {/* Preço */}
      <div className={`px-6 py-6 text-center border-b ${d ? 'border-gray-100' : 'border-white/15'}`}>
        {primeiroValor ? (
          <>
            {temMultiplosPlanos && <p className={`text-xs uppercase tracking-wide mb-1 ${d ? 'text-[#003580]/50' : 'text-white/50'}`}>a partir de</p>}
            {!temMultiplosPlanos && <p className={`text-sm uppercase tracking-wide ${d ? 'text-[#003580]/50' : 'text-white/50'}`}>{isAuto ? 'Valor total do seguro' : 'Mensalidade'}</p>}
            <p className={`font-bold mt-1 text-5xl ${d ? 'text-[#003580]' : 'text-white'}`}>{fmtValor(primeiroValor)}</p>
            {!isAuto && <p className={`text-sm mt-1 ${d ? 'text-[#003580]/50' : 'text-white/50'}`}>por mês</p>}
            {combinarCom.length > 0 && (
              <div className={`mt-4 rounded-xl p-3 text-left space-y-2 ${d ? 'bg-gray-50' : 'bg-white/5'}`}>
                {combinarCom.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className={d ? 'text-[#003580]/70' : 'text-white/60'}>
                      + {c.operadora} <span className={`text-xs ${d ? 'text-[#003580]/40' : 'text-white/40'}`}>(mantida)</span>
                    </span>
                    <span className={`font-semibold ${d ? 'text-[#003580]' : 'text-white'}`}>{fmtValor(parseValor(c.valor))}</span>
                  </div>
                ))}
                <div className={`flex items-center justify-between text-sm font-bold pt-2 border-t ${d ? 'border-gray-200 text-[#003580]' : 'border-white/20 text-white'}`}>
                  <span>Total/mês</span>
                  <span>{fmtValor(totalComCombinados)}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className={`text-base italic ${d ? 'text-[#003580]/50' : 'text-white/50'}`}>Valores sob consulta</p>
        )}
      </div>

      {/* Economia */}
      {temEconomia && (
        <div className={`px-6 py-4 border-b ${d ? 'border-gray-100' : 'border-white/15'}`}>
          <div
            ref={economiaRef}
            className="rounded-xl p-4"
            style={d ? {
              background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
              boxShadow: '0 4px 20px rgba(22, 163, 74, 0.35)',
            } : {
              background: 'rgba(34, 197, 94, 0.10)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
            }}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${d ? 'text-green-100' : 'text-green-300'}`}>Economia</p>
            <div className="flex justify-around gap-2 items-center">
              <div className="text-center">
                <p className={`text-base font-black leading-tight ${d ? 'text-white' : 'text-green-300'}`}>{fmtValor(animMensal)}</p>
                <p className={`text-xs mt-0.5 ${d ? 'text-green-100' : 'text-green-400'}`}>por mês</p>
              </div>
              <div className={`w-px h-8 ${d ? 'bg-green-300/40' : 'bg-green-400/30'}`} />
              <div className="text-center">
                <p className={`text-base font-black leading-tight ${d ? 'text-white' : 'text-green-300'}`}>{fmtValor(animAnual)}</p>
                <p className={`text-xs mt-0.5 ${d ? 'text-green-100' : 'text-green-400'}`}>por ano</p>
              </div>
              <div className={`w-px h-8 ${d ? 'bg-green-300/40' : 'bg-green-400/30'}`} />
              <div className="text-center">
                <p className={`text-3xl font-black leading-tight ${d ? 'text-white' : 'text-green-300'}`}>{Math.round(animPct)}%</p>
                <p className={`text-xs mt-0.5 ${d ? 'text-green-100' : 'text-green-400'}`}>de economia</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faixas colapsável */}
      {temMultiplosPlanos && (
        <>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`overflow-hidden border-b ${d ? 'border-gray-100' : 'border-white/15'}`}>
                <div className="px-6 py-4 space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${d ? 'text-[#003580]/50' : 'text-white/50'}`}>Valores por faixa</p>
                  {planosValidos.map((pl, i) => (
                    <div key={i} className={`flex items-center justify-between text-sm py-1.5 border-b last:border-0 ${d ? 'border-gray-100' : 'border-white/10'}`}>
                      <span className={d ? 'text-[#003580]/70' : 'text-white/70'}>{pl.nome || `Plano ${i + 1}`}</span>
                      <span className={`font-bold ${d ? 'text-[#003580]' : 'text-white'}`}>{pl.valor ? fmtValor(pl.valor) : '—'}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setExpanded(v => !v)}
            className={`w-full flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b transition-colors ${d ? 'text-[#003580] border-gray-100 hover:bg-gray-50' : 'text-blue-300 border-white/15 hover:bg-white/10'}`}>
            {expanded ? <><ChevronUp className="h-4 w-4" /> Ocultar faixas</> : <><ChevronDown className="h-4 w-4" /> Ver todos os valores</>}
          </button>
        </>
      )}

      {/* Chips — SAUDE */}
      {isSaude && (
        <div className={`px-6 py-4 flex flex-wrap gap-2 border-b ${d ? 'border-gray-100' : 'border-white/15'}`}>
          {proposta.abrangencia && (
            <span className={`text-sm rounded-full px-3 py-1 ${d ? 'bg-blue-50 text-[#003580]/80' : 'bg-white/15 text-white/80'}`}>{proposta.abrangencia}</span>
          )}
          {proposta.acomodacao && (
            <span className={`text-sm rounded-full px-3 py-1 ${d ? 'bg-blue-50 text-[#003580]/80' : 'bg-white/15 text-white/80'}`}>{proposta.acomodacao}</span>
          )}
          {proposta.coparticipacao?.tem ? (
            <span className={`text-sm rounded-full px-3 py-1 ${d ? 'bg-amber-50 text-amber-700' : 'bg-amber-400/20 text-amber-200'}`}>
              Copart. {proposta.coparticipacao.percentual ? `${proposta.coparticipacao.percentual}%` : 'sim'}
            </span>
          ) : (
            <span className={`text-sm rounded-full px-3 py-1 ${d ? 'bg-blue-50 text-[#003580]/80' : 'bg-white/15 text-white/80'}`}>Sem coparticipação</span>
          )}
          {proposta.carencia !== undefined && (
            <span className={`text-sm rounded-full px-3 py-1 ${
              proposta.carencia
                ? (d ? 'bg-amber-50 text-amber-700' : 'bg-amber-400/20 text-amber-200')
                : (d ? 'bg-blue-50 text-[#003580]/80' : 'bg-white/15 text-white/80')
            }`}>
              {proposta.carencia ? 'Com carência' : 'Sem carência'}
            </span>
          )}
        </div>
      )}

      {/* Tabela de coberturas — AUTO */}
      {isAuto && (
        <div className={`border-b ${d ? 'border-gray-100' : 'border-white/15'}`}>
          {/* Cobertura + LMI + Franquia */}
          {(proposta.cobertura_tipo || proposta.lmi_percentual || proposta.franquia_percentual || proposta.franquia_valor || proposta.franquia) && (
            <div className={`px-5 py-3 border-b ${d ? 'border-gray-100 bg-gray-50/60' : 'border-white/10 bg-white/5'}`}>
              {proposta.cobertura_tipo && (
                <div className="flex items-center justify-between py-1.5">
                  <span className={`text-xs ${d ? 'text-gray-500' : 'text-white/60'}`}>Tipo de cobertura</span>
                  <span className={`text-xs font-semibold ${d ? 'text-[#003580]' : 'text-white'}`}>{proposta.cobertura_tipo}</span>
                </div>
              )}
              {proposta.lmi_percentual && (
                <div className="flex items-center justify-between py-1.5">
                  <span className={`text-xs ${d ? 'text-gray-500' : 'text-white/60'}`}>LMI</span>
                  <span className={`text-xs font-semibold ${d ? 'text-[#003580]' : 'text-white'}`}>{proposta.lmi_percentual}%</span>
                </div>
              )}
              {(proposta.franquia_percentual || proposta.franquia_valor || proposta.franquia) && (
                <div className="flex items-center justify-between py-1.5">
                  <span className={`text-xs ${d ? 'text-gray-500' : 'text-white/60'}`}>Franquia</span>
                  <span className={`text-xs font-semibold ${d ? 'text-[#003580]' : 'text-white'}`}>
                    {proposta.franquia_percentual ? `${proposta.franquia_percentual} — ` : ''}R$ {proposta.franquia_valor || proposta.franquia}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* Serviços e coberturas adicionais */}
          <div className="divide-y divide-white/10">
            {[
              { key: 'assistencia_24h', label: 'Assistência 24h',            valKey: null },
              { key: 'assistencias',    label: 'Assistências',                valKey: null },
              { key: 'carro_reserva',   label: 'Carro reserva',              valKey: null, extra: proposta.carro_reserva_dias ? ` (${proposta.carro_reserva_dias} dias)` : '' },
              { key: 'rcfv_materiais',  label: 'RCF-V Danos materiais',      valKey: 'rcfv_materiais_valor' },
              { key: 'rcfv_corporais',  label: 'RCF-V Danos corporais',      valKey: 'rcfv_corporais_valor' },
              { key: 'danos_morais',    label: 'Danos morais e estéticos',   valKey: 'danos_morais_valor' },
              { key: 'custos_defesa',   label: 'Custos de defesa auto',      valKey: 'custos_defesa_valor' },
              { key: 'app_passageiros', label: 'Acid. pessoais passageiros', valKey: 'app_passageiros_valor' },
              { key: 'blindagem',       label: 'Blindagem',                  valKey: 'blindagem_valor' },
              { key: 'cobre_vidros',    label: 'Vidros',                     valKey: 'vidros_valor' },
              { key: 'cobre_terceiros', label: 'Terceiros (RCF-V)',          valKey: null },
            ].map(({ key, label, valKey, extra = '' }) => (
              <div key={key} className={`flex items-center justify-between px-5 py-2.5 ${d ? 'divide-gray-100' : ''}`}>
                <span className={`text-xs ${d ? 'text-gray-500' : 'text-white/60'}`}>{label}</span>
                {proposta[key]
                  ? <span className={`text-xs font-semibold ${d ? 'text-green-600' : 'text-green-300'}`}>
                      ✓{valKey && proposta[valKey] ? ` R$ ${proposta[valKey]}` : extra || ' Incluso'}
                    </span>
                  : <span className={`text-xs ${d ? 'text-gray-300' : 'text-white/25'}`}>—</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 py-5">
        <button onClick={onEscolher} disabled={aceitando}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
            d
              ? 'bg-[#003580] text-white hover:bg-[#002560] shadow-lg hover:scale-[1.01] active:scale-[0.99]'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}>
          {aceitando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          {aceitando ? 'Processando...' : isAuto ? 'Quero este seguro' : 'Quero este plano'}
        </button>
      </div>
    </motion.div>
  );
};

const DocUploadItem = ({ tipo, jaEnviado, status, errMsg, onUpload }) => {
  const inputRef = useRef(null);
  return (
    <div className={`rounded-xl border transition-colors ${jaEnviado ? 'bg-green-400/20 border-green-400/30' : 'bg-white/10 border-white/15'}`}>
      <div className="flex items-center gap-3 p-3">
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
      {status === 'error' && errMsg && (
        <p className="px-3 pb-2 text-xs text-red-300 break-all">{errMsg}</p>
      )}
    </div>
  );
};

export default OrcamentoPublicoPage;
