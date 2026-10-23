// api/lookup.js — Lookup batch: data una lista di valori (CAS / nome / lotto / id_sepack)
// restituisce tutti i progressivi associati con i loro dati completi.
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

  // Autenticazione obbligatoria
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });

  // Body: { tipo: 'cas'|'nome_prodotto'|'lotto'|'id_sepack', valori: string[] }
  const { tipo, valori } = req.body;

  const tipiValidi = ['cas', 'nome_prodotto', 'lotto', 'id_sepack'];
  if (!tipiValidi.includes(tipo)) {
    return res.status(400).json({ error: `tipo non valido. Usa: ${tipiValidi.join(', ')}` });
  }
  if (!Array.isArray(valori) || valori.length === 0) {
    return res.status(400).json({ error: 'valori[] richiesto e non vuoto' });
  }
  if (valori.length > 500) {
    return res.status(400).json({ error: 'Massimo 500 valori per chiamata' });
  }

  // Normalizza valori (trim, no vuoti, no duplicati)
  const valoriPuliti = [...new Set(valori.map(v => v.trim()).filter(Boolean))];

  // ── Query reagenti ────────────────────────────────────────────────────────
  const { data: reagenti, error } = await supabase
    .from('reagenti')
    .select('progressivo, nome_prodotto, tipo, id_sepack, fornitore, lotto, scadenza_sepack, posizione, misl, data_apertura, data_chiusura, scorta_minima, cas')
    .in(tipo, valoriPuliti);

  if (error) return res.status(500).json({ error: error.message });
  if (!reagenti || reagenti.length === 0) {
    return res.status(200).json({ trovati: 0, non_trovati: valoriPuliti, prodotti: [] });
  }

  // ── Arricchisci con ordini e gruppi ───────────────────────────────────────
  const nomiTrovati = [...new Set(reagenti.map(r => r.nome_prodotto))];

  const [{ data: ordini }, { data: membriGruppi }] = await Promise.all([
    supabase
      .from('reagenti_ordini')
      .select('nome_prodotto, inordine, nota, unita, volume_per_unita, fornitori(nome)')
      .in('nome_prodotto', nomiTrovati),
    supabase
      .from('reagenti_gruppi_membri')
      .select('nome_prodotto, contributo_per_unita, reagenti_gruppi(nome, scorta_minima, unita)')
      .in('nome_prodotto', nomiTrovati),
  ]);

  const ordiniMap = {};
  (ordini || []).forEach(o => {
    ordiniMap[o.nome_prodotto] = {
      inordine: o.inordine || 0,
      nota: o.nota || '',
      unita: o.unita || 'pz',
      volume_per_unita: o.volume_per_unita || 1,
      fornitore_ordine: o.fornitori?.nome || '',
    };
  });

  const gruppiMap = {};
  (membriGruppi || []).forEach(m => {
    gruppiMap[m.nome_prodotto] = {
      gruppo_nome: m.reagenti_gruppi?.nome || '',
      gruppo_scorta_minima: m.reagenti_gruppi?.scorta_minima ?? '',
      gruppo_unita: m.reagenti_gruppi?.unita || 'pz',
      contributo_per_unita: m.contributo_per_unita || 1,
    };
  });

  // ── Raggruppa progressivi per prodotto ───────────────────────────────────
  const prodottiMap = {};
  reagenti.forEach(r => {
    if (!prodottiMap[r.nome_prodotto]) {
      const ord = ordiniMap[r.nome_prodotto] || {};
      const grp = gruppiMap[r.nome_prodotto] || {};
      prodottiMap[r.nome_prodotto] = {
        nome_prodotto: r.nome_prodotto,
        cas: r.cas || '',
        scorta_minima: r.scorta_minima ?? '',
        unita: ord.unita || 'pz',
        volume_per_unita: ord.volume_per_unita || 1,
        inordine: ord.inordine || 0,
        nota: ord.nota || '',
        fornitore_ordine: ord.fornitore_ordine || '',
        gruppo_nome: grp.gruppo_nome || '',
        gruppo_scorta_minima: grp.gruppo_scorta_minima ?? '',
        gruppo_unita: grp.gruppo_unita || '',
        chiave_cercata: r[tipo],  // il valore con cui è stato trovato
        giacenza_aperta: 0,
        giacenza_totale: 0,
        progressivi: [],
      };
    }
    const p = prodottiMap[r.nome_prodotto];
    p.giacenza_totale++;
    if (!r.data_chiusura) p.giacenza_aperta++;

    let stato = 'non_aperto';
    if (r.data_chiusura) stato = 'chiuso';
    else if (r.data_apertura) stato = 'aperto';

    p.progressivi.push({
      progressivo: r.progressivo,
      tipo: r.tipo || '',
      id_sepack: r.id_sepack || '',
      fornitore: r.fornitore || '',
      lotto: r.lotto || '',
      cas: r.cas || '',
      scadenza: r.scadenza_sepack || '',
      posizione: r.posizione || '',
      misl: r.misl || '',
      data_apertura: r.data_apertura ? r.data_apertura.split('T')[0] : '',
      data_chiusura: r.data_chiusura ? r.data_chiusura.split('T')[0] : '',
      stato,
    });
  });

  // Ordina progressivi: aperti → non aperti → chiusi, poi per progressivo asc
  const statoOrd = { aperto: 0, non_aperto: 1, chiuso: 2 };
  Object.values(prodottiMap).forEach(p => {
    p.progressivi.sort((a, b) => {
      const sd = statoOrd[a.stato] - statoOrd[b.stato];
      if (sd !== 0) return sd;
      return a.progressivo.localeCompare(b.progressivo);
    });
  });

  const prodotti = Object.values(prodottiMap).sort((a, b) =>
    a.nome_prodotto.localeCompare(b.nome_prodotto)
  );

  // Calcola quali valori non sono stati trovati
  const chiaveSet = new Set(reagenti.map(r => (r[tipo] || '').toLowerCase()));
  const non_trovati = valoriPuliti.filter(v => !chiaveSet.has(v.toLowerCase()));

  return res.status(200).json({
    tipo,
    cercati: valoriPuliti.length,
    trovati: prodotti.length,
    non_trovati,
    prodotti,
  });
}
