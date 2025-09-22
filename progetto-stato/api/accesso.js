// api/accesso.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Nuova richiesta di accesso
    const { email, ip } = req.body;

    if (!email || !ip) {
      return res.status(400).json({ error: "Email e IP richiesti" });
    }

    const { data, error } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip }]);

    if (error) {
      console.error("Errore inserimento:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Richiesta inviata", data });
  }

  if (req.method === "GET") {
    // Verifica se IP approvato
    const { ip } = req.query;
    if (!ip) return res.status(400).json({ error: "IP richiesto" });

    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("*")
      .eq("ip", ip)
      .eq("approvato", true);

    if (error) {
      console.error("Errore verifica:", error);
      return res.status(500).json({ error: error.message });
    }

    if (data.length > 0) {
      return res.status(200).json({ autorizzato: true, utente: data[0] });
    } else {
      return res.status(200).json({ autorizzato: false });
    }
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
