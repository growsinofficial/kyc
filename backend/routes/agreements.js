import express from 'express';
import PDFDocument from 'pdfkit';
import { protect } from '../middleware/auth.js';
import { User } from '../models/index.js';
import KYCData from '../models/KYCData.js';
import Document from '../models/Document.js';

const router = express.Router();

// Generate a consolidated KYC PDF with signature and store as Document('agreement')
// POST /api/agreements/generate
router.post('/generate', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, kyc] = await Promise.all([
      User.findById(userId),
      KYCData.findOne({ userId })
    ]);

    if (!user || !kyc) {
      return res.status(400).json({ success: false, error: 'User or KYC data not found' });
    }

    // Fetch signature image if uploaded
    const signatureDoc = await Document.findOne({ userId, documentType: 'signature', isActive: true }).sort({ version: -1 });

    // Build PDF in-memory
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Growsin - KYC Summary & Agreement', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Name: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Mobile: ${user.mobile}`);
    doc.text(`KYC Status: ${user.kycStatus || 'in_progress'}`);
    doc.moveDown();

    doc.fontSize(14).text('Personal Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Full Name: ${kyc.personal?.name || ''}`);
    doc.text(`PAN: ${kyc.personal?.pan || ''}`);
    doc.text(`Aadhaar: ${kyc.personal?.aadhar || ''}`);
    doc.text(`DOB: ${kyc.personal?.dob ? new Date(kyc.personal.dob).toISOString().split('T')[0] : ''}`);
    doc.text(`Gender: ${kyc.personal?.gender || ''}`);
    doc.text(`Marital Status: ${kyc.personal?.maritalStatus || ''}`);
    doc.moveDown();

    doc.fontSize(14).text('Address', { underline: true });
    doc.fontSize(12);
    doc.text(`Address: ${kyc.address?.address || ''}`);
    doc.text(`City: ${kyc.address?.city || ''}`);
    doc.text(`State: ${kyc.address?.state || ''}`);
    doc.text(`Pincode: ${kyc.address?.pincode || ''}`);
    doc.moveDown();

    doc.fontSize(14).text('Professional', { underline: true });
    doc.fontSize(12);
    doc.text(`Occupation: ${kyc.professional?.occupation || ''}`);
    doc.text(`Industry: ${kyc.professional?.industry || ''}`);
    doc.text(`Experience: ${kyc.professional?.experience || ''}`);
    doc.text(`Income Range: ${kyc.professional?.income || ''}`);
    doc.moveDown();

    doc.fontSize(12).text('By signing this document, I confirm that the above information is true and complete to the best of my knowledge.');
    doc.moveDown(2);

    // Signature block
    doc.text('Signature:', { continued: true });
    if (signatureDoc && signatureDoc.fileData && ['image/png','image/jpeg','image/jpg'].includes(signatureDoc.mimeType)) {
      try {
        // Place signature image
        const img = Buffer.from(signatureDoc.fileData);
        doc.image(img, { fit: [150, 60], align: 'left' });
      } catch (_) {
        // ignore image errors, still generate pdf
      }
    } else {
      doc.text(' ___________________________');
    }
    doc.moveDown();
    doc.text(`Date: ${new Date().toISOString().split('T')[0]}`);

    doc.end();

    // After PDF completed, save to Mongo
    doc.on('end', async () => {
      const buffer = Buffer.concat(chunks);

      const saved = await Document.create({
        userId,
        documentType: 'agreement',
        documentName: 'KYC Summary & Agreement',
        originalName: `kyc-agreement-${userId}.pdf`,
        fileName: `kyc-agreement-${Date.now()}.pdf`,
        fileSize: buffer.length,
        mimeType: 'application/pdf',
        checksum: null,
        fileData: buffer,
        uploadSource: 'web'
      });

      const baseUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`;
      return res.status(201).json({
        success: true,
        data: {
          id: saved._id,
          fileUrl: `${baseUrl}/api/documents/${saved._id}/download`
        }
      });
    });
  } catch (error) {
    next(error);
  }
});

export default router;
