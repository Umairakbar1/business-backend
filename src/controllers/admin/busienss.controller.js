import Business from '../../models/business/business.js';
import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// Get all businesses
export const getAllBusinesses = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, startDate, endDate } = req.query;
    const filter = {};

    console.log('Query parameters:', { page, limit, queryText, status, startDate, endDate });

    // Text search (businessName, owner name, email, phone, website)
    if (queryText) {
      // Simple direct search first
      filter.$or = [
        { businessName: { $regex: queryText, $options: 'i' } },
        { email: { $regex: queryText, $options: 'i' } },
        { phoneNumber: { $regex: queryText, $options: 'i' } },
        { website: { $regex: queryText, $options: 'i' } }
      ];
    }

    // Status filter - only apply if status is not 'all'
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Registration date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    console.log('Applied filter:', JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // First check if there are any businesses at all
    const totalCount = await Business.countDocuments();
    console.log('Total businesses in database:', totalCount);
    
    // Test the filter step by step
    if (Object.keys(filter).length > 0) {
      const filteredCount = await Business.countDocuments(filter);
      console.log('Businesses matching filter:', filteredCount);
      
      // If filter returns 0, let's see what's in the database
      if (filteredCount === 0) {
        const sampleBusinesses = await Business.find({}).limit(3);
        console.log('Sample businesses from database:', sampleBusinesses.map(b => ({
          id: b._id,
          businessName: b.businessName,
          email: b.email,
          phoneNumber: b.phoneNumber,
          status: b.status,
          createdAt: b.createdAt
        })));
      }
    }
    
    const businesses = await Business.find(filter)
      .populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('Found businesses:', businesses.length);
    if (businesses.length > 0) {
      console.log('Sample business:', {
        id: businesses[0]._id,
        businessName: businesses[0].businessName,
        category: businesses[0].category ? {
          id: businesses[0].category._id,
          title: businesses[0].category.title,
          slug: businesses[0].category.slug
        } : 'No category',
        subcategories: businesses[0].subcategories ? businesses[0].subcategories.map(sub => ({
          id: sub._id,
          title: sub.title,
          slug: sub.slug
        })) : [],
        status: businesses[0].status,
        hasOwner: !!businesses[0].businessOwner,
        ownerName: businesses[0].businessOwner ? `${businesses[0].businessOwner.firstName} ${businesses[0].businessOwner.lastName}` : 'No owner'
      });
    } else {
      console.log('No businesses found');
    }

    const total = await Business.countDocuments(filter);

    return successResponseHelper(res, {
      message: 'Businesses fetched successfully',
      data: businesses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        totalCount
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    console.error('Error stack:', error.stack);
    return errorResponseHelper(res, { message: 'Failed to fetch businesses', code: '00500' });
  }
};

// Get single business by ID
export const getSingleBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await Business.findById(businessId)
      .populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto isEmailVerified isPhoneVerified')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image');
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business fetched successfully', data: business });
  } catch (error) {
    console.error('Get business error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch business', code: '00500' });
  }
};

// Change business status
export const changeStatusOfBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return errorResponseHelper(res, { message: 'Status is required', code: '00400' });
    }
    
    const business = await Business.findByIdAndUpdate(
      businessId,
      { status },
      { new: true, runValidators: true }
    ).populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image');
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business status updated successfully', data: business });
  } catch (error) {
    console.error('Update business status error:', error);
    return errorResponseHelper(res, { message: 'Failed to update business status', code: '00500' });
  }
};

// Delete business
export const deleteBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await Business.findByIdAndDelete(businessId);
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Delete business error:', error);
    return errorResponseHelper(res, { message: 'Failed to delete business', code: '00500' });
  }
};

// Update business information
export const updateBusiness = async (req, res) => {
  const startTime = Date.now();
  console.log("🚀 UPDATE BUSINESS FUNCTION CALLED at:", new Date().toISOString());
  
  try {
    const { businessId } = req.params;
    let updateData = req.body;
    
    // Preprocess form data to handle serialized objects/arrays
    if (updateData.subcategories && typeof updateData.subcategories === 'string') {
      try {
        // Handle case where subcategories might be a JSON string
        if (updateData.subcategories.startsWith('[') && updateData.subcategories.endsWith(']')) {
          updateData.subcategories = JSON.parse(updateData.subcategories);
        } else if (updateData.subcategories === '[object Object]') {
          // If it's the literal string '[object Object]', try to get from files or other sources
          console.log("Warning: subcategories is '[object Object]', this might indicate a frontend issue");
          updateData.subcategories = [];
        }
      } catch (parseError) {
        console.log("Error parsing subcategories:", parseError);
        updateData.subcategories = [];
      }
    }
    
    if (updateData.focusKeywords && Array.isArray(updateData.focusKeywords)) {
      // Clean up focusKeywords array
      updateData.focusKeywords = updateData.focusKeywords.map(keyword => {
        if (typeof keyword === 'string' && keyword === '[object Object]') {
          return {}; // Return empty object if it's the literal string
        }
        return keyword;
      });
    }
    
    // Convert category to ObjectId if it's a string
    if (updateData.category && typeof updateData.category === 'string') {
      try {
        updateData.category = new mongoose.Types.ObjectId(updateData.category);
      } catch (error) {
        console.log("Invalid category ObjectId:", error);
        return errorResponseHelper(res, 400, "Invalid category ID format");
      }
    }
    
    // Convert subcategories to ObjectIds if they're strings
    if (updateData.subcategories && Array.isArray(updateData.subcategories)) {
      try {
        updateData.subcategories = updateData.subcategories.map(subcat => {
          if (typeof subcat === 'string') {
            return new mongoose.Types.ObjectId(subcat);
          }
          return subcat;
        });
      } catch (error) {
        console.log("Invalid subcategory ObjectId:", error);
        return errorResponseHelper(res, 400, "Invalid subcategory ID format");
      }
    }
    
    console.log("Processed Update Data:", updateData);
    console.log("Processed subcategories:", updateData.subcategories);
    console.log("Processed focusKeywords:", updateData.focusKeywords);
    
    // Validate businessId
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
      return errorResponseHelper(res, 400, "Invalid business ID");
    }
    
    // Test Business model functionality
    console.log('Testing Business model...');
    console.log('Business model:', typeof Business);
    console.log('Business model name:', Business.modelName);
    console.log('Business collection name:', Business.collection.name);
    
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log('Database connection state:', dbStates[dbState], `(${dbState})`);
    
    if (dbState !== 1) {
      console.log('⚠️ Database not connected!');
      return errorResponseHelper(res, { message: 'Database connection error', code: '00500' });
    }
    
    // Check if business exists before update
    const existingBusiness = await Business.findById(businessId);
    if (!existingBusiness) {
      console.log('Business not found in database');
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    console.log('Existing Business:', {
      _id: existingBusiness._id,
      businessName: existingBusiness.businessName,
      category: existingBusiness.category,
      subcategories: existingBusiness.subcategories,
      status: existingBusiness.status
    });
    
    // Validate ObjectId fields if they're being updated
    if (updateData.category && !mongoose.Types.ObjectId.isValid(updateData.category)) {
      console.log('Invalid category ObjectId:', updateData.category);
      return errorResponseHelper(res, { message: 'Invalid category ID format', code: '00400' });
    }
    
    if (updateData.subcategories && Array.isArray(updateData.subcategories)) {
      for (let i = 0; i < updateData.subcategories.length; i++) {
        if (!mongoose.Types.ObjectId.isValid(updateData.subcategories[i])) {
          console.log('Invalid subcategory ObjectId at index', i, ':', updateData.subcategories[i]);
          return errorResponseHelper(res, { message: `Invalid subcategory ID format at index ${i}`, code: '00400' });
        }
      }
    }
    
    console.log('Attempting to update business...');
    
    // Try findByIdAndUpdate first
    let business = await Business.findByIdAndUpdate(
      businessId,
      updateData,
      { 
        new: true, 
        runValidators: true,
        upsert: false,
        setDefaultsOnInsert: false
      }
    ).populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image');
    
    // If findByIdAndUpdate fails, try manual update
    if (!business) {
      console.log('findByIdAndUpdate failed, trying manual update...');
      const businessToUpdate = await Business.findById(businessId);
      if (businessToUpdate) {
        // Update the fields manually
        Object.keys(updateData).forEach(key => {
          if (businessToUpdate[key] !== undefined) {
            businessToUpdate[key] = updateData[key];
          }
        });
        
        // Save the updated business
        business = await businessToUpdate.save();
        
        // Populate the fields after save
        business = await Business.findById(businessId)
          .populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto')
          .populate('category', 'title slug description image color')
          .populate('subcategories', 'title slug description image');
      }
    }
    
    console.log('Update Result:', business ? 'Success' : 'Failed');
    if (business) {
      console.log('Updated Business Data:', {
        _id: business._id,
        businessName: business.businessName,
        category: business.category,
        subcategories: business.subcategories,
        status: business.status,
        updatedAt: business.updatedAt
      });
    }
    
    if (!business) {
      console.log('Business update failed - no business returned');
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    console.log('=== END UPDATE BUSINESS DEBUG ===');
    console.log('⏱️ Total execution time:', Date.now() - startTime, 'ms');
    
    return successResponseHelper(res, { message: 'Business updated successfully', data: business });
  } catch (error) {
    console.error('Update business error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyValue: error.keyValue
    });
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
      console.error('Validation error details:', validationErrors);
      return errorResponseHelper(res, { 
        message: 'Validation failed', 
        errors: validationErrors,
        code: '00400' 
      });
    }
    
    // Check for duplicate key errors
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyValue);
      return errorResponseHelper(res, { 
        message: 'Duplicate value found', 
        field: Object.keys(error.keyValue)[0],
        code: '00409' 
      });
    }
    
    return errorResponseHelper(res, { message: 'Failed to update business', code: '00500' });
  }
};

// Get business statistics
export const getBusinessStats = async (req, res) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const activeBusinesses = await Business.countDocuments({ status: 'active' });
    const inactiveBusinesses = await Business.countDocuments({ status: 'inactive' });
    const pendingBusinesses = await Business.countDocuments({ status: 'pending' });
    const suspendedBusinesses = await Business.countDocuments({ status: 'suspended' });
    
    // Get businesses registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBusinesses = await Business.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get businesses by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyStats = await Business.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Get businesses by category
    const categoryStats = await Business.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const stats = {
      total: totalBusinesses,
      active: activeBusinesses,
      inactive: inactiveBusinesses,
      pending: pendingBusinesses,
      suspended: suspendedBusinesses,
      recentBusinesses,
      monthlyStats,
      categoryStats
    };
    
    return successResponseHelper(res, { message: 'Business statistics fetched successfully', data: stats });
  } catch (error) {
    console.error('Get business stats error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch business statistics', code: '00500' });
  }
};

// Get businesses with detailed owner information
export const getBusinessesWithOwnerDetails = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, startDate, endDate } = req.query;
    const filter = {};

    // Text search (businessName, owner name, email, phone, website)
    if (queryText) {
      filter.$or = [
        { businessName: { $regex: queryText, $options: 'i' } },
        { email: { $regex: queryText, $options: 'i' } },
        { phoneNumber: { $regex: queryText, $options: 'i' } },
        { website: { $regex: queryText, $options: 'i' } }
      ];
    }

    // Status filter - only apply if status is not 'all'
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Registration date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // First get businesses with basic owner info
    const businesses = await Business.find(filter)
      .populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto isEmailVerified isPhoneVerified createdAt')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Business.countDocuments(filter);

    return successResponseHelper(res, {
      message: 'Businesses with owner details fetched successfully',
      data: {
        businesses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get businesses with owner details error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch businesses with owner details', code: '00500' });
  }
};

// Get all businesses without filtering (for testing)
export const getAllBusinessesNoFilter = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    console.log('Getting all businesses without filter');
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const totalCount = await Business.countDocuments();
    console.log('Total businesses in database:', totalCount);
    
    // Get businesses without any filter
    const businesses = await Business.find({})
      .populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('Found businesses (no filter):', businesses.length);
    
    if (businesses.length > 0) {
      console.log('First business sample:', {
        id: businesses[0]._id,
        businessName: businesses[0].businessName,
        category: businesses[0].category ? {
          id: businesses[0].category._id,
          title: businesses[0].category.title,
          slug: businesses[0].category.slug
        } : 'No category',
        subcategories: businesses[0].subcategories ? businesses[0].subcategories.map(sub => ({
          id: sub._id,
          title: sub.title,
          slug: sub.slug
        })) : [],
        email: businesses[0].email,
        phoneNumber: businesses[0].phoneNumber,
        status: businesses[0].status,
        hasOwner: !!businesses[0].businessOwner,
        ownerName: businesses[0].businessOwner ? `${businesses[0].businessOwner.firstName} ${businesses[0].businessOwner.lastName}` : 'No owner'
      });
    }

    return successResponseHelper(res, {
      message: 'All businesses fetched successfully (no filter)',
      data: {
        businesses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        },
        totalCount
      }
    });
  } catch (error) {
    console.error('Get all businesses no filter error:', error);
    console.error('Error stack:', error.stack);
    return errorResponseHelper(res, { message: 'Failed to fetch businesses', code: '00500' });
  }
};

// Search businesses by owner information
export const searchBusinessesByOwner = async (req, res) => {
  try {
    const { queryText, page = 1, limit = 10 } = req.query;
    
    if (!queryText) {
      return errorResponseHelper(res, { message: 'Query text is required', code: '00400' });
    }

    console.log('Searching businesses by owner with query:', queryText);

    // Use aggregation to search by owner information
    const businesses = await Business.aggregate([
      {
        $lookup: {
          from: 'businessowners',
          localField: 'businessOwner',
          foreignField: '_id',
          as: 'ownerInfo'
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $lookup: {
          from: 'subcategories',
          localField: 'subcategories',
          foreignField: '_id',
          as: 'subcategoriesInfo'
        }
      },
      {
        $match: {
          $or: [
            { businessName: { $regex: queryText, $options: 'i' } },
            { email: { $regex: queryText, $options: 'i' } },
            { phoneNumber: { $regex: queryText, $options: 'i' } },
            { website: { $regex: queryText, $options: 'i' } },
            { 'ownerInfo.firstName': { $regex: queryText, $options: 'i' } },
            { 'ownerInfo.lastName': { $regex: queryText, $options: 'i' } },
            { 'ownerInfo.email': { $regex: queryText, $options: 'i' } }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get total count for pagination
    const total = await Business.aggregate([
      {
        $lookup: {
          from: 'businessowners',
          localField: 'businessOwner',
          foreignField: '_id',
          as: 'ownerInfo'
        }
      },
      {
        $match: {
          $or: [
            { businessName: { $regex: queryText, $options: 'i' } },
            { email: { $regex: queryText, $options: 'i' } },
            { phoneNumber: { $regex: queryText, $options: 'i' } },
            { website: { $regex: queryText, $options: 'i' } },
            { 'ownerInfo.firstName': { $regex: queryText, $options: 'i' } },
            { 'ownerInfo.lastName': { $regex: queryText, $options: 'i' } },
            { 'ownerInfo.email': { $regex: queryText, $options: 'i' } }
          ]
        }
      },
      {
        $count: 'total'
      }
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    return successResponseHelper(res, {
      message: 'Businesses search completed successfully',
      data: {
        businesses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Search businesses by owner error:', error);
    return errorResponseHelper(res, { message: 'Failed to search businesses', code: '00500' });
  }
};

// Test database connection and business count
export const testBusinessConnection = async (req, res) => {
  try {
    // Check if Business model is working
    const totalBusinesses = await Business.countDocuments();
    console.log('Total businesses found:', totalBusinesses);
    
    // Try to find one business without population
    const sampleBusiness = await Business.findOne();
    console.log('Sample business (without population):', sampleBusiness ? 'Found' : 'Not found');
    
    // Try to find one business with population
    const sampleBusinessWithOwner = await Business.findOne().populate('businessOwner');
    console.log('Sample business (with population):', sampleBusinessWithOwner ? 'Found' : 'Not found');
    
    if (sampleBusinessWithOwner && sampleBusinessWithOwner.businessOwner) {
      console.log('Owner details:', {
        id: sampleBusinessWithOwner.businessOwner._id,
        name: `${sampleBusinessWithOwner.businessOwner.firstName} ${sampleBusinessWithOwner.businessOwner.lastName}`,
        email: sampleBusinessWithOwner.businessOwner.email
      });
    }
    
    // Test with empty filter
    const businessesWithEmptyFilter = await Business.find({});
    console.log('Businesses with empty filter:', businessesWithEmptyFilter.length);
    
    // Test with status filter
    const businessesWithStatusFilter = await Business.find({ status: { $exists: true } });
    console.log('Businesses with status filter:', businessesWithStatusFilter.length);
    
    return successResponseHelper(res, {
      message: 'Database connection test successful',
      data: {
        totalBusinesses,
        hasBusinesses: totalBusinesses > 0,
        sampleBusinessFound: !!sampleBusiness,
        sampleBusinessWithOwnerFound: !!sampleBusinessWithOwner,
        hasOwnerData: sampleBusinessWithOwner && !!sampleBusinessWithOwner.businessOwner,
        businessesWithEmptyFilter: businessesWithEmptyFilter.length,
        businessesWithStatusFilter: businessesWithStatusFilter.length
      }
    });
  } catch (error) {
    console.error('Test connection error:', error);
    console.error('Error stack:', error.stack);
    return errorResponseHelper(res, { message: 'Database connection test failed', code: '00500' });
  }
};

// Bulk update business status
export const bulkUpdateBusinessStatus = async (req, res) => {
  try {
    const { businessIds, status } = req.body;
    
    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return errorResponseHelper(res, { message: 'Business IDs array is required', code: '00400' });
    }
    
    if (!status) {
      return errorResponseHelper(res, { message: 'Status is required', code: '00400' });
    }
    
    const result = await Business.updateMany(
      { _id: { $in: businessIds } },
      { status, updatedAt: new Date() }
    );
    
    return successResponseHelper(res, {
      message: `Successfully updated ${result.modifiedCount} business(es) status`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Bulk update business status error:', error);
    return errorResponseHelper(res, { message: 'Failed to bulk update business status', code: '00500' });
  }
};
