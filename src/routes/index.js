import { Router } from "express";
import adminAuthRoutes from "./admin/auth.js";
import adminBusinessRoutes from "./admin/business.js";
import adminUsersRoutes from "./admin/users.js";
import adminBlogsRoutes from "./admin/blogs.js";
import adminCategoryRoutes from "./admin/category.js";
import adminSubCategoryRoutes from "./admin/subCategory.js";
import adminLogCategoryRoutes from "./admin/logCategory.js";
import adminLogSubCategoryRoutes from "./admin/logSubCategory.js";
import adminReviewsRoutes from "./admin/reviews.js";
import adminQueryTicketsRoutes from "./admin/queryTickets.js";
import adminMetadataRoutes from "./admin/metadata.js";
import businessAuthRoutes from "./business/auth.js";
import businessReviewsRoutes from "./business/reviews.js";
import businessQueryTicketsRoutes from "./business/queryTickets.js";
import userAuthRoutes from "./user/auth.js";
import userBusinessRoutes from "./user/buisness.js";
import userReviewRoutes from "./user/review.js";
import userBlogsRoutes from "./user/blogs.js";
import { getMetadataByUrl } from "../controllers/admin/metadata.controller.js";

const router = Router();

// Admin routes
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/business", adminBusinessRoutes);
router.use("/admin/users", adminUsersRoutes);
router.use("/admin/blogs", adminBlogsRoutes);
router.use("/admin/category", adminCategoryRoutes);
router.use("/admin/subcategory", adminSubCategoryRoutes);
router.use("/admin/log-category", adminLogCategoryRoutes);
router.use("/admin/log-subcategory", adminLogSubCategoryRoutes);
router.use("/admin/reviews", adminReviewsRoutes);
router.use("/admin/query-tickets", adminQueryTicketsRoutes);
router.use("/admin/metadata", adminMetadataRoutes);

// Business routes
router.use("/business/auth", businessAuthRoutes);
router.use("/business/reviews", businessReviewsRoutes);
router.use("/business/query-tickets", businessQueryTicketsRoutes);

// User routes
router.use("/user/auth", userAuthRoutes);
router.use("/user/business", userBusinessRoutes);
router.use("/user/review", userReviewRoutes);
router.use("/user/blogs", userBlogsRoutes);

// Public metadata route for user-side pages
router.get("/metadata/:url", getMetadataByUrl);

export default router;
