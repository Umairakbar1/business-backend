import Review from '../../models/admin/review.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// Helper function to get business data with reviews in flattened structure
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
        manageable: stats.rejectedReviews,
        overallRating: Math.round(stats.averageRating * 10) / 10 || 0
      },
      reviews: reviews
    };
  } catch (error) {
    console.error('Error in getBusinessDataWithReviews:', error);
    return null;
  }
};

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
      .populate('replies.admin.authorId', 'name email')
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
      .populate('replies.admin.authorId', 'name email')
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
      .populate('businessManagementGrantedBy', 'name email')
      .populate('reply.authorId', 'name email')
      .populate('comments.authorId', '_id businessName email')
      .populate('comments.replies.authorId', '_id businessName email');
    
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
    
    // Get business data with reviews in the same format as admin controller
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Review approved successfully',
      data: businessData
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
    
    // Get business data with reviews in the same format as admin controller
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Review rejected successfully',
      data: businessData
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

// POST /business/reviews/:id/comments - Add comment to review
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership
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
    
    // Get business details for author name
    const authorName = business ? `${business.businessName} (Business)` : 'Business User';
    const authorEmail = business?.email || '';
    
    const comment = {
      content,
      authorId: businessOwnerId,
      authorType: 'business',
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    review.comments.push(comment);
    review.updatedAt = new Date();
    await review.save();
    
    // Get business data with reviews in the same format as admin controller
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Comment added successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /business/reviews/comments/:commentId/replies - Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
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
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Get business details for author name
    const authorName = business ? `${business.businessName} (Business)` : 'Business User';
    const authorEmail = business?.email || '';
    
    const reply = {
      content,
      authorId: businessOwnerId,
      authorType: 'business',
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    comment.replies.push(reply);
    review.updatedAt = new Date();
    await review.save();
    
    // Get business data with reviews in the same format as admin controller
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/reviews/comments/:commentId - Edit comment
export const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
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
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this business
    if (comment.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own comments', code: '00403' });
    }
    
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    comment.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('userId', 'firstName lastName email');
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Comment updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/reviews/comments/:commentId/replies/:replyId - Edit reply
export const editReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
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
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this business
    if (reply.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own replies', code: '00403' });
    }
    
    reply.content = content;
    reply.isEdited = true;
    reply.editedAt = new Date();
    reply.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('userId', 'firstName lastName email');
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/reviews/comments/:commentId - Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
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
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this business
    if (comment.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own comments', code: '00403' });
    }
    
    // Remove the comment
    review.comments.pull(commentId);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('userId', 'firstName lastName email');
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Comment deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/reviews/comments/:commentId/replies/:replyId - Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
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
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: review.businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Access denied to this review', code: '00403' });
    }
    
    const comment = review.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this business
    if (reply.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own replies', code: '00403' });
    }
    
    // Remove the reply
    comment.replies.pull(replyId);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object with comment and reply author data
    await review.populate('userId', 'firstName lastName email profilePhoto');
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    // Populate comment and reply author data
    await review.populate('comments.authorId', '_id businessName email');
    await review.populate('comments.replies.authorId', '_id businessName email');
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 

// POST /business/reviews/:id/reply - Add direct reply to review
export const addReplyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership
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
    
    // Check if business already has a reply
    if (review.replies?.business?.content) {
      return errorResponseHelper(res, { message: 'Business already has a reply to this review', code: '00400' });
    }
    
    // Get business details for author name
    const authorName = business ? `${business.businessName} (Business)` : 'Business User';
    const authorEmail = business?.email || '';
    
    // Initialize replies object if it doesn't exist
    if (!review.replies) {
      review.replies = {};
    }
    
    review.replies.business = {
      content,
      authorId: businessOwnerId,
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    review.updatedAt = new Date();
    await review.save();
    
    // Get business data with reviews in the same format as admin controller
    const businessData = await getBusinessDataWithReviews(review.businessId);
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: businessData
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/reviews/:id/reply - Edit reply to review
export const editReplyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and verify business ownership
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
    
    // Check if business has a reply
    if (!review.replies?.business?.content) {
      return errorResponseHelper(res, { message: 'Business does not have a reply to this review', code: '00400' });
    }
    
    // Check if reply belongs to this business
    if (review.replies.business.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own replies', code: '00403' });
    }
    
    review.replies.business.content = content;
    review.replies.business.isEdited = true;
    review.replies.business.editedAt = new Date();
    review.replies.business.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('userId', 'firstName lastName email profilePhoto');
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/reviews/:id/reply - Delete reply to review
export const deleteReplyToReview = async (req, res) => {
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
    
    // Check if business has a reply
    if (!review.replies?.business?.content) {
      return errorResponseHelper(res, { message: 'Business does not have a reply to this review', code: '00400' });
    }
    
    // Check if reply belongs to this business
    if (review.replies.business.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own replies', code: '00403' });
    }
    
    // Remove the business reply
    review.replies.business = undefined;
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('userId', 'firstName lastName email profilePhoto');
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 