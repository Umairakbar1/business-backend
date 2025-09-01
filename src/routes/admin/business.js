import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import {
  getAllBusinesses,
  getSingleBusiness,
  changeStatusOfBusiness,
  deleteBusiness,
  updateBusiness,
  getBusinessStats,
  bulkUpdateBusinessStatus,
  bulkDeleteBusinesses,
  getBusinessesWithOwnerDetails,
  testBusinessConnection,
  searchBusinessesByOwner,
  getAllBusinessesNoFilter,
  getBusinessSubscriptionAndBoostDetails,
  getSubscriptionDetailsById
} from "../../controllers/admin/busienss.controller.js";
import { uploadBusinessAssets, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";

const router = Router();

// Test database connection (for debugging)
router.get("/test-connection", authorizedAccessAdmin, testBusinessConnection);

// Get all businesses without filtering (for testing)
router.get("/no-filter", authorizedAccessAdmin, getAllBusinessesNoFilter);

// Get all businesses with pagination and filtering
router.get("/", authorizedAccessAdmin, getAllBusinesses);

// Search businesses by owner information
router.get("/search-by-owner", authorizedAccessAdmin, searchBusinessesByOwner);

// Get businesses with detailed owner information
router.get("/with-owner-details", authorizedAccessAdmin, getBusinessesWithOwnerDetails);

// Get single business by ID
router.get("/:businessId", authorizedAccessAdmin, getSingleBusiness);

// Get detailed subscription and boost information for a business
router.get("/:businessId/subscription-details", authorizedAccessAdmin, getBusinessSubscriptionAndBoostDetails);



// Get subscription details by subscription ID
router.get("/subscription/:subscriptionId", authorizedAccessAdmin, getSubscriptionDetailsById);

// Update business status
router.post("/status/:businessId", authorizedAccessAdmin, changeStatusOfBusiness);

// Update business information
router.put("/:businessId", uploadBusinessAssets, handleCloudinaryUploadError, authorizedAccessAdmin, updateBusiness);

// Delete business
router.delete("/:businessId", authorizedAccessAdmin, deleteBusiness);

// Get business statistics
router.get("/stats/summary", authorizedAccessAdmin, getBusinessStats);

// Bulk update business status
router.patch("/bulk-status", authorizedAccessAdmin, bulkUpdateBusinessStatus);

// Bulk delete businesses with subscription cleanup
router.delete("/bulk-delete", authorizedAccessAdmin, bulkDeleteBusinesses);

export default router;
