import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Incoming request:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const tokenId = req.headers['x-token-id']
  console.log('x-token-id:', tokenId)

  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid x-token-id header' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Fetching token from Supabase...')
  const { data: tokenData, error: tokenError } = await supabase
    .from('tokens')
    .select('*')
    .eq('id', tokenId)
    .maybeSingle()

  if (tokenError || !tokenData) {
    console.error('Error fetching token:', tokenError)
    return res.status(500).json({ error: 'Failed to fetch token', detail: tokenError?.message })
  }

  console.log('Token data:', tokenData)

  if (!tokenData.refresh_token) {
    console.warn('Missing refresh_token in tokenData')
    return res.status(401).json({
      error: 'Missing refresh_token',
      detail: 'This token_id does not contain a refresh_token. Please re-login with prompt=consent.',
    })
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  })

  // Refresh access token
// Let Google Auth handle refresh token automatically
try {
  console.log('Getting valid access token...')
  const { token } = await oauth2Client.getAccessToken()
  if (!token) throw new Error('Unable to retrieve access token')

  console.log('Access token is valid or refreshed:', token)
} catch (err: any) {
  console.error('Failed to get access token:', err)
  return res.status(401).json({
    error: 'Failed to get access token',
    detail: err.message || 'Unknown error while getting access token',
    suggestion: 'Ensure refresh_token is valid and not expired.',
  })
}


  const indexing = google.indexing({ version: 'v3', auth: oauth2Client })

  console.log('Fetching domains from Supabase...')
  const { data: domains, error: domainError } = await supabase
    .from('gsc_properties')
    .select('site_url')
    .eq('token_id', tokenId)

  if (domainError || !domains || domains.length === 0) {
    console.warn('No domains found:', domainError)
    return res.status(404).json({ error: 'No domains found for this token_id' })
  }

  console.log('Found domains:', domains)

  const results = []

  for (const { site_url } of domains) {
    const normalizedUrl = site_url.startsWith('sc-domain:')
      ? site_url.replace(/^sc-domain:/, 'https://') + '/index.html'
      : site_url

    const publishBody = {
      url: normalizedUrl,
      type: 'URL_UPDATED',
    }

    try {
      console.log(`Submitting indexing request for: ${normalizedUrl}`)
      const response = await indexing.urlNotifications.publish({ requestBody: publishBody })
      console.log('Indexing response:', response.data)
      results.push({ site_url: normalizedUrl, status: 'success', response: response.data })
    } catch (err: any) {
      console.error(`Error indexing ${normalizedUrl}:`, err.message)
      results.push({ site_url: normalizedUrl, status: 'error', error: err.message })
    }
  }

  return res.status(200).json({ results })
}
