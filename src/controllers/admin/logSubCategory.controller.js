import LogSubCategory from '../../models/admin/logSubCategory.js';
import LogCategory from '../../models/admin/logCategory.js';
import { successResponseHelper, errorResponseHelper } from '../../helpers/utilityHelper.js';

const createLogSubCategory = async (req, res) => {
  try {
    const { name, description, image, categoryId, status = 'active' } = req.body;

    if (!name) {
      return errorResponseHelper(res, 400, 'Subcategory name is required');
    }

    if (!categoryId) {
      return errorResponseHelper(res, 400, 'Category ID is required');
    }

    // Check if category exists
    const category = await LogCategory.findById(categoryId);
    if (!category) {
      return errorResponseHelper(res, 404, 'Log category not found');
    }

    // Check if subcategory with same name exists in the same category
    const existingSubCategory = await LogSubCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      categoryId
    });

    if (existingSubCategory) {
      return errorResponseHelper(res, 400, 'Subcategory with this name already exists in this category');
    }

    const subCategory = new LogSubCategory({
      name,
      description,
      image,
      categoryId,
      status,
      createdBy: req.user.id
    });

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'name');

    return successResponseHelper(res, 201, 'Log subcategory created successfully', subCategory);
  } catch (error) {
    console.error('Error creating log subcategory:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const getAllLogSubCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Category filter
    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const subCategories = await LogSubCategory.find(query)
      .populate('categoryId', 'name')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LogSubCategory.countDocuments(query);

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    };

    return successResponseHelper(res, 200, 'Log subcategories retrieved successfully', {
      subCategories,
      pagination
    });
  } catch (error) {
    console.error('Error fetching log subcategories:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const getLogSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await LogSubCategory.findById(id)
      .populate('categoryId', 'name description')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!subCategory) {
      return errorResponseHelper(res, 404, 'Log subcategory not found');
    }

    return successResponseHelper(res, 200, 'Log subcategory retrieved successfully', subCategory);
  } catch (error) {
    console.error('Error fetching log subcategory:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const updateLogSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, categoryId, status } = req.body;

    const subCategory = await LogSubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, 404, 'Log subcategory not found');
    }

    // If categoryId is being updated, check if new category exists
    if (categoryId && categoryId !== subCategory.categoryId.toString()) {
      const category = await LogCategory.findById(categoryId);
      if (!category) {
        return errorResponseHelper(res, 404, 'Log category not found');
      }
    }

    // Check for duplicate name in the same category
    if (name && name !== subCategory.name) {
      const existingSubCategory = await LogSubCategory.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        categoryId: categoryId || subCategory.categoryId,
        _id: { $ne: id }
      });

      if (existingSubCategory) {
        return errorResponseHelper(res, 400, 'Subcategory with this name already exists in this category');
      }
    }

    // Update fields
    if (name) subCategory.name = name;
    if (description !== undefined) subCategory.description = description;
    if (image !== undefined) subCategory.image = image;
    if (categoryId) subCategory.categoryId = categoryId;
    if (status !== undefined) subCategory.status = status;
    
    subCategory.updatedBy = req.user.id;
    subCategory.updatedAt = new Date();

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'name');

    return successResponseHelper(res, 200, 'Log subcategory updated successfully', subCategory);
  } catch (error) {
    console.error('Error updating log subcategory:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const deleteLogSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await LogSubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, 404, 'Log subcategory not found');
    }

    await LogSubCategory.findByIdAndDelete(id);

    return successResponseHelper(res, 200, 'Log subcategory deleted successfully');
  } catch (error) {
    console.error('Error deleting log subcategory:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const getLogSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return errorResponseHelper(res, 400, 'Category ID is required');
    }

    // Check if category exists
    const category = await LogCategory.findById(categoryId);
    if (!category) {
      return errorResponseHelper(res, 404, 'Log category not found');
    }

    const subCategories = await LogSubCategory.find({ 
      categoryId, 
      status: 'active' 
    })
    .populate('categoryId', 'name')
    .sort({ name: 1 });

    return successResponseHelper(res, 200, 'Log subcategories retrieved successfully', subCategories);
  } catch (error) {
    console.error('Error fetching log subcategories by category:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

const bulkUpdateLogSubCategoryStatus = async (req, res) => {
  try {
    const { subCategoryIds, status } = req.body;

    if (!subCategoryIds || !Array.isArray(subCategoryIds) || subCategoryIds.length === 0) {
      return errorResponseHelper(res, 400, 'Subcategory IDs array is required');
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, 400, 'Valid status is required (active/inactive)');
    }

    const result = await LogSubCategory.updateMany(
      { _id: { $in: subCategoryIds } },
      { status, updatedAt: Date.now(), updatedBy: req.user.id }
    );

    return successResponseHelper(res, 200, `Updated ${result.modifiedCount} log subcategories successfully`);
  } catch (error) {
    console.error('Bulk update log subcategory status error:', error);
    return errorResponseHelper(res, 500, 'Internal server error');
  }
};

export {
  createLogSubCategory,
  getAllLogSubCategories,
  getLogSubCategoryById,
  updateLogSubCategory,
  deleteLogSubCategory,
  getLogSubCategoriesByCategory,
  bulkUpdateLogSubCategoryStatus
}; 