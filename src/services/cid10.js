import { useEffect, useState } from 'react';

let promessa = null;

const carregar = () => {
  if (!promessa) {
    promessa = fetch('/cid10.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  }
  return promessa;
};

export const descricaoDoCid = (mapa, cid) => {
  if (!mapa || !cid) return null;
  const chave = String(cid).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return mapa[chave] || mapa[chave.slice(0, 3)] || null;
};

export const useCid10 = () => {
  const [mapa, setMapa] = useState(null);
  useEffect(() => {
    let ativo = true;
    carregar().then((m) => { if (ativo) setMapa(m); });
    return () => { ativo = false; };
  }, []);
  return (cid) => descricaoDoCid(mapa, cid);
};
