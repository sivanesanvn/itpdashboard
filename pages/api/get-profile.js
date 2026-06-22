import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  const { data, error } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  if (error || !data) return res.status(404).json({ error: 'Profile not found' })
  return res.status(200).json(data)
}
