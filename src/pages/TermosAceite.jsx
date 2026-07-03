import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { authService } from '@/services/authService';
import { sendTermosConfirmacaoCliente, sendTermosNotificacaoEmpresa } from '@/services/emailService';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, MessageCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const TERMS_VERSION = '1.1';
const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

const TermosAceite = () => {
  const { user, updateUser, authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [aceitouWhatsapp, setAceitouWhatsapp] = useState(false);
  const [aceitouEmail, setAceitouEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userIp, setUserIp] = useState('desconhecido');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => setUserIp(d.ip))
      .catch(() => setUserIp('desconhecido'));
  }, []);

  const getHomeRoute = () => {
    if (!user) return '/login';
    if (user.perfil === 'CEO') return '/ceo';
    if (user.perfil === 'ADM') return '/admin';
    if (user.perfil === 'PARCEIRO') return '/parceiro';
    return '/select-segmento';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.aceite_termos === true) return <Navigate to={getHomeRoute()} replace />;

  const handleSubmit = async () => {
    if (!aceitouTermos) return;
    setIsSubmitting(true);
    try {
      const dataAceite = new Date().toISOString();
      const dataFormatada = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // 1. Atualiza os campos críticos do aceite
      await authService.updateUser(user.id, {
        aceite_termos: true,
        aceite_whatsapp: aceitouWhatsapp,
        aceite_email: aceitouEmail,
        data_aceite_termos: dataAceite,
      });

      // 1b. Campos extras (não bloqueiam se falharem)
      (async () => { try { await authService.updateUser(user.id, { ip_aceite: userIp, versao_termos: TERMS_VERSION }); } catch {} })();

      // 2. Registra log de auditoria (não bloqueia o fluxo)
      (async () => { try { await supabase.from('termos_log').insert({ user_id: user.id, versao_termos: TERMS_VERSION, ip_aceite: userIp, aceite_whatsapp: aceitouWhatsapp, aceite_email: aceitouEmail }); } catch {} })();

      // 3. Email de confirmação para o cliente (não bloqueia o fluxo em caso de erro)
      sendTermosConfirmacaoCliente({
        nomeCliente: user.name || user.email,
        emailCliente: user.email,
        versao: TERMS_VERSION,
        data: dataFormatada,
        aceitouWhatsapp,
        aceitouEmail,
      }).then(r => { if (!r.ok) console.error('[Termos] Email cliente falhou:', r.error); })
        .catch(err => console.error('[Termos] Email cliente exceção:', err));

      // 4. Notificação para a empresa
      sendTermosNotificacaoEmpresa({
        nomeCliente: user.name || user.email,
        emailCliente: user.email,
        versao: TERMS_VERSION,
        data: dataFormatada,
        ip: userIp,
        aceitouWhatsapp,
        aceitouEmail,
      }).then(r => { if (!r.ok) console.error('[Termos] Email empresa falhou:', r.error); })
        .catch(err => console.error('[Termos] Email empresa exceção:', err));

      updateUser({ ...user, aceite_termos: true, aceite_whatsapp: aceitouWhatsapp, aceite_email: aceitouEmail });
      navigate(getHomeRoute(), { replace: true });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar.', description: err?.message || JSON.stringify(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-8 pb-12 bg-soft-gradient overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <img src={logoUrl} alt="Ágil Seguros" className="h-20 w-auto object-contain mx-auto mb-6" />

        <div className="bg-white/95 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-white px-6 py-5 flex items-center gap-3">
            <div className="bg-[#003580]/10 p-2 rounded-xl shrink-0">
              <ShieldCheck className="h-7 w-7 text-[#003580]" />
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg leading-tight">Termos de Uso e Privacidade</h1>
              <p className="text-gray-500 text-xs mt-0.5">Versão {TERMS_VERSION} — Leia com atenção antes de continuar</p>
            </div>
          </div>

          {/* Termos */}
          <div className="px-6 py-4 max-h-72 overflow-y-auto text-sm text-gray-600 space-y-4 border-b border-gray-100 leading-relaxed">
            <div>
              <p className="font-semibold text-gray-800 mb-1">1. Controlador dos Dados</p>
              <p>A <strong>Ágil Seguros</strong> é a responsável pelo tratamento dos seus dados pessoais, atuando como controladora nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">2. Dados Coletados</p>
              <p>Coletamos dados de identificação pessoal (nome, CPF/CNPJ, data de nascimento, endereço, telefone e e-mail), dados de beneficiários vinculados e informações relativas às apólices de seguros contratadas, incluindo o endereço IP e data/hora de acesso para fins de segurança e auditoria.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">3. Finalidade e Base Legal do Tratamento</p>
              <p>Os dados são tratados com as seguintes bases legais: (a) <strong>execução contratual</strong> — gestão e administração de apólices de seguros; (b) <strong>obrigação legal</strong> — cumprimento de exigências regulatórias do setor de seguros; (c) <strong>legítimo interesse</strong> — segurança, prevenção a fraudes e melhoria do sistema; (d) <strong>consentimento</strong> — comunicações de marketing por WhatsApp ou e-mail, quando autorizado pelo titular.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">4. Compartilhamento e Transferência Internacional</p>
              <p>Seus dados poderão ser compartilhados com seguradoras, operadoras e prestadores de serviço essenciais à execução dos contratos. O sistema utiliza infraestrutura da <strong>Supabase Inc.</strong> (EUA) para banco de dados e da <strong>EmailJS Ltd.</strong> para envio de e-mails, ambos com políticas de adequação de dados compatíveis com a LGPD. Não vendemos nem cedemos seus dados a terceiros para fins comerciais.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">5. Segurança, Armazenamento e Retenção</p>
              <p>Adotamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado. Os dados de apólices ativas são mantidos pelo prazo contratual e por, no mínimo, <strong>5 anos</strong> após o encerramento, conforme exigido pelo Código Civil e normativas da SUSEP. Dados de acesso e auditoria são retidos por <strong>12 meses</strong>.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">6. Seus Direitos (LGPD)</p>
              <p>Você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou incorretos; solicitar a anonimização, bloqueio ou eliminação de dados desnecessários; revogar seu consentimento a qualquer momento. Para exercer esses direitos, entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail <strong>contato@segurosagil.com.br</strong>.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">7. Responsabilidade do Usuário</p>
              <p>O usuário é responsável pela veracidade das informações fornecidas e pela guarda de suas credenciais de acesso. Qualquer uso indevido das credenciais é de responsabilidade exclusiva do usuário.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">8. Limitação de Responsabilidade</p>
              <p>A Ágil Seguros adota todas as medidas de segurança razoáveis e proporcionais para proteção dos dados. Em caso de incidente de segurança causado por ataques externos, falhas de infraestrutura de terceiros ou ação dolosa de usuários não autorizados, a responsabilidade da Ágil Seguros estará limitada às obrigações previstas na LGPD, especialmente no que se refere à notificação da ANPD e dos titulares afetados. Situações de força maior, caso fortuito e atos de terceiros afastam a responsabilidade da empresa, nos termos dos artigos 393 e 927 do Código Civil Brasileiro.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">9. Encarregado de Dados (DPO)</p>
              <p>O Encarregado de Proteção de Dados da Ágil Seguros pode ser contactado pelo e-mail <strong>contato@segurosagil.com.br</strong>. Todas as solicitações relacionadas a dados pessoais serão respondidas no prazo de até <strong>15 dias úteis</strong>, conforme previsto na LGPD.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">10. Alterações nesta Política</p>
              <p>Reservamo-nos o direito de atualizar esta política a qualquer momento. Alterações relevantes implicarão novo aceite por parte do usuário na próxima vez que acessar o sistema.</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="px-6 py-5 space-y-4">
            {/* Obrigatório */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003580] cursor-pointer shrink-0"
              />
              <span className="text-sm text-gray-700 leading-snug">
                <strong>Li e aceito</strong> os Termos de Uso e a Política de Privacidade da Ágil Seguros, conforme a LGPD.{' '}
                <span className="text-red-500 font-semibold">*</span>
              </span>
            </label>

            {/* Opcional WhatsApp */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceitouWhatsapp}
                onChange={e => setAceitouWhatsapp(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003580] cursor-pointer shrink-0"
              />
              <span className="text-sm text-gray-600 leading-snug flex items-center gap-2 flex-wrap">
                <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
                Aceito receber comunicações e promoções por <strong>WhatsApp</strong>.{' '}
                <span className="text-gray-400 text-xs">(opcional)</span>
              </span>
            </label>

            {/* Opcional Email */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceitouEmail}
                onChange={e => setAceitouEmail(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003580] cursor-pointer shrink-0"
              />
              <span className="text-sm text-gray-600 leading-snug flex items-center gap-2 flex-wrap">
                <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                Aceito receber comunicações e promoções por <strong>E-mail</strong>.{' '}
                <span className="text-gray-400 text-xs">(opcional)</span>
              </span>
            </label>

            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Campo obrigatório para continuar.</p>

            <Button
              onClick={handleSubmit}
              disabled={!aceitouTermos || isSubmitting}
              className="w-full rounded-full font-bold text-white mt-2"
              style={{ background: aceitouTermos ? '#003580' : undefined }}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continuar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TermosAceite;
