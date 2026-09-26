/* ===========================================================================
   server.js — Railway entrypoint for greenaidigital.com's form mailer.

   On Vercel each file in api/ was its own serverless function with the
   (req, res) shape Vercel provides: req.body already parsed, res.status()
   and res.json() helpers. Railway runs one long-lived process instead, so
   this file is that process: a plain Node http server (no extra packages)
   that gives every incoming request the same shape and hands it to the
   untouched handlers in api/. The handlers own their own CORS, auth and
   method checks — nothing here changes that behaviour.

     GET  /             -> one-line 200 (Railway health check)
     *    /api/submit   -> api/submit.js  (site forms; POST + OPTIONS)
     *    /api/queue    -> api/queue.js   (lead desk; bearer token)
   ========================================================================= */

const http = require('http');

const ROUTES = {
  '/api/submit': require('./api/submit.js'),
  '/api/queue':  require('./api/queue.js')
};

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 256 * 1024;   /* start.html's brief is capped at 12k chars; this is generous */

/* Read the whole request body as a string, refusing anything oversized. */
function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function (c) {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

/* Mirror what Vercel did for req.body: JSON and urlencoded become objects,
   anything else is left as the raw string (submit.js's parseBody copes). */
function parseBody(raw, contentType) {
  if (!raw) return {};
  const ct = String(contentType || '').toLowerCase();
  if (ct.indexOf('application/json') !== -1) {
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }
  if (ct.indexOf('application/x-www-form-urlencoded') !== -1) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return raw;
}

/* The two helpers the handlers call that Node's ServerResponse lacks. */
function decorate(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    const body = JSON.stringify(obj);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body));
    }
    res.end(body);
    return res;
  };
  return res;
}

const server = http.createServer(async function (req, res) {
  decorate(res);
  const path = (req.url || '/').split('?')[0];

  if (path === '/' || path === '/health') {
    if (path === '/health') return res.status(200).json({ ok: true, ...require('./lib/queue.js').stats() });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).end('greenai-forms ok\n');
  }

  const handler = ROUTES[path];
  if (!handler) return res.status(404).json({ ok: false, error: 'Not found' });

  try {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.body = parseBody(await readBody(req), req.headers['content-type']);
    } else {
      req.body = {};
    }
    await handler(req, res);
    if (!res.writableEnded) res.status(204).end();
  } catch (err) {
    console.error(path, 'failed:', err && err.message);
    if (!res.headersSent) res.status(err && err.message === 'body too large' ? 413 : 500)
      .json({ ok: false, error: 'Server error.' });
    else res.end();
  }
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('greenai-forms listening on ' + PORT);
});
