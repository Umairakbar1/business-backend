import express from 'express';
import { 
  businessOwnerSignup,
  resendOtp,
  verifyOtpAndCreateBusinessOwner,
  setBusinessOwnerCredentials,
  businessOwnerLogin,
  registerBusiness,
  getBusinessOwnerBusinesses
} from '../../controllers/business/auth.controller.js';
import { 
  businessOwnerSignupValidation,
  resendOtpValidation,
  verifyOtpCreateBusinessOwnerValidation,
  setBusinessOwnerCredentialsValidation,
  businessOwnerLoginValidation,
  registerBusinessValidation
} from '../../validators/business/auth.js';
import { verifyBusinessOwnerToken, verifyAccountCreationToken } from '../../middleware/authorization.js';

const router = express.Router();

// Business Owner Registration Flow
router.post('/signup', businessOwnerSignupValidation, businessOwnerSignup);
router.post('/resend-otp', resendOtpValidation, resendOtp);
router.post('/verify-otp-create', verifyOtpCreateBusinessOwnerValidation, verifyOtpAndCreateBusinessOwner);
router.post('/set-credentials', verifyAccountCreationToken, setBusinessOwnerCredentialsValidation, setBusinessOwnerCredentials);

// Business Owner Login
router.post('/login', businessOwnerLoginValidation, businessOwnerLogin);

// Business Registration (for authenticated business owners)
router.post('/register-business', verifyBusinessOwnerToken, registerBusinessValidation, registerBusiness);

// Get Business Owner's Businesses
router.get('/my-businesses', verifyBusinessOwnerToken, getBusinessOwnerBusinesses);

export default router; 