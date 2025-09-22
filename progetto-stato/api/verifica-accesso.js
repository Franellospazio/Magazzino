import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "IP richiesto" });

  try {
    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("status")
      .eq("ip", ip)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = nessuna riga trovata
      console.error("Errore verifica accesso:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.status !== "approved") {
      return res.status(403).json({ accesso: false });
    }

    return res.status(200).json({ accesso: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore server" });
  }
}
