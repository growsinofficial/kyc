import express from 'express';
import { Agreement } from '../models/index.js';
import { verifyWebhook } from '../services/digio.js';
import { syncEsign } from '../services/agreementService.js';

const router = express.Router();

// @desc    Handle Zoho payment webhook
// @route   POST /api/webhooks/zoho-payment
// @access  Public (but verified with webhook secret)
router.post('/zoho-payment', async (req, res, next) => {
  try {
    // TODO: Implement webhook verification and processing
    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Digio eSign events (doc.signed, doc.sign.failed, doc.sign.rejected)
// @route   POST /api/webhooks/digio   (raw body, see server.js)
// @access  Public. The payload is never trusted on its own: the document's
//          status is always re-fetched from Digio before anything is marked signed.
router.post('/digio', async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  if (!verifyWebhook(raw, req.headers)) {
    return res.status(401).json({ success: false, error: 'Invalid webhook checksum' });
  }
  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }
  const documentId = event?.payload?.document?.id;
  // Acknowledge quickly; Digio retries on non-2xx.
  res.status(200).json({ success: true });
  if (!documentId) return;
  try {
    const agreement = await Agreement.findOne({ 'esign.documentId': documentId }).select('+unsignedPdf +signedPdf');
    if (agreement) await syncEsign(agreement);
  } catch (e) {
    console.error('Digio webhook processing failed:', e.message);
  }
});

export default router;
