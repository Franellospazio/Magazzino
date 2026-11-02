// api/salva-richiesta.js
// POST { prodotto, operatore, nota } → inserisce record in access_log
// Usa la service role key → sempre funzionante indipendentemente da RLS
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY   // service role
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const { prodotto, operatore, nota } = req.body || {};
  if (!prodotto) return res.status(400).json({ error: 'Campo prodotto richiesto' });

  const details = `Richiesta acquisto: ${prodotto}${nota ? ' — ' + nota : ''}`;

  const { error } = await supabase
    .from('access_log')
    .insert({
      email: operatore || null,
      action: 'richiesta_acquisto',
      details,
    });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
