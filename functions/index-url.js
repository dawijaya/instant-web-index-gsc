"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const handler = async (event) => {
    const { url } = JSON.parse(event.body || '{}');
    if (!url)
        return { statusCode: 400, body: 'URL is required' };
    // Ambil token dari Supabase
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('tokens').select('*').limit(1).single();
    if (error || !data)
        return { statusCode: 500, body: 'Failed to fetch tokens' };
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token
    });
    const indexing = googleapis_1.google.indexing({ version: 'v3', auth: oauth2Client });
    try {
        await indexing.urlNotifications.publish({
            requestBody: {
                url,
                type: 'URL_UPDATED'
            }
        });
        return { statusCode: 200, body: 'URL submitted to Google Indexing API' };
    }
    catch (err) {
        return { statusCode: 500, body: `Indexing error: ${err.message}` };
    }
};
exports.handler = handler;
