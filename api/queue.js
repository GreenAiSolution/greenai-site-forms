/* ===========================================================================
   /api/queue  —  the lead desk on Jaden's Mac collects and confirms leads.

     GET  /api/queue            -> { ok, jobs:[...] }  every pending lead
     POST /api/queue {ack:[{id, result}]} -> { ok, acked }

   Bearer-token only (LEAD_DESK_TOKEN). There is no CORS header on purpose:
   no browser page should ever read this.
   ========================================================================= */

const crypto = require('crypto');
const queue = require('../lib/queue.js');

function authorised(req) {
  const want = process.env.LEAD_DESK_TOKEN || '';
  const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (want.length < 24 || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

module.exports = async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ ok: false, error: 'Unauthorised' });
  if (req.method === 'GET') return res.status(200).json({ ok: true, jobs: queue.pending(), stats: queue.stats() });
  if (req.method === 'POST') {
    const list = (req.body && Array.isArray(req.body.ack)) ? req.body.ack : [];
    let acked = 0;
    for (const a of list) if (a && queue.ack(a.id, a.result)) acked += 1;
    return res.status(200).json({ ok: true, acked, stats: queue.stats() });
  }
  return res.status(405).json({ ok: false, error: 'GET or POST only' });
};
