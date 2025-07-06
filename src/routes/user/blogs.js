import express from 'express';
import {
    getAllBlogs,
    getBlogById,
    getAllCategories,
    getSubCategoriesByCategory
} from '../../controllers/user/blogs.controller.js';

const router = express.Router();

// Get all blogs with filtering and pagination
// Query parameters: page, limit, category, subCategory, search
router.get('/', getAllBlogs);

// Get a single blog by ID
router.get('/:id', getBlogById);

// Get all categories
router.get('/categories/all', getAllCategories);

// Get subcategories by category
router.get('/categories/:categoryId/subcategories', getSubCategoriesByCategory);

export default router;
