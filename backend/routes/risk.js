import express from 'express';
import { RiskProfile, User } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Save risk assessment answers
// @route   POST /api/risk/assessment
// @access  Private
router.post('/assessment', protect, async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Risk assessment answers are required'
      });
    }

    // Find existing profile or create new
    let riskProfile = await RiskProfile.findOne({ userId: req.user._id });

    if (riskProfile) {
      riskProfile.answers = new Map(Object.entries(answers));
    } else {
      riskProfile = new RiskProfile({
        userId: req.user._id,
        answers: new Map(Object.entries(answers))
      });
    }

    // Calculate risk score and generate recommendations
    riskProfile.calculateRiskScore();
    riskProfile.generateRecommendations();

    await riskProfile.save();

    // Update user's risk profile reference
    await User.findByIdAndUpdate(req.user._id, {
      riskProfile: riskProfile._id,
      flags: { ...req.user.flags, riskCompleted: true }
    });

    res.status(200).json({
      success: true,
      message: 'Risk assessment completed successfully',
      riskProfile
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's risk profile
// @route   GET /api/risk/profile
// @access  Private
router.get('/profile', protect, async (req, res, next) => {
  try {
    const riskProfile = await RiskProfile.findOne({ userId: req.user._id });

    if (!riskProfile) {
      return res.status(404).json({
        success: false,
        error: 'Risk profile not found'
      });
    }

    res.status(200).json({
      success: true,
      riskProfile
    });
  } catch (error) {
    next(error);
  }
});

export default router;