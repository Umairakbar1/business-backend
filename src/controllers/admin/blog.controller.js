import Blog from '../../models/admin/blog.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { getFileUrl } from '../../middleware/fileUpload.js';

// Create a new blog post
const createBlog = async (req, res) => {
    try {
        const { title, description, content, category, subCategory, status = 'draft', enableComments = true, tags, metaTitle, metaDescription, metaKeywords } = req.body;

        if (!title || !description || !content || !category) {
            return errorResponseHelper(res, { message: "Title, description, content, and category are required", code: '00400' });
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
            publishedAt: status === 'published' ? new Date() : null
        };

        // Handle image upload
        if (req.file) {
            blogData.coverImage = getFileUrl(req.file.filename);
        }

        const blog = await Blog.create(blogData);

        return successResponseHelper(res, { message: "Blog post created successfully", data: blog });
    } catch (error) {
        console.error('Create blog error:', error);
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
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .populate('author', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Blog.countDocuments(query);

        return successResponseHelper(res, {
            message: "Blogs retrieved successfully",
            data: {
                blogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
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
            .populate('category', 'name description')
            .populate('subCategory', 'name description')
            .populate('author', 'firstName lastName email');

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        return successResponseHelper(res, { message: "Blog post retrieved successfully", data: blog });
    } catch (error) {
        console.error('Get blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Update a blog post
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content, category, subCategory, status, enableComments, tags, metaTitle, metaDescription, metaKeywords } = req.body;

        const blog = await Blog.findById(id);

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        // Update fields if provided
        if (title !== undefined) blog.title = title;
        if (description !== undefined) blog.description = description;
        if (content !== undefined) blog.content = content;
        if (category !== undefined) blog.category = category;
        if (subCategory !== undefined) blog.subCategory = subCategory;
        if (enableComments !== undefined) blog.enableComments = enableComments;
        if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags : [tags];
        if (metaTitle !== undefined) blog.metaTitle = metaTitle;
        if (metaDescription !== undefined) blog.metaDescription = metaDescription;
        if (metaKeywords !== undefined) blog.metaKeywords = Array.isArray(metaKeywords) ? metaKeywords : [metaKeywords];
        
        // Handle status change
        if (status !== undefined) {
            blog.status = status;
            if (status === 'published' && !blog.publishedAt) {
                blog.publishedAt = new Date();
            }
        }

        // Handle image upload and deletion of previous image
        if (req.file) {
            // Delete previous image if it exists
            if (blog.coverImage) {
                const fs = await import('fs');
                const path = await import('path');
                const imagePath = path.join(process.cwd(), 'uploads', blog.coverImage.split('/').pop());
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            // Set new image
            blog.coverImage = getFileUrl(req.file.filename);
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

        // Delete blog image if it exists
        if (blog.coverImage) {
            const fs = await import('fs');
            const path = await import('path');
            const imagePath = path.join(process.cwd(), 'uploads', blog.coverImage.split('/').pop());
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Blog.findByIdAndDelete(id);

        return successResponseHelper(res, { message: "Blog post deleted successfully" });
    } catch (error) {
        console.error('Delete blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Publish a blog post
const publishBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        blog.status = 'published';
        blog.publishedAt = new Date();
        blog.updatedAt = new Date();
        await blog.save();

        return successResponseHelper(res, { message: "Blog post published successfully", data: blog });
    } catch (error) {
        console.error('Publish blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Unpublish a blog post
const unpublishBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);

        if (!blog) {
            return errorResponseHelper(res, { message: "Blog post not found", code: '00404' });
        }

        blog.status = 'draft';
        blog.publishedAt = null;
        blog.updatedAt = new Date();
        await blog.save();

        return successResponseHelper(res, { message: "Blog post unpublished successfully", data: blog });
    } catch (error) {
        console.error('Unpublish blog error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get blog statistics
const getBlogStats = async (req, res) => {
    try {
        const totalBlogs = await Blog.countDocuments();
        const publishedBlogs = await Blog.countDocuments({ status: 'published' });
        const draftBlogs = await Blog.countDocuments({ status: 'draft' });
        
        const recentBlogs = await Blog.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title status createdAt');

        const stats = {
            total: totalBlogs,
            published: publishedBlogs,
            draft: draftBlogs,
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
    publishBlog,
    unpublishBlog,
    getBlogStats,
    bulkUpdateBlogStatus
};
