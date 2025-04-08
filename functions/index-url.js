"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
async function handler(req, res) {
    console.log('Incoming request:', req.method);
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const tokenId = req.headers['x-token-id'];
    console.log('x-token-id:', tokenId);
    if (!tokenId || typeof tokenId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid x-token-id header' });
    }
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Fetching token from Supabase...');
    const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .maybeSingle();
    if (tokenError || !tokenData) {
        console.error('Error fetching token:', tokenError);
        return res.status(500).json({ error: 'Failed to fetch token', detail: tokenError?.message });
    }
    if (!tokenData.refresh_token) {
        console.warn('Missing refresh_token in tokenData');
        return res.status(401).json({
            error: 'Missing refresh_token',
            detail: 'This token_id does not contain a refresh_token. Please re-login with prompt=consent.',
        });
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
    });
    try {
        console.log('Getting valid access token...');
        const { token } = await oauth2Client.getAccessToken();
        if (!token)
            throw new Error('Unable to retrieve access token');
        console.log('Access token is valid or refreshed:', token);
    }
    catch (err) {
        console.error('Failed to get access token:', err);
        return res.status(401).json({
            error: 'Failed to get access token',
            detail: err.message || 'Unknown error while getting access token',
            suggestion: 'Ensure refresh_token is valid and not expired.',
        });
    }
    const indexing = googleapis_1.google.indexing({ version: 'v3', auth: oauth2Client });
    console.log('Fetching domains from Supabase...');
    const { data: domains, error: domainError } = await supabase
        .from('gsc_properties')
        .select('site_url')
        .eq('token_id', tokenId);
    if (domainError || !domains || domains.length === 0) {
        console.error('Error fetching domains:', domainError);
        return res.status(404).json({
            error: 'No domains found',
            detail: domainError?.message || 'No associated site_url with this token_id.',
        });
    }
    const results = [];
    for (const domain of domains) {
        const siteUrl = domain.site_url;
        try {
            console.log(`Submitting ${siteUrl} to Google Indexing API...`);
            const response = await indexing.urlNotifications.publish({
                requestBody: {
                    url: siteUrl,
                    type: 'URL_UPDATED',
                },
            });
            console.log(`Submitted ${siteUrl} - Status: ${response.status}`);
            results.push({ site_url: siteUrl, status: 'success' });
        }
        catch (err) {
            console.error(`Failed to submit ${siteUrl}:`, err.message);
            results.push({ site_url: siteUrl, status: 'error', error: err.message });
        }
    }
    return res.status(200).json({
        message: 'Indexing completed',
        results,
    });
}
