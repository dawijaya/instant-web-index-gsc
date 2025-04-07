import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const handler: Handler = async (event) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data, error } = await supabase
      .from('gsc_properties')
      .select('*')

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: `Failed to fetch GSC properties: ${err.message}`,
    }
  }
}

export { handler }
