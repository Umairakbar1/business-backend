import { Router } from "express";
import { createAdmin, loginAdmin } from "../../controllers/admin/auth.controller.js";

const router = Router();

router.post("/signup", createAdmin);
router.post("/login", loginAdmin);


export default router;
