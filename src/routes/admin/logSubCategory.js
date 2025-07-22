import { Router } from 'express';
import * as logSubCategoryController from '../../controllers/admin/logSubCategory.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = Router();

// Log SubCategory routes
router.post('/', authorizedAccessAdmin, uploadSingleImageToCloudinary, handleCloudinaryUploadError, logSubCategoryController.createLogSubCategory);
router.get('/', authorizedAccessAdmin, logSubCategoryController.getAllLogSubCategories);
router.get('/category/:categoryId', authorizedAccessAdmin, logSubCategoryController.getLogSubCategoriesByCategory);
router.get('/:id', authorizedAccessAdmin, logSubCategoryController.getLogSubCategoryById);
router.put('/:id', authorizedAccessAdmin, uploadSingleImageToCloudinary, handleCloudinaryUploadError, logSubCategoryController.updateLogSubCategory);
router.delete('/:id', authorizedAccessAdmin, logSubCategoryController.deleteLogSubCategory);
router.patch('/bulk-status', authorizedAccessAdmin, logSubCategoryController.bulkUpdateLogSubCategoryStatus);

export default router; 