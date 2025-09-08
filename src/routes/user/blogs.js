import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getRecentArticles,
    getBlogById,
    getAllCategories,
    getSubCategoriesByCategory
} from '../../controllers/user/blogs.controller.js';
import { authorizedAccessUser } from '../../middleware/authorization.js';
import { blogValidator } from '../../validators/admin.js';
import { uploadBlogCoverImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = express.Router();

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
}

// Create a new blog post (for users/outsiders)
router.post('/', authorizedAccessUser, uploadBlogCoverImageToCloudinary, handleCloudinaryUploadError, validate(blogValidator), createBlog);

// Get all blogs with filtering and pagination
// Query parameters: page, limit, category, subCategory, search
router.get('/', getAllBlogs);

// Get recent articles
// Query parameters: limit, subCategory, search
router.get('/recent', getRecentArticles);

// Get all categories
router.get('/categories/all', getAllCategories);

// Get subcategories by category
router.get('/categories/:categoryId/subcategories', getSubCategoriesByCategory);

// Get a single blog by ID (must be last to avoid conflicts with other routes)
router.get('/:id', getBlogById);

export default router;
