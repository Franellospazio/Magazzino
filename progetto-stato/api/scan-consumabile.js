// api/scan-consumabile.js
// POST { nome_prodotto } → -1 giacenza su Magazzino, log in access_log
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user } } = await supabase.auth.getUser(auth.split(' ')[1]);
  return user || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });

  const { nome_prodotto } = req.body;
  if (!nome_prodotto) return res.status(400).json({ error: 'nome_prodotto richiesto' });

  // Leggi giacenza attuale
  const { data: prodotto, error: errRead } = await supabase
    .from('Magazzino')
    .select('nome_prodotto, giacenza, scorta_minima, unita')
    .eq('nome_prodotto', nome_prodotto)
    .single();

  if (errRead || !prodotto) return res.status(404).json({ error: 'Prodotto non trovato' });
  if (prodotto.giacenza <= 0) return res.status(409).json({ error: 'Giacenza esaurita', giacenza: 0 });

  const nuovaGiacenza = prodotto.giacenza - 1;

  // Aggiorna giacenza
  const { error: errUpdate } = await supabase
    .from('Magazzino')
    .update({ giacenza: nuovaGiacenza })
    .eq('nome_prodotto', nome_prodotto);

  if (errUpdate) return res.status(500).json({ error: errUpdate.message });

  // Log accesso
  await supabase.from('access_log').insert({
    user_id: user.id,
    email: user.email,
    action: 'scan_consumabile',
    details: `Prelievo QR: ${nome_prodotto} (giacenza: ${prodotto.giacenza} → ${nuovaGiacenza})`,
  }).then(() => {});

  const sottoscorta = prodotto.scorta_minima != null && nuovaGiacenza < prodotto.scorta_minima;

  return res.status(200).json({
    nome_prodotto,
    giacenza_precedente: prodotto.giacenza,
    giacenza_attuale: nuovaGiacenza,
    scorta_minima: prodotto.scorta_minima,
    sottoscorta,
    unita: prodotto.unita || 'pz',
  });
}
