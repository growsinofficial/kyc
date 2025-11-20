import express from 'express';
import { User } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('kycData')
      .populate('riskProfile')
      .populate('selectedPlan');

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, currentStep, kycSubStep, kycSubStepStatus, flags } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (currentStep) updateData.currentStep = currentStep;
    if (kycSubStep) updateData.kycSubStep = kycSubStep;
    if (kycSubStepStatus) updateData.kycSubStepStatus = kycSubStepStatus;
    if (flags) updateData.flags = flags;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

export default router;