import crypto from 'crypto';
import OtpCode from '../models/OtpCode.js';
import { deliverOtp, smsConfigured } from '../utils/sms.js';

export const OTP_TTL_MS = 10 * 60 * 1000;      // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;             // wrong tries before the code is burned
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const httpError = (status, message, code, extra = {}) => Object.assign(new Error(message), { statusCode: status, code, ...extra });
const hash = (mobile, code) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'otp').update(`${mobile}:${code}`).digest('hex');

/**
 * Without Fast2SMS settings the code cannot be delivered. On a test site
 * (TEST_MODE=true, not production) it is returned to the screen instead;
 * otherwise sending fails with 503 rather than silently doing nothing.
 */
const testMode = () => !smsConfigured() && process.env.TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';

export async function issueOtp(mobile, purpose, { smsOnly = false } = {}) {
  if (!smsConfigured() && !testMode()) throw httpError(503, 'Mobile verification is not available right now. Please try again later.', 'sms_not_configured');
  const recent = await OtpCode.findOne({ mobile, purpose, usedAt: null }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
    throw httpError(429, `Please wait ${wait} seconds before asking for a new code.`, 'otp_cooldown', { retryAfter: wait });
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  // Earlier codes stop working once a new one is sent.
  await OtpCode.updateMany({ mobile, purpose, usedAt: null }, { $set: { usedAt: new Date() } });
  const doc = await OtpCode.create({ mobile, purpose, codeHash: hash(mobile, code), channel: testMode() ? 'test' : 'sms', expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  if (testMode()) return { channel: 'test', testOtp: code };
  try {
    doc.channel = await deliverOtp(mobile, code, { smsOnly });
    await doc.save();
    return { channel: doc.channel };
  } catch (e) {
    await OtpCode.deleteOne({ _id: doc._id }); // undelivered: don't block a retry with the cooldown
    throw e;
  }
}

/** Checks a code; burns it after OTP_MAX_ATTEMPTS wrong tries. Throws on failure. */
export async function verifyOtp(mobile, purpose, code) {
  if (!/^\d{6}$/.test(String(code || ''))) throw httpError(400, 'Enter the 6-digit code.', 'invalid_code');
  // Claim an attempt atomically before comparing, so guesses can't race past the limit.
  const doc = await OtpCode.findOneAndUpdate(
    { mobile, purpose, usedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { sort: { createdAt: -1 }, new: true },
  );
  if (!doc) throw httpError(400, 'This code has expired. Please ask for a new one.', 'code_expired');
  const ok = crypto.timingSafeEqual(Buffer.from(doc.codeHash), Buffer.from(hash(mobile, String(code))));
  if (!ok) {
    const left = OTP_MAX_ATTEMPTS - doc.attempts;
    throw httpError(400, left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Please ask for a new code.', 'invalid_code');
  }
  // Single use: only the first correct check succeeds.
  const used = await OtpCode.findOneAndUpdate({ _id: doc._id, usedAt: null }, { $set: { usedAt: new Date() } });
  if (!used) throw httpError(400, 'This code has already been used. Please ask for a new one.', 'code_used');
  return true;
}
