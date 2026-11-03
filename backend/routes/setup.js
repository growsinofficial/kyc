// One-time hosting setup. Disabled unless SETUP_TOKEN is set; remove the
// variable again once the template has been uploaded.
import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import { resetTemplateCache, loadTemplate } from '../services/agreementPdf.js';
import Coupon from '../models/Coupon.js';
import { normalizeCode } from '../services/coupons.js';
import { deleteUserByMobile } from '../services/userCleanup.js';

const router = express.Router();

const tokenOk = (given) => {
  const expected = process.env.SETUP_TOKEN || '';
  if (expected.length < 24 || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

router.put('/agreement-template', express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res, next) => {
  try {
    if (!tokenOk(req.get('x-setup-token'))) return res.status(404).json({ success: false, message: 'Not found' });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ success: false, message: 'Send the PDF as application/pdf' });
    let pages;
    try { pages = (await PDFDocument.load(req.body)).getPageCount(); } catch { return res.status(400).json({ success: false, message: 'Not a readable PDF' }); }
    await mongoose.connection.db.collection('private_assets').replaceOne(
      { _id: 'agreement-template' },
      { _id: 'agreement-template', data: req.body, size: req.body.length, pages, uploadedAt: new Date() },
      { upsert: true },
    );
    resetTemplateCache();
    res.json({ success: true, pages, size: req.body.length });
  } catch (e) { next(e); }
});

// Download the stored template (to check layout and signature positions).
router.get('/agreement-template', async (req, res, next) => {
  try {
    if (!tokenOk(req.get('x-setup-token'))) return res.status(404).json({ success: false, message: 'Not found' });
    const pdf = await loadTemplate();
    res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' }).send(pdf);
  } catch (e) { next(e); }
});

// Create or update a coupon. Amounts in rupees, as in scripts/coupon.js.
// body: { code, type: 'percent'|'flat', value, maxDiscount?, minOrder?, uses?, perUser?, expires? (YYYY-MM-DD), plans?: [codes], description?, hidden?, active? }
router.put('/coupon', express.json(), async (req, res, next) => {
  try {
    if (!tokenOk(req.get('x-setup-token'))) return res.status(404).json({ success: false, message: 'Not found' });
    const b = req.body || {};
    const paise = (r) => (r === undefined || r === null ? null : Math.round(Number(r) * 100));
    if (!b.code || !['percent', 'flat'].includes(b.type) || !(Number(b.value) >= 0)) return res.status(400).json({ success: false, message: 'code, type (percent|flat) and value are required' });
    const doc = {
      code: normalizeCode(b.code), discountType: b.type, value: b.type === 'flat' ? paise(b.value) : Number(b.value),
      maxDiscountPaise: paise(b.maxDiscount), minOrderPaise: paise(b.minOrder) ?? 0,
      maxRedemptions: b.uses ? Number(b.uses) : null, perUserLimit: Number(b.perUser ?? 1),
      expiresAt: b.expires ? new Date(`${b.expires}T23:59:59+05:30`) : null,
      appliesToPlans: Array.isArray(b.plans) ? b.plans : [], description: String(b.description || ''),
      isPublic: !b.hidden, isActive: b.active !== false,
    };
    const coupon = await Coupon.findOneAndUpdate({ code: doc.code }, doc, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, coupon });
  } catch (e) { next(e); }
});

// Remove a client and all their data by mobile number. Dry run unless { confirm: true }.
router.post('/delete-user', express.json(), async (req, res, next) => {
  try {
    if (!tokenOk(req.get('x-setup-token'))) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, ...(await deleteUserByMobile(req.body?.mobile, { dryRun: req.body?.confirm !== true })) });
  } catch (e) { next(e); }
});

export default router;
