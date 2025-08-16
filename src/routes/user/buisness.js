import { Router } from "express";
import {
  getBusinessListings,
  getBusinessDetails,
  getBusinessReviews,
  getBusinessCategoriesWithSubcategories
} from "../../controllers/user/business.controller.js";

const router = Router();

router.get("/", getBusinessListings);
router.get("/:id", getBusinessDetails);
router.get("/:id/reviews", getBusinessReviews);

// Business categories with nested subcategories
router.get("/categories", getBusinessCategoriesWithSubcategories);

export default router;
