import express from 'express';
import { 
  getBoostStats, 
  getBoostPerformanceByCategory, 
  getBoostTrends 
} from '../../controllers/admin/boostStats.controller.js';
import { verifyAdminToken } from '../../middleware/authorization.js';

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminToken);

// Get comprehensive boost statistics
router.get('/', getBoostStats);

// Get boost performance by category
router.get('/category/:categoryId', getBoostPerformanceByCategory);

// Get boost trends over time
router.get('/trends', getBoostTrends);

export default router;
