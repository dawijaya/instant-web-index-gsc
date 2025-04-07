import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const handler: Handler = async (event) => {
  const code = new URLSearchParams(event.queryStringParameters as any).get('code')
  if (!code) {
    return { statusCode: 400, body: 'Missing code parameter' }
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      return { statusCode: 500, body: 'Token exchange failed' }
    }

    // Simpan token ke Supabase
    const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

    const { error } = await supabase.from('tokens').insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expiry_date ?? 0)).toISOString()
    })

    if (error) throw error

    return {
      statusCode: 200,
      body: 'Success! Token saved to Supabase.'
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: `OAuth Callback Error: ${error.message}`
    }
  }
}

export { handler }
