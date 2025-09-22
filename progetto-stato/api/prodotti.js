// api/prodotti.js
import { createClient } from '@supabase/supabase-js';

// Supabase client server-side (sicuro)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Legge tutti i prodotti
    const { data, error } = await supabase
      .from("Magazzino")
      .select("*")
      .order("Descrizione", { ascending: true });

    if (error) {
      console.error("Errore GET Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === "PATCH") {
    const { descrizione, Giacenza, ScortaMinima, inordine } = req.body;

    if (!descrizione || Giacenza === undefined) {
      return res.status(400).json({ error: "descrizione e Giacenza richiesti" });
    }

    const updateData = { Giacenza };
    if (ScortaMinima !== undefined) updateData.ScortaMinima = ScortaMinima;
    if (inordine !== undefined) updateData.inordine = inordine;

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
