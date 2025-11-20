import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import crypto from 'crypto';
import Document from '../models/Document.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const DOCUMENT_TYPES = ['pan', 'aadhaar-front', 'aadhaar-back', 'profile', 'bank-statement', 'income-proof', 'signature', 'agreement'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: JPEG, PNG, PDF'));
    }
    cb(null, true);
  }
});

// Per-user limiter for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req.user?._id?.toString() || req.ip),
  standardHeaders: true,
  legacyHeaders: false
});

const getFileExtension = (mimeType) => {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
};

const getBaseUrl = (req) => {
  // Prefer configured backend URL to avoid Host header injection
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const protocol = (forwardedProto || req.protocol || 'http').split(',')[0];
  const host = forwardedHost || req.get('host');
  return `${protocol}://${host}`;
};

// Basic magic number validation to mitigate spoofed content types
const isValidFileSignature = (file) => {
  const buf = file.buffer;
  if (!buf || buf.length < 5) return false;
  // PDF: %PDF-
  if (file.mimetype === 'application/pdf') {
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2D;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (file.mimetype === 'image/png') {
    return buf.length > 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;
  }
  // JPEG: FF D8 FF
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
    return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  }
  return false;
};

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private
router.post('/upload', protect, uploadLimiter, upload.single('document'), async (req, res, next) => {
  try {
    const { documentType, documentName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'Document file is required' });
    }

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing documentType' });
    }

    const extension = getFileExtension(file.mimetype);
    if (!extension) {
      return res.status(400).json({ success: false, error: 'Unsupported file type' });
    }

    // Validate magic number matches declared mimetype
    if (!isValidFileSignature(file)) {
      return res.status(400).json({ success: false, error: 'File content does not match type' });
    }

    const randomSuffix = crypto.randomBytes(12).toString('hex');
    const baseFileName = `${Date.now()}_${documentType}_${randomSuffix}${extension}`;
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const baseUrl = getBaseUrl(req);
    const savedDocument = await Document.create({
      userId: req.user._id,
      documentType,
      documentName: documentName || documentType,
      originalName: file.originalname,
      fileName: baseFileName,
      fileSize: file.size,
      mimeType: file.mimetype,
      checksum,
      fileData: file.buffer,
      uploadSource: 'web',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined
    });

    res.status(201).json({
      success: true,
      document: {
        id: savedDocument._id,
        documentType: savedDocument.documentType,
        documentName: savedDocument.documentName,
        fileName: savedDocument.fileName,
        filePath: savedDocument.filePath,
        fileSize: savedDocument.fileSize,
        mimeType: savedDocument.mimeType,
        validationStatus: savedDocument.validationStatus,
        uploadedAt: savedDocument.uploadedAt,
        version: savedDocument.version,
        fileUrl: `${baseUrl}/api/documents/${savedDocument._id}/download`
      }
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
});

// @desc    Get user documents
// @route   GET /api/documents
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const documents = await Document.getActiveDocuments(req.user._id);
    const baseUrl = getBaseUrl(req);

    const data = documents.map((doc) => ({
      id: doc._id,
      documentType: doc.documentType,
      documentName: doc.documentName,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      validationStatus: doc.validationStatus,
      version: doc.version,
      uploadedAt: doc.uploadedAt,
      fileUrl: `${baseUrl}/api/documents/${doc._id}/download`
    }));

    res.status(200).json({
      success: true,
      documents: data
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Download a specific document
// @route   GET /api/documents/:id/download
// @access  Private
router.get('/:id/download', protect, async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
      ? { _id: req.params.id, isActive: true }
      : { _id: req.params.id, userId: req.user._id, isActive: true };
    const document = await Document.findOne(query);

    if (!document || !document.fileData) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const safeFileName = (document.originalName || document.fileName || 'document')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');

    res.set({
      'Content-Type': document.mimeType,
      'Content-Length': document.fileSize,
      'Content-Disposition': `attachment; filename="${safeFileName}"`
    });

    return res.send(document.fileData);
  } catch (error) {
    next(error);
  }
});

export default router;