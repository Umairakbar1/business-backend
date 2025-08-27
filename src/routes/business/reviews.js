import { Router } from "express";
import { verifyBusinessOwnerToken } from "../../middleware/authorization.js";
import {
  getBusinessReviews,
  getManageableReviews,
  getReviewById,
  approveReview,
  rejectReview,
  deleteReview,
  getReviewStats,
  addComment,
  addReply,
  editComment,
  editReply,
  deleteComment,
  deleteReply
} from "../../controllers/business/review.controller.js";

const router = Router();

// GET /business/reviews - Get all reviews for business
router.get("/", verifyBusinessOwnerToken, getBusinessReviews);

// GET /business/reviews/manageable - Get reviews that business can manage
router.get("/manageable", verifyBusinessOwnerToken, getManageableReviews);

// GET /business/reviews/stats - Get review statistics
router.get("/stats", verifyBusinessOwnerToken, getReviewStats);

// GET /business/reviews/:id - Get single review details
router.get("/:id", verifyBusinessOwnerToken, getReviewById);

// PUT /business/reviews/:id/approve - Approve a review (only if business has access)
router.put("/:id/approve", verifyBusinessOwnerToken, approveReview);

// PUT /business/reviews/:id/reject - Reject a review (only if business has access)
router.put("/:id/reject", verifyBusinessOwnerToken, rejectReview);

// DELETE /business/reviews/:id - Delete a review (only if business has access)
router.delete("/:id", verifyBusinessOwnerToken, deleteReview);

// POST /business/reviews/:id/comments - Add comment to review
router.post("/:id/comments", verifyBusinessOwnerToken, addComment);

// POST /business/reviews/comments/:commentId/replies - Add reply to comment
router.post("/comments/:commentId/replies", verifyBusinessOwnerToken, addReply);

// PUT /business/reviews/comments/:commentId - Edit comment
router.put("/comments/:commentId", verifyBusinessOwnerToken, editComment);

// PUT /business/reviews/comments/:commentId/replies/:replyId - Edit reply
router.put("/comments/:commentId/replies/:replyId", verifyBusinessOwnerToken, editReply);

// DELETE /business/reviews/comments/:commentId - Delete comment
router.delete("/comments/:commentId", verifyBusinessOwnerToken, deleteComment);

// DELETE /business/reviews/comments/:commentId/replies/:replyId - Delete reply
router.delete("/comments/:commentId/replies/:replyId", verifyBusinessOwnerToken, deleteReply);

export default router; 