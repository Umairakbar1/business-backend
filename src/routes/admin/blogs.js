import { Router } from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
  getBlogStats,
  bulkUpdateBlogStatus
} from "../../controllers/admin/blog.controller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { blogValidator, blogUpdateValidator } from "../../validators/admin.js";
import { uploadBlogCoverImageToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";

const router = Router();

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

// Create a new blog post
router.post("/", authorizedAccessAdmin, uploadBlogCoverImageToCloudinary, handleCloudinaryUploadError, validate(blogValidator), createBlog);
// Get all blogs
router.get("/", authorizedAccessAdmin, getAllBlogs);
// Get blog by ID
router.get("/:id", authorizedAccessAdmin, getBlogById);
// Update blog
router.put("/:id", authorizedAccessAdmin, uploadBlogCoverImageToCloudinary, handleCloudinaryUploadError, validate(blogUpdateValidator), updateBlog);
// Delete blog
router.delete("/:id", authorizedAccessAdmin, deleteBlog);
// Toggle blog publish status
router.post("/:id/toggle-status", authorizedAccessAdmin, toggleBlogStatus);
// Blog stats
router.get("/stats/summary", authorizedAccessAdmin, getBlogStats);
// Bulk update blog status
router.patch("/bulk-status", authorizedAccessAdmin, bulkUpdateBlogStatus);

export default router;

