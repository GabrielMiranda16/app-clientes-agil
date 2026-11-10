import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { apolicesService } from '@/services/apolicesService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { atestadosService, custoEstimado, diasDoAtestado, SALARIO_MINIMO } from '@/services/atestadosService';
import { analisarAtestados, marcasDoAtestado, acharDuplicado } from '@/services/atestadosAnalise';
import { ArrowLeft, Loader2, Stethoscope, Plus, Trash2, Sparkles, FileText, Upload, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import { PainelLateral, PainelCorpo, PainelRodape } from '@/components/clienteTeste/PainelLateral';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const EMPTY_FORM = {
  beneficiario_id: '', tipo: 'ATESTADO', data_emissao: '', data_inicio: '', data_fim: '',
  dias_afastamento: '', cid: '', medico_nome: '', crm: '', crm_uf: '', motivo: '', observacoes: '',
};

const TIPO_LABEL = { ATESTADO: 'Atestado', COMPARECIMENTO: 'Comparecimento' };

const ALERTA_ESTILO = {
  INSS: { rotulo: 'INSS', classe: 'bg-red-50 text-red-700' },
  MEDICO: { rotulo: 'Mesmo médico', classe: 'bg-amber-50 text-amber-700' },
  PADRAO: { rotulo: 'Padrão', classe: 'bg-amber-50 text-amber-700' },
};

const MARCA_CLASSE = (m) => (m === 'Risco alto' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700');

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(`${d}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const isoLocal = (date) => format(date, 'yyyy-MM-dd');

const somarDias = (iso, dias) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
};

const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const acharBeneficiario = (beneficiarios, nome) => {
  const alvo = normalizar(nome);
  if (!alvo) return null;
  const candidatos = beneficiarios.filter((b) => {
    const n = normalizar(b.nome_completo);
    return n === alvo || n.includes(alvo) || alvo.includes(n);
  });
  return candidatos.length === 1 ? candidatos[0] : null;
};

const AtestadosTestePage = () => {
  const { apoliceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [apolice, setApolice] = useState(null);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [atestados, setAtestados] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [arquivo, setArquivo] = useState(null);
  const [iaDados, setIaDados] = useState(null);
  const [isLendo, setIsLendo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(async (ap) => {
        setApolice(ap);
        const [ben, ats] = await Promise.all([
          beneficiariosService.getBeneficiariosByEmpresa(ap.empresa_id).catch(() => []),
          atestadosService.getAtestadosByApolice(apoliceId).catch(() => []),
        ]);
        setBeneficiarios(ben.filter(b => !b.data_exclusao));
        setAtestados(ats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  const resumo = useMemo(() => {
    const hoje = isoLocal(new Date());
    const mesAtual = hoje.slice(0, 7);
    const inicioJanela = isoLocal(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
    const afastamentos = atestados.filter((a) => a.tipo !== 'COMPARECIMENTO');

    const afastadosAgora = afastamentos.filter((a) => a.data_inicio <= hoje && hoje <= (a.data_fim || a.data_inicio));
    const retornosMes = afastamentos.filter((a) => {
      const retorno = somarDias(a.data_fim || a.data_inicio, 1);
      return retorno.slice(0, 7) === mesAtual && retorno <= hoje;
    });

    const ultimos12 = afastamentos.filter((a) => a.data_inicio >= inicioJanela);
    const diasPerdidos = ultimos12.reduce((s, a) => s + diasDoAtestado(a), 0);

    const { ranking: top10, alertas } = analisarAtestados(atestados);

    return { afastadosAgora, retornosMes, diasPerdidos, top10, alertas };
  }, [atestados]);

  const abrirNovo = () => {
    setForm(EMPTY_FORM);
    setArquivo(null);
    setIaDados(null);
    setIsAddOpen(true);
  };

  const handleArquivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsLendo(true);
    try {
      const preparado = await atestadosService.prepararArquivo(file);
      setArquivo({ ...preparado, nome: file.name });
      const d = await atestadosService.lerComIA(preparado);
      setIaDados(d);
      if (!d.eh_atestado) {
        toast({ variant: 'destructive', title: 'Esse documento não parece um atestado.', description: 'Confira o arquivo ou preencha os campos manualmente.' });
        return;
      }
      const pessoa = acharBeneficiario(beneficiarios, d.paciente_nome);
      setForm((f) => ({
        ...f,
        beneficiario_id: pessoa ? String(pessoa.id) : f.beneficiario_id,
        tipo: d.tipo === 'COMPARECIMENTO' ? 'COMPARECIMENTO' : 'ATESTADO',
        data_emissao: d.data_emissao || '',
        data_inicio: d.data_inicio || d.data_emissao || '',
        data_fim: d.data_fim || '',
        dias_afastamento: d.dias_afastamento != null ? String(d.dias_afastamento) : '',
        cid: d.cid || '',
        medico_nome: d.medico_nome || '',
        crm: d.crm || '',
        crm_uf: d.crm_uf || '',
      }));
      toast({
        title: 'Atestado lido. Confira os dados antes de salvar.',
        description: pessoa ? undefined : `Não encontrei "${d.paciente_nome || 'o paciente'}" na lista. Selecione a pessoa.`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Não foi possível ler o atestado', description: err.message });
    } finally {
      setIsLendo(false);
    }
  };

  const handleCriar = async () => {
    if (!form.beneficiario_id || !form.data_inicio) {
      toast({ variant: 'destructive', title: 'Selecione a pessoa e a data de início.' });
      return;
    }
    if (acharDuplicado(atestados, { beneficiario_id: Number(form.beneficiario_id), data_inicio: form.data_inicio, tipo: form.tipo })) {
      toast({ variant: 'destructive', title: 'Esse atestado já foi cadastrado.', description: 'Já existe um atestado dessa pessoa com início nessa data.' });
      return;
    }
    setIsSaving(true);
    let arquivoPath = null;
    try {
      if (arquivo) arquivoPath = await atestadosService.uploadArquivo(arquivo, apolice.empresa_id);
      const created = await atestadosService.createAtestado({
        beneficiario_id: Number(form.beneficiario_id),
        empresa_id: apolice.empresa_id,
        apolice_id: Number(apoliceId),
        tipo: form.tipo,
        data_emissao: form.data_emissao || null,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        dias_afastamento: form.dias_afastamento === '' ? null : Number(form.dias_afastamento),
        cid: form.cid.trim().toUpperCase() || null,
        medico_nome: form.medico_nome.trim() || null,
        crm: form.crm.trim() || null,
        crm_uf: form.crm_uf.trim().toUpperCase() || null,
        motivo: form.motivo.trim() || null,
        observacoes: form.observacoes.trim() || null,
        arquivo_path: arquivoPath,
        ia_dados: iaDados,
      });
      setAtestados((prev) => [created, ...prev]);
      toast({ title: 'Atestado cadastrado.' });
      setIsAddOpen(false);
    } catch (err) {
      if (arquivoPath) atestadosService.removerArquivo(arquivoPath).catch(() => {});
      toast({ variant: 'destructive', title: 'Erro ao cadastrar', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluir = async (atestado) => {
    try {
      await atestadosService.deleteAtestado(atestado);
      setAtestados((prev) => prev.filter((a) => a.id !== atestado.id));
      toast({ title: 'Atestado removido.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  const handleVerArquivo = async (atestado) => {
    try {
      window.open(await atestadosService.getArquivoUrl(atestado.arquivo_path), '_blank', 'noopener');
    } catch (err) {
      toast({ variant: 'destructive', title: err.message });
    }
  };

  const campo = (chave) => ({
    value: form[chave],
    onChange: (e) => setForm((f) => ({ ...f, [chave]: e.target.value })),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
      </div>
    );
  }

  const INDICADORES = [
    { label: 'Afastados hoje', valor: resumo.afastadosAgora.length },
    { label: 'Retornos no mês', valor: resumo.retornosMes.length },
    { label: 'Dias perdidos (12 meses)', valor: resumo.diasPerdidos },
    { label: 'Custo estimado (12 meses)', valor: formatBRL(custoEstimado(resumo.diasPerdidos)) },
  ];

  return (
    <>
      <Helmet><title>Atestados - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Atestados</h1>
              <p className="text-gray-400 text-sm">Atestados vinculados a essa apólice.</p>
            </div>
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#003580] text-white text-sm font-semibold hover:bg-[#002060] transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Adicionar atestado
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {INDICADORES.map((i) => (
              <div key={i.label} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{i.label}</p>
                <p className="text-2xl font-bold tracking-tight text-gray-900">{i.valor}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 -mt-3">
            Custo estimado com base no salário mínimo ({formatBRL(SALARIO_MINIMO)}/mês), proporcional aos dias de afastamento.
          </p>

          {resumo.alertas.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Alertas
              </h2>
              <div className="divide-y divide-gray-100">
                {resumo.alertas.map((al) => (
                  <div key={al.chave} className="flex items-start gap-3 py-2.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${ALERTA_ESTILO[al.tipo].classe}`}>
                      {ALERTA_ESTILO[al.tipo].rotulo}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{al.titulo}</span>
                      <span className="block text-xs text-gray-500">{al.detalhe}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-3">Afastados hoje</h2>
              {resumo.afastadosAgora.length === 0 ? (
                <p className="text-sm text-gray-400">Ninguém afastado hoje.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {resumo.afastadosAgora.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="font-semibold text-gray-900 truncate">{a.beneficiarios?.nome_completo || '—'}</span>
                      <span className="text-gray-500 flex-shrink-0">
                        {a.cid ? `CID ${a.cid} · ` : ''}retorna em {formatDate(somarDias(a.data_fim || a.data_inicio, 1))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900">Mais afastamentos nos últimos 12 meses</h2>
              <p className="text-xs text-gray-400 mb-3">Ordenado pelo Índice de Bradford (atestados² × dias): faltas curtas e repetidas pesam mais.</p>
              {resumo.top10.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum atestado no período.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {resumo.top10.map((p, i) => (
                    <div key={p.id} className="grid grid-cols-[20px_1fr_auto] gap-3 items-center py-2.5 text-sm">
                      <span className="text-gray-400">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-gray-900 truncate">{p.nome}</span>
                        {p.cids.size > 0 && (
                          <span className="block text-xs text-gray-400 truncate">
                            {p.cids.size === 1 ? 'Mesmo CID' : `${p.cids.size} CIDs diferentes`}: {[...p.cids].join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="block text-gray-500">{p.qtd} {p.qtd === 1 ? 'atestado' : 'atestados'} · {p.dias} {p.dias === 1 ? 'dia' : 'dias'}</span>
                        <span className="block text-xs text-gray-400">Índice de Bradford {p.bradford}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.6fr_0.9fr_0.6fr_0.7fr_1.3fr_0.9fr_64px] gap-4 px-5 py-3 bg-white text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span>Beneficiário</span>
              <span>Início</span>
              <span>Dias</span>
              <span>CID</span>
              <span>Médico</span>
              <span>Custo est.</span>
              <span></span>
            </div>

            {atestados.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                <Stethoscope className="w-8 h-8 text-gray-300" />
                Nenhum atestado cadastrado.
              </div>
            ) : (
              atestados.map((a) => {
                const dias = a.tipo === 'COMPARECIMENTO' ? 0 : diasDoAtestado(a);
                const marcas = marcasDoAtestado(a);
                return (
                  <div key={a.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_0.9fr_0.6fr_0.7fr_1.3fr_0.9fr_64px] gap-4 items-center px-5 py-4 border-t border-gray-100 first:border-t-0">
                    <span className="min-w-0">
                      <span className="block font-bold text-gray-900 text-sm truncate">{a.beneficiarios?.nome_completo || '—'}</span>
                      <span className="block text-xs text-gray-400 truncate">{TIPO_LABEL[a.tipo] || a.tipo}{a.motivo ? ` · ${a.motivo}` : ''}</span>
                      {marcas.length > 0 && (
                        <span className="flex flex-wrap gap-1 mt-1">
                          {marcas.map((m) => (
                            <span key={m} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MARCA_CLASSE(m)}`}>{m}</span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="hidden sm:block text-sm text-gray-900">{formatDate(a.data_inicio)}</span>
                    <span className="hidden sm:block text-sm text-gray-900">{dias || '—'}</span>
                    <span className="hidden sm:block text-sm text-gray-900">{a.cid || '—'}</span>
                    <span className="hidden sm:block min-w-0">
                      <span className="block text-sm text-gray-900 truncate">{a.medico_nome || '—'}</span>
                      {a.crm && <span className="block text-xs text-gray-400">CRM {a.crm}{a.crm_uf ? `/${a.crm_uf}` : ''}</span>}
                    </span>
                    <span className="hidden sm:block text-sm text-gray-900">{dias ? formatBRL(custoEstimado(dias)) : '—'}</span>
                    <span className="flex items-center justify-end gap-3">
                      {a.arquivo_path && (
                        <button onClick={() => handleVerArquivo(a)} title="Ver arquivo" className="text-gray-300 hover:text-[#003580] transition-colors">
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleExcluir(a)} title="Excluir" className="text-gray-300 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ClienteSidebarLayout>

      <PainelLateral open={isAddOpen} onOpenChange={setIsAddOpen} title="Adicionar atestado">
          <PainelCorpo className="space-y-3">
            <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleArquivo} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isLendo}
              className="w-full flex items-center gap-3 border border-dashed border-gray-300 rounded-2xl px-4 py-3 text-left hover:border-[#003580] transition-colors disabled:opacity-60"
            >
              {isLendo ? <Loader2 className="w-5 h-5 animate-spin text-[#003580]" /> : arquivo ? <Sparkles className="w-5 h-5 text-[#003580]" /> : <Upload className="w-5 h-5 text-gray-500" />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 truncate">
                  {isLendo ? 'Lendo o atestado...' : arquivo ? arquivo.nome : 'Enviar foto ou PDF do atestado'}
                </span>
                <span className="block text-xs text-gray-400">
                  {arquivo && !isLendo ? 'Toque para trocar o arquivo' : 'A IA preenche os campos e você confere antes de salvar'}
                </span>
              </span>
            </button>
            {iaDados?.observacoes && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Conferir: {iaDados.observacoes}</p>
            )}
            {iaDados?.risco?.sinais?.length > 0 && (
              <div className={`text-xs rounded-xl px-3 py-2 ${iaDados.risco.nivel === 'ALTO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                <p className="font-semibold mb-1">
                  {iaDados.risco.nivel === 'ALTO' ? 'Risco alto: verificar antes de aceitar' : 'Pontos de atenção'}
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {iaDados.risco.sinais.map((sinal) => <li key={sinal}>{sinal}</li>)}
                </ul>
              </div>
            )}

            <div>
              <Label className="text-xs">Beneficiário *</Label>
              <Select value={form.beneficiario_id} onValueChange={(v) => setForm((f) => ({ ...f, beneficiario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {beneficiarios.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATESTADO">Atestado (dias)</SelectItem>
                    <SelectItem value="COMPARECIMENTO">Comparecimento (horas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data de Emissão</Label>
                <Input type="date" {...campo('data_emissao')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Início *</Label>
                <Input type="date" {...campo('data_inicio')} />
              </div>
              <div>
                <Label className="text-xs">Término</Label>
                <Input type="date" {...campo('data_fim')} />
              </div>
              <div>
                <Label className="text-xs">Dias</Label>
                <Input type="number" min="0" {...campo('dias_afastamento')} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_1.2fr_0.6fr] gap-3">
              <div>
                <Label className="text-xs">CID</Label>
                <Input {...campo('cid')} placeholder="Ex: J11" />
              </div>
              <div>
                <Label className="text-xs">CRM</Label>
                <Input {...campo('crm')} />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Input maxLength={2} {...campo('crm_uf')} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Médico</Label>
              <Input {...campo('medico_nome')} />
            </div>
            <div>
              <Label className="text-xs">Motivo</Label>
              <Input {...campo('motivo')} placeholder="Ex: Gripe, pós-cirúrgico" />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input {...campo('observacoes')} />
            </div>
          </PainelCorpo>
          <PainelRodape>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button className="bg-[#003580] hover:bg-[#002060]" disabled={isSaving || isLendo} onClick={handleCriar}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
            </Button>
          </PainelRodape>
      </PainelLateral>
    </>
  );
};

export default AtestadosTestePage;
