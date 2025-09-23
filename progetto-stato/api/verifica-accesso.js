import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email richiesta" });
  }

  // Prendi l'IP del client da Vercel (o fallback a req.connection)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  try {
    // Controlla se esiste già una richiesta approvata per quell'IP
    const { data, error } = await supabase
      .from('richieste_accesso')
      .select('*')
      .eq('email', email)
      .eq('ip', ip)
      .eq('approvato', true)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    if (data) {
      // Accesso consentito
      return res.status(200).json({ accesso: true });
    } else {
      // Nessuna richiesta approvata trovata
      return res.status(200).json({ accesso: false });
    }

  } catch (err) {
    console.error('Errore verifica-accesso:', err);
    return res.status(500).json({ error: 'Errore interno server' });
  }
}
