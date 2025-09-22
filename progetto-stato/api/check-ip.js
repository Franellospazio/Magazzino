import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "IP mancante" });

  try {
    const { data, error } = await supabase
      .from("richieste_accesso")
      .select("approvato")
      .eq("ip", ip)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
      return res.status(500).json({ error: error.message });
    }

    const approved = data?.approvato ?? false;
    return res.status(200).json({ approved });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore server" });
  }
}
