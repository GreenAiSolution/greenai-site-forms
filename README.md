# greenai-site-forms

The form endpoint behind greenaidigital.com.

- `POST /api/submit` takes a contact or start-request form, renders the lead
  email for the owner and the instant first reply for the customer, and puts
  both in a durable queue (one JSON file per lead on a Railway volume).
- `GET/POST /api/queue` (bearer token) is how the lead desk on the owner's
  machine collects queued leads and confirms them once sent. Railway blocks
  outbound SMTP on this plan, so mail goes out from there.
- `GET /health` reports how many leads are waiting and how old the oldest is.

CORS-locked to greenaidigital.com, honeypot field, email required, first
replies capped per address and per day. No dependencies: plain Node `http`.
