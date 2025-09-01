import Business from '../../models/business/business.js';
import Review from '../../models/admin/review.js';
import Media from '../../models/admin/media.js';
import Category from '../../models/admin/category.js';
import SubCategory from '../../models/admin/subCategory.js';
import Subscription from '../../models/admin/subscription.js';
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
      radius,
    } = req.query;

    // Parse location if it's a JSON string
    let parsedLocation = null;
    let lat = null;
    let lng = null;
    
    // Check if lat and lng are provided as separate query parameters
    if (req.query.lat && req.query.lng) {
      lat = req.query.lat;
      lng = req.query.lng;
      console.log('📍 Found lat/lng in query params:', { lat, lng });
    } else if (location) {
      try {
        // If location is a JSON string, parse it
        if (typeof location === 'string' && location.startsWith('{')) {
          parsedLocation = JSON.parse(location);
          lat = parsedLocation.lat;
          lng = parsedLocation.lng;
        } else {
          // If location is already an object
          parsedLocation = location;
          lat = location.lat;
          lng = location.lng;
        }
      } catch (error) {
        console.log('Error parsing location:', error);
        // Fallback to text-based search
        parsedLocation = location;
      }
    }

    const filter = {};
    
    // Handle claimed filter - if claimed=true, only show businesses with active subscriptions
    if (claimed !== undefined && claimed !== '' && claimed !== null) {
      if (claimed === 'true') {
        filter.claimed = true;
        // We'll add subscription filtering in the pipeline to check for active subscriptions
      } else {
        filter.claimed = false;
      }
    }
    if (status) filter.status = status;
    
    // Handle categoryId - single category ID
    if (categoryId) {
      // Validate and convert categoryId to ObjectId
      if (mongoose.Types.ObjectId.isValid(categoryId)) {
        filter.category = new mongoose.Types.ObjectId(categoryId);
        console.log('📂 Category filter set:', categoryId);
      } else {
        console.log('❌ Invalid categoryId format:', categoryId);
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format'
        });
      }
    }
    
    // Handle subcategoryId - can be comma-separated string or single ID
    if (subcategoryId) {
      // Decode URL-encoded string and split by comma
      const decodedSubcategoryId = decodeURIComponent(subcategoryId);
      const subcategoryIds = decodedSubcategoryId.split(',').map(id => id.trim()).filter(Boolean);
      
      console.log('📂 Subcategory IDs parsed:', subcategoryIds);
      
      // Validate and convert subcategory IDs to ObjectIds
      const validSubcategoryIds = subcategoryIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      
      if (validSubcategoryIds.length === 0) {
        console.log('❌ No valid subcategory IDs found:', subcategoryIds);
        return res.status(400).json({
          success: false,
          message: 'Invalid subcategory ID format(s)'
        });
      }
      
      const objectIdSubcategories = validSubcategoryIds.map(id => new mongoose.Types.ObjectId(id));
      filter.subcategories = { $in: objectIdSubcategories };
    }
         // Handle text-based location filtering (only if no coordinates or as fallback)
     if (parsedLocation && !lat && !lng && parsedLocation !== 'null') {
       const searchText = typeof parsedLocation === 'string' ? parsedLocation : parsedLocation.description;
       if (searchText && searchText !== 'null') {
         filter.$or = [
           { 'location.description': { $regex: searchText, $options: 'i' } },
           { city: { $regex: searchText, $options: 'i' } },
           { state: { $regex: searchText, $options: 'i' } },
           { address: { $regex: searchText, $options: 'i' } }
         ];
       }
     }
    
    // Handle coordinates-based location filtering
    let hasCoordinates = false;
    let userLat, userLng;
    const DEFAULT_RADIUS = 100; // Increased to 100km radius to find more businesses
    const searchRadius = radius ? parseFloat(radius) : DEFAULT_RADIUS;
    
         console.log('📍 Raw lat/lng values:', { lat, lng, type: typeof lat });
     
     if (lat && lng) {
       userLat = parseFloat(lat);
       userLng = parseFloat(lng);
       
       console.log('📍 Parsed coordinates:', { userLat, userLng, isNaN: { lat: isNaN(userLat), lng: isNaN(userLng) } });
       
       if (!isNaN(userLat) && !isNaN(userLng)) {
         hasCoordinates = true;
         console.log('📍 Using coordinates for filtering:', { userLat, userLng });
        
        // Add geospatial filter for businesses with coordinates
        // Check both location.lat/lng and location.coordinates (GeoJSON)
        filter.$and = [
          {
            $or: [
              // Check if business has lat/lng coordinates
              {
                $and: [
                  { 'location.lat': { $exists: true, $ne: null } },
                  { 'location.lng': { $exists: true, $ne: null } }
                ]
              },
              // Check if business has GeoJSON coordinates
              {
                $and: [
                  { 'location.coordinates': { $exists: true, $ne: null } },
                  { $expr: { $eq: [{ $size: '$location.coordinates' }, 2] } }
                ]
              }
            ]
          }
        ];
      }
    }
    
    console.log('🔍 Final filter:', JSON.stringify(filter, null, 2));
    console.log('📍 Has coordinates:', hasCoordinates);
    
    // Handle rating filter - support for 3.0+, 4.0+, 4.5+ format
    let ratingFilter = null;
    if (rating !== undefined && rating !== '' && rating !== null) {
      if (typeof rating === 'string' && rating.includes('+')) {
        // Handle format like "3.0+", "4.0+", "4.5+"
        const ratingValue = parseFloat(rating.replace('+', ''));
        if (!isNaN(ratingValue)) {
          ratingFilter = { $gte: ratingValue };
        }
      } else {
        // Handle numeric rating
        const ratingValue = Number(rating);
        if (!isNaN(ratingValue)) {
          ratingFilter = { $gte: ratingValue };
        }
      }
    }
    
    // Debug: Check total businesses without location filter
    const totalBusinesses = await Business.countDocuments({});
    console.log('📍 Total businesses in database:', totalBusinesses);
    
    // Debug: Check businesses for specific category if categoryId is provided
    if (categoryId) {
      const categoryBusinesses = await Business.countDocuments({ category: filter.category });
      console.log('📂 Businesses in category:', categoryBusinesses);
      
      // Get sample business from this category to verify structure
      const sampleCategoryBusiness = await Business.findOne({ category: filter.category })
        .select('businessName category subcategories location')
        .populate('category', 'title')
        .populate('subcategories', 'title');
      
      if (sampleCategoryBusiness) {
        console.log('📂 Sample business in category:', {
          name: sampleCategoryBusiness.businessName,
          category: sampleCategoryBusiness.category,
          subcategories: sampleCategoryBusiness.subcategories,
          hasLocation: !!sampleCategoryBusiness.location
        });
      }
    }
    
    // Debug: Check businesses with coordinates
    const businessesWithCoords = await Business.countDocuments({
      $or: [
        {
          $and: [
            { 'location.lat': { $exists: true, $ne: null } },
            { 'location.lng': { $exists: true, $ne: null } }
          ]
        },
        {
          $and: [
            { 'location.coordinates': { $exists: true, $ne: null } },
            { $expr: { $eq: [{ $size: '$location.coordinates' }, 2] } }
          ]
        }
      ]
    });
         console.log('📍 Businesses with coordinates:', businessesWithCoords);
     
     // Debug: Check businesses with specific coordinates format
     const businessesWithLatLng = await Business.countDocuments({
       'location.lat': { $exists: true, $ne: null },
       'location.lng': { $exists: true, $ne: null }
     });
     console.log('📍 Businesses with lat/lng format:', businessesWithLatLng);
     
     const businessesWithGeoJSON = await Business.countDocuments({
       'location.coordinates': { $exists: true, $ne: null },
       $expr: { $eq: [{ $size: '$location.coordinates' }, 2] }
     });
     console.log('📍 Businesses with GeoJSON format:', businessesWithGeoJSON);
     
     // Debug: Get a sample business to see its location structure
     const sampleBusiness = await Business.findOne({
       $or: [
         { 'location.lat': { $exists: true, $ne: null } },
         { 'location.coordinates': { $exists: true, $ne: null } }
       ]
     }).select('businessName location');
     
     if (sampleBusiness) {
       console.log('📍 Sample business location structure:', {
         name: sampleBusiness.businessName,
         location: sampleBusiness.location,
         hasLatLng: sampleBusiness.location?.lat && sampleBusiness.location?.lng,
         hasCoordinates: sampleBusiness.location?.coordinates && sampleBusiness.location?.coordinates.length === 2
       });
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
      // Lookup subscriptions for claimed businesses
      ...(claimed === 'true' ? [{
        $lookup: {
          from: 'subscriptions',
          let: { businessId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$business', '$$businessId'] },
                status: 'active',
                $or: [
                  { isLifetime: true },
                  { 
                    $and: [
                      { expiresAt: { $exists: true, $ne: null } },
                      { expiresAt: { $gt: new Date() } }
                    ]
                  }
                ]
              }
            }
          ],
          as: 'activeSubscriptions',
        },
      }] : []),
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
      console.log('📍 Adding distance calculation to pipeline');
      pipeline.push({
        $addFields: {
          distance: {
            $let: {
              vars: {
                userLat: userLat,
                userLng: userLng
              },
              in: {
                $cond: {
                  if: {
                    $or: [
                      // Check if business has lat/lng coordinates
                      {
                        $and: [
                          { $ne: ['$location.lat', null] },
                          { $ne: ['$location.lng', null] }
                        ]
                      },
                      // Check if business has GeoJSON coordinates
                      {
                        $and: [
                          { $ne: ['$location.coordinates', null] },
                          { $expr: { $eq: [{ $size: '$location.coordinates' }, 2] } }
                        ]
                      }
                    ]
                  },
                  then: {
                    $let: {
                      vars: {
                        businessLat: {
                          $cond: {
                            if: { $ne: ['$location.lat', null] },
                            then: '$location.lat',
                            else: { $arrayElemAt: ['$location.coordinates', 1] } // GeoJSON: [lng, lat]
                          }
                        },
                        businessLng: {
                          $cond: {
                            if: { $ne: ['$location.lng', null] },
                            then: '$location.lng',
                            else: { $arrayElemAt: ['$location.coordinates', 0] } // GeoJSON: [lng, lat]
                          }
                        }
                      },
                      in: {
                        $multiply: [
                          {
                            $acos: {
                              $add: [
                                {
                                  $multiply: [
                                    { $sin: { $multiply: [{ $divide: [{ $multiply: ['$$businessLat', 0.0174533] }, 2] }, 2] } },
                                    { $sin: { $multiply: [{ $divide: [{ $multiply: ['$$userLat', 0.0174533] }, 2] }, 2] } }
                                  ]
                                },
                                {
                                  $multiply: [
                                    { $cos: { $multiply: ['$$businessLat', 0.0174533] } },
                                    { $cos: { $multiply: ['$$userLat', 0.0174533] } },
                                    { $cos: { $multiply: [{ $subtract: ['$$businessLng', '$$userLng'] }, 0.0174533] } }
                                  ]
                                }
                              ]
                            }
                          },
                          6371 // Earth's radius in kilometers
                        ]
                      }
                    }
                  },
                  else: null
                }
              }
            }
          }
        }
      });
      
             // Filter by radius (only include businesses within the search radius)
       pipeline.push({
         $match: {
           distance: { $lte: searchRadius }
         }
       });
       
       console.log(`📍 Added radius filtering (${searchRadius}km)`);
    }
    
    // Add subscription filter for claimed businesses
    if (claimed === 'true') {
      pipeline.push({
        $match: {
          $expr: { $gt: [{ $size: '$activeSubscriptions' }, 0] }
        }
      });
    }
    
    // Add rating filter if specified
    if (ratingFilter) {
      pipeline.push({
        $match: {
          avgRating: ratingFilter
        }
      });
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

    // Get total count for pagination (without skip and limit)
    const countPipeline = [...pipeline];
    // Remove skip and limit stages for counting
    countPipeline.splice(-3); // Remove sort, skip, and limit stages
    
    const totalCountResult = await Business.aggregate([
      ...countPipeline,
      { $count: 'total' }
    ]);
    const totalCount = totalCountResult[0]?.total || 0;
    
    const businesses = await Business.aggregate(pipeline);
    
    console.log('📍 Found businesses:', businesses.length, 'Total available:', totalCount);
    
    // If no businesses found with coordinates, try without location filter
    if (businesses.length === 0 && hasCoordinates) {
      console.log('📍 No businesses found with coordinates, trying without location filter...');
      
      // Remove location filter and try again
      const fallbackFilter = { ...filter };
      delete fallbackFilter.$and;
      
      const fallbackPipeline = [
        { $match: fallbackFilter },
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
        // Lookup subscriptions for claimed businesses
        ...(claimed === 'true' ? [{
          $lookup: {
            from: 'subscriptions',
            let: { businessId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$business', '$$businessId'] },
                  status: 'active',
                  $or: [
                    { isLifetime: true },
                    { 
                      $and: [
                        { expiresAt: { $exists: true, $ne: null } },
                        { expiresAt: { $gt: new Date() } }
                      ]
                    }
                  ]
                }
              }
            ],
            as: 'activeSubscriptions',
          },
        }] : []),
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
        // Add subscription filter for claimed businesses
        ...(claimed === 'true' ? [{
          $match: {
            $expr: { $gt: [{ $size: '$activeSubscriptions' }, 0] }
          }
        }] : []),
        // Add rating filter if specified
        ...(ratingFilter ? [{
          $match: {
            avgRating: ratingFilter
          }
        }] : []),
        { $sort: sort },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
        {
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
        }
      ];
      
      const fallbackBusinesses = await Business.aggregate(fallbackPipeline);
      console.log('📍 Found businesses without location filter:', fallbackBusinesses.length);
      
      if (fallbackBusinesses.length > 0) {
        return res.json({
          success: true,
          data: fallbackBusinesses,
          meta: {
            total: fallbackBusinesses.length,
            page: Number(page),
            limit: Number(limit),
            hasNextPage: fallbackBusinesses.length === Number(limit),
            totalPages: Math.ceil(fallbackBusinesses.length / Number(limit)),
            note: 'No businesses found in your specified location. Showing businesses from other areas instead.'
          }
        });
      }
    }
    
    if (businesses.length > 0) {
      console.log('📍 Sample business location data:', {
        name: businesses[0].businessName,
        location: businesses[0].location,
        hasLatLng: businesses[0].location?.lat && businesses[0].location?.lng,
        hasCoordinates: businesses[0].location?.coordinates && businesses[0].location?.coordinates.length === 2
      });
      
      if (hasCoordinates && businesses[0].distance !== undefined) {
        console.log('📍 Distance calculation working:', businesses[0].distance);
      }
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / Number(limit));
    const currentPage = Number(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    
    // Add metadata about the search
    const response = {
      success: true,
      data: businesses,
      meta: {
        total: totalCount,
        page: currentPage,
        limit: Number(limit),
        totalPages,
        hasNextPage,
        hasPrevPage,
        showing: `${(currentPage - 1) * Number(limit) + 1}-${Math.min(currentPage * Number(limit), totalCount)} of ${totalCount} businesses`
      }
    };
    
    // Add location info if coordinates were used
    if (hasCoordinates) {
      response.meta.location = {
        userLat,
        userLng,
        radius: searchRadius,
        unit: 'km'
      };
    }
    
    // Add message if no businesses found
    if (businesses.length === 0) {
      response.message = hasCoordinates 
        ? `No businesses found within ${searchRadius}km of your location. Try expanding your search radius or removing location filters.`
        : 'No businesses found matching your criteria. Try adjusting your filters.';
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
    const approvedReviews = await Review.find({
      businessId: id,
      status: 'approved'
    })
      .populate('userId', 'name email profilePhoto')
      .populate('businessId', 'businessName _id')
      .populate('approvedBy', 'name email')
      .populate('replies.admin.authorId', 'firstName lastName email')
      .populate('replies.business.authorId', 'businessName contactPerson email')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to latest 10 reviews for performance

    // Get pending reviews with user details
    const pendingReviews = await Review.find({
      businessId: id,
      status: 'pending'
    })
      .populate('userId', 'name email profilePhoto')
      .populate('businessId', 'businessName _id')
      .populate('approvedBy', 'name email')
      .populate('replies.admin.authorId', 'firstName lastName email')
      .populate('replies.business.authorId', 'businessName contactPerson email')
      .sort({ createdAt: -1 });

    // Get current user's review if user is authenticated
    let currentUserReview = null;
    let userHasPendingReview = false;
    if (userId) {
      try {
        currentUserReview = await Review.findOne({
          businessId: id,
          userId: userId
        })
          .populate('userId', 'name email profilePhoto')
          .populate('businessId', 'businessName _id')
          .populate('approvedBy', 'name email')
          .populate('replies.admin.authorId', 'firstName lastName email')
          .populate('replies.business.authorId', 'businessName contactPerson email');
        
        // Check if user has a pending review
        if (currentUserReview && currentUserReview.status === 'pending') {
          userHasPendingReview = true;
        }
      } catch (error) {
        console.error('Error fetching current user review:', error);
      }
    }

    // Get all active reviews (approved and pending) for the business
    const reviews = await Review.find({
      businessId: id,
      status: { $in: ['approved', 'pending'] }
    })
      .populate('userId', 'name email profilePhoto')
      .populate('businessId', 'businessName _id')
      .populate('approvedBy', 'name email')
      .populate('replies.admin.authorId', 'firstName lastName email')
      .populate('replies.business.authorId', 'businessName contactPerson email')
      .sort({ createdAt: -1 });

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
        approvedReviews,
        pendingReviews,
        currentUserReview,
        userHasPendingReview,
        reviews, // Array of all active reviews (approved + pending)
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
      .populate('replies.admin.authorId', 'firstName lastName email')
      .populate('replies.business.authorId', 'businessName contactPerson email')
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

// 6. Get search suggestions for businesses and categories
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q: searchQuery, limit = 10 } = req.query;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchKey = searchQuery.trim();
    const searchLimit = Math.min(parseInt(limit), 20); // Max 20 results

    console.log('🔍 getSearchSuggestions called');
    console.log('📝 Search query:', searchKey);
    console.log('📝 Result limit:', searchLimit);

    // Create regex pattern for case-insensitive search
    const searchRegex = new RegExp(searchKey, 'i');

    // Search businesses
    const businessSuggestions = await Business.aggregate([
      {
        $match: {
          $and: [
            { status: 'active' },
            {
              $or: [
                { businessName: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { 'location.description': { $regex: searchRegex } },
                { city: { $regex: searchRegex } },
                { state: { $regex: searchRegex } },
                { address: { $regex: searchRegex } }
              ]
            }
          ]
        }
      },
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
                slug: 1
              }
            }
          ],
          as: 'categoryData',
        },
      },
      {
        $addFields: {
          category: { $arrayElemAt: ['$categoryData', 0] },
          type: 'business',
          displayName: '$businessName',
          searchScore: {
            $add: [
              // Exact match gets highest score
              { $cond: [{ $eq: [{ $toLower: '$businessName' }, searchKey.toLowerCase()] }, 100, 0] },
              // Starts with gets high score
              { $cond: [{ $regexMatch: { input: '$businessName', regex: `^${searchKey}`, options: 'i' } }, 50, 0] },
              // Contains gets medium score
              { $cond: [{ $regexMatch: { input: '$businessName', regex: searchKey, options: 'i' } }, 25, 0] },
              // Description match gets lower score
              { $cond: [{ $regexMatch: { input: '$description', regex: searchKey, options: 'i' } }, 10, 0] },
              // Location match gets lower score
              { $cond: [{ $regexMatch: { input: '$city', regex: searchKey, options: 'i' } }, 5, 0] }
            ]
          }
        }
      },
      {
        $sort: { searchScore: -1, businessName: 1 }
      },
      {
        $limit: Math.ceil(searchLimit / 2) // Half for businesses
      },
      {
        $project: {
          _id: 1,
          type: 1,
          displayName: 1,
          businessName: 1,
          description: 1,
          logo: 1,
          location: 1,
          city: 1,
          state: 1,
          category: 1,
          searchScore: 1
        }
      }
    ]);

    // Search categories
    const categorySuggestions = await Category.aggregate([
      {
        $match: {
          $and: [
            { status: 'active' },
            {
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          type: 'category',
          displayName: '$title',
          searchScore: {
            $add: [
              // Exact match gets highest score
              { $cond: [{ $eq: [{ $toLower: '$title' }, searchKey.toLowerCase()] }, 100, 0] },
              // Starts with gets high score
              { $cond: [{ $regexMatch: { input: '$title', regex: `^${searchKey}`, options: 'i' } }, 50, 0] },
              // Contains gets medium score
              { $cond: [{ $regexMatch: { input: '$title', regex: searchKey, options: 'i' } }, 25, 0] },
              // Description match gets lower score
              { $cond: [{ $regexMatch: { input: '$description', regex: searchKey, options: 'i' } }, 10, 0] }
            ]
          }
        }
      },
      {
        $sort: { searchScore: -1, title: 1 }
      },
      {
        $limit: Math.ceil(searchLimit / 2) // Half for categories
      },
      {
        $project: {
          _id: 1,
          type: 1,
          displayName: 1,
          title: 1,
          description: 1,
          image: 1,
          slug: 1,
          color: 1,
          searchScore: 1
        }
      }
    ]);

    // Search subcategories
    const subcategorySuggestions = await SubCategory.aggregate([
      {
        $match: {
          $and: [
            { status: 'active' },
            {
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
              ]
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'categories',
          let: { categoryId: '$categoryId' },
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
                slug: 1
              }
            }
          ],
          as: 'categoryData',
        },
      },
      {
        $addFields: {
          type: 'subcategory',
          displayName: '$title',
          parentCategory: { $arrayElemAt: ['$categoryData', 0] },
          searchScore: {
            $add: [
              // Exact match gets highest score
              { $cond: [{ $eq: [{ $toLower: '$title' }, searchKey.toLowerCase()] }, 100, 0] },
              // Starts with gets high score
              { $cond: [{ $regexMatch: { input: '$title', regex: `^${searchKey}`, options: 'i' } }, 50, 0] },
              // Contains gets medium score
              { $cond: [{ $regexMatch: { input: '$title', regex: searchKey, options: 'i' } }, 25, 0] },
              // Description match gets lower score
              { $cond: [{ $regexMatch: { input: '$description', regex: searchKey, options: 'i' } }, 10, 0] }
            ]
          }
        }
      },
      {
        $sort: { searchScore: -1, title: 1 }
      },
      {
        $limit: Math.ceil(searchLimit / 3) // One third for subcategories
      },
      {
        $project: {
          _id: 1,
          type: 1,
          displayName: 1,
          title: 1,
          description: 1,
          image: 1,
          slug: 1,
          parentCategory: 1,
          searchScore: 1
        }
      }
    ]);

    // Combine and sort all suggestions by search score
    const allSuggestions = [
      ...businessSuggestions,
      ...categorySuggestions,
      ...subcategorySuggestions
    ].sort((a, b) => b.searchScore - a.searchScore);

    // Limit total results
    const finalSuggestions = allSuggestions.slice(0, searchLimit);

    console.log('✅ Search suggestions found:', {
      businesses: businessSuggestions.length,
      categories: categorySuggestions.length,
      subcategories: subcategorySuggestions.length,
      total: finalSuggestions.length
    });

    res.json({
      success: true,
      data: finalSuggestions,
      meta: {
        total: finalSuggestions.length,
        businesses: businessSuggestions.length,
        categories: categorySuggestions.length,
        subcategories: subcategorySuggestions.length,
        searchQuery: searchKey
      }
    });

  } catch (error) {
    console.error('❌ Error fetching search suggestions:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search suggestions',
      error: error.message
    });
  }
};

