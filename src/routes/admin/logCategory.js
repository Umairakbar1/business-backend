import { Router } from 'express';
import * as logCategoryController from '../../controllers/admin/logCategory.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

// Log Category routes
router.post('/', authorizedAccessAdmin, uploadSingleImageToCloudinary, handleCloudinaryUploadError, logCategoryController.createLogCategory);
router.get('/', authorizedAccessAdmin, logCategoryController.getAllLogCategories);
router.get('/hierarchy', authorizedAccessAdmin, logCategoryController.getLogCategoryHierarchy);
router.get('/:id', authorizedAccessAdmin, logCategoryController.getLogCategoryById);
router.put('/:id', authorizedAccessAdmin, uploadSingleImageToCloudinary, handleCloudinaryUploadError, logCategoryController.updateLogCategory);
router.delete('/:id', authorizedAccessAdmin, logCategoryController.deleteLogCategory);
router.patch('/bulk-status', authorizedAccessAdmin, logCategoryController.bulkUpdateLogCategoryStatus);
router.patch('/:id/status', authorizedAccessAdmin, logCategoryController.changeLogCategoryStatus);
export default router; 