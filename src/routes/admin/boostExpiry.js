import express from 'express';
import BoostExpiryService from '../../services/boostExpiryService.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';

const router = express.Router();

/**
 * @route POST /api/admin/boost-expiry/check
 * @desc Check and update expired boosts (admin only)
 * @access Private (Admin)
 */
router.post('/check', authorizedAccessAdmin, async (req, res) => {
  try {
    const updatedCount = await BoostExpiryService.checkAndUpdateExpiredBoosts();
    
    res.status(200).json({
      success: true,
      message: 'Boost expiry check completed successfully',
      data: {
        updatedCount,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error in boost expiry check route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check boost expiry',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/boost-expiry/activate-next/:categoryId
 * @desc Activate next business in boost queue for a specific category
 * @access Private (Admin)
 */
router.post('/activate-next/:categoryId', authorizedAccessAdmin, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const activatedBusiness = await BoostExpiryService.activateNextBusinessInQueue(categoryId);
    
    res.status(200).json({
      success: true,
      message: activatedBusiness ? 'Next business activated in queue' : 'No pending businesses in queue',
      data: {
        activatedBusiness,
        categoryId,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error activating next business in queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate next business in queue',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/boost-expiry/status/:businessId
 * @desc Get boost status for a specific business
 * @access Private (Admin)
 */
router.get('/status/:businessId', authorizedAccessAdmin, async (req, res) => {
  try {
    const { businessId } = req.params;
    const status = await BoostExpiryService.getBusinessBoostStatus(businessId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Boost status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('Error getting business boost status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business boost status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/boost-expiry/start-scheduler
 * @desc Start the boost expiry scheduler (admin only)
 * @access Private (Admin)
 */
router.post('/start-scheduler', authorizedAccessAdmin, async (req, res) => {
  try {
    BoostExpiryService.scheduleBoostExpiryCheck();
    
    res.status(200).json({
      success: true,
      message: 'Boost expiry scheduler started successfully',
      data: {
        schedulerActive: true,
        checkInterval: '5 minutes',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error starting boost expiry scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start boost expiry scheduler',
      error: error.message
    });
  }
});

export default router;
