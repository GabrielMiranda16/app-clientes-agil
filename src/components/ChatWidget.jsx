import React, { useEffect } from 'react';

// Bump sempre que o visual/comportamento da Gi mudar: navegadores particionam
// o cache HTTP por site de origem pra recursos de terceiros, entao um header
// Cache-Control novo no servidor da Gi nao alcanca uma copia ja cacheada aqui
// antes dele existir. Trocar a query string forca buscar de novo.
const GI_WIDGET_URL = 'https://agil-seguros.fly.dev/static/widget.js?v=2';

const ChatWidget = () => {
  useEffect(() => {
    if (window.__giChatLoaded) return;

    const script = document.createElement('script');
    script.src = GI_WIDGET_URL;
    script.async = true;
    script.onerror = () => console.error('Gi Chat Widget: não foi possível conectar ao servidor.');
    document.body.appendChild(script);
  }, []);

  return null;
};

export default ChatWidget;
