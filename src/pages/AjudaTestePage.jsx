import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Bot, MessageCircle } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';

const FAQ_ITEMS = [
  { pergunta: 'Onde vejo minha apólice?', resposta: 'No menu "Meus Seguros", escolha o segmento desejado e depois a apólice. Lá você vê status, vigência e pode baixar o contrato.' },
  { pergunta: 'Como baixo minha apólice ou boletos?', resposta: 'Dentro da apólice, use os botões de download do contrato e, quando disponível, dos boletos mensais.' },
  { pergunta: 'Onde vejo minha coparticipação?', resposta: 'No menu "Coparticipação" você encontra o relatório mensal por beneficiário, com opção de exportar em PDF ou Excel.' },
  { pergunta: 'Como incluo ou excluo um beneficiário?', resposta: 'No menu "Beneficiários", clique no beneficiário desejado (ou use o botão de inclusão) para abrir uma solicitação — nossa equipe cuida do resto.' },
  { pergunta: 'Esqueci minha senha, como faço?', resposta: 'Na tela de login, clique em "Esqueci minha senha" — ou use o botão "Esqueceu sua senha?" dentro de Alterar Senha, no menu lateral. Enviaremos uma nova senha pro seu e-mail.' },
  { pergunta: 'Quero saber o telefone de uma seguradora', resposta: 'Veja o menu "Seguradoras" — lá está o telefone e o site de cada operadora parceira.' },
];

const AjudaTestePage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet><title>Ajuda - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-8 max-w-2xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Ajuda</h1>
            <p className="text-gray-400 text-sm">Dúvidas comuns sobre o portal</p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.pergunta} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                <p className="font-bold text-[#003580] text-sm mb-1.5">{item.pergunta}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.resposta}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">Não encontrou o que procurava?</p>
              <p className="text-xs text-gray-400">Fale com a Gi ou com seu corretor</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/fale-com-a-gi/teste')}
                className="flex items-center gap-1.5 border border-[#003580] text-[#003580] text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#003580] hover:text-white transition-colors"
              >
                <Bot className="w-3.5 h-3.5" /> Fale com a Gi
              </button>
              <a
                href="https://wa.me/5511999996863?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20portal%20da%20%C3%81gil%20Seguros."
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#003580] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#002060] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Corretor
              </a>
            </div>
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default AjudaTestePage;
