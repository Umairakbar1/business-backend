import SubCategory from '../../models/admin/subCategory.js';
import Category from '../../models/admin/category.js';
import { subCategorySchema } from '../../validators/admin.js';
import { successResponseHelper, errorResponse } from '../../helpers/utilityHelper.js';

const createSubCategory = async (req, res) => {
  try {
    const { error, value } = subCategorySchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const { name, description, categoryId, isActive = true } = value;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponse(res, 404, 'Category not found');
    }

    // Check if subcategory with same name exists in the same category
    const existingSubCategory = await SubCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      categoryId
    });

    if (existingSubCategory) {
      return errorResponse(res, 400, 'Subcategory with this name already exists in this category');
    }

    const subCategory = new SubCategory({
      name,
      description,
      categoryId,
      isActive,
      createdBy: req.user.id
    });

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'name');

    return successResponseHelper(res, 201, 'Subcategory created successfully', subCategory);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};


const getAllSubCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      isActive,
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

    // Active status filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const subCategories = await SubCategory.find(query)
      .populate('categoryId', 'name')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SubCategory.countDocuments(query);

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    };

    return successResponseHelper(res, 200, 'Subcategories retrieved successfully', {
      subCategories,
      pagination
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};


const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id)
      .populate('categoryId', 'name description')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!subCategory) {
      return errorResponse(res, 404, 'Subcategory not found');
    }

    return successResponseHelper(res, 200, 'Subcategory retrieved successfully', subCategory);
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};


const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = subCategorySchema.validate(req.body, true);
    
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return errorResponse(res, 404, 'Subcategory not found');
    }

    const { name, description, categoryId, isActive } = value;

    // If categoryId is being updated, check if new category exists
    if (categoryId && categoryId !== subCategory.categoryId.toString()) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return errorResponse(res, 404, 'Category not found');
      }
    }

    // Check for duplicate name in the same category
    if (name && name !== subCategory.name) {
      const existingSubCategory = await SubCategory.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        categoryId: categoryId || subCategory.categoryId,
        _id: { $ne: id }
      });

      if (existingSubCategory) {
        return errorResponse(res, 400, 'Subcategory with this name already exists in this category');
      }
    }

    // Update fields
    if (name) subCategory.name = name;
    if (description !== undefined) subCategory.description = description;
    if (categoryId) subCategory.categoryId = categoryId;
    if (isActive !== undefined) subCategory.isActive = isActive;
    
    subCategory.updatedBy = req.user.id;
    subCategory.updatedAt = new Date();

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'name');

    return successResponseHelper(res, 200, 'Subcategory updated successfully', subCategory);
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};


const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return errorResponse(res, 404, 'Subcategory not found');
    }

    // const productsUsingSubCategory = await Product.countDocuments({ subCategoryId: id });
    // if (productsUsingSubCategory > 0) {
    //   return errorResponse(res, 400, 'Cannot delete subcategory. It is being used by products.');
    // }

    await SubCategory.findByIdAndDelete(id);

    return successResponseHelper(res, 200, 'Subcategory deleted successfully');
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};


const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive } = req.query;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponse(res, 404, 'Category not found');
    }

    const query = { categoryId };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const subCategories = await SubCategory.find(query)
      .populate('categoryId', 'name')
      .sort({ name: 1 });

    return successResponseHelper(res, 200, 'Subcategories retrieved successfully', subCategories);
  } catch (error) {
    console.error('Error fetching subcategories by category:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};


const bulkUpdateStatus = async (req, res) => {
  try {
    const { subCategoryIds, isActive } = req.body;

    if (!Array.isArray(subCategoryIds) || subCategoryIds.length === 0) {
      return errorResponse(res, 400, 'Subcategory IDs array is required');
    }

    if (typeof isActive !== 'boolean') {
      return errorResponse(res, 400, 'isActive must be a boolean value');
    }

    const result = await SubCategory.updateMany(
      { _id: { $in: subCategoryIds } },
      { 
        isActive,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }
    );

    return successResponseHelper(res, 200, `${result.modifiedCount} subcategories updated successfully`);
  } catch (error) {
    console.error('Error bulk updating subcategories:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

export {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategory,
  bulkUpdateStatus
};
