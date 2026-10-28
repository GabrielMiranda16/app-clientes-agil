import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Phone, Mail, Linkedin, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, Copy, RotateCcw, Globe, MessageSquare, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { prospeccaoLeadsService } from '@/services/prospeccaoLeadsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const POR_PAGINA = 6;

const primeiroNome = (nomeCompleto) => (nomeCompleto || '').trim().split(' ')[0] || 'tudo bem';
const primeiroTelefone = (telefones) => (telefones || '').split(';')[0].replace(/\D/g, '');

const TEMPLATES_EMAIL = {
  cold_email: {
    label: 'Cold e-mail (1º contato)',
    assunto: () => 'reajuste do plano',
    corpo: (lead) =>
      `Oi ${primeiroNome(lead.nome_decisor)},\n\n` +
      `Rápido: vocês comparam a proposta de renovação do plano de saúde da ${lead.empresa} com outras operadoras, ou só olham o que a atual manda?\n\n` +
      `A maioria das PMEs que atendo em SP nunca teve uma comparação de verdade lado a lado. Eu comparo com Amil, Unimed, Hapvida, SulAmérica, Bradesco e outras — às vezes dá pra manter a mesma cobertura pagando menos, ou melhorar a rede sem aumentar o custo.\n\n` +
      `Vale eu te mandar essa comparação, sem compromisso?\n\nCaroline\nÁgil Seguros`,
  },
  resposta_positiva: {
    label: 'Resposta positiva (pediu cotação)',
    assunto: (lead) => `Cotação de plano de saúde — ${lead.empresa}`,
    corpo: (lead) =>
      `Oi ${primeiroNome(lead.nome_decisor)}!\n\n` +
      `Que ótimo que topou ver a comparação! Para montar certo pra ${lead.empresa}, preciso confirmar: número de funcionários que entrariam, se já têm plano hoje (qual operadora e valor) e a faixa etária aproximada do grupo.\n\n` +
      `Com isso em mãos te envio a comparação em até 1 dia útil.\n\nCaroline\nÁgil Seguros`,
  },
};

const whatsappMsg = (lead) =>
  `Oi ${primeiroNome(lead.nome_decisor)}, tudo bem? Aqui é a Caroline, da Ágil Seguros. Vocês hoje comparam com outras operadoras quando chega a renovação do plano de saúde, ou só olham a proposta que a atual manda? Se fizer sentido, monto uma comparação rápida sem compromisso.`;

const linkedinConvite = (lead) =>
  `Oi, ${primeiroNome(lead.nome_decisor)}. Sou a Caroline, da Ágil Seguros, vi que você lidera a ${lead.empresa} e queria te conhecer. Trabalho bastante com empresas do seu porte aqui em SP.`;

const corTier = { Hot: 'bg-red-100 text-red-700', Warm: 'bg-amber-100 text-amber-700', Cold: 'bg-blue-100 text-blue-700' };

function LeadCard({ lead, onPatch }) {
  const { toast } = useToast();
  const [comentario, setComentario] = useState(lead.comentario || '');
  const [salvandoComentario, setSalvandoComentario] = useState(false);

  const salvarComentario = async () => {
    setSalvandoComentario(true);
    await onPatch(lead.id, { comentario });
    setSalvandoComentario(false);
  };

  const abrirEmail = (templateKey) => {
    const tpl = TEMPLATES_EMAIL[templateKey];
    const assunto = encodeURIComponent(tpl.assunto(lead));
    const corpo = encodeURIComponent(tpl.corpo(lead));
    window.location.href = `mailto:${lead.email}?subject=${assunto}&body=${corpo}`;
    onPatch(lead.id, { enviado_email: true });
  };

  const abrirWhatsapp = () => {
    const tel = primeiroTelefone(lead.telefones);
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(whatsappMsg(lead))}`, '_blank');
  };

  const copiarConvite = async () => {
    await navigator.clipboard.writeText(linkedinConvite(lead));
    toast({ title: 'Mensagem copiada', description: 'Cole no convite de conexão do LinkedIn.' });
    onPatch(lead.id, { enviado_linkedin: true });
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{lead.empresa}</p>
            <p className="text-xs text-gray-500 truncate">{lead.razao_social}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className={`${corTier[lead.tier] || 'bg-gray-100 text-gray-600'} text-xs`}>{lead.tier}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{lead.score}</Badge>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-2">
          <p className="text-sm font-medium">{lead.nome_decisor}</p>
          <p className="text-xs text-gray-500">{lead.cargo}{lead.departamento ? ` · ${lead.departamento}` : ''}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {lead.nivel_decisao && <Badge variant="outline" className="text-xs">{lead.nivel_decisao}</Badge>}
            {lead.confianca && <Badge variant="outline" className="text-xs">Confiança: {lead.confianca}</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-gray-600">
          <span><b>CNPJ:</b> {lead.cnpj || '—'}</span>
          <span><b>Func.:</b> {lead.func_min ? `${lead.func_min}+` : '—'}</span>
          <span className="truncate"><b>Setor:</b> {lead.setor || '—'}</span>
          <span><b>Faturamento:</b> {lead.faturamento || '—'}</span>
          <span><b>Fora do Simples:</b> {lead.fora_do_simples || '—'}</span>
          <span><b>Origem:</b> {lead.origem || '—'}</span>
        </div>
        {lead.atividade && <p className="text-xs text-gray-500 italic">{lead.atividade}</p>}
        {lead.website && (
          <a href={`https://${lead.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="text-xs text-[#0098D4] flex items-center gap-1">
            <Globe className="w-3 h-3" />{lead.website}
          </a>
        )}

        {lead.por_que_e_prospect && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Por que é prospect</p>
            <p className="text-xs text-amber-800">{lead.por_que_e_prospect}</p>
          </div>
        )}

        {(lead.status || lead.resposta || lead.observacao || lead.data_contato) && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Histórico</p>
            {lead.status && <p className="text-xs text-gray-700"><b>Status:</b> {lead.status}</p>}
            {lead.resposta && <p className="text-xs text-gray-700"><b>Resposta:</b> {lead.resposta}</p>}
            {lead.observacao && <p className="text-xs text-gray-700 whitespace-pre-wrap"><b>Obs:</b> {lead.observacao}</p>}
            {lead.data_contato && <p className="text-xs text-gray-500">{format(new Date(lead.data_contato), "dd/MM/yyyy", { locale: ptBR })}</p>}
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Comentário
          </p>
          <Textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Anotações sobre esse contato..."
            className="text-xs min-h-[60px] bg-white"
          />
          {comentario !== (lead.comentario || '') && (
            <Button size="sm" variant="outline" className="mt-1.5" onClick={salvarComentario} disabled={salvandoComentario}>
              <Save className="w-3.5 h-3.5 mr-1" /> {salvandoComentario ? 'Salvando...' : 'Salvar comentário'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {lead.telefones && (
            <Button size="sm" variant="outline" asChild><a href={`tel:${primeiroTelefone(lead.telefones)}`}><Phone className="w-3.5 h-3.5" /></a></Button>
          )}
          {lead.telefones && (
            <Button size="sm" variant="outline" onClick={abrirWhatsapp}>WhatsApp</Button>
          )}
          {lead.email && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline"><Mail className="w-3.5 h-3.5 mr-1" />E-mail<ChevronDown className="w-3 h-3 ml-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(TEMPLATES_EMAIL).map(([key, tpl]) => (
                  <DropdownMenuItem key={key} onClick={() => abrirEmail(key)}>{tpl.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {lead.linkedin && (
            <>
              <Button size="sm" variant="outline" asChild><a href={lead.linkedin} target="_blank" rel="noreferrer"><Linkedin className="w-3.5 h-3.5" /></a></Button>
              <Button size="sm" variant="ghost" onClick={copiarConvite} title="Copiar mensagem de convite"><Copy className="w-3.5 h-3.5" /></Button>
            </>
          )}

          <div className="flex-1" />

          {lead.contatado ? (
            <Button size="sm" variant="ghost" onClick={() => onPatch(lead.id, { contatado: false, contatado_em: null })}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reverter
            </Button>
          ) : (
            <Button size="sm" className="bg-[#003580] hover:bg-[#002a66]" onClick={() => onPatch(lead.id, { contatado: true, contatado_em: new Date().toISOString() })}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar contatado
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Coluna({ titulo, leads, pagina, setPagina, onPatch }) {
  const totalPaginas = Math.max(1, Math.ceil(leads.length / POR_PAGINA));
  const pageAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = leads.slice(pageAtual * POR_PAGINA, pageAtual * POR_PAGINA + POR_PAGINA);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-sm">{titulo} <span className="text-white/60 font-normal">({leads.length})</span></h2>
      </div>
      <div className="space-y-3">
        {visiveis.map((lead) => <LeadCard key={lead.id} lead={lead} onPatch={onPatch} />)}
        {visiveis.length === 0 && <p className="text-white/50 text-sm text-center py-8">Nenhum lead aqui.</p>}
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button size="sm" variant="outline" disabled={pageAtual === 0} onClick={() => setPagina(pageAtual - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-white/70 text-xs">{pageAtual + 1} / {totalPaginas}</span>
          <Button size="sm" variant="outline" disabled={pageAtual >= totalPaginas - 1} onClick={() => setPagina(pageAtual + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}

export default function ProspeccaoTestePage() {
  const { toast } = useToast();
  const [tier, setTier] = useState('Hot');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [paginaNao, setPaginaNao] = useState(0);
  const [paginaSim, setPaginaSim] = useState(0);

  const carregar = async (tierAtual) => {
    setLoading(true);
    try {
      const dados = await prospeccaoLeadsService.listarTodos({ tier: tierAtual });
      setLeads(dados);
    } catch (e) {
      toast({ title: 'Erro ao carregar leads', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(tier); setPaginaNao(0); setPaginaSim(0); }, [tier]);

  const onPatch = async (id, patch) => {
    try {
      await prospeccaoLeadsService.atualizar(id, patch);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const filtrados = useMemo(() => {
    if (!busca.trim()) return leads;
    const b = busca.toLowerCase();
    return leads.filter(l =>
      l.empresa?.toLowerCase().includes(b) ||
      l.setor?.toLowerCase().includes(b) ||
      l.nome_decisor?.toLowerCase().includes(b)
    );
  }, [leads, busca]);

  const naoContatados = useMemo(() => filtrados.filter(l => !l.contatado), [filtrados]);
  const contatados = useMemo(() => filtrados.filter(l => l.contatado), [filtrados]);

  return (
    <DashboardLayout title="Prospecção">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Prospecção — Saúde Empresarial</h1>
          <p className="text-white/70 text-sm">{leads.length} leads em {tier} · ordenados por score</p>
        </div>

        <Tabs value={tier} onValueChange={setTier} className="mb-4">
          <TabsList>
            <TabsTrigger value="Hot">🔥 Hot</TabsTrigger>
            <TabsTrigger value="Warm">🟠 Warm</TabsTrigger>
            <TabsTrigger value="Cold">🔵 Cold</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Buscar empresa, decisor ou setor..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPaginaNao(0); setPaginaSim(0); }}
          className="mb-4 bg-white"
        />

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <Coluna titulo="Não contatados" leads={naoContatados} pagina={paginaNao} setPagina={setPaginaNao} onPatch={onPatch} />
            <Coluna titulo="Contatados" leads={contatados} pagina={paginaSim} setPagina={setPaginaSim} onPatch={onPatch} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
