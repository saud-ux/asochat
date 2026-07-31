const { schedule } = require('@netlify/functions');
const webpush = require('web-push');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOIMSoH3ZuHz_eL09w-2cOw7FSGyTTew3q3XlJsuwe4yBvnEbi1ee3mnwz3hOvS4rA_SigRsest_GbV_KgLZPV8';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '2oC4anJ19gv8ylo1D2XBDBWuiBiXfvnu6OzI-rIeE5E';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:saud.alh6@gmail.com';
const DB = process.env.FIREBASE_DB_URL || 'https://chat-app-75b2a-default-rtdb.firebaseio.com';

const USERS = ['saud', 'w', 'aseel'];
const MAX_AGE_MS = 30 * 60 * 1000;

webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

async function fbGet(path) {
  const r = await fetch(DB + '/' + path + '.json');
  if (!r.ok) return null;
  return r.json();
}

async function fbDelete(path) {
  await fetch(DB + '/' + path + '.json', { method: 'DELETE' });
}

async function handler() {
  if (process.env.WATCHER_ENABLED !== 'true') {
    return { statusCode: 200, body: 'watcher disabled on this site' };
  }

  let sent = 0, dropped = 0;

  for (const uid of USERS) {
    const queue = await fbGet('pending-pushes/' + uid);
    if (!queue) continue;

    for (const key of Object.keys(queue)) {
      const entry = queue[key];
      const base = 'pending-pushes/' + uid + '/' + key;

      if (!entry || !entry.payload || !entry.payload.subscription) {
        await fbDelete(base);
        continue;
      }
      if (entry.ts && (Date.now() - entry.ts) > MAX_AGE_MS) {
        await fbDelete(base);
        dropped++;
        continue;
      }

      const p = entry.payload;
      const notification = JSON.stringify({
        title: p.title || 'رسالة جديدة',
        body: p.body || '',
        url: p.url || '/',
        msgId: p.msgId
      });

      try {
        await webpush.sendNotification(p.subscription, notification, { TTL: 86400, urgency: 'high' });
        await fbDelete(base);
        sent++;
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          await fbDelete(base);
          if (entry.subKey) await fbDelete('push-subscriptions/' + uid + '/' + entry.subKey);
        }
      }
    }
  }

  return { statusCode: 200, body: 'drained sent=' + sent + ' dropped=' + dropped };
}

exports.handler = schedule('* * * * *', handler);
