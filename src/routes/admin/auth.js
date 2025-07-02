import { Router } from "express";
import { createAdmin, loginAdmin, updateAdminProfile, updateAdminPassword } from "../../controllers/admin/auth.controller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";

const router = Router();

router.post("/signup", createAdmin);
router.post("/login", loginAdmin);
router.put("/profile", authorizedAccessAdmin, updateAdminProfile);
router.put("/password", authorizedAccessAdmin, updateAdminPassword);


export default router;
