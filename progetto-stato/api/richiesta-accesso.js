import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const { email, ip } = req.body;
  if (!email || !ip) return res.status(400).json({ error: 'Email e IP richiesti' });

  // Controlla se esiste già una richiesta per lo stesso IP
  const { data: existing } = await supabase
    .from('richieste_accesso')
    .select('*')
    .eq('ip', ip)
    .single();

  if (existing) return res.status(400).json({ error: 'Richiesta già inviata per questo IP' });

  // Inserisce richiesta
  const { error } = await supabase
    .from('richieste_accesso')
    .insert([{ email, ip, approved: false }]);

  if (error) return res.status(500).json({ error: error.message });

  // Invia mail admin via Resend
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: process.env.ADMIN_EMAIL,
        to: [process.env.ADMIN_EMAIL],
        subject: `Nuova richiesta accesso da ${email}`,
        html: `<p>IP: ${ip}</p><p>Email: ${email}</p><p>Approva la richiesta su Supabase.</p>`
      })
    });
  } catch (e) {
    console.error('Errore invio mail:', e);
  }

  res.status(200).json({ message: 'Richiesta inviata. Attendi approvazione.' });
}
