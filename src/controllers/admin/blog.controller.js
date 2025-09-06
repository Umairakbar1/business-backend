import Blog from '../../models/admin/blog.js';
import Media from '../../models/admin/media.js';
import { errorResponseHelper, successResponseHelper, generateSlug } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';

// Create a new blog post
const createBlog = async (req, res) => {
    try {
        console.log('=== CREATE BLOG REQUEST ===');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        console.log('User:', req.user);
        
        const { title, author,description, content, category, subCategory, status = 'draft', enableComments = true, tags, metaTitle, metaDescription, metaKeywords, authorName, authorEmail, authorDescription, authorModel = 'Admin' } = req.body;

        if (!title || !description || !content || !category) {
            return errorResponseHelper(res, { message: "Title, description, content, and category are required", code: '00400' });
        }

        // Generate slug from title
        const slug = generateSlug(title);

        // Check if blog with same slug already exists
        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            return errorResponseHelper(res, { message: "Blog with this title already exists", code: '00400' });
        }

        // Validate authorModel
        if (authorModel && !['Admin', 'User'].includes(authorModel)) {
            return errorResponseHelper(res, { message: "Author model must be either 'Admin' or 'User'", code: '00400' });
        }

        // Use provided author name/email or fall back to user data
        const finalAuthorName = authorName || `${req.user.firstName} ${req.user.lastName}`.trim();
        const finalAuthorEmail = authorEmail || req.user.email;
        const finalAuthorModel = authorModel || 'Admin'; // Default to Admin for admin routes

        if (!finalAuthorName) {
            return errorResponseHelper(res, { message: "Author name is required", code: '00400' });
        }

        // Parse tags from JSON string if needed
        let parsedTags = [];
        if (tags) {
            try {
                if (typeof tags === 'string') {
                    parsedTags = JSON.parse(tags);
                } else if (Array.isArray(tags)) {
                    parsedTags = tags;
                } else {
                    parsedTags = [tags];
                }
            } catch (error) {
                console.error('Error parsing tags:', error);
                parsedTags = [];
            }
        }

        // Parse metaKeywords from JSON string if needed
        let parsedMetaKeywords = [];
        if (metaKeywords) {
            try {
                if (typeof metaKeywords === 'string') {
                    parsedMetaKeywords = JSON.parse(metaKeywords);
                } else if (Array.isArray(metaKeywords)) {
                    parsedMetaKeywords = metaKeywords;
                } else {
                    parsedMetaKeywords = [metaKeywords];
                }
            } catch (error) {
                console.error('Error parsing metaKeywords:', error);
                parsedMetaKeywords = [];
            }
        }

        const blogData = {
            title,
            slug,
            description,
            content,
            category,
            subCategory,
            status,
            enableComments,
            tags: parsedTags,
            metaTitle,
            metaDescription,
            metaKeywords: parsedMetaKeywords,
            author: author,
            authorModel: finalAuthorModel,
            authorName: finalAuthorName,
            authorEmail: finalAuthorEmail,
            authorDescription,
            publishedAt: status === 'published' ? new Date() : null
        };

        // Handle image upload to Cloudinary or media selection
        if (req.file) {
            try {
                console.log('Starting image upload for blog:', {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype
                });
                
                const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/blogs');
                blogData.coverImage = {
                    url: uploadResult.original.url,
                    public_id: uploadResult.original.public_id
                };
                
                console.log('Blog image upload successful:', blogData.coverImage.public_id);
            } catch (uploadError) {
                console.error('Cloudinary upload error details:', {
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
        } else if (req.body.coverMediaId) {
            // Handle selected media from library
            try {
                console.log('Processing coverMediaId:', req.body.coverMediaId);
                const selectedMedia = await Media.findById(req.body.coverMediaId);
                
                if (!selectedMedia) {
                    return errorResponseHelper(res, { message: "Selected media not found", code: '00404' });
                }
                
                if (selectedMedia.type !== 'image') {
                    return errorResponseHelper(res, { message: "Selected media must be an image", code: '00400' });
                }
                
                // Use the media file URL as cover image
                blogData.coverImage = {
                    url: selectedMedia.file?.url || selectedMedia.thumbnail?.url,
                    public_id: selectedMedia.file?.public_id,
                    mediaId: selectedMedia._id // Store reference to the media
                };
                
                console.log('Blog using selected media:', selectedMedia.title);
            } catch (mediaError) {
                console.error('Error fetching selected media:', mediaError);
                return errorResponseHelper(res, { message: 'Error fetching selected media', code: '00500' });
            }
        }

        console.log('Creating blog with data:', blogData);
        const blog = await Blog.create(blogData);
        console.log('Blog created successfully:', blog._id);

        return successResponseHelper(res, { message: "Blog post created successfully", data: blog });
    } catch (error) {
        console.error('Create blog error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get all blog posts with pagination and filtering
const getAllBlogs = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, category, subCategory } = req.query;
        
        const query = {};
        
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const blogs = await Blog.find(query)
            .populate('category', 'title')
            .populate('subCategory', 'title')
            .populate({
                path: 'author',
                select: 'firstName lastName email',
                refPath: 'authorModel'
            })
            .populate('coverImage.mediaId', 'title type file thumbnail')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get comment counts for all blogs
        const Comment = (await import('../../models/user/comment.js')).default;
        const blogsWithComments = await Promise.all(
            blogs.map(async (blog) => {
                const commentCount = await Comment.countDocuments({ 
                    blogId: blog._id, 
                    status: 'active' 
                });
                
                return {
                    ...blog.toObject(),
                    commentCount
                };
            })
        );

        const total = await Blog.countDocuments(query);

        return successResponseHelper(res, {
            message: "Blogs retrieved successfully",
            data: blogsWithComments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get blogs error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get a single blog post by ID
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id)
            .populate('category', 'title')
            .populate('subCategory', 'title')
            .populate({
                path: 'author',
                select: 'firstName lastName email',
                refPath: 'authorModel'
            })
            .populate('coverImage.mediaId', 'title type file thumbnail');

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        // Get comments and replies for the blog
        const Comment = (await import('../../models/user/comment.js')).default;
        const Reply = (await import('../../models/user/reply.js')).default;
        
        // Get comment count
        const commentCount = await Comment.countDocuments({ 
            blogId: id, 
            status: 'active' 
        });

        // Get all active comments for this blog
        const comments = await Comment.find({ 
            blogId: id, 
            status: 'active',
            parentComment: null // Only top-level comments
        })
        .populate('author', 'firstName lastName email')
        .sort({ createdAt: -1 });

        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await Reply.find({ 
                    comment: comment._id, 
                    status: 'active' 
                })
                .populate('author', 'firstName lastName email')
                .sort({ createdAt: 1 });

                return {
                    ...comment.toObject(),
                    replies
                };
            })
        );

        // Add comments and comment count to blog data
        const blogWithComments = {
            ...blog.toObject(),
            commentCount,
            comments: commentsWithReplies
        };

        return successResponseHelper(res, { message: "Blog post retrieved successfully", data: blogWithComments });
    } catch (error) {
        console.error('Get blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Update a blog post
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content, category, subCategory, status, enableComments, tags, metaTitle, metaDescription, metaKeywords, authorName, authorEmail, authorDescription, authorModel, author } = req.body;

        const blog = await Blog.findById(id);

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        // Generate slug from title if title is being updated
        if (title !== undefined) {
            const newSlug = generateSlug(title);
            
            // Check if slug already exists (excluding current blog)
            const existingBlog = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
            if (existingBlog) {
                return errorResponseHelper(res, { message: "Blog with this title already exists", code: '00400' });
            }
            
            blog.slug = newSlug;
        }

        // Validate authorModel if provided
        if (authorModel && !['Admin', 'User'].includes(authorModel)) {
            return errorResponseHelper(res, { message: "Author model must be either 'Admin' or 'User'", code: '00400' });
        }

        // Parse tags from JSON string if needed
        if (tags !== undefined) {
            try {
                if (typeof tags === 'string') {
                    blog.tags = JSON.parse(tags);
                } else if (Array.isArray(tags)) {
                    blog.tags = tags;
                } else {
                    blog.tags = [tags];
                }
            } catch (error) {
                console.error('Error parsing tags for update:', error);
                blog.tags = [];
            }
        }

        // Parse metaKeywords from JSON string if needed
        if (metaKeywords !== undefined) {
            try {
                if (typeof metaKeywords === 'string') {
                    blog.metaKeywords = JSON.parse(metaKeywords);
                } else if (Array.isArray(metaKeywords)) {
                    blog.metaKeywords = metaKeywords;
                } else {
                    blog.metaKeywords = [metaKeywords];
                }
            } catch (error) {
                console.error('Error parsing metaKeywords for update:', error);
                blog.metaKeywords = [];
            }
        }

        // Update fields if provided
        if (title !== undefined) blog.title = title;
        if (description !== undefined) blog.description = description;
        if (content !== undefined) blog.content = content;
        if (category !== undefined) blog.category = category;
        if (subCategory !== undefined) blog.subCategory = subCategory;
        if (enableComments !== undefined) blog.enableComments = enableComments;
        if (metaTitle !== undefined) blog.metaTitle = metaTitle;
        if (metaDescription !== undefined) blog.metaDescription = metaDescription;
        
        // Update author information if provided
        if (authorName !== undefined) blog.authorName = authorName;
        if (authorEmail !== undefined) blog.authorEmail = authorEmail;
        if (authorDescription !== undefined) blog.authorDescription = authorDescription;
        if (authorModel !== undefined) blog.authorModel = authorModel;
        if (author !== undefined) blog.author = author;
        // Handle status change
        if (status !== undefined) {
            blog.status = status;
            if (status === 'published' && !blog.publishedAt) {
                blog.publishedAt = new Date();
            }
        }

        // Handle image upload and deletion of previous image or media selection
        if (req.file) {
            try {
                console.log('Starting image upload for blog update:', {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype
                });
                
                // Delete old image from Cloudinary if it exists
                if (blog.coverImage && blog.coverImage.public_id) {
                    try {
                        await deleteFile(blog.coverImage.public_id, 'image');
                        console.log('Old blog image deleted successfully:', blog.coverImage.public_id);
                    } catch (deleteError) {
                        console.error('Error deleting old blog image:', deleteError);
                        // Continue with upload even if deletion fails
                    }
                }

                // Upload new image to Cloudinary
                const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/blogs');
                blog.coverImage = {
                    url: uploadResult.original.url,
                    public_id: uploadResult.original.public_id
                };
                
                console.log('Blog image upload successful for update:', blog.coverImage.public_id);
            } catch (uploadError) {
                console.error('Cloudinary upload error details for blog update:', {
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
        } else if (req.body.coverMediaId) {
            // Handle selected media from library for update
            try {
                const selectedMedia = await Media.findById(req.body.coverMediaId);
                
                if (!selectedMedia) {
                    return errorResponseHelper(res, { message: "Selected media not found", code: '00404' });
                }
                
                if (selectedMedia.type !== 'image') {
                    return errorResponseHelper(res, { message: "Selected media must be an image", code: '00400' });
                }
                
                // Delete old image from Cloudinary if it exists and was uploaded (not from media library)
                if (blog.coverImage && blog.coverImage.public_id && !blog.coverImage.mediaId) {
                    try {
                        await deleteFile(blog.coverImage.public_id, 'image');
                        console.log('Old blog image deleted successfully:', blog.coverImage.public_id);
                    } catch (deleteError) {
                        console.error('Error deleting old blog image:', deleteError);
                        // Continue even if deletion fails
                    }
                }
                
                // Use the media file URL as cover image
                blog.coverImage = {
                    url: selectedMedia.file?.url || selectedMedia.thumbnail?.url,
                    public_id: selectedMedia.file?.public_id,
                    mediaId: selectedMedia._id // Store reference to the media
                };
                
                console.log('Blog updated with selected media:', selectedMedia.title);
            } catch (mediaError) {
                console.error('Error fetching selected media for update:', mediaError);
                return errorResponseHelper(res, { message: 'Error fetching selected media', code: '00500' });
            }
        }

        blog.updatedAt = new Date();
        await blog.save();

        return successResponseHelper(res, { message: "Blog post updated successfully", data: blog });
    } catch (error) {
        console.error('Update blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Delete a blog post
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        // Delete blog image from Cloudinary if it exists and was uploaded (not from media library)
        if (blog.coverImage && blog.coverImage.public_id && !blog.coverImage.mediaId) {
            try {
                await deleteFile(blog.coverImage.public_id, 'image');
                console.log('Blog image deleted successfully:', blog.coverImage.public_id);
            } catch (deleteError) {
                console.error('Error deleting blog image:', deleteError);
                // Continue with deletion even if image deletion fails
            }
        }

        await Blog.findByIdAndDelete(id);

        return successResponseHelper(res, { message: "Blog post deleted successfully" });
    } catch (error) {
        console.error('Delete blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Toggle blog publish status
const toggleBlogStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'publish' or 'unpublish'

        if (!action || !['publish', 'unpublish'].includes(action)) {
            return errorResponseHelper(res, { 
                message: "Action is required and must be either 'publish' or 'unpublish'", 
                code: '00400' 
            });
        }

        const blog = await Blog.findById(id);

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        if (action === 'publish') {
            blog.status = 'published';
            blog.publishedAt = new Date();
            blog.updatedAt = new Date();
            await blog.save();
            return successResponseHelper(res, { message: "Blog post published successfully", data: blog });
        } else {
            blog.status = 'unpublish';
            blog.publishedAt = null;
            blog.updatedAt = new Date();
            await blog.save();
            return successResponseHelper(res, { message: "Blog post unpublished successfully", data: blog });
        }
    } catch (error) {
        console.error('Toggle blog status error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get blog statistics
const getBlogStats = async (req, res) => {
    try {
        const totalBlogs = await Blog.countDocuments();
        const publishedBlogs = await Blog.countDocuments({ status: 'published' });
        const draftBlogs = await Blog.countDocuments({ status: 'draft' });
        
        // Get total comments across all blogs
        const Comment = (await import('../../models/user/comment.js')).default;
        const totalComments = await Comment.countDocuments({ status: 'active' });
        
        const recentBlogs = await Blog.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title status createdAt');

        const stats = {
            total: totalBlogs,
            published: publishedBlogs,
            draft: draftBlogs,
            totalComments,
            recentBlogs
        };

        return successResponseHelper(res, { message: "Blog statistics retrieved successfully", data: stats });
    } catch (error) {
        console.error('Get blog stats error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Bulk update blog status
const bulkUpdateBlogStatus = async (req, res) => {
    try {
        const { blogIds, status } = req.body;

        if (!blogIds || !Array.isArray(blogIds) || blogIds.length === 0) {
            return errorResponseHelper(res, { message: "Blog IDs array is required", code: '00400' });
        }

        if (!status || !['published', 'draft'].includes(status)) {
            return errorResponseHelper(res, { message: "Valid status is required", code: '00400' });
        }

        const updateData = { status, updatedAt: new Date() };
        if (status === 'published') {
            updateData.publishedAt = new Date();
        }

        const result = await Blog.updateMany(
            { _id: { $in: blogIds } },
            updateData
        );

        return successResponseHelper(res, { 
            message: `Successfully updated ${result.modifiedCount} blog(s) status`,
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error('Bulk update blog status error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

export {
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    toggleBlogStatus,
    getBlogStats,
    bulkUpdateBlogStatus
};
