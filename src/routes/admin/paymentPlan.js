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

// Get payment plan by ID
router.get('/:id', authorizedAccessAdmin, paymentPlanController.getPaymentPlanById);

// Update payment plan
router.put('/:id', authorizedAccessAdmin, validate(paymentPlanUpdateValidator), paymentPlanController.updatePaymentPlan);

// Delete payment plan
router.delete('/:id', authorizedAccessAdmin, paymentPlanController.deletePaymentPlan);

// Toggle payment plan status
router.patch('/:id/status', authorizedAccessAdmin, paymentPlanController.togglePaymentPlanStatus);

export default router;
