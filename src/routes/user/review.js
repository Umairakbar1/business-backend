import { Router } from "express";
import { submitReview } from "../../controllers/user/review.controller.js";
import { authorizedAccessUser } from "../../middleware/authorization.js";

const router = Router();

// POST /user/review
router.post("/", authorizedAccessUser, submitReview);

export default router;
