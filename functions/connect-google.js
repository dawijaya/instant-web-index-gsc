"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
async function handler(req, res) {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!redirectUri || !clientId) {
        return res.status(500).json({ error: 'Missing environment variables' });
    }
    const scope = encodeURIComponent([
        'https://www.googleapis.com/auth/indexing',
        'https://www.googleapis.com/auth/webmasters.readonly'
    ].join(' '));
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `scope=${scope}&` +
        `prompt=consent`;
    res.writeHead(302, { Location: authUrl });
    res.end();
}
