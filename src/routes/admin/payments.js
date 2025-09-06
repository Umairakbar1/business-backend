import { Router } from 'express';
import * as paymentController from '../../controllers/admin/payment.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';

const router = Router();

// Payment routes
router.post('/generate-invoice', authorizedAccessAdmin, paymentController.generateInvoicePDF);

export default router;
