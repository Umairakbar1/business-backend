import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
import Business from '../../models/business/business.js';
import Blog from '../../models/admin/blog.js';
import { categoryValidator } from '../../validators/admin.js';
import { successResponseHelper, errorResponseHelper, generateSlug } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, deleteFile } from '../../helpers/cloudinaryHelper.js';

const createCategory = async (req, res) => {
  try {
    // Create a copy of req.body without the image field for validation
    const validationData = { ...req.body };
    delete validationData.image;
    
    const { error, value } = categoryValidator.validate(validationData);
    if (error) {
      return errorResponseHelper(res, { message: error.details[0].message, code: '00400' });
    }

    // Generate slug from title
    value.slug = generateSlug(value.title);

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
        console.log('Starting image upload for category creation:', {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        // Check file size (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (req.file.size > maxSize) {
          return errorResponseHelper(res, { 
            message: 'Image size must be less than 5MB. Please choose a smaller image.', 
            code: '00400' 
          });
        }
        
        // Upload new image to Cloudinary
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/categories');
        value.image = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id
        };
        
        console.log('Category image upload successful for creation:', value.image.public_id);
      } catch (uploadError) {
        console.error('Cloudinary upload error details for category creation:', {
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
    // If no image is uploaded, don't set the image field (it's optional in the model)

    const category = new Category(value);
    await category.save();

    // Handle subcategories if provided
    let createdSubcategories = [];
    if (req.body.subcategories) {
      try {
        let subcategoriesArray = req.body.subcategories;
        
        // If subcategories is a JSON string (from FormData), parse it
        if (typeof subcategoriesArray === 'string') {
          try {
            subcategoriesArray = JSON.parse(subcategoriesArray);
          } catch (parseError) {
            console.error('Error parsing subcategories JSON:', parseError);
            return errorResponseHelper(res, { message: 'Invalid subcategories format', code: '00400' });
          }
        }
        
        // Check if it's an array
        if (Array.isArray(subcategoriesArray)) {
          console.log('Processing subcategories for creation:', subcategoriesArray.length);
          
          const subcategoryPromises = subcategoriesArray.map(subcat => {
            // Generate slug for subcategory
            const subCategorySlug = generateSlug(subcat.title || subcat.subCategoryName);
            
            return new SubCategory({
              title: subcat.title || subcat.subCategoryName,
              slug: subCategorySlug,
              description: subcat.description,
              categoryId: category._id,
              status: subcat.status || 'active',
              createdBy: req.user.id
            }).save();
          });

          createdSubcategories = await Promise.all(subcategoryPromises);
          console.log('Subcategories created successfully:', createdSubcategories.length);
        }
      } catch (subcategoryError) {
        console.error('Error creating subcategories:', subcategoryError);
        return errorResponseHelper(res, { message: 'Failed to create subcategories', code: '00500' });
      }
    }

    // Get all subcategories for this category (including any existing ones)
    const allSubcategories = await SubCategory.find({ 
      categoryId: category._id 
    }).select('title slug description image status categoryId');

    // Get business count for this category
    const businessCount = await Business.countDocuments({ category: category._id });

    // Prepare response data with subcategories
    const categoryWithSubcategories = {
      ...category.toObject(),
      subcategories: allSubcategories,
      businessCount: businessCount
    };

    return successResponseHelper(res, {
      message: 'Category created successfully',
      data: categoryWithSubcategories
    });
  } catch (error) {
    console.error('Create category error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = {};
    if (queryText && queryText.trim() !== '') {
      filter.title = { $regex: queryText, $options: 'i' };
    }
    if (status && status.trim() !== '') {
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

    // Get subcategories for all categories
    const categoryIds = categories.map(cat => cat._id);
    const subcategories = await SubCategory.find({ 
      categoryId: { $in: categoryIds }
    }).select('title slug description image status categoryId');
    
    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });

    // Get business count for each category
    const businessCountPromises = categories.map(category => 
      Business.countDocuments({ category: category._id })
    );
    const businessCounts = await Promise.all(businessCountPromises);

    // Attach subcategories and business count to each category
    const categoriesWithSubcategories = categories.map((category, index) => ({
      ...category.toObject(),
      subcategories: subcategoriesByCategory[category._id.toString()] || [],
      businessCount: businessCounts[index]
    }));

    const total = await Category.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    return successResponseHelper(res, {
      message: 'Categories retrieved successfully',
      data: categoriesWithSubcategories,
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

    // Get subcategories for this category
    const subcategories = await SubCategory.find({ 
      categoryId: id
    }).select('title slug description image status createdAt');

    // Get business count for this category
    const businessCount = await Business.countDocuments({ category: id });

    // Attach subcategories and business count to the category
    const categoryWithSubcategories = {
      ...category.toObject(),
      subcategories: subcategories,
      businessCount: businessCount
    };

    return successResponseHelper(res, {
      message: 'Category retrieved successfully',
      data: categoryWithSubcategories
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
    
    // Clean the request body to remove fields that shouldn't be validated
    const cleanBody = { ...req.body };
    
    // Remove subcategories and businessCount from validation as they come from getAllCategories response
    delete cleanBody.subcategories;
    delete cleanBody.businessCount;
    
    // Remove image field from validation if we're uploading a new file
    if (req.file) {
      delete cleanBody.image;
    } else if (cleanBody.image && typeof cleanBody.image === 'object' && cleanBody.image.url) {
      // If image is an object (from getAllCategories response), extract the URL for validation
      cleanBody.image = cleanBody.image.url;
    }
    
    const { error, value } = categoryValidator.validate(cleanBody);
    if (error) {
      return errorResponseHelper(res, { message: error.details[0].message, code: '00400' });
    }

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    // Generate slug from title
    value.slug = generateSlug(value.title);

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
        
        // Check file size (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (req.file.size > maxSize) {
          return errorResponseHelper(res, { 
            message: 'Image size must be less than 5MB. Please choose a smaller image.', 
            code: '00400' 
          });
        }
        
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
    } else {
      // If no new image is uploaded, preserve the existing image object
      // Remove image from value to avoid validation issues, we'll handle it separately
      delete value.image;
    }

    // Handle subcategories if provided
    let updatedSubcategories = [];
    if (req.body.subcategories) {
      try {
        let subcategoriesArray = req.body.subcategories;
        
        // If subcategories is a JSON string (from FormData), parse it
        if (typeof subcategoriesArray === 'string') {
          try {
            subcategoriesArray = JSON.parse(subcategoriesArray);
          } catch (parseError) {
            console.error('Error parsing subcategories JSON:', parseError);
            return errorResponseHelper(res, { message: 'Invalid subcategories format', code: '00400' });
          }
        }
        
        // Check if it's an array
        if (Array.isArray(subcategoriesArray)) {
          console.log('Processing subcategories for update:', subcategoriesArray.length);
          
          // Get existing subcategories for this category
          const existingSubcategories = await SubCategory.find({ categoryId: id });
          const existingSubcategoryMap = new Map();
          existingSubcategories.forEach(sub => {
            existingSubcategoryMap.set(sub._id.toString(), sub);
          });
          
          // Process each subcategory
          for (const subcat of subcategoriesArray) {
            if (subcat._id) {
              // Update existing subcategory
              const existingSub = existingSubcategoryMap.get(subcat._id);
              if (existingSub) {
                const subCategorySlug = generateSlug(subcat.title || subcat.subCategoryName);
                
                // Check for duplicate names (excluding current subcategory)
                const duplicateSub = await SubCategory.findOne({
                  title: { $regex: new RegExp(`^${subcat.title || subcat.subCategoryName}$`, 'i') },
                  categoryId: id,
                  _id: { $ne: subcat._id }
                });
                
                if (duplicateSub) {
                  return errorResponseHelper(res, { 
                    message: `Subcategory "${subcat.title || subcat.subCategoryName}" already exists in this category`, 
                    code: '00400' 
                  });
                }
                
                // Check for duplicate slug (excluding current subcategory)
                const duplicateSlug = await SubCategory.findOne({
                  slug: subCategorySlug,
                  _id: { $ne: subcat._id }
                });
                
                if (duplicateSlug) {
                  return errorResponseHelper(res, { 
                    message: `Subcategory with slug "${subCategorySlug}" already exists`, 
                    code: '00400' 
                  });
                }
                
                // Update the subcategory
                const updatedSub = await SubCategory.findByIdAndUpdate(
                  subcat._id,
                  {
                    title: subcat.title || subcat.subCategoryName,
                    slug: subCategorySlug,
                    description: subcat.description,
                    status: subcat.status || 'active',
                    updatedBy: req.user.id,
                    updatedAt: Date.now()
                  },
                  { new: true }
                );
                
                updatedSubcategories.push(updatedSub);
                existingSubcategoryMap.delete(subcat._id);
              }
            } else {
              // Create new subcategory
              const subCategorySlug = generateSlug(subcat.title || subcat.subCategoryName);
              
              // Check for duplicate names
              const duplicateSub = await SubCategory.findOne({
                title: { $regex: new RegExp(`^${subcat.title || subcat.subCategoryName}$`, 'i') },
                categoryId: id
              });
              
              if (duplicateSub) {
                return errorResponseHelper(res, { 
                  message: `Subcategory "${subcat.title || subcat.subCategoryName}" already exists in this category`, 
                  code: '00400' 
                });
              }
              
              // Check for duplicate slug
              const duplicateSlug = await SubCategory.findOne({ slug: subCategorySlug });
              if (duplicateSlug) {
                return errorResponseHelper(res, { 
                  message: `Subcategory with slug "${subCategorySlug}" already exists`, 
                  code: '00400' 
                });
              }
              
              const newSubcategory = new SubCategory({
                title: subcat.title || subcat.subCategoryName,
                slug: subCategorySlug,
                description: subcat.description,
                categoryId: id,
                status: subcat.status || 'active',
                createdBy: req.user.id
              });
              
              await newSubcategory.save();
              updatedSubcategories.push(newSubcategory);
            }
          }
          
          // Only delete subcategories that are explicitly marked for deletion
          // Check if any subcategories have a 'delete' flag or are marked as 'toDelete'
          const subcategoriesToDelete = subcategoriesArray.filter(subcat => 
            subcat._id && (subcat.delete === true || subcat.toDelete === true || subcat.status === 'delete')
          );
          
          if (subcategoriesToDelete.length > 0) {
            console.log('Deleting subcategories marked for deletion:', subcategoriesToDelete.map(s => s.title));
            
            const subcategoryIdsToDelete = subcategoriesToDelete.map(s => s._id);
            
            // Check if any of these subcategories are being used by businesses
            const businessesUsingSubcategories = await Business.find({
              subCategory: { $in: subcategoryIdsToDelete }
            });
            
            if (businessesUsingSubcategories.length > 0) {
              return errorResponseHelper(res, { 
                message: 'Cannot delete subcategories that are being used by businesses', 
                code: '00400' 
              });
            }
            
            // Delete subcategories
            await SubCategory.deleteMany({ _id: { $in: subcategoryIdsToDelete } });
          }
          
          // Add remaining existing subcategories that weren't updated or deleted
          const remainingExistingSubcategories = Array.from(existingSubcategoryMap.values());
          updatedSubcategories.push(...remainingExistingSubcategories);
        }
      } catch (subcategoryError) {
        console.error('Error handling subcategories:', subcategoryError);
        return errorResponseHelper(res, { 
          message: 'Error processing subcategories', 
          code: '00500' 
        });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { ...value, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('parentCategory', 'title');

    // Get all subcategories for this category (use updated subcategories if available, otherwise fetch from DB)
    let subcategories;
    if (updatedSubcategories.length > 0) {
      // Use the subcategories we just processed
      subcategories = updatedSubcategories;
    } else {
      // Fetch from database
      subcategories = await SubCategory.find({ 
        categoryId: updatedCategory._id 
      }).select('title slug description image status categoryId');
    }

    // Get business count for this category
    const businessCount = await Business.countDocuments({ category: updatedCategory._id });

    // Prepare response data with subcategories
    const categoryWithSubcategories = {
      ...updatedCategory.toObject(),
      subcategories: subcategories,
      businessCount: businessCount
    };

    return successResponseHelper(res, {
      message: 'Category updated successfully',
      data: categoryWithSubcategories
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
    
    // Check if category is being used by any businesses
    const businessCount = await Business.countDocuments({ category: id });
    if (businessCount > 0) {
      return errorResponseHelper(res, { 
        message: `Cannot delete category because it is linked to ${businessCount} business(es). Please archive the category instead or reassign businesses to another category first.`, 
        code: '00400',
        data: { businessCount }
      });
    }

    // Check if category is being used by any blogs
    const blogCount = await Blog.countDocuments({ category: id });
    if (blogCount > 0) {
      return errorResponseHelper(res, { 
        message: `Cannot delete category because it is linked to ${blogCount} blog(s). Please archive the category instead or reassign blogs to another category first.`, 
        code: '00400',
        data: { blogCount }
      });
    }
    
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

// single status change
const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Get status from request body instead of params
    
    if (!status || !['active', 'inactive', 'archived'].includes(status)) {
      return errorResponseHelper(res, { message: 'Status must be either "active", "inactive", or "archived"', code: '00400' });
    }
    
    const category = await Category.findByIdAndUpdate(id, { status }, { new: true })
      .populate('parentCategory', 'title');
     
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    // Update subcategories status to match category status
    await SubCategory.updateMany({ categoryId: id }, { status });

    // Get subcategories for this category (return all regardless of status)
    const subcategories = await SubCategory.find({ 
      categoryId: id
    }).select('title slug description image status categoryId');

    // Get business count for this category
    const businessCount = await Business.countDocuments({ category: id });

    // Attach subcategories and business count to the category (complete object like getAllCategories)
    const categoryWithSubcategories = {
      ...category.toObject(),
      subcategories: subcategories,
      businessCount: businessCount
    };

    return successResponseHelper(res, { 
      message: 'Category status updated successfully', 
      data: categoryWithSubcategories 
    });
  } catch (error) {
    console.error('Change status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  } 
};

const getCategoryHierarchy = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' }).sort('title');
    
    // Get all subcategories for active categories
    const categoryIds = categories.map(cat => cat._id);
    const subcategories = await SubCategory.find({ 
      categoryId: { $in: categoryIds }
    }).select('title slug description image status categoryId');

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
    const buildHierarchy = (parentId = null) => {
      return categories
        .filter(cat => String(cat.parentCategory) === String(parentId))
        .map(cat => ({
          ...cat.toObject(),
          subcategories: subcategoriesByCategory[cat._id.toString()] || [],
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

    if (!['active', 'inactive', 'archived'].includes(status)) {
      return errorResponseHelper(res, { message: 'Status must be either "active", "inactive", or "archived"', code: '00400' });
    }

    // Update categories status
    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { status, updatedAt: Date.now() }
    );

    // Update subcategories status to match category status
    await SubCategory.updateMany({ categoryId: { $in: categoryIds } }, { status });

    // Get updated categories with subcategories
    const updatedCategories = await Category.find({ _id: { $in: categoryIds } })
      .populate('parentCategory', 'title');

    // Get subcategories for all updated categories (return all regardless of status)
    const subcategories = await SubCategory.find({ 
      categoryId: { $in: categoryIds }
    }).select('title slug description image status categoryId');

    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });

    // Get business count for each category
    const businessCountPromises = updatedCategories.map(category => 
      Business.countDocuments({ category: category._id })
    );
    const businessCounts = await Promise.all(businessCountPromises);

    // Attach subcategories and business count to each category
    const categoriesWithSubcategories = updatedCategories.map((category, index) => ({
      ...category.toObject(),
      subcategories: subcategoriesByCategory[category._id.toString()] || [],
      businessCount: businessCounts[index]
    }));

    return successResponseHelper(res, {
      message: `Status updated for ${result.modifiedCount} categories`,
      data: categoriesWithSubcategories,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const archiveCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return errorResponseHelper(res, { message: 'Category not found', code: '00404' });
    }

    // Check if category is already archived
    if (category.status === 'archived') {
      return errorResponseHelper(res, { message: 'Category is already archived', code: '00400' });
    }

    // Archive the category (change status to archived)
    const archivedCategory = await Category.findByIdAndUpdate(
      id,
      { status: 'archived', updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('parentCategory', 'title');

    // Archive all subcategories of this category
    await SubCategory.updateMany({ categoryId: id }, { status: 'archived' });

    // Get subcategories for this category
    const subcategories = await SubCategory.find({ 
      categoryId: id
    }).select('title slug description image status categoryId');

    // Get business count for this category
    const businessCount = await Business.countDocuments({ category: id });

    // Attach subcategories and business count to the category
    const categoryWithSubcategories = {
      ...archivedCategory.toObject(),
      subcategories: subcategories,
      businessCount: businessCount
    };

    return successResponseHelper(res, {
      message: 'Category archived successfully',
      data: categoryWithSubcategories
    });
  } catch (error) {
    console.error('Archive category error:', error);
    if (error.kind === 'ObjectId') {
      return errorResponseHelper(res, { message: 'Invalid category ID', code: '00400' });
    }
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

const getArchivedCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object for archived categories
    const filter = { status: 'archived' };
    if (queryText && queryText.trim() !== '') {
      filter.title = { $regex: queryText, $options: 'i' };
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

    // Get subcategories for all categories
    const categoryIds = categories.map(cat => cat._id);
    const subcategories = await SubCategory.find({ 
      categoryId: { $in: categoryIds }
    }).select('title slug description image status categoryId');
    
    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub);
    });

    // Get business count for each category
    const businessCountPromises = categories.map(category => 
      Business.countDocuments({ category: category._id })
    );
    const businessCounts = await Promise.all(businessCountPromises);

    // Attach subcategories and business count to each category
    const categoriesWithSubcategories = categories.map((category, index) => ({
      ...category.toObject(),
      subcategories: subcategoriesByCategory[category._id.toString()] || [],
      businessCount: businessCounts[index]
    }));

    const total = await Category.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    return successResponseHelper(res, {
      message: 'Archived categories retrieved successfully',
      data: categoriesWithSubcategories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get archived categories error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  changeStatus,
  getCategoryHierarchy,
  bulkUpdateStatus,
  archiveCategory,
  getArchivedCategories
};
