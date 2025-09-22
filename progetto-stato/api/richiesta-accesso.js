import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { email, ip } = req.body;
  if (!email || !ip) {
    return res.status(400).json({ error: "Email e IP richiesti" });
  }

  try {
    // Inserisce la richiesta in Supabase
    const { error: insertError } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip, status: "pending", created_at: new Date() }]);

    if (insertError) {
      console.error("Errore inserimento richiesta:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Manda email all'admin usando Resend
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "no-reply@tuodominio.com",
        to: [process.env.ADMIN_EMAIL],
        subject: "Nuova richiesta accesso",
        html: `
          <p>Hai una nuova richiesta di accesso.</p>
          <p>Email: <strong>${email}</strong></p>
          <p>IP: <strong>${ip}</strong></p>
          <p>Apri Supabase per approvare o rifiutare la richiesta.</p>
        `
      })
    });

    if (!resp.ok) {
      console.error("Errore invio email:", await resp.text());
      return res.status(500).json({ error: "Impossibile inviare email all'amministratore" });
    }

    return res.status(200).json({ message: "Richiesta inviata correttamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore server" });
  }
}
