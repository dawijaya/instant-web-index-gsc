"use strict";
// File: api/index-url.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const tokenId = req.headers['x-token-id'];
    if (!tokenId) {
        return res.status(400).json({ error: 'Missing x-token-id header' });
    }
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    // Ambil token dari Supabase
    const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
    if (tokenError || !tokenData) {
        return res.status(500).json({ error: 'Failed to fetch token', detail: tokenError?.message });
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
        return res.status(404).json({ error: 'No domains found for this token_id' });
    }
    const results = [];
    for (const { site_url } of domains) {
        try {
            const response = await indexing.urlNotifications.publish({
                requestBody: {
                    url: site_url,
                    type: 'URL_UPDATED'
                }
            });
            results.push({ url: site_url, status: 'success', response: response.data });
        }
        catch (err) {
            results.push({
                url: site_url,
                status: 'error',
                message: err?.message || 'Unknown error'
            });
        }
    }
    return res.status(200).json({
        message: 'Indexing completed',
        results
    });
}
