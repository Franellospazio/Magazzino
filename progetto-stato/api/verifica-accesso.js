// api/verifica-accesso.js
import { createClient } from "@supabase/supabase-js";

// Client Supabase server-side
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  console.log("verifica-accesso.js invocato"); // log iniziale

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { ip } = req.body;
    console.log("Body ricevuto:", req.body);

    if (!ip) {
      return res.status(400).json({ error: "IP richiesto" });
    }

    // Controllo se IP è approvato
    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("*")
      .eq("ip", ip)
      .eq("approvato", true)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Errore Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Risultato controllo IP:", data);
    return res.status(200).json({ allowed: !!data });
  } catch (err) {
    console.error("Errore API verifica-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
