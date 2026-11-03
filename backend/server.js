import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import setupRoutes from './routes/setup.js';
import { Plan } from './models/index.js';
import { PLANS } from './config/plans.js';
import { fileURLToPath } from 'url';

// Database connection
import connectDB from './config/database.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import kycRoutes from './routes/kyc.js';
import riskRoutes from './routes/risk.js';
import documentRoutes from './routes/documents.js';
import planRoutes from './routes/plans.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';
import zohoBooksRoutes from './routes/zohoBooks.js';
import agreementsRoutes from './routes/agreements.js';
import adminRoutes from './routes/admin.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Load environment variables
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Hosted test setups: load the advisory plans on first start when none exist.
if (process.env.SEED_PLANS_IF_EMPTY === 'true') {
  mongoose.connection.once('open', async () => {
    try {
      if (!(await Plan.countDocuments())) {
        await Plan.insertMany(PLANS);
        console.log(`Seeded ${PLANS.length} plans`);
      }
    } catch (e) { console.error('Plan seeding failed:', e.message); }
  });
}

// Security Middleware
// Trust proxy for correct IP and secure cookies when behind proxies
app.set('trust proxy', 1);
// Remove X-Powered-By header
app.disable('x-powered-by');

// Use raw body for Zoho payment webhooks BEFORE JSON parsing to verify HMAC on exact payload
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
// Digio eSign webhooks: raw body for the optional checksum check
app.use('/api/webhooks/digio', express.raw({ type: '*/*', limit: '2mb' }));

const DIGIO_ORIGINS = ['https://ext.digio.in', 'https://ext.digio.in:444', 'https://app.digio.in', 'https://api.digio.in'];
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'", ...DIGIO_ORIGINS],
      'frame-src': ["'self'", ...DIGIO_ORIGINS],
      'connect-src': ["'self'", ...DIGIO_ORIGINS],
      'img-src': ["'self'", 'data:', 'blob:', ...DIGIO_ORIGINS],
      'worker-src': ["'self'", 'blob:'],
    },
  },
}));

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.NEXTJS_URL || 'http://localhost:3000',
  process.env.ONBOARDING_URL,
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Serve the built onboarding screens (../dist) from the same origin when present,
// before the API rate limiter so page assets do not use up a visitor's quota.
const distDir = path.join(__dirname, '..', 'dist');
const hasDist = fs.existsSync(path.join(distDir, 'index.html'));
if (hasDist) app.use(express.static(distDir, { index: false, maxAge: '1h' }));

app.use(limiter);

// Cookie parser middleware
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploaded documents (with authentication check)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'KYC API Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/zoho', zohoBooksRoutes);
app.use('/api/agreements', agreementsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/setup', setupRoutes);

// OAuth Setup Routes (for Zoho Payments OAuth configuration)
import oauthSetupRoutes from './routes/oauthSetup.js';
app.use('/api/auth', oauthSetupRoutes);

// Single-page app: any other GET that is not an API call gets the onboarding page.
if (hasDist) {
  app.get(/^\/(?!api\/|uploads\/|health$).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// 404 Handler
app.use(notFound);

// Error Handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 KYC API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (_promise, reason) => {
  console.error('Unhandled Promise Rejection:', reason.message);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

export default app;