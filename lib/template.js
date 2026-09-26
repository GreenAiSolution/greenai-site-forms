/* ===========================================================================
   GreenAI Solutions — the lead dossier email.

   One job: Jaden opens this on a phone and knows, in three seconds, who wrote
   in and what to build them. So the layout is ranked by what he actually acts
   on, not by the order the form collects it:

     1. WHO + what they do        — the identity line
     2. THE QUESTION they get asked — this is the demo script. It is the single
                                     most useful field on the form, so it is
                                     the visual hero, not a row in a table.
     3. HOW to reach them          — one tap, no copy-paste
     4. Everything else            — a quiet ledger underneath

   Email clients are not browsers: no flexbox, no grid, no <style> reliability,
   no web fonts, no JS. So this is 600px tables, inline styles, bgcolor
   attributes, and Georgia (which every client has) standing in for the site's
   Playfair Display. Dark palette matches greenaidigital.com: ink #050b07,
   signal green #7de3a4, brass #e7c85f.
   ========================================================================= */

const INK='#050b07', PANEL='#0b1710', LINE='rgba(255,255,255,.10)',
      GREEN='#7de3a4', BRASS='#e7c85f', BODY='rgba(255,255,255,.74)',
      MUTED='rgba(255,255,255,.45)';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* A labelled cell in the ledger. */
function cell(label, value, opts) {
  const o = opts || {};
  if (!value) return '';
  const shown = o.href
    ? `<a href="${esc(o.href)}" style="color:${GREEN};text-decoration:none;border-bottom:1px solid rgba(125,227,164,.35)">${esc(value)}</a>`
    : esc(value);
  return `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid ${LINE};font:600 10px/1 -apple-system,'Segoe UI',Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};width:38%;vertical-align:top">${esc(label)}</td>
    <td style="padding:14px 0;border-bottom:1px solid ${LINE};font:400 15px/1.5 -apple-system,'Segoe UI',Arial,sans-serif;color:#fff;vertical-align:top">${shown}</td>
  </tr>`;
}

function button(href, text, primary) {
  const bg = primary ? GREEN : 'transparent';
  const fg = primary ? '#04140a' : '#fff';
  const bd = primary ? GREEN : 'rgba(255,255,255,.34)';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;margin:0 8px 8px 0">
    <tr><td bgcolor="${primary?GREEN:PANEL}" style="border:1px solid ${bd};border-radius:9px">
      <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font:700 14px/1 -apple-system,'Segoe UI',Arial,sans-serif;color:${fg};text-decoration:none;background:${bg}">${esc(text)}</a>
    </td></tr></table>`;
}

/**
 * @param {object} d  form fields
 * @param {object} meta  { kind, receivedAt, source }
 */
function render(d, meta) {
  meta = meta || {};
  const kind = meta.kind || 'New enquiry';
  const biz  = d.business || d.name || 'Someone';
  const trade = d.trade || '';
  const area  = d.service_area || '';
  const email = d.email || '';
  const phone = (d.phone || '').replace(/[^\d+]/g,'');
  const ask   = d.always_asked || d.message || '';

  /* The identity line: "phx growth — HVAC in mesa" reads as one sentence. */
  const identity = [trade, area && ('in ' + area)].filter(Boolean).join(' ');

  const subjectLine = `${biz}${trade ? ' — ' + trade : ''}`;

  const actions =
    (email ? button('mailto:' + email + '?subject=' + encodeURIComponent('Your GreenAI demo — ' + biz), 'Reply to ' + biz, true) : '') +
    (phone ? button('tel:' + phone, 'Call ' + (d.phone||''), false) : '');

  const html = `<!-- GreenAI lead dossier -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};margin:0;padding:0">
 <tr><td align="center" style="padding:28px 14px 40px">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%">

   <!-- brand bar -->
   <tr><td style="padding:0 0 18px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td style="font:700 13px/1 -apple-system,'Segoe UI',Arial,sans-serif;letter-spacing:.02em;color:#fff">
         Green<span style="color:${BRASS}">AI</span>
         <span style="color:${MUTED};font-weight:600;letter-spacing:.16em;font-size:9px;text-transform:uppercase">&nbsp;&nbsp;Solutions Team</span>
       </td>
       <td align="right" style="font:600 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:${MUTED}">${esc(meta.receivedAt||'')}</td>
     </tr></table>
   </td></tr>

   <!-- the card -->
   <tr><td bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${LINE};border-radius:20px;padding:0;overflow:hidden">

     <!-- hairline of brand colour across the top -->
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
       <tr><td height="3" bgcolor="${GREEN}" style="height:3px;line-height:3px;font-size:0;background:${GREEN}">&nbsp;</td></tr>
     </table>

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:30px 30px 8px">

       <!-- kind chip -->
       <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr>
         <td bgcolor="#0f2418" style="background:#0f2418;border:1px solid rgba(125,227,164,.30);border-radius:100px;padding:7px 15px;font:700 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:${GREEN}">${esc(kind)}</td>
       </tr></table>

       <!-- who -->
       <div style="font:400 34px/1.08 Georgia,'Times New Roman',serif;color:#fff;letter-spacing:-.01em;margin:0 0 8px">${esc(biz)}</div>
       ${identity ? `<div style="font:400 15px/1.5 -apple-system,'Segoe UI',Arial,sans-serif;color:${BRASS};margin:0 0 26px">${esc(identity)}</div>` : '<div style="height:12px"></div>'}

     </td></tr></table>

     ${ask ? `
     <!-- THE HERO: what they get asked. This is the demo script. -->
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 30px">
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#08150e" style="background:#08150e;border:1px solid rgba(231,200,95,.22);border-radius:14px">
         <tr><td style="padding:22px 24px">
           <div style="font:700 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:${BRASS};margin:0 0 12px">What their customers always ask</div>
           <div style="font:400 21px/1.5 Georgia,'Times New Roman',serif;color:#fff">&ldquo;${esc(ask)}&rdquo;</div>
           <div style="font:400 12px/1.6 -apple-system,'Segoe UI',Arial,sans-serif;color:${MUTED};margin:12px 0 0">This is the line the demo has to answer. Build the call around it.</div>
         </td></tr>
       </table>
     </td></tr></table>` : ''}

     <!-- ledger -->
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:26px 30px 6px">
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
         ${cell('Business', biz)}
         ${cell('Trade', trade)}
         ${cell('Service area', area)}
         ${cell('Email', email, {href:'mailto:'+email})}
         ${cell('Phone', d.phone, {href:'tel:'+phone})}
         ${(d.extras||[]).map(function(x){ return cell(x[0], x[1]); }).join('')}
         ${cell('Came from', meta.source)}
       </table>
     </td></tr></table>

     ${d.brief ? `
     <!-- start.html sends a full build brief; keep it monospaced and intact -->
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 30px 0">
       <div style="font:700 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:${GREEN};margin:0 0 10px">The build brief</div>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#061009" style="background:#061009;border:1px solid ${LINE};border-radius:12px">
         <tr><td style="padding:18px 20px"><pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:400 12px/1.7 ui-monospace,Menlo,Consolas,monospace;color:${BODY}">${esc(d.brief)}</pre></td></tr>
       </table>
     </td></tr></table>` : ''}

     <!-- actions -->
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 30px 30px">
       ${actions}
       <div style="font:400 12px/1.7 -apple-system,'Segoe UI',Arial,sans-serif;color:${MUTED};padding:6px 0 0">
         Replying goes straight to them &mdash; this email is already set to reply to ${esc(email||'the sender')}.
       </div>
     </td></tr></table>

   </td></tr>

   <!-- footer -->
   <tr><td style="padding:22px 6px 0;font:400 11px/1.7 -apple-system,'Segoe UI',Arial,sans-serif;color:${MUTED}">
     Sent by the GreenAI Solutions website &mdash; greenaidigital.com<br/>
     You are getting this because someone filled in a form on your own site.
   </td></tr>

  </table>
 </td></tr>
</table>`;

  const text =
`${kind.toUpperCase()}
${'='.repeat(kind.length)}

${biz}${identity ? ' — ' + identity : ''}

WHAT THEIR CUSTOMERS ALWAYS ASK
${ask ? '"' + ask + '"' : '(not given)'}

Business ....... ${biz}
Trade .......... ${trade || '-'}
Service area ... ${area || '-'}
Email .......... ${email || '-'}
Phone .......... ${d.phone || '-'}
Came from ...... ${meta.source || '-'}
Received ....... ${meta.receivedAt || '-'}
${(d.extras||[]).map(function(x){ return (x[0]+' ').padEnd(16,'.')+' '+x[1]; }).join('\n')}
${d.brief ? '\n--- BUILD BRIEF ---\n'+d.brief+'\n' : ''}

Reply to this email and it goes straight to ${email || 'the sender'}.
-- GreenAI Solutions, greenaidigital.com`;

  return { html, text, subjectLine };
}

module.exports = { render };
