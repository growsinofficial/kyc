import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.js';
import { Agreement } from '../models/index.js';
import { generateAgreement, findOwnAgreement, startEsign, syncEsign } from '../services/agreementService.js';

const router = express.Router();

const generateLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// @desc    Fill the agreement template with the client's details
// @route   POST /api/agreements/generate   body: { planId }
// @access  Private
router.post('/generate', protect, generateLimiter, async (req, res, next) => {
  try {
    const agreement = await generateAgreement(req.user._id, req.body.planId);
    res.status(201).json({ success: true, agreement: agreement.toClient() });
  } catch (error) {
    next(error);
  }
});

// @desc    Latest agreement for the signed-in client
// @route   GET /api/agreements/current
// @access  Private
router.get('/current', protect, async (req, res, next) => {
  try {
    const agreement = await Agreement.findOne({ userId: req.user._id, status: { $ne: 'superseded' } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, agreement: agreement ? agreement.toClient() : null });
  } catch (error) {
    next(error);
  }
});

// @desc    The agreement PDF (signed copy when available, or ?version=unsigned)
// @route   GET /api/agreements/:id/pdf
// @access  Private (owner only)
router.get('/:id/pdf', protect, async (req, res, next) => {
  try {
    const agreement = await findOwnAgreement(req.user._id, req.params.id, true);
    const wantUnsigned = req.query.version === 'unsigned';
    const pdf = !wantUnsigned && agreement.signedPdf ? agreement.signedPdf : agreement.unsignedPdf;
    const name = agreement.signedPdf && !wantUnsigned ? agreement.fileName.replace(/\.pdf$/, '_signed.pdf') : agreement.fileName;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

// @desc    Start Aadhaar eSign with Digio (returns what the Digio Web SDK needs)
// @route   POST /api/agreements/:id/esign
// @access  Private
router.post('/:id/esign', protect, async (req, res, next) => {
  try {
    const esign = await startEsign(req.user._id, req.params.id);
    res.status(200).json({ success: true, esign });
  } catch (error) {
    next(error);
  }
});

// @desc    Called after the Digio window closes: confirm with Digio and store the signed PDF
// @route   POST /api/agreements/:id/esign/complete
// @access  Private
router.post('/:id/esign/complete', protect, async (req, res, next) => {
  try {
    const agreement = await findOwnAgreement(req.user._id, req.params.id, true);
    if (req.body?.txn_id && agreement.esign) {
      agreement.esign.txnId = String(req.body.txn_id).slice(0, 100);
      agreement.markModified('esign');
    }
    const synced = await syncEsign(agreement);
    res.status(200).json({ success: true, agreement: synced.toClient() });
  } catch (error) {
    next(error);
  }
});

export default router;
