import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

const CompanyContext = createContext();
const VIEWING_KEY = 'isViewingAsClient';

export function CompanyProvider({ children }) {
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage('selectedCompanyId', null);
  // CEO/ADM "visualizando como cliente" — sobrevive ao F5 (sessionStorage), some ao fechar a aba ou sair
  const [isViewingAsClient, setViewingState] = useState(() => {
    try { return sessionStorage.getItem(VIEWING_KEY) === '1'; } catch { return false; }
  });
  const setIsViewingAsClient = useCallback((valor) => {
    setViewingState(valor);
    try {
      if (valor) sessionStorage.setItem(VIEWING_KEY, '1');
      else sessionStorage.removeItem(VIEWING_KEY);
    } catch { /* ignora */ }
  }, []);

  const value = {
    selectedCompanyId,
    setSelectedCompanyId,
    isViewingAsClient,
    setIsViewingAsClient,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};