import Reply from '../../models/user/reply.js';
import Comment from '../../models/user/comment.js';
import Blog from '../../models/admin/blog.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

// Create a new reply to a comment
const createReply = async (req, res) => {
    try {
        const { commentId, content, parentReplyId } = req.body;
        const userId = req.user.id;

        if (!commentId || !content) {
            return errorResponseHelper(res, { 
                message: "Comment ID and content are required", 
                code: '00400' 
            });
        }

        // Check if comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return errorResponseHelper(res, { 
                message: "Comment not found", 
                code: '00404' 
            });
        }

        // Check if comment is active
        if (comment.status !== 'active') {
            return errorResponseHelper(res, { 
                message: "Cannot reply to inactive comment", 
                code: '00403' 
            });
        }

        // Check if blog exists and comments are enabled
        const blog = await Blog.findById(comment.blogId);
        if (!blog) {
            return errorResponseHelper(res, { 
                message: "Blog not found", 
                code: '00404' 
            });
        }

        if (!blog.enableComments) {
            return errorResponseHelper(res, { 
                message: "Comments are disabled for this blog", 
                code: '00403' 
            });
        }

        // Check if parent reply exists (for nested replies)
        if (parentReplyId) {
            const parentReply = await Reply.findById(parentReplyId);
            if (!parentReply || parentReply.comment.toString() !== commentId) {
                return errorResponseHelper(res, { 
                    message: "Invalid parent reply", 
                    code: '00400' 
                });
            }
        }

        const replyData = {
            content: content.trim(),
            author: userId,
            authorName: `${req.user.firstName} ${req.user.lastName}`.trim(),
            authorEmail: req.user.email,
            comment: commentId,
            blogId: comment.blogId,
            parentReply: parentReplyId || null
        };

        const reply = await Reply.create(replyData);

        // Update comment reply count
        comment.replyCount += 1;
        comment.replies.push(reply._id);
        await comment.save();

        // Populate author information for response
        await reply.populate('author', 'firstName lastName email');

        return successResponseHelper(res, { 
            message: "Reply created successfully", 
            data: reply 
        });
    } catch (error) {
        console.error('Create reply error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

// Get replies for a comment
const getCommentReplies = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        if (!commentId) {
            return errorResponseHelper(res, { 
                message: "Comment ID is required", 
                code: '00400' 
            });
        }

        // Check if comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return errorResponseHelper(res, { 
                message: "Comment not found", 
                code: '00404' 
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build sort object
        let sortObj = {};
        switch (sort) {
            case 'oldest':
                sortObj = { createdAt: 1 };
                break;
            case 'mostLiked':
                sortObj = { likes: -1, createdAt: -1 };
                break;
            default: // newest
                sortObj = { createdAt: -1 };
        }

        const replies = await Reply.find({ 
            comment: commentId, 
            status: 'active',
            parentReply: null // Only top-level replies
        })
        .populate('author', 'firstName lastName email')
        .populate({
            path: 'parentReply',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'firstName lastName email'
            }
        })
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v');

        const total = await Reply.countDocuments({ 
            comment: commentId, 
            status: 'active',
            parentReply: null 
        });

        return successResponseHelper(res, {
            data: replies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get comment replies error:', error);
        return errorResponseHelper(res, { 
            message: 'Failed to retrieve replies', 
            code: '00500' 
        });
    }
};

// Update a reply
const updateReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim().length === 0) {
            return errorResponseHelper(res, { 
                message: "Reply content is required", 
                code: '00400' 
            });
        }

        const reply = await Reply.findById(replyId);
        if (!reply) {
            return errorResponseHelper(res, { 
                message: "Reply not found", 
                code: '00404' 
            });
        }

        // Check if user owns the reply
        if (reply.author.toString() !== userId) {
            return errorResponseHelper(res, { 
                message: "You can only edit your own replies", 
                code: '00403' 
            });
        }

        // Check if reply is active
        if (reply.status !== 'active') {
            return errorResponseHelper(res, { 
                message: "Cannot edit inactive reply", 
                code: '00403' 
            });
        }

        reply.content = content.trim();
        reply.isEdited = true;
        reply.editedAt = new Date();

        await reply.save();

        return successResponseHelper(res, { 
            message: "Reply updated successfully", 
            data: reply 
        });
    } catch (error) {
        console.error('Update reply error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

// Delete a reply
const deleteReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const userId = req.user.id;

        const reply = await Reply.findById(replyId);
        if (!reply) {
            return errorResponseHelper(res, { 
                message: "Reply not found", 
                code: '00404' 
            });
        }

        // Check if user owns the reply
        if (reply.author.toString() !== userId) {
            return errorResponseHelper(res, { 
                message: "You can only delete your own replies", 
                code: '00403' 
            });
        }

        // Soft delete - mark as deleted instead of removing
        reply.status = 'deleted';
        await reply.save();

        // Update comment reply count
        const comment = await Comment.findById(reply.comment);
        if (comment) {
            comment.replyCount = Math.max(0, comment.replyCount - 1);
            await comment.save();
        }

        return successResponseHelper(res, { 
            message: "Reply deleted successfully" 
        });
    } catch (error) {
        console.error('Delete reply error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

// Like/Unlike a reply
const toggleReplyLike = async (req, res) => {
    try {
        const { replyId } = req.params;
        const userId = req.user.id;

        const reply = await Reply.findById(replyId);
        if (!reply) {
            return errorResponseHelper(res, { 
                message: "Reply not found", 
                code: '00404' 
            });
        }

        if (reply.status !== 'active') {
            return errorResponseHelper(res, { 
                message: "Cannot interact with inactive reply", 
                code: '00403' 
            });
        }

        // For now, just increment likes (you can implement more sophisticated like system later)
        reply.likes += 1;
        await reply.save();

        return successResponseHelper(res, { 
            message: "Reply liked successfully", 
            data: { likes: reply.likes } 
        });
    } catch (error) {
        console.error('Toggle reply like error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

export {
    createReply,
    getCommentReplies,
    updateReply,
    deleteReply,
    toggleReplyLike
};
