import { Router } from "express";
import { authorizedAccessBusiness } from "../../middleware/authorization.js";
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";
import {
  businessSignup,
  verifyOtpAndSetCredentials,
  businessLogin,
  businessGoogleAuth,
  sendOtpForEmail,
  verifyOtp,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateProfile,
  getProfile
} from "../../controllers/business/auth.controller.js";
import {
  validateBusinessAuth,
  businessSignupValidation,
  verifyOtpValidation,
  businessLoginValidation,
  googleAuthValidation,
  sendOtpValidation,
  verifyOtpEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updatePasswordValidation,
  updateProfileValidation
} from "../../validators/business/auth.js";

const router = Router();

// Public routes (no authentication required)
// POST /business/auth/signup - Business signup
router.post("/signup", validateBusinessAuth(businessSignupValidation), businessSignup);

// POST /business/auth/verify-otp - Verify OTP and set credentials
router.post("/verify-otp", validateBusinessAuth(verifyOtpValidation), verifyOtpAndSetCredentials);

// POST /business/auth/login - Business login
router.post("/login", validateBusinessAuth(businessLoginValidation), businessLogin);

// POST /business/auth/google - Google authentication
router.post("/google", validateBusinessAuth(googleAuthValidation), businessGoogleAuth);

// POST /business/auth/send-otp - Send OTP for email verification
router.post("/send-otp", validateBusinessAuth(sendOtpValidation), sendOtpForEmail);

// POST /business/auth/verify-otp-email - Verify OTP for email
router.post("/verify-otp-email", validateBusinessAuth(verifyOtpEmailValidation), verifyOtp);

// POST /business/auth/forgot-password - Forgot password
router.post("/forgot-password", validateBusinessAuth(forgotPasswordValidation), forgotPassword);

// POST /business/auth/reset-password - Reset password with OTP
router.post("/reset-password", validateBusinessAuth(resetPasswordValidation), resetPassword);

// Protected routes (authentication required)
// GET /business/auth/profile - Get business profile
router.get("/profile", authorizedAccessBusiness, getProfile);

// PUT /business/auth/update-password - Update password
router.put("/update-password", authorizedAccessBusiness, validateBusinessAuth(updatePasswordValidation), updatePassword);

// PUT /business/auth/update-profile - Update profile with image upload
router.put("/update-profile", authorizedAccessBusiness, uploadSingleImageToCloudinary, handleCloudinaryUploadError, validateBusinessAuth(updateProfileValidation), updateProfile);

export default router; 