import React, { createContext, useContext, useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage('selectedCompanyId', null);
  // CEO/ADM "visualizando como cliente" — não persiste, some ao recarregar a página ou sair
  const [isViewingAsClient, setIsViewingAsClient] = useState(false);

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