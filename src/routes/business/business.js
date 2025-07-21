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
  generateReviewEmbedLink,
  validateBusinessWebsite
} from '../../controllers/business/business.controller.js';
import { validateBusiness, validateBusinessStatus } from '../../validators/business/business.js';
import { authenticate } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

router.post('/', authenticate, uploadSingleImageToCloudinary, handleCloudinaryUploadError, validateBusiness, createBusiness);
router.get('/', authenticate, getMyBusinesses);
router.get('/:id', authenticate, getBusinessById);
router.put('/:id', authenticate, uploadSingleImageToCloudinary, handleCloudinaryUploadError, validateBusiness, updateBusiness);
router.delete('/:id', authenticate, deleteBusiness);
router.patch('/:id/status', authenticate, validateBusinessStatus, updateBusinessStatus);
router.get('/plans/available', authenticate, getAvailablePlans);
router.get('/plans/current', authenticate, getCurrentPlan);
router.post('/plans/payment-session', authenticate, createPlanPaymentSession);
router.get('/subscriptions/all', authenticate, getAllMyBusinessSubscriptions);
router.get('/subscriptions/recent', authenticate, getOwnerRecentSubscriptions);
router.post('/embed/review-link', authenticate, generateReviewEmbedLink);
router.post('/boost', authenticate, boostBusiness);
router.post('/boost/agree', authenticate, agreeBoostBusiness);
router.get('/boosted', getBoostedBusinesses);
router.get('/boost/history', authenticate, getMyBusinessBoosts);
router.delete('/boost/delete', authenticate, deleteBusinessBoosts);
router.post('/validate-website', authenticate, validateBusinessWebsite);

export default router; 