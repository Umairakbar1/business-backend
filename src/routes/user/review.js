import { Router } from "express";
import { submitReview, getMyReviews } from "../../controllers/user/review.controller.js";
import { authorizedAccessUser } from "../../middleware/authorization.js";

const router = Router();

// POST /user/review
router.post("/", authorizedAccessUser, submitReview);

// GET /user/review/my-reviews
router.get("/my-reviews", authorizedAccessUser, getMyReviews);

export default router;
