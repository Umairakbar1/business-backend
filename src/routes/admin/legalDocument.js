import express from 'express';
import { 
    createOrUpdateLegalDocument,
    getLegalDocumentByType,
    getAllLegalDocuments,
    getLegalDocumentById,
    updateLegalDocument,
    deleteLegalDocument,
    toggleDocumentStatus,
    getAllActiveLegalDocuments,
    getDocumentHistory
} from '../../controllers/admin/legalDocument.controller.js';
import { verifyAdminToken } from '../../middleware/authorization.js';

const router = express.Router();

// Public endpoints (no authentication required)
router.get('/active', getAllActiveLegalDocuments);
router.get('/:type', getLegalDocumentByType);

// Admin protected routes
router.use(verifyAdminToken);

// Create or update legal document
router.post('/create-update', createOrUpdateLegalDocument);

// Get all legal documents
router.get('/', getAllLegalDocuments);

// Get legal document by ID
router.get('/id/:id', getLegalDocumentById);

// Update legal document
router.put('/:id', updateLegalDocument);

// Delete legal document
router.delete('/:id', deleteLegalDocument);

// Toggle document status
router.patch('/:id/toggle-status', toggleDocumentStatus);

// Get document history
router.get('/history/:type', getDocumentHistory);

export default router;
