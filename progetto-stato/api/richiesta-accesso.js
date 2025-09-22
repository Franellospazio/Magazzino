import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { ip } = req.body;

  if (!ip) {
    return res.status(400).json({ error: "IP mancante" });
  }

  try {
    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("approved")
      .eq("ip", ip)
      .maybeSingle();

    if (error) throw error;

    if (data && data.approved === true) {
      return res.status(200).json({ allowed: true });
    } else {
      return res.status(200).json({ allowed: false });
    }
  } catch (err) {
    console.error("Errore verifica-accesso:", err);
    return res.status(500).json({ error: "Errore interno" });
  }
}
