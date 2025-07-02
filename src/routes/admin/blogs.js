import { Router } from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  publishBlog,
  unpublishBlog,
  getBlogStats
} from "../../controllers/admin/blog.controller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { blogValidator, blogUpdateValidator } from "../../validators/admin.js";

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
router.post("/", authorizedAccessAdmin, validate(blogValidator), createBlog);
// Get all blogs
router.get("/", authorizedAccessAdmin, getAllBlogs);
// Get blog by ID
router.get("/:id", authorizedAccessAdmin, getBlogById);
// Update blog
router.put("/:id", authorizedAccessAdmin, validate(blogUpdateValidator), updateBlog);
// Delete blog
router.delete("/:id", authorizedAccessAdmin, deleteBlog);
// Publish blog
router.post("/:id/publish", authorizedAccessAdmin, publishBlog);
// Unpublish blog
router.post("/:id/unpublish", authorizedAccessAdmin, unpublishBlog);
// Blog stats
router.get("/stats/summary", authorizedAccessAdmin, getBlogStats);

export default router;

