/* ===========================================================================
   The first reply a lead gets, sent the moment the form lands.

   This is the product demo: greenaidigital.com sells "replies to every lead in
   under a minute", so the site does exactly that to the person who wrote in.
   Plain text on purpose. It reads like a person's email, not a newsletter, and
   it says at the bottom that it was sent automatically.
   ========================================================================= */

/* What each form choice is called in a sentence, and the one question that
   gets a useful answer back. Keys are contact.html's <select name="service">
   values; anything unknown falls back to 'unsure'. */
const SERVICES = {
  unsure:        ['help with the front office',          'Where does work get stuck most right now: calls, emails, quotes or invoices?'],
  ring:          ['RING, the AI on your phone line',      'Roughly how many calls a week go unanswered, and what do callers usually want?'],
  dispatch:      ['DISPATCH, inside your job software',   'Which one do you run on: Jobber, Housecall Pro or ServiceTitan?'],
  inbox:         ['INBOX, inside Gmail',                  'Where do most of your leads come in by email: your website, Google, or somewhere else?'],
  thread:        ['THREAD, inside Slack',                 'What does your team ask each other most often during the day?'],
  huddle:        ['HUDDLE, inside Microsoft Teams',       'What does your team ask each other most often during the day?'],
  books:         ['BOOKS, inside QuickBooks',             'About how many invoices go out a month, and how many end up paid late?'],
  'full-staff':  ['the full AI staff',                    'Which job would you hand over first if you could only pick one?'],
  'web-starter': ['a website',                            'Do you have a site now? If so, send the address and tell me what you dislike about it.'],
  'web-business':['a website',                            'Do you have a site now? If so, send the address and tell me what you dislike about it.'],
  'web-premium': ['a website',                            'Do you have a site now? If so, send the address and tell me what you dislike about it.'],
  'web-care':    ['website care',                         'What is the site address, and what needs changing most often?'],
  'ads-starter': ['finished ads',                         'Where do you run ads today, and what are you selling in them?'],
  'ads-growth':  ['finished ads',                         'Where do you run ads today, and what are you selling in them?'],
  'ads-scale':   ['finished ads',                         'Where do you run ads today, and what are you selling in them?'],
  seo:           ['AI SEO',                               'What is your website address, and which searches do you want to show up for?'],
  crm:           ['a CRM clean-up and dashboard',         'Which CRM do you use, and what number do you wish you knew every Monday?'],
  reviews:       ['the Google review engine',             'Roughly how many jobs do you finish in a month, and where are they marked done?'],
  winback:       ['winning back past customers',          'Where do your past customer records live: a CRM, QuickBooks, or a spreadsheet?'],
  custom:        ['a custom system',                      'What is the one job you would build first if it cost nothing?']
};

/* Choices where a recording of RING answering as their company is the
   useful next thing. The Mac-side lead desk builds and sends it. */
const DEMO_FOR = new Set(['unsure', 'ring', 'dispatch', 'inbox', 'full-staff']);

function firstName(d) {
  const f = String(d.first_name || '').trim() || String(d.contact || '').trim().split(/\s+/)[0] || '';
  return f.length > 1 && f.length < 30 ? f.charAt(0).toUpperCase() + f.slice(1) : '';
}

/**
 * @param {object} d   cleaned form fields (business, email, service, first_name, reference, kind)
 * @returns {{subject:string, text:string, demo:boolean}}
 */
function firstReply(d) {
  const first = firstName(d);
  const hi = first ? `Hi ${first},` : 'Hi,';
  const biz = d.business ? ` for ${d.business}` : '';

  if (d.kind === 'start') {
    const ref = d.reference ? ` (reference ${d.reference})` : '';
    return {
      subject: `Your start request is in${d.reference ? ' · ' + d.reference : ''}`,
      demo: !!d.business,
      text: [
        hi, '',
        `Your start request${biz}${ref} came through. Nothing has been charged.`, '',
        'Next step: I read everything you sent and call or text you, usually the same business day, to confirm it fits. ' +
        'After that you get the service agreement and the first invoice to read before anything starts.', '',
        d.business ? `Shortly you will also get a short recording of RING answering the phone as ${d.business}, so you can hear it before we talk.\n` : '',
        'If a call is easier, reply with a good time or ring me at (480) 798-0753.', '',
        SIGN
      ].filter(l => l !== null).join('\n')
    };
  }

  const key = SERVICES[d.service] ? d.service : 'unsure';
  const [label, question] = SERVICES[key];
  const demo = DEMO_FOR.has(key) && !!d.business;
  return {
    subject: first ? `Got it, ${first}. Here is what happens next` : 'Got it. Here is what happens next',
    demo,
    text: [
      hi, '',
      `Thanks for writing in about ${label}${biz}. I read every message myself and usually reply the same business day.`, '',
      `One question so I come back with something useful: ${question}`, '',
      demo ? `Shortly you will also get a short recording of RING answering the phone as ${d.business}, so you can hear what your callers would hear.\n` : '',
      'If a call is easier, reply with a good time or ring me at (480) 798-0753.', '',
      SIGN
    ].join('\n')
  };
}

const SIGN = [
  'Jaden',
  'GreenAI Solutions · Gilbert, Arizona',
  '(480) 798-0753 · greenaidigital.com',
  '',
  '--',
  'This reply went out automatically within a minute of your message, sent by INBOX, one of the AI employees we build. The demo recording and any reminder are automatic too. The conversation itself is with me.'
].join('\n');

module.exports = { firstReply, SERVICES };
