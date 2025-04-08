import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Init Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ✅ Ambil access token dari request header
  const accessToken = req.headers['x-access-token'] as string

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not provided in header' })
  }

  // ✅ Cari token berdasarkan access token yang dikirim user
  const { data: tokens, error: tokenError } = await supabase
    .from('tokens')
    .select('*')
    .eq('access_token', accessToken)
    .single()

  if (tokenError || !tokens) {
    return res.status(401).json({ error: 'No valid tokens found for this user' })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })

  console.log('Access Token:', tokens.access_token) // Debug token user login

  const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client })

  try {
    const response = await webmasters.sites.list()
    const sites = response.data.siteEntry || []

  const gscData = sites
  .filter((site): site is { siteUrl: string; permissionLevel: string } =>
    typeof site.siteUrl === 'string' &&
    site.siteUrl.startsWith('http') &&
    typeof site.permissionLevel === 'string'
  )
  .map(site => ({
    site_url: site.siteUrl,
    permission_level: site.permissionLevel,
    user_id: tokens.user_id ?? null,
    token_id: tokens.id,
  }))

    console.log('GSC Data:', gscData) // Debug GSC sites milik user

    const { error: insertError } = await supabase
      .from('gsc_properties')
      .upsert(gscData, { onConflict: 'site_url' })

    if (insertError) throw insertError

    return res.status(200).json({
      message: 'GSC properties saved.',
      count: gscData.length,
    })
  } catch (err: any) {
    console.error('Failed to fetch or save GSC properties:', err.response?.data || err.message || err)
    return res.status(500).json({
      error: err.response?.data || err.message || 'Unknown error',
    })
  }
}
