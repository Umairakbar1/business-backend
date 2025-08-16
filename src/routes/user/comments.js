import express from 'express';
import {
    createComment,
    getBlogComments,
    updateComment,
    deleteComment,
    toggleCommentLike
} from '../../controllers/user/comment.controller.js';
import { authorizedAccessUser } from '../../middleware/authorization.js';
import { commentValidator, commentUpdateValidator } from '../../validators/user.js';

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

// Create a new comment on a blog
router.post('/', authorizedAccessUser, validate(commentValidator), createComment);

// Get comments for a specific blog
router.get('/blog/:blogId', getBlogComments);

// Update a comment
router.put('/:commentId', authorizedAccessUser, validate(commentUpdateValidator), updateComment);

// Delete a comment
router.delete('/:commentId', authorizedAccessUser, deleteComment);

// Like/Unlike a comment
router.post('/:commentId/like', authorizedAccessUser, toggleCommentLike);

export default router;
