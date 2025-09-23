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

    // Inserisci richiesta in Supabase
    const { error: insertError } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip }]);

    if (insertError) {
      console.error("Errore Supabase INSERT:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log(`Richiesta accesso: ${email} ${ip}`);

    // Invia mail all'admin
    try {
      await resend.emails.send({
        from: "noreply@tuodominio.com",
        to: process.env.ADMIN_EMAIL,
        subject: "Nuova richiesta accesso",
        html: `<p>Richiesta da: ${email}<br>IP: ${ip}</p>`,
      });
    } catch (mailErr) {
      console.error("Errore invio email:", mailErr);
      // non bloccare la risposta, solo log
    }

    // Controlla subito se l'IP è approvato (utile se l'admin ha già approvato)
    const { data: checkData, error: checkError } = await supabase
      .from("richieste_accesso")
      .select("*")
      .eq("ip", ip)
      .eq("approvato", true)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Errore controllo IP:", checkError);
      return res.status(500).json({ error: "Errore interno server" });
    }

    return res.status(200).json({
      message: "Richiesta inviata",
      allowed: !!checkData, // true se già approvato
    });
  } catch (err) {
    console.error("Errore API richiesta-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
