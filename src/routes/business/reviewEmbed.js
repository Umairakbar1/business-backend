import { Router } from 'express';
import {
  generateReviewEmbedLink,
  regenerateReviewEmbedToken
} from '../../controllers/business/reviewEmbed.controller.js';
import { verifyBusinessOwnerToken } from '../../middleware/authorization.js';

const router = Router();

// Protected routes (require business owner authentication)
router.post('/generate', verifyBusinessOwnerToken, generateReviewEmbedLink);
router.post('/regenerate-token', verifyBusinessOwnerToken, regenerateReviewEmbedToken);

export default router; 