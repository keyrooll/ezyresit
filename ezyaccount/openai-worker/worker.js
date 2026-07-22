// Cloudflare Worker: OpenAI proxy for EzyAccount (ezyresit.keyrooll.workers.dev)
//
// Two things this fixes vs the old worker:
//  1. Smart Placement (see wrangler.toml) runs this Worker near OpenAI (US) instead of near the
//     user. Worker fetches egress from wherever the Worker runs, so Malaysian traffic landing on
//     a PoP that OpenAI blocks produced: "Country, region, or territory not supported".
//  2. The old worker answered ANY caller — the OpenAI key lives here, so anyone with the URL
//     could spend the account's credits. Callers must now present APP_SECRET.
//
// Secrets to set (Workers > Settings > Variables, or `wrangler secret put NAME`):
//   OPENAI_API_KEY  — the real OpenAI key (never leaves the Worker)
//   APP_SECRET      — shared secret; paste this same value into the app's "API key" field
//
// The app already sends its saved key as `Authorization: Bearer <value>`, so no app code changes.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

// The app reads d.error.message, so errors must keep OpenAI's shape.
function errorJson(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return errorJson('Method not allowed', 405);
    }

    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!env.APP_SECRET) {
      return errorJson('Worker misconfigured: APP_SECRET not set', 500);
    }
    if (token !== env.APP_SECRET) {
      return errorJson('Unauthorized: invalid app key', 401);
    }

    try {
      const upstream = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: await request.text()
      });
      // Pass the body straight through (success or OpenAI error) so the app can read it as-is.
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return errorJson('Proxy error: ' + (e && e.message ? e.message : String(e)), 502);
    }
  }
};
