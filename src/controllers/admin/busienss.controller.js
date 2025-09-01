import Business from '../../models/business/business.js';
import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
import Subscription from '../../models/admin/subscription.js';
import Review from '../../models/admin/review.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// Helper function to add subscription and boost status to business
const addSubscriptionAndBoostStatus = (business) => {
  const businessObj = business.toObject();
  
  // Check if business has active subscription
  const hasActiveSubscription = businessObj.businessSubscriptionId && 
    businessObj.businessSubscriptionId.status === 'active' &&
    (businessObj.businessSubscriptionId.isLifetime || 
     (businessObj.businessSubscriptionId.expiresAt && new Date() < new Date(businessObj.businessSubscriptionId.expiresAt)));

  // Check if business has active boost
  const hasActiveBoost = businessObj.boostSubscriptionId && 
    businessObj.boostSubscriptionId.status === 'active' &&
    businessObj.boostSubscriptionId.boostQueueInfo &&
    businessObj.boostSubscriptionId.boostQueueInfo.isCurrentlyActive &&
    businessObj.boostSubscriptionId.boostQueueInfo.boostEndTime &&
    new Date() < new Date(businessObj.boostSubscriptionId.boostQueueInfo.boostEndTime);

  // Also check the boostActive field from business model
  const isBoosted = businessObj.boostActive && 
    businessObj.boostEndAt && 
    new Date() < new Date(businessObj.boostEndAt);

  // Add subscription plan details if available
  const subscriptionDetails = businessObj.businessSubscriptionId ? {
    _id: businessObj.businessSubscriptionId._id,
    subscriptionType: businessObj.businessSubscriptionId.subscriptionType,
    status: businessObj.businessSubscriptionId.status,
    amount: businessObj.businessSubscriptionId.amount,
    currency: businessObj.businessSubscriptionId.currency,
    expiresAt: businessObj.businessSubscriptionId.expiresAt,
    isLifetime: businessObj.businessSubscriptionId.isLifetime,
    features: businessObj.businessSubscriptionId.features,
    maxBoostPerDay: businessObj.businessSubscriptionId.maxBoostPerDay,
    validityHours: businessObj.businessSubscriptionId.validityHours,
    createdAt: businessObj.businessSubscriptionId.createdAt,
    updatedAt: businessObj.businessSubscriptionId.updatedAt,
    boostUsage: businessObj.businessSubscriptionId.boostUsage,
    featureUsage: businessObj.businessSubscriptionId.featureUsage,
    planDetails: businessObj.businessSubscriptionId.paymentPlan ? {
      _id: businessObj.businessSubscriptionId.paymentPlan._id,
      name: businessObj.businessSubscriptionId.paymentPlan.name,
      description: businessObj.businessSubscriptionId.paymentPlan.description,
      planType: businessObj.businessSubscriptionId.paymentPlan.planType,
      price: businessObj.businessSubscriptionId.paymentPlan.price,
      currency: businessObj.businessSubscriptionId.paymentPlan.currency,
      features: businessObj.businessSubscriptionId.paymentPlan.features,
      maxBoostPerDay: businessObj.businessSubscriptionId.paymentPlan.maxBoostPerDay,
      validityHours: businessObj.businessSubscriptionId.paymentPlan.validityHours,
      isActive: businessObj.businessSubscriptionId.paymentPlan.isActive,
      isPopular: businessObj.businessSubscriptionId.paymentPlan.isPopular,
      sortOrder: businessObj.businessSubscriptionId.paymentPlan.sortOrder,
      discount: businessObj.businessSubscriptionId.paymentPlan.discount
    } : null,
    isExpired: businessObj.businessSubscriptionId.expiresAt ? new Date() > new Date(businessObj.businessSubscriptionId.expiresAt) : false,
    daysUntilExpiry: businessObj.businessSubscriptionId.expiresAt ? 
      Math.ceil((new Date(businessObj.businessSubscriptionId.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null
  } : null;

  // Add boost plan details if available
  const boostDetails = businessObj.boostSubscriptionId ? {
    _id: businessObj.boostSubscriptionId._id,
    subscriptionType: businessObj.boostSubscriptionId.subscriptionType,
    status: businessObj.boostSubscriptionId.status,
    amount: businessObj.boostSubscriptionId.amount,
    currency: businessObj.boostSubscriptionId.currency,
    expiresAt: businessObj.boostSubscriptionId.expiresAt,
    isLifetime: businessObj.boostSubscriptionId.isLifetime,
    features: businessObj.boostSubscriptionId.features,
    maxBoostPerDay: businessObj.boostSubscriptionId.maxBoostPerDay,
    validityHours: businessObj.boostSubscriptionId.validityHours,
    createdAt: businessObj.boostSubscriptionId.createdAt,
    updatedAt: businessObj.boostSubscriptionId.updatedAt,
    boostUsage: businessObj.boostSubscriptionId.boostUsage,
    boostQueueInfo: businessObj.boostSubscriptionId.boostQueueInfo,
    planDetails: businessObj.boostSubscriptionId.paymentPlan ? {
      _id: businessObj.boostSubscriptionId.paymentPlan._id,
      name: businessObj.boostSubscriptionId.paymentPlan.name,
      description: businessObj.boostSubscriptionId.paymentPlan.description,
      planType: businessObj.boostSubscriptionId.paymentPlan.planType,
      price: businessObj.boostSubscriptionId.paymentPlan.price,
      currency: businessObj.boostSubscriptionId.paymentPlan.currency,
      features: businessObj.boostSubscriptionId.paymentPlan.features,
      maxBoostPerDay: businessObj.boostSubscriptionId.paymentPlan.maxBoostPerDay,
      validityHours: businessObj.boostSubscriptionId.paymentPlan.validityHours,
      isActive: businessObj.boostSubscriptionId.paymentPlan.isActive,
      isPopular: businessObj.boostSubscriptionId.paymentPlan.isPopular,
      sortOrder: businessObj.boostSubscriptionId.paymentPlan.sortOrder,
      discount: businessObj.boostSubscriptionId.paymentPlan.discount
    } : null,
    isExpired: businessObj.boostSubscriptionId.expiresAt ? new Date() > new Date(businessObj.boostSubscriptionId.expiresAt) : false,
    hoursUntilExpiry: businessObj.boostSubscriptionId.expiresAt ? 
      Math.ceil((new Date(businessObj.boostSubscriptionId.expiresAt) - new Date()) / (1000 * 60 * 60)) : null
  } : null;

  // Determine active subscription ID
  let activeSubscriptionId = null;
  if (hasActiveSubscription && businessObj.businessSubscriptionId) {
    activeSubscriptionId = businessObj.businessSubscriptionId._id;
  } else if (hasActiveBoost && businessObj.boostSubscriptionId) {
    activeSubscriptionId = businessObj.boostSubscriptionId._id;
  }

  return {
    ...businessObj,
    hasActiveSubscription: !!hasActiveSubscription,
    hasActiveBoost: !!(hasActiveBoost || isBoosted),
    isBoosted: !!(hasActiveBoost || isBoosted),
    activeSubscriptionId,
    subscriptionDetails,
    boostDetails
  };
};

// Helper function to add review count to businesses
const addReviewCountToBusinesses = async (businesses) => {
  const businessIds = businesses.map(business => business._id);
  
  // Get review counts for all businesses
  const reviewCounts = await Review.aggregate([
    {
      $match: {
        businessId: { $in: businessIds }
      }
    },
    {
      $group: {
        _id: '$businessId',
        reviewCount: { $sum: 1 }
      }
    }
  ]);
  
  // Create a map for quick lookup
  const reviewCountMap = {};
  reviewCounts.forEach(item => {
    reviewCountMap[item._id.toString()] = item.reviewCount;
  });
  
  // Add review count to each business
  return businesses.map(business => ({
    ...business.toObject(),
    reviewCount: reviewCountMap[business._id.toString()] || 0
  }));
};

// Get all businesses
export const getAllBusinesses = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, startDate, endDate, hasReviews } = req.query;
    const filter = {};

    console.log('Query parameters:', { page, limit, queryText, status, startDate, endDate, hasReviews });

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

    // Filter businesses that have at least 1 review
    if (hasReviews === 'true' || hasReviews === true) {
      // Get business IDs that have at least 1 review
      const businessesWithReviews = await Review.distinct('businessId');
      console.log('Businesses with reviews:', businessesWithReviews.length);
      
      if (businessesWithReviews.length > 0) {
        filter._id = { $in: businessesWithReviews };
      } else {
        // If no businesses have reviews, return empty result
        return successResponseHelper(res, {
          message: 'No businesses with reviews found',
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          },
          totalCount: 0
        });
      }
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
      .populate({
        path: 'businessSubscriptionId',
        select: 'status subscriptionType expiresAt isLifetime paymentPlan amount currency features maxBoostPerDay validityHours',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular'
        }
      })
      .populate({
        path: 'boostSubscriptionId',
        select: 'status subscriptionType expiresAt boostQueueInfo paymentPlan amount currency features maxBoostPerDay validityHours',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular'
        }
      })
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

    // Add subscription and boost status to each business
    const businessesWithSubscriptionStatus = businesses.map(business => addSubscriptionAndBoostStatus(business));

    // Add review counts to businesses
    const businessesWithReviewCounts = await addReviewCountToBusinesses(businessesWithSubscriptionStatus);

    const total = await Business.countDocuments(filter);

    return successResponseHelper(res, {
      message: 'Businesses fetched successfully',
      data: businessesWithReviewCounts,
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
      .populate('subcategories', 'title slug description image')
      .populate({
        path: 'businessSubscriptionId',
        select: 'status subscriptionType expiresAt isLifetime paymentPlan amount currency features maxBoostPerDay validityHours createdAt updatedAt',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular sortOrder'
        }
      })
      .populate({
        path: 'boostSubscriptionId',
        select: 'status subscriptionType expiresAt boostQueueInfo paymentPlan amount currency features maxBoostPerDay validityHours createdAt updatedAt',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular sortOrder'
        }
      });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }

    // Add subscription and boost status to business
    const businessWithSubscriptionStatus = addSubscriptionAndBoostStatus(business);
    
    return successResponseHelper(res, { message: 'Business fetched successfully', data: businessWithSubscriptionStatus });
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
      .populate('subcategories', 'title slug description image')
      .populate({
        path: 'businessSubscriptionId',
        select: 'status subscriptionType expiresAt isLifetime paymentPlan amount currency features maxBoostPerDay validityHours',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular'
        }
      })
      .populate({
        path: 'boostSubscriptionId',
        select: 'status subscriptionType expiresAt boostQueueInfo paymentPlan amount currency features maxBoostPerDay validityHours',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular'
        }
      });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }

    // Add subscription and boost status to business
    const businessWithSubscriptionStatus = addSubscriptionAndBoostStatus(business);
    
    return successResponseHelper(res, { message: 'Business status updated successfully', data: businessWithSubscriptionStatus });
  } catch (error) {
    console.error('Update business status error:', error);
    return errorResponseHelper(res, { message: 'Failed to update business status', code: '00500' });
  }
};

// Delete business
export const deleteBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    // Validate business ID
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return errorResponseHelper(res, { message: 'Invalid business ID', code: '00400' });
    }
    
    // First, get the business to check if it exists and get subscription IDs
    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    console.log('Deleting business:', {
      businessId: business._id,
      businessName: business.businessName,
      businessSubscriptionId: business.businessSubscriptionId,
      boostSubscriptionId: business.boostSubscriptionId
    });
    
    // Store subscription IDs for cleanup
    const businessSubscriptionId = business.businessSubscriptionId;
    const boostSubscriptionId = business.boostSubscriptionId;
    
    // Start a database transaction for atomic operations
    const session = await mongoose.startSession();
    let deletedSubscriptions = [];
    
    try {
      await session.withTransaction(async () => {
        // 1. Delete all subscriptions associated with this business
        const subscriptionDeleteResult = await Subscription.deleteMany(
          { business: businessId },
          { session }
        );
        
        console.log('Deleted subscriptions:', {
          deletedCount: subscriptionDeleteResult.deletedCount,
          businessSubscriptionId,
          boostSubscriptionId
        });
        
        // 2. Delete the business
        const businessDeleteResult = await Business.findByIdAndDelete(businessId, { session });
        
        if (!businessDeleteResult) {
          throw new Error('Failed to delete business');
        }
        
        console.log('Business deleted successfully:', businessDeleteResult._id);
        
        // 3. Update any other businesses that might reference these subscription IDs
        // (This is a safety measure in case there are any cross-references)
        const updatePromises = [];
        
        if (businessSubscriptionId) {
          updatePromises.push(
            Business.updateMany(
              { businessSubscriptionId: businessSubscriptionId },
              { $unset: { businessSubscriptionId: 1 } },
              { session }
            )
          );
        }
        
        if (boostSubscriptionId) {
          updatePromises.push(
            Business.updateMany(
              { boostSubscriptionId: boostSubscriptionId },
              { $unset: { boostSubscriptionId: 1 } },
              { session }
            )
          );
        }
        
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log('Cleaned up subscription references in other businesses');
        }
        
        // 4. Log the cleanup details
        deletedSubscriptions = {
          businessSubscriptionId,
          boostSubscriptionId,
          totalSubscriptionsDeleted: subscriptionDeleteResult.deletedCount,
          businessDeleted: true
        };
      });
      
      console.log('Business deletion transaction completed successfully');
      
    } catch (transactionError) {
      console.error('Transaction failed:', transactionError);
      throw transactionError;
    } finally {
      await session.endSession();
    }
    
    // Return success response with cleanup details
    return successResponseHelper(res, { 
      message: 'Business and associated subscriptions deleted successfully',
      data: {
        businessId,
        businessName: business.businessName,
        deletedSubscriptions,
        cleanupDetails: {
          subscriptionsDeleted: deletedSubscriptions.totalSubscriptionsDeleted,
          businessSubscriptionId: deletedSubscriptions.businessSubscriptionId,
          boostSubscriptionId: deletedSubscriptions.boostSubscriptionId
        }
      }
    });
    
  } catch (error) {
    console.error('Delete business error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return errorResponseHelper(res, { 
        message: 'Validation error during deletion', 
        code: '00400' 
      });
    }
    
    if (error.name === 'CastError') {
      return errorResponseHelper(res, { 
        message: 'Invalid business ID format', 
        code: '00400' 
      });
    }
    
    return errorResponseHelper(res, { 
      message: 'Failed to delete business and associated data', 
      code: '00500' 
    });
  }
};

// Update business information
export const updateBusiness = async (req, res) => {
  const startTime = Date.now();
  console.log("🚀 UPDATE BUSINESS FUNCTION CALLED at:", new Date().toISOString());
  
  try {
    const { businessId } = req.params;
    let updateData = req.body;
    const { removeImages, removeLogo } = req.body;
    
    // Handle logo removal
    if (removeLogo === true) {
      try {
        // Get current business to see existing logo
        const currentBusiness = await Business.findById(businessId).select('logo');
        const currentLogo = currentBusiness?.logo;
        
        if (currentLogo && currentLogo.public_id) {
          // Delete logo from Cloudinary
          const { deleteMultipleFiles } = await import('../../helpers/cloudinaryHelper.js');
          const publicIds = [currentLogo.public_id];
          
          if (currentLogo.thumbnail && currentLogo.thumbnail.public_id) {
            publicIds.push(currentLogo.thumbnail.public_id);
          }
          
          try {
            await deleteMultipleFiles(publicIds, 'image');
            console.log('Successfully deleted logo from Cloudinary:', publicIds);
          } catch (deleteError) {
            console.error('Failed to delete logo from Cloudinary:', deleteError);
            // Continue with the update even if deletion fails
          }
        }
        
        // Set logo to null
        updateData.logo = null;
      } catch (error) {
        console.error('Error handling logo removal:', error);
        return errorResponseHelper(res, { message: 'Failed to process logo removal. Please try again.', code: '00500' });
      }
    }
    
    // Handle logo upload
    if (req.files && req.files.logo && req.files.logo[0]) {
      try {
        // If there's an existing logo, delete it first
        const currentBusiness = await Business.findById(businessId).select('logo');
        const currentLogo = currentBusiness?.logo;
        
        if (currentLogo && currentLogo.public_id) {
          const { deleteMultipleFiles } = await import('../../helpers/cloudinaryHelper.js');
          const publicIds = [currentLogo.public_id];
          
          if (currentLogo.thumbnail && currentLogo.thumbnail.public_id) {
            publicIds.push(currentLogo.thumbnail.public_id);
          }
          
          try {
            await deleteMultipleFiles(publicIds, 'image');
            console.log('Successfully deleted old logo from Cloudinary:', publicIds);
          } catch (deleteError) {
            console.error('Failed to delete old logo from Cloudinary:', deleteError);
            // Continue with the update even if deletion fails
          }
        }
        
        const { uploadImageWithThumbnail } = await import('../../helpers/cloudinaryHelper.js');
        const uploadResult = await uploadImageWithThumbnail(req.files.logo[0].buffer, 'business-app/logos');
        updateData.logo = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id,
          thumbnail: {
            url: uploadResult.thumbnail.url,
            public_id: uploadResult.thumbnail.public_id
          }
        };
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError);
        return errorResponseHelper(res, { message: 'Failed to upload logo. Please try again.', code: '00500' });
      }
    }
    
    // Handle multiple images upload
    if (req.files && req.files.images && req.files.images.length > 0) {
      try {
        const newImages = [];
        for (let i = 0; i < req.files.images.length; i++) {
          const imageFile = req.files.images[i];
          const { uploadImageWithThumbnail } = await import('../../helpers/cloudinaryHelper.js');
          const uploadResult = await uploadImageWithThumbnail(imageFile.buffer, 'business-app/images');
          
          newImages.push({
            url: uploadResult.original.url,
            public_id: uploadResult.original.public_id,
            thumbnail: {
              url: uploadResult.thumbnail.url,
              public_id: uploadResult.thumbnail.public_id
            },
            caption: req.body[`imageCaption_${i}`] || null,
            uploadedAt: new Date()
          });
        }
        
        // If we have new images, add them to existing ones
        if (newImages.length > 0) {
          // Get current business to see existing images
          const currentBusiness = await Business.findById(businessId).select('images');
          const existingImages = currentBusiness?.images || [];
          
          // Add new images to existing ones
          updateData.images = [...existingImages, ...newImages];
        }
      } catch (uploadError) {
        console.error('Images upload error:', uploadError);
        return errorResponseHelper(res, { message: 'Failed to upload one or more images. Please try again.', code: '00500' });
      }
    }
    
    // Handle image removal
    if (removeImages && Array.isArray(removeImages) && removeImages.length > 0) {
      try {
        // Get current business to see existing images
        const currentBusiness = await Business.findById(businessId).select('images');
        const existingImages = currentBusiness?.images || [];
        
        // Filter out images to be removed
        const updatedImages = existingImages.filter(image => 
          !removeImages.includes(image.public_id)
        );
        
        updateData.images = updatedImages;
        
        // Delete removed images from Cloudinary
        const { deleteMultipleFiles } = await import('../../helpers/cloudinaryHelper.js');
        const imagesToDelete = existingImages.filter(image => 
          removeImages.includes(image.public_id)
        );
        
        if (imagesToDelete.length > 0) {
          const publicIds = [];
          imagesToDelete.forEach(image => {
            publicIds.push(image.public_id);
            if (image.thumbnail && image.thumbnail.public_id) {
              publicIds.push(image.thumbnail.public_id);
            }
          });
          
          try {
            await deleteMultipleFiles(publicIds, 'image');
            console.log('Successfully deleted removed images from Cloudinary:', publicIds);
          } catch (deleteError) {
            console.error('Failed to delete some images from Cloudinary:', deleteError);
            // Continue with the update even if deletion fails
          }
        }
        
        console.log('Images marked for removal:', removeImages);
      } catch (error) {
        console.error('Error handling image removal:', error);
        return errorResponseHelper(res, { message: 'Failed to process image removal. Please try again.', code: '00500' });
      }
    }
    
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

// Bulk delete businesses with subscription cleanup
export const bulkDeleteBusinesses = async (req, res) => {
  try {
    const { businessIds } = req.body;
    
    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return errorResponseHelper(res, { message: 'Business IDs array is required', code: '00400' });
    }
    
    // Validate all business IDs
    const invalidIds = businessIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponseHelper(res, { 
        message: 'Invalid business ID(s) found', 
        invalidIds,
        code: '00400' 
      });
    }
    
    console.log('Bulk deleting businesses:', businessIds);
    
    // Start a database transaction for atomic operations
    const session = await mongoose.startSession();
    let deletionResults = [];
    
    try {
      await session.withTransaction(async () => {
        // 1. Get all businesses to be deleted (for logging and cleanup)
        const businessesToDelete = await Business.find({ _id: { $in: businessIds } }, { session });
        
        if (businessesToDelete.length === 0) {
          throw new Error('No businesses found to delete');
        }
        
        console.log(`Found ${businessesToDelete.length} businesses to delete`);
        
        // 2. Delete all subscriptions associated with these businesses
        const subscriptionDeleteResult = await Subscription.deleteMany(
          { business: { $in: businessIds } },
          { session }
        );
        
        console.log('Deleted subscriptions:', {
          deletedCount: subscriptionDeleteResult.deletedCount,
          businessIds
        });
        
        // 3. Delete the businesses
        const businessDeleteResult = await Business.deleteMany(
          { _id: { $in: businessIds } },
          { session }
        );
        
        console.log('Deleted businesses:', {
          deletedCount: businessDeleteResult.deletedCount,
          businessIds
        });
        
        // 4. Clean up any orphaned subscription references
        // (This is a safety measure to ensure no dangling references)
        const cleanupResult = await Business.updateMany(
          {
            $or: [
              { businessSubscriptionId: { $in: businessIds } },
              { boostSubscriptionId: { $in: businessIds } }
            ]
          },
          {
            $unset: {
              businessSubscriptionId: 1,
              boostSubscriptionId: 1
            }
          },
          { session }
        );
        
        if (cleanupResult.modifiedCount > 0) {
          console.log('Cleaned up subscription references:', cleanupResult.modifiedCount);
        }
        
        // 5. Prepare deletion results
        deletionResults = {
          businessesDeleted: businessDeleteResult.deletedCount,
          subscriptionsDeleted: subscriptionDeleteResult.deletedCount,
          referencesCleaned: cleanupResult.modifiedCount,
          businessDetails: businessesToDelete.map(business => ({
            _id: business._id,
            businessName: business.businessName,
            businessSubscriptionId: business.businessSubscriptionId,
            boostSubscriptionId: business.boostSubscriptionId
          }))
        };
      });
      
      console.log('Bulk business deletion transaction completed successfully');
      
    } catch (transactionError) {
      console.error('Bulk deletion transaction failed:', transactionError);
      throw transactionError;
    } finally {
      await session.endSession();
    }
    
    return successResponseHelper(res, {
      message: `Successfully deleted ${deletionResults.businessesDeleted} business(es) and associated subscriptions`,
      data: {
        deletionSummary: {
          businessesDeleted: deletionResults.businessesDeleted,
          subscriptionsDeleted: deletionResults.subscriptionsDeleted,
          referencesCleaned: deletionResults.referencesCleaned
        },
        deletedBusinesses: deletionResults.businessDetails
      }
    });
    
  } catch (error) {
    console.error('Bulk delete businesses error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return errorResponseHelper(res, { 
        message: 'Validation error during bulk deletion', 
        code: '00400' 
      });
    }
    
    if (error.name === 'CastError') {
      return errorResponseHelper(res, { 
        message: 'Invalid business ID format in bulk deletion', 
        code: '00400' 
      });
    }
    
    return errorResponseHelper(res, { 
      message: 'Failed to bulk delete businesses and associated data', 
      code: '00500' 
    });
  }
};

// Get detailed subscription and boost information for a single business
export const getBusinessSubscriptionAndBoostDetails = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return errorResponseHelper(res, { message: 'Invalid business ID', code: '00400' });
    }
    
    const business = await Business.findById(businessId)
      .populate('businessOwner', 'firstName lastName email phoneNumber username status profilePhoto')
      .populate('category', 'title slug description image color')
      .populate('subcategories', 'title slug description image')
      .populate({
        path: 'businessSubscriptionId',
        select: 'status subscriptionType expiresAt isLifetime paymentPlan amount currency features maxBoostPerDay validityHours createdAt updatedAt boostUsage featureUsage',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular sortOrder discount'
        }
      })
      .populate({
        path: 'boostSubscriptionId',
        select: 'status subscriptionType expiresAt boostQueueInfo paymentPlan amount currency features maxBoostPerDay validityHours createdAt updatedAt boostUsage',
        populate: {
          path: 'paymentPlan',
          select: 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular sortOrder discount'
        }
      });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }

    // Get all subscriptions for this business (both active and inactive)
    const allSubscriptions = await Subscription.find({ business: businessId })
      .populate('paymentPlan', 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular sortOrder discount')
      .sort({ createdAt: -1 });

    // Get all boost subscriptions specifically
    const boostSubscriptions = allSubscriptions.filter(sub => sub.subscriptionType === 'boost');
    
    // Get all business subscriptions specifically
    const businessSubscriptions = allSubscriptions.filter(sub => sub.subscriptionType === 'business');

    // Check subscription and boost status
    const businessObj = business.toObject();
    
    // Check if business has active subscription
    const hasActiveSubscription = businessObj.businessSubscriptionId && 
      businessObj.businessSubscriptionId.status === 'active' &&
      (businessObj.businessSubscriptionId.isLifetime || 
       (businessObj.businessSubscriptionId.expiresAt && new Date() < new Date(businessObj.businessSubscriptionId.expiresAt)));

    // Check if business has active boost
    const hasActiveBoost = businessObj.boostSubscriptionId && 
      businessObj.boostSubscriptionId.status === 'active' &&
      businessObj.boostSubscriptionId.boostQueueInfo &&
      businessObj.boostSubscriptionId.boostQueueInfo.isCurrentlyActive &&
      businessObj.boostSubscriptionId.boostQueueInfo.boostEndTime &&
      new Date() < new Date(businessObj.boostSubscriptionId.boostQueueInfo.boostEndTime);

    // Also check the boostActive field from business model
    const isBoosted = businessObj.boostActive && 
      businessObj.boostEndAt && 
      new Date() < new Date(businessObj.boostEndAt);

    // Prepare detailed response
    const subscriptionDetails = {
      business: {
        _id: business._id,
        businessName: business.businessName,
        email: business.email,
        phoneNumber: business.phoneNumber,
        status: business.status,
        category: business.category,
        subcategories: business.subcategories,
        businessOwner: business.businessOwner,
        boostActive: business.boostActive,
        boostStartAt: business.boostStartAt,
        boostEndAt: business.boostEndAt,
        boostCategory: business.boostCategory,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      },
      subscriptionStatus: {
        hasActiveSubscription: !!hasActiveSubscription,
        hasActiveBoost: !!(hasActiveBoost || isBoosted),
        isBoosted: !!(hasActiveBoost || isBoosted)
      },
      activeSubscription: hasActiveSubscription ? {
        ...businessObj.businessSubscriptionId,
        planDetails: businessObj.businessSubscriptionId.paymentPlan,
        isExpired: businessObj.businessSubscriptionId.expiresAt ? new Date() > new Date(businessObj.businessSubscriptionId.expiresAt) : false,
        daysUntilExpiry: businessObj.businessSubscriptionId.expiresAt ? 
          Math.ceil((new Date(businessObj.businessSubscriptionId.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null
      } : null,
      activeBoost: (hasActiveBoost || isBoosted) ? {
        ...businessObj.boostSubscriptionId,
        planDetails: businessObj.boostSubscriptionId?.paymentPlan,
        isExpired: businessObj.boostSubscriptionId?.expiresAt ? new Date() > new Date(businessObj.boostSubscriptionId.expiresAt) : false,
        hoursUntilExpiry: businessObj.boostSubscriptionId?.expiresAt ? 
          Math.ceil((new Date(businessObj.boostSubscriptionId.expiresAt) - new Date()) / (1000 * 60 * 60)) : null
      } : null,
      subscriptionHistory: {
        totalSubscriptions: allSubscriptions.length,
        businessSubscriptions: businessSubscriptions.length,
        boostSubscriptions: boostSubscriptions.length,
        allSubscriptions: allSubscriptions.map(sub => ({
          _id: sub._id,
          subscriptionType: sub.subscriptionType,
          status: sub.status,
          amount: sub.amount,
          currency: sub.currency,
          expiresAt: sub.expiresAt,
          isLifetime: sub.isLifetime,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
          planDetails: sub.paymentPlan,
          features: sub.features,
          maxBoostPerDay: sub.maxBoostPerDay,
          validityHours: sub.validityHours,
          boostUsage: sub.boostUsage,
          featureUsage: sub.featureUsage,
          boostQueueInfo: sub.boostQueueInfo
        }))
      }
    };
    
    return successResponseHelper(res, { 
      message: 'Business subscription and boost details fetched successfully', 
      data: subscriptionDetails 
    });
  } catch (error) {
    console.error('Get business subscription and boost details error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch business subscription and boost details', code: '00500' });
  }
};

// Get subscription details by subscription ID
export const getSubscriptionDetailsById = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return errorResponseHelper(res, { message: 'Invalid subscription ID', code: '00400' });
    }
    
    // Find subscription with populated payment plan
    const subscription = await Subscription.findById(subscriptionId)
      .populate('business', 'businessName email phoneNumber status about category subcategories businessOwner boostActive boostStartAt boostEndAt boostCategory createdAt updatedAt')
      .populate('paymentPlan', 'name description planType price currency features maxBoostPerDay validityHours isActive isPopular sortOrder discount')
      .populate('business.category', 'title slug description image color')
      .populate('business.subcategories', 'title slug description image')
      .populate('business.businessOwner', 'firstName lastName email phoneNumber username status profilePhoto isEmailVerified isPhoneVerified');
    
    if (!subscription) {
      return errorResponseHelper(res, { message: 'Subscription not found', code: '00404' });
    }

    // Calculate expiry information
    const isExpired = subscription.expiresAt ? new Date() > new Date(subscription.expiresAt) : false;
    const daysUntilExpiry = subscription.expiresAt ? 
      Math.ceil((new Date(subscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const hoursUntilExpiry = subscription.expiresAt ? 
      Math.ceil((new Date(subscription.expiresAt) - new Date()) / (1000 * 60 * 60)) : null;

    // Prepare response
    const response = {
      subscription: {
        _id: subscription._id,
        subscriptionType: subscription.subscriptionType,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        expiresAt: subscription.expiresAt,
        isLifetime: subscription.isLifetime,
        features: subscription.features,
        maxBoostPerDay: subscription.maxBoostPerDay,
        validityHours: subscription.validityHours,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        boostUsage: subscription.boostUsage,
        featureUsage: subscription.featureUsage,
        boostQueueInfo: subscription.boostQueueInfo,
        stripeCustomerId: subscription.stripeCustomerId,
        paymentId: subscription.paymentId,
        metadata: subscription.metadata,
        // Calculated fields
        isExpired,
        daysUntilExpiry,
        hoursUntilExpiry
      },
      paymentPlan: subscription.paymentPlan ? {
        _id: subscription.paymentPlan._id,
        name: subscription.paymentPlan.name,
        description: subscription.paymentPlan.description,
        planType: subscription.paymentPlan.planType,
        price: subscription.paymentPlan.price,
        currency: subscription.paymentPlan.currency,
        features: subscription.paymentPlan.features,
        maxBoostPerDay: subscription.paymentPlan.maxBoostPerDay,
        validityHours: subscription.paymentPlan.validityHours,
        isActive: subscription.paymentPlan.isActive,
        isPopular: subscription.paymentPlan.isPopular,
        sortOrder: subscription.paymentPlan.sortOrder,
        discount: subscription.paymentPlan.discount
      } : null,
      business: subscription.business ? {
        _id: subscription.business._id,
        businessName: subscription.business.businessName,
        email: subscription.business.email,
        phoneNumber: subscription.business.phoneNumber,
        status: subscription.business.status,
        about: subscription.business.about,
        category: subscription.business.category,
        subcategories: subscription.business.subcategories,
        businessOwner: subscription.business.businessOwner,
        boostActive: subscription.business.boostActive,
        boostStartAt: subscription.business.boostStartAt,
        boostEndAt: subscription.business.boostEndAt,
        boostCategory: subscription.business.boostCategory,
        createdAt: subscription.business.createdAt,
        updatedAt: subscription.business.updatedAt
      } : null
    };
    
    return successResponseHelper(res, { 
      message: 'Subscription details fetched successfully', 
      data: response 
    });
  } catch (error) {
    console.error('Get subscription details by ID error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch subscription details', code: '00500' });
  }
};
