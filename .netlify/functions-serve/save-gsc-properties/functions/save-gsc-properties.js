"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const handler = async () => {
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // Ambil token terbaru dari Supabase (sementara pakai yang pertama saja)
    const { data: tokens, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .limit(1)
        .single();
    if (tokenError || !tokens) {
        return {
            statusCode: 401,
            body: 'No valid tokens found',
        };
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    });
    // LOG DI SINI (step 1)
    console.log('Access Token:', tokens.access_token);
    const webmasters = googleapis_1.google.webmasters({ version: 'v3', auth: oauth2Client });
    try {
        const res = await webmasters.sites.list();
        const sites = res.data.siteEntry || [];
        const gscData = sites.map(site => ({
            site_url: site.siteUrl,
            permission_level: site.permissionLevel,
            user_id: tokens.user_id ?? null // optional if you store user_id
        }));
        // Setelah kamu mapping dari Google API ke gscData
        console.log('GSC Data:', gscData);
        const { error: insertError } = await supabase
            .from('gsc_properties')
            .upsert(gscData, { onConflict: 'site_url' }); // biar tidak dobel
        if (insertError)
            throw insertError;
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'GSC properties saved.', count: gscData.length }),
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            body: `Failed to fetch or save GSC properties: ${error.message}`,
        };
    }
};
exports.handler = handler;
