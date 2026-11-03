// Delete a client and everything stored for them (for re-testing sign-up).
// Usage: MONGODB_URI=... node scripts/deleteUser.js <10-digit mobile> [--yes]
// Without --yes it only prints what would be deleted.
import mongoose from 'mongoose';
import { User, KYCData, RiskProfile, Document, Transaction, Agreement, CouponRedemption, PaymentOrder } from '../models/index.js';
import OtpCode from '../models/OtpCode.js';

const mobile = String(process.argv[2] || '').replace(/\D/g, '').slice(-10);
const confirm = process.argv.includes('--yes');
if (!/^[6-9]\d{9}$/.test(mobile)) { console.error('Usage: node scripts/deleteUser.js <10-digit mobile> [--yes]'); process.exit(1); }

await mongoose.connect(process.env.MONGODB_URI);
const users = await User.find({ mobile }).select('_id email mobile');
const ids = users.map((u) => u._id);
const byUser = { KYCData, RiskProfile, Document, Transaction, Agreement, CouponRedemption, PaymentOrder };
const masked = `xxxxxx${mobile.slice(-4)}`;
console.log(`deleteUser ${masked}: ${users.length} account(s)`);
for (const [name, Model] of Object.entries(byUser)) {
  const n = ids.length ? await Model.countDocuments({ userId: { $in: ids } }) : 0;
  if (confirm && n) await Model.deleteMany({ userId: { $in: ids } });
  console.log(`  ${name}: ${n}${confirm ? ' deleted' : ''}`);
}
const otps = await OtpCode.countDocuments({ mobile });
if (confirm) await OtpCode.deleteMany({ mobile });
console.log(`  OtpCode: ${otps}${confirm ? ' deleted' : ''}`);
if (confirm && ids.length) await User.deleteMany({ _id: { $in: ids } });
console.log(`  User: ${users.length}${confirm ? ' deleted' : ' (dry run, add --yes to delete)'}`);
await mongoose.disconnect();
