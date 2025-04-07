import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string | undefined
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  try {
    // 1. Tukar code dengan token
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      return res.status(500).json({ error: 'Token exchange failed' })
    }

    // 2. Ambil info user dari Google API
    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })

    const { id: google_id, email, name } = userInfoRes.data

    // 3. Simpan ke Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from('tokens').insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expiry_date ?? 0)).toISOString(),
      google_id,
      email,
      name
    })

    if (error) throw error

    return res.status(200).json({ message: 'Success! Token and user saved to Supabase.' })
  } catch (error: any) {
    return res.status(500).json({ error: `OAuth Callback Error: ${error.message}` })
  }
}