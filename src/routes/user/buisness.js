import { Router } from "express";
import {
  getBusinessListings,
  getBusinessDetails,
  getBusinessReviews
} from "../../controllers/user/business.controller.js";

const router = Router();

router.get("/", getBusinessListings);
router.get("/:id", getBusinessDetails);
router.get("/:id/reviews", getBusinessReviews);

export default router;
