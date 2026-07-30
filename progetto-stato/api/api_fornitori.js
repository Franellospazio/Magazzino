// api/fornitori.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // GET /api/fornitori?prodotto=DESCRIZIONE
  if (req.method === 'GET') {
    const { prodotto } = req.query;
    if (!prodotto) return res.status(400).json({ error: 'Parametro prodotto mancante' });

    const { data, error } = await supabase
      .from('prodotto_fornitori')
      .select('fornitore_id, ordine, fornitori(id, nome)')
      .eq('prodotto_descrizione', prodotto)
      .order('ordine', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const fornitori = data.map(row => ({
      id: row.fornitori.id,
      nome: row.fornitori.nome,
      ordine: row.ordine
    }));

    return res.status(200).json(fornitori);
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
