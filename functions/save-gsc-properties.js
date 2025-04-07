"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
async function handler(req, res) {
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokens, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .limit(1)
        .single();
    if (tokenError || !tokens) {
        return res.status(401).json({ error: 'No valid tokens found' });
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    });
    console.log('Access Token:', tokens.access_token); // Debug Step 1
    const webmasters = googleapis_1.google.webmasters({ version: 'v3', auth: oauth2Client });
    try {
        const response = await webmasters.sites.list();
        const sites = response.data.siteEntry || [];
        const gscData = sites.map(site => ({
            site_url: site.siteUrl,
            permission_level: site.permissionLevel,
            user_id: tokens.user_id ?? null,
        }));
        console.log('GSC Data:', gscData); // Debug Step 2
        const { error: insertError } = await supabase
            .from('gsc_properties')
            .upsert(gscData, { onConflict: 'site_url' });
        if (insertError)
            throw insertError;
        return res.status(200).json({
            message: 'GSC properties saved.',
            count: gscData.length,
        });
    }
    catch (err) {
        console.error('Failed to fetch or save GSC properties:', err.response?.data || err.message || err);
        return res.status(500).json({
            error: err.response?.data || err.message || 'Unknown error',
        });
    }
}
