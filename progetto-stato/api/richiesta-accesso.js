// api/richiesta-accesso.js
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Supabase client con Service Role Key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    // Parsing sicuro del body (Next.js lo fa già, ma mettiamo fallback)
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (err) {
        console.error("Errore parsing JSON:", err);
        return res.status(400).json({ error: "Body non valido" });
      }
    }

    const { email, ip } = body;

    if (!email || !ip) {
      return res.status(400).json({ error: "Email e IP richiesti" });
    }

    console.log("Richiesta accesso:", email, ip);

    // Inserimento in Supabase
    const { error: insertError } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip }]);

    if (insertError) {
      console.error("Errore Supabase INSERT:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Invio mail all'amministratore
    try {
      await resend.emails.send({
        from: "noreply@tuodominio.com", // sostituire con il dominio valido
        to: process.env.ADMIN_EMAIL,
        subject: "Nuova richiesta accesso",
        html: `<p>Richiesta da: <strong>${email}</strong><br>IP: ${ip}</p>`,
      });
    } catch (mailErr) {
      console.error("Errore invio mail Resend:", mailErr);
      // Non bloccare l’inserimento in Supabase, ma logga l’errore
    }

    return res.status(200).json({ message: "Richiesta inviata con successo" });
  } catch (err) {
    console.error("Errore API richiesta-accesso:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
}
