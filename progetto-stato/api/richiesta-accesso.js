// api/richiesta-accesso.js
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { email, ip } = req.body;
    if (!email || !ip) {
      return res.status(400).json({ error: "Email e IP richiesti" });
    }

    // Inserisci richiesta
    const { error: insertError } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip }]);

    if (insertError) {
      console.error("Errore Supabase INSERT:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Invia mail all'admin
    await resend.emails.send({
      from: "noreply@tuodominio.com",
      to: process.env.ADMIN_EMAIL,
      subject: "Nuova richiesta accesso",
      html: `<p>Richiesta da: ${email}<br>IP: ${ip}</p>`,
    });

    return res.status(200).json({ message: "Richiesta inviata" });
  } catch (err) {
    console.error("Errore API richiesta-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
