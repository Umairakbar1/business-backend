import { Router } from "express";
import { 
  registerUser,
  loginUser,
  verifyOtp,
  updatePassword,
  updateProfile,
  deleteProfile,
  googleAuth,
  sendOtp
} from "../../controllers/user/auth.controller.js";
import { authorizedAccessUser } from "../../middleware/authorization.js";

const router = Router();

// Public routes (no authentication required)
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/google-auth", googleAuth);

// Protected routes (authentication required)
router.put("/password", authorizedAccessUser, updatePassword);
router.put("/profile", authorizedAccessUser, updateProfile);
router.delete("/profile", authorizedAccessUser, deleteProfile);

export default router; 