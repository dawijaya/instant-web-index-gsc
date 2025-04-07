"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event, context) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const clientId = process.env.GOOGLE_CLIENT_ID;
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
    return {
        statusCode: 302,
        headers: {
            Location: authUrl
        },
        body: ''
    };
};
exports.handler = handler;
