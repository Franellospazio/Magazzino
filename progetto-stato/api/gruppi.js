// api/gruppi.js — gestione gruppi di equivalenza reagenti
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  // GET — lista tutti i gruppi con i loro membri e giacenza aggregata
  if (req.method === 'GET') {
    const { data: gruppi, error } = await supabase
      .from('reagenti_gruppi')
      .select('*, reagenti_gruppi_membri(nome_prodotto)');
    if (error) return res.status(500).json({ error: error.message });

    // Per ogni gruppo calcola giacenza totale
    const nomiMembri = gruppi.flatMap(g => g.reagenti_gruppi_membri.map(m => m.nome_prodotto));
    const { data: reagenti } = await supabase
      .from('reagenti')
      .select('nome_prodotto')
      .is('data_chiusura', null)
      .in('nome_prodotto', nomiMembri.length > 0 ? nomiMembri : ['__noop__']);

    const giacenzeMap = {};
    (reagenti || []).forEach(r => {
      giacenzeMap[r.nome_prodotto] = (giacenzeMap[r.nome_prodotto] || 0) + 1;
    });

    const result = gruppi.map(g => {
      const membri = g.reagenti_gruppi_membri.map(m => m.nome_prodotto);
      const giacenzaTotale = membri.reduce((sum, n) => sum + (giacenzeMap[n] || 0), 0);
      return {
        id: g.id,
        nome: g.nome,
        scorta_minima: g.scorta_minima,
        membri,
        giacenza_totale: giacenzaTotale,
        sottoscorta: giacenzaTotale < g.scorta_minima
      };
    });

    return res.status(200).json(result);
  }

  // POST — crea nuovo gruppo
  if (req.method === 'POST') {
    const { nome, scorta_minima, membri } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome richiesto' });

    const { data: gruppo, error } = await supabase
      .from('reagenti_gruppi')
      .insert({ nome, scorta_minima: scorta_minima || 0 })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (membri && membri.length > 0) {
      await supabase.from('reagenti_gruppi_membri').insert(
        membri.map(m => ({ gruppo_id: gruppo.id, nome_prodotto: m }))
      );
    }
    return res.status(201).json(gruppo);
  }

  // PATCH — modifica gruppo (nome, scorta_minima, membri)
  if (req.method === 'PATCH') {
    const { id, nome, scorta_minima, aggiungi_membri, rimuovi_membri } = req.body;
    if (!id) return res.status(400).json({ error: 'id richiesto' });

    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (scorta_minima !== undefined) update.scorta_minima = scorta_minima;

    if (Object.keys(update).length > 0) {
      await supabase.from('reagenti_gruppi').update(update).eq('id', id);
    }
    if (aggiungi_membri && aggiungi_membri.length > 0) {
      await supabase.from('reagenti_gruppi_membri').insert(
        aggiungi_membri.map(m => ({ gruppo_id: id, nome_prodotto: m }))
      );
    }
    if (rimuovi_membri && rimuovi_membri.length > 0) {
      await supabase.from('reagenti_gruppi_membri')
        .delete().eq('gruppo_id', id).in('nome_prodotto', rimuovi_membri);
    }
    return res.status(200).json({ message: 'Aggiornato' });
  }

  // DELETE — elimina gruppo
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id richiesto' });
    await supabase.from('reagenti_gruppi').delete().eq('id', id);
    return res.status(200).json({ message: 'Eliminato' });
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
