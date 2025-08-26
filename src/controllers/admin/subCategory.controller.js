import SubCategory from '../../models/admin/subCategory.js';
import Category from '../../models/admin/category.js';
import { subCategoryValidator, subCategoryUpdateValidator } from '../../validators/admin.js';
import { successResponseHelper, errorResponseHelper, generateSlug } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';
// import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const createSubCategory = async (req, res) => {
  try {
    console.log(req.body, "req.body");
    const { error, value } = subCategoryValidator.validate(req.body);
    if (error) {
      return errorResponseHelper(res, { message: error.details[0].message, code: '00400' });
    }

    const { title, description, categoryId, status = 'active' } = value;

    // Generate slug from title if not provided
    if (!value.slug) {
      value.slug = generateSlug(title);
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    // Check if subcategory with same name exists in the same category
    const existingSubCategory = await SubCategory.findOne({
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      categoryId
    });

    if (existingSubCategory) {
      return errorResponseHelper(res, { message: 'Subcategory with this name already exists in this category', code: '00400' });
    }

    // Check if slug already exists
    const existingSlug = await SubCategory.findOne({ slug: value.slug });
    if (existingSlug) {
      return errorResponseHelper(res, { message: 'Subcategory with this slug already exists', code: '00400' });
    }

    // Handle image upload to Cloudinary
    if (req.file) {
      try {
        console.log('Starting image upload for subcategory:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/subcategories');
        value.image = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Subcategory image upload successful:', value.image.public_id);
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
    }

    const subCategory = new SubCategory({
      title,
      slug: value.slug,
      description,
      categoryId,
      status,
      // image: value.image,
      createdBy: req.user.id
    });

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'title');

    return successResponseHelper(res, {
      message: 'Subcategory created successfully',
      data:subCategory
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
      return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const getAllSubCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      queryText,
      categoryId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // search filter
    if (queryText) {
      query.title = { $regex: queryText, $options: 'i' };
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

    const subCategories = await SubCategory.find(query)
      .populate('categoryId', 'title')
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

    return successResponseHelper(res, {
      message: 'Subcategories retrieved successfully',
      data:subCategories,
      pagination
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const {queryText, status} = req.query;
    const query = {};
    if (queryText) {
      query.title = { $regex: queryText, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }
    const subCategory = await SubCategory.findById(id)
      .populate('categoryId', 'title description')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
      subCategory.filter(query);  
      const total = await SubCategory.countDocuments(query);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };
      
    if (!subCategory) {
      return errorResponseHelper(res, { message: 'Subcategory not found', code: '00404' });
    }

    return successResponseHelper(res, {
      message: 'Subcategory retrieved successfully',
      data:subCategory,
      pagination
    });
    
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = subCategoryUpdateValidator.validate(req.body);
    
    if (error) {
      return errorResponseHelper(res, { message: error.details[0].message, code: '00400' });
    }

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, { message: 'Subcategory not found', code: '00404' });
    }

    const { title, description, categoryId, status } = value;

    // Generate slug from title if not provided or if title is being updated
    if (!value.slug && title) {
      value.slug = generateSlug(title);
    } else if (title && title !== subCategory.title) {
      // If title is being updated, regenerate slug
      value.slug = generateSlug(title);
    }

    // If categoryId is being updated, check if new category exists
    if (categoryId && categoryId !== subCategory.categoryId.toString()) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
      }
    }

    // Check for duplicate name in the same category
    if (title && title !== subCategory.title) {
      const existingSubCategory = await SubCategory.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        categoryId: categoryId || subCategory.categoryId,
        _id: { $ne: id }
      });

      if (existingSubCategory) {
        return errorResponseHelper(res, { message: 'Subcategory with this name already exists in this category', code: '00400' });
      }
    }

    // Check for duplicate slug (excluding current subcategory)
    if (value.slug && value.slug !== subCategory.slug) {
      const existingSlug = await SubCategory.findOne({
        slug: value.slug,
        _id: { $ne: id }
      });

      if (existingSlug) {
        return errorResponseHelper(res, { message: 'Subcategory with this slug already exists', code: '00400' });
      }
    }

    // Handle image upload and deletion of previous image
    if (req.file) {
      try {
        console.log('Starting image upload for subcategory update:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        // Delete old image from Cloudinary if it exists
        if (subCategory.image && subCategory.image.public_id) {
          try {
            await deleteFile(subCategory.image.public_id, 'image');
            console.log('Old subcategory image deleted successfully:', subCategory.image.public_id);
          } catch (deleteError) {
            console.error('Error deleting old subcategory image:', deleteError);
            // Continue with upload even if deletion fails
          }
        }

        // Upload new image to Cloudinary
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/subcategories');
        value.image = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Subcategory image upload successful for update:', value.image.public_id);
      } catch (uploadError) {
        console.error('Cloudinary upload error details for subcategory update:', {
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
    }

    // Update fields
    if (title) subCategory.title = title;
    if (value.slug) subCategory.slug = value.slug;
    if (description !== undefined) subCategory.description = description;
    if (categoryId) subCategory.categoryId = categoryId;
    if (status !== undefined) subCategory.status = status;
    if (value.image) subCategory.image = value.image;
    
    subCategory.updatedBy = req.user.id;
    subCategory.updatedAt = new Date();

    await subCategory.save();

    // Populate category details
    await subCategory.populate('categoryId', 'title');

    return successResponseHelper(res, {
      message: 'Subcategory updated successfully',
      data:subCategory
    });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, { message: 'Subcategory not found', code: '00404' });
    }

    // Delete subcategory image from Cloudinary if it exists
    if (subCategory.image && subCategory.image.public_id) {
      try {
        await deleteFile(subCategory.image.public_id, 'image');
        console.log('Subcategory image deleted successfully:', subCategory.image.public_id);
      } catch (deleteError) {
        console.error('Error deleting subcategory image:', deleteError);
        // Continue with deletion even if image deletion fails
      }
    }

    // const productsUsingSubCategory = await Product.countDocuments({ subCategoryId: id });
    // if (productsUsingSubCategory > 0) {
    //   return errorResponseHelper(res, 400, 'Cannot delete subcategory. It is being used by products.');
    // }

    await SubCategory.findByIdAndDelete(id);

    return successResponseHelper(res, {
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.query;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    const query = { categoryId };

    if (status !== undefined) {
      query.status = status;
    }

    const subCategories = await SubCategory.find(query)
      .populate('categoryId', 'title')
      .sort({ title: 1 });

    return successResponseHelper(res, {
      message: 'Subcategories retrieved successfully',
      data:subCategories,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: subCategories.length,
        itemsPerPage: subCategories.length
      }
    });
  } catch (error) {
    console.error('Error fetching subcategories by category:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const bulkUpdateStatus = async (req, res) => {
  try {
    const { subCategoryIds, status } = req.body;

    if (!Array.isArray(subCategoryIds) || subCategoryIds.length === 0) {
      return errorResponseHelper(res, { message: 'Subcategory IDs array is required', code: '00400' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, { message: 'Status must be either "active" or "inactive"', code: '00400' });
    }

    const result = await SubCategory.updateMany(
      { _id: { $in: subCategoryIds } },
      { 
        status,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }
    );

    // Get updated subcategories with category details
    const updatedSubCategories = await SubCategory.find({ _id: { $in: subCategoryIds } })
      .populate('categoryId', 'title description')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    return successResponseHelper(res, {
      message: `${result.modifiedCount} subcategories updated successfully`,
      data: updatedSubCategories,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating subcategories:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// Single status change for subcategory
const changeSubCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, { message: 'Status must be either "active" or "inactive"', code: '00400' });
    }
    
    const subCategory = await SubCategory.findByIdAndUpdate(
      id, 
      { 
        status,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }, 
      { new: true }
    ).populate('categoryId', 'title description')
     .populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');
    
    if (!subCategory) {
      return errorResponseHelper(res, { message: 'Subcategory not found', code: '00404' });
    }

    return successResponseHelper(res, { 
      message: 'Subcategory status updated successfully', 
      data: subCategory 
    });
  } catch (error) {
    console.error('Change subcategory status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  } 
};

export {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategory,
  bulkUpdateStatus,
  changeSubCategoryStatus
};
