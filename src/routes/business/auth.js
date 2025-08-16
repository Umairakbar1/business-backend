import express from 'express';
import { 
  businessOwnerSignup,
  resendOtp,
  verifyOtpAndCreateBusinessOwner,
  setBusinessOwnerCredentials,
  businessOwnerLogin,
  registerBusiness,
  updateBusinessLogo,
  updateBusinessImages,
  deleteBusinessImage,
  getBusinessOwnerBusinesses,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword
} from '../../controllers/business/auth.controller.js';
import { 
  businessOwnerSignupValidation,
  resendOtpValidation,
  verifyOtpCreateBusinessOwnerValidation,
  setBusinessOwnerCredentialsValidation,
  businessOwnerLoginValidation,
  registerBusinessValidation,
  requestPasswordResetValidation,
  verifyPasswordResetOtpValidation,
  resetPasswordValidation
} from '../../validators/business/auth.js';
import { verifyBusinessOwnerToken, verifyAccountCreationToken } from '../../middleware/authorization.js';
import { 
  uploadBusinessAssets, 
  uploadLogo,
  uploadBusinessImages,
  processCloudinaryUpload, 
  handleCloudinaryUploadError 
} from '../../middleware/cloudinaryUpload.js';

const router = express.Router();

// Business Owner Registration Flow
router.post('/signup', businessOwnerSignupValidation, businessOwnerSignup);
router.post('/resend-otp', resendOtpValidation, resendOtp);
router.post('/verify-otp-create', verifyOtpCreateBusinessOwnerValidation, verifyOtpAndCreateBusinessOwner);
router.post('/set-credentials', verifyAccountCreationToken, setBusinessOwnerCredentialsValidation, setBusinessOwnerCredentials);

// Business Owner Login
router.post('/login', businessOwnerLoginValidation, businessOwnerLogin);

// Business Registration (for authenticated business owners)
router.post('/register-business', 
  verifyBusinessOwnerToken, 
  uploadBusinessAssets, 
  handleCloudinaryUploadError,
  processCloudinaryUpload,
  registerBusinessValidation, 
  registerBusiness
);

// Update Business Logo
router.put('/business/:businessId/logo', 
  verifyBusinessOwnerToken, 
  uploadLogo,
  handleCloudinaryUploadError,
  processCloudinaryUpload,
  updateBusinessLogo
);

// Update Business Images
router.put('/business/:businessId/images', 
  verifyBusinessOwnerToken, 
  uploadBusinessImages,
  handleCloudinaryUploadError,
  processCloudinaryUpload,
  updateBusinessImages
);

// Delete Business Image
router.delete('/business/:businessId/images/:imageId', 
  verifyBusinessOwnerToken, 
  deleteBusinessImage
);

// Get Business Owner's Businesses
router.get('/my-businesses', verifyBusinessOwnerToken, getBusinessOwnerBusinesses);

// Password Recovery Routes
router.post('/forgot-password', requestPasswordResetValidation, requestPasswordReset);
router.post('/verify-reset-otp', verifyPasswordResetOtpValidation, verifyPasswordResetOtp);
router.post('/reset-password', resetPasswordValidation, resetPassword);

export default router; 