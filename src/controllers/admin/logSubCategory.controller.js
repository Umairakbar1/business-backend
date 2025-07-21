import LogSubCategory from '../../models/admin/logSubCategory.js';
import LogCategory from '../../models/admin/logCategory.js';
import { successResponseHelper, errorResponseHelper } from '../../helpers/utilityHelper.js';

const createLogSubCategory = async (req, res) => {
  try {
    const { title, description, image, categoryId, status = 'active' } = req.body;

    if (!title) {
      return errorResponseHelper(res, {message:'Subcategory name is required', code:'00400'});
    }

    if (!categoryId) {
      return errorResponseHelper(res, {message:'Category ID is required', code:'00400'});
    }

    // Check if category exists
    const category = await LogCategory.findById(categoryId);
    if (!category) {
      return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
    }

    // Check if subcategory with same name exists in the same category
    const existingSubCategory = await LogSubCategory.findOne({
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      categoryId
    });

    if (existingSubCategory) {
      return errorResponseHelper(res, {message:'Subcategory with this name already exists in this category', code:'00400'});
    }

    const subCategory = new LogSubCategory({
      title,
      description,
      image,
      categoryId,
      status,
      createdBy: req.user.id
    });

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'title');

    return successResponseHelper(res, {message:'Log subcategory created successfully', data:subCategory});
  } catch (error) {
    console.error('Error creating log subcategory:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
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
      query.title = { $regex: search, $options: 'i' };
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
      .populate('categoryId', 'title')
      .populate('createdBy', 'title email')
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

    return successResponseHelper(res, {message:'Log subcategories retrieved successfully', data: {
      data:subCategories,
      pagination
    }});
  } catch (error) {
    console.error('Error fetching log subcategories:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const getLogSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await LogSubCategory.findById(id)
      .populate('categoryId', 'title description')
      .populate('createdBy', 'title email')
      .populate('updatedBy', 'title email');

    if (!subCategory) {
      return errorResponseHelper(res, {message:'Log subcategory not found', code:'00404'});
    }

    return successResponseHelper(res, {message:'Log subcategory retrieved successfully', data:subCategory});
  } catch (error) {
    console.error('Error fetching log subcategory:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const updateLogSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image, categoryId, status } = req.body;

    const subCategory = await LogSubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, {message:'Log subcategory not found', code:'00404'});
    }

    // If categoryId is being updated, check if new category exists
    if (categoryId && categoryId !== subCategory.categoryId.toString()) {
      const category = await LogCategory.findById(categoryId);
      if (!category) {
        return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
      }
    }

    // Check for duplicate name in the same category
    if (title && title !== subCategory.title) {
      const existingSubCategory = await LogSubCategory.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        categoryId: categoryId || subCategory.categoryId,
        _id: { $ne: id }
      });

      if (existingSubCategory) {
        return errorResponseHelper(res, {message:'Subcategory with this name already exists in this category', code:'00400'});
      }
    }

    // Update fields
    if (title) subCategory.title = title;
    if (description !== undefined) subCategory.description = description;
    if (image !== undefined) subCategory.image = image;
    if (categoryId) subCategory.categoryId = categoryId;
    if (status !== undefined) subCategory.status = status;
    
    subCategory.updatedBy = req.user.id;
    subCategory.updatedAt = new Date();

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'title');

    return successResponseHelper(res, {message:'Log subcategory updated successfully', data:subCategory});
  } catch (error) {
    console.error('Error updating log subcategory:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const deleteLogSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await LogSubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, {message:'Log subcategory not found', code:'00404'});
    }

    await LogSubCategory.findByIdAndDelete(id);

    return successResponseHelper(res, {message:'Log subcategory deleted successfully'});
  } catch (error) {
    console.error('Error deleting log subcategory:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const getLogSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return errorResponseHelper(res, {message:'Category ID is required', code:'00400'});
    }

    // Check if category exists
    const category = await LogCategory.findById(categoryId);
    if (!category) {
      return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
    }

    const subCategories = await LogSubCategory.find({ 
      categoryId, 
      status: 'active' 
    })
    .populate('categoryId', 'title')
    .sort({ title: 1 });

    return successResponseHelper(res, {message:'Log subcategories retrieved successfully', data:subCategories});
  } catch (error) {
    console.error('Error fetching log subcategories by category:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const bulkUpdateLogSubCategoryStatus = async (req, res) => {
  try {
    const { subCategoryIds, status } = req.body;

    if (!subCategoryIds || !Array.isArray(subCategoryIds) || subCategoryIds.length === 0) {
      return errorResponseHelper(res, {message:'Subcategory IDs array is required', code:'00400'});
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, {message:'Valid status is required (active/inactive)', code:'00400'});
    }

    const result = await LogSubCategory.updateMany(
      { _id: { $in: subCategoryIds } },
      { status, updatedAt: Date.now(), updatedBy: req.user.id }
    );  

    return successResponseHelper(res, {message:`Updated ${result.modifiedCount} log subcategories successfully`});
  } catch (error) {
    console.error('Bulk update log subcategory status error:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
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