import { Router } from "express";
import adminAuthRoutes from "./admin/auth.js";
import adminBusinessRoutes from "./admin/business.js";
import adminUsersRoutes from "./admin/users.js";
import adminBlogsRoutes from "./admin/blogs.js";
import adminLogCategoryRoutes from "./admin/logCategory.js";
import adminCategoryRoutes from "./admin/category.js";
import adminSubCategoryRoutes from "./admin/subCategory.js";
import adminLogSubCategoryRoutes from "./admin/logSubCategory.js";
import adminReviewsRoutes from "./admin/reviews.js";
import adminQueryTicketsRoutes from "./admin/queryTickets.js";
import adminMetadataRoutes from "./admin/metadata.js";
import adminMediaRoutes from "./admin/media.js";
import adminPaymentPlanRoutes from "./admin/paymentPlan.js";
import adminSubscriptionRoutes from "./admin/subscription.js";
import adminWebhookRoutes from "./admin/webhook.js";
import adminDashboardRoutes from "./admin/dashboard.js";
import adminBoostQueueRoutes from "./admin/boostQueue.js";
import adminBoostExpiryRoutes from "./admin/boostExpiry.js";
import adminNotificationRoutes from "./admin/notification.js";
import businessAuthRoutes from "./business/auth.js";
import businessBusinessRoutes from "./business/business.js";
import businessReviewsRoutes from "./business/reviews.js";
import businessQueryTicketsRoutes from "./business/queryTickets.js";
import businessOwnerRoutes from "./business/owner.js";
import businessCategoryRoutes from "./business/category.js";
import businessReviewEmbedRoutes from "./business/reviewEmbed.js";
import businessSubscriptionRoutes from "./business/subscription.js";
import businessNotificationRoutes from "./business/notification.js";
import embedRoutes from "./embed.js";
import userAuthRoutes from "./user/auth.js";
import userBusinessRoutes from "./user/buisness.js";
import userReviewRoutes from "./user/review.js";
import userBlogsRoutes from "./user/blogs.js";
import userCommentsRoutes from "./user/comments.js";
import userRepliesRoutes from "./user/replies.js";
import mediaRoutes from "./media.js";
import { getMetadataByUrl } from "../controllers/admin/metadata.controller.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "Backend server is running", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Admin routes
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/business", adminBusinessRoutes);
router.use("/admin/users", adminUsersRoutes);
router.use("/admin/blogs", adminBlogsRoutes);
router.use("/admin/log-category", adminLogCategoryRoutes);
router.use("/admin/category", adminCategoryRoutes);
router.use("/admin/subcategory", adminSubCategoryRoutes);
router.use("/admin/log-subcategory", adminLogSubCategoryRoutes);
router.use("/admin/reviews", adminReviewsRoutes);
router.use("/admin/query-tickets", adminQueryTicketsRoutes);
router.use("/admin/metadata", adminMetadataRoutes);
router.use("/admin/media", adminMediaRoutes);
router.use("/admin/payment-plans", adminPaymentPlanRoutes);
router.use("/admin/subscriptions", adminSubscriptionRoutes);
router.use("/admin/webhooks", adminWebhookRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/admin/boost-queue", adminBoostQueueRoutes);
router.use("/admin/boost-expiry", adminBoostExpiryRoutes);
router.use("/admin/notifications", adminNotificationRoutes);

// Business routes
router.use("/business/auth", businessAuthRoutes);
router.use("/business/reviews", businessReviewsRoutes);
router.use("/business/query-tickets", businessQueryTicketsRoutes);
router.use("/business/businesses", businessBusinessRoutes);
router.use("/business/owner", businessOwnerRoutes);
router.use("/business/categories", businessCategoryRoutes);
router.use("/business/review-embed", businessReviewEmbedRoutes);
router.use("/business/subscriptions", businessSubscriptionRoutes);
router.use("/business/notifications", businessNotificationRoutes);

// Public embed routes (no authentication required) - Review embeds only
router.use("/embed", embedRoutes);

// User routes
router.use("/user/auth", userAuthRoutes);
router.use("/user/business", userBusinessRoutes);
router.use("/user/review", userReviewRoutes);
router.use("/user/blogs", userBlogsRoutes);
router.use("/user/comments", userCommentsRoutes);
router.use("/user/replies", userRepliesRoutes);

// Media routes
router.use("/media", mediaRoutes);

// Public metadata route for user-side pages
router.get("/metadata/:url", getMetadataByUrl);

export default router;
