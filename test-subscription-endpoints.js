/**
 * Test file to demonstrate the new subscription endpoints
 * 
 * This file shows how to get populated subscription data including
 * subscription type, payment plan name, etc.
 */

// Example usage for your specific case:
// activeSubscriptionId: "68b2fc95716fd5d85083be95"

// 1. Get subscription details directly by subscription ID
// GET /api/admin/businesses/subscription/68b2fc95716fd5d85083be95

const exampleSubscriptionResponse = {
  success: true,
  message: "Subscription details fetched successfully",
  data: {
    subscription: {
      _id: "68b2fc95716fd5d85083be95",
      subscriptionType: "business", // or "boost"
      status: "active",
      amount: 99.99,
      currency: "USD",
      expiresAt: null, // null for lifetime subscriptions
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
      boostQueueInfo: null,
      stripeCustomerId: "cus_xxx",
      paymentId: "pi_xxx",
      metadata: {},
      // Calculated fields
      isExpired: false,
      daysUntilExpiry: null,
      hoursUntilExpiry: null
    },
    paymentPlan: {
      _id: "payment_plan_id",
      name: "Gold Business Plan", // This is what you need!
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
    business: {
      _id: "business_id",
      businessName: "Example Business",
      email: "business@example.com",
      phoneNumber: "+1234567890",
      status: "active",
      about: "asd", // Your about field
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
        profilePhoto: "profile_photo_url",
        isEmailVerified: true,
        isPhoneVerified: true
      },
      boostActive: false,
      boostStartAt: null,
      boostEndAt: null,
      boostCategory: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-15T08:00:00.000Z"
    }
  }
};

// 2. Get business by active subscription ID
// GET /api/admin/businesses/by-subscription/68b2fc95716fd5d85083be95

const exampleBusinessBySubscriptionResponse = {
  success: true,
  message: "Business with active subscription details fetched successfully",
  data: {
    business: {
      _id: "business_id",
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
        profilePhoto: "profile_photo_url",
        isEmailVerified: true,
        isPhoneVerified: true
      },
      boostActive: false,
      boostStartAt: null,
      boostEndAt: null,
      boostCategory: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-15T08:00:00.000Z"
    },
    activeSubscription: {
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
      boostQueueInfo: null,
      paymentPlan: {
        _id: "payment_plan_id",
        name: "Gold Business Plan", // Payment plan name
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
      daysUntilExpiry: null,
      hoursUntilExpiry: null
    },
    subscriptionStatus: {
      hasActiveSubscription: true,
      hasActiveBoost: false,
      isBoosted: false
    },
    allSubscriptions: [
      {
        _id: "68b2fc95716fd5d85083be95",
        subscriptionType: "business",
        status: "active",
        amount: 99.99,
        currency: "USD",
        expiresAt: null,
        isLifetime: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
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
        boostQueueInfo: null,
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
      }
    ]
  }
};

// How to use these endpoints:

console.log("Available endpoints for getting subscription data:");
console.log("1. GET /api/admin/businesses/subscription/:subscriptionId");
console.log("   - Gets subscription details directly by subscription ID");
console.log("   - Includes payment plan name, subscription type, etc.");
console.log("   - Example: GET /api/admin/businesses/subscription/68b2fc95716fd5d85083be95");

console.log("\n2. GET /api/admin/businesses/by-subscription/:activeSubscriptionId");
console.log("   - Gets business details by active subscription ID");
console.log("   - Includes business info, active subscription, and all subscriptions");
console.log("   - Example: GET /api/admin/businesses/by-subscription/68b2fc95716fd5d85083be95");

console.log("\n3. GET /api/admin/businesses/:businessId/subscription-details");
console.log("   - Gets detailed subscription info for a specific business");
console.log("   - Includes subscription history and comprehensive details");

console.log("\nKey data you'll get:");
console.log("- subscriptionType: 'business' or 'boost'");
console.log("- paymentPlan.name: The plan name (e.g., 'Gold Business Plan')");
console.log("- paymentPlan.description: Plan description");
console.log("- paymentPlan.planType: 'business' or 'boost'");
console.log("- paymentPlan.price: Plan price");
console.log("- paymentPlan.features: Array of available features");
console.log("- status: Subscription status");
console.log("- isExpired: Boolean indicating if subscription is expired");
console.log("- daysUntilExpiry/hoursUntilExpiry: Time remaining");

module.exports = {
  exampleSubscriptionResponse,
  exampleBusinessBySubscriptionResponse
};
