import { Router } from 'express';
import * as categoryController from '../../controllers/admin/category.conroller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import { uploadSingleImage, handleUploadError } from '../../middleware/fileUpload.js';

const router = Router();

// Category routes
router.post('/', authorizedAccessAdmin, uploadSingleImage, handleUploadError, categoryController.createCategory);
router.get('/', authorizedAccessAdmin, categoryController.getAllCategories);
router.get('/:id', authorizedAccessAdmin, categoryController.getCategoryById);
router.put('/:id', authorizedAccessAdmin, uploadSingleImage, handleUploadError, categoryController.updateCategory);
router.delete('/:id', authorizedAccessAdmin, categoryController.deleteCategory);

export default router;
