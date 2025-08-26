import { Router } from "express";
import { createAdmin, loginAdmin, updateAdminProfile, updateAdminPassword } from "../../controllers/admin/auth.controller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { uploadAdminProfileImage } from "../../middleware/cloudinaryUpload.js";

const router = Router();

router.post("/signup", createAdmin);
router.post("/login", loginAdmin);

// Profile update route - with robust file upload middleware
router.put("/profile",
    authorizedAccessAdmin,
    uploadAdminProfileImage,
    updateAdminProfile
);

router.put("/password", authorizedAccessAdmin, updateAdminPassword);

export default router;
