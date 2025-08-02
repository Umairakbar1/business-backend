import Review from '../../models/admin/review.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// GET /business/reviews - Get reviews for business (only those they can manage)
export const getBusinessReviews = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner?._id;
    const { page = 1, limit = 10, status, businessId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    // Build filter object - only reviews for businesses owned by this business owner
    const filter = {};
    
    // If specific businessId is provided, verify ownership
    if (businessId) {
      const business = await Business.findOne({ 
        _id: businessId, 
        businessOwner: businessOwnerId 
      });
      if (!business) {
        return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
      }
      filter.businessId = businessId;
    } else {
      // Get all businesses owned by this business owner
      const businesses = await Business.find({ businessOwner: businessOwnerId }, '_id');
      const businessIds = businesses.map(b => b._id);
      filter.businessId = { $in: businessIds };
    }
    
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
    const businessOwnerId = req.businessOwner?._id;
    const { page = 1, limit = 10, status, businessId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    // Build filter object - only reviews this business owner can manage
    const filter = { 
      businessCanManage: true
    };
    
    // If specific businessId is provided, verify ownership
    if (businessId) {
      const business = await Business.findOne({ 
        _id: businessId, 
        businessOwner: businessOwnerId 
      });
      if (!business) {
        return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
      }
      filter.businessId = businessId;
    } else {
      // Get all businesses owned by this business owner
      const businesses = await Business.find({ businessOwner: businessOwnerId }, '_id');
      const businessIds = businesses.map(b => b._id);
      filter.businessId = { $in: businessIds };
    }
    
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership
    const review = await Review.findById(id)
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .populate('businessManagementGrantedBy', 'name email');
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership and management access
    const review = await Review.findById(id);
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    if (!review.businessCanManage) {
      return errorResponseHelper(res, { message: 'You do not have access to manage this review', code: '00403' });
    }
    
    if (review.status === 'approved') {
      return errorResponseHelper(res, { message: 'Review is already approved', code: '00400' });
    }
    
    review.status = 'approved';
    review.approvedBy = businessOwnerId;
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership and management access
    const review = await Review.findById(id);
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    if (!review.businessCanManage) {
      return errorResponseHelper(res, { message: 'You do not have access to manage this review', code: '00403' });
    }
    
    if (review.status === 'rejected') {
      return errorResponseHelper(res, { message: 'Review is already rejected', code: '00400' });
    }
    
    review.status = 'rejected';
    review.approvedBy = businessOwnerId;
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership and management access
    const review = await Review.findById(id);
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    if (!review.businessCanManage) {
      return errorResponseHelper(res, { message: 'You do not have access to manage this review', code: '00403' });
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
    const businessOwnerId = req.businessOwner?._id;
    const { businessId } = req.query;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    let filter = {};
    
    // If specific businessId is provided, verify ownership
    if (businessId) {
      const business = await Business.findOne({ 
        _id: businessId, 
        businessOwner: businessOwnerId 
      });
      if (!business) {
        return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
      }
      filter.businessId = businessId;
    } else {
      // Get all businesses owned by this business owner
      const businesses = await Business.find({ businessOwner: businessOwnerId }, '_id');
      const businessIds = businesses.map(b => b._id);
      filter.businessId = { $in: businessIds };
    }
    
    const totalReviews = await Review.countDocuments(filter);
    const pendingReviews = await Review.countDocuments({ ...filter, status: 'pending' });
    const approvedReviews = await Review.countDocuments({ ...filter, status: 'approved' });
    const rejectedReviews = await Review.countDocuments({ ...filter, status: 'rejected' });
    const manageableReviews = await Review.countDocuments({ ...filter, businessCanManage: true });
    
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