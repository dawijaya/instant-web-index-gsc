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
    console.log('Token data:', tokenData);
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
    // Refresh access token
    try {
        console.log('Refreshing access token...');
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        console.log('New credentials:', credentials);
    }
    catch (err) {
        console.error('Failed to refresh access token:', err);
        return res.status(401).json({
            error: 'Failed to refresh access token',
            detail: err.message || 'Unknown refresh error',
            suggestion: 'Ensure the refresh_token is still valid. You may need to re-authenticate with prompt=consent.',
        });
    }
    const indexing = googleapis_1.google.indexing({ version: 'v3', auth: oauth2Client });
    console.log('Fetching domains from Supabase...');
    const { data: domains, error: domainError } = await supabase
        .from('gsc_properties')
        .select('site_url')
        .eq('token_id', tokenId);
    if (domainError || !domains || domains.length === 0) {
        console.warn('No domains found:', domainError);
        return res.status(404).json({ error: 'No domains found for this token_id' });
    }
    console.log('Found domains:', domains);
    const results = [];
    for (const { site_url } of domains) {
        const normalizedUrl = site_url.startsWith('sc-domain:')
            ? site_url.replace(/^sc-domain:/, 'https://') + '/index.html'
            : site_url;
        const publishBody = {
            url: normalizedUrl,
            type: 'URL_UPDATED',
        };
        try {
            console.log(`Submitting indexing request for: ${normalizedUrl}`);
            const response = await indexing.urlNotifications.publish({ requestBody: publishBody });
            console.log('Indexing response:', response.data);
            results.push({ site_url: normalizedUrl, status: 'success', response: response.data });
        }
        catch (err) {
            console.error(`Error indexing ${normalizedUrl}:`, err.message);
            results.push({ site_url: normalizedUrl, status: 'error', error: err.message });
        }
    }
    return res.status(200).json({ results });
}
