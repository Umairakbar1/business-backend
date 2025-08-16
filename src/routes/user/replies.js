import express from 'express';
import {
    createReply,
    getCommentReplies,
    updateReply,
    deleteReply,
    toggleReplyLike
} from '../../controllers/user/reply.controller.js';
import { authorizedAccessUser } from '../../middleware/authorization.js';
import { replyValidator, replyUpdateValidator } from '../../validators/user.js';

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

// Create a new reply to a comment
router.post('/', authorizedAccessUser, validate(replyValidator), createReply);

// Get replies for a specific comment
router.get('/comment/:commentId', getCommentReplies);

// Update a reply
router.put('/:replyId', authorizedAccessUser, validate(replyUpdateValidator), updateReply);

// Delete a reply
router.delete('/:replyId', authorizedAccessUser, deleteReply);

// Like/Unlike a reply
router.post('/:replyId/like', authorizedAccessUser, toggleReplyLike);

export default router;
