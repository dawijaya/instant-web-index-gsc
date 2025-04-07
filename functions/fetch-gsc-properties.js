"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
async function handler(req, res) {
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const accessToken = req.headers['x-access-token'];
    if (!accessToken) {
        return res.status(401).json({ error: 'Access token is required' });
    }
    // Cari user berdasarkan access token di tabel tokens
    const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('user_id')
        .eq('access_token', accessToken)
        .single();
    if (tokenError || !tokenData) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    try {
        // Ambil data GSC berdasarkan user_id
        const { data, error } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('user_id', tokenData.user_id);
        if (error)
            throw error;
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Failed to fetch GSC properties:', err.message || err);
        return res.status(500).json({ error: `Failed to fetch GSC properties: ${err.message}` });
    }
}
