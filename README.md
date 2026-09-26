# greenai-site-forms

The form mailer behind greenaidigital.com. `POST /api/submit` takes a contact or
start-request form, renders it as one email and sends it to the owner's inbox
with Reply-To set to the customer.

- CORS-locked to greenaidigital.com, honeypot field, email required.
- Credentials come from `SMTP_USER` / `SMTP_PASS` environment variables only.
- Plain Node `http` server plus nodemailer. `npm start`.
