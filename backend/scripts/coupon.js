// Create or update a coupon.
// Usage: MONGODB_URI=... node scripts/coupon.js CODE percent 10 [--max 5000] [--min 0] [--uses 100] [--per-user 1] [--expires 2026-12-31] [--plans CODE1,CODE2] [--desc "text"] [--hidden] [--off]
// Amounts are in rupees. percent: value is %, flat: value is rupees off.
import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';

const [code, type, value, ...rest] = process.argv.slice(2);
if (!code || !['percent', 'flat'].includes(type) || !(Number(value) >= 0)) {
  console.error('Usage: node scripts/coupon.js CODE percent|flat VALUE [options]'); process.exit(1);
}
const opt = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
const paise = (r) => (r === undefined ? undefined : Math.round(Number(r) * 100));
const doc = {
  code: code.toUpperCase(), discountType: type, value: type === 'flat' ? paise(value) : Number(value),
  maxDiscountPaise: paise(opt('--max')) ?? null, minOrderPaise: paise(opt('--min')) ?? 0,
  maxRedemptions: opt('--uses') ? Number(opt('--uses')) : null, perUserLimit: Number(opt('--per-user') ?? 1),
  expiresAt: opt('--expires') ? new Date(`${opt('--expires')}T23:59:59+05:30`) : null,
  appliesToPlans: opt('--plans') ? opt('--plans').split(',') : [], description: opt('--desc') ?? '',
  isPublic: !rest.includes('--hidden'), isActive: !rest.includes('--off'),
};
await mongoose.connect(process.env.MONGODB_URI);
const c = await Coupon.findOneAndUpdate({ code: doc.code }, doc, { upsert: true, new: true });
console.log('Saved coupon', c.code, c.discountType, c.value, c.isActive ? 'active' : 'off');
await mongoose.disconnect();
