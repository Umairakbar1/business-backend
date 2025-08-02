import { Router } from 'express';
import {
  getBusinessOwnerProfile,
  updateBusinessOwnerProfile,
  changeBusinessOwnerPassword,
  deleteBusinessOwnerAccount,
  getBusinessOwnerDashboardStats
} from '../../controllers/business/businessOwner.controller.js';
import { verifyBusinessOwnerToken } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

// Get Business Owner Profile
router.get('/profile', verifyBusinessOwnerToken, getBusinessOwnerProfile);

// Update Business Owner Profile
router.put('/profile', verifyBusinessOwnerToken, uploadSingleImageToCloudinary, handleCloudinaryUploadError, updateBusinessOwnerProfile);

// Change Business Owner Password
router.put('/password', verifyBusinessOwnerToken, changeBusinessOwnerPassword);

// Delete Business Owner Account
router.delete('/account', verifyBusinessOwnerToken, deleteBusinessOwnerAccount);

// Get Business Owner Dashboard Stats
router.get('/dashboard-stats', verifyBusinessOwnerToken, getBusinessOwnerDashboardStats);

export default router; 