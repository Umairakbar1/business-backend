import Blog from '../../models/admin/blog.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

// Create a new blog post
const createBlog = async (req, res) => {
    const { title, content, author, tags, status = 'draft' } = req.body;

    if (!title || !content || !author) {
        return errorResponseHelper(res, 400, "Title, content, and author are required");
    }

    const blog = await Blog.create({
        title,
        content,
        author,
        tags: tags || [],
        status,
        publishedAt: status === 'published' ? new Date() : null
    });

    return successResponseHelper(res, 201, "Blog post created successfully", blog);
};

// Get all blog posts with pagination and filtering
const getAllBlogs = async (req, res) => {
    const { page = 1, limit = 10, status, author, search } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (author) query.author = author;
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;
    
    const blogs = await Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'username email');

    const total = await Blog.countDocuments(query);

    return successResponseHelper(res, 200, "Blogs retrieved successfully", {
            blogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    );
};

// Get a single blog post by ID
const getBlogById = async (req, res) => {
    const { id } = req.params;

    const blog = await Blog.findById(id).populate('author', 'username email');

    if (!blog) {
        return errorResponseHelper(res, 404, "Blog post not found");
    }

    return successResponseHelper(res, 200, "Blog post retrieved successfully", blog);
};

// Update a blog post
const updateBlog = async (req, res) => {
    const { id } = req.params;
    const { title, content, author, tags, status } = req.body;

    const blog = await Blog.findById(id);

    if (!blog) {
        return errorResponseHelper(res, 404, "Blog post not found");
    }

    // Update fields if provided
    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (author !== undefined) blog.author = author;
    if (tags !== undefined) blog.tags = tags;
    
    // Handle status change
    if (status !== undefined) {
        blog.status = status;
        if (status === 'published' && !blog.publishedAt) {
            blog.publishedAt = new Date();
        }
    }

    blog.updatedAt = new Date();
    await blog.save();

    return successResponseHelper(res, 200, "Blog post updated successfully", blog);
};

// Delete a blog post
const deleteBlog = async (req, res) => {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
        return errorResponseHelper(res, 404, "Blog post not found");
    }

    return successResponseHelper(res, 200, "Blog post deleted successfully");
};

// Publish a blog post
const publishBlog = async (req, res) => {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
        return
    }

    blog.status = 'published';
    blog.publishedAt = new Date();
    blog.updatedAt = new Date();
    await blog.save();

    return res.status(200).json(
        new ApiResponse(200, blog, "Blog post published successfully")
    );
};

// Unpublish a blog post
const unpublishBlog = async (req, res) => {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
        throw new ApiError(404, "Blog post not found");
    }

    blog.status = 'draft';
    blog.publishedAt = null;
    blog.updatedAt = new Date();
    await blog.save();

    return res.status(200).json(
        new ApiResponse(200, blog, "Blog post unpublished successfully")
    );
};

// Get blog statistics
const getBlogStats = async (req, res) => {
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

    return res.status(200).json(
        new ApiResponse(200, stats, "Blog statistics retrieved successfully")
    );
};

export {
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    publishBlog,
    unpublishBlog,
    getBlogStats
};
