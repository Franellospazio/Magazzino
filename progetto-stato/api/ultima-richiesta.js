// api/ultima-richiesta.js
// GET ?prodotto=<nome> → restituisce data/email dell'ultima richiesta acquisto per quel prodotto
// Usa la service role key → bypassa RLS → visibile a tutti gli operatori
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY   // service role
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo non consentito' });

  const prodotto = req.query.prodotto;
  if (!prodotto) return res.status(400).json({ error: 'Parametro prodotto richiesto' });

  const { data, error } = await supabase
    .from('access_log')
    .select('created_at, email')
    .eq('action', 'richiesta_acquisto')
    .ilike('details', `%${prodotto}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(200).json({ richiesta: null });

  return res.status(200).json({
    richiesta: {
      quando: data[0].created_at,
      chi: data[0].email,
    }
  });
}
