import LogSubCategory from '../../models/admin/logSubCategory.js';
import LogCategory from '../../models/admin/logCategory.js';
import Blog from '../../models/admin/blog.js';
import { successResponseHelper, errorResponseHelper, generateSlug } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';

const createLogSubCategory = async (req, res) => {
  try {
    const { title, description, categoryId, status = 'active' } = req.body;

    if (!title) {
      return errorResponseHelper(res, {message:'Subcategory name is required', code:'00400'});
    }

    if (!categoryId) {
      return errorResponseHelper(res, {message:'Category ID is required', code:'00400'});
    }

    // Generate slug from title
    const slug = generateSlug(title);

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

    // Check if slug already exists
    const existingSlug = await LogSubCategory.findOne({ slug });
    if (existingSlug) {
      return errorResponseHelper(res, {message:'Subcategory with this slug already exists', code:'00400'});
    }

    // Handle image upload to Cloudinary
    let imageData = null;
    if (req.file) {
      try {
        console.log('Starting image upload for log subcategory:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/log-subcategories');
        imageData = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Log subcategory image upload successful:', imageData.public_id);
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

    const subCategory = new LogSubCategory({
      title,
      slug,
      description,
      image: imageData,
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
      queryText,
      categoryId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Search filter
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

    return successResponseHelper(res, {message:'Log subcategories retrieved successfully', data: subCategories, pagination});
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
    const { title, description, categoryId, status } = req.body;

    const subCategory = await LogSubCategory.findById(id);
    if (!subCategory) {
      return errorResponseHelper(res, {message:'Log subcategory not found', code:'00404'});
    }

    // Check if category exists if categoryId is being updated
    if (categoryId && categoryId !== subCategory.categoryId.toString()) {
      const category = await LogCategory.findById(categoryId);
      if (!category) {
        return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
      }
    }

    // Check if subcategory with same name exists in the same category
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

    // Generate slug from title if title is being updated
    if (title && title !== subCategory.title) {
      const newSlug = generateSlug(title);
      
      // Check if slug already exists (excluding current subcategory)
      const existingSlug = await LogSubCategory.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existingSlug) {
        return errorResponseHelper(res, {message:'Subcategory with this slug already exists', code:'00400'});
      }
      
      subCategory.slug = newSlug;
    }

    // Handle image upload and deletion of previous image
    if (req.file) {
      try {
        console.log('Starting image upload for log subcategory update:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        // Delete old image from Cloudinary if it exists
        if (subCategory.image && subCategory.image.public_id) {
          try {
            await deleteFile(subCategory.image.public_id, 'image');
            console.log('Old log subcategory image deleted successfully:', subCategory.image.public_id);
          } catch (deleteError) {
            console.error('Error deleting old log subcategory image:', deleteError);
            // Continue with upload even if deletion fails
          }
        }

        // Upload new image to Cloudinary
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/log-subcategories');
        subCategory.image = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Log subcategory image upload successful for update:', subCategory.image.public_id);
      } catch (uploadError) {
        console.error('Cloudinary upload error details for log subcategory update:', {
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
    if (description !== undefined) subCategory.description = description;
    if (categoryId) subCategory.categoryId = categoryId;
    if (status) subCategory.status = status;
    
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

    // Check if subcategory is being used by any blogs
    const blogCount = await Blog.countDocuments({ subCategory: id });
    if (blogCount > 0) {
      return errorResponseHelper(res, { 
        message: `Cannot delete log subcategory because it is linked to ${blogCount} blog(s). Please archive the subcategory instead or reassign blogs to another subcategory first.`, 
        code: '00400',
        data: { blogCount }
      });
    }

    // Delete subcategory image from Cloudinary if it exists
    if (subCategory.image && subCategory.image.public_id) {
      try {
        await deleteFile(subCategory.image.public_id, 'image');
        console.log('Log subcategory image deleted successfully:', subCategory.image.public_id);
      } catch (deleteError) {
        console.error('Error deleting log subcategory image:', deleteError);
        // Continue with deletion even if image deletion fails
      }
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
    const {queryText, status,page,limit,sortBy,sortOrder} = req.query;
    const query = {};
    if (queryText) {
      query.title = { $regex: queryText, $options: 'i' };
    }
    if (status) {
      query.status = status;
    } 
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await LogSubCategory.countDocuments({ categoryId, ...query });
    const totalPages = Math.ceil(total / parseInt(limit));
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
      ...query
      })
    .populate('categoryId', 'title')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

    return successResponseHelper(res, {message:'Log subcategories retrieved successfully', 
      data:subCategories, 
      category,
      pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
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

    // Get updated subcategories with complete details
    const updatedSubCategories = await LogSubCategory.find({ _id: { $in: subCategoryIds } })
      .populate('categoryId', 'title description')
      .populate('createdBy', 'title email')
      .populate('updatedBy', 'title email');

    return successResponseHelper(res, {
      message: `Updated ${result.modifiedCount} log subcategories successfully`,
      data: updatedSubCategories,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update log subcategory status error:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

// Single status change for log subcategory
const changeLogSubCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, { message: 'Valid status is required (active/inactive)', code: '00400' });
    }
    
    const subCategory = await LogSubCategory.findByIdAndUpdate(
      id, 
      { 
        status,
        updatedAt: new Date()
      }, 
      { new: true }
    ).populate('categoryId', 'title description');
    
    if (!subCategory) {
      return errorResponseHelper(res, { message: 'Log subcategory not found', code: '00404' });
    }

    return successResponseHelper(res, { 
      message: `Log subcategory status updated to ${status} successfully`, 
      data: subCategory 
    });
  } catch (error) {
    console.error('Change log subcategory status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  } 
};

export {
  createLogSubCategory,
  getAllLogSubCategories,
  getLogSubCategoryById,
  updateLogSubCategory,
  deleteLogSubCategory,
  getLogSubCategoriesByCategory,
  bulkUpdateLogSubCategoryStatus,
  changeLogSubCategoryStatus
}; 