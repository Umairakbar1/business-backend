import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
import { successResponseHelper, errorResponseHelper } from '../../helpers/utilityHelper.js';

// Get all active categories
export const getAllCategories = async (req, res) => {
  try {
    const { page, limit, search, sortBy, sortOrder } = req.query;
    
    // Check if any query parameters are provided
    const hasQueryParams = page || limit || search || sortBy || sortOrder;
    
    if (hasQueryParams) {
      // Use query filters when parameters are provided
      const { page: pageParam = 1, limit: limitParam = 50, search: searchParam = '', sortBy: sortByParam = '', sortOrder: sortOrderParam = 'asc' } = req.query;
      
      const query = { status: 'active' };
      
      // Add search functionality
      if (searchParam) {
        query.title = { $regex: searchParam, $options: 'i' };
      }
      
      // Calculate pagination
      const skip = (parseInt(pageParam) - 1) * parseInt(limitParam);
      
      // Build sort object
      const sort = {};
      if (sortByParam && sortByParam.trim() !== '') {
        sort[sortByParam] = sortOrderParam === 'desc' ? -1 : 1;
      } else {
        // Default sort by title if no sortBy is provided
        sort.title = sortOrderParam === 'desc' ? -1 : 1;
      }
      
      // Get categories with pagination
      const categories = await Category.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limitParam))
        .select('title slug description image status createdAt');
      
      // Get total count for pagination
      const total = await Category.countDocuments(query);
      
      return successResponseHelper(res, {
        message: 'Categories retrieved successfully',
          data:categories,
          pagination: {
            currentPage: parseInt(pageParam),
            totalPages: Math.ceil(total / parseInt(limitParam)),
            totalItems: total,
            itemsPerPage: parseInt(limitParam)
          }
      });
    } else {
      // Return all active categories without pagination when no query params
      const categories = await Category.find({ status: 'active' })
        .sort({ title: 1 })
        .select('title slug description image status createdAt');
      
      return successResponseHelper(res, {
        message: 'All categories retrieved successfully',
        data:categories,
        totalItems: categories.length
      });
    }
  } catch (error) {
    console.error('Get all categories error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve categories', code: '00500' });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findOne({ _id: id, status: 'active' })
      .select('title slug description image status createdAt');
    
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }
    
    return successResponseHelper(res, {
      message: 'Category retrieved successfully',
      data: category
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve category', code: '00500' });
  }
};

// Get category with its subcategories
export const getCategoryWithSubcategories = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeInactive = false } = req.query;
    
    // Build query for category
    const categoryQuery = { _id: id, status: 'active' };
    const category = await Category.findOne(categoryQuery)
      .select('title slug description image status createdAt');
    
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }
    
    // Build query for subcategories
    const subcategoryQuery = { categoryId: id };
    if (!includeInactive) {
      subcategoryQuery.status = 'active';
    }
    
    const subcategories = await SubCategory.find(subcategoryQuery)
      .sort({ title: 1 })
      .select('title slug description image status createdAt');
    
    return successResponseHelper(res, {
      message: 'Category with subcategories retrieved successfully',
      data:category,
      subcategories
    });
  } catch (error) {
    console.error('Get category with subcategories error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve category with subcategories', code: '00500' });
  }
};

// Get all subcategories
export const getAllSubcategories = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      categoryId = '',
      sortBy = 'title', 
      sortOrder = 'asc' 
    } = req.query;
    
    const query = { status: 'active' };
    
    // Add category filter
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    // Add search functionality
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get subcategories with pagination and populate category info
    const subcategories = await SubCategory.find(query)
      .populate('categoryId', 'title slug')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title slug description image status categoryId createdAt');
    
    // Get total count for pagination
    const total = await SubCategory.countDocuments(query);
    
    return successResponseHelper(res, {
      message: 'Subcategories retrieved successfully',
      data:subcategories,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all subcategories error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve subcategories', code: '00500' });
  }
};

// Get subcategory by ID
export const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subcategory = await SubCategory.findOne({ _id: id, status: 'active' })
      .populate('categoryId', 'title slug description')
      .select('title slug description image status categoryId createdAt');
    
    if (!subcategory) {
      return errorResponseHelper(res, { message: 'Subcategory not found', code: '00404' });
    }
    
    return successResponseHelper(res, {
      message: 'Subcategory retrieved successfully',
      data: subcategory
    });
  } catch (error) {
    console.error('Get subcategory by ID error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve subcategory', code: '00500' });
  }
};

// Get subcategories by category ID
export const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { includeInactive = false } = req.query;
    
    // Verify category exists and is active
    const category = await Category.findOne({ _id: categoryId, status: 'active' });
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }
    
    // Build query for subcategories
    const query = { categoryId };

    if (includeInactive !== 'true') {
      query.status = 'active';
    }

    const subCategories = await SubCategory.find(query)
      .populate('categoryId', 'title')
      .sort({ title: 1 })
      .select('title slug description image status createdAt');
    
    return successResponseHelper(res, {
      message: 'Subcategories retrieved successfully',
      data:subCategories,
      category
    });
  } catch (error) { 
    console.error('Get subcategories by category error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve subcategories', code: '00500' });
  }
};

// Get categories hierarchy (categories with their subcategories)
export const getCategoriesHierarchy = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    // Build query for categories
    const categoryQuery = { status: 'active' };
    const categories = await Category.find(categoryQuery)
      .sort({ title: 1 })
      .select('title slug description image status createdAt');
    
    // Get subcategories for all categories
    const categoryIds = categories.map(cat => cat._id);
    const subcategoryQuery = { categoryId: { $in: categoryIds } };
    if (!includeInactive) {
      subcategoryQuery.status = 'active';
    }
    
    const subcategories = await SubCategory.find(subcategoryQuery)
      .sort({ title: 1 })
      .select('title slug description image status categoryId createdAt');
    
    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });
    
    // Build hierarchy
    const hierarchy = categories.map(category => ({
      ...category.toObject(),
      subcategories: subcategoriesByCategory[category._id.toString()] || []
    }));
    
    return successResponseHelper(res, {
      message: 'Categories hierarchy retrieved successfully',
      data: hierarchy,
      totalItems: hierarchy.length
    });
  } catch (error) {
    console.error('Get categories hierarchy error:', error);
    return errorResponseHelper(res, { message: 'Failed to retrieve categories hierarchy', code: '00500' });
  }
}; 