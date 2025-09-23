// api/verifica-accesso.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ error: "IP richiesto" });
    }

    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("approvato")
      .eq("ip", ip)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = nessuna riga
      console.error("Errore Supabase:", error);
      return res.status(500).json({ error: "Errore interno server" });
    }

    const allowed = data?.approvato === true;
    return res.status(200).json({ allowed });
  } catch (err) {
    console.error("Errore API verifica-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
