export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { placa } = req.body || {};
  if (!placa || placa.length < 7) return res.status(400).json({ error: 'Placa inválida' });

  const token = process.env.APIPLACAS_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token não configurado' });

  try {
    const apiRes = await fetch(`https://apiplacas.com.br/api/v1/placa/${placa.toUpperCase()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://apiplacas.com.br/',
        'Origin': 'https://apiplacas.com.br',
      },
    });
    const text = await apiRes.text();
    console.log('ApiPlacas status:', apiRes.status, 'body:', text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch {
      return res.status(502).json({ error: 'Resposta inválida da API', raw: text.slice(0, 200) });
    }
    return res.status(apiRes.ok ? 200 : apiRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
