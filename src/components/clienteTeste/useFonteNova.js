import { useEffect } from 'react';

const FONTE = "'DM Sans', sans-serif";
let usos = 0;
let anterior = '';

export const useFonteNova = () => {
  useEffect(() => {
    if (usos === 0) {
      anterior = document.body.style.fontFamily;
      document.body.style.fontFamily = FONTE;
    }
    usos += 1;
    return () => {
      usos -= 1;
      if (usos === 0) document.body.style.fontFamily = anterior;
    };
  }, []);
};
