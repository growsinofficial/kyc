import mongoose from 'mongoose';

/** Discount codes — same rules as the Growsin app's coupons. Money in paise. */
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true, min: 0 },          // percent (0-100) or paise
  maxDiscountPaise: { type: Number, default: null },
  minOrderPaise: { type: Number, default: 0 },
  appliesToPlans: { type: [String], default: [] },          // plan codes; empty = all plans
  validFrom: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  maxRedemptions: { type: Number, default: null },          // across everyone; null = unlimited
  perUserLimit: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },               // shown in "Available coupons"
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
