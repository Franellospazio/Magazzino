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
    if (!email || !ip) return res.status(400).json({ error: "Email e IP richiesti" });

    const { error: insertError } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip }]);

    if (insertError) {
      console.error("Errore Supabase INSERT:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log(`Richiesta accesso: ${email} ${ip}`);
    return res.status(200).json({ message: "Richiesta inviata" });
  } catch (err) {
    console.error("Errore API richiesta-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
