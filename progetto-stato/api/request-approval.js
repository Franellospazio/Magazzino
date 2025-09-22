import { createClient } from '@supabase/supabase-js';
import Resend from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { email, ip } = req.body;
  if (!email || !ip) return res.status(400).json({ error: "Email o IP mancanti" });

  try {
    // Inserisce la richiesta in Supabase
    const { error } = await supabase
      .from("richieste_accesso")
      .insert({ email, ip, approvato: false });

    if (error) return res.status(500).json({ error: error.message });

    // Invia email all’amministratore
    await resend.emails.send({
      from: process.env.ADMIN_EMAIL, // es. "admin@azienda.com"
      to: process.env.ADMIN_EMAIL,
      subject: "Nuova richiesta accesso",
      html: `<p>Nuova richiesta di accesso:</p>
             <ul>
               <li>Email: ${email}</li>
               <li>IP: ${ip}</li>
             </ul>
             <p>Accetta o rifiuta direttamente su Supabase.</p>`
    });

    return res.status(200).json({ message: "Richiesta inviata all'amministratore" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore server" });
  }
}
