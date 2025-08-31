import express from 'express';
import boostQueueController from '../../controllers/admin/boostQueue.controller.js';
import { verifyAdminToken } from '../../middleware/authorization.js';

const router = express.Router();

// Get all boost queues
router.get('/all', verifyAdminToken, boostQueueController.getAllBoostQueues);

// Get boost queue for specific category
router.get('/category/:categoryId', verifyAdminToken, boostQueueController.getBoostQueueByCategory);

// Get boost queue statistics
router.get('/stats', verifyAdminToken, boostQueueController.getBoostQueueStats);

// Get all active boosts across categories
router.get('/active-boosts', verifyAdminToken, boostQueueController.getAllActiveBoosts);

// Manually trigger boost expiry check
router.post('/trigger-expiry-check', verifyAdminToken, boostQueueController.triggerExpiryCheck);

// Get business queue status (admin view)
router.get('/business/:businessId/status', verifyAdminToken, boostQueueController.getBusinessQueueStatus);

// Remove business from queue (admin action)
router.delete('/business/:businessId/remove', verifyAdminToken, boostQueueController.removeBusinessFromQueue);

// Get queue details for a specific business
router.get('/business/:businessId/details', verifyAdminToken, boostQueueController.getBusinessQueueDetails);

export default router;
