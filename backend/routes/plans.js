import express from 'express';
import { Plan, User } from '../models/index.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all available plans
// @route   GET /api/plans
// @access  Public (with optional auth for personalization)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { riskProfile } = req.query;
    
    let plans;
    if (riskProfile) {
      plans = await Plan.getAvailablePlans(riskProfile);
    } else {
      plans = await Plan.getAvailablePlans();
    }

    res.status(200).json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    if (!plan.isAvailable()) {
      return res.status(400).json({
        success: false,
        error: 'Plan is not currently available'
      });
    }

    res.status(200).json({
      success: true,
      plan
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Select a plan
// @route   POST /api/plans/:id/select
// @access  Private
router.post('/:id/select', protect, async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    if (!plan.isAvailable()) {
      return res.status(400).json({
        success: false,
        error: 'Plan is not currently available'
      });
    }

    // Update user's selected plan
    await User.findByIdAndUpdate(req.user._id, {
      selectedPlan: plan._id
    });

    res.status(200).json({
      success: true,
      message: 'Plan selected successfully',
      plan
    });
  } catch (error) {
    next(error);
  }
});

export default router;