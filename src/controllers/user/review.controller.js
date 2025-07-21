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
