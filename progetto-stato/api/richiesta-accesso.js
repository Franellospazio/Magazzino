import { createClient } from "@supabase/supabase-js";
import resend from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { email, ip } = req.body;

  if (!email || !ip) {
    return res.status(400).json({ error: "Email e IP obbligatori" });
  }

  try {
    // Salva la richiesta in Supabase
    const { error: dbError } = await supabase
      .from("richieste_accesso")
      .insert([{ email, ip }]);

    if (dbError) throw dbError;

    // Invia email di notifica all'admin
    await resendClient.emails.send({
      from: "Magazzino <no-reply@tuodominio.com>",
      to: process.env.ADMIN_EMAIL,
      subject: "Nuova richiesta di accesso",
      html: `
        <h2>Nuova richiesta di accesso</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>IP:</strong> ${ip}</p>
        <p>Accedi a Supabase per approvare o rifiutare.</p>
      `,
    });

    return res.status(200).json({ message: "Richiesta inviata" });
  } catch (err) {
    console.error("Errore richiesta-accesso:", err);
    return res.status(500).json({ error: "Errore interno" });
  }
}
