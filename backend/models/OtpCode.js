import mongoose from 'mongoose';

/**
 * One-time codes for mobile verification. Only a hash of the code is kept;
 * documents expire on their own (TTL index) shortly after the code does.
 */
const otpCodeSchema = new mongoose.Schema({
  mobile: { type: String, required: true, index: true },
  purpose: { type: String, enum: ['signup', 'verify_mobile'], required: true },
  codeHash: { type: String, required: true },
  channel: { type: String, enum: ['whatsapp', 'sms', 'test'], required: true },
  attempts: { type: Number, default: 0 },
  usedAt: Date,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model('OtpCode', otpCodeSchema);
