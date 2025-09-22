import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP richiesto' });

  const { data, error } = await supabase
    .from('richieste_accesso')
    .select('*')
    .eq('ip', ip)
    .eq('approved', true)
    .single();

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

  if (data) return res.status(200).json({ approved: true });
  return res.status(200).json({ approved: false });
}
