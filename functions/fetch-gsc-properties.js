"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const handler = async (event) => {
    const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    try {
        const { data, error } = await supabase
            .from('gsc_properties')
            .select('*');
        if (error)
            throw error;
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    }
    catch (err) {
        return {
            statusCode: 500,
            body: `Failed to fetch GSC properties: ${err.message}`,
        };
    }
};
exports.handler = handler;
