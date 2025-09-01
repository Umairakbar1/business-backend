/**
 * Test file to demonstrate the enhanced business fetch API
 * 
 * This file shows how the main business fetch API now includes
 * complete subscription details with payment plan information.
 */

// Example response from GET /api/admin/businesses
const exampleBusinessesResponse = {
  success: true,
  message: "Businesses fetched successfully",
  data: [
    {
      _id: "business_id_here",
      businessName: "Example Business",
      email: "business@example.com",
      phoneNumber: "+1234567890",
      status: "active",
      about: "asd",
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
      // Original subscription fields (for backward compatibility)
      businessSubscriptionId: {
        _id: "68b2fc95716fd5d85083be95",
        status: "active",
        subscriptionType: "business",
        expiresAt: null,
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
      // Enhanced subscription status
      hasActiveSubscription: true,
      hasActiveBoost: true,
      isBoosted: true,
      activeSubscriptionId: "68b2fc95716fd5d85083be95", // Your subscription ID
      // Enhanced subscription details
      subscriptionDetails: {
        _id: "68b2fc95716fd5d85083be95",
        subscriptionType: "business",
        status: "active",
        amount: 99.99,
        currency: "USD",
        expiresAt: null,
        isLifetime: true,
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
          name: "Gold Business Plan", // ← Payment plan name
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
        subscriptionType: "boost",
        status: "active",
        amount: 19.99,
        currency: "USD",
        expiresAt: "2024-01-15T10:00:00.000Z",
        isLifetime: false,
        features: ["boost"],
        maxBoostPerDay: null,
        validityHours: 24,
        createdAt: "2024-01-15T08:00:00.000Z",
        updatedAt: "2024-01-15T08:00:00.000Z",
        boostUsage: {
          currentDay: 1,
          lastResetDate: "2024-01-15T00:00:00.000Z"
        },
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

// How to use the enhanced business fetch API:

console.log("Enhanced Business Fetch API:");
console.log("GET /api/admin/businesses");
console.log("This endpoint now includes complete subscription details!");

console.log("\nKey subscription data you'll get for each business:");
console.log("1. activeSubscriptionId: The ID of the active subscription");
console.log("2. hasActiveSubscription: Boolean indicating if business has active subscription");
console.log("3. hasActiveBoost: Boolean indicating if business has active boost");
console.log("4. isBoosted: Boolean indicating if business is currently boosted");

console.log("\n5. subscriptionDetails: Complete business subscription info including:");
console.log("   - subscriptionType: 'business' or 'boost'");
console.log("   - status: Subscription status");
console.log("   - planDetails.name: Payment plan name (e.g., 'Gold Business Plan')");
console.log("   - planDetails.description: Plan description");
console.log("   - planDetails.planType: 'business' or 'boost'");
console.log("   - planDetails.price: Plan price");
console.log("   - planDetails.features: Array of available features");
console.log("   - isExpired: Boolean indicating if subscription is expired");
console.log("   - daysUntilExpiry: Days remaining (null for lifetime)");

console.log("\n6. boostDetails: Complete boost subscription info including:");
console.log("   - All the same fields as subscriptionDetails");
console.log("   - boostQueueInfo: Queue information for boost");
console.log("   - hoursUntilExpiry: Hours remaining");

console.log("\n7. Original fields (for backward compatibility):");
console.log("   - businessSubscriptionId: Original populated subscription field");
console.log("   - boostSubscriptionId: Original populated boost field");

console.log("\nExample usage in your frontend:");
console.log("business.subscriptionDetails.planDetails.name // 'Gold Business Plan'");
console.log("business.subscriptionDetails.subscriptionType // 'business'");
console.log("business.activeSubscriptionId // '68b2fc95716fd5d85083be95'");
console.log("business.hasActiveSubscription // true");
console.log("business.subscriptionDetails.isExpired // false");

module.exports = {
  exampleBusinessesResponse
};
