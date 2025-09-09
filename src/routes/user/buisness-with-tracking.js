import { Router } from "express";
import {
  getBusinessListings,
  getBusinessDetails,
  getBusinessReviews,
  getBusinessCategoriesWithSubcategories,
  getSingleCategoryWithSubcategories,
  getSearchSuggestions,
  getHomePageData
} from "../../controllers/user/business.controller.js";
import { 
  trackPageVisitMiddleware, 
  trackSearchMiddleware,
  updateLastActivityMiddleware 
} from "../../middleware/userActivityMiddleware.js";

const router = Router();

// Track business listings page visits
router.get("/", 
  trackPageVisitMiddleware("Business Listings"), 
  getBusinessListings
);

// Track search suggestions usage
router.get("/search-suggestions", 
  trackSearchMiddleware(), 
  getSearchSuggestions
);

// Track homepage visits
router.get("/home", 
  trackPageVisitMiddleware("Homepage"), 
  getHomePageData
);

// Track category browsing
router.get("/categories", 
  trackPageVisitMiddleware("Business Categories"), 
  getBusinessCategoriesWithSubcategories
);

router.get("/categories/:categoryId", 
  trackPageVisitMiddleware("Category Details"), 
  getSingleCategoryWithSubcategories
);

// Track business detail page visits
router.get("/:id", 
  trackPageVisitMiddleware("Business Details"), 
  getBusinessDetails
);

// Track business reviews page visits
router.get("/:id/reviews", 
  trackPageVisitMiddleware("Business Reviews"), 
  getBusinessReviews
);

export default router;
