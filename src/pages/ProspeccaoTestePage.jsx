import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Phone, Mail, Linkedin, ChevronDown, ChevronRight, CheckCircle2, Copy, Building2, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { prospeccaoLeadsService } from '@/services/prospeccaoLeadsService';

const primeiroNome = (nomeCompleto) => (nomeCompleto || '').trim().split(' ')[0] || 'tudo bem';

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

const primeiroTelefone = (telefones) => (telefones || '').split(';')[0].replace(/\D/g, '');

export default function ProspeccaoTestePage() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandida, setExpandida] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const dados = await prospeccaoLeadsService.listarAgrupadoPorEmpresa({ tier: 'Hot' });
      setEmpresas(dados);
    } catch (e) {
      toast({ title: 'Erro ao carregar leads', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    if (!busca.trim()) return empresas;
    const b = busca.toLowerCase();
    return empresas.filter(e => e.empresa.toLowerCase().includes(b) || e.setor?.toLowerCase().includes(b));
  }, [empresas, busca]);

  const salvarPatch = async (decisor, patch) => {
    try {
      await prospeccaoLeadsService.atualizar(decisor.id, patch);
      setEmpresas(prev => prev.map(emp => ({
        ...emp,
        decisores: emp.decisores.map(d => d.id === decisor.id ? { ...d, ...patch } : d),
      })));
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const marcarEnviado = (decisor, campo) => salvarPatch(decisor, { [campo]: true });
  const marcarContatado = (decisor) => salvarPatch(decisor, { status: 'contatado' });

  const abrirEmail = (decisor, templateKey) => {
    const tpl = TEMPLATES_EMAIL[templateKey];
    const assunto = encodeURIComponent(tpl.assunto(decisor));
    const corpo = encodeURIComponent(tpl.corpo(decisor));
    window.location.href = `mailto:${decisor.email}?subject=${assunto}&body=${corpo}`;
    marcarEnviado(decisor, 'enviado_email');
  };

  const abrirWhatsapp = (decisor) => {
    const tel = primeiroTelefone(decisor.telefones);
    const texto = encodeURIComponent(whatsappMsg(decisor));
    window.open(`https://wa.me/55${tel}?text=${texto}`, '_blank');
  };

  const copiarConvite = async (decisor) => {
    await navigator.clipboard.writeText(linkedinConvite(decisor));
    toast({ title: 'Mensagem copiada', description: 'Cole no convite de conexão do LinkedIn.' });
  };

  return (
    <DashboardLayout title="Prospecção">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Prospecção — Saúde Empresarial (Hot)</h1>
          <p className="text-white/70 text-sm">{empresas.length} empresas · {empresas.reduce((n, e) => n + e.decisores.length, 0)} decisores</p>
        </div>

        <Input
          placeholder="Buscar empresa ou setor..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-4 bg-white"
        />

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((emp) => {
              const aberto = expandida === emp.empresa;
              const contatados = emp.decisores.filter(d => d.status === 'contatado').length;
              return (
                <Card key={emp.empresa} className="glass-card">
                  <CardContent className="p-0">
                    <button
                      className="w-full flex items-center justify-between p-3.5 text-left"
                      onClick={() => setExpandida(aberto ? null : emp.empresa)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {aberto ? <ChevronDown className="w-4 h-4 shrink-0 text-[#003580]" /> : <ChevronRight className="w-4 h-4 shrink-0 text-[#003580]" />}
                        <Building2 className="w-4 h-4 shrink-0 text-[#003580]" />
                        <span className="font-medium text-sm truncate">{emp.empresa}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" className="text-xs hidden sm:inline-flex">{emp.setor}</Badge>
                        <Badge className="bg-gray-100 text-gray-600 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" />{emp.decisores.length}
                        </Badge>
                        {contatados > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-xs">{contatados} contatado{contatados > 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                    </button>

                    {aberto && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100">
                        {emp.decisores.map((d) => (
                          <div key={d.id} className="p-3.5 flex flex-wrap items-center gap-2 justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{d.nome_decisor}</p>
                              <p className="text-xs text-gray-500">{d.cargo}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {d.telefones && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`tel:${primeiroTelefone(d.telefones)}`}><Phone className="w-3.5 h-3.5" /></a>
                                </Button>
                              )}
                              {d.telefones && (
                                <Button size="sm" variant="outline" onClick={() => abrirWhatsapp(d)}>WhatsApp</Button>
                              )}
                              {d.email && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline"><Mail className="w-3.5 h-3.5 mr-1" />E-mail<ChevronDown className="w-3 h-3 ml-1" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {Object.entries(TEMPLATES_EMAIL).map(([key, tpl]) => (
                                      <DropdownMenuItem key={key} onClick={() => abrirEmail(d, key)}>{tpl.label}</DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              {d.linkedin && (
                                <>
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={d.linkedin} target="_blank" rel="noreferrer"><Linkedin className="w-3.5 h-3.5" /></a>
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => copiarConvite(d)} title="Copiar mensagem de convite">
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {d.status === 'contatado' ? (
                                <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Contatado</Badge>
                              ) : (
                                <Button size="sm" className="bg-[#003580] hover:bg-[#002a66]" onClick={() => marcarContatado(d)}>
                                  Marcar contatado
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
