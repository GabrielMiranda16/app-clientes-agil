import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const VERSAO = '2026-11-11';

const AceiteLgpd = ({ modulo, email, onRecusar, children }) => {
  const [estado, setEstado] = useState('verificando');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase
      .from('aceites_lgpd')
      .select('id')
      .eq('modulo', modulo)
      .eq('versao', VERSAO)
      .limit(1)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setEstado('pendente');
        else setEstado(data?.length ? 'aceito' : 'pendente');
      });
    return () => { ativo = false; };
  }, [modulo]);

  const aceitar = async () => {
    setSalvando(true);
    const { error } = await supabase.from('aceites_lgpd').insert([{ modulo, versao: VERSAO, email }]);
    setSalvando(false);
    if (!error || error.code === '23505') setEstado('aceito');
  };

  if (estado === 'aceito') return children;

  return (
    <>
      {estado === 'verificando' && (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#003580]" />
        </div>
      )}
      <Dialog open={estado === 'pendente'} onOpenChange={(open) => { if (!open) onRecusar(); }}>
        <DialogContent className="bg-white sm:max-w-md" style={{ fontFamily: "'DM Sans', sans-serif", '--background': '0 0% 100%' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#003580]" /> Proteção de dados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-600">
            <p>Os atestados contêm <strong className="text-gray-900">dados pessoais sensíveis de saúde</strong>, protegidos pela Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Use essas informações só para a gestão de afastamentos e as obrigações trabalhistas e previdenciárias.</li>
              <li>Não compartilhe atestados, CIDs ou relatórios com pessoas que não precisam deles.</li>
              <li>A empresa não pode exigir o CID do funcionário. Ele só aparece se o paciente autorizar.</li>
            </ul>
            <p className="text-xs text-gray-400">Seu aceite fica registrado com data e hora.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onRecusar}>Voltar</Button>
            <Button className="bg-[#003580] hover:bg-[#002060] text-white" disabled={salvando} onClick={aceitar}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Estou ciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AceiteLgpd;
