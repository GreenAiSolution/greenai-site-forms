/* ===========================================================================
   Junk filter for form submissions.

   From 2026-10-10 a bot flooded the contact form: ~2,000 submissions with no
   business name, names like "WilliamReerbGM", messages in Armenian or Cyrillic,
   and addresses scraped from strangers (mostly German ISPs). Each one was
   queued, the 19 MB queue timed out the lead desk, and every real lead behind
   it waited. Worse, each one earned a first reply, so we were mailing strangers.

   A submission is junk only on evidence a real Phoenix customer never shows.
   Junk is kept on the volume (see queue.junk), never deleted, so a false
   positive can be found and replayed.
   ========================================================================= */

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i;
const NON_LATIN = /[Ͱ-ϿЀ-ӿ԰-֏֐-׿؀-ۿ฀-๿぀-ヿ一-鿿가-힯]/;
const BOT_NAME = /^[A-Z][a-z]+[A-Z][a-z]+[A-Z]{2}$|[a-z][A-Z]{2,}$/;   // WilliamReerbGM, JamesvogeXT

/* Returns a short reason when the lead is junk, else ''. */
function junkReason(lead, message) {
  const email = String(lead.email || '').trim();
  if (!EMAIL.test(email) || (email.match(/@/g) || []).length !== 1) return 'invalid email';
  const msg = String(message || '');
  if (NON_LATIN.test(msg) || NON_LATIN.test(String(lead.first || ''))) return 'non-latin script';
  if (lead.business) return '';                      // a real business name outweighs the rest
  if (BOT_NAME.test(String(lead.first || ''))) return 'bot-style name';
  return '';
}

module.exports = { junkReason };
