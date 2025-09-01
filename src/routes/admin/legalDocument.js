import express from 'express';
import { 
    createLegalDocument,
    getAllLegalDocuments,
    getLegalDocumentByType,
    getAllLegalDocumentsAdmin,
    updateLegalDocument,
    deleteLegalDocument
} from '../../controllers/admin/legalDocument.controller.js';
import { verifyAdminToken } from '../../middleware/authorization.js';
import { uploadLegalDocumentToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public endpoints - Get legal documents (no authentication required)
router.get('/', getAllLegalDocuments);
router.get('/type/:type', getLegalDocumentByType);

// Admin protected routes
router.use(verifyAdminToken);

// Create or update legal document
router.post('/', uploadLegalDocumentToCloudinary, handleCloudinaryUploadError, createLegalDocument);

// Get all legal documents (admin view)
router.get('/admin', getAllLegalDocumentsAdmin);

// Update legal document
router.put('/:id', uploadLegalDocumentToCloudinary, handleCloudinaryUploadError, updateLegalDocument);

// Delete legal document
router.delete('/:id', deleteLegalDocument);

export default router;
