import { Router } from "express";
import adminAuthRoutes from "./admin/auth.js";
import adminBusinessRoutes from "./admin/business.js";
import adminUsersRoutes from "./admin/users.js";
import adminBlogsRoutes from "./admin/blogs.js";
import adminCategoryRoutes from "./admin/category.js";
import adminSubCategoryRoutes from "./admin/subCategory.js";
import adminLogCategoryRoutes from "./admin/logCategory.js";
import adminLogSubCategoryRoutes from "./admin/logSubCategory.js";
import userAuthRoutes from "./user/auth.js";
import userBusinessRoutes from "./user/buisness.js";
import userReviewRoutes from "./user/review.js";
import userBlogsRoutes from "./user/blogs.js";

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

// User routes
router.use("/user/auth", userAuthRoutes);
router.use("/user/business", userBusinessRoutes);
router.use("/user/review", userReviewRoutes);
router.use("/user/blogs", userBlogsRoutes);

export default router;
