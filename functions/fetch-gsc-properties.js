"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
async function handler(req, res) {
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const tokenId = req.headers['x-token-id'];
    if (!tokenId) {
        return res.status(401).json({ error: 'Token ID is required' });
    }
    try {
        const { data, error } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('token_id', tokenId);
        if (error)
            throw error;
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Failed to fetch GSC properties:', err.message || err);
        return res.status(500).json({ error: `Failed to fetch GSC properties: ${err.message}` });
    }
}
