import express from 'express';
import { RiskProfile, User } from '../models/index.js';
import { protect } from '../middleware/auth.js';
import { RISK_QUESTIONS } from '../config/riskQuestions.js';
import { scoreRiskAnswers } from '../services/riskScoring.js';

const router = express.Router();

const HORIZON_ENUM = { 'Under 2 years': 'Short Term', '2 to 5 years': 'Medium Term', 'Over 5 years': 'Long Term' };
const TOLERANCE_ENUM = { Low: 'Low', Medium: 'Moderate', High: 'High' };

// @desc    The 7 risk profiling questions used in the agreement
// @route   GET /api/risk/questions
// @access  Public
router.get('/questions', (req, res) => {
  res.status(200).json({ success: true, questions: RISK_QUESTIONS });
});

// @desc    Save risk assessment answers (scored 7–21, as in the agreement)
// @route   POST /api/risk/assessment
// @access  Private
router.post('/assessment', protect, async (req, res, next) => {
  try {
    let result;
    try {
      result = scoreRiskAnswers(req.body.answers);
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }

    const update = {
      userId: req.user._id,
      answers: new Map(Object.entries(result.normalized)),
      riskScore: result.score,
      riskCategory: result.category,
      recommendations: {
        riskCapacity: result.tolerance,
        investmentHorizon: HORIZON_ENUM[result.horizon],
      },
      insights: {
        investorType: `${result.category === 'Moderate' ? 'Balanced' : result.category} Investor`,
        riskTolerance: TOLERANCE_ENUM[result.tolerance],
        suggestedProducts: result.services.split(/, | and /),
      },
      assessmentVersion: 'agreement-7q-v1',
      completedAt: new Date(),
    };

    const riskProfile = await RiskProfile.findOneAndUpdate({ userId: req.user._id }, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });

    await User.findByIdAndUpdate(req.user._id, {
      riskProfile: riskProfile._id,
      'flags.riskCompleted': true,
    });

    res.status(200).json({
      success: true,
      message: 'Risk assessment saved',
      riskProfile,
      result: {
        score: result.score,
        category: result.category,
        tolerance: result.tolerance,
        horizon: result.horizon,
        services: result.services,
        details: result.details,
      },
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
      return res.status(404).json({ success: false, error: 'Risk profile not found' });
    }
    res.status(200).json({ success: true, riskProfile });
  } catch (error) {
    next(error);
  }
});

export default router;
