import Comment from '../../models/user/comment.js';
import Reply from '../../models/user/reply.js';
import Blog from '../../models/admin/blog.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

// Helper function to get all comments with replies for a blog
const getCommentsWithReplies = async (blogId) => {
    try {
        const comments = await Comment.find({ 
            blogId: blogId, 
            status: 'active' 
        })
        .populate({
            path: 'replies',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name email'
            }
        })
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .select('-__v');

        return comments;
    } catch (error) {
        console.error('Error fetching comments with replies:', error);
        return [];
    }
};

// Create a new comment on a blog
const createComment = async (req, res) => {
    try {
        const { blogId, content, parentCommentId } = req.body;
        const userId = req.user._id; // Changed from req.user.id to req.user._id

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
            authorName: req.user.name, // Changed from template literal to direct access
            authorEmail: req.user.email, // Direct access to email
            blogId: blogId, 
            parentComment: parentCommentId || null
        };

        const comment = await Comment.create(commentData);

        // Populate author information for response
        await comment.populate('author', 'name email'); // Changed from firstName lastName to name

        // Get all comments with replies for the blog
        const allComments = await getCommentsWithReplies(blogId);

        return successResponseHelper(res, { 
            message: "Comment created successfully", 
            data: {
                comment: comment,
                comments: allComments
            }
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
        .populate('author', 'name email')
        .populate({
            path: 'replies',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name email'
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
        const userId = req.user._id;

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
        if (!comment.author.equals(userId)) {
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

        // Get all comments with replies for the blog
        const allComments = await getCommentsWithReplies(comment.blogId);

        return successResponseHelper(res, { 
            message: "Comment updated successfully", 
            data: {
                comment: comment,
                comments: allComments
            }
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
        const userId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return errorResponseHelper(res, { 
                message: "Comment not found", 
                code: '00404' 
            });
        }

        // Check if user owns the comment
        if (!comment.author.equals(userId)) {
            return errorResponseHelper(res, { 
                message: "You can only delete your own comments", 
                code: '00403' 
            });
        }

        // Hard delete - actually remove the comment from database
        await Comment.findByIdAndDelete(commentId);

        // Also delete all replies associated with this comment
        await Reply.deleteMany({ comment: commentId });

        // Get all comments with replies for the blog
        const allComments = await getCommentsWithReplies(comment.blogId);

        return successResponseHelper(res, { 
            message: "Comment deleted successfully",
            data: {
                comments: allComments
            }
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
        const userId = req.user._id;

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
