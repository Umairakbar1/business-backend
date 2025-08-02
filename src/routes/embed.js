import { Router } from 'express';
import {
  getEmbedReviews,
  serveReviewWidget
} from '../controllers/business/reviewEmbed.controller.js';

const router = Router();

// Public routes (no authentication required) - Review embeds only
router.get('/reviews/:businessId/:embedToken', getEmbedReviews);
router.get('/reviews/:businessId/:embedToken/widget.js', serveReviewWidget);

export default router; 