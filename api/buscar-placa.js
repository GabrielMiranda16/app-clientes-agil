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
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const text = await apiRes.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(502).json({ error: 'Resposta inválida da API' }); }
    return res.status(apiRes.ok ? 200 : apiRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
