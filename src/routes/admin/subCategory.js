import { Router } from 'express';
import * as subCategoryController from '../../controllers/admin/subCategory.controller.js';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';

const router = Router();

// SubCategory routes
router.post('/:categoryId/subcategories', authorizedAccessAdmin, subCategoryController.createSubCategory);
router.get('/:categoryId/subcategories', authorizedAccessAdmin, subCategoryController.getSubCategoriesByCategory);
router.get('/subcategories/:id', authorizedAccessAdmin, subCategoryController.getSubCategoryById);
router.put('/subcategories/:id', authorizedAccessAdmin, subCategoryController.updateSubCategory);
router.delete('/subcategories/:id', authorizedAccessAdmin, subCategoryController.deleteSubCategory);

export default router;
