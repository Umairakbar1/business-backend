import Review from '../../models/admin/review.js';
import Business from '../../models/business/business.js';
import User from '../../models/user/user.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

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
      .populate('businessManagementGrantedBy', 'name email');
    
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
    
    return successResponseHelper(res, {
      message: 'Review approved successfully',
      data: review
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
    
    return successResponseHelper(res, {
      message: 'Review rejected successfully',
      data: review
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
    
    return successResponseHelper(res, {
      message: 'Business access granted successfully',
      data: review
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
    
    return successResponseHelper(res, {
      message: 'Business access revoked successfully',
      data: review
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