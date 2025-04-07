"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const handler = async (event) => {
    const code = new URLSearchParams(event.queryStringParameters).get('code');
    if (!code) {
        return { statusCode: 400, body: 'Missing code parameter' };
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    try {
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.access_token || !tokens.refresh_token) {
            return { statusCode: 500, body: 'Token exchange failed' };
        }
        // Simpan token ke Supabase
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await supabase.from('tokens').insert({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + (tokens.expiry_date ?? 0)).toISOString()
        });
        if (error)
            throw error;
        return {
            statusCode: 200,
            body: 'Success! Token saved to Supabase.'
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            body: `OAuth Callback Error: ${error.message}`
        };
    }
};
exports.handler = handler;
