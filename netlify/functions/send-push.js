const webpush = require('web-push');

const PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BOIMSoH3ZuHz_eL09w-2cOw7FSGyTTew3q3XlJsuwe4yBvnEbi1ee3mnwz3hOvS4rA_SigRsest_GbV_KgLZPV8';
const PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '2oC4anJ19gv8ylo1D2XBDBWuiBiXfvnu6OzI-rIeE5E';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@asochat.app';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  if (!PRIVATE_KEY) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'VAPID_PRIVATE_KEY is not configured on the server.' })
    };
  }

  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: CORS, body: 'Invalid JSON' };
  }

  const { subscription, title, body, url, msgId } = payload;
  if (!subscription || !subscription.endpoint) {
    return { statusCode: 400, headers: CORS, body: 'Missing subscription' };
  }

  const notification = JSON.stringify({
    title: title || 'رسالة جديدة',
    body: body || '',
    url: url || '/',
    msgId: msgId
  });

  try {
    await webpush.sendNotification(subscription, notification, { TTL: 86400, urgency: 'high' });
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    const status = err.statusCode || 500;
    return {
      statusCode: status,
      headers: CORS,
      body: JSON.stringify({ error: err.body || err.message || 'send failed' })
    };
  }
};
