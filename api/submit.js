/* ===========================================================================
   POST /api/submit  —  the one place every greenaidigital.com form lands.

   greenaidigital.com is static on GitHub Pages, so it has no server of its
   own. It used to POST straight at web3forms, which now sits behind a
   Cloudflare bot challenge: the browser got a "Just a moment..." page instead
   of a submission and the button hung on "Sending...". Nothing was ever
   delivered. This replaces that entirely.

   Mail goes out over the same Gmail SMTP path the outreach scripts already
   use, so the credentials are proven. Nothing here is public: the app
   password lives in the SMTP_PASS environment variable, never in the repo.
   ========================================================================= */

const queue = require('../lib/queue.js');
const { render } = require('../lib/template.js');
const { firstReply, SERVICES } = require('../lib/reply.js');

const ALLOWED = [
  'https://greenaidigital.com',
  'https://www.greenaidigital.com',
  'https://greenai-hypnoid.vercel.app',
  'http://localhost:8000',
  'http://localhost:8153'
];

/* Which form sent this, and what to call it in the subject line. */
const KINDS = {
  demo:    { kind: 'Demo request',    subject: 'Demo request' },
  contact: { kind: 'New enquiry',     subject: 'Website enquiry' },
  start:   { kind: 'Start request',   subject: 'Start request' },
  selftest:{ kind: 'Self-test',       subject: 'SELF-TEST' },
  hypnoid: { kind: 'HYPNOID shift card', subject: 'HYPNOID — NEW CUSTOMER' }
};

function cors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); }
    catch (e) { return Object.fromEntries(new URLSearchParams(req.body)); }
  }
  return {};
}

const clip = (v, n) => String(v == null ? '' : v).slice(0, n).trim();

/* Forward the lead to Jaden's OpenClaw front desk (runs on his Mac, reached
   through a Cloudflare tunnel). It turns the lead into an iMessage with a
   drafted reply within seconds. Fire-and-forget: a dead tunnel must never
   slow down or fail the customer's form, so we cap it at 4s and swallow
   every error. Unset env vars = feature off. */
function forwardToOpenClaw(d, kind, receivedAt, source) {
  const url = process.env.OPENCLAW_HOOK_URL, token = process.env.OPENCLAW_HOOK_TOKEN;
  if (!url || !token || typeof fetch !== 'function') return Promise.resolve();
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 4000);
  return fetch(url.replace(/\/$/, '') + '/hooks/greenai-lead', {
    method: 'POST', signal: ctrl.signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      kind, receivedAt, source,
      business: d.business, trade: d.trade, service_area: d.service_area,
      email: d.email, phone: d.phone, always_asked: d.always_asked
    })
  }).then(function (r) { if (!r.ok) console.error('openclaw hook HTTP', r.status); })
    .catch(function (e) { console.error('openclaw hook failed:', e && e.message); })
    .finally(function () { clearTimeout(timer); });
}

/* One first reply per address per 24 hours, and at most 60 a day in total. */
const REPLIED = new Map();
let dayKey = '', dayCount = 0;
function allowReply(email) {
  const now = Date.now(), key = String(email).toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) { dayKey = today; dayCount = 0; }
  if (dayCount >= 60) return false;
  const last = REPLIED.get(key);
  if (last && now - last < 24 * 3600 * 1000) return false;
  REPLIED.set(key, now); dayCount += 1;
  return true;
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const b = parseBody(req);

  /* Honeypot. Bots fill every field they can see; humans never touch this one.
     Answer 200 so the bot believes it worked and does not come back louder. */
  if (clip(b.botcheck, 50)) return res.status(200).json({ ok: true });

  const d = {
    business:     clip(b.business || b.name, 160),
    first_name:   clip(b.first_name, 60),
    last_name:    clip(b.last_name, 60),
    service:      clip(b.service, 40),
    trade:        clip(b.trade, 80),
    service_area: clip(b.service_area, 120),
    email:        clip(b.email, 200),
    phone:        clip(b.phone, 40),
    always_asked: clip(b.always_asked || b.message, 2000),
    brief:        clip(b.ACTION_BRIEF || b.brief, 12000),
    /* start.html collects far more than the short forms; carry it through
       as labelled rows instead of inventing a field per question. */
    extras: [
      ['Wants',       SERVICES[clip(b.service, 40)] ? SERVICES[clip(b.service, 40)][0] : clip(b.service, 40)],
      ['Name',        [clip(b.first_name, 60), clip(b.last_name, 60)].filter(Boolean).join(' ')],
      ['Reference',   clip(b.reference, 60)],
      ['Plan',        clip(b.plan, 80)],
      ['Contact',     clip(b.name, 120)],
      ['Mobile',      clip(b.mobile, 40)],
      ['Best time',   clip(b.best_time, 80)],
      ['Hours',       clip(b.hours, 300)],
      ['Calendar',    clip(b.calendar_tool, 120)],
      ['Lead channels', clip(b.lead_channels, 300)]
    ].filter(function (x) { return x[1]; })
  };
  if (!d.business) d.business = clip(b.business_name, 160);
  if (!d.service_area) d.service_area = clip(b.service_area, 120);

  if (!d.email || d.email.indexOf('@') < 1) {
    return res.status(400).json({ ok: false, error: 'A valid email is required.' });
  }

  const k = KINDS[clip(b.form, 20)] || KINDS.contact;
  const receivedAt = new Date().toLocaleString('en-US', {
    timeZone: 'America/Phoenix', weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: 'numeric', minute: '2-digit'
  }) + ' MST';

  const r = render(d, {
    kind: k.kind,
    receivedAt,
    source: clip(b.source, 120) || 'greenaidigital.com'
  });

  const forward = forwardToOpenClaw(d, k.kind, receivedAt, clip(b.source, 120) || 'greenaidigital.com');

  const formKey = KINDS[clip(b.form, 20)] ? clip(b.form, 20) : 'contact';
  const reply = firstReply({ ...d, kind: formKey, contact: clip(b.name, 120), reference: clip(b.reference, 60) });
  const lead = {
    v: 1, form: formKey, receivedAt: new Date().toISOString(),
    first: d.first_name || clip(b.name, 120).split(/\s+/)[0] || '', business: d.business,
    email: d.email, phone: d.phone || clip(b.mobile, 40), service: d.service || '',
    trade: d.trade, area: d.service_area, reference: clip(b.reference, 60),
    demo: reply.demo, source: clip(b.source, 120)
  };

  /* Railway blocks outbound SMTP on this plan, so nothing is mailed from
     here. The finished emails go into a durable queue; the lead desk on
     Jaden's Mac collects them every 30 seconds and sends them from his Gmail.
     The first reply is capped per address and per day so the form cannot be
     used to mail strangers in bulk. */
  try {
    queue.push({
      lead,
      dossier: { subject: `${k.subject} — ${r.subjectLine}`, text: r.text, html: r.html, replyTo: d.email },
      reply: allowReply(d.email) ? { to: d.email, subject: reply.subject, text: reply.text } : null
    });
  } catch (err) {
    console.error('queue write failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'Could not send. Please call (480) 798-0753.' });
  }
  await forward;
  return res.status(200).json({ ok: true });
};
