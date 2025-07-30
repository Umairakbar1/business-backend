import { Router } from 'express';
import * as categoryController from '../../controllers/business/category.controller.js';

const router = Router();

// Public category routes (no authentication required)
router.get('/', categoryController.getAllCategories);
router.get('/hierarchy', categoryController.getCategoriesHierarchy);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/with-subcategories', categoryController.getCategoryWithSubcategories);

// Public subcategory routes (no authentication required)
router.get('/subcategories', categoryController.getAllSubcategories);
router.get('/subcategories/:id', categoryController.getSubcategoryById);
router.get('/:categoryId/subcategories', categoryController.getSubcategoriesByCategory);

export default router; 