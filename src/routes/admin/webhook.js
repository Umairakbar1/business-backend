import express from 'express';
import webhookController from '../../controllers/admin/webhook.controller.js';

const router = express.Router();

// Stripe webhook endpoint (no auth required for webhooks)
router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

export default router;
