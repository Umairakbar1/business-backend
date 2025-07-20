import express from 'express';
import { authorizedAccessAdmin as  authorization, authorizedAccessAdmin } from '../../middleware/authorization.js';
import {
    createMetadata,
    getAllMetadata,
    getMetadataById,
    getMetadataByUrl,
    updateMetadata,
    deleteMetadata,
    bulkUpdateStatus,
    getMetadataStats
} from '../../controllers/admin/metadata.controller.js';

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorizedAccessAdmin);

// Create metadata
router.post('/', createMetadata);

// Get all metadata with pagination and search
router.get('/', getAllMetadata);

// Get metadata statistics
router.get('/stats', getMetadataStats);

// Get metadata by ID
router.get('/:id', getMetadataById);

// Get metadata by URL (for user-side pages)
router.get('/url/:url', getMetadataByUrl);

// Update metadata
router.put('/:id', updateMetadata);

// Delete metadata
router.delete('/:id', deleteMetadata);

// Bulk update status
router.patch('/bulk-status', bulkUpdateStatus);

export default router; 