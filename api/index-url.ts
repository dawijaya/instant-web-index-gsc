import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const handler: Handler = async (event) => {
  const { url } = JSON.parse(event.body || '{}')
  if (!url) return { statusCode: 400, body: 'URL is required' }

  // Ambil token dari Supabase
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.from('tokens').select('*').limit(1).single()
  if (error || !data) return { statusCode: 500, body: 'Failed to fetch tokens' }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  })

  const indexing = google.indexing({ version: 'v3', auth: oauth2Client })

  try {
    await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_UPDATED'
      }
    })

    return { statusCode: 200, body: 'URL submitted to Google Indexing API' }
  } catch (err: any) {
    return { statusCode: 500, body: `Indexing error: ${err.message}` }
  }
}

export { handler }
