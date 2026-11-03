import mongoose from 'mongoose';

/** One checkout attempt for the advisory fee. Money in paise. */
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planCode: String,
  agreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement' },
  gateway: { type: String, enum: ['zoho', 'test', 'coupon'], required: true },
  gatewayOrderId: { type: String, required: true, unique: true },   // Zoho payments_session_id
  gatewayPaymentId: String,
  originalPaise: { type: Number, required: true },
  discountPaise: { type: Number, default: 0 },
  amountPaise: { type: Number, required: true },
  couponCode: { type: String, default: null },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
  paidAt: Date,
}, { timestamps: true });

export default mongoose.model('PaymentOrder', schema);
