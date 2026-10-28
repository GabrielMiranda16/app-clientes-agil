import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Phone, Mail, CheckCircle2, Building2, Users, MapPin, ChevronDown, RotateCcw } from 'lucide-react';

const LEADS_FICTICIOS = [
  { id: 1, empresa: 'TechNova Soluções Ltda', setor: 'TI', funcionarios: 18, cidade: 'São Paulo, SP', telefone: '11987654321', email: 'contato@technova.com.br', contato: 'Marcos' },
  { id: 2, empresa: 'Estúdio Pixel Design', setor: 'Publicidade', funcionarios: 7, cidade: 'Campinas, SP', telefone: '19987651234', email: 'financeiro@pixeldesign.com.br', contato: 'Carla' },
  { id: 3, empresa: 'Advocacia Ferreira & Souza', setor: 'Jurídico', funcionarios: 12, cidade: 'São Paulo, SP', telefone: '11912345678', email: 'adm@ferreirasouza.adv.br', contato: 'Ricardo' },
  { id: 4, empresa: 'Arquitetos Associados SP', setor: 'Arquitetura', funcionarios: 9, cidade: 'Santo André, SP', telefone: '11998765432', email: 'contato@arquitetosassociados.com.br', contato: 'Fernanda' },
  { id: 5, empresa: 'LogExpress Transportes', setor: 'Transporte', funcionarios: 34, cidade: 'Guarulhos, SP', telefone: '11955554444', email: 'rh@logexpress.com.br', contato: 'Paulo' },
];

const TEMPLATES_EMAIL = {
  primeiro_contato: {
    label: 'Primeiro contato',
    assunto: (empresa) => `Plano de saúde empresarial para ${empresa} — Ágil Seguros`,
    corpo: (lead) =>
      `Olá, ${lead.contato}!\n\n` +
      `Meu nome é [seu nome], sou corretor(a) da Ágil Seguros. Vi que a ${lead.empresa} atua no setor de ${lead.setor} e gostaria de saber como está o plano de saúde oferecido aos funcionários hoje.\n\n` +
      `Trabalhamos com diversas operadoras (Amil, Unimed, Hapvida, Bradesco e outras) e conseguimos montar uma comparação gratuita e sem compromisso — muitas empresas do porte de vocês acabam economizando ou melhorando a rede credenciada.\n\n` +
      `Podemos conversar rapidamente sobre isso?\n\nAbraço,\nÁgil Seguros`,
  },
  resposta_positiva: {
    label: 'Resposta positiva (pediu cotação)',
    assunto: (empresa) => `Cotação de plano de saúde — ${empresa}`,
    corpo: (lead) =>
      `Olá, ${lead.contato}!\n\n` +
      `Que ótimo que topou ver a cotação! Para montar a comparação certa pra ${lead.empresa}, preciso confirmar algumas informações:\n\n` +
      `- Número de funcionários que entrariam no plano\n` +
      `- Se já possuem plano de saúde hoje (qual operadora e valor atual)\n` +
      `- Faixa etária aproximada do grupo\n\n` +
      `Com isso em mãos, te envio a comparação em até 1 dia útil.\n\nAbraço,\nÁgil Seguros`,
  },
  follow_up: {
    label: 'Follow-up (sem resposta)',
    assunto: (empresa) => `Ainda disponível — cotação de plano de saúde para ${empresa}`,
    corpo: (lead) =>
      `Olá, ${lead.contato}!\n\n` +
      `Só retomando o contato sobre o plano de saúde empresarial — fico à disposição caso surja interesse, sem nenhum compromisso.\n\n` +
      `Qualquer dúvida, pode me chamar por aqui mesmo.\n\nAbraço,\nÁgil Seguros`,
  },
};

export default function ProspeccaoTestePage() {
  const [leads, setLeads] = useState(LEADS_FICTICIOS.map(l => ({ ...l, status: 'nao_contatado' })));

  const marcarContatado = (id) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'contatado' } : l));
  };

  const reabrir = (id) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'nao_contatado' } : l));
  };

  const abrirEmail = (lead, templateKey) => {
    const tpl = TEMPLATES_EMAIL[templateKey];
    const assunto = encodeURIComponent(tpl.assunto(lead.empresa));
    const corpo = encodeURIComponent(tpl.corpo(lead));
    window.location.href = `mailto:${lead.email}?subject=${assunto}&body=${corpo}`;
  };

  return (
    <DashboardLayout title="Prospecção (Teste)">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Prospecção — Saúde Empresarial (Teste)</h1>
          <p className="text-white/70 text-sm">Página de teste com dados fictícios — ainda não conectada à planilha real de leads.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#003580]" />
                    {lead.empresa}
                  </CardTitle>
                  <Badge className={lead.status === 'contatado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                    {lead.status === 'contatado' ? 'Contatado' : 'Não contatado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> {lead.setor} · {lead.funcionarios} funcionários</div>
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {lead.cidade}</div>
                  <div className="text-xs text-gray-400">Contato: {lead.contato}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${lead.telefone}`}>
                      <Phone className="w-3.5 h-3.5 mr-1" /> Ligar
                    </a>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Mail className="w-3.5 h-3.5 mr-1" /> E-mail <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {Object.entries(TEMPLATES_EMAIL).map(([key, tpl]) => (
                        <DropdownMenuItem key={key} onClick={() => abrirEmail(lead, key)}>
                          {tpl.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {lead.status === 'contatado' ? (
                    <Button size="sm" variant="ghost" onClick={() => reabrir(lead.id)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reabrir
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-[#003580] hover:bg-[#002a66]" onClick={() => marcarContatado(lead.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar contatado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
