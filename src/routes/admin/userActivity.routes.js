import express from 'express';
import {
  getAllUsersWithActivity,
  getUserActivityDetails,
  getAdminActivityDashboard,
  getUserActivityAnalytics,
  searchUserActivities
} from '../../controllers/admin/userActivity.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(authorizedAccessAdmin);

// Get all users with their activity data
router.get('/users', getAllUsersWithActivity);

// Get specific user's activity details
router.get('/users/:userId/activity', getUserActivityDetails);

// Get user activity analytics
router.get('/users/:userId/analytics', getUserActivityAnalytics);

// Get admin dashboard activity data
router.get('/dashboard', getAdminActivityDashboard);

// Search user activities
router.get('/activities/search', searchUserActivities);

export default router;
