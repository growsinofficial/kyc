import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { OVERLAYS, PAGE_H, CONTENT_PAGES, CLIENT_SIGNATURE_BOXES } from '../config/agreementLayout.js';
import { RISK_QUESTIONS, RISK_CATEGORIES } from '../config/riskQuestions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The template is NOT stored in git (the repo is public and the PDF carries
 * the adviser's signature). Put it at backend/private/agreement-template.pdf
 * or point AGREEMENT_TEMPLATE_PATH at it.
 */
export const templatePath = () =>
  process.env.AGREEMENT_TEMPLATE_PATH || path.join(__dirname, '..', 'private', 'agreement-template.pdf');

let templateCache = null;
export const resetTemplateCache = () => { templateCache = null; };
export async function loadTemplate() {
  if (templateCache) return templateCache;
  const p = templatePath();
  if (!fs.existsSync(p)) {
    // Hosted setups can keep the template in the database instead (scripts/uploadTemplate.js).
    const doc = mongoose.connection.readyState === 1
      ? await mongoose.connection.db.collection('private_assets').findOne({ _id: 'agreement-template' })
      : null;
    if (doc?.data) {
      templateCache = Buffer.from(doc.data.buffer ?? doc.data);
      return templateCache;
    }
    const err = new Error(`Agreement template not found at ${p}. Copy the signed-off agreement PDF there (see backend/.env.example).`);
    err.statusCode = 500;
    throw err;
  }
  templateCache = await fs.promises.readFile(p);
  return templateCache;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  // Agreement dates are Indian dates.
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return `${String(ist.getUTCDate()).padStart(2, '0')}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()}`;
}

const TENURE = { 'one-time': 'One time', monthly: '1 month', quarterly: '3 months', yearly: '12 months' };

function formatMobile(m) {
  const d = String(m || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : String(m || '');
}

/** Everything printed on the agreement, built from stored data. */
export function buildAgreementValues({ user, kyc, risk, plan, agreementDate = new Date() }) {
  const personal = kyc?.personal || {};
  const address = kyc?.address || {};
  const category = risk.riskCategory;
  const answers = risk.answers instanceof Map ? Object.fromEntries(risk.answers) : risk.answers || {};
  const values = {
    Client_Name: personal.name || user.name,
    Salutation: personal.gender === 'Male' ? 'Mr.' : personal.gender === 'Female' ? 'Ms.' : 'Mr./Ms.',
    Father_Name: personal.fatherName || '',
    Date_of_Birth: formatDate(personal.dob),
    PAN: String(personal.pan || '').toUpperCase(),
    Mobile: formatMobile(address.mobile || user.mobile),
    Email: address.email || user.email,
    Address: [address.address, address.city, [address.state, address.pincode].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', '),
    Risk_Score: String(risk.riskScore),
    Risk_Type: category,
    Risk_Type_Investor: `${category} Investor.`,
    Suitability_Remarks: RISK_CATEGORIES[category]?.remarks || '',
    Service_Subscribed: plan.title || plan.name,
    Fee_Amount: `${Number(plan.price).toLocaleString('en-IN')}/-`,
    Service_Tenure: TENURE[plan.billingCycle] || plan.billingCycle,
    Service_Start_Date: formatDate(agreementDate),
    Agreement_Date: formatDate(agreementDate),
    Submission_Date: formatDate(risk.completedAt || agreementDate),
  };
  for (const q of RISK_QUESTIONS) {
    const a = answers[q.id];
    const picks = Array.isArray(a) ? a : [a];
    values[`Q_${q.id}`] = picks
      .filter((i) => i !== undefined && i !== null && q.options[i])
      .map((i) => q.options[i].label)
      .join(', ');
  }
  return values;
}

const SANITIZE = { '−': '-', '₹': 'Rs. ', ' ': ' ', '‑': '-' };

export async function renderAgreementPdf(values, { testSignature = null } = {}) {
  const pdf = await PDFDocument.load(await loadTemplate());
  while (pdf.getPageCount() > CONTENT_PAGES) pdf.removePage(pdf.getPageCount() - 1);

  const fonts = {
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  // Helvetica is wider than Calibri; scale it down so lines fit like the original.
  const SANS_SCALE = 0.93;
  const charsets = {};
  for (const [k, f] of Object.entries(fonts)) charsets[k] = new Set(f.getCharacterSet());
  const clean = (text, fontKey) =>
    [...String(text ?? '')]
      .map((ch) => SANITIZE[ch] ?? ch)
      .join('')
      .split('')
      .filter((ch) => charsets[fontKey].has(ch.codePointAt(0)))
      .join('');

  const pages = pdf.getPages();

  for (const o of OVERLAYS) {
    const page = pages[o.page - 1];
    if (!page) continue;
    const base = o.font === 'sans' ? 'sans' : 'serif';
    let size = o.size * (base === 'sans' ? SANS_SCALE : 1);
    const color = o.color ? rgb(...o.color) : rgb(0.07, 0.07, 0.07);

    if (o.cover) {
      page.drawRectangle({ x: o.x, y: PAGE_H - o.y - o.h, width: o.w, height: o.h, color: rgb(1, 1, 1) });
    }

    // Build styled runs: [{text, bold, color}]
    const runs = [];
    if (o.key) {
      runs.push({ text: values[o.key] ?? '', bold: !!o.bold, color });
    } else {
      const parts = o.text.split(/(\{\w+\}|\*\*[^*]+\*\*)/);
      for (const part of parts) {
        if (!part) continue;
        const m = part.match(/^\{(\w+)\}$/);
        if (m) {
          runs.push({
            text: values[m[1]] ?? '',
            bold: !!o.bold || (o.boldKeys || []).includes(m[1]),
            color: o.colorKeys?.[m[1]] ? rgb(...o.colorKeys[m[1]]) : color,
          });
        } else if (part.startsWith('**')) {
          runs.push({ text: part.slice(2, -2), bold: true, color });
        } else {
          runs.push({ text: part, bold: !!o.bold, color });
        }
      }
    }
    const fontFor = (bold) => fonts[bold ? `${base}Bold` : base];
    const keyFor = (bold) => (bold ? `${base}Bold` : base);
    for (const r of runs) r.text = clean(r.text, keyFor(r.bold));

    const lineHeight = o.lineHeight ? o.lineHeight * (base === 'sans' ? 1 : 1) : null;

    if (!lineHeight) {
      // Single line
      const width = () => runs.reduce((w, r) => w + fontFor(r.bold).widthOfTextAtSize(r.text, size), 0);
      if (o.fit) {
        const min = size * 0.6;
        while (width() > o.w && size > min) size *= 0.95;
      }
      let x = o.x;
      const baseline = PAGE_H - o.y - size * 0.86;
      for (const r of runs) {
        if (!r.text) continue;
        page.drawText(r.text, { x, y: baseline, size, font: fontFor(r.bold), color: r.color });
        x += fontFor(r.bold).widthOfTextAtSize(r.text, size);
      }
      continue;
    }

    // Paragraph: word wrap across runs, optional justification
    const words = [];
    for (const r of runs) {
      const pieces = r.text.split(/(\s+)/);
      for (const p of pieces) {
        if (!p) continue;
        if (/^\s+$/.test(p)) {
          if (words.length) words[words.length - 1].spaceAfter = true;
          continue;
        }
        const last = words[words.length - 1];
        // glue punctuation-only pieces to the previous word (e.g. "Nair" + ",")
        if (last && !last.spaceAfter && last.bold === r.bold) {
          last.text += p;
        } else if (last && !last.spaceAfter) {
          words.push({ text: p, bold: r.bold, color: r.color, glued: true });
        } else {
          words.push({ text: p, bold: r.bold, color: r.color });
        }
      }
    }
    const spaceW = (bold) => fontFor(bold).widthOfTextAtSize(' ', size);
    const wordW = (w) => fontFor(w.bold).widthOfTextAtSize(w.text, size);
    const lines = [];
    let line = [];
    let lw = 0;
    for (const w of words) {
      const add = (line.length && !w.glued ? spaceW(w.bold) : 0) + wordW(w);
      if (line.length && lw + add > o.w && !w.glued) {
        lines.push(line);
        line = [w];
        lw = wordW(w);
      } else {
        line.push(w);
        lw += add;
      }
    }
    if (line.length) lines.push(line);

    lines.forEach((ln, li) => {
      const baseline = PAGE_H - o.y - size * 0.86 - li * lineHeight;
      const natural = ln.reduce((s, w, i) => s + wordW(w) + (i && !w.glued ? spaceW(w.bold) : 0), 0);
      const gaps = ln.filter((w, i) => i && !w.glued).length;
      const extra = o.justify && li < lines.length - 1 && gaps ? (o.w - natural) / gaps : 0;
      let x = o.x;
      ln.forEach((w, i) => {
        if (i && !w.glued) x += spaceW(w.bold) + extra;
        page.drawText(w.text, { x, y: baseline, size, font: fontFor(w.bold), color: w.color });
        x += wordW(w);
      });
    });
  }

  if (testSignature) stampTestSignature(pages, fonts, testSignature);

  return pdf.save();
}

/** Only for DIGIO_MODE=mock: a visible "TEST" signature stamp, never a real eSign. */
function stampTestSignature(pages, fonts, { name, signedAt }) {
  for (const b of CLIENT_SIGNATURE_BOXES) {
    const page = pages[b.page - 1];
    if (!page) continue;
    const y = PAGE_H - b.y - b.h;
    page.drawRectangle({ x: b.x, y, width: b.w, height: b.h, color: rgb(0.95, 0.98, 0.95), borderColor: rgb(0.18, 0.53, 0.33), borderWidth: 0.8 });
    page.drawText('TEST MODE - not a legal signature', { x: b.x + 6, y: y + b.h - 10, size: 6.5, font: fonts.sansBold, color: rgb(0.7, 0.2, 0.1) });
    page.drawText(`Signed by ${String(name).toUpperCase()}`.slice(0, 48), { x: b.x + 6, y: y + b.h - 19, size: 7, font: fonts.sansBold, color: rgb(0.1, 0.42, 0.23) });
    page.drawText(`Simulated Aadhaar eSign ${formatDate(signedAt)}`, { x: b.x + 6, y: y + 4, size: 6, font: fonts.sans, color: rgb(0.35, 0.35, 0.35) });
  }
}
