// api/fornitori.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  // GET /api/fornitori?prodotto=DESCRIZIONE  → fornitori associati al prodotto
  // GET /api/fornitori?tutti=1               → tutti i fornitori disponibili
  if (req.method === 'GET') {
    if (req.query.tutti) {
      const { data, error } = await supabase
        .from('fornitori')
        .select('id, nome')
        .order('nome', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    const { prodotto } = req.query;
    if (!prodotto) return res.status(400).json({ error: 'Parametro prodotto mancante' });

    const { data, error } = await supabase
      .from('prodotto_fornitori')
      .select('fornitore_id, ordine, fornitori(id, nome)')
      .eq('prodotto_descrizione', prodotto)
      .order('ordine', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(data.map(row => ({
      id: row.fornitori.id,
      nome: row.fornitori.nome,
      ordine: row.ordine
    })));
  }

  // POST /api/fornitori  → aggiunge nuovo fornitore globale { nome }
  if (req.method === 'POST') {
    const { nome, prodotto, fornitore_id, ordine } = req.body;

    // Aggiunge fornitore globale
    if (nome && !prodotto) {
      const { data, error } = await supabase
        .from('fornitori')
        .insert({ nome })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // Associa fornitore a prodotto
    if (prodotto && fornitore_id) {
      // Calcola prossimo ordine
      const { data: existing } = await supabase
        .from('prodotto_fornitori')
        .select('ordine')
        .eq('prodotto_descrizione', prodotto)
        .order('ordine', { ascending: false })
        .limit(1);
      const nextOrdine = existing && existing.length > 0 ? existing[0].ordine + 1 : 1;

      const { error } = await supabase
        .from('prodotto_fornitori')
        .insert({ prodotto_descrizione: prodotto, fornitore_id, ordine: ordine ?? nextOrdine });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ message: 'Associazione aggiunta' });
    }

    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  // PATCH /api/fornitori → aggiorna ordine associazione { prodotto, fornitore_id, ordine }
  if (req.method === 'PATCH') {
    const { prodotto, fornitore_id, ordine } = req.body;
    if (!prodotto || !fornitore_id || ordine === undefined)
      return res.status(400).json({ error: 'Parametri mancanti' });

    const { error } = await supabase
      .from('prodotto_fornitori')
      .update({ ordine })
      .eq('prodotto_descrizione', prodotto)
      .eq('fornitore_id', fornitore_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Ordine aggiornato' });
  }

  // DELETE /api/fornitori → rimuove associazione { prodotto, fornitore_id }
  if (req.method === 'DELETE') {
    const { prodotto, fornitore_id } = req.body;
    if (!prodotto || !fornitore_id)
      return res.status(400).json({ error: 'Parametri mancanti' });

    const { error } = await supabase
      .from('prodotto_fornitori')
      .delete()
      .eq('prodotto_descrizione', prodotto)
      .eq('fornitore_id', fornitore_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Associazione rimossa' });
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
