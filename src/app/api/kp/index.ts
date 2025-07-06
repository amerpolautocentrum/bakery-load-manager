import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase'; // Konfiguracja Supabase

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Tworzenie nowego KP
    const { sklep_id, pozycje } = req.body;
    
    const { data, error } = await supabase.rpc('zapisz_kp', {
      p_kierowca_id: req.user.id, // Wymaga autentykacji
      p_sklep_id: sklep_id,
      p_pozycje: pozycje
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ id: data });
  }

  if (req.method === 'GET') {
    // Lista KP
    const { data, error } = await supabase
      .from('widok_kp')
      .select('*')
      .eq('kierowca_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}