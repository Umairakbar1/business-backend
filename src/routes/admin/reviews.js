import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import {
  getAllReviews,
  getReviewById,
  approveReview,
  rejectReview,
  deleteReview,
  getReviewStats,
  grantBusinessAccess,
  revokeBusinessAccess,
  getBusinessesWithReviews,
  getBusinessWithReviewsById,
  
} from "../../controllers/admin/review.controller.js";

const router = Router();

// GET /admin/reviews - Get all reviews with pagination and filtering
router.get("/", authorizedAccessAdmin, getAllReviews);

// GET /admin/reviews/stats - Get review statistics
router.get("/stats", authorizedAccessAdmin, getReviewStats);

// GET /admin/reviews/businesses-with-reviews - Get businesses with their review information
router.get("/businesses-with-reviews", authorizedAccessAdmin, getBusinessesWithReviews);

// GET /admin/reviews/business-with-reviews/:businessId - Get single business with detailed review information
router.get("/business/:businessId", authorizedAccessAdmin, getBusinessWithReviewsById);

// GET /admin/reviews/:id - Get single review details
router.get("/:id", authorizedAccessAdmin, getReviewById);

// PUT /admin/reviews/:id/approve - Approve a review
router.put("/:id/approve", authorizedAccessAdmin, approveReview);

// PUT /admin/reviews/:id/reject - Reject a review
router.put("/:id/reject", authorizedAccessAdmin, rejectReview);

// DELETE /admin/reviews/:id - Delete a review
router.delete("/:id", authorizedAccessAdmin, deleteReview);

// PUT /admin/reviews/:id/grant-business-access - Grant business access to manage this review
router.put("/:id/grant-business-access", authorizedAccessAdmin, grantBusinessAccess);

// PUT /admin/reviews/:id/revoke-business-access - Revoke business access to manage this review
router.put("/:id/revoke-business-access", authorizedAccessAdmin, revokeBusinessAccess);

export default router; 