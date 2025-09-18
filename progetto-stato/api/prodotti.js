// api/prodotti.js
import { createClient } from '@supabase/supabase-js';

// Supabase client server-side, sicuro
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Legge tutti i prodotti dal database
    const { data, error } = await supabase
      .from("Magazzino")
      .select("*")
      .order("descrizione", { ascending: true });

    if (error) {
      console.error("Errore GET Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === "PATCH") {
    const { descrizione, Giacenza } = req.body;

    if (!descrizione || Giacenza === undefined) {
      return res.status(400).json({ error: "descrizione e Giacenza richiesti" });
    }

    const { error } = await supabase
      .from("Magazzino")
      .update({ giacenza: Giacenza })
      .eq("descrizione", descrizione);

    if (error) {
      console.error("Errore PATCH Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Giacenza aggiornata" });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
