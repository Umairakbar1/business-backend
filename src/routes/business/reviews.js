import { Router } from "express";
import { authorizedAccessBusiness } from "../../middleware/authorization.js";
import {
  getBusinessReviews,
  getManageableReviews,
  getReviewById,
  approveReview,
  rejectReview,
  deleteReview,
  getReviewStats
} from "../../controllers/business/review.controller.js";

const router = Router();

// GET /business/reviews - Get all reviews for business
router.get("/", authorizedAccessBusiness, getBusinessReviews);

// GET /business/reviews/manageable - Get reviews that business can manage
router.get("/manageable", authorizedAccessBusiness, getManageableReviews);

// GET /business/reviews/stats - Get review statistics
router.get("/stats", authorizedAccessBusiness, getReviewStats);

// GET /business/reviews/:id - Get single review details
router.get("/:id", authorizedAccessBusiness, getReviewById);

// PUT /business/reviews/:id/approve - Approve a review (only if business has access)
router.put("/:id/approve", authorizedAccessBusiness, approveReview);

// PUT /business/reviews/:id/reject - Reject a review (only if business has access)
router.put("/:id/reject", authorizedAccessBusiness, rejectReview);

// DELETE /business/reviews/:id - Delete a review (only if business has access)
router.delete("/:id", authorizedAccessBusiness, deleteReview);

export default router; 