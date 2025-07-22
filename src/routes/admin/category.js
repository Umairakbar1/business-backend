import { Router } from 'express';
import * as categoryController from '../../controllers/admin/category.conroller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

// Category routes
router.post('/', authorizedAccessAdmin, uploadSingleImageToCloudinary, handleCloudinaryUploadError, categoryController.createCategory);
router.get('/', authorizedAccessAdmin, categoryController.getAllCategories);
router.get('/:id', authorizedAccessAdmin, categoryController.getCategoryById);
router.put('/:id', authorizedAccessAdmin, uploadSingleImageToCloudinary, handleCloudinaryUploadError, categoryController.updateCategory);
router.delete('/:id', authorizedAccessAdmin, categoryController.deleteCategory);
router.patch('/bulk-status', authorizedAccessAdmin, categoryController.bulkUpdateStatus);

export default router;
