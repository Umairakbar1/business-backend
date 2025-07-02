import { Router } from "express";
import adminAuthRoutes from "./admin/auth.js";
import adminBusinessRoutes from "./admin/business.js";
import adminSubscriptionPlansRoutes from "./admin/subscriptionPlans.js";
import adminUsersRoutes from "./admin/users.js";
import adminBlogsRoutes from "./admin/blogs.js";
import adminCategoryRoutes from "./admin/category.js";
import adminSubCategoryRoutes from "./admin/subCategory.js";

const router = Router();

router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/business", adminBusinessRoutes);
router.use("/admin/subscription-plans", adminSubscriptionPlansRoutes);
router.use("/admin/users", adminUsersRoutes);
router.use("/admin/blogs", adminBlogsRoutes);
router.use("/admin/category", adminCategoryRoutes);
router.use("/admin/subcategory", adminSubCategoryRoutes);
export default router;
