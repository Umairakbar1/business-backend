import express from 'express';
import paymentPlanController from '../../controllers/admin/paymentPlan.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import { validate } from '../../middleware/joiValidation.js';
import { paymentPlanValidator, paymentPlanUpdateValidator } from '../../validators/admin.js';

const router = express.Router();

// Create payment plan
router.post('/', authorizedAccessAdmin, validate(paymentPlanValidator), paymentPlanController.createPaymentPlan);

// Get all payment plans
router.get('/', authorizedAccessAdmin, paymentPlanController.getAllPaymentPlans);

// Get business plans (public endpoint for frontend)
router.get('/business', paymentPlanController.getBusinessPlans);

// Get boost plans (public endpoint for frontend)
router.get('/boost', paymentPlanController.getBoostPlans);

// Get boost plan by category
router.get('/boost/category/:categoryId', paymentPlanController.getBoostPlansByCategory);

// Check if category is available for boost plan
router.get('/boost/check-category/:categoryId', paymentPlanController.checkCategoryAvailability);

// Get available categories for boost plans
router.get('/boost/available-categories', paymentPlanController.getAvailableCategoriesForBoost);

// Get payment plan by ID
router.get('/:id', authorizedAccessAdmin, paymentPlanController.getPaymentPlanById);

// Get detailed plan information with type-specific details
router.get('/:id/details', authorizedAccessAdmin, paymentPlanController.getPlanDetails);

// Update payment plan
router.put('/:id', authorizedAccessAdmin, validate(paymentPlanUpdateValidator), paymentPlanController.updatePaymentPlan);

// Delete payment plan
router.delete('/:id', authorizedAccessAdmin, paymentPlanController.deletePaymentPlan);

// Toggle payment plan status
router.post('/toggle-status/:id', authorizedAccessAdmin, paymentPlanController.togglePaymentPlanStatus);

// Activate payment plan
router.post('/:id/activate', authorizedAccessAdmin, paymentPlanController.activatePaymentPlan);

// Deactivate payment plan
router.post('/:id/deactivate', authorizedAccessAdmin, paymentPlanController.deactivatePaymentPlan);

// Get plan features
router.get('/:id/features', authorizedAccessAdmin, paymentPlanController.getPlanFeatures);

// Update plan features
router.put('/:id/features', authorizedAccessAdmin, paymentPlanController.updatePlanFeatures);

// Update plan validity (boost plans only)
router.put('/:id/validity', authorizedAccessAdmin, paymentPlanController.updatePlanValidity);

// Get plan pricing
router.get('/:id/pricing', authorizedAccessAdmin, paymentPlanController.getPlanPricing);

// Update plan pricing
router.put('/:id/pricing', authorizedAccessAdmin, paymentPlanController.updatePlanPricing);

// Update plan discount
router.put('/:id/discount', authorizedAccessAdmin, paymentPlanController.updatePlanDiscount);

// Get plan subscriptions
router.get('/:id/subscriptions', authorizedAccessAdmin, paymentPlanController.getPlanSubscriptions);

// Get active subscriptions
router.get('/:id/subscriptions/active', authorizedAccessAdmin, paymentPlanController.getActiveSubscriptions);

// Get plan analytics
router.get('/:id/analytics', authorizedAccessAdmin, paymentPlanController.getPlanAnalytics);

// Get revenue stats
router.get('/:id/revenue', authorizedAccessAdmin, paymentPlanController.getRevenueStats);

// Bulk operations
router.patch('/bulk-status', authorizedAccessAdmin, paymentPlanController.bulkUpdateStatus);
router.patch('/bulk-delete', authorizedAccessAdmin, paymentPlanController.bulkDelete);

// Get payment plan statistics
router.get('/stats/summary', authorizedAccessAdmin, paymentPlanController.getPaymentPlanStats);

// New comprehensive endpoints for boost plans, business plans, and subscriptions
router.get('/boost/all', authorizedAccessAdmin, paymentPlanController.getAllBoostPlans);
router.get('/business/all', authorizedAccessAdmin, paymentPlanController.getAllBusinessPlans);

// Business subscription and payment history
router.get('/subscriptions/history', authorizedAccessAdmin, paymentPlanController.getBusinessSubscriptionHistory);
router.get('/payments/history', authorizedAccessAdmin, paymentPlanController.getPaymentHistory);

// Business overview and analytics
router.get('/business/:businessId/overview', authorizedAccessAdmin, paymentPlanController.getBusinessOverview);
router.get('/analytics/subscriptions', authorizedAccessAdmin, paymentPlanController.getSubscriptionAnalytics);

export default router;
