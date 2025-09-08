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
        } = req.query;
        
        // Import Comment model for aggregation
        const Comment = (await import('../../models/user/comment.js')).default;
        
        // Clean and validate parameters
        const cleanCategoryId = categoryId && categoryId !== 'null' && categoryId !== 'undefined' ? categoryId : null;
        const cleanSubCategoryId = subCategoryId && subCategoryId !== 'null' && subCategoryId !== 'undefined' ? subCategoryId : null;
        const cleanSearch = search && search !== 'null' && search !== 'undefined' && search.trim() !== '' ? search.trim() : null;
        
        // If categoryId is provided and valid, return paginated blogs for that specific category
        if (cleanCategoryId) {
            console.log('CategoryId provided:', cleanCategoryId);
            
            const query = { 
                status: 'published',
                category: cleanCategoryId
            };
            
            // Filter by subcategory ID
            if (cleanSubCategoryId) {
                query.subCategory = cleanSubCategoryId;
            }
            
            // Search by blog title
            if (cleanSearch) {
                query.title = { $regex: cleanSearch, $options: 'i' };
            }

            console.log('Query for category blogs:', JSON.stringify(query, null, 2));

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            // Get category information
            const LogCategory = (await import('../../models/admin/logCategory.js')).default;
            const category = await LogCategory.findById(cleanCategoryId);
            
            console.log('Found category:', category ? category.title : 'NOT FOUND');
            
            if (!category) {
                return errorResponseHelper(res, {
                    message: 'Category not found',
                    code: 'CATEGORY_NOT_FOUND'
                });
            }

            // First, let's check if there are any blogs for this category at all
            const totalBlogsInCategory = await Blog.countDocuments(query);
            console.log('Total blogs in category:', totalBlogsInCategory);

            // First, let's try a simple query to see if blogs exist
            const simpleBlogs = await Blog.find(query)
                .populate('category', '_id title description')
                .populate('subCategory', '_id title description')
                .populate({
                    path: 'author',
                    select: 'name email'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('-__v');

            console.log('Simple query result count:', simpleBlogs.length);
            console.log('Simple query blogs:', simpleBlogs.map(b => ({ id: b._id, title: b.title })));

            // Get blogs with comment counts for this specific category
            const blogsWithCommentCounts = await Blog.aggregate([
                { $match: query },
                { $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'blogId',
                    as: 'comments',
                    pipeline: [
                        { $match: { status: 'active' } }
                    ]
                }},
                { $addFields: {
                    commentCount: { $size: '$comments' }
                }},
                { $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo',
                    pipeline: [
                        { $project: { name: 1, email: 1 } }
                    ]
                }},
                { $lookup: {
                    from: 'logsubcategories',
                    localField: 'subCategory',
                    foreignField: '_id',
                    as: 'subCategoryInfo',
                    pipeline: [
                        { $project: { _id: 1, title: 1, description: 1 } }
                    ]
                }},
                { $addFields: {
                    author: { $arrayElemAt: ['$authorInfo', 0] },
                    subCategory: { $arrayElemAt: ['$subCategoryInfo', 0] }
                }},
                { $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    content: 1,
                    coverImage: 1,
                    author: 1,
                    authorName: 1,
                    authorEmail: 1,
                    subCategory: 1,
                    tags: 1,
                    publishedAt: 1,
                    views: 1,
                    likes: 1,
                    shares: 1,
                    commentCount: 1,
                    createdAt: 1,
                    updatedAt: 1
                }},
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: parseInt(limit) }
            ]);

            console.log('Aggregation result count:', blogsWithCommentCounts.length);
            console.log('First few blogs:', blogsWithCommentCounts.slice(0, 2));

            const total = await Blog.countDocuments(query);
            console.log('Total count for pagination:', total);

            // Return in the same structure as without categoryId
            // Temporarily use simple query result to test
            const blogsToReturn = simpleBlogs.length > 0 ? simpleBlogs : blogsWithCommentCounts;
            
            return successResponseHelper(res, {
                data: [{
                    category: {
                        _id: category._id,
                        title: category.title,
                        description: category.description,
                        image: category.image
                    },
                    blogs: blogsToReturn
                }],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        }
        
        // If no categoryId provided, return blogs grouped by category with max 4 most commented blogs per category
        const baseQuery = { status: 'published' };
        
        console.log('No categoryId - getting all categories');
        
        // Apply search filter if provided
        if (cleanSearch) {
            baseQuery.title = { $regex: cleanSearch, $options: 'i' };
        }
        
        // Apply subcategory filter if provided
        if (cleanSubCategoryId) {
            baseQuery.subCategory = cleanSubCategoryId;
        }

        console.log('Base query for all categories:', JSON.stringify(baseQuery, null, 2));

        // Get all categories that have blogs
        const categoriesWithBlogs = await Blog.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$category' } },
            { $lookup: {
                from: 'logcategories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryInfo'
            }},
            { $unwind: '$categoryInfo' },
            { $match: { 'categoryInfo.status': 'active' } },
            { $project: {
                _id: 1,
                title: '$categoryInfo.title',
                description: '$categoryInfo.description',
                image: '$categoryInfo.image'
            }}
        ]);

        // For each category, get the top 4 most commented blogs
        const categoriesWithBlogsData = await Promise.all(
            categoriesWithBlogs.map(async (category) => {
                // Get comment counts for blogs in this category
                const blogsWithCommentCounts = await Blog.aggregate([
                    { $match: { ...baseQuery, category: category._id } },
                    { $lookup: {
                        from: 'comments',
                        localField: '_id',
                        foreignField: 'blogId',
                        as: 'comments',
                        pipeline: [
                            { $match: { status: 'active' } }
                        ]
                    }},
                    { $addFields: {
                        commentCount: { $size: '$comments' }
                    }},
                    { $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorInfo',
                        pipeline: [
                            { $project: { name: 1, email: 1 } }
                        ]
                    }},
                    { $lookup: {
                        from: 'logsubcategories',
                        localField: 'subCategory',
                        foreignField: '_id',
                        as: 'subCategoryInfo',
                        pipeline: [
                            { $project: { _id: 1, title: 1, description: 1 } }
                        ]
                    }},
                    { $addFields: {
                        author: { $arrayElemAt: ['$authorInfo', 0] },
                        subCategory: { $arrayElemAt: ['$subCategoryInfo', 0] }
                    }},
                    { $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        content: 1,
                        coverImage: 1,
                        author: 1,
                        authorName: 1,
                        authorEmail: 1,
                        subCategory: 1,
                        tags: 1,
                        publishedAt: 1,
                        views: 1,
                        likes: 1,
                        shares: 1,
                        commentCount: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }},
                    { $sort: { commentCount: -1, createdAt: -1 } },
                    { $limit: 4 }
                ]);

                return {
                    category: {
                        _id: category._id,
                        title: category.title,
                        description: category.description,
                        image: category.image
                    },
                    blogs: blogsWithCommentCounts
                };
            })
        );

        // Filter out categories that have no blogs (shouldn't happen but just in case)
        const filteredCategories = categoriesWithBlogsData.filter(cat => cat.blogs.length > 0);

        return successResponseHelper(res, {
            data: filteredCategories
        });
    } catch (error) {
        console.error('Error in getAllBlogs:', error);
        return errorResponseHelper(res, {
            message: 'Failed to retrieve blogs',
            code: 'BLOG_FETCH_ERROR'
        });
    }
};

// Get recent articles (4 most recent blogs across all categories)
const getRecentArticles = async (req, res) => {
    try {
        const { 
            subCategoryId, 
            search,
            limit = 4
        } = req.query;
        
        // Clean and validate parameters
        const cleanSubCategoryId = subCategoryId && subCategoryId !== 'null' && subCategoryId !== 'undefined' ? subCategoryId : null;
        const cleanSearch = search && search !== 'null' && search !== 'undefined' && search.trim() !== '' ? search.trim() : null;
        
        const baseQuery = { status: 'published' };
        
        // Apply search filter if provided
        if (cleanSearch) {
            baseQuery.title = { $regex: cleanSearch, $options: 'i' };
        }
        
        // Apply subcategory filter if provided
        if (cleanSubCategoryId) {
            baseQuery.subCategory = cleanSubCategoryId;
        }

        // Get recent articles (most recent blogs across all categories)
        const recentArticles = await Blog.find(baseQuery)
            .populate('category', '_id title description')
            .populate('subCategory', '_id title description')
            .populate({
                path: 'author',
                select: 'name email'
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .select('-__v');

        return successResponseHelper(res, {
            data: recentArticles
        });
    } catch (error) {
        console.error('Error in getRecentArticles:', error);
        return errorResponseHelper(res, {
            message: 'Failed to retrieve recent articles',
            code: 'RECENT_ARTICLES_FETCH_ERROR'
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
            select: 'name email' // Fixed: changed from firstName lastName to name for User model
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
            .populate('author', 'name email') // Fixed: changed from firstName lastName to name for User model
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
                    .populate('author', 'name email') // Fixed: changed from firstName lastName to name for User model
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
    getRecentArticles,
    getBlogById,
    getAllCategories,
    getSubCategoriesByCategory
};
