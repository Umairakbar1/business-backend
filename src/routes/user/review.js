import { Router } from "express";
import { 
  submitReview, 
  getMyReviews, 
  addComment, 
  addReply, 
  editComment, 
  editReply, 
  deleteComment, 
  deleteReply,
  getReviewById,
} from "../../controllers/user/review.controller.js";
import { authorizedAccessUser } from "../../middleware/authorization.js";
import { uploadMultipleMediaToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";

const router = Router();

// POST /user/review - Submit review with media upload support
router.post("/", authorizedAccessUser, uploadMultipleMediaToCloudinary, handleCloudinaryUploadError, submitReview);

// GET /user/review/my-reviews - Get user's own reviews
router.get("/my-reviews", authorizedAccessUser, getMyReviews);

// GET /user/review/:id - Get review by id
router.get("/:id", authorizedAccessUser, getReviewById);

// POST /user/review/:id/comments - Add comment to review
router.post("/:id/comments", authorizedAccessUser, addComment);

// POST /user/review/comments/:commentId/replies - Add reply to comment
router.post("/comments/:commentId/replies", authorizedAccessUser, addReply);

// PUT /user/review/comments/:commentId - Edit comment
router.put("/comments/:commentId", authorizedAccessUser, editComment);

// PUT /user/review/comments/:commentId/replies/:replyId - Edit reply
router.put("/comments/:commentId/replies/:replyId", authorizedAccessUser, editReply);

// DELETE /user/review/comments/:commentId - Delete comment
router.delete("/comments/:commentId", authorizedAccessUser, deleteComment);

// DELETE /user/review/comments/:commentId/replies/:replyId - Delete reply
router.delete("/comments/:commentId/replies/:replyId", authorizedAccessUser, deleteReply);

export default router;
