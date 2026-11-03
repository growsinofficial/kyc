// Delete a client and everything stored for them (for re-testing sign-up).
// Usage: MONGODB_URI=... node scripts/deleteUser.js <10-digit mobile> [--yes]
// Without --yes it only prints what would be deleted.
import mongoose from 'mongoose';
import { deleteUserByMobile } from '../services/userCleanup.js';

const [mobile] = process.argv.slice(2);
await mongoose.connect(process.env.MONGODB_URI);
try {
  console.log(JSON.stringify(await deleteUserByMobile(mobile, { dryRun: !process.argv.includes('--yes') }), null, 2));
} catch (e) { console.error(e.message); process.exitCode = 1; }
await mongoose.disconnect();
