import { Router } from "express";
import { submitReview, getMyReviews } from "../../controllers/user/review.controller.js";
import { authorizedAccessUser } from "../../middleware/authorization.js";
import { uploadMultipleMediaToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";

const router = Router();

// POST /user/review - Submit review with media upload support
router.post("/", authorizedAccessUser, uploadMultipleMediaToCloudinary, handleCloudinaryUploadError, submitReview);

// GET /user/review/my-reviews - Get user's own reviews
router.get("/my-reviews", authorizedAccessUser, getMyReviews);

export default router;
