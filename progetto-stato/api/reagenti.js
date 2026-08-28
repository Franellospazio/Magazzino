// api/reagenti.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Ordina per anno-numero progressivo
function parseProgressivo(p) {
  const [y, n] = p.split('-').map(Number);
  return { y, n };
}
function cmpProgressivo(a, b) {
  const pa = parseProgressivo(a.progressivo);
  const pb = parseProgressivo(b.progressivo);
  return pa.y !== pb.y ? pa.y - pb.y : pa.n - pb.n;
}

// Stato: 0=aperto, 1=non aperto, 2=chiuso
function statoProgressivo(r) {
  if (r.data_chiusura) return 2;
  if (r.data_apertura) return 0;
  return 1;
}

export default async function handler(req, res) {

  // ── GET /api/reagenti ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { progressivo } = req.query;

    if (progressivo) {
      const { data, error } = await supabase
        .from('reagenti')
        .select('*')
        .eq('progressivo', progressivo)
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // Fetch TUTTI i reagenti (inclusi chiusi) con paginazione
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error } = await supabase
        .from('reagenti')
        .select('*')
        .order('nome_prodotto', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) return res.status(500).json({ error: error.message });
      if (!page || page.length === 0) break;
      allData = allData.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    // Fetch ordini (inclusa nota)
    const { data: ordini } = await supabase
      .from('reagenti_ordini')
      .select('nome_prodotto, inordine, nota');
    const ordiniMap = {};
    (ordini || []).forEach(o => {
      ordiniMap[o.nome_prodotto] = { inordine: o.inordine, nota: o.nota || '' };
    });

    // Raggruppa per nome_prodotto
    const gruppi = {};
    allData.forEach(r => {
      if (!gruppi[r.nome_prodotto]) {
        const ord = ordiniMap[r.nome_prodotto] || {};
        gruppi[r.nome_prodotto] = {
          nome_prodotto: r.nome_prodotto,
          scorta_minima: r.scorta_minima,
          inordine: ord.inordine || 0,
          nota: ord.nota || '',
          giacenza: 0,
          progressivi: []
        };
      }
      if (!r.data_chiusura) gruppi[r.nome_prodotto].giacenza++;
      gruppi[r.nome_prodotto].progressivi.push(r);
    });

    // Ordina progressivi: aperti → non aperti → chiusi, ognuno per progressivo asc
    Object.values(gruppi).forEach(g => {
      g.progressivi.sort((a, b) => {
        const sa = statoProgressivo(a);
        const sb = statoProgressivo(b);
        if (sa !== sb) return sa - sb;
        return cmpProgressivo(a, b);
      });
      // Fornitore: primo progressivo non chiuso
      const primo = g.progressivi.find(p => !p.data_chiusura) || g.progressivi[0];
      g.fornitore = primo?.fornitore || null;
    });

    const risultato = Object.values(gruppi).sort((a, b) => {
      // Prima quelli con nota, poi ordine alfabetico
      const aNota = a.nota ? 1 : 0;
      const bNota = b.nota ? 1 : 0;
      if (bNota !== aNota) return bNota - aNota;
      return a.nome_prodotto.localeCompare(b.nome_prodotto);
    });

    return res.status(200).json(risultato);
  }

  // ── PATCH /api/reagenti ───────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { progressivo, data_apertura, data_chiusura, scorta_minima, inordine, nota, nome_prodotto } = req.body;

    if ((inordine !== undefined || nota !== undefined) && nome_prodotto) {
      const upsertData = { nome_prodotto };
      if (inordine !== undefined) upsertData.inordine = inordine;
      if (nota !== undefined) upsertData.nota = nota;
      const { error } = await supabase
        .from('reagenti_ordini')
        .upsert(upsertData, { onConflict: 'nome_prodotto' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ message: 'Aggiornato' });
    }

    if (!progressivo) return res.status(400).json({ error: 'progressivo richiesto' });

    const updateData = {};
    if (data_apertura !== undefined) updateData.data_apertura = data_apertura;
    if (data_chiusura !== undefined) updateData.data_chiusura = data_chiusura;

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
