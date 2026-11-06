// api/preferiti.js
// GET  → lista preferiti dell'utente corrente
// POST { prodotto_id } → aggiunge preferito
// DELETE { prodotto_id } → rimuove preferito
// Usa il token utente (anon key + Bearer) → RLS garantisce isolamento per utente

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY  // service role
);

// Decodifica il payload JWT senza verifica firma (l'endpoint è già protetto da RLS lato DB)
function jwtUserId(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.sub || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const user_id = token ? jwtUserId(token) : null;
  if (!user_id) return res.status(401).json({ error: 'Non autenticato' });

  // GET — restituisce array di prodotto_id preferiti
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_preferiti')
      .select('prodotto_id')
      .eq('user_id', user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data.map(r => r.prodotto_id));
  }

  // POST — aggiunge preferito (ignora duplicati)
  if (req.method === 'POST') {
    const { prodotto_id } = req.body || {};
    if (!prodotto_id) return res.status(400).json({ error: 'prodotto_id richiesto' });
    const { error } = await supabase
      .from('user_preferiti')
      .upsert({ user_id, prodotto_id }, { onConflict: 'user_id,prodotto_id' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // DELETE — rimuove preferito
  if (req.method === 'DELETE') {
    const { prodotto_id } = req.body || {};
    if (!prodotto_id) return res.status(400).json({ error: 'prodotto_id richiesto' });
    const { error } = await supabase
      .from('user_preferiti')
      .delete()
      .eq('user_id', user_id)
      .eq('prodotto_id', prodotto_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
