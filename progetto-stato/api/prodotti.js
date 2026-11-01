// api/prodotti.js — con verifica auth
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

async function checkAdmin(userId) {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

export default async function handler(req, res) {
  if (AUTH_ENABLED && req.method !== 'GET') {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Non autenticato' });
  }

  if (req.method === 'GET') {
    let query = supabase
      .from('Magazzino')
      .select('*, fornitori:prodotto_fornitori(fornitore_id, ordine, fornitori(id, nome))')
      .order('Descrizione', { ascending: true });

    // Filtro opzionale per nome (ricerca parziale, usato da scan.html e etichette-qr.html)
    const { nome } = req.query;
    if (nome) query = query.ilike('Descrizione', `%${nome}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const prodotti = data.map(p => {
      const fornitoriOrdinati = (p.fornitori || [])
        .sort((a, b) => a.ordine - b.ordine)
        .map(f => ({ id: f.fornitori.id, nome: f.fornitori.nome, ordine: f.ordine }));
      const fornitoreSelezionato = fornitoriOrdinati.find(f => f.id === p.fornitore_selezionato);
      return {
        ...p,
        // Alias comodi per il frontend (mantiene anche i nomi originali)
        nome_prodotto: p.Descrizione,
        giacenza: p.Giacenza,
        scorta_minima: p.ScortaMinima,
        fornitori: fornitoriOrdinati,
        fornitore_selezionato_nome: fornitoreSelezionato?.nome || null
      };
    });
    return res.status(200).json(prodotti);
  }

  if (req.method === 'PATCH') {
    let isAdminUser = false;
    if (AUTH_ENABLED) {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Non autenticato' });
      isAdminUser = await checkAdmin(user.id);
    } else {
      isAdminUser = req.body.isAdmin === true;
    }

    const { descrizione, Giacenza, inordine, ScortaMinima, fornitore_selezionato, unita, volume_per_unita } = req.body;
    if (!descrizione) return res.status(400).json({ error: 'Descrizione richiesta' });

    const updateData = { ultimo_aggiornamento: new Date().toISOString() };
    if (Giacenza !== undefined) updateData.Giacenza = Giacenza;

    // Campi solo admin
    if (isAdminUser) {
      if (inordine !== undefined)            updateData.inordine = inordine;
      if (ScortaMinima !== undefined)        updateData.ScortaMinima = ScortaMinima;
      if (fornitore_selezionato !== undefined) updateData.fornitore_selezionato = fornitore_selezionato;
      if (unita !== undefined)               updateData.unita = unita;
      if (volume_per_unita !== undefined)    updateData.volume_per_unita = volume_per_unita;
    }

    const { error } = await supabase.from('Magazzino').update(updateData).eq('Descrizione', descrizione);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Aggiornato' });
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
