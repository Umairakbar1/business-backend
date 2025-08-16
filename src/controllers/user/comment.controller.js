import Comment from '../../models/user/comment.js';
import Reply from '../../models/user/reply.js';
import Blog from '../../models/admin/blog.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

// Create a new comment on a blog
const createComment = async (req, res) => {
    try {
        const { blogId, content, parentCommentId } = req.body;
        const userId = req.user.id;

        if (!blogId || !content) {
            return errorResponseHelper(res, { 
                message: "Blog ID and content are required", 
                code: '00400' 
            });
        }

        // Check if blog exists and comments are enabled
        const blog = await Blog.findById(blogId);
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

        if (blog.status !== 'published') {
            return errorResponseHelper(res, { 
                message: "Cannot comment on unpublished blog", 
                code: '00403' 
            });
        }

        // Check if parent comment exists (for nested comments)
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId);
            if (!parentComment || parentComment.blogId.toString() !== blogId) {
                return errorResponseHelper(res, { 
                    message: "Invalid parent comment", 
                    code: '00400' 
                });
            }
        }

        const commentData = {
            content: content.trim(),
            author: userId,
            authorName: `${req.user.firstName} ${req.user.lastName}`.trim(),
            authorEmail: req.user.email,
            blogId: blogId,
            parentComment: parentCommentId || null
        };

        const comment = await Comment.create(commentData);

        // Populate author information for response
        await comment.populate('author', 'firstName lastName email');

        return successResponseHelper(res, { 
            message: "Comment created successfully", 
            data: comment 
        });
    } catch (error) {
        console.error('Create comment error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

// Get comments for a blog
const getBlogComments = async (req, res) => {
    try {
        const { blogId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        if (!blogId) {
            return errorResponseHelper(res, { 
                message: "Blog ID is required", 
                code: '00400' 
            });
        }

        // Check if blog exists
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return errorResponseHelper(res, { 
                message: "Blog not found", 
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
            case 'mostReplied':
                sortObj = { replyCount: -1, createdAt: -1 };
                break;
            default: // newest
                sortObj = { createdAt: -1 };
        }

        const comments = await Comment.find({ 
            blogId: blogId, 
            status: 'active',
            parentComment: null // Only top-level comments
        })
        .populate('author', 'firstName lastName email')
        .populate({
            path: 'replies',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'firstName lastName email'
            },
            options: { sort: { createdAt: 1 } }
        })
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v');

        const total = await Comment.countDocuments({ 
            blogId: blogId, 
            status: 'active',
            parentComment: null 
        });

        return successResponseHelper(res, {
            data: comments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get blog comments error:', error);
        return errorResponseHelper(res, { 
            message: 'Failed to retrieve comments', 
            code: '00500' 
        });
    }
};

// Update a comment
const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim().length === 0) {
            return errorResponseHelper(res, { 
                message: "Comment content is required", 
                code: '00400' 
            });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return errorResponseHelper(res, { 
                message: "Comment not found", 
                code: '00404' 
            });
        }

        // Check if user owns the comment
        if (comment.author.toString() !== userId) {
            return errorResponseHelper(res, { 
                message: "You can only edit your own comments", 
                code: '00403' 
            });
        }

        // Check if comment is active
        if (comment.status !== 'active') {
            return errorResponseHelper(res, { 
                message: "Cannot edit inactive comment", 
                code: '00403' 
            });
        }

        comment.content = content.trim();
        comment.isEdited = true;
        comment.editedAt = new Date();

        await comment.save();

        return successResponseHelper(res, { 
            message: "Comment updated successfully", 
            data: comment 
        });
    } catch (error) {
        console.error('Update comment error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

// Delete a comment
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return errorResponseHelper(res, { 
                message: "Comment not found", 
                code: '00404' 
            });
        }

        // Check if user owns the comment
        if (comment.author.toString() !== userId) {
            return errorResponseHelper(res, { 
                message: "You can only delete your own comments", 
                code: '00403' 
            });
        }

        // Soft delete - mark as deleted instead of removing
        comment.status = 'deleted';
        await comment.save();

        return successResponseHelper(res, { 
            message: "Comment deleted successfully" 
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

// Like/Unlike a comment
const toggleCommentLike = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return errorResponseHelper(res, { 
                message: "Comment not found", 
                code: '00404' 
            });
        }

        if (comment.status !== 'active') {
            return errorResponseHelper(res, { 
                message: "Cannot interact with inactive comment", 
                code: '00403' 
            });
        }

        // For now, just increment likes (you can implement more sophisticated like system later)
        comment.likes += 1;
        await comment.save();

        return successResponseHelper(res, { 
            message: "Comment liked successfully", 
            data: { likes: comment.likes } 
        });
    } catch (error) {
        console.error('Toggle comment like error:', error);
        return errorResponseHelper(res, { 
            message: 'Internal server error', 
            code: '00500' 
        });
    }
};

export {
    createComment,
    getBlogComments,
    updateComment,
    deleteComment,
    toggleCommentLike
};
