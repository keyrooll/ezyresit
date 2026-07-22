export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    try {
      const { to, type, template, language, params, text } = await request.json();

      if (!to) {
        return new Response(JSON.stringify({ error: 'Missing "to" phone number' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const payload = type === 'text'
        ? { messaging_product: 'whatsapp', to, type: 'text', text: { body: text || '' } }
        : {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: template,
              language: { code: language || 'ms' },
              components: params && params.length
                ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }]
                : [],
            },
          };

      const waRes = await fetch(`https://graph.facebook.com/v20.0/${env.WA_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.WA_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await waRes.json();

      return new Response(JSON.stringify(data), {
        status: waRes.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
