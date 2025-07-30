import { Router } from 'express';
import {
  getBusinessOwnerProfile,
  updateBusinessOwnerProfile,
  changeBusinessOwnerPassword,
  deleteBusinessOwnerAccount,
  getBusinessOwnerDashboardStats
} from '../../controllers/business/businessOwner.controller.js';
import { authorizedAccessBusiness } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

// Get Business Owner Profile
router.get('/profile', authorizedAccessBusiness, getBusinessOwnerProfile);

// Update Business Owner Profile
router.put('/profile', authorizedAccessBusiness, uploadSingleImageToCloudinary, handleCloudinaryUploadError, updateBusinessOwnerProfile);

// Change Business Owner Password
router.put('/password', authorizedAccessBusiness, changeBusinessOwnerPassword);

// Delete Business Owner Account
router.delete('/account', authorizedAccessBusiness, deleteBusinessOwnerAccount);

// Get Business Owner Dashboard Stats
router.get('/dashboard-stats', authorizedAccessBusiness, getBusinessOwnerDashboardStats);

export default router; 