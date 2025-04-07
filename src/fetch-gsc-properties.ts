import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data, error } = await supabase
      .from('gsc_properties')
      .select('*')

    if (error) throw error

    return res.status(200).json(data)
  } catch (err: any) {
    console.error('Failed to fetch GSC properties:', err.message || err)
    return res.status(500).json({ error: `Failed to fetch GSC properties: ${err.message}` })
  }
}
