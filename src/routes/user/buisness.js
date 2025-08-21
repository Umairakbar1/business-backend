import { Router } from "express";
import {
  getBusinessListings,
  getBusinessDetails,
  getBusinessReviews,
  getBusinessCategoriesWithSubcategories
} from "../../controllers/user/business.controller.js";

const router = Router();

router.get("/", getBusinessListings);

// Business categories with nested subcategories - MUST come BEFORE :id routes
router.get("/categories", getBusinessCategoriesWithSubcategories);

// Parameterized routes - MUST come AFTER specific routes
router.get("/:id", getBusinessDetails);
router.get("/:id/reviews", getBusinessReviews);

export default router;
