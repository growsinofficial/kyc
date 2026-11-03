import { User, KYCData, RiskProfile, Document, Transaction, Agreement, CouponRedemption, PaymentOrder } from '../models/index.js';
import OtpCode from '../models/OtpCode.js';

/**
 * Remove a client and everything stored for them, by mobile number.
 * dryRun: only count. Returns { mobile (masked), counts }.
 */
export async function deleteUserByMobile(rawMobile, { dryRun = true } = {}) {
  const mobile = String(rawMobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(mobile)) throw Object.assign(new Error('Enter a 10-digit mobile number'), { statusCode: 400 });
  const users = await User.find({ mobile }).select('_id');
  const ids = users.map((u) => u._id);
  const counts = {};
  for (const [name, Model] of Object.entries({ KYCData, RiskProfile, Document, Transaction, Agreement, CouponRedemption, PaymentOrder })) {
    counts[name] = ids.length ? await Model.countDocuments({ userId: { $in: ids } }) : 0;
    if (!dryRun && counts[name]) await Model.deleteMany({ userId: { $in: ids } });
  }
  counts.OtpCode = await OtpCode.countDocuments({ mobile });
  if (!dryRun && counts.OtpCode) await OtpCode.deleteMany({ mobile });
  counts.User = ids.length;
  if (!dryRun && ids.length) await User.deleteMany({ _id: { $in: ids } });
  return { mobile: `xxxxxx${mobile.slice(-4)}`, deleted: !dryRun, counts };
}
