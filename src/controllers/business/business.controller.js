import Business from '../../models/business/business.js';
import mongoose from 'mongoose';
import StripeHelper from '../../helpers/stripeHelper.js';
import BusinessSubscription from '../../models/admin/businessSubsciption.js';
import Subscription from '../../models/admin/subscription.js';
import PaymentPlan from '../../models/admin/paymentPlan.js';
import { uploadImageWithThumbnail } from '../../helpers/cloudinaryHelper.js';
import axios from 'axios';
import Joi from 'joi';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';

// Helper function to populate subscription data for a business
const populateSubscriptionData = async (businessObj) => {
  try {
    // Find active business subscription
    const businessSubscription = businessObj.businessSubscriptionId ? 
      await Subscription.findById(businessObj.businessSubscriptionId)
        .populate('paymentPlan', 'name description planType price currency features maxBoostPerDay validityHours isLifetime') : null;

    // Find active boost subscription
    const boostSubscription = businessObj.boostSubscriptionId ? 
      await Subscription.findById(businessObj.boostSubscriptionId)
        .populate('paymentPlan', 'name description planType price currency features maxBoostPerDay validityHours isLifetime') : null;

    // Set business subscription data
    if (businessSubscription && businessSubscription.status === 'active') {
      businessObj.businessSubscription = {
        _id: businessSubscription._id,
        subscriptionType: businessSubscription.subscriptionType,
        status: businessSubscription.status,
        amount: businessSubscription.amount,
        currency: businessSubscription.currency,
        isLifetime: businessSubscription.isLifetime,
        expiresAt: businessSubscription.expiresAt,
        createdAt: businessSubscription.createdAt,
        paymentPlan: businessSubscription.paymentPlan ? {
          _id: businessSubscription.paymentPlan._id,
          name: businessSubscription.paymentPlan.name,
          description: businessSubscription.paymentPlan.description,
          planType: businessSubscription.paymentPlan.planType,
          price: businessSubscription.paymentPlan.price,
          currency: businessSubscription.paymentPlan.currency,
          features: (businessSubscription.paymentPlan.features || []).reduce((acc, feature) => {
            acc[feature] = true;
            return acc;
          }, {}),
          maxBoostPerDay: businessSubscription.paymentPlan.maxBoostPerDay,
          validityHours: businessSubscription.paymentPlan.validityHours
        } : null,
        featureUsage: businessSubscription.featureUsage || null
      };
    } else {
      businessObj.businessSubscription = null;
    }

    // Set boost subscription data
    if (boostSubscription && boostSubscription.status === 'active') {
      businessObj.boostSubscription = {
        _id: boostSubscription._id,
        subscriptionType: boostSubscription.subscriptionType,
        status: boostSubscription.status,
        amount: boostSubscription.amount,
        currency: boostSubscription.currency,
        isLifetime: boostSubscription.isLifetime,
        expiresAt: boostSubscription.expiresAt,
        createdAt: boostSubscription.createdAt,
        paymentPlan: boostSubscription.paymentPlan ? {
          _id: boostSubscription.paymentPlan._id,
          name: boostSubscription.paymentPlan.name,
          description: boostSubscription.paymentPlan.description,
          planType: boostSubscription.paymentPlan.planType,
          price: boostSubscription.paymentPlan.price,
          currency: boostSubscription.paymentPlan.currency,
          features: (boostSubscription.paymentPlan.features || []).reduce((acc, feature) => {
            acc[feature] = true;
            return acc;
          }, {}),
          maxBoostPerDay: boostSubscription.paymentPlan.maxBoostPerDay,
          validityHours: boostSubscription.paymentPlan.validityHours
        } : null,
        boostUsage: boostSubscription.boostUsage || null,
        boostQueueInfo: boostSubscription.boostQueueInfo || null
      };
    } else {
      businessObj.boostSubscription = null;
    }

    // For backward compatibility, set activeSubscriptionId to business subscription if exists
    if (businessObj.businessSubscription) {
      businessObj.activeSubscriptionId = businessObj.businessSubscription._id;
      businessObj.activeSubscription = businessObj.businessSubscription;
    } else if (businessObj.boostSubscription) {
      businessObj.activeSubscriptionId = businessObj.boostSubscription._id;
      businessObj.activeSubscription = businessObj.boostSubscription;
    } else {
      businessObj.activeSubscriptionId = null;
      businessObj.activeSubscription = null;
    }

    // Add features directly to business object
    let businessFeatures = {};
    
    // Get features from business subscription if exists
    if (businessObj.businessSubscription?.paymentPlan?.features) {
      businessFeatures = { ...businessFeatures, ...businessObj.businessSubscription.paymentPlan.features };
    }
    
    // Set features directly on business object
    businessObj.features = businessFeatures;

    // Also include legacy subscription data for backward compatibility
    const legacySubscription = await BusinessSubscription.findOne({
      businessId: businessObj._id,
      status: 'active'
    });

    if (legacySubscription) {
      businessObj.legacySubscription = {
        _id: legacySubscription._id,
        subscriptionType: legacySubscription.subscriptionType,
        status: legacySubscription.status,
        createdAt: legacySubscription.createdAt,
        expiredAt: legacySubscription.expiredAt
      };
    } else {
      businessObj.legacySubscription = null;
    }

    return businessObj;
  } catch (error) {
    console.error('Error populating subscription data:', error);
    // Return business object without subscription data on error
    businessObj.activeSubscriptionId = null;
    businessObj.activeSubscription = null;
    businessObj.legacySubscription = null;
    return businessObj;
  }
};

export const createBusiness = async (req, res) => {
  try {
    const { plan, location, ...data } = req.body;
      
    // Handle logo upload
    let logoData = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      try {
        const uploadResult = await uploadImageWithThumbnail(req.files.logo[0].buffer, 'business-app/logos');
        logoData = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id,
          thumbnail: {
            url: uploadResult.thumbnail.url,
            public_id: uploadResult.thumbnail.public_id
          }
        };
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload logo. Please try again.' 
        });
      }
    }
    
    // Handle multiple images upload
    let imagesData = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      try {
        for (let i = 0; i < req.files.images.length; i++) {
          const imageFile = req.files.images[i];
          const uploadResult = await uploadImageWithThumbnail(imageFile.buffer, 'business-app/images');
          
          imagesData.push({
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
      } catch (uploadError) {
        console.error('Images upload error:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload one or more images. Please try again.' 
        });
      }
    }
    
    // Handle location data
    let locationData = null;
    
    if (location) {
      let parsedLocation = location;
      
      // If location is a string, try to parse it as JSON
      if (typeof location === 'string') {
        try {
          parsedLocation = JSON.parse(location);
        } catch (parseError) {
          console.error('Error parsing location string:', parseError);
          parsedLocation = null;
        }
      }
      
      // If we have a valid location object
      if (parsedLocation && typeof parsedLocation === 'object') {
        locationData = {
          description: parsedLocation.description || '',
          lat: parsedLocation.lat ? parseFloat(parsedLocation.lat) : null,
          lng: parsedLocation.lng ? parseFloat(parsedLocation.lng) : null
        };
      }
    }
    
    console.log("Location data being saved:", locationData);
    
    // Process businessUrls - handle JSON string format
    if (data.businessUrls) {
      try {
        if (typeof data.businessUrls === 'string') {
          // Try to parse as JSON string
          data.businessUrls = JSON.parse(data.businessUrls);
        }
        
        // Ensure it's an array and validate each item
        if (Array.isArray(data.businessUrls)) {
          data.businessUrls = data.businessUrls.filter(urlObj => {
            return urlObj && typeof urlObj === 'object' && urlObj.label && urlObj.link;
          });
        } else {
          data.businessUrls = [];
        }
        
        console.log("Processed businessUrls:", data.businessUrls);
      } catch (parseError) {
        console.log("Error parsing businessUrls:", parseError);
        data.businessUrls = [];
      }
    }
    
    // Assign features based on plan
    let features = [];
    if (plan === 'bronze') features = ['query_ticketing'];
    if (plan === 'silver') features = ['query_ticketing', 'review_management'];
    if (plan === 'gold') features = ['query_ticketing', 'review_management', 'review_embed'];
    // Generate embed token for gold
    let embedToken = undefined;
    if (plan === 'gold') embedToken = Math.random().toString(36).substring(2, 15);
    
    const business = await Business.create({
      ...data,
      location: locationData,
      logo: logoData,
      images: imagesData,
      businessOwner: req.businessOwner._id,
      plan: plan || null,
      features,
      embedToken
    });
    
    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;
    
    const businessObj = business.toObject();
    
    // Populate category data
    if (businessObj.category) {
      try {
        // Check if category is an ObjectId or title
        let category;
        if (mongoose.Types.ObjectId.isValid(businessObj.category)) {
          // If it's an ObjectId, find by _id
          category = await Category.findById(businessObj.category)
            .select('_id title description image slug status');
        } else {
          // If it's a title, find by title
          category = await Category.findOne({ 
            title: businessObj.category, 
            status: 'active' 
          }).select('_id title description image slug');
        }
        
        if (category && category.status !== 'inactive') {
          businessObj.category = {
            _id: category._id,
            title: category.title,
            description: category.description,
            image: category.image,
            slug: category.slug
          };
        } else {
          // If category not found, keep the original value
          businessObj.category = businessObj.category;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
        // Keep the original value on error
        businessObj.category = businessObj.category;
      }
    }
    
    // Populate subcategory data
    if (businessObj.subcategories && businessObj.subcategories.length > 0) {
      try {
        // Check if subcategories are ObjectIds or titles
        let subcategories;
        const subcategoryIds = businessObj.subcategories.filter(sub => 
          mongoose.Types.ObjectId.isValid(sub)
        );
        const subcategoryTitles = businessObj.subcategories.filter(sub => 
          !mongoose.Types.ObjectId.isValid(sub)
        );
        
        if (subcategoryIds.length > 0) {
          // If we have ObjectIds, find by _id
          subcategories = await SubCategory.find({
            _id: { $in: subcategoryIds },
            isActive: true
          }).select('_id title description image categoryId slug');
        } else if (subcategoryTitles.length > 0) {
          // If we have titles, find by title
          subcategories = await SubCategory.find({
            title: { $in: subcategoryTitles },
            isActive: true
          }).select('_id title description image categoryId slug');
        }
        
        // Populate category info for each subcategory
        const populatedSubcategories = await Promise.all(
          (subcategories || []).map(async (subcategory) => {
            const subcategoryObj = subcategory.toObject();
            if (subcategoryObj.categoryId) {
              const parentCategory = await Category.findById(subcategoryObj.categoryId)
                .select('_id title description slug');
              if (parentCategory) {
                subcategoryObj.parentCategory = {
                  _id: parentCategory._id,
                  title: parentCategory.title,
                  description: parentCategory.description,
                  slug: parentCategory.slug
                };
              }
            }
            return subcategoryObj;
          })
        );
        
        businessObj.subcategories = populatedSubcategories;
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        businessObj.subcategories = [];
      }
    } else {
      businessObj.subcategories = [];
    }
    
    // Populate subscription data
    const businessWithSubscription = await populateSubscriptionData(businessObj);
    
    // Send notifications
    try {
      // Send notification to business owner
      await NotificationHelper.sendBusinessNotifications.businessRegistrationCompleted(
        businessObj._id,
        {
          businessName: businessObj.businessName,
          category: businessObj.category,
          registrationDate: new Date()
        }
      );

      // Send notification to all admins
      const admins = await Admin.find({ status: 'active' });
      for (const admin of admins) {
        await NotificationHelper.sendBusinessNotifications.businessRegistrationAdminNotification(
          admin._id,
          {
            businessId: businessObj._id,
            businessName: businessObj.businessName,
            ownerName: `${req.user.firstName} ${req.user.lastName}`,
            category: businessObj.category,
            registrationDate: new Date()
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending business registration notifications:', notificationError);
      // Don't fail the request if notifications fail
    }
    
    return successResponseHelper(res, {
      message: 'Business created successfully',
      data: businessWithSubscription
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getMyBusinesses = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = { businessOwner: req.businessOwner?._id };
    
    // Add queryText functionality - only if it has meaningful content
    if (queryText && queryText.trim() !== '' && queryText !== 'null' && queryText !== 'undefined') {
      filter.$or = [
        { businessName: { $regex: queryText.trim(), $options: 'i' } },
        { email: { $regex: queryText.trim(), $options: 'i' } },
        { phoneNumber: { $regex: queryText.trim(), $options: 'i' } }
      ];
    }
    
    // Add status filter - only if it has meaningful content
    if (status && status.trim() !== '' && status !== 'null' && status !== 'undefined') {
      filter.status = status.trim();
    }
    
    // Build sort object - only if sortBy is valid
    const sort = {};
    if (sortBy && sortBy.trim() !== '' && sortBy !== 'null' && sortBy !== 'undefined') {
      sort[sortBy.trim()] = sortOrder === 'desc' ? -1 : 1;
    } else {
      // Default sorting if no valid sortBy provided
      sort.createdAt = sortOrder === 'desc' ? -1 : 1;
    }
    
    // Validate and calculate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Ensure valid pagination values
    const validPage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
    const validLimit = isNaN(limitNum) || limitNum < 1 ? 10 : limitNum;
    
    // Calculate pagination
    const skip = (validPage - 1) * validLimit;
    
    // Get businesses with pagination
    const businesses = await Business.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(validLimit);
    
    // Get total count for pagination
    const total = await Business.countDocuments(filter);
    
    // Log the final filter and pagination for debugging
    console.log('🔍 getMyBusinesses - Final filter:', JSON.stringify(filter, null, 2));
    console.log('📊 getMyBusinesses - Pagination:', { page: validPage, limit: validLimit, skip, total });
    
    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;
    
    // Populate category and subcategory data for each business
    const populatedBusinesses = await Promise.all(
      businesses.map(async (business) => {
        const businessObj = business.toObject();
        
        // Find and populate category data
        if (businessObj.category) {
          try {
            // Check if category is an ObjectId or title
            let category;
            if (mongoose.Types.ObjectId.isValid(businessObj.category)) {
              // If it's an ObjectId, find by _id
              category = await Category.findById(businessObj.category)
                .select('_id title description image slug status');
            } else {
              // If it's a title, find by title
              category = await Category.findOne({ 
                title: businessObj.category, 
                status: 'active' 
              }).select('_id title description image slug');
            }
            
            if (category && category.status !== 'inactive') {
              businessObj.category = {
                _id: category._id,
                title: category.title,
                description: category.description,
                image: category.image,
                slug: category.slug
              };
            } else {
              // If category not found, keep the original value
              businessObj.category = businessObj.category;
            }
          } catch (error) {
            console.error('Error fetching category:', error);
            // Keep the original value on error
            businessObj.category = businessObj.category;
          }
        }
        
        // Find and populate subcategory data
        if (businessObj.subcategories && businessObj.subcategories.length > 0) {
          console.log('Original subcategories:', businessObj.subcategories);
          try {
            // Check if subcategories are ObjectIds or titles
            let subcategories;
            const subcategoryIds = businessObj.subcategories.filter(sub => 
              mongoose.Types.ObjectId.isValid(sub)
            );
            const subcategoryTitles = businessObj.subcategories.filter(sub => 
              !mongoose.Types.ObjectId.isValid(sub)
            );
            
            if (subcategoryIds.length > 0) {
              // If we have ObjectIds, find by _id
              subcategories = await SubCategory.find({
                _id: { $in: subcategoryIds },
                isActive: true
              }).select('_id title description image categoryId slug');
            } else if (subcategoryTitles.length > 0) {
              // If we have titles, find by title
              subcategories = await SubCategory.find({
                title: { $in: subcategoryTitles },
                isActive: true
              }).select('_id title description image categoryId slug');
            }
            
            // Populate category info for each subcategory
            const populatedSubcategories = await Promise.all(
              (subcategories || []).map(async (subcategory) => {
                const subcategoryObj = subcategory.toObject();
                if (subcategoryObj.categoryId) {
                  const parentCategory = await Category.findById(subcategoryObj.categoryId)
                    .select('_id title description slug');
                  if (parentCategory) {
                    subcategoryObj.parentCategory = {
                      _id: parentCategory._id,
                      title: parentCategory.title,
                      description: parentCategory.description,
                      slug: parentCategory.slug
                    };
                  }
                }
                return subcategoryObj;
              })
            );
            
            businessObj.subcategories = populatedSubcategories;
          } catch (error) {
            console.error('Error fetching subcategories:', error);
            businessObj.subcategories = [];
          }
        } else {
          businessObj.subcategories = [];
        }
        
        // Get reviews for this business
        const Review = (await import('../../models/admin/review.js')).default;
        const reviews = await Review.find({ businessId: businessObj._id })
          .populate('userId', 'name email profilePhoto')
          .populate('approvedBy', 'name email')
          .sort({ createdAt: -1 })
          .limit(5); // Limit to recent 5 reviews for list view
        
        businessObj.reviews = reviews;
        
        // Clean up focusKeywords - convert objects to strings if needed
        if (businessObj.focusKeywords && Array.isArray(businessObj.focusKeywords)) {
          businessObj.focusKeywords = businessObj.focusKeywords.map(keyword => {
            if (typeof keyword === 'object' && keyword !== null) {
              return keyword.toString();
            }
            return keyword;
          });
        }
        
        // Clean up subcategories - only if they are still strings/objects (not already populated)
        if (businessObj.subcategories && Array.isArray(businessObj.subcategories)) {
          // Check if subcategories are already populated objects (have _id and title properties)
          const isAlreadyPopulated = businessObj.subcategories.length > 0 && 
            typeof businessObj.subcategories[0] === 'object' && 
            businessObj.subcategories[0]._id && 
            businessObj.subcategories[0].title;
          
          if (!isAlreadyPopulated) {
            businessObj.subcategories = businessObj.subcategories.map(sub => {
              if (typeof sub === 'object' && sub !== null) {
                return sub.toString();
              }
              return sub;
            });
          }
        }
        
        // Populate subscription data
        const businessWithSubscription = await populateSubscriptionData(businessObj);
        
        return businessWithSubscription;
      })
    );
    
    return successResponseHelper(res, {
      message: 'Businesses retrieved successfully',
      data: populatedBusinesses,
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(total / validLimit),
        totalItems: total,
        itemsPerPage: validLimit
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid business ID' });
    
    const business = await Business.findOne({ 
      _id: id, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    
    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;
    
    const businessObj = business.toObject();
    
    // Populate category data
    if (businessObj.category) {
      try {
        // Check if category is an ObjectId or title
        let category;
        if (mongoose.Types.ObjectId.isValid(businessObj.category)) {
          // If it's an ObjectId, find by _id
          category = await Category.findById(businessObj.category)
            .select('_id title description image slug status');
        } else {
          // If it's a title, find by title
          category = await Category.findOne({ 
            title: businessObj.category, 
            status: 'active' 
          }).select('_id title description image slug');
        }
        
        if (category && category.status !== 'inactive') {
          businessObj.category = {
            _id: category._id,
            title: category.title,
            description: category.description,
            image: category.image,
            slug: category.slug
          };
        } else {
          // If category not found, keep the original value
          businessObj.category = businessObj.category;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
        // Keep the original value on error
        businessObj.category = businessObj.category;
      }
    }
    
    // Populate subcategory data
    if (businessObj.subcategories && businessObj.subcategories.length > 0) {
      try {
        // Check if subcategories are ObjectIds or titles
        let subcategories;
        const subcategoryIds = businessObj.subcategories.filter(sub => 
          mongoose.Types.ObjectId.isValid(sub)
        );
        const subcategoryTitles = businessObj.subcategories.filter(sub => 
          !mongoose.Types.ObjectId.isValid(sub)
        );
        
        if (subcategoryIds.length > 0) {
          // If we have ObjectIds, find by _id
          subcategories = await SubCategory.find({
            _id: { $in: subcategoryIds },
            isActive: true
          }).select('_id title description image categoryId slug');
        } else if (subcategoryTitles.length > 0) {
          // If we have titles, find by title
          subcategories = await SubCategory.find({
            title: { $in: subcategoryTitles },
            isActive: true
          }).select('_id title description image categoryId slug');
        }
        
        // Populate category info for each subcategory
        const populatedSubcategories = await Promise.all(
          (subcategories || []).map(async (subcategory) => {
            const subcategoryObj = subcategory.toObject();
            if (subcategoryObj.categoryId) {
              const parentCategory = await Category.findById(subcategoryObj.categoryId)
                .select('_id title description slug');
              if (parentCategory) {
                subcategoryObj.parentCategory = {
                  _id: parentCategory._id,
                  title: parentCategory.title,
                  description: parentCategory.description,
                  slug: parentCategory.slug
                };
              }
            }
            return subcategoryObj;
          })
        );
        
        businessObj.subcategories = populatedSubcategories;
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        businessObj.subcategories = [];
      }
    } else {
      businessObj.subcategories = [];
    }
    
    // Get reviews for this business
    const Review = (await import('../../models/admin/review.js')).default;
    const reviews = await Review.find({ businessId: id })
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to recent 10 reviews
    
    const businessWithReviews = {
      ...businessObj,
      reviews
    };
    
    // Populate subscription data
    const businessWithSubscription = await populateSubscriptionData(businessWithReviews);
    
    return successResponseHelper(res, {
      message: 'Business retrieved successfully',
      data: businessWithSubscription
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { location, removeImages, removeLogo, ...updateData } = req.body;
     console.log("updateData", location,updateData);
    
    // Handle logo removal
    if (removeLogo === true) {
      try {
        // Get current business to see existing logo
        const currentBusiness = await Business.findById(id).select('logo');
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
        const currentBusiness = await Business.findById(id).select('logo');
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
          const currentBusiness = await Business.findById(id).select('images');
          const existingImages = currentBusiness?.images || [];
          
          // Add new images to existing ones
          updateData.images = [...existingImages, ...newImages];
          // Note: We no longer maintain the redundant 'media' field
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
        const currentBusiness = await Business.findById(id).select('images');
        const existingImages = currentBusiness?.images || [];
        
        // Filter out images to be removed
        const updatedImages = existingImages.filter(image => 
          !removeImages.includes(image.public_id)
        );
        
        updateData.images = updatedImages;
        // Note: We no longer maintain the redundant 'media' field
        
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
    
    // Handle location data
    if (location) {
      let parsedLocation = location;
      
      // If location is a string, try to parse it as JSON
      if (typeof location === 'string') {
        try {
          parsedLocation = JSON.parse(location);
        } catch (parseError) {
          console.error('Error parsing location string:', parseError);
          parsedLocation = null;
        }
      }
      
      // If we have a valid location object
      if (parsedLocation && typeof parsedLocation === 'object') {
        updateData.location = {
          description: parsedLocation.description || '',
          lat: parsedLocation.lat ? parseFloat(parsedLocation.lat) : null,
          lng: parsedLocation.lng ? parseFloat(parsedLocation.lng) : null
        };
        console.log("Location data being updated:", updateData.location);
      }
    }
    
    
    const business = await Business.findOneAndUpdate(
      { _id: id, businessOwner: req.businessOwner._id },
      updateData,
      { new: true, runValidators: false } // Temporarily disable validation
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    
    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;
    
    const businessObj = business.toObject();
    
    // Populate category data
    if (businessObj.category) {
      try {
        // Check if category is an ObjectId or title
        let category;
        if (mongoose.Types.ObjectId.isValid(businessObj.category)) {
          // If it's an ObjectId, find by _id
          category = await Category.findById(businessObj.category)
            .select('_id title description image slug status');
        } else {
          // If it's a title, find by title
          category = await Category.findOne({ 
            title: businessObj.category, 
            status: 'active' 
          }).select('_id title description image slug');
        }
        
        if (category && category.status !== 'inactive') {
          businessObj.category = {
            _id: category._id,
            title: category.title,
            description: category.description,
            image: category.image,
            slug: category.slug
          };
        } else {
          // If category not found, keep the original value
          businessObj.category = businessObj.category;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
        // Keep the original value on error
        businessObj.category = businessObj.category;
      }
    }
    
    // Populate subcategory data
    if (businessObj.subcategories && businessObj.subcategories.length > 0) {
      try {
        // Check if subcategories are ObjectIds or titles
        let subcategories;
        const subcategoryIds = businessObj.subcategories.filter(sub => 
          mongoose.Types.ObjectId.isValid(sub)
        );
        const subcategoryTitles = businessObj.subcategories.filter(sub => 
          !mongoose.Types.ObjectId.isValid(sub)
        );
        
        if (subcategoryIds.length > 0) {
          // If we have ObjectIds, find by _id
          subcategories = await SubCategory.find({
            _id: { $in: subcategoryIds },
            isActive: true
          }).select('_id title description image categoryId slug');
        } else if (subcategoryTitles.length > 0) {
          // If we have titles, find by title
          subcategories = await SubCategory.find({
            title: { $in: subcategoryTitles },
            isActive: true
          }).select('_id title description image categoryId slug');
        }
        
        // Populate category info for each subcategory
        const populatedSubcategories = await Promise.all(
          (subcategories || []).map(async (subcategory) => {
            const subcategoryObj = subcategory.toObject();
            if (subcategoryObj.categoryId) {
              const parentCategory = await Category.findById(subcategoryObj.categoryId)
                .select('_id title description slug');
              if (parentCategory) {
                subcategoryObj.parentCategory = {
                  _id: parentCategory._id,
                  title: parentCategory.title,
                  description: parentCategory.description,
                  slug: parentCategory.slug
                };
              }
            }
            return subcategoryObj;
          })
        );
        
        businessObj.subcategories = populatedSubcategories;
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        businessObj.subcategories = [];
      }
    } else {
      businessObj.subcategories = [];
    }
    
    // Populate subscription data
    const businessWithSubscription = await populateSubscriptionData(businessObj);
    
    // Send notifications
    try {
      // Send notification to business owner
      await NotificationHelper.sendBusinessNotifications.businessProfileUpdated(
        businessObj._id,
        {
          businessName: businessObj.businessName,
          updatedFields: Object.keys(req.body),
          updateDate: new Date()
        }
      );

      // Send notification to all admins
      const admins = await Admin.find({ status: 'active' });
      for (const admin of admins) {
        await NotificationHelper.sendBusinessNotifications.businessProfileUpdateAdminNotification(
          admin._id,
          {
            businessId: businessObj._id,
            businessName: businessObj.businessName,
            updatedFields: Object.keys(req.body),
            updateDate: new Date()
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending business update notifications:', notificationError);
      // Don't fail the request if notifications fail
    }
    
    return successResponseHelper(res, {
      message: 'Business updated successfully',
      data: businessWithSubscription
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findOneAndDelete({ _id: id, businessOwner: req.businessOwner._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    return successResponseHelper(res, {
      message: 'Business deleted successfully',
      data: business
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid business ID' });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    
    const business = await Business.findOneAndUpdate(
      { _id: id, businessOwner: req.businessOwner._id },
      { status },
      { new: true, runValidators: true }
    );
    
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    
    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;
    
    // Convert business to object for manipulation
    const businessObj = business.toObject();
    
    // Find and populate category data
    if (businessObj.category) {
      try {
        const category = await Category.findOne({ 
          _id: businessObj.category, 
          status: 'active' 
        }).select('_id title description image slug');
        
        if (category) {
          businessObj.category = {
            _id: category._id,
            title: category.title,
            description: category.description,
            image: category.image,
            slug: category.slug
          };
        } else {
          // If category not found, keep the original value
          businessObj.category = businessObj.category;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
        // Keep the original value on error
        businessObj.category = businessObj.category;
      }
    }
    
    // Find and populate subcategory data
    if (businessObj.subcategories && businessObj.subcategories.length > 0) {
      try {
        const subcategories = await SubCategory.find({
          _id: { $in: businessObj.subcategories },
          isActive: true
        }).select('_id title description image categoryId slug');
        
        // Populate category info for each subcategory
        const populatedSubcategories = await Promise.all(
          (subcategories || []).map(async (subcategory) => {
            const subcategoryObj = subcategory.toObject();
            if (subcategoryObj.categoryId) {
              const parentCategory = await Category.findById(subcategoryObj.categoryId)
                .select('_id title description slug');
              if (parentCategory) {
                subcategoryObj.parentCategory = {
                  _id: parentCategory._id,
                  title: parentCategory.title,
                  description: parentCategory.description,
                  slug: parentCategory.slug
                };
              }
            }
            return subcategoryObj;
          })
        );
        
        businessObj.subcategories = populatedSubcategories;
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        businessObj.subcategories = [];
      }
    } else {
      businessObj.subcategories = [];
    }
    
    // Clean up focusKeywords - convert objects to strings if needed
    if (businessObj.focusKeywords && Array.isArray(businessObj.focusKeywords)) {
      businessObj.focusKeywords = businessObj.focusKeywords.map(keyword => {
        if (typeof keyword === 'object' && keyword !== null) {
          return keyword.toString();
        }
        return keyword;
      });
    }
    
    // Clean up subcategories - only if they are still strings/objects (not already populated)
    if (businessObj.subcategories && Array.isArray(businessObj.subcategories)) {
      // Check if subcategories are already populated objects (have _id and title properties)
      const isAlreadyPopulated = businessObj.subcategories.length > 0 && 
        typeof businessObj.subcategories[0] === 'object' && 
        businessObj.subcategories[0]._id && 
        businessObj.subcategories[0].title;
      
      if (!isAlreadyPopulated) {
        businessObj.subcategories = businessObj.subcategories.map(sub => {
          if (typeof sub === 'object' && sub !== null) {
            return sub.toString();
          }
          return sub;
        });
      }
    }
    
    // Populate subscription data
    const businessWithSubscription = await populateSubscriptionData(businessObj);
    
    return successResponseHelper(res, {
      message: 'Business status updated successfully',
      data: businessWithSubscription
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getAvailablePlans = async (req, res) => {
  // Hardcoded for now, can be dynamic
  const plans = [
    { name: 'Bronze', value: 'bronze', price: 0, features: ['query_ticketing'] },
    { name: 'Silver', value: 'silver', price: 20, features: ['query_ticketing', 'review_management'] },
    { name: 'Gold', value: 'gold', price: 30, features: ['query_ticketing', 'review_management', 'review_embed'] },
  ];
  return successResponseHelper(res, {
    message: 'Plans retrieved successfully',
    data: plans
  });
};

export const getCurrentPlan = async (req, res) => {
  try {
    const business = await Business.findOne({ businessOwner: req.businessOwner._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    
    const businessObj = business.toObject();
    const businessWithSubscription = await populateSubscriptionData(businessObj);
    
    return successResponseHelper(res, {
      message: 'Current plan retrieved successfully',
      data: {
        plan: business.plan,
        features: business.features,
        status: business.status,
        activeSubscriptionId: businessWithSubscription.activeSubscriptionId,
        activeSubscription: businessWithSubscription.activeSubscription,
        legacySubscription: businessWithSubscription.legacySubscription
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// Get businesses for query ticket creation (simplified list)
export const getBusinessesForQueryTicket = async (req, res) => {
  try {
    const businesses = await Business.find({ 
      businessOwner: req.businessOwner._id,
      status: { $in: ['active', 'approved'] }
    })
    .select('_id businessName email phoneNumber status activeSubscriptionId')
    .sort({ businessName: 1 });
    
    // Populate subscription data for each business
    const businessesWithSubscriptions = await Promise.all(
      businesses.map(async (business) => {
        const businessObj = business.toObject();
        const businessWithSubscription = await populateSubscriptionData(businessObj);
        return businessWithSubscription;
      })
    );
    
    return successResponseHelper(res, {
      message: 'Businesses retrieved successfully',
      data: businessesWithSubscriptions
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// Get reviews for a specific business
export const getBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found or access denied' });
    }
    
    // Build filter object
    const filter = { businessId };
    if (status) filter.status = status;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get reviews
    const Review = (await import('../../models/admin/review.js')).default;
    const reviews = await Review.find(filter)
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Reviews retrieved successfully',
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// Get businesses with reviews
export const getBusinessesWithReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc', includeReviews = true, reviewsLimit = 5 } = req.query;
    
    console.log('getBusinessesWithReviews called with params:', {
      page, limit, search, status, sortBy, sortOrder, includeReviews, reviewsLimit
    });
    
    // Build filter object
    const filter = { businessOwner: req.businessOwner._id };
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Import Review model early to use in aggregation
    const Review = (await import('../../models/admin/review.js')).default;
    
    // Get businesses that have at least one review
    const businessesWithReviews = await Review.distinct('businessId');
    console.log('Businesses with reviews:', businessesWithReviews.length);
    
    // Add filter to only include businesses that have reviews
    filter._id = { $in: businessesWithReviews };
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get businesses with pagination
    const businesses = await Business.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Business.countDocuments(filter);
    
    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;
    
    // Populate category, subcategory, and reviews data for each business
    const populatedBusinesses = await Promise.all(
      businesses.map(async (business) => {
        const businessObj = business.toObject();
        
        // Find and populate category data
        if (businessObj.category) {
          try {
            const category = await Category.findOne({ 
              _id: businessObj.category, 
              status: 'active' 
            }).select('title description image');
            
            if (category) {
              businessObj.category = {
                _id: category._id,
                title: category.title,
                description: category.description,
                image: category.image
              };
            }
          } catch (error) {
            console.error('Error fetching category:', error);
          }
        }
        
        // Find and populate subcategory data
        if (businessObj.subcategories && businessObj.subcategories.length > 0) {
          try {
            const subcategories = await SubCategory.find({
              _id: { $in: businessObj.subcategories },
              isActive: true
            }).select('title description image categoryId');
            
            // Populate category info for each subcategory
            const populatedSubcategories = await Promise.all(
              subcategories.map(async (subcategory) => {
                const subcategoryObj = subcategory.toObject();
                if (subcategoryObj.categoryId) {
                  const parentCategory = await Category.findById(subcategoryObj.categoryId)
                    .select('title description');
                  if (parentCategory) {
                    subcategoryObj.parentCategory = {
                      _id: parentCategory._id,
                      title: parentCategory.title,
                      description: parentCategory.description
                    };
                  }
                }
                return subcategoryObj;
              })
            );
            
            businessObj.subcategories = populatedSubcategories;
          } catch (error) {
            console.error('Error fetching subcategories:', error);
          }
        }
        
        // Get reviews for this business if requested
        if (includeReviews === 'true' || includeReviews === true) {
          try {
            console.log('Fetching reviews for business:', businessObj._id);
            console.log('Business ID type:', typeof businessObj._id);
            console.log('Business ID value:', businessObj._id);
            
            // First, let's check if any reviews exist for this business
            const allReviewsForBusiness = await Review.find({ businessId: businessObj._id });
            console.log('All reviews in DB for business:', allReviewsForBusiness.length);
            
            // Let's also check all reviews in the database to see if there are any
            const totalReviewsInDB = await Review.countDocuments({});
            console.log('Total reviews in entire database:', totalReviewsInDB);
            
            if (totalReviewsInDB > 0) {
              const sampleReview = await Review.findOne({});
              console.log('Sample review from DB:', {
                _id: sampleReview._id,
                businessId: sampleReview.businessId,
                businessIdType: typeof sampleReview.businessId,
                businessIdString: sampleReview.businessId.toString(),
                rating: sampleReview.rating,
                status: sampleReview.status
              });
              
              // Let's also check if there are any reviews with this business ID using a direct query
              const directQuery = await Review.find({});
              console.log('All reviews business IDs:', directQuery.map(r => ({
                reviewId: r._id,
                businessId: r.businessId,
                businessIdString: r.businessId.toString()
              })));
            }
            console.log('Sample review data:', allReviewsForBusiness[0] ? {
              _id: allReviewsForBusiness[0]._id,
              businessId: allReviewsForBusiness[0].businessId,
              rating: allReviewsForBusiness[0].rating,
              status: allReviewsForBusiness[0].status
            } : 'No reviews found');
            
            // Try querying with the business ID directly
            let reviews = await Review.find({ businessId: businessObj._id })
              .populate('userId', 'name email profilePhoto')
              .populate('approvedBy', 'name email')
              .sort({ createdAt: -1 })
              .limit(parseInt(reviewsLimit) || 5);
            
            console.log('Found reviews with direct business ID:', reviews.length);
            
            // If no reviews found, try with string version of business ID
            if (reviews.length === 0) {
              console.log('No reviews found with ObjectId, trying with string version');
              reviews = await Review.find({ businessId: businessObj._id.toString() })
                .populate('userId', 'name email profilePhoto')
                .populate('approvedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(reviewsLimit) || 5);
              console.log('Found reviews with string ID:', reviews.length);
            }
            

            
            console.log('Found reviews after population:', reviews.length);
            businessObj.reviews = reviews;
            
            // Add review statistics
            const totalReviews = await Review.countDocuments({ businessId: businessObj._id });
            const approvedReviews = await Review.countDocuments({ businessId: businessObj._id, status: 'approved' });
            const pendingReviews = await Review.countDocuments({ businessId: businessObj._id, status: 'pending' });
            const manageableReviews = await Review.countDocuments({ businessId: businessObj._id, businessCanManage: true });
            
            // Calculate overall rating from all reviews
            const allReviews = await Review.find({ businessId: businessObj._id });
            let overallRating = 0;
            if (allReviews.length > 0) {
              const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
              overallRating = Math.round((totalRating / allReviews.length) * 10) / 10; // Round to 1 decimal place
            }
            
            businessObj.reviewStats = {
              total: totalReviews,
              approved: approvedReviews,
              pending: pendingReviews,
              manageable: manageableReviews,
              overallRating: overallRating
            };
            
            console.log('Review stats:', businessObj.reviewStats);
          } catch (error) {
            console.error('Error fetching reviews for business:', businessObj._id, error);
            businessObj.reviews = [];
            businessObj.reviewStats = {
              total: 0,
              approved: 0,
              pending: 0,
              manageable: 0,
              overallRating: 0
            };
          }
        } else {
          businessObj.reviews = [];
          businessObj.reviewStats = {
            total: 0,
            approved: 0,
            pending: 0,
            manageable: 0,
            overallRating: 0
          };
        }
        
        // Populate subscription data
        const businessWithSubscription = await populateSubscriptionData(businessObj);
        
        return businessWithSubscription;
      })
    );
    
    console.log('Sending response with', populatedBusinesses.length, 'businesses');
    console.log('First business reviews:', populatedBusinesses[0]?.reviews?.length || 0);
    
    return successResponseHelper(res, {
      message: 'Businesses retrieved successfully',
      data: populatedBusinesses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const createPlanPaymentSession = async (req, res) => {
  try {
    const { plan, businessId } = req.body;
    // Validate plan
    if (!['silver', 'gold'].includes(plan)) return res.status(400).json({ success: false, message: 'Invalid plan for payment' });
    // Set price (should match getAvailablePlans)
    const price = plan === 'silver' ? 2000 : 3000; // in cents
    // Get business
    const business = await Business.findOne({ _id: businessId, businessOwner: req.businessOwner._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    // Create product and price in Stripe first
    const product = await StripeHelper.createProduct({
      name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      description: `Upgrade to ${plan} plan`,
      planType: plan,
      features: ['query', 'review', 'embedded',"boost"]
    });

    const stripePrice = await StripeHelper.createPrice({
      productId: product.id,
      amount: price,
      currency: 'usd',
      planType: plan
    });

    // Create Stripe session
    const session = await StripeHelper.createStripeCheckoutSession({
      customerId: null, // No customer ID for this flow
      priceId: stripePrice.id,
      businessId: businessId,
      planType: plan,
      planId: plan
    });
    return successResponseHelper(res, {
      message: 'Payment session created successfully',
      data: { url: session.url }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getAllMyBusinessSubscriptions = async (req, res) => {
  try {
    // Find all businesses owned by the user
      const businesses = await Business.find({ businessOwner: req.businessOwner._id }, '_id businessName');
    const businessIds = businesses.map(b => b._id);
    // Find all subscriptions for these businesses
    const subscriptions = await BusinessSubscription.find({ businessId: { $in: businessIds } })
      .sort({ createdAt: -1 });
    return successResponseHelper(res, {
      message: 'Subscriptions retrieved successfully',
      data: { subscriptions, businesses }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const boostBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, businessOwner: req.businessOwner._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    const category = business.businessCategory;
    // Find any currently boosted business in this category
    const now = new Date();
    const boosted = await Business.findOne({
      businessCategory: category,
      boostActive: true,
      boostEndAt: { $gt: now }
    });
    if (boosted && String(boosted._id) !== String(business._id)) {
      // Queue this boost after the current one ends
      business.boostQueue.push({
        owner: req.businessOwner._id,
        start: boosted.boostEndAt,
        end: new Date(boosted.boostEndAt.getTime() + 24 * 60 * 60 * 1000)
      });
      await business.save();
      return res.json({
        success: true,
        message: 'Another business is already boosted in this category. Your boost will start after 24 hours.',
        boostStartAt: boosted.boostEndAt,
        boostEndAt: new Date(boosted.boostEndAt.getTime() + 24 * 60 * 60 * 1000)
      });
    }
    // No current boost, activate boost now
    business.boostActive = true;
    business.boostCategory = category;
    business.boostStartAt = now;
    business.boostEndAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await business.save();
    return res.json({
      success: true,
      message: 'Business is now boosted for 24 hours.',
      boostStartAt: now,
      boostEndAt: business.boostEndAt
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const agreeBoostBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, businessOwner: req.businessOwner._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    if (!business.boostQueue.length) return res.status(400).json({ success: false, message: 'No boost queued.' });
    const nextBoost = business.boostQueue[0];
    const now = new Date();
    if (now < nextBoost.start) {
      return res.status(400).json({ success: false, message: 'Boost period has not started yet.' });
    }
    // Activate boost
    business.boostActive = true;
    business.boostStartAt = nextBoost.start;
    business.boostEndAt = nextBoost.end;
    business.boostQueue.shift();
    await business.save();
    return successResponseHelper(res, {
      message: 'Business boost is now active.',
      data: { boostStartAt: business.boostStartAt, boostEndAt: business.boostEndAt }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getBoostedBusinesses = async (req, res) => {
  try {
    const now = new Date();
    // Get all currently boosted businesses
    const boosted = await Business.find({ boostActive: true, boostEndAt: { $gt: now } }).sort({ boostEndAt: -1 });
    return successResponseHelper(res, {
      message: 'Boosted businesses retrieved successfully',
      data: boosted
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getMyBusinessBoosts = async (req, res) => {
  try {
    // Find all businesses owned by the user
    const businesses = await Business.find({ businessOwner: req.businessOwner._id });
    // Collect boost info for each business
    const boosts = businesses.map(b => ({
      businessId: b._id,
      businessName: b.businessName,
      boostActive: b.boostActive,
      boostCategory: b.boostCategory,
      boostStartAt: b.boostStartAt,
      boostEndAt: b.boostEndAt,
      boostQueue: b.boostQueue
    }));
    return successResponseHelper(res, {
      message: 'Boost history retrieved successfully',
      data: boosts
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const deleteBusinessBoosts = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, businessOwner: req.businessOwner._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    business.boostActive = false;
    business.boostCategory = undefined;
    business.boostStartAt = undefined;
    business.boostEndAt = undefined;
    business.boostQueue = [];
    await business.save();
    return successResponseHelper(res, {
      message: 'All previous boosts deleted for this business.'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

export const getOwnerRecentSubscriptions = async (req, res) => {
  try {
    // Find all subscriptions where the owner is the payer (assuming owner._id is stored in subscription, otherwise filter by their businesses)
    // Here, we filter by all businesses owned by the user
    const businesses = await Business.find({ businessOwner: req.businessOwner._id }, '_id businessName');
    const businessIds = businesses.map(b => b._id);
    const subscriptions = await BusinessSubscription.find({ businessId: { $in: businessIds } })
      .sort({ createdAt: -1 });
    return successResponseHelper(res, {
      message: 'Recent subscriptions retrieved successfully',
      data: subscriptions
    });
  } catch (error) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};



export const validateBusinessWebsite = async (req, res) => {
  const { website } = req.body;
  // 1. Validate URL format
  const websiteSchema = Joi.string().uri().required();
  const { error } = websiteSchema.validate(website);
  if (error) return res.status(400).json({ success: false, message: 'Invalid website URL format.' });

  try {
    // 2. Check for inappropriate content using ModerateContent API
    // Replace 'YOUR_API_KEY' with your actual API key
    const apiUrl = `https://api.moderatecontent.com/moderate/?key=YOUR_API_KEY&url=${encodeURIComponent(website)}`;
    const response = await axios.get(apiUrl);
    // The API returns a rating: 'everyone', 'teen', 'adult', etc.
    if (response.data && response.data.rating_label && response.data.rating_label !== 'everyone') {
      return res.status(400).json({ success: false, message: 'Website contains inappropriate content.' });
    }
    // If safe
    return successResponseHelper(res, {
      message: 'Website is valid and safe.'
    });
  } catch (err) {
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// Stripe Webhook Handler for Business Subscriptions
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return successResponseHelper(res, {
      message: 'Webhook received successfully'
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// Helper functions for webhook events
const handleCheckoutSessionCompleted = async (session) => {
  console.log('Checkout session completed:', session.id);
  
  const { businessId, plan } = session.metadata;
  
  if (!businessId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  try {
    // Update business plan
    const business = await Business.findById(businessId);
    if (!business) {
      console.error('Business not found:', businessId);
      return;
    }

    // Update business features based on plan
    let features = [];
    if (plan === 'silver') features = ['query_ticketing', 'review_management'];
    if (plan === 'gold') features = ['query_ticketing', 'review_management', 'review_embed'];
    
    // Generate embed token for gold plan
    let embedToken = business.embedToken;
    if (plan === 'gold' && !embedToken) {
      embedToken = Math.random().toString(36).substring(2, 15);
    }

    business.plan = plan;
    business.features = features;
    business.embedToken = embedToken;
    business.status = 'active';
    await business.save();

    // Create subscription record
    const subscription = await BusinessSubscription.create({
      businessId: business._id,
      planId: null, // You might want to create a plan model
      status: 'active',
      subscriptionType: plan,
      createdAt: new Date(),
      expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });

    // Update business with businessSubscriptionId
    business.businessSubscriptionId = subscription._id;
    await business.save();

    // Send notifications
    try {
      // Send notification to business owner
      await NotificationHelper.sendEnhancedSubscriptionNotifications.subscriptionPurchased(
        businessId,
        {
          subscriptionId: subscription._id,
          planName: plan,
          amount: session.amount_total / 100, // Convert from cents
          currency: session.currency,
          duration: '30 days'
        }
      );

      // Send notification to all admins
      const admins = await Admin.find({ status: 'active' });
      for (const admin of admins) {
        await NotificationHelper.sendEnhancedSubscriptionNotifications.subscriptionPurchaseAdminNotification(
          admin._id,
          {
            subscriptionId: subscription._id,
            businessId: businessId,
            businessName: business.businessName,
            planName: plan,
            amount: session.amount_total / 100,
            currency: session.currency
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending subscription purchase notifications:', notificationError);
    }

    console.log('Business plan updated successfully:', businessId, plan);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
};

const handlePaymentIntentSucceeded = async (paymentIntent) => {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  const { businessId, plan } = paymentIntent.metadata;
  
  if (!businessId || !plan) {
    console.error('Missing metadata in payment intent');
    return;
  }

  try {
    // Similar logic to checkout session completed
    const business = await Business.findById(businessId);
    if (!business) {
      console.error('Business not found:', businessId);
      return;
    }

    // Update business plan and features
    let features = [];
    if (plan === 'silver') features = ['query_ticketing', 'review_management'];
    if (plan === 'gold') features = ['query_ticketing', 'review_management', 'review_embed'];
    
    let embedToken = business.embedToken;
    if (plan === 'gold' && !embedToken) {
      embedToken = Math.random().toString(36).substring(2, 15);
    }

    business.plan = plan;
    business.features = features;
    business.embedToken = embedToken;
    business.status = 'active';
    await business.save();

    // Create or update subscription record
    const existingSubscription = await BusinessSubscription.findOne({ 
      businessId: business._id,
      status: 'active'
    });

    if (existingSubscription) {
      existingSubscription.subscriptionType = plan;
      existingSubscription.expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await existingSubscription.save();
      
      // Update business with businessSubscriptionId
      business.businessSubscriptionId = existingSubscription._id;
      await business.save();
    } else {
      const newSubscription = await BusinessSubscription.create({
        businessId: business._id,
        planId: null,
        status: 'active',
        subscriptionType: plan,
        createdAt: new Date(),
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      // Update business with businessSubscriptionId
      business.businessSubscriptionId = newSubscription._id;
      await business.save();
    }

    console.log('Payment intent processed successfully:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
};

const handlePaymentIntentFailed = async (paymentIntent) => {
  console.log('Payment intent failed:', paymentIntent.id);
  
  const { businessId } = paymentIntent.metadata;
  
  if (businessId) {
    try {
      // Optionally update business status or send notification
      const business = await Business.findById(businessId);
      if (business) {
        // You might want to send an email notification to the business owner
        console.log('Payment failed for business:', businessId);
      }
    } catch (error) {
      console.error('Error handling payment intent failed:', error);
    }
  }
};

const handleInvoicePaymentSucceeded = async (invoice) => {
  console.log('Invoice payment succeeded:', invoice.id);
  // Handle recurring subscription payments
  // This would be useful for monthly/yearly subscriptions
};

const handleInvoicePaymentFailed = async (invoice) => {
  console.log('Invoice payment failed:', invoice.id);
  // Handle failed recurring payments
};

const handleSubscriptionCreated = async (subscription) => {
  console.log('Subscription created:', subscription.id);
  // Handle new subscription creation
};

const handleSubscriptionUpdated = async (subscription) => {
  console.log('Subscription updated:', subscription.id);
  // Handle subscription updates
};

const handleSubscriptionDeleted = async (subscription) => {
  console.log('Subscription deleted:', subscription.id);
  // Handle subscription cancellation
}; 

// Get detailed subscription information for a business
export const getBusinessSubscriptionDetails = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ success: false, message: 'Invalid business ID' });
    }
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found or access denied' });
    }
    
    // Find active subscription
    const activeSubscription = await Subscription.findOne({
      business: businessId,
      status: 'active'
    }).populate('paymentPlan', 'name description planType price currency features maxBoostPerDay validityHours isLifetime');
    
    // Find all subscriptions for this business
    const allSubscriptions = await Subscription.find({
      business: businessId
    }).populate('paymentPlan', 'name description planType price currency features maxBoostPerDay validityHours isLifetime')
    .sort({ createdAt: -1 });
    
    // Find legacy subscriptions
    const legacySubscriptions = await BusinessSubscription.find({
      businessId: businessId
    }).sort({ createdAt: -1 });
    
    const subscriptionData = {
      business: {
        _id: business._id,
        businessName: business.businessName,
        activeSubscriptionId: business.activeSubscriptionId,
        plan: business.plan,
        features: business.features
      },
      activeSubscription: activeSubscription ? {
        _id: activeSubscription._id,
        subscriptionType: activeSubscription.subscriptionType,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        currency: activeSubscription.currency,
        isLifetime: activeSubscription.isLifetime,
        expiresAt: activeSubscription.expiresAt,
        createdAt: activeSubscription.createdAt,
        paymentPlan: activeSubscription.paymentPlan ? {
          _id: activeSubscription.paymentPlan._id,
          name: activeSubscription.paymentPlan.name,
          description: activeSubscription.paymentPlan.description,
          planType: activeSubscription.paymentPlan.planType,
          price: activeSubscription.paymentPlan.price,
          currency: activeSubscription.paymentPlan.currency,
          features: activeSubscription.paymentPlan.features || [],
          maxBoostPerDay: activeSubscription.paymentPlan.maxBoostPerDay,
          validityHours: activeSubscription.paymentPlan.validityHours
        } : null,
        boostUsage: activeSubscription.boostUsage || null,
        featureUsage: activeSubscription.featureUsage || null
      } : null,
      allSubscriptions: allSubscriptions.map(sub => ({
        _id: sub._id,
        subscriptionType: sub.subscriptionType,
        status: sub.status,
        amount: sub.amount,
        currency: sub.currency,
        isLifetime: sub.isLifetime,
        expiresAt: sub.expiresAt,
        createdAt: sub.createdAt,
        paymentPlan: sub.paymentPlan ? {
          _id: sub.paymentPlan._id,
          name: sub.paymentPlan.name,
          description: sub.paymentPlan.description,
          planType: sub.paymentPlan.planType,
          price: sub.paymentPlan.price,
          currency: sub.paymentPlan.currency,
          features: sub.paymentPlan.features || [],
          maxBoostPerDay: sub.paymentPlan.maxBoostPerDay,
          validityHours: sub.paymentPlan.validityHours
        } : null
      })),
      legacySubscriptions: legacySubscriptions.map(sub => ({
        _id: sub._id,
        subscriptionType: sub.subscriptionType,
        status: sub.status,
        createdAt: sub.createdAt,
        expiredAt: sub.expiredAt
      }))
    };
    
    return successResponseHelper(res, {
      message: 'Business subscription details retrieved successfully',
      data: subscriptionData
    });
  } catch (error) {
    console.error('Error getting business subscription details:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};