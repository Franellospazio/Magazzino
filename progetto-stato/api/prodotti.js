// api/prodotti.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("Magazzino")
      .select("*, fornitori(nome)")
      .order("Descrizione", { ascending: true });

    if (error) {
      console.error("Errore GET Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    // Aggiunge fornitore_selezionato_nome flat sull'oggetto
    const prodotti = data.map(p => ({
      ...p,
      fornitore_selezionato_nome: p.fornitori?.nome ?? null,
      fornitori: undefined // rimuove l'oggetto nested
    }));

    return res.status(200).json(prodotti);
  }

  if (req.method === "PATCH") {
    const { descrizione, Giacenza, ScortaMinima, inordine, fornitore_selezionato } = req.body;

    if (!descrizione || Giacenza === undefined) {
      return res.status(400).json({ error: "descrizione e Giacenza richiesti" });
    }

    const updateData = {
      Giacenza,
      ultimo_aggiornamento: new Date().toISOString()
    };

    if (ScortaMinima !== undefined) updateData.ScortaMinima = ScortaMinima;
    if (inordine !== undefined) updateData.inordine = inordine;
    // fornitore_selezionato può essere un id o null (quando inordine torna a 0)
    if (fornitore_selezionato !== undefined) updateData.fornitore_selezionato = fornitore_selezionato;

    const { error } = await supabase
      .from("Magazzino")
      .update(updateData)
      .eq("Descrizione", descrizione);

    if (error) {
      console.error("Errore PATCH Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Prodotto aggiornato" });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
