const BOT_UA = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|googlebot|bingbot|applebot|ia_archiver/i;

const SEG_LABEL = {
  AUTO: 'Auto', SAUDE: 'Saúde', RESIDENCIAL: 'Residencial',
  EMPRESARIAL: 'Empresarial', ODONTOLOGICO: 'Odontológico', VIAGEM: 'Viagem',
  PET_SAUDE: 'Pet Saúde', PET_SEGURO: 'Pet Seguro', VIDA: 'Vida',
  FROTA: 'Frota', CARGAS: 'Cargas', EQUIPAMENTOS: 'Equipamentos',
  SAUDE_VIDA_ODONTO: 'Saúde, Vida e Odonto', AUTO_FROTA: 'Auto e Frota',
};

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const config = { matcher: ['/orcamento/:path*'] };

export default async function middleware(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/orcamento\/([^/]+)$/);
  if (!match) return;

  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return;

  const slug = match[1];
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  let title = 'Orçamento pronto — Ágil Seguros';
  let desc = 'Clique para visualizar seu orçamento de seguro personalizado preparado pela Ágil Seguros.';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orcamentos?slug=eq.${encodeURIComponent(slug)}&select=cliente_nome,segmento,operadora_escolhida`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
    );
    const [o] = await res.json();
    if (o) {
      const seg = SEG_LABEL[o.segmento] || o.segmento;
      const nome = o.cliente_nome?.split(' ')[0] || '';
      title = `Orçamento de ${seg} — Ágil Seguros`;
      desc = `${nome ? `Olá, ${nome}! ` : ''}Seu orçamento de ${seg}${o.operadora_escolhida ? ` com ${o.operadora_escolhida}` : ''} está pronto. Toque para ver as propostas.`;
    }
  } catch { /* silencioso — deixa o SPA lidar */ }

  const OG_IMAGE = 'https://www.agilseguros.app/og-agil.png';
  const pageUrl = `https://www.agilseguros.app/orcamento/${slug}`;

  return new Response(
    `<!doctype html><html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ágil Seguros">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${OG_IMAGE}">
</head><body></body></html>`,
    { headers: { 'content-type': 'text/html;charset=utf-8' } }
  );
}
