import { Router } from 'express';
import * as subCategoryController from '../../controllers/admin/subCategory.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';

const router = Router();

// SubCategory routes
router.post('/', authorizedAccessAdmin,  subCategoryController.createSubCategory);
router.get('/', authorizedAccessAdmin, subCategoryController.getAllSubCategories);
router.get('/category/:categoryId', authorizedAccessAdmin, subCategoryController.getSubCategoriesByCategory);
router.get('/:id', authorizedAccessAdmin, subCategoryController.getSubCategoryById);
router.put('/:id', authorizedAccessAdmin, subCategoryController.updateSubCategory);
router.delete('/:id', authorizedAccessAdmin, subCategoryController.deleteSubCategory);
router.patch('/bulk-status', authorizedAccessAdmin, subCategoryController.bulkUpdateStatus);
router.patch('/:id/status', authorizedAccessAdmin, subCategoryController.changeSubCategoryStatus);
export default router;
