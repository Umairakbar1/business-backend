import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
import { categoryValidator } from '../../validators/admin.js';
import { successResponseHelper, errorResponseHelper, generateSlug } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';

const createCategory = async (req, res) => {
  try {
    const { error, value } = categoryValidator.validate(req.body);
    if (error) {
      return errorResponseHelper(res, { message: error.details[0].message, code: '00400' });
    }

    // Generate slug from title if not provided
    if (!value.slug) {
      value.slug = generateSlug(value.title);
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ 
      title: { $regex: new RegExp(`^${value.title}$`, 'i') } 
    });
    
    if (existingCategory) {
      return errorResponseHelper(res, { message: 'Category with this name already exists', code: '00400' });
    }

    // Check if slug already exists
    const existingSlug = await Category.findOne({ slug: value.slug });
    if (existingSlug) {
      return errorResponseHelper(res, { message: 'Category with this slug already exists', code: '00400' });
    }

    // Handle image upload to Cloudinary
    if (req.file) {
      try {
        console.log('Starting image upload for category:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/categories');
        value.image = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Category image upload successful:', value.image.public_id);
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

    const category = new Category(value);
    await category.save();

    // Handle subcategories if provided
    if (req.body.subcategories && Array.isArray(req.body.subcategories)) {
      const subcategoryPromises = req.body.subcategories.map(subcat => {
        // Generate slug for subcategory
        const subCategorySlug = generateSlug(subcat.title || subcat.subCategoryName);
        
        return new SubCategory({
          title: subcat.title || subcat.subCategoryName,
          slug: subCategorySlug,
          description: subcat.description,
          categoryId: category._id,
          isActive: subcat.isActive !== undefined ? subcat.isActive : (subcat.status === 'active'),
          createdBy: req.user.id
        }).save();
      });

      await Promise.all(subcategoryPromises);
    }

    return successResponseHelper(res, {
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const getAllCategories = async (req, res) => {
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
    
    const categories = await Category.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('parentCategory', 'title');

    const total = await Category.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    return successResponseHelper(res, {
      message: 'Categories retrieved successfully',
      data:categories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id).populate('parentCategory', 'title');
    
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    return successResponseHelper(res, {
      message: 'Category retrieved successfully',
      category
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, { message: 'Invalid category ID', code: '00400' });
    }
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};


const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = categoryValidator.validate(req.body);
    
    if (error) {
      return errorResponseHelper(res, { message: error.details[0].message, code: '00400' });
    }

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    // Generate slug from title if not provided
    if (!value.slug) {
      value.slug = generateSlug(value.title);
    }

    // Check if category with same name already exists (excluding current category)
    const duplicateCategory = await Category.findOne({ 
      title: { $regex: new RegExp(`^${value.title}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (duplicateCategory) {
      return errorResponseHelper(res, { message: 'Category with this name already exists', code: '00400' });
    }

    // Check if slug already exists (excluding current category)
    const duplicateSlug = await Category.findOne({ 
      slug: value.slug,
      _id: { $ne: id }
    });
    if (duplicateSlug) {
      return errorResponseHelper(res, { message: 'Category with this slug already exists', code: '00400' });
    }

    // Handle image upload and deletion of previous image
    if (req.file) {
      try {
        console.log('Starting image upload for category update:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        // Delete old image from Cloudinary if it exists
        if (existingCategory.image && existingCategory.image.public_id) {
          try {
            await deleteFile(existingCategory.image.public_id, 'image');
            console.log('Old category image deleted successfully:', existingCategory.image.public_id);
          } catch (deleteError) {
            console.error('Error deleting old category image:', deleteError);
            // Continue with upload even if deletion fails
          }
        }

        // Upload new image to Cloudinary
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/categories');
        value.image = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Category image upload successful for update:', value.image.public_id);
      } catch (uploadError) {
        console.error('Cloudinary upload error details for category update:', {
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

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { ...value, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('parentCategory', 'title');

    return successResponseHelper(res, {
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, { message: 'Invalid category ID', code: '00400' });
    }
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    // Check if category has children
    const hasChildren = await Category.findOne({ parent: id });
    if (hasChildren) {
      return errorResponseHelper(res, { message: 'Cannot delete category with subcategories. Please move or delete subcategories first.', code: '00400' });
    }

    // Check if category has subcategories
    const subcategories = await SubCategory.find({ categoryId: id });
    
    // const subcategoryIds = subcategories.map(sub => sub._id);
    // const hasProducts = await Product.findOne({ subcategory: { $in: subcategoryIds } });
    // if (hasProducts) {
    //   return errorResponseHelper(res, 400, 'Cannot delete category that has subcategories being used by products');
    // }

    // Delete all subcategories first
    if (subcategories.length > 0) {
      await SubCategory.deleteMany({ categoryId: id });
    }

    // Delete category image if it exists
    if (category.image && category.image.public_id) {
      try {
        await deleteFile(category.image.public_id, 'image');
        console.log('Category image deleted successfully:', category.image.public_id);
      } catch (deleteError) {
        console.error('Error deleting category image:', deleteError);
      }
    }

    // const hasProducts = await Product.findOne({ category: id });
    // if (hasProducts) {
    //   return errorResponseHelper(res, 400, 'Cannot delete category that is being used by products');
    // }

    await Category.findByIdAndDelete(id);

    return successResponseHelper(res, {
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, { message: 'Invalid category ID', code: '00400' });
    }
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const getCategoryHierarchy = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' }).sort('title');
    
    // Build hierarchy
    const buildHierarchy = (parentId = null) => {
      return categories
        .filter(cat => String(cat.parentCategory) === String(parentId))
        .map(cat => ({
          ...cat.toObject(),
          children: buildHierarchy(cat._id)
        }));
    };

    const hierarchy = buildHierarchy();

    return successResponseHelper(res, {
      message: 'Category hierarchy retrieved successfully',
      hierarchy
    });
  } catch (error) {
    console.error('Get category hierarchy error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const bulkUpdateStatus = async (req, res) => {
  try {
    const { categoryIds, status } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return errorResponseHelper(res, { message: 'Category IDs array is required', code: '00400' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return errorResponseHelper(res, { message: 'Status must be either "active" or "inactive"', code: '00400' });
    }

    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { status, updatedAt: Date.now() }
    );

    return successResponseHelper(res, {
      message: `Status updated for ${result.modifiedCount} categories`
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
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
