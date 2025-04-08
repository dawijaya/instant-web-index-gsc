// File: api/index-url.ts

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const tokenId = req.headers['x-token-id']
  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid x-token-id header' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ambil token dari Supabase
  const { data: tokenData, error: tokenError } = await supabase
    .from('tokens')
    .select('*')
    .eq('id', tokenId)
    .maybeSingle()

  if (tokenError || !tokenData) {
    return res.status(500).json({ error: 'Failed to fetch token', detail: tokenError?.message })
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  })

  // Refresh access token (wajib kalau access_token bisa expired)
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    oauth2Client.setCredentials(credentials)
  } catch (err: any) {
    return res.status(401).json({
      error: 'Failed to refresh access token',
      detail: err.message || 'Unknown refresh error',
    })
  }

  const indexing = google.indexing({ version: 'v3', auth: oauth2Client })

  // Ambil semua domain dari Supabase berdasarkan token_id
  const { data: domains, error: domainError } = await supabase
    .from('gsc_properties')
    .select('site_url')
    .eq('token_id', tokenId)

  if (domainError || !domains || domains.length === 0) {
    return res.status(404).json({ error: 'No domains found for this token_id' })
  }

  const results = []

  for (const { site_url } of domains) {
    // Ubah sc-domain: jadi https:// (catatan: ini perlu ditambahkan path agar valid untuk indexing)
    const normalizedUrl = site_url.startsWith('sc-domain:')
      ? site_url.replace(/^sc-domain:/, 'https://') + '/index.html' // tambahkan halaman aktual
      : site_url

    try {
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url: normalizedUrl,
          type: 'URL_UPDATED',
        },
      })

      results.push({
        url: normalizedUrl,
        status: 'success',
        response: response.data,
      })
    } catch (err: any) {
      console.error('Indexing error:', normalizedUrl, err.response?.data || err.message)
      results.push({
        url: normalizedUrl,
        status: 'error',
        message: err.response?.data?.error?.message || err.message || 'Unknown error',
      })
    }
  }

  return res.status(200).json({
    message: 'Indexing completed',
    results,
  })
}
