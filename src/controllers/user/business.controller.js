import Business from '../../models/business/business.js';
import Review from '../../models/admin/review.js';
import Media from '../../models/admin/media.js';
import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
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
      page = 1,
      limit = 10,
      categoryId,
      subcategoryId,
    } = req.query;

    const lat = location?.lat;
    const lng = location?.lng;

    const filter = {};
    if (typeof claimed !== 'undefined') filter.claimed = claimed === 'true';
    if (status) filter.status = status;
    if (categoryId) filter.category = categoryId;
    
    // Handle subcategoryId - can be comma-separated string or single ID
    if (subcategoryId) {
      const subcategoryIds = subcategoryId.split(',').filter(Boolean);
      if (subcategoryIds.length === 1) {
        filter.subcategories = subcategoryIds[0];
      } else {
        filter.subcategories = { $in: subcategoryIds };
      }
    }
    // Handle location filtering
    if (location) {
      // Text-based location search (city, address, etc.)
      filter.$or = [
        { 'location.description': { $regex: location, $options: 'i' } },
        { city: { $regex: location, $options: 'i' } },
        { state: { $regex: location, $options: 'i' } },
        { address: { $regex: location, $options: 'i' } }
      ];
    }
    
    // Handle coordinates-based location filtering
    let hasCoordinates = false;
    let userLat, userLng;
    const DEFAULT_RADIUS = 25; // Default 25km radius for better user experience
    
    if (lat && lng) {
      userLat = parseFloat(lat);
      userLng = parseFloat(lng);
      
      if (!isNaN(userLat) && !isNaN(userLng)) {
        hasCoordinates = true;
        
        // Add geospatial filter for businesses with coordinates
        filter.$and = [
          { 'location.lat': { $exists: true, $ne: null } },
          { 'location.lng': { $exists: true, $ne: null } }
        ];
      }
    }

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
                 status: 'active'
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
    
    // Add distance calculation if coordinates are provided
    if (hasCoordinates) {
      pipeline.push({
        $addFields: {
          distance: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$location.lat', null] },
                  { $ne: ['$location.lng', null] }
                ]
              },
              then: {
                $multiply: [
                  {
                    $acos: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $multiply: [{ $divide: [{ $multiply: ['$location.lat', 0.0174533] }, 2] }, 2] } },
                            { $sin: { $multiply: [{ $divide: [{ $multiply: [userLat, 0.0174533] }, 2] }, 2] } }
                          ]
                        },
                        {
                          $multiply: [
                            { $cos: { $multiply: ['$location.lat', 0.0174533] } },
                            { $cos: { $multiply: [userLat, 0.0174533] } },
                            { $cos: { $multiply: [{ $subtract: ['$location.lng', userLng] }, 0.0174533] } }
                          ]
                        }
                      ]
                    }
                  },
                  6371 // Earth's radius in kilometers
                ]
              },
              else: null
            }
          }
        }
      });
      
             // Filter by radius (only include businesses within the default radius)
       pipeline.push({
         $match: {
           distance: { $lte: DEFAULT_RADIUS }
         }
       });
    }
    
    if (rating) {
      pipeline.push({ $match: { avgRating: { $gte: Number(rating) } } });
    }

    // Sorting
    let sort = {};
    if (sortBy === 'rating') sort.avgRating = -1;
    else if (sortBy === 'reviews') sort.reviewsCount = -1;
    else if (sortBy === 'name') sort.name = 1;
    else if (hasCoordinates) sort.distance = 1; // Sort by distance (nearest first)
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
        ...(hasCoordinates && { distance: 1 }), // Include distance only when coordinates are provided
      },
    });

    const businesses = await Business.aggregate(pipeline);
    
    // Add metadata about the search
    const response = {
      success: true,
      data: businesses,
      meta: {
        total: businesses.length,
        page: Number(page),
        limit: Number(limit),
        hasNextPage: businesses.length === Number(limit)
      }
    };
    
         // Add location info if coordinates were used
     if (hasCoordinates) {
       response.meta.location = {
         userLat,
         userLng,
         radius: DEFAULT_RADIUS,
         unit: 'km'
       };
     }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch businesses', error: error.message });
  }
};

// 2. Get single business details (with average rating, review breakdown, media, etc.)
export const getBusinessDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {userId} = req.query;
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
          status: 'active'
        }).select('_id title description image categoryId slug');
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    }

    // Get approved reviews with user details
    const reviews = await Review.find({
      businessId: id,
      status: 'approved'
    })
      .populate('userId', 'name email profilePhoto')
      .populate('businessId', 'businessName _id')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to latest 10 reviews for performance

    // Get current user's review if user is authenticated
    let currentUserReview = null;
    if (userId) {
      try {
        currentUserReview = await Review.findOne({
          businessId: id,
          userId: userId
        })
          .populate('userId', 'name email profilePhoto')
          .populate('businessId', 'businessName _id')
          .populate('approvedBy', 'name email');
      } catch (error) {
        console.error('Error fetching current user review:', error);
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
        reviews,
        currentUserReview,
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

// 4. Get all business categories with nested subcategories
export const getBusinessCategoriesWithSubcategories = async (req, res) => {
  try {
    console.log('🔍 getBusinessCategoriesWithSubcategories called');
    console.log('📝 Request params:', req.params);
    console.log('📝 Request query:', req.query);
    
    const { status = 'active' } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    console.log('🔍 Filter applied:', filter);

    // Get all categories
    const categories = await Category.find(filter)
      .select('_id title description image slug color sortOrder')
      .sort({ sortOrder: 1, title: 1 });

    console.log('📊 Found categories:', categories.length);

    // Get subcategories for each category
    const categoriesWithSubcategories = await Promise.all(
      categories.map(async (category) => {
        const categoryObj = category.toObject();
        
        // Find subcategories for this category
        const subcategories = await SubCategory.find({
          categoryId: category._id,
          status: 'active'
        })
        .select('_id title description image slug')
        .sort({ title: 1 });
        
        console.log(`📊 Category "${category.title}" has ${subcategories.length} subcategories`);
        
        // Add subcategories array to category object
        categoryObj.subcategories = subcategories;
        return categoryObj;
      })
    );

    console.log('✅ Successfully fetched categories with subcategories');

    res.json({
      success: true,
      data: categoriesWithSubcategories,
      total: categoriesWithSubcategories.length
    });
  } catch (error) {
    console.error('❌ Error fetching business categories with subcategories:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch business categories', 
      error: error.message 
    });
  }
};

// 5. Get single category with its subcategories
export const getSingleCategoryWithSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status = 'active' } = req.query;
    
    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid category ID' 
      });
    }

    console.log('🔍 getSingleCategoryWithSubcategories called');
    console.log('📝 Category ID:', categoryId);
    console.log('📝 Status filter:', status);

    // Build filter for category
    const categoryFilter = { _id: categoryId };
    if (status) {
      categoryFilter.status = status;
    }

    // Get the category
    const category = await Category.findOne(categoryFilter)
      .select('_id title description image slug color sortOrder status createdAt updatedAt');

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    console.log('📊 Found category:', category.title);

    // Get subcategories for this category
    const subcategories = await SubCategory.find({
      categoryId: category._id,
      status: 'active'
    })
    .select('_id title description image slug categoryId status createdAt updatedAt')
    .sort({ title: 1 });

    console.log(`📊 Category "${category.title}" has ${subcategories.length} subcategories`);

    // Convert category to object and add subcategories
    const categoryWithSubcategories = {
      ...category.toObject(),
      subcategories: subcategories
    };

    console.log('✅ Successfully fetched category with subcategories');

    res.json({
      success: true,
      data: categoryWithSubcategories,
      meta: {
        subcategoriesCount: subcategories.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching single category with subcategories:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category details', 
      error: error.message 
    });
  }
};