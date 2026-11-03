// Stores the agreement template PDF in MongoDB, for hosts where the file
// cannot be shipped with the code (the repo is public).
// Usage: MONGODB_URI=... node scripts/uploadTemplate.js /path/to/agreement-template.pdf
import fs from 'fs';
import mongoose from 'mongoose';
import { PDFDocument } from 'pdf-lib';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Usage: node scripts/uploadTemplate.js <pdf>'); process.exit(1); }
const data = fs.readFileSync(file);
const pages = (await PDFDocument.load(data)).getPageCount();
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.db.collection('private_assets').replaceOne(
  { _id: 'agreement-template' },
  { _id: 'agreement-template', data, size: data.length, pages, uploadedAt: new Date() },
  { upsert: true },
);
console.log(`Stored agreement template (${pages} pages, ${data.length} bytes)`);
await mongoose.disconnect();
