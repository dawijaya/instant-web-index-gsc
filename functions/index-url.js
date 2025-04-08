"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const handler = async (event) => {
    const tokenId = event.headers['x-token-id'];
    if (!tokenId)
        return { statusCode: 400, body: 'Missing x-token-id header' };
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    // Ambil token dari Supabase
    const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
    if (tokenError || !tokenData) {
        return { statusCode: 500, body: 'Failed to fetch token' };
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
    });
    const indexing = googleapis_1.google.indexing({ version: 'v3', auth: oauth2Client });
    // Ambil semua domain dari Supabase berdasarkan token_id
    const { data: domains, error: domainError } = await supabase
        .from('gsc_properties')
        .select('site_url')
        .eq('token_id', tokenId);
    if (domainError || !domains || domains.length === 0) {
        return { statusCode: 404, body: 'No domains found for this token_id' };
    }
    const results = [];
    for (const { site_url } of domains) {
        try {
            const res = await indexing.urlNotifications.publish({
                requestBody: {
                    url: site_url,
                    type: 'URL_UPDATED'
                }
            });
            results.push({ url: site_url, status: 'success', response: res.data });
        }
        catch (err) {
            results.push({ url: site_url, status: 'error', message: err.message });
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Indexing completed',
            results
        })
    };
};
exports.handler = handler;
