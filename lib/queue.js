/* ===========================================================================
   A durable lead queue: one JSON file per lead.

     <dir>/pending/<id>.json   waiting for the lead desk to send it
     <dir>/sent/<id>.json      sent; kept as the record of every lead

   The directory is a Railway volume (QUEUE_DIR, default /data), so a restart
   or redeploy never loses a lead. Writes go to a temp name first and are then
   renamed, so a half-written file is never read.
   ========================================================================= */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.env.QUEUE_DIR || '/data';
const PENDING = path.join(ROOT, 'pending');
const SENT = path.join(ROOT, 'sent');

function ready() {
  fs.mkdirSync(PENDING, { recursive: true });
  fs.mkdirSync(SENT, { recursive: true });
}

const ID = /^[0-9]{13}-[0-9a-f]{8}$/;

function push(job) {
  ready();
  const id = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
  const file = path.join(PENDING, id + '.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify({ id, queuedAt: new Date().toISOString(), ...job }));
  fs.renameSync(file + '.tmp', file);
  return id;
}

function pending() {
  ready();
  return fs.readdirSync(PENDING)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(PENDING, f), 'utf8')));
}

/* Move a sent job out of pending. Unknown ids are ignored. */
function ack(id, result) {
  if (!ID.test(String(id))) return false;
  const from = path.join(PENDING, id + '.json');
  if (!fs.existsSync(from)) return false;
  const job = JSON.parse(fs.readFileSync(from, 'utf8'));
  job.sentAt = new Date().toISOString();
  job.result = result || null;
  fs.writeFileSync(path.join(SENT, id + '.json'), JSON.stringify(job));
  fs.unlinkSync(from);
  return true;
}

function stats() {
  ready();
  const p = fs.readdirSync(PENDING).filter(f => f.endsWith('.json')).sort();
  const oldest = p.length ? Number(p[0].slice(0, 13)) : null;
  return {
    pending: p.length,
    oldestPendingSeconds: oldest ? Math.round((Date.now() - oldest) / 1000) : 0,
    sent: fs.readdirSync(SENT).filter(f => f.endsWith('.json')).length
  };
}

module.exports = { push, pending, ack, stats };
