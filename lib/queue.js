/* ===========================================================================
   A durable lead queue: one JSON file per lead.

     <dir>/pending/<id>.json   waiting for the lead desk to send it
     <dir>/sent/<id>.json      sent; kept as the record of every lead
     <dir>/junk/<id>.json      bot submissions; kept so a false positive can be replayed

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
const JUNK = path.join(ROOT, 'junk');
const { junkReason } = require('./junk.js');

function ready() {
  fs.mkdirSync(PENDING, { recursive: true });
  fs.mkdirSync(SENT, { recursive: true });
  fs.mkdirSync(JUNK, { recursive: true });
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

/* Oldest first, at most `limit`. The desk asks for a page at a time: a 19 MB
   reply of every pending lead is what timed it out during the October bot flood. */
function pending(limit = 25) {
  ready();
  return fs.readdirSync(PENDING)
    .filter(f => f.endsWith('.json'))
    .sort()
    .slice(0, limit)
    .map(f => JSON.parse(fs.readFileSync(path.join(PENDING, f), 'utf8')));
}

/* Store a bot submission without queueing it. */
function junk(job, reason) {
  ready();
  const id = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(path.join(JUNK, id + '.json'), JSON.stringify({ id, queuedAt: new Date().toISOString(), reason, ...job }));
}

/* Move junk already sitting in pending into junk/. Returns how many moved. */
function sweep() {
  ready();
  let moved = 0;
  for (const f of fs.readdirSync(PENDING).filter(f => f.endsWith('.json'))) {
    const from = path.join(PENDING, f);
    let job;
    try { job = JSON.parse(fs.readFileSync(from, 'utf8')); } catch (e) { continue; }
    const reason = junkReason(job.lead || {}, job.dossier && job.dossier.text);
    if (!reason) continue;
    job.reason = reason;
    fs.writeFileSync(path.join(JUNK, f), JSON.stringify(job));
    fs.unlinkSync(from);
    moved += 1;
  }
  return moved;
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
    sent: fs.readdirSync(SENT).filter(f => f.endsWith('.json')).length,
    junk: fs.readdirSync(JUNK).filter(f => f.endsWith('.json')).length
  };
}

module.exports = { push, pending, ack, stats, junk, sweep };
