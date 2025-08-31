import Review from '../../models/admin/review.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail, uploadVideo } from '../../helpers/cloudinaryHelper.js';
import mongoose from 'mongoose';

// POST /user/review
export const submitReview = async (req, res) => {
  try {
    const { businessId, rating, title, comment } = req.body;
    const userId = req.user?._id;

    // Validate required fields
    if (!userId || !businessId || !rating || !title) {
      return errorResponseHelper(res, { message: 'Missing required fields', code: '00400' });
    }
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return errorResponseHelper(res, { message: 'Invalid business ID', code: '00400' });
    }
    if (rating < 1 || rating > 5) {
      return errorResponseHelper(res, { message: 'Rating must be between 1 and 5', code: '00400' });
    }

    // Check if user already has a review for this business (approved or pending)
    const existingReview = await Review.findOne({
      userId: userId,
      businessId: businessId
    });

    if (existingReview) {
      if (existingReview.status === 'pending') {
        return errorResponseHelper(res, { 
          message: 'You already have a pending review for this business. Please wait for approval.', 
          code: '00400' 
        });
      } else if (existingReview.status === 'approved') {
        return errorResponseHelper(res, { 
          message: 'You have already submitted a review for this business.', 
          code: '00400' 
        });
      }
    }

    // Handle media uploads (images and videos)
    let media = [];
    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          if (file.mimetype.startsWith('video/')) {
            // Upload video to Cloudinary
            const videoResult = await uploadVideo(file.buffer, 'business-app/reviews/videos');
            media.push({
              type: 'video',
              url: videoResult.url,
              public_id: videoResult.public_id,
              duration: videoResult.duration,
              format: videoResult.format,
              bytes: videoResult.bytes
            });
          } else if (file.mimetype.startsWith('image/')) {
            // Upload image with thumbnail to Cloudinary
            const imageResult = await uploadImageWithThumbnail(file.buffer, 'business-app/reviews/images');
            media.push({
              type: 'image',
              original: {
                url: imageResult.original.url,
                public_id: imageResult.original.public_id,
                width: imageResult.original.width,
                height: imageResult.original.height
              },
              thumbnail: {
                url: imageResult.thumbnail.url,
                public_id: imageResult.thumbnail.public_id,
                width: imageResult.thumbnail.width,
                height: imageResult.thumbnail.height
              }
            });
          }
        }
      } catch (uploadError) {
        console.error('Media upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload media files. Please try again.', 
          code: '00500' 
        });
      }
    }

    // Create review
    const review = new Review({
      userId,
      businessId,
      rating,
      title,
      comment,
      media: media, // array of media objects with Cloudinary data
      createdAt: new Date(),
    });
    await review.save();
    
    return successResponseHelper(res, { 
      message: 'Review submitted successfully and pending approval', 
      review: {
        _id: review._id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        media: review.media,
        status: review.status,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /user/review/my-reviews - Get user's own reviews
export const getMyReviews = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = { userId };
    if (status) filter.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reviews = await Review.find(filter)
      .populate('businessId', 'businessName businessCategory')
      .populate('userId', 'firstName lastName email profilePhoto')
      .populate('approvedBy', 'firstName lastName email')
      .populate('businessManagementGrantedBy', 'firstName lastName email')
      .populate('replies.admin.authorId', 'name email')
      .populate('replies.business.authorId', 'name email')
      .populate('comments.authorId', '_id firstName lastName email businessName')
      .populate('comments.replies.authorId', '_id firstName lastName email businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Your reviews fetched successfully',
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

// POST /user/review/:id/comments - Add comment to review
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
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
    
    // Get user details for author name
    const user = req.user;
    const authorName = user ? `${user.name || 'User'}`.trim() || 'User' : 'User';
    const authorEmail = user?.email || '';
    
    const comment = {
      content,
      authorId: userId,
      authorType: 'user',
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    review.comments.push(comment);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('userId', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Comment added successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /user/review/comments/:commentId/replies - Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
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
    
    // Get user details for author name
    const user = req.user;
    const authorName = user ? `${user.name || 'User'}`.trim() || 'User' : 'User';
    const authorEmail = user?.email || '';
    
    const reply = {
      content,
      authorId: userId,
      authorType: 'user',
      authorName,
      authorEmail,
      createdAt: new Date()
    };
    
    comment.replies.push(reply);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('userId', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /user/review/comments/:commentId - Edit comment
export const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
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
    
    // Check if comment belongs to this user
    if (comment.authorId.toString() !== userId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own comments', code: '00403' });
    }
    
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    comment.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('userId', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Comment updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /user/review/comments/:commentId/replies/:replyId - Edit reply
export const editReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
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
    
    // Check if reply belongs to this user
    if (reply.authorId.toString() !== userId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own replies', code: '00403' });
    }
    
    reply.content = content;
    reply.isEdited = true;
    reply.editedAt = new Date();
    reply.updatedAt = new Date();
    
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('userId', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /user/review/comments/:commentId - Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
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
    
    // Check if comment belongs to this user
    if (comment.authorId.toString() !== userId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own comments', code: '00403' });
    }
    
    // Remove the comment
    review.comments.pull(commentId);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('userId', 'firstName lastName email profilePhoto');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    // Populate comment author data
    await review.populate('comments.authorId', '_id firstName lastName email businessName');
    
    return successResponseHelper(res, {
      message: 'Comment deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /user/review/comments/:commentId/replies/:replyId - Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
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
    
    // Check if reply belongs to this user
    if (reply.authorId.toString() !== userId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own replies', code: '00403' });
    }
    
    // Remove the reply
    comment.replies.pull(replyId);
    review.updatedAt = new Date();
    await review.save();
    
    // Populate and return the complete review object
    await review.populate('businessId', 'businessName businessCategory');
    await review.populate('userId', 'firstName lastName email profilePhoto');
    await review.populate('approvedBy', 'firstName lastName email');
    await review.populate('businessManagementGrantedBy', 'firstName lastName email');
    
    // Populate comment and reply author data
    await review.populate('comments.authorId', '_id firstName lastName email businessName');
    await review.populate('comments.replies.authorId', '_id firstName lastName email businessName');
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};


// GET /user/review/:id - Get review by id
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    
    if (!userId) {
      return errorResponseHelper(res, { message: 'User not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid review ID', code: '00400' });
    }
    
    // Get the review and populate user information
    const review = await Review.findById(id)
      .populate('userId', 'firstName lastName email profilePhoto')
      .populate('approvedBy', 'firstName lastName email')
      .populate('businessManagementGrantedBy', 'firstName lastName email')
      .populate('businessId', 'businessName businessCategory email')
      .populate('replies.admin.authorId', 'name email')
      .populate('replies.business.authorId', 'name email')
      .populate('comments.authorId', '_id firstName lastName email businessName')
      .populate('comments.replies.authorId', '_id firstName lastName email businessName');
    
    if (!review) {
      return errorResponseHelper(res, { message: 'Review not found', code: '00404' });
    }
    
    // For regular users, they can view any review but we can add additional checks if needed
    // For example, you might want to check if the user has permission to view this specific review
    
    return successResponseHelper(res, {
      message: 'Review fetched successfully',
      data: review
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};