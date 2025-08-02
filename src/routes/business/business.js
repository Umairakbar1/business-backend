import { Router } from 'express';
import {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  updateBusinessStatus,
  getAvailablePlans,
  getCurrentPlan,
  createPlanPaymentSession,
  getAllMyBusinessSubscriptions,
  boostBusiness,
  agreeBoostBusiness,
  getBoostedBusinesses,
  getMyBusinessBoosts,
  deleteBusinessBoosts,
  getOwnerRecentSubscriptions,
  validateBusinessWebsite,
  handleStripeWebhook
} from '../../controllers/business/business.controller.js';

import { validateBusiness, validateBusinessStatus } from '../../validators/business/business.js';
import { verifyBusinessOwnerToken } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

// Stripe webhook endpoint (no authentication required as Stripe will call this)
router.post('/webhook/stripe', handleStripeWebhook);

router.post('/', verifyBusinessOwnerToken, uploadSingleImageToCloudinary, handleCloudinaryUploadError, validateBusiness, createBusiness);
router.get('/', verifyBusinessOwnerToken, getMyBusinesses);
router.get('/:id', verifyBusinessOwnerToken, getBusinessById);
router.put('/:id', verifyBusinessOwnerToken, uploadSingleImageToCloudinary, handleCloudinaryUploadError, validateBusiness, updateBusiness);
router.delete('/:id', verifyBusinessOwnerToken, deleteBusiness);
router.patch('/:id/status', verifyBusinessOwnerToken, validateBusinessStatus, updateBusinessStatus);
router.get('/plans/available', verifyBusinessOwnerToken, getAvailablePlans);
router.get('/plans/current', verifyBusinessOwnerToken, getCurrentPlan);
router.post('/plans/payment-session', verifyBusinessOwnerToken, createPlanPaymentSession);
router.get('/subscriptions/all', verifyBusinessOwnerToken, getAllMyBusinessSubscriptions);
router.get('/subscriptions/recent', verifyBusinessOwnerToken, getOwnerRecentSubscriptions);

router.post('/boost', verifyBusinessOwnerToken, boostBusiness);
router.post('/boost/agree', verifyBusinessOwnerToken, agreeBoostBusiness);
router.get('/boosted', getBoostedBusinesses);
router.get('/boost/history', verifyBusinessOwnerToken, getMyBusinessBoosts);
router.delete('/boost/delete', verifyBusinessOwnerToken, deleteBusinessBoosts);
router.post('/validate-website', verifyBusinessOwnerToken, validateBusinessWebsite);

export default router; 