import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import ClienteSidebarLayout from '@/components/clienteTeste/ClienteSidebarLayout';
import { SERVICOS, SEGUROS, linkWhatsappProduto } from '@/components/clienteTeste/produtosAgil';

const entrada = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

const ProdutosAgilTestePage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet><title>Produtos Ágil - Ágil Seguros</title></Helmet>
      <ClienteSidebarLayout>
        <div className="space-y-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Produtos Ágil</h1>
            <p className="text-gray-400 text-sm">Seguros e serviços que você pode contratar com a Ágil.</p>
          </div>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-5">Seguros</h2>
            <p className="text-gray-400 text-sm -mt-3 mb-5">Cada seguro é um produto separado. Peça sua cotação pelo WhatsApp.</p>
            <motion.div
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {SEGUROS.map((s) => (
                <motion.a
                  key={s.slug}
                  variants={entrada}
                  href={linkWhatsappProduto(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-white border border-gray-100 hover:border-[#003580] rounded-2xl p-3 transition-colors"
                >
                  <img src={s.foto} alt="" loading="lazy" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-gray-900 text-sm">{s.nome}</span>
                    <span className="block text-xs text-gray-500 leading-relaxed mt-0.5">{s.resumo}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#003580] mt-1.5">
                      <MessageCircle className="w-3.5 h-3.5" /> Fazer cotação
                    </span>
                  </span>
                </motion.a>
              ))}
            </motion.div>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-5">Serviços</h2>
            <p className="text-gray-400 text-sm -mt-3 mb-5">Complementam seus seguros. O Ágil Data é exclusivo para quem tem plano de saúde.</p>
            <motion.div
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl"
            >
              {SERVICOS.map((s) => (
                <motion.button
                  key={s.slug}
                  variants={entrada}
                  onClick={() => navigate(`/produtos/${s.slug}/teste`)}
                  className="group text-left bg-white border border-gray-100 hover:border-[#003580] rounded-3xl overflow-hidden transition-colors"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                    <img src={s.foto} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <s.Icon className="w-5 h-5 text-[#003580]" />
                      <h3 className="font-bold text-gray-900">{s.nome}</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">{s.resumo}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003580]">
                      Conhecer <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </section>

        </div>
      </ClienteSidebarLayout>
    </>
  );
};

export default ProdutosAgilTestePage;
