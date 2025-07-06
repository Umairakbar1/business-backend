import LogCategory from '../../models/admin/logCategory.js';
import LogSubCategory from '../../models/admin/logSubCategory.js';
import { successResponseHelper, errorResponseHelper } from '../../helpers/utilityHelper.js';

const createLogCategory = async (req, res) => {
  try {
    const { name, description, image, status = 'active', parent } = req.body;

    if (!name) {
      return errorResponseHelper(res, 400, 'Category name is required');
    }

    // Check if category with same name already exists
    const existingCategory = await LogCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingCategory) {
      return errorResponseHelper(res, 400, 'Category with this name already exists');
    }

    const category = new LogCategory({
      name,
      description,
      image,
      status,
      parent
    });
    await category.save();

    // Handle subcategories if provided
    if (req.body.subcategories && Array.isArray(req.body.subcategories)) {
      const subcategoryPromises = req.body.subcategories.map(subcat => {
        return new LogSubCategory({
          name: subcat.name,
          description: subcat.description,
          categoryId: category._id,
          status: subcat.status || 'active',
          createdBy: req.user.id
        }).save();
      });

      await Promise.all(subcategoryPromises);
    }

    return successResponseHelper(res, 201, 'Log category created successfully', category);
  } catch (error) {
    console.error('Create log category error:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const getAllLogCategories = async (req, res) => {
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
    
    const categories = await LogCategory.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('parent', 'name');

    const total = await LogCategory.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    return successResponseHelper(res, 200, 'Log categories retrieved successfully', {
      categories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all log categories error:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const getLogCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await LogCategory.findById(id).populate('parent', 'name');
    
    if (!category) {
      return errorResponseHelper(res, 404, 'Log category not found');
    }

    return successResponseHelper(res, 200, 'Log category retrieved successfully', category);
  } catch (error) {
    console.error('Get log category by ID error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, 400, 'Invalid log category ID');
    }
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const updateLogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, status, parent } = req.body;
    
    // Check if category exists
    const existingCategory = await LogCategory.findById(id);
    if (!existingCategory) {
      return errorResponseHelper(res, 404, 'Log category not found');
    }

    // Check if category with same name already exists (excluding current category)
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await LogCategory.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (duplicateCategory) {
        return errorResponseHelper(res, 400, 'Log category with this name already exists');
      }
    }

    // Prevent circular reference if updating parent
    if (parent && parent.toString() === id) {
      return errorResponseHelper(res, 400, 'Category cannot be its own parent');
    }

    const updatedCategory = await LogCategory.findByIdAndUpdate(
      id,
      { 
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(status && { status }),
        ...(parent !== undefined && { parent }),
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    ).populate('parent', 'name');

    return successResponseHelper(res, 200, 'Log category updated successfully', updatedCategory);
  } catch (error) {
    console.error('Update log category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, 400, 'Invalid log category ID');
    }
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const deleteLogCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await LogCategory.findById(id);
    if (!category) {
      return errorResponseHelper(res, 404, 'Log category not found');
    }

    // Check if category has children
    const hasChildren = await LogCategory.findOne({ parent: id });
    if (hasChildren) {
      return errorResponseHelper(res, 400, 'Cannot delete category with subcategories. Please move or delete subcategories first.');
    }

    // Check if category has subcategories
    const subcategories = await LogSubCategory.find({ categoryId: id });
    
    // Delete all subcategories first
    if (subcategories.length > 0) {
      await LogSubCategory.deleteMany({ categoryId: id });
    }

    await LogCategory.findByIdAndDelete(id);

    return successResponseHelper(res, 200, 'Log category deleted successfully');
  } catch (error) {
    console.error('Delete log category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, 400, 'Invalid log category ID');
    }
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const getLogCategoryHierarchy = async (req, res) => {
  try {
    const buildHierarchy = (parentId = null) => {
      return LogCategory.find({ parent: parentId, status: 'active' })
        .populate({
          path: 'children',
          populate: { path: 'children' }
        });
    };

    const hierarchy = await buildHierarchy();
    return successResponseHelper(res, 200, 'Log category hierarchy retrieved successfully', hierarchy);
  } catch (error) {
    console.error('Get log category hierarchy error:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const bulkUpdateLogCategoryStatus = async (req, res) => {
  try {
    const { categoryIds, status } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return errorResponseHelper(res, 400, 'Category IDs array is required');
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, 400, 'Valid status is required (active/inactive)');
    }

    const result = await LogCategory.updateMany(
      { _id: { $in: categoryIds } },
      { status, updatedAt: Date.now() }
    );

    return successResponseHelper(res, 200, `Updated ${result.modifiedCount} log categories successfully`);
  } catch (error) {
    console.error('Bulk update log category status error:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

export {
  createLogCategory,
  getAllLogCategories,
  getLogCategoryById,
  updateLogCategory,
  deleteLogCategory,
  getLogCategoryHierarchy,
  bulkUpdateLogCategoryStatus
}; 