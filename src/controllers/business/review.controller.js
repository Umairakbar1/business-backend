import Review from '../../models/admin/review.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// GET /business/reviews - Get reviews for business (only those they can manage)
export const getBusinessReviews = async (req, res) => {
  try {
    const businessId = req.business?._id;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    // Build filter object - only reviews for this business
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

// GET /business/reviews/manageable - Get reviews that business can manage
export const getManageableReviews = async (req, res) => {
  try {
    const businessId = req.business?._id;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    // Build filter object - only reviews this business can manage
    const filter = { 
      businessId,
      businessCanManage: true
    };
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
      message: 'Manageable reviews fetched successfully',
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

// GET /business/reviews/:id - Get single review details
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findOne({ 
      _id: id, 
      businessId 
    })
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

// PUT /business/reviews/:id/approve - Approve a review (only if business has access)
export const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findOne({ 
      _id: id, 
      businessId,
      businessCanManage: true
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found or you do not have access to manage it', code: '00404' });
    }
    
    if (review.status === 'approved') {
      return errorResponseHelper(res, { message: 'Review is already approved', code: '00400' });
    }
    
    review.status = 'approved';
    review.approvedBy = businessId;
    review.approvedByType = 'business';
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

// PUT /business/reviews/:id/reject - Reject a review (only if business has access)
export const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findOne({ 
      _id: id, 
      businessId,
      businessCanManage: true
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found or you do not have access to manage it', code: '00404' });
    }
    
    if (review.status === 'rejected') {
      return errorResponseHelper(res, { message: 'Review is already rejected', code: '00400' });
    }
    
    review.status = 'rejected';
    review.approvedBy = businessId;
    review.approvedByType = 'business';
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

// DELETE /business/reviews/:id - Delete a review (only if business has access)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    const review = await Review.findOne({ 
      _id: id, 
      businessId,
      businessCanManage: true
    });
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found or you do not have access to manage it', code: '00404' });
    }
    
    await Review.findByIdAndDelete(id);
    
    return successResponseHelper(res, {
      message: 'Review deleted successfully'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /business/reviews/stats - Get review statistics for business
export const getReviewStats = async (req, res) => {
  try {
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    const totalReviews = await Review.countDocuments({ businessId });
    const pendingReviews = await Review.countDocuments({ businessId, status: 'pending' });
    const approvedReviews = await Review.countDocuments({ businessId, status: 'approved' });
    const rejectedReviews = await Review.countDocuments({ businessId, status: 'rejected' });
    const manageableReviews = await Review.countDocuments({ businessId, businessCanManage: true });
    
    return successResponseHelper(res, {
      message: 'Review statistics fetched successfully',
      data: {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        manageableReviews
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 