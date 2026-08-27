// api/reagenti.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Ordina progressivi: prima per anno, poi per numero
function ordinaProgressivi(a, b) {
  const parse = p => {
    const [anno, num] = p.split('-').map(Number);
    return { anno, num };
  };
  const pa = parse(a.progressivo);
  const pb = parse(b.progressivo);
  if (pa.anno !== pb.anno) return pa.anno - pb.anno;
  return pa.num - pb.num;
}

export default async function handler(req, res) {

  // ── GET /api/reagenti ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { progressivo } = req.query;

    // Dettaglio singolo progressivo
    if (progressivo) {
      const { data, error } = await supabase
        .from('reagenti')
        .select('*')
        .eq('progressivo', progressivo)
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // Fetch tutti i reagenti attivi con paginazione
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error } = await supabase
        .from('reagenti')
        .select('*')
        .is('data_chiusura', null)
        .order('nome_prodotto', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) return res.status(500).json({ error: error.message });
      if (!page || page.length === 0) break;
      allData = allData.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    // Fetch ordini
    const { data: ordini } = await supabase
      .from('reagenti_ordini')
      .select('nome_prodotto, inordine');
    const ordiniMap = {};
    (ordini || []).forEach(o => { ordiniMap[o.nome_prodotto] = o.inordine; });

    // Raggruppa per nome_prodotto
    const gruppi = {};
    allData.forEach(r => {
      if (!gruppi[r.nome_prodotto]) {
        gruppi[r.nome_prodotto] = {
          nome_prodotto: r.nome_prodotto,
          scorta_minima: r.scorta_minima,
          inordine: ordiniMap[r.nome_prodotto] || 0,
          giacenza: 0,
          progressivi: []
        };
      }
      gruppi[r.nome_prodotto].giacenza++;
      gruppi[r.nome_prodotto].progressivi.push(r);
    });

    // Ordina progressivi dentro ogni gruppo
    Object.values(gruppi).forEach(g => {
      g.progressivi.sort(ordinaProgressivi);
      // Fornitore del gruppo = fornitore del primo progressivo
      g.fornitore = g.progressivi[0]?.fornitore || null;
    });

    const risultato = Object.values(gruppi).sort((a, b) =>
      a.nome_prodotto.localeCompare(b.nome_prodotto)
    );

    return res.status(200).json(risultato);
  }

  // ── PATCH /api/reagenti ───────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { progressivo, data_apertura, data_chiusura, scorta_minima, inordine, nome_prodotto } = req.body;

    // Aggiorna inordine (a livello di nome_prodotto)
    if (inordine !== undefined && nome_prodotto) {
      const { error } = await supabase
        .from('reagenti_ordini')
        .upsert({ nome_prodotto, inordine }, { onConflict: 'nome_prodotto' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ message: 'In ordine aggiornato' });
    }

    if (!progressivo) return res.status(400).json({ error: 'progressivo richiesto' });

    const updateData = {};
    if (data_apertura !== undefined) updateData.data_apertura = data_apertura;
    if (data_chiusura !== undefined) updateData.data_chiusura = data_chiusura;

    // scorta_minima si aggiorna su TUTTI i progressivi dello stesso prodotto
    if (scorta_minima !== undefined) {
      const { data: prod } = await supabase
        .from('reagenti')
        .select('nome_prodotto')
        .eq('progressivo', progressivo)
        .single();
      if (prod) {
        await supabase
          .from('reagenti')
          .update({ scorta_minima })
          .eq('nome_prodotto', prod.nome_prodotto);
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('reagenti')
        .update(updateData)
        .eq('progressivo', progressivo);
      if (error) return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Reagente aggiornato' });
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
