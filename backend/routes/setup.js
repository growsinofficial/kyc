// One-time hosting setup. Disabled unless SETUP_TOKEN is set; remove the
// variable again once the template has been uploaded.
import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import { resetTemplateCache } from '../services/agreementPdf.js';

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

export default router;
