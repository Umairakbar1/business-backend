import express from 'express';
import subscriptionController from '../../controllers/admin/subscription.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import { validate } from '../../middleware/joiValidation.js';
import { subscriptionValidator } from '../../validators/admin.js';

const router = express.Router();

// Create subscription
router.post('/', authorizedAccessAdmin, validate(subscriptionValidator), subscriptionController.createSubscription);

// Get all subscriptions
router.get('/', authorizedAccessAdmin, subscriptionController.getAllSubscriptions);

// Get all business boost subscriptions
router.get('/boost', authorizedAccessAdmin, subscriptionController.getAllBusinessBoostSubscriptions);

// Get all paid subscriptions (both business and boost)
router.get('/paid', authorizedAccessAdmin, subscriptionController.getAllPaidSubscriptions);

// Get subscription statistics
router.get('/stats', authorizedAccessAdmin, subscriptionController.getSubscriptionStats);

// Get subscription by ID
router.get('/:id', authorizedAccessAdmin, subscriptionController.getSubscriptionById);

// Get business subscriptions
router.get('/business/:businessId', authorizedAccessAdmin, subscriptionController.getBusinessSubscriptions);

// Cancel subscription
router.patch('/:id/cancel', authorizedAccessAdmin, subscriptionController.cancelSubscription);

// Reactivate subscription
router.patch('/:id/reactivate', authorizedAccessAdmin, subscriptionController.reactivateSubscription);

// Update subscription from webhook (no auth required for Stripe webhooks)
router.post('/webhook/update', subscriptionController.updateSubscriptionFromWebhook);

// Check boost availability
router.get('/boost/:businessId/availability', authorizedAccessAdmin, subscriptionController.checkBoostAvailability);

// Use boost
router.post('/boost/:businessId/use', authorizedAccessAdmin, subscriptionController.useBoost);

// Boost expiry management
router.post('/boost/expiry/check', authorizedAccessAdmin, subscriptionController.checkAndUpdateExpiredBoosts);
router.get('/boost/expiry/stats', authorizedAccessAdmin, subscriptionController.getBoostExpiryStats);
router.post('/boost/:businessId/expire', authorizedAccessAdmin, subscriptionController.expireBusinessBoost);

export default router;
