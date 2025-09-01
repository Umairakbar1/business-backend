/**
 * Test file to demonstrate the new subscription population functionality
 * 
 * This file shows how the updated business controller now populates
 * subscription details with payment plan information.
 */

// Example response structure for the updated endpoints:

// 1. GET /api/admin/businesses - getAllBusinesses
const exampleGetAllBusinessesResponse = {
  success: true,
  message: "Businesses fetched successfully",
  data: [
    {
      _id: "business_id_here",
      businessName: "Example Business",
      email: "business@example.com",
      phoneNumber: "+1234567890",
      status: "active",
      category: {
        _id: "category_id",
        title: "Technology",
        slug: "technology",
        description: "Technology services",
        image: "category_image_url",
        color: "#007bff"
      },
      subcategories: [
        {
          _id: "subcategory_id",
          title: "Web Development",
          slug: "web-development",
          description: "Web development services",
          image: "subcategory_image_url"
        }
      ],
      businessOwner: {
        _id: "owner_id",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        username: "johndoe",
        status: "active",
        profilePhoto: "profile_photo_url"
      },
      // New subscription details with payment plan information
      businessSubscriptionId: {
        _id: "subscription_id",
        status: "active",
        subscriptionType: "business",
        expiresAt: null, // null for lifetime subscriptions
        isLifetime: true,
        amount: 99.99,
        currency: "USD",
        features: ["query", "review", "embedded"],
        maxBoostPerDay: 5,
        validityHours: null,
        paymentPlan: {
          _id: "payment_plan_id",
          name: "Gold Business Plan",
          description: "Premium business plan with all features",
          planType: "business",
          price: 99.99,
          currency: "USD",
          features: ["query", "review", "embedded"],
          maxBoostPerDay: 5,
          validityHours: null,
          isActive: true,
          isPopular: true,
          sortOrder: 3,
          discount: 0
        }
      },
      boostSubscriptionId: {
        _id: "boost_subscription_id",
        status: "active",
        subscriptionType: "boost",
        expiresAt: "2024-01-15T10:00:00.000Z",
        boostQueueInfo: {
          queueId: "queue_id",
          queuePosition: 1,
          estimatedStartTime: "2024-01-15T08:00:00.000Z",
          estimatedEndTime: "2024-01-15T10:00:00.000Z",
          isCurrentlyActive: true,
          boostStartTime: "2024-01-15T08:00:00.000Z",
          boostEndTime: "2024-01-15T10:00:00.000Z",
          category: "category_id"
        },
        amount: 19.99,
        currency: "USD",
        features: ["boost"],
        maxBoostPerDay: null,
        validityHours: 24,
        paymentPlan: {
          _id: "boost_plan_id",
          name: "24-Hour Boost",
          description: "Boost your business visibility for 24 hours",
          planType: "boost",
          price: 19.99,
          currency: "USD",
          features: ["boost"],
          maxBoostPerDay: null,
          validityHours: 24,
          isActive: true,
          isPopular: false,
          sortOrder: 1,
          discount: 0
        }
      },
      // Enhanced status information
      hasActiveSubscription: true,
      hasActiveBoost: true,
      isBoosted: true,
      // New detailed subscription information
      subscriptionDetails: {
        _id: "subscription_id",
        status: "active",
        subscriptionType: "business",
        expiresAt: null,
        isLifetime: true,
        amount: 99.99,
        currency: "USD",
        features: ["query", "review", "embedded"],
        maxBoostPerDay: 5,
        validityHours: null,
        planDetails: {
          _id: "payment_plan_id",
          name: "Gold Business Plan",
          description: "Premium business plan with all features",
          planType: "business",
          price: 99.99,
          currency: "USD",
          features: ["query", "review", "embedded"],
          maxBoostPerDay: 5,
          validityHours: null,
          isActive: true,
          isPopular: true,
          sortOrder: 3,
          discount: 0
        },
        isExpired: false,
        daysUntilExpiry: null
      },
      boostDetails: {
        _id: "boost_subscription_id",
        status: "active",
        subscriptionType: "boost",
        expiresAt: "2024-01-15T10:00:00.000Z",
        boostQueueInfo: {
          queueId: "queue_id",
          queuePosition: 1,
          estimatedStartTime: "2024-01-15T08:00:00.000Z",
          estimatedEndTime: "2024-01-15T10:00:00.000Z",
          isCurrentlyActive: true,
          boostStartTime: "2024-01-15T08:00:00.000Z",
          boostEndTime: "2024-01-15T10:00:00.000Z",
          category: "category_id"
        },
        amount: 19.99,
        currency: "USD",
        features: ["boost"],
        maxBoostPerDay: null,
        validityHours: 24,
        planDetails: {
          _id: "boost_plan_id",
          name: "24-Hour Boost",
          description: "Boost your business visibility for 24 hours",
          planType: "boost",
          price: 19.99,
          currency: "USD",
          features: ["boost"],
          maxBoostPerDay: null,
          validityHours: 24,
          isActive: true,
          isPopular: false,
          sortOrder: 1,
          discount: 0
        },
        isExpired: false,
        hoursUntilExpiry: 2
      }
    }
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1
  },
  totalCount: 1
};

// 2. GET /api/admin/businesses/:businessId - getSingleBusiness
const exampleGetSingleBusinessResponse = {
  success: true,
  message: "Business fetched successfully",
  data: {
    // Same structure as above but for a single business
    _id: "business_id_here",
    businessName: "Example Business",
    // ... other business fields
    subscriptionDetails: {
      // Detailed subscription information with payment plan
    },
    boostDetails: {
      // Detailed boost information with payment plan
    }
  }
};

// 3. GET /api/admin/businesses/:businessId/subscription-details - getBusinessSubscriptionAndBoostDetails
const exampleSubscriptionDetailsResponse = {
  success: true,
  message: "Business subscription and boost details fetched successfully",
  data: {
    business: {
      _id: "business_id_here",
      businessName: "Example Business",
      email: "business@example.com",
      phoneNumber: "+1234567890",
      status: "active",
      category: {
        _id: "category_id",
        title: "Technology",
        slug: "technology",
        description: "Technology services",
        image: "category_image_url",
        color: "#007bff"
      },
      subcategories: [
        {
          _id: "subcategory_id",
          title: "Web Development",
          slug: "web-development",
          description: "Web development services",
          image: "subcategory_image_url"
        }
      ],
      businessOwner: {
        _id: "owner_id",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        username: "johndoe",
        status: "active",
        profilePhoto: "profile_photo_url"
      },
      boostActive: true,
      boostStartAt: "2024-01-15T08:00:00.000Z",
      boostEndAt: "2024-01-15T10:00:00.000Z",
      boostCategory: "Technology",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-15T08:00:00.000Z"
    },
    subscriptionStatus: {
      hasActiveSubscription: true,
      hasActiveBoost: true,
      isBoosted: true
    },
    activeSubscription: {
      _id: "subscription_id",
      status: "active",
      subscriptionType: "business",
      expiresAt: null,
      isLifetime: true,
      amount: 99.99,
      currency: "USD",
      features: ["query", "review", "embedded"],
      maxBoostPerDay: 5,
      validityHours: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      boostUsage: {
        currentDay: 2,
        lastResetDate: "2024-01-15T00:00:00.000Z"
      },
      featureUsage: {
        reviewsPosted: 15,
        lastResetDate: "2024-01-01T00:00:00.000Z"
      },
      planDetails: {
        _id: "payment_plan_id",
        name: "Gold Business Plan",
        description: "Premium business plan with all features",
        planType: "business",
        price: 99.99,
        currency: "USD",
        features: ["query", "review", "embedded"],
        maxBoostPerDay: 5,
        validityHours: null,
        isActive: true,
        isPopular: true,
        sortOrder: 3,
        discount: 0
      },
      isExpired: false,
      daysUntilExpiry: null
    },
    activeBoost: {
      _id: "boost_subscription_id",
      status: "active",
      subscriptionType: "boost",
      expiresAt: "2024-01-15T10:00:00.000Z",
      boostQueueInfo: {
        queueId: "queue_id",
        queuePosition: 1,
        estimatedStartTime: "2024-01-15T08:00:00.000Z",
        estimatedEndTime: "2024-01-15T10:00:00.000Z",
        isCurrentlyActive: true,
        boostStartTime: "2024-01-15T08:00:00.000Z",
        boostEndTime: "2024-01-15T10:00:00.000Z",
        category: "category_id"
      },
      amount: 19.99,
      currency: "USD",
      features: ["boost"],
      maxBoostPerDay: null,
      validityHours: 24,
      createdAt: "2024-01-15T08:00:00.000Z",
      updatedAt: "2024-01-15T08:00:00.000Z",
      boostUsage: {
        currentDay: 1,
        lastResetDate: "2024-01-15T00:00:00.000Z"
      },
      planDetails: {
        _id: "boost_plan_id",
        name: "24-Hour Boost",
        description: "Boost your business visibility for 24 hours",
        planType: "boost",
        price: 19.99,
        currency: "USD",
        features: ["boost"],
        maxBoostPerDay: null,
        validityHours: 24,
        isActive: true,
        isPopular: false,
        sortOrder: 1,
        discount: 0
      },
      isExpired: false,
      hoursUntilExpiry: 2
    },
    subscriptionHistory: {
      totalSubscriptions: 3,
      businessSubscriptions: 1,
      boostSubscriptions: 2,
      allSubscriptions: [
        {
          _id: "subscription_id",
          subscriptionType: "business",
          status: "active",
          amount: 99.99,
          currency: "USD",
          expiresAt: null,
          isLifetime: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          planDetails: {
            _id: "payment_plan_id",
            name: "Gold Business Plan",
            description: "Premium business plan with all features",
            planType: "business",
            price: 99.99,
            currency: "USD",
            features: ["query", "review", "embedded"],
            maxBoostPerDay: 5,
            validityHours: null,
            isActive: true,
            isPopular: true,
            sortOrder: 3,
            discount: 0
          },
          features: ["query", "review", "embedded"],
          maxBoostPerDay: 5,
          validityHours: null,
          boostUsage: {
            currentDay: 2,
            lastResetDate: "2024-01-15T00:00:00.000Z"
          },
          featureUsage: {
            reviewsPosted: 15,
            lastResetDate: "2024-01-01T00:00:00.000Z"
          },
          boostQueueInfo: null
        },
        {
          _id: "boost_subscription_id_1",
          subscriptionType: "boost",
          status: "active",
          amount: 19.99,
          currency: "USD",
          expiresAt: "2024-01-15T10:00:00.000Z",
          isLifetime: false,
          createdAt: "2024-01-15T08:00:00.000Z",
          updatedAt: "2024-01-15T08:00:00.000Z",
          planDetails: {
            _id: "boost_plan_id",
            name: "24-Hour Boost",
            description: "Boost your business visibility for 24 hours",
            planType: "boost",
            price: 19.99,
            currency: "USD",
            features: ["boost"],
            maxBoostPerDay: null,
            validityHours: 24,
            isActive: true,
            isPopular: false,
            sortOrder: 1,
            discount: 0
          },
          features: ["boost"],
          maxBoostPerDay: null,
          validityHours: 24,
          boostUsage: {
            currentDay: 1,
            lastResetDate: "2024-01-15T00:00:00.000Z"
          },
          featureUsage: null,
          boostQueueInfo: {
            queueId: "queue_id",
            queuePosition: 1,
            estimatedStartTime: "2024-01-15T08:00:00.000Z",
            estimatedEndTime: "2024-01-15T10:00:00.000Z",
            isCurrentlyActive: true,
            boostStartTime: "2024-01-15T08:00:00.000Z",
            boostEndTime: "2024-01-15T10:00:00.000Z",
            category: "category_id"
          }
        },
        {
          _id: "boost_subscription_id_2",
          subscriptionType: "boost",
          status: "expired",
          amount: 19.99,
          currency: "USD",
          expiresAt: "2024-01-10T10:00:00.000Z",
          isLifetime: false,
          createdAt: "2024-01-10T08:00:00.000Z",
          updatedAt: "2024-01-10T10:00:00.000Z",
          planDetails: {
            _id: "boost_plan_id",
            name: "24-Hour Boost",
            description: "Boost your business visibility for 24 hours",
            planType: "boost",
            price: 19.99,
            currency: "USD",
            features: ["boost"],
            maxBoostPerDay: null,
            validityHours: 24,
            isActive: true,
            isPopular: false,
            sortOrder: 1,
            discount: 0
          },
          features: ["boost"],
          maxBoostPerDay: null,
          validityHours: 24,
          boostUsage: {
            currentDay: 0,
            lastResetDate: "2024-01-10T00:00:00.000Z"
          },
          featureUsage: null,
          boostQueueInfo: {
            queueId: "queue_id_2",
            queuePosition: 1,
            estimatedStartTime: "2024-01-10T08:00:00.000Z",
            estimatedEndTime: "2024-01-10T10:00:00.000Z",
            isCurrentlyActive: false,
            boostStartTime: "2024-01-10T08:00:00.000Z",
            boostEndTime: "2024-01-10T10:00:00.000Z",
            category: "category_id"
          }
        }
      ]
    }
  }
};

console.log("Example responses for the updated subscription population functionality:");
console.log("1. GET /api/admin/businesses - getAllBusinesses");
console.log("2. GET /api/admin/businesses/:businessId - getSingleBusiness");
console.log("3. GET /api/admin/businesses/:businessId/subscription-details - getBusinessSubscriptionAndBoostDetails");

module.exports = {
  exampleGetAllBusinessesResponse,
  exampleGetSingleBusinessResponse,
  exampleSubscriptionDetailsResponse
};
