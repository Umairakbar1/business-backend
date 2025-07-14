import Review from '../../models/admin/review.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// POST /user/review
export const submitReview = async (req, res) => {
  try {
    const { businessId, rating, title, comment, media } = req.body;
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

    // Create review
    const review = new Review({
      userId,
      businessId,
      rating,
      title,
      comment,
      media: media || [], // array of media references (optional)
      createdAt: new Date(),
    });
    await review.save();
    return successResponseHelper(res, { message: 'Review submitted successfully and pending approval', review });
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
