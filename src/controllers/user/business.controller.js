import Business from '../../models/business/business.js';
import Review from '../../models/admin/review.js';
import Media from '../../models/admin/media.js';
import mongoose from 'mongoose';

// 1. Get business listings with filters
export const getBusinessListings = async (req, res) => {
  try {
    const {
      rating,
      location,
      sortBy,
      claimed,
      status,
      nearby, // not implemented: needs geolocation
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};
    if (typeof claimed !== 'undefined') filter.claimed = claimed === 'true';
    if (status) filter.status = status;
    if (location) filter.location = { $regex: location, $options: 'i' };

    // Aggregate to filter by average rating if needed
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'businessId',
          as: 'reviews',
        },
      },
      {
        $addFields: {
          avgRating: { $avg: '$reviews.rating' },
          reviewsCount: { $size: '$reviews' },
        },
      },
    ];
    if (rating) {
      pipeline.push({ $match: { avgRating: { $gte: Number(rating) } } });
    }

    // Sorting
    let sort = {};
    if (sortBy === 'rating') sort.avgRating = -1;
    else if (sortBy === 'reviews') sort.reviewsCount = -1;
    else if (sortBy === 'name') sort.name = 1;
    else sort._id = -1;

    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    // Project fields
    pipeline.push({
      $project: {
        name: 1,
        location: 1,
        claimed: 1,
        status: 1,
        avgRating: 1,
        reviewsCount: 1,
        media: 1,
      },
    });

    const businesses = await Business.aggregate(pipeline);
    res.json({ success: true, data: businesses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch businesses', error: error.message });
  }
};

// 2. Get single business details (with average rating, review breakdown, media, etc.)
export const getBusinessDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid business ID' });

    const business = await Business.findById(id).lean();
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    // Get all media
    const media = await Media.find({ businessId: id });

    // Aggregate reviews for average and breakdown
    const reviewStats = await Review.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);
    const totalReviews = reviewStats.reduce((sum, r) => sum + r.count, 0);
    const avgRatingAgg = await Review.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    const avgRating = avgRatingAgg[0]?.avg || 0;

    // Build breakdown (1-5 stars)
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewStats.forEach(r => { breakdown[r._id] = r.count; });

    res.json({
      success: true,
      data: {
        ...business,
        media,
        avgRating,
        totalReviews,
        reviewBreakdown: breakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch business details', error: error.message });
  }
};

// 3. Get reviews for a business (with pagination and sorting)
export const getBusinessReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'date' } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid business ID' });

    let sort = {};
    if (sortBy === 'rating') sort.rating = -1;
    else sort.createdAt = -1;

    const reviews = await Review.find({ businessId: id })
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Review.countDocuments({ businessId: id });

    res.json({
      success: true,
      data: reviews,
      page: Number(page),
      limit: Number(limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews', error: error.message });
  }
}; 