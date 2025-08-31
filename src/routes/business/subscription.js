import express from 'express';
import businessSubscriptionController from '../../controllers/business/subscription.controller.js';
import { authorizedAccessBusiness, verifyBusinessOwnerToken } from '../../middleware/authorization.js';

const router = express.Router();

// Get all business subscriptions with populated business data (for admin/business owner overview)
router.get('/all-with-business', verifyBusinessOwnerToken, businessSubscriptionController.getAllBusinessSubscriptionsWithBusiness);

// Get all business plan subscriptions with populated business data
router.get('/all-business-plans', verifyBusinessOwnerToken, businessSubscriptionController.getAllBusinessPlanSubscriptions);

// Get all boost subscriptions with populated business data
router.get('/all-boost-plans', verifyBusinessOwnerToken, businessSubscriptionController.getAllBoostSubscriptions);

// Subscribe to a payment plan
router.post('/:businessId/subscribe', authorizedAccessBusiness, businessSubscriptionController.subscribeToPlan);

// Subscribe to boost plan (separate from business subscription)
router.post('/:businessId/boost/subscribe', authorizedAccessBusiness, businessSubscriptionController.subscribeToBoostPlan);

// Upgrade business subscription
router.post('/:businessId/upgrade', authorizedAccessBusiness, businessSubscriptionController.upgradeBusinessSubscription);

// Get business subscriptions (separated by type)
router.get('/:businessId/subscriptions', authorizedAccessBusiness, businessSubscriptionController.getBusinessSubscriptions);


// Get active business plan
router.get('/:businessId/business-plan', authorizedAccessBusiness, businessSubscriptionController.getActiveBusinessPlan);

// Get active boost plan
router.get('/:businessId/boost-plan', authorizedAccessBusiness, businessSubscriptionController.getActiveBoostPlan);

// Check boost availability
router.get('/:businessId/boost/availability', authorizedAccessBusiness, businessSubscriptionController.checkBoostAvailability);

// Use boost
router.post('/:businessId/boost/use', authorizedAccessBusiness, businessSubscriptionController.useBoost);

// Cancel subscription
router.patch('/:businessId/subscriptions/:subscriptionId/cancel', authorizedAccessBusiness, businessSubscriptionController.cancelSubscription);

// Get available payment plans
router.get('/:businessId/plans', authorizedAccessBusiness, businessSubscriptionController.getAvailablePlans);

// Get all business payment plans
router.get('/:businessId/plans/business', authorizedAccessBusiness, businessSubscriptionController.getAllBusinessPaymentPlans);

// Get all boost payment plans
router.get('/:businessId/plans/boost', authorizedAccessBusiness, businessSubscriptionController.getAllBoostPaymentPlans);

// Get all payment plans (both business and boost)
router.get('/:businessId/plans/all', authorizedAccessBusiness, businessSubscriptionController.getAllPaymentPlans);

// Confirm payment success
router.post('/:businessId/confirm-payment', authorizedAccessBusiness, businessSubscriptionController.confirmPayment);

// Get business subscription details
router.get('/:businessId/details', authorizedAccessBusiness, businessSubscriptionController.getBusinessSubscriptionDetails);

// Handle boost expiry
router.post('/:businessId/boost/expiry', authorizedAccessBusiness, businessSubscriptionController.handleBoostExpiry);

// Cancel boost subscription
router.patch('/:businessId/boost/cancel', authorizedAccessBusiness, businessSubscriptionController.cancelBoostSubscription);

// Cancel business subscription
router.patch('/:businessId/business/cancel', authorizedAccessBusiness, businessSubscriptionController.cancelBusinessSubscription);

// Get boost queue status
router.get('/:businessId/boost/queue-status', authorizedAccessBusiness, businessSubscriptionController.getBoostQueueStatus);

// Get boost queue position
router.get('/:businessId/boost/queue-position', authorizedAccessBusiness, businessSubscriptionController.getBoostQueuePosition);

// Get payment history for all businesses owned by the user
router.get('/payment-history', verifyBusinessOwnerToken, businessSubscriptionController.getPaymentHistory);

// Get payment history for a specific business
router.get('/:businessId/payment-history', authorizedAccessBusiness, businessSubscriptionController.getBusinessPaymentHistory);

export default router;
