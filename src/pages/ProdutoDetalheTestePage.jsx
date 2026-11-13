import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, MessageCircle } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import { SERVICOS, linkWhatsappProduto } from '@/components/clienteTeste/produtosAgil';

const ProdutoDetalheTestePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const servico = SERVICOS.find((s) => s.slug === slug);

  if (!servico) {
    return (
      <ClienteSidebarLayout>
        <p className="text-gray-400">Produto não encontrado.</p>
      </ClienteSidebarLayout>
    );
  }

  const outros = SERVICOS.filter((s) => s.slug !== slug);

  return (
    <>
      <Helmet><title>{servico.nome} - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-8 max-w-5xl">
          <button
            onClick={() => navigate('/produtos/teste')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#003580] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Produtos Ágil
          </button>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
          >
            <div className="aspect-[4/3] rounded-[32px] overflow-hidden bg-gray-100">
              <img src={servico.foto} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <servico.Icon className="w-6 h-6 text-[#003580]" />
                <span className="text-sm font-semibold text-[#003580]">Produtos Ágil</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-gray-900 mb-4">
                <span className="font-bold text-[#003580]">{servico.nome}</span>
              </h1>
              <p className="text-gray-500 leading-relaxed mb-6">{servico.descricao}</p>
              <a
                href={linkWhatsappProduto(servico)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#003580] hover:bg-[#002060] text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Contrate agora
              </a>
              <p className="text-xs text-gray-400 mt-3">{servico.para}</p>
            </div>
          </motion.div>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-5">O que está incluído</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {servico.itens.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-[#003580]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#003580]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-4">Outros serviços</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {outros.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => navigate(`/produtos/${s.slug}/teste`)}
                  className="group flex items-center gap-4 bg-white border border-gray-100 hover:border-[#003580] rounded-2xl p-3 text-left transition-colors"
                >
                  <img src={s.foto} alt="" loading="lazy" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-bold text-gray-900 text-sm">{s.nome}</span>
                    <span className="block text-xs text-gray-500 leading-relaxed mt-0.5">{s.resumo}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default ProdutoDetalheTestePage;
