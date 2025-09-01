import LogCategory from '../../models/admin/logCategory.js';
import LogSubCategory from '../../models/admin/logSubCategory.js';
import Blog from '../../models/admin/blog.js';
import { successResponseHelper, errorResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';

const createLogCategory = async (req, res) => {
  try {
    const { title, description, status = 'active', parent } = req.body;

    console.log('=== CREATE LOG CATEGORY START ===');
    console.log('Title:', title);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('User:', req.user);
    
    if (!title) {
      return errorResponseHelper(res, {message:'Category is required', code:'00400'});
    }

    // Check if category with same name already exists
    const existingCategory = await LogCategory.findOne({ 
      title: { $regex: new RegExp(`^${title}$`, 'i') } 
    });
    
    if (existingCategory) {
      return errorResponseHelper(res, {message:'Category with this name already exists', code:'00400'});
    }

    // Handle image upload to Cloudinary
    let imageData = null;
    if (req.file) {
      try {
        console.log('Starting image upload for log category:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          bufferLength: req.file.buffer ? req.file.buffer.length : 'No buffer'
        });
        
        // Use a simpler folder structure to avoid potential Cloudinary folder issues
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/log-categories');
        
        console.log('Upload result:', uploadResult);
        
        imageData = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Image upload successful:', imageData.public_id);
      } catch (uploadError) {
        console.error('Cloudinary upload error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
          fileName: req.file?.originalname,
          fileSize: req.file?.size,
          bufferLength: req.file?.buffer?.length
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
    } else {
      console.log('No image file provided');
    }

    console.log('Creating category with data:', {
      title,
      description,
      image: imageData,
      status,
      parent
    });

    const category = new LogCategory({
      title,
      description,
      image: imageData,
      status,
      parent
    });
    
    console.log('Category object created, saving to database...');
    await category.save();
    console.log('Category saved successfully:', category._id);

    // Handle subcategories if provided
    if (req.body.subcategories && Array.isArray(req.body.subcategories)) {
      console.log('Processing subcategories:', req.body.subcategories.length);
      const subcategoryPromises = req.body.subcategories.map(subcat => {
        return new LogSubCategory({
          title: subcat.title,
          description: subcat.description,
          categoryId: category._id,
          status: subcat.status || 'active',
          createdBy: req.user.id
        }).save();
      });

      await Promise.all(subcategoryPromises);
      console.log('Subcategories saved successfully');
    }

    console.log('=== CREATE LOG CATEGORY SUCCESS ===');
    return successResponseHelper(res, {message:'Log category created successfully', data:category});
  } catch (error) {
    console.error('=== CREATE LOG CATEGORY ERROR ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const getAllLogCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = {};
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
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
      .populate('parent', 'title');

    // Get subcategories for all categories
    const categoryIds = categories.map(cat => cat._id);
    const subcategories = await LogSubCategory.find({ 
      categoryId: { $in: categoryIds },
      status: 'active'
    }).select('title description status categoryId createdAt');

    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });

    // Attach subcategories to each category
    const categoriesWithSubcategories = categories.map(category => ({
      ...category.toObject(),
      subcategories: subcategoriesByCategory[category._id.toString()] || []
    }));

    const total = await LogCategory.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    return successResponseHelper(res,{
      message:'Log categories retrieved successfully',
      data: categoriesWithSubcategories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all log categories error:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const getLogCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await LogCategory.findById(id).populate('parent', 'title');
    
    if (!category) {
      return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
    }

    // Get subcategories for this category
    const subcategories = await LogSubCategory.find({ 
      categoryId: id,
      status: 'active'
    }).select('title description status categoryId createdAt');

    // Attach subcategories to the category
    const categoryWithSubcategories = {
      ...category.toObject(),
      subcategories: subcategories
    };

    return successResponseHelper(res, {message:'Log category retrieved successfully', data: categoryWithSubcategories});
  } catch (error) {
    console.error('Get log category by ID error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, {message:'Invalid log category ID', code:'00400'});
    }
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const updateLogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, parent } = req.body;
    
    // Check if category exists
    const existingCategory = await LogCategory.findById(id);
    if (!existingCategory) {
      return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
    }

    // Check if category with same name already exists (excluding current category)
    if (title && title !== existingCategory.title) {
      const duplicateCategory = await LogCategory.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (duplicateCategory) {
        return errorResponseHelper(res, {message:'Log category with this name already exists', code:'00400'});
      }
    }

    // Prevent circular reference if updating parent
    if (parent && parent.toString() === id) {
      return errorResponseHelper(res, {message:'Category cannot be its own parent', code:'00400'});
    }

    // Handle image upload to Cloudinary
    let imageData = existingCategory.image; // Keep existing image if no new upload
    if (req.file) {
      try {
        console.log('Starting image upload for log category update:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        // Delete old image from Cloudinary if it exists
        if (existingCategory.image && existingCategory.image.public_id) {
          try {
            await deleteFile(existingCategory.image.public_id, 'image');
            console.log('Old image deleted successfully:', existingCategory.image.public_id);
          } catch (deleteError) {
            console.error('Error deleting old image:', deleteError);
            // Continue with upload even if deletion fails
          }
        }

        // Upload new image to Cloudinary
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/log-categories');
        imageData = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Image upload successful for update:', imageData.public_id);
      } catch (uploadError) {
        console.error('Cloudinary upload error details (update):', {
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

    const updatedCategory = await LogCategory.findByIdAndUpdate(
      id,
      { 
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(imageData && { image: imageData }),
        ...(status && { status }),
        ...(parent !== undefined && { parent }),
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    ).populate('parent', 'title');

    return successResponseHelper(res, {message:'Log category updated successfully', data:updatedCategory});
  } catch (error) {
    console.error('Update log category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, {message:'Invalid log category ID', code:'00400'});
    }
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const deleteLogCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await LogCategory.findById(id);
    if (!category) {
      return errorResponseHelper(res, {message:'Log category not found', code:'00404'});
    }

    // Check if category has children
    const hasChildren = await LogCategory.findOne({ parent: id });
    if (hasChildren) {
      return errorResponseHelper(res, {message:'Cannot delete category with subcategories. Please move or delete subcategories first.', code:'00400'});
    }

    // Check if category has subcategories
    const subcategories = await LogSubCategory.find({ categoryId: id });
    
    // Check if category is being used by any blogs
    const blogCount = await Blog.countDocuments({ category: id });
    if (blogCount > 0) {
      return errorResponseHelper(res, { 
        message: `Cannot delete log category because it is linked to ${blogCount} blog(s). Please archive the category instead or reassign blogs to another category first.`, 
        code: '00400',
        data: { blogCount }
      });
    }
    
    // Delete all subcategories first
    if (subcategories.length > 0) {
      await LogSubCategory.deleteMany({ categoryId: id });
    }

    // Delete image from Cloudinary if it exists
    if (category.image && category.image.public_id) {
      try {
        await deleteFile(category.image.public_id, 'image');
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
        // Continue with deletion even if image deletion fails
      }
    }

    await LogCategory.findByIdAndDelete(id);

    return successResponseHelper(res, {message:'Log category deleted successfully'});
  } catch (error) {
    console.error('Delete log category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, {message:'Invalid log category ID', code:'00400'});
    }
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const getLogCategoryHierarchy = async (req, res) => {
  try {
    const categories = await LogCategory.find({ status: 'active' }).sort('title');
    
    // Get all subcategories for active categories
    const categoryIds = categories.map(cat => cat._id);
    const subcategories = await LogSubCategory.find({ 
      categoryId: { $in: categoryIds },
      status: 'active'
    }).select('title description status categoryId createdAt');

    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });

    const buildHierarchy = (parentId = null) => {
      return categories
        .filter(cat => String(cat.parent) === String(parentId))
        .map(cat => ({
          ...cat.toObject(),
          subcategories: subcategoriesByCategory[cat._id.toString()] || [],
          children: buildHierarchy(cat._id)
        }));
    };

    const hierarchy = buildHierarchy();
    return successResponseHelper(res, {message:'Log category hierarchy retrieved successfully', data: hierarchy});
  } catch (error) {
    console.error('Get log category hierarchy error:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

const bulkUpdateLogCategoryStatus = async (req, res) => {
  try {
    const { categoryIds, status } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return errorResponseHelper(res, {message:'Category IDs array is required', code:'00400'});
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, {message:'Valid status is required (active/inactive)', code:'00400'});
    }

    // Update categories status
    const result = await LogCategory.updateMany(
      { _id: { $in: categoryIds } },
      { status, updatedAt: Date.now() }
    );

    // Update subcategories status based on category status
    if (status === 'active') {
      await LogSubCategory.updateMany({ categoryId: { $in: categoryIds } }, { status: 'active' });
    } else {
      await LogSubCategory.updateMany({ categoryId: { $in: categoryIds } }, { status: 'inactive' });
    }

    // Get updated categories with subcategories
    const updatedCategories = await LogCategory.find({ _id: { $in: categoryIds } })
      .populate('parent', 'title');

    // Get subcategories for all updated categories
    const subcategories = await LogSubCategory.find({ 
      categoryId: { $in: categoryIds },
      status: status === 'active' ? 'active' : 'inactive'
    }).select('title description status categoryId createdAt');

    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });

    // Attach subcategories to each category
    const categoriesWithSubcategories = updatedCategories.map(category => ({
      ...category.toObject(),
      subcategories: subcategoriesByCategory[category._id.toString()] || []
    }));

    return successResponseHelper(res, {
      message: `Updated ${result.modifiedCount} log categories successfully`,
      data: categoriesWithSubcategories,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update log category status error:', error);
    return errorResponseHelper(res, {message:'Internal server error', code:'00500'});
  }
};

// Single status change for log category
const changeLogCategoryStatus = async (req, res) => {
  try {
    const { id, status } = req.params;
    const category = await LogCategory.findByIdAndUpdate(id, { status }, { new: true })
      .populate('parent', 'title');
    
    if (!category) {
      return errorResponseHelper(res, { message: 'Log category not found', code: '00404' });
    }

    // Update subcategories status based on category status
    if (status === 'active') {
      await LogSubCategory.updateMany({ categoryId: id }, { status: 'active' });
    } else {
      await LogSubCategory.updateMany({ categoryId: id }, { status: 'inactive' });
    }

    // Get subcategories for this category
    const subcategories = await LogSubCategory.find({ 
      categoryId: id,
      status: status === 'active' ? 'active' : 'inactive'
    }).select('title description status categoryId createdAt');

    // Attach subcategories to the category
    const categoryWithSubcategories = {
      ...category.toObject(),
      subcategories: subcategories
    };

    return successResponseHelper(res, { 
      message: 'Log category status updated successfully', 
      data: categoryWithSubcategories 
    });
  } catch (error) {
    console.error('Change log category status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  } 
};

export {
  createLogCategory,
  getAllLogCategories,
  getLogCategoryById,
  updateLogCategory,
  deleteLogCategory,
  getLogCategoryHierarchy,
  bulkUpdateLogCategoryStatus,
  changeLogCategoryStatus
}; 