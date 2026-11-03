import { Coupon, CouponRedemption } from '../models/index.js';

/** An unpaid order holds a coupon for this long, then it frees up. */
export const RESERVATION_TTL_MS = 30 * 60 * 1000;

const httpError = (status, message, code) => Object.assign(new Error(message), { statusCode: status, code });
export const normalizeCode = (raw) => String(raw || '').trim().toUpperCase();
export const rupees = (paise) => {
  const d = paise % 100 ? 2 : 0;
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
};
export const planPaise = (plan) => Math.round(Number(plan.price) * 100);

/** The only place a discount is computed. */
export function computeDiscount(coupon, pricePaise) {
  let d = coupon.discountType === 'percent' ? Math.floor((pricePaise * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscountPaise != null) d = Math.min(d, coupon.maxDiscountPaise);
  return Math.max(0, Math.min(d, pricePaise));
}

const live = () => ({ $or: [{ status: 'redeemed' }, { status: 'reserved', createdAt: { $gt: new Date(Date.now() - RESERVATION_TTL_MS) } }] });

/** Throws a clear message if the coupon can't be used; otherwise returns the price breakdown. */
export async function evaluate(userId, coupon, plan, { ignoreOrderId } = {}) {
  const now = new Date();
  if (!coupon || !coupon.isActive) throw httpError(400, 'Invalid coupon code.', 'coupon_invalid');
  if (coupon.validFrom && coupon.validFrom > now) throw httpError(400, 'This coupon is not active yet.', 'coupon_not_started');
  if (coupon.expiresAt && coupon.expiresAt < now) throw httpError(400, 'This coupon has expired.', 'coupon_expired');
  if (coupon.appliesToPlans?.length && !coupon.appliesToPlans.includes(plan.planCode)) throw httpError(400, "This coupon isn't valid for your plan.", 'coupon_not_applicable');
  const price = planPaise(plan);
  if (price < (coupon.minOrderPaise || 0)) throw httpError(400, `Minimum order of ${rupees(coupon.minOrderPaise)} required for this coupon.`, 'coupon_min_order');
  const notMine = ignoreOrderId ? { orderId: { $ne: ignoreOrderId } } : {};
  if (coupon.maxRedemptions != null && (await CouponRedemption.countDocuments({ couponId: coupon._id, ...live(), ...notMine })) >= coupon.maxRedemptions) {
    throw httpError(400, 'This coupon has been fully used.', 'coupon_exhausted');
  }
  if ((await CouponRedemption.countDocuments({ couponId: coupon._id, userId, ...live(), ...notMine })) >= (coupon.perUserLimit ?? 1)) {
    throw httpError(400, 'You have already used this coupon.', 'coupon_already_used');
  }
  const discountPaise = computeDiscount(coupon, price);
  return { coupon, originalPaise: price, discountPaise, finalPaise: price - discountPaise };
}

export const mapQuote = (q) => ({
  valid: true, code: q.coupon.code, description: q.coupon.description, discountType: q.coupon.discountType,
  originalPaise: q.originalPaise, discountPaise: q.discountPaise, finalPaise: q.finalPaise,
  original: rupees(q.originalPaise), discount: rupees(q.discountPaise), final: rupees(q.finalPaise), free: q.finalPaise === 0,
});

export async function findByCode(code) {
  return Coupon.findOne({ code: normalizeCode(code) });
}

/** Dry run for the "Apply" button: nothing is reserved. */
export async function validate(userId, code, plan) {
  return mapQuote(await evaluate(userId, await findByCode(code), plan));
}

/** Public coupons for "Available coupons", with what each saves on this plan. */
export async function listAvailable(userId, plan) {
  const rows = await Coupon.find({ isActive: true, isPublic: true }).sort({ createdAt: 1 });
  const out = [];
  for (const c of rows) {
    try {
      out.push({ ...mapQuote(await evaluate(userId, c, plan)), expiresAt: c.expiresAt });
    } catch (e) {
      if (e.code === 'coupon_min_order') {
        out.push({ valid: false, code: c.code, description: c.description, reason: e.message, expiresAt: c.expiresAt });
      } else if (!e.statusCode) throw e;
    }
  }
  return out;
}

/** Hold a coupon for an order about to be created. The user's own abandoned holds don't count. */
export async function reserve(userId, code, plan) {
  const coupon = await findByCode(code);
  if (coupon) await CouponRedemption.deleteMany({ couponId: coupon._id, userId, status: 'reserved' });
  const quote = await evaluate(userId, coupon, plan);
  const r = await CouponRedemption.create({ couponId: coupon._id, userId, discountPaise: quote.discountPaise, status: 'reserved' });
  return { quote, redemptionId: r._id };
}
