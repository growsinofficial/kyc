import mongoose from 'mongoose';

/** A coupon held by an unpaid order ("reserved", 30 min) or used by a paid one ("redeemed"). */
const schema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentOrder', default: null },
  discountPaise: { type: Number, required: true },
  status: { type: String, enum: ['reserved', 'redeemed'], default: 'reserved' },
  redeemedAt: Date,
}, { timestamps: true });

export default mongoose.model('CouponRedemption', schema);
