import { Router } from "express";
import { loginAdmin } from "../../controllers/admin/auth.controller.js";

const router = Router();

// router.get("/create", createAdmin);
router.post("/login", loginAdmin);



export default router;
