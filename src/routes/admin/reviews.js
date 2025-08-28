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
  addComment,
  addReply,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  addReplyToReview,
  editReplyToReview,
  deleteReplyToReview
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

// POST /admin/reviews/:id/reply - Add direct reply to review
router.post("/:id/reply", authorizedAccessAdmin, addReplyToReview);

// PUT /admin/reviews/:id/reply - Edit direct reply to review
router.put("/:id/reply", authorizedAccessAdmin, editReplyToReview);

// DELETE /admin/reviews/:id/reply - Delete direct reply to review
router.delete("/:id/reply", authorizedAccessAdmin, deleteReplyToReview);

// POST /admin/reviews/:id/comments - Add comment to review
router.post("/:id/comments", authorizedAccessAdmin, addComment);

// POST /admin/reviews/comments/:commentId/replies - Add reply to comment
router.post("/comments/:commentId/replies", authorizedAccessAdmin, addReply);

// PUT /admin/reviews/comments/:commentId - Edit comment
router.put("/comments/:commentId", authorizedAccessAdmin, editComment);

// PUT /admin/reviews/comments/:commentId/replies/:replyId - Edit reply
router.put("/comments/:commentId/replies/:replyId", authorizedAccessAdmin, editReply);

// DELETE /admin/reviews/comments/:commentId - Delete comment
router.delete("/comments/:commentId", authorizedAccessAdmin, deleteComment);

// DELETE /admin/reviews/comments/:commentId/replies/:replyId - Delete reply
router.delete("/comments/:commentId/replies/:replyId", authorizedAccessAdmin, deleteReply);

export default router; 