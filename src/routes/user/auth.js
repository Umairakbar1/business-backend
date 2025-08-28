import { Router } from "express";
import { 
  sendRegistrationOtp,
  verifyRegistrationOtp,
  loginUser,
  verifyOtp,
  updatePassword,
  updateProfile,
  deleteProfile,
  googleAuth,
  sendOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword
} from "../../controllers/user/auth.controller.js";
import { authorizedAccessUser } from "../../middleware/authorization.js";
import { 
  requestPasswordResetValidation,
  verifyPasswordResetOtpValidation,
  resetPasswordValidation
} from "../../validators/user.js";

const router = Router();

// Public routes (no authentication required)
router.post("/send-registration-otp", sendRegistrationOtp);
router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/login", loginUser);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/google-auth", googleAuth);
router.post("/forgot-password", requestPasswordResetValidation, requestPasswordReset);
router.post("/verify-reset-otp", verifyPasswordResetOtpValidation, verifyPasswordResetOtp);
router.post("/reset-password", resetPasswordValidation, resetPassword);

// Protected routes (authentication required)
router.put("/password", authorizedAccessUser, updatePassword);
router.put("/profile", authorizedAccessUser, updateProfile);
router.delete("/profile", authorizedAccessUser, deleteProfile);

export default router; 