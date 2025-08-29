import { Router } from "express";
import {
  getBusinessListings,
  getBusinessDetails,
  getBusinessReviews,
  getBusinessCategoriesWithSubcategories,
  getSingleCategoryWithSubcategories,
  getSearchSuggestions
} from "../../controllers/user/business.controller.js";

const router = Router();

router.get("/", getBusinessListings);

// Search suggestions for businesses and categories
router.get("/search-suggestions", getSearchSuggestions);

// Business categories with nested subcategories - MUST come BEFORE :id routes
router.get("/categories", getBusinessCategoriesWithSubcategories);
router.get("/categories/:categoryId", getSingleCategoryWithSubcategories);

// Parameterized routes - MUST come AFTER specific routes
router.get("/:id", getBusinessDetails);
router.get("/:id/reviews", getBusinessReviews);

export default router;
