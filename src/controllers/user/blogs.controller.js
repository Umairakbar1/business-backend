import Blog from '../../models/admin/blog.js';
import LogCategory from '../../models/admin/logCategory.js';
import LogSubCategory from '../../models/admin/logSubCategory.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

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
            .populate('category', 'name description')
            .populate('subCategory', 'name description')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v'); // Exclude version key

        const total = await Blog.countDocuments(query);

        return successResponseHelper(res, {
            blogs,
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

        if (!id) {
            return errorResponseHelper(res, {
                message: 'Blog ID is required',
                code: 'BLOG_ID_REQUIRED'
            });
        }

        const blog = await Blog.findOne({ 
            _id: id, 
            status: 'published' 
        }).select('-__v');

        if (!blog) {
            return errorResponseHelper(res, {
                message: 'Blog not found or not published',
                code: 'BLOG_NOT_FOUND'
            });
        }

        return successResponseHelper(res, blog);
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
    getAllBlogs,
    getBlogById,
    getAllCategories,
    getSubCategoriesByCategory
};
