import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import {
  getAllBusinesses,
  getSingleBusiness,
  changeStatusOfBusiness,
  deleteBusiness,
  updateBusiness,
  getBusinessStats,
  bulkUpdateBusinessStatus
} from "../../controllers/admin/busienss.controller.js";

const router = Router();

// Get all businesses with pagination and filtering
router.get("/", authorizedAccessAdmin, getAllBusinesses);

// Get single business by ID
router.get("/:businessId", authorizedAccessAdmin, getSingleBusiness);

// Update business status
router.post("/status/:businessId", authorizedAccessAdmin, changeStatusOfBusiness);

// Update business information
router.put("/:businessId", authorizedAccessAdmin, updateBusiness);

// Delete business
router.delete("/:businessId", authorizedAccessAdmin, deleteBusiness);

// Get business statistics
router.get("/stats/summary", authorizedAccessAdmin, getBusinessStats);

// Bulk update business status
router.patch("/bulk-status", authorizedAccessAdmin, bulkUpdateBusinessStatus);

export default router;
