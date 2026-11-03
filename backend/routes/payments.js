import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/auth.js';
import { Coupon, PaymentOrder } from '../models/index.js';
import * as payments from '../services/payments.js';
import { normalizeCode } from '../services/coupons.js';

/**
 * Advisory fee checkout — same flow as the Growsin app (growsin-console
 * modules/app/payments): order -> Zoho checkout widget -> verify, with
 * coupons and a signature-checked webhook as backup.
 */
const router = express.Router();

const userLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, keyGenerator: (req) => req.user?._id?.toString() || req.ip, standardHeaders: true, legacyHeaders: false });
const webhookLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const wrap = (fn) => async (req, res, next) => { try { res.json({ success: true, ...(await fn(req, res)) }); } catch (e) { next(e); } };

// Plan from the signed agreement, available coupons, and whether it is paid.
router.get('/summary', protect, wrap((req) => payments.summary(req.user)));

// "Apply" a coupon: a dry run, nothing is held.
router.post('/coupons/validate', protect, userLimiter, wrap(async (req) => ({ quote: await payments.validateCoupon(req.user, req.body?.code) })));

// Create the order (and the Zoho payment session).
router.post('/order', protect, userLimiter, wrap((req) => payments.createOrder(req.user, { couponCode: req.body?.couponCode })));

// After the checkout widget: { orderId, paymentId, signature }
router.post('/verify', protect, userLimiter, wrap((req) => payments.verify(req.user, req.body || {})));

// The client closed the checkout.
router.post('/cancel', protect, userLimiter, wrap((req) => payments.cancel(req.user, req.body?.orderId)));

router.get('/history', protect, wrap(async (req) => ({
  orders: await PaymentOrder.find({ userId: req.user._id }).sort({ createdAt: -1 }).select('-__v'),
})));

// Zoho webhook (Settings > Webhooks): https://<site>/api/payments/webhook, events payment.success
router.post('/webhook', webhookLimiter, async (req, res, next) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
    res.json(await payments.handleWebhook(raw, req.get('x-zoho-webhook-signature')));
  } catch (e) { next(e); }
});

// ---- Coupons (admin) ----
const couponFields = ['description', 'discountType', 'value', 'maxDiscountPaise', 'minOrderPaise', 'appliesToPlans', 'validFrom', 'expiresAt', 'maxRedemptions', 'perUserLimit', 'isActive', 'isPublic'];
const pick = (b) => Object.fromEntries(couponFields.filter((k) => b?.[k] !== undefined).map((k) => [k, b[k]]));

router.get('/admin/coupons', protect, authorize('admin'), wrap(async () => ({ coupons: await Coupon.find().sort({ createdAt: -1 }) })));
router.post('/admin/coupons', protect, authorize('admin'), wrap(async (req) => ({ coupon: await Coupon.create({ code: normalizeCode(req.body?.code), ...pick(req.body) }) })));
router.patch('/admin/coupons/:code', protect, authorize('admin'), wrap(async (req) => {
  const coupon = await Coupon.findOneAndUpdate({ code: normalizeCode(req.params.code) }, pick(req.body), { new: true, runValidators: true });
  if (!coupon) throw Object.assign(new Error('Coupon not found'), { statusCode: 404 });
  return { coupon };
}));

export default router;
