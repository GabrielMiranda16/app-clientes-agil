import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, ShieldCheck, CheckCircle2, Upload, FileText, AlertCircle, ArrowRight, Check } from 'lucide-react';

const logoUrl = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png';

const SEGMENTO_LABEL = {
  SAUDE_VIDA_ODONTO: 'Saúde / Vida / Odonto',
  AUTO_FROTA: 'Auto / Frota',
  VIAGEM: 'Viagem',
  RESIDENCIAL: 'Residencial',
  PET_SAUDE: 'Pet Saúde',
  EMPRESARIAL: 'Empresarial',
  CARGAS: 'Cargas',
  EQUIPAMENTOS: 'Equipamentos Portáteis',
};

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
  const [docStatus, setDocStatus] = useState({});
  const [docsEnviados, setDocsEnviados] = useState([]);

  useEffect(() => {
    loadOrcamento();
  }, [slug]);

  useEffect(() => {
    if (stage !== 'proposta') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !scrolledRef.current) {
        scrolledRef.current = true;
        if (acessoIdRef.current) {
          supabase.from('orcamento_acessos').update({ scroll_fim: true }).eq('id', acessoIdRef.current).then(() => {});
        }
      }
    }, { threshold: 0.5 });
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    return () => {
      if (acessoIdRef.current) {
        const tempo = Math.round((Date.now() - startTimeRef.current) / 1000);
        navigator.sendBeacon && navigator.sendBeacon('/api/noop'); // trigger
        supabase.from('orcamento_acessos').update({ tempo_pagina: tempo }).eq('id', acessoIdRef.current).then(() => {});
      }
    };
  }, []);

  const loadOrcamento = async () => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) { setStage('erro'); return; }
    setOrcamento(data);

    if (['ASSINATURA', 'CONCLUIDO', 'COMISSAO'].includes(data.status)) {
      setStage('encerrado');
    } else if (data.status === 'DOCUMENTOS') {
      // Fetch already sent docs
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
      // Validate against stored CPF (if available) or just accept
      const cpfCadastrado = orcamento.cliente_cpf;
      if (cpfCadastrado) {
        const cpfClean = cpfCadastrado.replace(/\D/g, '');
        if (!cpfClean.startsWith(primeiros3)) {
          setCpfError('CPF incorreto. Verifique os primeiros 3 dígitos.');
          setVerificando(false);
          return;
        }
      }

      // Register access
      const { data: acesso } = await supabase.from('orcamento_acessos').insert({
        orcamento_id: orcamento.id,
        cpf_3dig: primeiros3,
        acessado_em: new Date().toISOString(),
        ip: '',
        user_agent: navigator.userAgent,
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

  const handleAceitarProposta = async () => {
    setAceitando(true);
    try {
      await supabase.from('orcamentos').update({
        status: 'DOCUMENTOS',
        data_documentos: new Date().toISOString(),
      }).eq('id', orcamento.id);

      if (acessoIdRef.current) {
        await supabase.from('orcamento_acessos').update({
          aceitou_proposta: true,
          aceitou_em: new Date().toISOString(),
        }).eq('id', acessoIdRef.current);
      }

      // WhatsApp notification
      supabase.functions.invoke('notify-orcamento-aceito', {
        body: { orcamento_id: orcamento.id },
      }).catch(() => {});

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
        orcamento_id: orcamento.id,
        tipo_documento: tipo,
        nome_arquivo: file.name,
        storage_path: publicUrl,
        enviado_em: new Date().toISOString(),
        obrigatorio: true,
        enviado_por: 'CLIENTE',
      });

      setDocStatus(prev => ({ ...prev, [tipo]: 'done' }));
      setDocsEnviados(prev => prev.includes(tipo) ? prev : [...prev, tipo]);
    } catch (err) {
      console.error(err);
      setDocStatus(prev => ({ ...prev, [tipo]: 'error' }));
    }
  };

  const todosOsDocs = [
    ...(orcamento?.lista_documentos || []),
    ...(orcamento?.docs_extras || []),
  ];

  const todosEnviados = todosOsDocs.length > 0 && todosOsDocs.every(d => docsEnviados.includes(d) || docStatus[d] === 'done');

  if (stage === 'loading') return (
    <div className="min-h-screen bg-soft-gradient flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );

  if (stage === 'erro') return (
    <div className="min-h-screen bg-soft-gradient flex flex-col items-center justify-center p-4 text-center">
      <AlertCircle className="h-12 w-12 text-white/60 mb-4" />
      <p className="text-white font-bold text-xl">Link inválido ou expirado</p>
      <p className="text-white/70 text-sm mt-2">Este link de orçamento não existe ou não está mais disponível.</p>
    </div>
  );

  if (stage === 'encerrado') return (
    <div className="min-h-screen bg-soft-gradient flex flex-col items-center justify-center p-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-400 mb-4" />
      <p className="text-white font-bold text-xl">Proposta em andamento</p>
      <p className="text-white/70 text-sm mt-2">Seus documentos foram recebidos e o processo já está em andamento.<br />Em breve entraremos em contato.</p>
      <img src={logoUrl} alt="Ágil Seguros" className="h-12 mt-8 opacity-70 object-contain" />
    </div>
  );

  return (
    <div className="min-h-screen bg-soft-gradient flex flex-col items-center justify-start p-4 pt-8 pb-12">
      <div className="w-full max-w-lg">
        <img src={logoUrl} alt="Ágil Seguros" className="h-16 w-auto object-contain mx-auto mb-6" />

        <AnimatePresence mode="wait">

          {/* Verificação CPF */}
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
                <div>
                  <p className="text-gray-600 text-sm">Olá, <strong>{orcamento?.cliente_nome}</strong>! Um orçamento de seguro foi preparado para você pela <strong>Ágil Seguros</strong>.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Primeiros 3 dígitos do seu CPF</label>
                  <input
                    type="tel"
                    maxLength={3}
                    value={cpfInput}
                    onChange={e => { setCpfInput(e.target.value.replace(/\D/g, '')); setCpfError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerificarCpf()}
                    placeholder="000"
                    className="w-full rounded-xl border border-gray-200 bg-[#f0f7ff] px-4 py-3 text-2xl text-center font-bold tracking-[1rem] focus:outline-none focus:border-[#003580] focus:ring-2 focus:ring-[#003580]/20"
                  />
                  {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
                </div>
                <button
                  onClick={handleVerificarCpf}
                  disabled={verificando || cpfInput.replace(/\D/g, '').length < 3}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                  style={{ background: '#003580' }}
                >
                  {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {verificando ? 'Verificando...' : 'Acessar orçamento'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Proposta */}
          {stage === 'proposta' && (
            <motion.div key="proposta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/95 rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-[#003580] px-6 py-5">
                <p className="text-white/70 text-xs uppercase tracking-wide font-medium">Orçamento de seguro</p>
                <h1 className="text-white font-bold text-xl mt-1">{SEGMENTO_LABEL[orcamento?.segmento] || orcamento?.segmento}</h1>
                <p className="text-white/70 text-xs mt-0.5">Preparado exclusivamente para {orcamento?.cliente_nome}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Valor */}
                <div className="bg-gradient-to-r from-[#003580]/5 to-[#0B7EC4]/5 rounded-2xl p-5 text-center border border-[#003580]/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Mensalidade</p>
                  <p className="text-4xl font-bold text-[#003580] mt-1">
                    R$ {Number(orcamento?.valor_mensalidade || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">por mês</p>
                </div>

                {/* Descrição */}
                {orcamento?.descricao_orcamento && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalhes do plano</p>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {orcamento.descricao_orcamento}
                    </div>
                  </div>
                )}

                {/* Documentos que serão necessários */}
                {todosOsDocs.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos necessários</p>
                    <div className="space-y-1.5">
                      {todosOsDocs.map(doc => (
                        <div key={doc} className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="h-3.5 w-3.5 text-[#003580] shrink-0" />
                          {doc}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Você enviará estes documentos na próxima etapa.</p>
                  </div>
                )}

                {/* Aceitar */}
                <div ref={bottomRef} className="pt-2 space-y-3">
                  <button
                    onClick={handleAceitarProposta}
                    disabled={aceitando}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, #003580, #0B7EC4)' }}
                  >
                    {aceitando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    {aceitando ? 'Processando...' : 'Seguir com a proposta'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Ao clicar, você confirma interesse nesta proposta. Nossa equipe entrará em contato.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Upload de documentos */}
          {stage === 'documentos' && (
            <motion.div key="documentos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4">
              <div className="bg-white/95 rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-[#003580] px-6 py-5 flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-green-300 shrink-0" />
                  <div>
                    <h1 className="text-white font-bold text-lg">Proposta aceita! ✅</h1>
                    <p className="text-white/70 text-xs mt-0.5">Agora envie seus documentos para prosseguirmos</p>
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
                          return (
                            <DocUploadItem key={tipo} tipo={tipo} jaEnviado={jaEnviado} status={status}
                              onUpload={file => handleUploadDoc(tipo, file)} />
                          );
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
            </motion.div>
          )}

        </AnimatePresence>

        <p className="text-center text-white/40 text-xs mt-6">Ágil Seguros · SUSEP 252166308 · segurosagil.com.br</p>
      </div>
    </div>
  );
};

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
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={e => onUpload(e.target.files?.[0])} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={status === 'uploading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003580] text-white text-xs font-medium disabled:opacity-60 shrink-0"
          >
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
