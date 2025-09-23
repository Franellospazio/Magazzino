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
    const { email, ip } = req.body;
    if (!email || !ip) {
      return res.status(400).json({ error: "Email e IP richiesti" });
    }

    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("approvato")
      .eq("email", email)
      .eq("ip", ip)
      .maybeSingle();

    if (error) {
      console.error("Errore Supabase SELECT:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Richiesta non trovata" });
    }

    return res.status(200).json({ approvato: data.approvato });
  } catch (err) {
    console.error("Errore API verifica-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
