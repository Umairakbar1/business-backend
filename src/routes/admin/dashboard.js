import { Router } from "express";
import { getDashboardStats, getQuickStats } from "../../controllers/admin/dashboard.controller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";

const router = Router();

// Get comprehensive dashboard statistics
router.get("/stats", authorizedAccessAdmin, getDashboardStats);

// Get quick overview statistics
router.get("/quick-stats", authorizedAccessAdmin, getQuickStats);

export default router;
