// api/access-log.js — solo admin può leggere i log
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY  // service_role — può leggere tutto
);

async function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user } } = await supabase.auth.getUser(auth.split(' ')[1]);
  return user || null;
}

async function checkAdmin(userId) {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo non consentito' });

  // Verifica auth solo se AUTH_ENABLED
  const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';
  if (AUTH_ENABLED) {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Non autenticato' });
    const admin = await checkAdmin(user.id);
    if (!admin) return res.status(403).json({ error: 'Non autorizzato' });
  }

  const { data, error } = await supabase
    .from('access_log')
    .select('email, accessed_at, user_agent')
    .order('accessed_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
