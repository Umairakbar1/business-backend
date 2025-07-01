import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';

import { categorySchema } from '../../validators/admin.js';
import { successResponseHelper, errorResponse } from '../../helpers/utilityHelper.js';

const createCategory = async (req, res) => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${value.name}$`, 'i') } 
    });
    
    if (existingCategory) {
      return errorResponse(res, 400, 'Category with this name already exists');
    }

    const category = new Category(value);
    await category.save();

    // Handle subcategories if provided
    if (req.body.subcategories && Array.isArray(req.body.subcategories)) {
      const subcategoryPromises = req.body.subcategories.map(subcat => {
        return new SubCategory({
          name: subcat.name,
          description: subcat.description,
          category: category._id,
          status: subcat.status || 'active'
        }).save();
      });

      await Promise.all(subcategoryPromises);
    }

    return successResponseHelper(res, 201, 'Category created successfully', category);
  } catch (error) {
    console.error('Create category error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (status) {
      filter.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const categories = await Category.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('parent', 'name');

    const total = await Category.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    return successResponseHelper(res, 200, 'Categories retrieved successfully', {
      categories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id).populate('parent', 'name');
    
    if (!category) {
      return errorResponse(res, 404, 'Category not found');
    }

    return successResponseHelper(res, 200, 'Category retrieved successfully', category);
  } catch (error) {
    console.error('Get category by ID error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid category ID');
    }
    return errorResponse(res, 500, 'Internal server error');
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = categorySchema.validate(req.body);
    
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    // Check if category exists
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return errorResponse(res, 404, 'Category not found');
    }

    // Check if category with same name already exists (excluding current category)
    const duplicateCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${value.name}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (duplicateCategory) {
      return errorResponse(res, 400, 'Category with this name already exists');
    }

    // Prevent circular reference if updating parent
    if (value.parent && value.parent.toString() === id) {
      return errorResponse(res, 400, 'Category cannot be its own parent');
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { ...value, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('parent', 'name');

    return successResponseHelper(res, 200, 'Category updated successfully', updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid category ID');
    }
    return errorResponse(res, 500, 'Internal server error');
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return errorResponse(res, 404, 'Category not found');
    }

    // Check if category has children
    const hasChildren = await Category.findOne({ parent: id });
    if (hasChildren) {
      return errorResponse(res, 400, 'Cannot delete category with subcategories. Please move or delete subcategories first.');
    }

    // Check if category has subcategories
    const subcategories = await SubCategory.find({ category: id });
    
    // const subcategoryIds = subcategories.map(sub => sub._id);
    // const hasProducts = await Product.findOne({ subcategory: { $in: subcategoryIds } });
    // if (hasProducts) {
    //   return errorResponse(res, 400, 'Cannot delete category that has subcategories being used by products');
    // }

    // Delete all subcategories first
    if (subcategories.length > 0) {
      await SubCategory.deleteMany({ category: id });
    }

    // const hasProducts = await Product.findOne({ category: id });
    // if (hasProducts) {
    //   return errorResponse(res, 400, 'Cannot delete category that is being used by products');
    // }

    await Category.findByIdAndDelete(id);

    return successResponseHelper(res, 200, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid category ID');
    }
    return errorResponse(res, 500, 'Internal server error');
  }
};

const getCategoryHierarchy = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' }).sort('name');
    
    // Build hierarchy
    const buildHierarchy = (parentId = null) => {
      return categories
        .filter(cat => String(cat.parent) === String(parentId))
        .map(cat => ({
          ...cat.toObject(),
          children: buildHierarchy(cat._id)
        }));
    };

    const hierarchy = buildHierarchy();

    return successResponseHelper(res, 200, 'Category hierarchy retrieved successfully', hierarchy);
  } catch (error) {
    console.error('Get category hierarchy error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

const bulkUpdateStatus = async (req, res) => {
  try {
    const { categoryIds, status } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return errorResponse(res, 400, 'Category IDs array is required');
    }

    if (!['active', 'inactive'].includes(status)) {
      return errorResponse(res, 400, 'Status must be either "active" or "inactive"');
    }

    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { status, updatedAt: Date.now() }
    );

    return successResponseHelper(res, 200, `Status updated for ${result.modifiedCount} categories`);
  } catch (error) {
    console.error('Bulk update status error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryHierarchy,
  bulkUpdateStatus
};
