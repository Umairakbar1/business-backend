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

    // Aggregate to filter by average rating if needed - Only approved reviews
    let pipeline = [
      { $match: filter },
      // Ensure subcategories is always an array
      {
        $addFields: {
          subcategories: {
            $cond: {
              if: { $isArray: '$subcategories' },
              then: '$subcategories',
              else: []
            }
          }
        }
      },
      {
        $lookup: {
          from: 'reviews',
          let: { businessId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$businessId', '$$businessId'] },
                status: 'approved'
              }
            }
          ],
          as: 'reviews',
        },
      },
      {
        $addFields: {
          avgRating: { $avg: '$reviews.rating' },
          reviewsCount: { $size: '$reviews' },
        },
      },
      // Lookup category data
      {
        $lookup: {
          from: 'categories',
          let: { categoryId: '$category' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$categoryId'] },
                status: 'active'
              }
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                image: 1,
                slug: 1
              }
            }
          ],
          as: 'categoryData',
        },
      },
             // Lookup subcategory data
       {
         $lookup: {
           from: 'subcategories',
           let: { subcategoryIds: '$subcategories' },
           pipeline: [
             {
               $match: {
                 $expr: { $in: ['$_id', '$$subcategoryIds'] },
                 isActive: true
               }
             },
             {
               $project: {
                 _id: 1,
                 title: 1,
                 description: 1,
                 image: 1,
                 categoryId: 1,
                 slug: 1
               }
             }
           ],
           as: 'subcategoryData',
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
        _id: 1,
        businessName: 1,
        email: 1,
        phoneNumber: 1,
        address: 1,
        location: 1,
        website: 1,
        logo: 1,
        description: 1,
        category: { $arrayElemAt: ['$categoryData', 0] },
        subcategories: '$subcategoryData',
        claimed: 1,
        status: 1,
        avgRating: 1,
        reviewsCount: 1,
        media: 1,
        createdAt: 1,
        updatedAt: 1,
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

    // Import Category and SubCategory models
    const Category = (await import('../../models/admin/category.js')).default;
    const SubCategory = (await import('../../models/admin/subCategory.js')).default;

    // Get all media
    const media = await Media.find({ businessId: id });

    // Aggregate reviews for average and breakdown - Only approved reviews
    const reviewStats = await Review.aggregate([
      { $match: { 
        businessId: new mongoose.Types.ObjectId(id),
        status: 'approved'
      }},
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);
    const totalReviews = reviewStats.reduce((sum, r) => sum + r.count, 0);
    const avgRatingAgg = await Review.aggregate([
      { $match: { 
        businessId: new mongoose.Types.ObjectId(id),
        status: 'approved'
      }},
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    const avgRating = avgRatingAgg[0]?.avg || 0;

    // Build breakdown (1-5 stars)
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewStats.forEach(r => { breakdown[r._id] = r.count; });

    // Populate category data
    let categoryData = null;
    if (business.category) {
      try {
        categoryData = await Category.findOne({ 
          _id: business.category, 
          status: 'active' 
        }).select('_id title description image slug');
      } catch (error) {
        console.error('Error fetching category:', error);
      }
    }

    // Populate subcategory data
    let subcategoryData = [];
    if (business.subcategories && business.subcategories.length > 0) {
      try {
        subcategoryData = await SubCategory.find({
          _id: { $in: business.subcategories },
          isActive: true
        }).select('_id title description image categoryId slug');
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...business,
        category: categoryData,
        subcategories: subcategoryData,
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

// 3. Get reviews for a business (with pagination and sorting) - Only approved reviews
export const getBusinessReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'date' } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid business ID' });

    let sort = {};
    if (sortBy === 'rating') sort.rating = -1;
    else sort.createdAt = -1;

    // Only get approved reviews for user side
    const reviews = await Review.find({ 
      businessId: id, 
      status: 'approved' 
    })
      .populate('userId', 'name email profilePhoto')
      .populate('approvedBy', 'name email')
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Review.countDocuments({ 
      businessId: id, 
      status: 'approved' 
    });

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