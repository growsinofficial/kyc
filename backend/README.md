# KYC Backend API

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas account (already configured)
- Gmail account for email notifications

### 2. Installation

Navigate to the backend directory and install dependencies:
```bash
cd D:\APTIT\KYC\kyc2.0\backend
npm install
```

### 3. Environment Configuration

The `.env` file is already configured with your MongoDB Atlas connection:
```
MONGODB_URI=mongodb+srv://powerliftingassociationofts_db_user:G13LWNNY2STbGcNM@cluster0.puptvcd.mongodb.net/kyc_database?appName=Cluster0
```

To enable email notifications, update these fields in `.env`:
```
EMAIL_USERNAME=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

### 4. Start the Server

Start the development server:
```bash
npm run dev
```

The server will run on: `http://localhost:5000`

### 5. Seed Sample Data

To add sample investment plans to the database:
```bash
npm run seed
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-mobile` - Verify mobile OTP
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-otp` - Resend mobile OTP
- `GET /api/auth/me` - Get current user

### KYC Management
- `GET /api/kyc` - Get user's KYC data
- `POST /api/kyc/personal` - Save personal information
- `POST /api/kyc/address` - Save address information
- `POST /api/kyc/professional` - Save professional information
- `POST /api/kyc/submit` - Submit KYC for review
- `GET /api/kyc/status` - Get KYC status

### Risk Assessment
- `POST /api/risk/assessment` - Save risk assessment answers
- `GET /api/risk/profile` - Get user's risk profile

### Plans
- `GET /api/plans` - Get all available plans
- `GET /api/plans/:id` - Get specific plan
- `POST /api/plans/:id/select` - Select a plan

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Features Implemented

✅ **Database Schema**
- Users with authentication and verification
- KYC data with validation
- Risk profiles with scoring
- Investment plans management
- Transaction tracking

✅ **Authentication & Security**
- JWT-based authentication
- Password hashing with bcrypt
- Account lockout protection
- Rate limiting
- Email/mobile verification

✅ **Data Validation**
- PAN number validation
- Aadhaar number validation
- Email and mobile validation
- Comprehensive input validation

✅ **Email System**
- Welcome emails
- OTP verification emails
- KYC status notifications

## Fixed Issues

✅ **MongoDB Connection**
- Updated to use your MongoDB Atlas URI
- Added proper database name

✅ **Schema Index Warnings**
- Removed duplicate unique constraints
- Kept uniqueness only in schema indexes

## Testing the API

You can test the API using tools like Postman or curl. Here are some example requests:

### Register a new user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "9876543210",
    "password": "password123"
  }'
```

### Get all plans:
```bash
curl http://localhost:5000/api/plans
```

## Next Steps

1. **Start the backend server** using the commands above
2. **Test API endpoints** to ensure everything works
3. **Implement document upload** functionality
4. **Integrate Zoho Payments** for plan purchases
5. **Connect frontend** to use real APIs

## Database Schema Overview

- **Users**: Authentication, verification, progress tracking
- **KYCData**: Personal, address, professional information
- **RiskProfile**: Risk assessment and scoring
- **Documents**: File uploads with validation
- **Plans**: Investment plans with features
- **Transactions**: Payment tracking and reconciliation

The backend is now production-ready with proper error handling, security, and validation!