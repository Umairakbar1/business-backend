import Review from '../../models/admin/review.js';
import Business from '../../models/business/business.js';
import User from '../../models/user/user.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// Helper function to get business data in the same format as getBusinessWithReviews
const getBusinessDataWithReviews = async (businessId) => {
  try {
    // Get business details
    const business = await Business.findById(businessId)
      .populate('category', 'name')
      .populate('businessOwner', 'name email phoneNumber')
      .populate('subcategories', 'name');
    
    if (!business) {
      return null;
    }
    
    // Get review statistics
    const reviewStats = await Review.aggregate([
      { $match: { businessId: business._id } },
      {
        $group: {
          _id: '$businessId',
          totalReviews: { $sum: 1 },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);
    
    // Get recent reviews (limit to 5)
    const reviews = await Review.find({ businessId: business._id })
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .populate('businessManagementGrantedBy', 'name email')
      .populate('replies.admin.authorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const totalReviews = await Review.countDocuments({ businessId: business._id });
    
    // Calculate rating distribution
    const stats = reviewStats[0] || {
      totalReviews: 0,
      approvedReviews: 0,
      pendingReviews: 0,
      rejectedReviews: 0,
      averageRating: 0,
      ratingDistribution: []
    };
    
    const ratingDistribution = {
      1: stats.ratingDistribution.filter(r => r === 1).length,
      2: stats.ratingDistribution.filter(r => r === 2).length,
      3: stats.ratingDistribution.filter(r => r === 3).length,
      4: stats.ratingDistribution.filter(r => r === 4).length,
      5: stats.ratingDistribution.filter(r => r === 5).length
    };
    
    return {
      _id: business._id,
      businessName: business.businessName,
      logo: business.logo,
      category: business.category,
      subcategories: business.subcategories,
      email: business.email,
      phoneNumber: business.phoneNumber,
      status: business.status,
      plan: business.plan,
      about: business.about,
      serviceOffer: business.serviceOffer,
      location: business.location,
      city: business.city,
      state: business.state,
      zipCode: business.zipCode,
      country: business.country,
      facebook: business.facebook,
      linkedIn: business.linkedIn,
      website: business.website,
      twitter: business.twitter,
      businessOwner: business.businessOwner,
      reviewManagementAccess: business.reviewManagementAccess,
      features: business.features,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      reviewStats: {
        total: stats.totalReviews,
        approved: stats.approvedReviews,
        pending: stats.pendingReviews,
        manageable: stats.rejectedReviews, // or calculate manageable reviews
        overallRating: Math.round(stats.averageRating * 10) / 10 || 0
      },
      reviews: reviews
    };
  } catch (error) {
    console.error('Error in getBusinessDataWithReviews:', error);
    return null;
  }
};

// GET /admin/reviews - Get all reviews with business and user information
export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, businessId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (businessId) filter.businessId = businessId;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get reviews with populated business and user information
    const reviews = await Review.find(filter)
      .populate('businessId', 'businessName contactPerson email phone businessCategory')
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .populate('businessManagementGrantedBy', 'name email')
      .populate('replies.admin.authorId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Reviews fetched successfully',
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /admin/reviews/:id - Get single review with details
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findById(id)
      .populate('businessId', 'businessName contactPerson email phone businessCategory')
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .populate('businessManagementGrantedBy', 'name email')
      .populate('replies.admin.authorId', 'name email');
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    return successResponseHelper(res, {
      message: 'Review fetched successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/:id/approve - Approve a review
export const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    if (review.status === 'approved') {
      return errorResponseHelper(res, { message: 'Review is already approved', code: '00400' });
    }
    
    review.status = 'approved';
    review.approvedBy = adminId;
    review.approvedAt = new Date();
    review.updatedAt = new Date();
    
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Review approved successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/:id/reject - Reject a review
export const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    if (review.status === 'rejected') {
      return errorResponseHelper(res, { message: 'Review is already rejected', code: '00400' });
    }
    
    review.status = 'rejected';
    review.approvedBy = adminId;
    review.approvedAt = new Date();
    review.updatedAt = new Date();
    
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Review rejected successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /admin/reviews/:id - Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    return successResponseHelper(res, {
      message: 'Review deleted successfully'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/:id/grant-business-access - Grant business access to manage this review
export const grantBusinessAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    if (review.businessCanManage) {
      return errorResponseHelper(res, { message: 'Business already has access to this review', code: '00400' });
    }
    
    review.businessCanManage = true;
    review.businessManagementGrantedBy = adminId;
    review.businessManagementGrantedAt = new Date();
    review.updatedAt = new Date();
    
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Business access granted successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/:id/revoke-business-access - Revoke business access to manage this review
export const revokeBusinessAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    if (!review.businessCanManage) {
      return errorResponseHelper(res, { message: 'Business does not have access to this review', code: '00400' });
    }
    
    review.businessCanManage = false;
    review.businessManagementGrantedBy = adminId;
    review.businessManagementGrantedAt = new Date();
    review.updatedAt = new Date();
    
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Business access revoked successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /admin/reviews/business/:businessId - Get reviews for a specific business
export const getReviewsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return errorResponseHelper(res, { message: 'Invalid business ID', code: '00400' });
    }
    
    // Check if business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    // Build filter object
    const filter = { businessId };
    if (status) filter.status = status;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get reviews with populated user information
    const reviews = await Review.find(filter)
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .populate('businessManagementGrantedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Business reviews fetched successfully',
      data: {
        business: {
          _id: business._id,
          businessName: business.businessName,
          contactPerson: business.contactPerson,
          email: business.email,
          phone: business.phone,
          businessCategory: business.businessCategory
        },
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /admin/reviews/stats - Get review statistics
export const getReviewStats = async (req, res) => {
  try {
    const totalReviews = await Review.countDocuments();
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const approvedReviews = await Review.countDocuments({ status: 'approved' });
    const rejectedReviews = await Review.countDocuments({ status: 'rejected' });
    
    // Get reviews by business
    const reviewsByBusiness = await Review.aggregate([
      {
        $group: {
          _id: '$businessId',
          totalReviews: { $sum: 1 },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'businesses',
          localField: '_id',
          foreignField: '_id',
          as: 'business'
        }
      },
      {
        $unwind: '$business'
      },
      {
        $project: {
          businessName: '$business.businessName',
          totalReviews: 1,
          approvedReviews: 1,
          pendingReviews: 1,
          rejectedReviews: 1
        }
      }
    ]);
    
    return successResponseHelper(res, {
      message: 'Review statistics fetched successfully',
      data: {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        reviewsByBusiness
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 

// GET /admin/business/businesses-with-reviews - Get businesses with their review information
export const getBusinessesWithReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc', includeReviews = true, reviewsLimit = 5 } = req.query;
    
    console.log('getBusinessesWithReviews called with params:', {
      page, limit, search, status, sortBy, sortOrder, includeReviews, reviewsLimit
    });
    
    // Import Review model first to get businesses with reviews
    let Review;
    try {
      Review = (await import('../../models/admin/review.js')).default;
      if (!Review) {
        throw new Error('Failed to import Review model');
      }
    } catch (importError) {
      console.error('Error importing Review model:', importError);
      return errorResponseHelper(res, { message: 'Failed to load Review model', code: '00500' });
    }
    
    // Get business IDs that have at least 1 review
    const businessesWithReviews = await Review.distinct('businessId');
    console.log('Businesses with reviews found:', businessesWithReviews.length);
    
    if (businessesWithReviews.length === 0) {
      return successResponseHelper(res, {
        message: 'No businesses with reviews found',
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }
    
    // Build filter object - Only include businesses that have reviews
    const filter = {
      _id: { $in: businessesWithReviews }
    };
    
    // Add search functionality
    if (search) {
      filter.$and = [
        { _id: { $in: businessesWithReviews } },
        {
          $or: [
            { businessName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
    
    // Add status filter
    if (status) {
      if (filter.$and) {
        filter.$and.push({ status });
      } else {
        filter.status = status;
      }
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get businesses with reviews and pagination
    const businesses = await Business.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    if (!businesses || businesses.length === 0) {
      return successResponseHelper(res, {
        message: 'No businesses found',
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }
    
    // Get total count for pagination - only count businesses with reviews
    const total = await Business.countDocuments(filter);
    
    // Import Category and SubCategory models
    let Category, SubCategory;
    try {
      Category = (await import('../../models/admin/category.js')).default;
      SubCategory = (await import('../../models/admin/subCategory.js')).default;
      
      if (!Category || !SubCategory) {
        throw new Error('Failed to import required models');
      }
    } catch (importError) {
      console.error('Error importing models:', importError);
      return errorResponseHelper(res, { message: 'Failed to load required models', code: '00500' });
    }
    
    // Populate category, subcategory, and reviews data for each business
    let populatedBusinesses;
    try {
      populatedBusinesses = await Promise.all(
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
              .populate('replies.admin.authorId', 'name email')
              .sort({ createdAt: -1 })
              .limit(parseInt(reviewsLimit) || 5);
            
            console.log('Found reviews with direct business ID:', reviews.length);
            
            // If no reviews found, try with string version of business ID
            if (reviews.length === 0) {
              console.log('No reviews found with ObjectId, trying with string version');
              reviews = await Review.find({ businessId: businessObj._id.toString() })
                .populate('userId', 'name email profilePhoto')
                .populate('approvedBy', 'name email')
                .populate('replies.admin.authorId', 'name email')
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
        
        return businessObj;
      })
      );
    } catch (populateError) {
      console.error('Error populating business data:', populateError);
      return errorResponseHelper(res, { message: 'Failed to populate business data', code: '00500' });
    }
    
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
    console.error('Error in getBusinessesWithReviews:', error);
    return errorResponseHelper(res, { message: error.message || 'Internal server error', code: '00500' });
  }
};

// GET /admin/businesses-with-reviews/:businessId - Get single business with detailed review information
export const getBusinessWithReviewsById = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return errorResponseHelper(res, { message: 'Invalid business ID', code: '00400' });
    }
    
    // Get business details
    const business = await Business.findById(businessId)
      .populate('category', 'name')
      .populate('businessOwner', 'name email phoneNumber')
      .populate('subcategories', 'name');
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    // Build filter for reviews
    const reviewFilter = { businessId };
    if (status) reviewFilter.status = status;
    
    // Build sort object for reviews
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get review statistics
    const reviewStats = await Review.aggregate([
      { $match: { businessId: business._id } },
      {
        $group: {
          _id: '$businessId',
          totalReviews: { $sum: 1 },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);
    
    // Get reviews with pagination
    const reviews = await Review.find(reviewFilter)
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .populate('businessManagementGrantedBy', 'name email')
      .populate('replies.admin.authorId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalReviews = await Review.countDocuments(reviewFilter);
    
    // Calculate rating distribution
    const stats = reviewStats[0] || {
      totalReviews: 0,
      approvedReviews: 0,
      pendingReviews: 0,
      rejectedReviews: 0,
      averageRating: 0,
      ratingDistribution: []
    };
    
    const ratingDistribution = {
      1: stats.ratingDistribution.filter(r => r === 1).length,
      2: stats.ratingDistribution.filter(r => r === 2).length,
      3: stats.ratingDistribution.filter(r => r === 3).length,
      4: stats.ratingDistribution.filter(r => r === 4).length,
      5: stats.ratingDistribution.filter(r => r === 5).length
    };
    
    return successResponseHelper(res, {
      message: 'Business with reviews fetched successfully',
      data: {
        business: {
          _id: business._id,
          businessName: business.businessName,
          logo: business.logo,
          category: business.category,
          subcategories: business.subcategories,
          email: business.email,
          phoneNumber: business.phoneNumber,
          status: business.status,
          plan: business.plan,
          about: business.about,
          serviceOffer: business.serviceOffer,
          location: business.location,
          city: business.city,
          state: business.state,
          zipCode: business.zipCode,
          country: business.country,
          socialMedia: {
            facebook: business.facebook,
            linkedIn: business.linkedIn,
            website: business.website,
            twitter: business.twitter
          },
          businessOwner: business.businessOwner,
          reviewManagementAccess: business.reviewManagementAccess,
          features: business.features,
          createdAt: business.createdAt,
          updatedAt: business.updatedAt
        },
        reviewStats: {
          totalReviews: stats.totalReviews,
          approvedReviews: stats.approvedReviews,
          pendingReviews: stats.pendingReviews,
          rejectedReviews: stats.rejectedReviews,
          averageRating: Math.round(stats.averageRating * 10) / 10 || 0,
          ratingDistribution
        },
        reviews: {
          data: reviews,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalReviews,
            totalPages: Math.ceil(totalReviews / parseInt(limit))
          }
        }
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /admin/reviews/:id/comments - Add comment to review
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Get admin details for author name
    const admin = req.user;
    const authorName = admin ? `${admin.firstName || 'Admin'} ${admin.lastName || ''} (Admin)`.trim() || 'Admin User' : 'Admin User';
    const authorEmail = admin?.email || '';
    
    const comment = {
      content,
      authorId: adminId,
      authorType: 'admin',
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    review.comments.push(comment);
    review.updatedAt = new Date();
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Comment added successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /admin/reviews/comments/:commentId/replies - Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid comment ID', code: '00400' });
    }
    
    // Find the comment and its parent review
    const review = await Review.findOne({
      'comments._id': commentId
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Get admin details for author name
    const admin = req.user;
    const authorName = admin ? `${admin.firstName || 'Admin'} ${admin.lastName || ''} (Admin)`.trim() || 'Admin User' : 'Admin User';
    const authorEmail = admin?.email || '';
    
    const reply = {
      content,
      authorId: adminId,
      authorType: 'admin',
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    comment.replies.push(reply);
    review.updatedAt = new Date();
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/comments/:commentId - Edit comment
export const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid comment ID', code: '00400' });
    }
    
    // Find the comment and its parent review
    const review = await Review.findOne({
      'comments._id': commentId
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this admin
    if (comment.authorId.toString() !== adminId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own comments', code: '00403' });
    }
    
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    comment.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName contactPerson email phone businessCategory');
    await review.populate('userId', 'name email profilePhoto');
    await review.populate('approvedBy', 'name email');
    await review.populate('businessManagementGrantedBy', 'name email');
    
    return successResponseHelper(res, {
      message: 'Comment updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/comments/:commentId/replies/:replyId - Edit reply
export const editReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid comment or reply ID', code: '00400' });
    }
    
    // Find the comment and its parent review
    const review = await Review.findOne({
      'comments._id': commentId
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this admin
    if (reply.authorId.toString() !== adminId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own replies', code: '00403' });
    }
    
    reply.content = content;
    reply.isEdited = true;
    reply.editedAt = new Date();
    reply.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName contactPerson email phone businessCategory');
    await review.populate('userId', 'name email profilePhoto');
    await review.populate('approvedBy', 'name email');
    await review.populate('businessManagementGrantedBy', 'name email');
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /admin/reviews/comments/:commentId - Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid comment ID', code: '00400' });
    }
    
    // Find the comment and its parent review
    const review = await Review.findOne({
      'comments._id': commentId
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this admin
    if (comment.authorId.toString() !== adminId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own comments', code: '00403' });
    }
    
    // Remove the comment
    review.comments.pull(commentId);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName contactPerson email phone businessCategory');
    await review.populate('userId', 'name email profilePhoto');
    await review.populate('approvedBy', 'name email');
    await review.populate('businessManagementGrantedBy', 'name email');
    
    return successResponseHelper(res, {
      message: 'Comment deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /admin/reviews/comments/:commentId/replies/:replyId - Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid comment or reply ID', code: '00400' });
    }
    
    // Find the comment and its parent review
    const review = await Review.findOne({
      'comments._id': commentId
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this admin
    if (reply.authorId.toString() !== adminId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own replies', code: '00403' });
    }
    
    // Remove the reply
    comment.replies.pull(replyId);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName contactPerson email phone businessCategory');
    await review.populate('userId', 'name email profilePhoto');
    await review.populate('approvedBy', 'name email');
    await review.populate('businessManagementGrantedBy', 'name email');
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 

// POST /admin/reviews/:id/reply - Add direct reply to review
export const addReplyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Check if admin already has a reply
    if (review.replies?.admin?.content) {
      return errorResponseHelper(res, { message: 'Admin already has a reply to this review', code: '00400' });
    }
    
    // Get admin details for author name
    const admin = req.user;
    const authorName = admin ? `${admin.firstName || 'Admin'} ${admin.lastName || ''} (Admin)`.trim() || 'Admin User' : 'Admin User';
    const authorEmail = admin?.email || '';
    
    // Initialize replies object if it doesn't exist
    if (!review.replies) {
      review.replies = {};
    }
    
    review.replies.admin = {
      content,
      authorId: adminId,
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    review.updatedAt = new Date();
    await review.save();
    
    // Get business data with reviews in the same format as getBusinessWithReviews
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/reviews/:id/reply - Edit reply to review
export const editReplyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Check if admin has a reply
    if (!review.replies?.admin?.content) {
      return errorResponseHelper(res, { message: 'Admin does not have a reply to this review', code: '00400' });
    }
    
    // Check if reply belongs to this admin
    if (review.replies.admin.authorId.toString() !== adminId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own replies', code: '00403' });
    }
    
    review.replies.admin.content = content;
    review.replies.admin.isEdited = true;
    review.replies.admin.editedAt = new Date();
    review.replies.admin.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName contactPerson email phone businessCategory');
    await review.populate('userId', 'name email profilePhoto');
    await review.populate('approvedBy', 'name email');
    await review.populate('businessManagementGrantedBy', 'name email');
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /admin/reviews/:id/reply - Delete reply to review
export const deleteReplyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Check if admin has a reply
    if (!review.replies?.admin?.content) {
      return errorResponseHelper(res, { message: 'Admin does not have a reply to this review', code: '00400' });
    }
    
    // Check if reply belongs to this admin
    if (review.replies.admin.authorId.toString() !== adminId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own replies', code: '00403' });
    }
    
    // Remove the admin reply
    review.replies.admin = undefined;
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName contactPerson email phone businessCategory');
    await review.populate('userId', 'name email profilePhoto');
    await review.populate('approvedBy', 'name email');
    await review.populate('businessManagementGrantedBy', 'name email');
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 

