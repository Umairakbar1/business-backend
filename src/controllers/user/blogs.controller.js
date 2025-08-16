import Blog from '../../models/admin/blog.js';
import LogCategory from '../../models/admin/logCategory.js';
import LogSubCategory from '../../models/admin/logSubCategory.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';

// Create a new blog post (for users/outsiders)
const createBlog = async (req, res) => {
    try {
        const { title, description, content, category, subCategory, status = 'draft', enableComments = true, tags, metaTitle, metaDescription, metaKeywords, authorName, authorEmail } = req.body;

        if (!title || !description || !content || !category) {
            return errorResponseHelper(res, { message: "Title, description, content, and category are required", code: '00400' });
        }

        // Use provided author name/email or fall back to user data
        const finalAuthorName = authorName || `${req.user.firstName} ${req.user.lastName}`.trim();
        const finalAuthorEmail = authorEmail || req.user.email;

        if (!finalAuthorName || !finalAuthorEmail) {
            return errorResponseHelper(res, { message: "Author name and email are required", code: '00400' });
        }

        const blogData = {
            title,
            description,
            content,
            category,
            subCategory,
            status,
            enableComments,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            metaTitle,
            metaDescription,
            metaKeywords: metaKeywords ? (Array.isArray(metaKeywords) ? metaKeywords : [metaKeywords]) : [],
            author: req.user.id,
            authorModel: 'User', // Always set to User for user routes
            authorName: finalAuthorName,
            authorEmail: finalAuthorEmail,
            publishedAt: status === 'published' ? new Date() : null
        };

        // Handle image upload to Cloudinary
        if (req.file) {
            try {
                console.log('Starting image upload for user blog:', {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype
                });
                
                const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/blogs');
                blogData.coverImage = {
                    url: uploadResult.original.url,
                    public_id: uploadResult.original.public_id
                };
                
                console.log('User blog image upload successful:', blogData.coverImage.public_id);
            } catch (uploadError) {
                console.error('Cloudinary upload error details for user blog:', {
                    message: uploadError.message,
                    stack: uploadError.stack,
                    fileName: req.file?.originalname,
                    fileSize: req.file?.size
                });
                
                // Provide more specific error message based on the error
                let errorMessage = 'Image upload failed';
                if (uploadError.message.includes('configuration')) {
                    errorMessage = 'Image upload service is not properly configured';
                } else if (uploadError.message.includes('Invalid file buffer')) {
                    errorMessage = 'Invalid image file provided';
                } else if (uploadError.message.includes('network') || uploadError.message.includes('timeout')) {
                    errorMessage = 'Image upload failed due to network issues';
                }
                
                return errorResponseHelper(res, {message: errorMessage, code:'00500'});
            }
        }

        const blog = await Blog.create(blogData);

        return successResponseHelper(res, { message: "Blog post created successfully", data: blog });
    } catch (error) {
        console.error('Create user blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get all blogs with filtering by category and search by title
const getAllBlogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            categoryId, 
            subCategoryId, 
            search,
            status = 'published' // Only show published blogs to users
        } = req.query;
        
        const query = { status: 'published' }; // Only published blogs
        
        // Filter by category ID
        if (categoryId) {
            query.category = categoryId;
        }
        
        // Filter by subcategory ID
        if (subCategoryId) {
            query.subCategory = subCategoryId;
        }
        
        // Search by blog title
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const blogs = await Blog.find(query)
            .populate('category', '_id title description')
            .populate('subCategory', '_id title description')
            .populate({
                path: 'author',
                select: 'firstName lastName email'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v'); // Exclude version key

        const total = await Blog.countDocuments(query);

        return successResponseHelper(res, {
            data:blogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getAllBlogs:', error);
        return errorResponseHelper(res, {
            message: 'Failed to retrieve blogs',
            code: 'BLOG_FETCH_ERROR'
        });
    }
};

// Get a single blog by ID
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Debug logging
        console.log('getBlogById - req.params:', req.params);
        console.log('getBlogById - id from params:', id);
        console.log('getBlogById - typeof id:', typeof id);
        console.log('getBlogById - id === "undefined":', id === "undefined");
        console.log('getBlogById - id === undefined:', id === undefined);
        
        const { 
            includeComments = 'true', 
            commentPage = 1, 
            commentLimit = 10, 
            commentSort = 'newest' 
        } = req.query; // Query parameters for comments

        if (!id) {
            console.log('getBlogById - ID is falsy, returning error');
            return errorResponseHelper(res, {
                message: 'Blog ID is required',
                code: 'BLOG_ID_REQUIRED'
            });
        }

        if (id === "undefined") {
            console.log('getBlogById - ID is literally "undefined" string, returning error');
            return errorResponseHelper(res, {
                message: 'Invalid blog ID: "undefined"',
                code: 'BLOG_ID_INVALID'
            });
        }

        console.log('getBlogById - Attempting to find blog with ID:', id);

        const blog = await Blog.findOne({ 
            _id: id, 
            status: 'published' 
        })
        .populate({
            path: 'author',
            select: 'firstName lastName email'
        })
        .select('-__v');

        if (!blog) {
            console.log('getBlogById - Blog not found with ID:', id);
            return errorResponseHelper(res, {
                message: 'Blog not found or not published',
                code: 'BLOG_NOT_FOUND'
            });
        }

        console.log('getBlogById - Blog found successfully:', blog._id);

        // Get comment count for the blog
        const Comment = (await import('../../models/user/comment.js')).default;
        const commentCount = await Comment.countDocuments({ 
            blogId: id, 
            status: 'active'
            // parentComment: null // Only count top-level comments - temporarily removed for debugging
        });

        // Add comment count to blog data
        let blogWithData = {
            ...blog.toObject(),
            commentCount
        };

        // Include comments if requested
        if (includeComments === 'true') {
            const Reply = (await import('../../models/user/reply.js')).default;
            
            console.log('Fetching comments for blog:', id);
            
            // First, let's check if there are any comments at all for this blog
            const totalCommentsInDB = await Comment.countDocuments({ blogId: id });
            console.log('Total comments in DB for this blog:', totalCommentsInDB);
            
            // Check all comments regardless of status
            const allComments = await Comment.find({ blogId: id }).select('_id status content');
            console.log('All comments in DB:', allComments.map(c => ({ id: c._id, status: c.status, content: c.content.substring(0, 30) })));
            
            // Build sort object for comments
            let sortObj = {};
            switch (commentSort) {
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

            const skip = (parseInt(commentPage) - 1) * parseInt(commentLimit);
            
            // Get top-level comments first (temporarily removing parentComment filter to debug)
            const comments = await Comment.find({ 
                blogId: id, 
                // status: 'active'
                // parentComment: null // Only top-level comments - temporarily removed for debugging
            })
            .populate('author', 'firstName lastName email')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(commentLimit))
            .select('-__v');

            console.log('Found comments:', comments.length);
            console.log('Comments:', comments.map(c => ({ 
                id: c._id, 
                content: c.content.substring(0, 50),
                parentComment: c.parentComment,
                status: c.status
            })));

            // Now fetch replies for each comment
            const commentsWithReplies = await Promise.all(
                comments.map(async (comment) => {
                    const commentObj = comment.toObject();
                    
                    // Find all replies for this comment
                    const replies = await Reply.find({
                        comment: comment._id,
                        // status: 'active'
                    })
                    .populate('author', 'firstName lastName email')
                    .sort({ createdAt: 1 })
                    .select('-__v');
                    
                    console.log(`Comment ${comment._id} has ${replies.length} replies`);
                    
                    // Also check for replies regardless of status
                    const allReplies = await Reply.find({ comment: comment._id }).select('_id status content');
                    console.log(`All replies for comment ${comment._id}:`, allReplies.map(r => ({ id: r._id, status: r.status, content: r.content.substring(0, 30) })));
                    
                    commentObj.replies = replies;
                    return commentObj;
                })
            );

            // Get total comment count for pagination
            const totalComments = await Comment.countDocuments({ 
                blogId: id, 
                // status: 'active'
                // parentComment: null // temporarily removed for debugging
            });

            blogWithData.comments = commentsWithReplies;
            blogWithData.commentPagination = {
                page: parseInt(commentPage),
                limit: parseInt(commentLimit),
                total: totalComments,
                pages: Math.ceil(totalComments / parseInt(commentLimit))
            };
        }

        return successResponseHelper(res, blogWithData);
    } catch (error) {
        console.error('Error in getBlogById:', error);
        return errorResponseHelper(res, {
            message: 'Failed to retrieve blog',
            code: 'BLOG_FETCH_ERROR'
        });
    }
};

// Get all log categories
const getAllCategories = async (req, res) => {
    try {
        const categories = await LogCategory.find({ status: 'active' })
            .select('name description image slug')
            .sort({ name: 1 });
        
        return successResponseHelper(res, categories);
    } catch (error) {
        console.error('Error in getAllCategories:', error);
        return errorResponseHelper(res, {
            message: 'Failed to retrieve categories',
            code: 'CATEGORY_FETCH_ERROR'
        });
    }
};

// Get log subcategories by category
const getSubCategoriesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        if (!categoryId) {
            return errorResponseHelper(res, {
                message: 'Category ID is required',
                code: 'CATEGORY_REQUIRED'
            });
        }

        // Check if category exists
        const category = await LogCategory.findById(categoryId);
        if (!category) {
            return errorResponseHelper(res, {
                message: 'Category not found',
                code: 'CATEGORY_NOT_FOUND'
            });
        }

        const subCategories = await LogSubCategory.find({ 
            categoryId, 
            status: 'active' 
        })
        .select('name description image slug')
        .sort({ name: 1 });
        
        return successResponseHelper(res, subCategories);
    } catch (error) {
        console.error('Error in getSubCategoriesByCategory:', error);
        return errorResponseHelper(res, {
            message: 'Failed to retrieve subcategories',
            code: 'SUBCATEGORY_FETCH_ERROR'
        });
    }
};



export {
    createBlog,
    getAllBlogs,
    getBlogById,
    getAllCategories,
    getSubCategoriesByCategory
};
