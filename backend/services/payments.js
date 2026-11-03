import crypto from 'crypto';
import { Plan, Agreement, User, PaymentOrder, Coupon, CouponRedemption } from '../models/index.js';
import * as coupons from './coupons.js';
import { zohoPayConfigured, widgetConfig, createPaymentSession, getPaymentSession, verifyWidgetSignature, verifyWebhookSignature, extractSessionId } from './zohoPay.js';

const httpError = (status, message, code) => Object.assign(new Error(message), { statusCode: status, code });

/** zoho when configured; a test checkout only on a test site; otherwise unavailable. */
function gateway() {
  if (zohoPayConfigured()) return 'zoho';
  if (process.env.TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') return 'test';
  throw httpError(503, 'Online payment is not available right now. Please try again later.', 'payment_not_configured');
}

/** The plan being paid for is the one in the client's signed agreement. */
async function signedAgreementPlan(user) {
  if (!user.flags?.agreementSigned) throw httpError(400, 'Please sign the agreement before paying.', 'agreement_not_signed');
  const agreement = await Agreement.findOne({ userId: user._id, status: 'signed' }).sort({ createdAt: -1 });
  if (!agreement) throw httpError(400, 'Please sign the agreement before paying.', 'agreement_not_signed');
  const plan = await Plan.findById(agreement.planId);
  if (!plan || !plan.isActive) throw httpError(400, 'The plan in your agreement is not available. Please contact us.', 'unknown_plan');
  return { agreement, plan };
}

export async function summary(user) {
  const { plan } = await signedAgreementPlan(user);
  return {
    plan: { id: plan._id, code: plan.planCode, title: plan.title || plan.name, billingCycle: plan.billingCycle, pricePaise: coupons.planPaise(plan) },
    coupons: await coupons.listAvailable(user._id, plan),
    paid: !!user.flags?.paymentDone,
  };
}

export async function validateCoupon(user, code) {
  const { plan } = await signedAgreementPlan(user);
  return coupons.validate(user._id, code, plan);
}

/** Step 1: create the order (price decided here, never by the browser). */
export async function createOrder(user, { couponCode }) {
  if (user.flags?.paymentDone) throw httpError(409, 'Your fee is already paid.', 'already_paid');
  const { agreement, plan } = await signedAgreementPlan(user);
  let redemptionId = null;
  let quote = { originalPaise: coupons.planPaise(plan), discountPaise: 0, finalPaise: coupons.planPaise(plan), coupon: null };
  if (couponCode) ({ quote, redemptionId } = await coupons.reserve(user._id, couponCode, plan));
  try {
    const free = quote.finalPaise === 0;
    const gw = free ? 'coupon' : gateway();
    const orderId = gw === 'zoho'
      ? await createPaymentSession({ amountPaise: quote.finalPaise, description: `${plan.title || plan.name} — Growsin advisory fee`, referenceNumber: `u${user._id}_${Date.now()}` })
      : `${gw}_${crypto.randomBytes(9).toString('hex')}`;
    const order = await PaymentOrder.create({
      userId: user._id, planId: plan._id, planCode: plan.planCode, agreementId: agreement._id, gateway: gw, gatewayOrderId: orderId,
      originalPaise: quote.originalPaise, discountPaise: quote.discountPaise, amountPaise: quote.finalPaise, couponCode: quote.coupon?.code || null,
    });
    if (redemptionId) await CouponRedemption.updateOne({ _id: redemptionId }, { orderId: order._id });
    if (free) await markPaid(order._id, 'coupon');
    return {
      orderId, gateway: gw, free, status: free ? 'paid' : 'created',
      widget: gw === 'zoho' ? widgetConfig() : null,
      amountPaise: quote.finalPaise, originalPaise: quote.originalPaise, discountPaise: quote.discountPaise,
      coupon: quote.coupon ? { code: quote.coupon.code } : null,
      plan: { title: plan.title || plan.name },
      customer: { name: user.name, email: user.email, phone: user.mobile },
    };
  } catch (e) {
    if (redemptionId) await CouponRedemption.deleteOne({ _id: redemptionId }).catch(() => {});
    throw e;
  }
}

/** Step 2: after the checkout widget succeeds. Signature first, then a live status check. */
export async function verify(user, { orderId, paymentId, signature }) {
  const order = await PaymentOrder.findOne({ gatewayOrderId: orderId, userId: user._id });
  if (!order) throw httpError(404, 'Order not found', 'order_not_found');
  if (order.status === 'paid') return { status: 'paid' };
  if (order.gateway === 'zoho') {
    if (paymentId && signature) {
      if (!verifyWidgetSignature(paymentId, orderId, signature)) throw httpError(400, 'We could not confirm this payment. Please contact us.', 'bad_signature');
      await markPaid(order._id, paymentId);
      return { status: 'paid' };
    }
    const s = await getPaymentSession(orderId);
    if (!s.paid) return { status: s.status };
    await markPaid(order._id, s.paymentId || 'zoho_unknown');
    return { status: 'paid' };
  }
  if (order.gateway === 'test') {
    if (process.env.TEST_MODE !== 'true' || process.env.NODE_ENV === 'production') throw httpError(400, 'Test payments are off.', 'test_off');
    await markPaid(order._id, `test_${crypto.randomBytes(6).toString('hex')}`);
    return { status: 'paid' };
  }
  return { status: order.status };
}

/** The client closed the checkout: free the coupon hold now. Paying later still works via the webhook. */
export async function cancel(user, orderId) {
  const order = await PaymentOrder.findOneAndUpdate({ gatewayOrderId: orderId, userId: user._id, status: 'created' }, { status: 'failed' });
  if (order?.couponCode) await CouponRedemption.deleteMany({ orderId: order._id, status: 'reserved' });
  return { cancelled: !!order };
}

/** Zoho -> server. Verified by signature; status always re-read from Zoho. */
export async function handleWebhook(rawBody, header) {
  if (!verifyWebhookSignature(rawBody, header)) throw httpError(401, 'Invalid webhook signature', 'bad_signature');
  let event = {};
  try { event = JSON.parse(rawBody); } catch { throw httpError(400, 'Invalid webhook body'); }
  // Zoho's dashboard calls it payment.succeeded; older docs say payment.success.
  const type = String(event.event_type ?? event.event ?? event.type ?? '').toLowerCase();
  if (!['payment.succeeded', 'payment.success'].includes(type)) return { ok: true };
  const sessionId = extractSessionId(event);
  if (!sessionId) return { ok: true };
  const order = await PaymentOrder.findOne({ gatewayOrderId: sessionId });
  if (!order) return { ok: true };
  const s = await getPaymentSession(sessionId).catch(() => null);
  if (s?.paid) await markPaid(order._id, s.paymentId || 'zoho_unknown');
  return { ok: true };
}

/** Idempotent: safe from both verify and the webhook. */
async function markPaid(orderObjectId, gatewayPaymentId) {
  const order = await PaymentOrder.findOneAndUpdate({ _id: orderObjectId, status: { $ne: 'paid' } }, { status: 'paid', gatewayPaymentId, paidAt: new Date() }, { new: true });
  if (!order) return;
  if (order.couponCode) {
    const r = await CouponRedemption.updateMany({ orderId: order._id }, { status: 'redeemed', redeemedAt: new Date() });
    if (!r.modifiedCount) {
      // The hold expired while the order sat unpaid: still count the use.
      const c = await Coupon.findOne({ code: order.couponCode });
      if (c) await CouponRedemption.create({ couponId: c._id, userId: order.userId, orderId: order._id, discountPaise: order.discountPaise, status: 'redeemed', redeemedAt: new Date() });
    }
  }
  await User.findByIdAndUpdate(order.userId, { 'flags.paymentDone': true, subscriptionStatus: 'active' });
}
