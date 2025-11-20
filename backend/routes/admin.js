import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { User, Document, Transaction } from '../models/index.js';

const router = express.Router();

// Build filter object from query
function buildUserFilter(qs = {}) {
  const {
    q,
    kycStatus,
    emailVerified,
    mobileVerified,
    subscriptionStatus,
    dateFrom,
    dateTo
  } = qs;

  const filter = {};

  if (q) {
    const re = new RegExp(q, 'i');
    filter.$or = [
      { name: re },
      { email: re },
      { mobile: re }
    ];
  }

  if (kycStatus) {
    const list = Array.isArray(kycStatus) ? kycStatus : `${kycStatus}`.split(',');
    filter.kycStatus = { $in: list };
  }

  if (typeof emailVerified !== 'undefined') {
    const v = `${emailVerified}`.toLowerCase();
    if (v === 'true' || v === 'false') filter.emailVerified = v === 'true';
  }

  if (typeof mobileVerified !== 'undefined') {
    const v = `${mobileVerified}`.toLowerCase();
    if (v === 'true' || v === 'false') filter.mobileVerified = v === 'true';
  }

  if (subscriptionStatus) {
    const list = Array.isArray(subscriptionStatus) ? subscriptionStatus : `${subscriptionStatus}`.split(',');
    filter.subscriptionStatus = { $in: list };
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  return filter;
}

// GET /api/admin/users - list users with filters + pagination
router.get('/users', protect, authorize('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt'; // e.g., 'name' or '-createdAt'

    const filter = buildUserFilter(req.query);

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('name email mobile kycStatus emailVerified mobileVerified createdAt subscriptionStatus role')
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:id - full profile with docs and recent transactions
router.get('/users/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .populate('kycData')
      .populate('riskProfile')
      .populate('selectedPlan')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const [documents, transactions] = await Promise.all([
      Document.getActiveDocuments(userId),
      Transaction.find({ userId }).sort({ createdAt: -1 }).limit(20).lean()
    ]);

    // Build document summaries with download URLs
    const baseUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/$/, '') : '';
    const docs = documents.map(d => ({
      id: d._id,
      documentType: d.documentType,
      documentName: d.documentName,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt,
      version: d.version,
      validationStatus: d.validationStatus,
      fileUrl: baseUrl ? `${baseUrl}${d.fileUrl}` : d.fileUrl
    }));

    res.json({
      success: true,
      data: {
        user,
        documents: docs,
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
