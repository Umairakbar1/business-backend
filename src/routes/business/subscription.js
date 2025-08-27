import express from 'express';
import businessSubscriptionController from '../../controllers/business/subscription.controller.js';
import { authorizedAccessBusiness } from '../../middleware/authorization.js';

const router = express.Router();

// Subscribe to a payment plan
router.post('/:businessId/subscribe', authorizedAccessBusiness, businessSubscriptionController.subscribeToPlan);

// Upgrade business plan
router.post('/:businessId/upgrade', authorizedAccessBusiness, businessSubscriptionController.upgradeBusinessPlan);

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

export default router;
