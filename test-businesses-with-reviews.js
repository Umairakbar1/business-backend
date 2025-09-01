/**
 * Test file to demonstrate the enhanced business fetch API
 * 
 * This file shows how to filter businesses to only return those
 * that have at least 1 review.
 */

// Example usage for filtering businesses with reviews:
// GET /api/admin/businesses?hasReviews=true

const exampleBusinessesWithReviewsResponse = {
  success: true,
  message: "Businesses fetched successfully",
  data: [
    {
      _id: "business_id_1",
      businessName: "Tech Solutions Inc",
      email: "contact@techsolutions.com",
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
        email: "john@techsolutions.com",
        phoneNumber: "+1234567890",
        username: "johndoe",
        status: "active",
        profilePhoto: "profile_photo_url"
      },
      // Enhanced subscription status
      hasActiveSubscription: true,
      hasActiveBoost: false,
      isBoosted: false,
      activeSubscriptionId: "68b2fc95716fd5d85083be95",
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
      boostDetails: null,
      // NEW: Review count
      reviewCount: 5
    },
    {
      _id: "business_id_2",
      businessName: "Design Studio Pro",
      email: "hello@designstudiopro.com",
      phoneNumber: "+1987654321",
      status: "active",
      category: {
        _id: "category_id_2",
        title: "Design",
        slug: "design",
        description: "Design services",
        image: "design_category_image",
        color: "#28a745"
      },
      subcategories: [
        {
          _id: "subcategory_id_2",
          title: "UI/UX Design",
          slug: "ui-ux-design",
          description: "User interface and experience design",
          image: "uiux_image"
        }
      ],
      businessOwner: {
        _id: "owner_id_2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@designstudiopro.com",
        phoneNumber: "+1987654321",
        username: "janesmith",
        status: "active",
        profilePhoto: "jane_profile_photo"
      },
      // Enhanced subscription status
      hasActiveSubscription: true,
      hasActiveBoost: true,
      isBoosted: true,
      activeSubscriptionId: "boost_subscription_id",
      // Enhanced subscription details
      subscriptionDetails: {
        _id: "business_subscription_id",
        subscriptionType: "business",
        status: "active",
        amount: 149.99,
        currency: "USD",
        expiresAt: null,
        isLifetime: true,
        features: ["query", "review", "embedded", "premium"],
        maxBoostPerDay: 10,
        validityHours: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        boostUsage: {
          currentDay: 5,
          lastResetDate: "2024-01-15T00:00:00.000Z"
        },
        featureUsage: {
          reviewsPosted: 25,
          lastResetDate: "2024-01-01T00:00:00.000Z"
        },
        planDetails: {
          _id: "premium_plan_id",
          name: "Premium Business Plan",
          description: "Ultimate business plan with all premium features",
          planType: "business",
          price: 149.99,
          currency: "USD",
          features: ["query", "review", "embedded", "premium"],
          maxBoostPerDay: 10,
          validityHours: null,
          isActive: true,
          isPopular: true,
          sortOrder: 4,
          discount: 0
        },
        isExpired: false,
        daysUntilExpiry: null
      },
      boostDetails: {
        _id: "boost_subscription_id",
        subscriptionType: "boost",
        status: "active",
        amount: 29.99,
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
          category: "category_id_2"
        },
        planDetails: {
          _id: "boost_plan_id",
          name: "24-Hour Boost",
          description: "Boost your business visibility for 24 hours",
          planType: "boost",
          price: 29.99,
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
      // NEW: Review count
      reviewCount: 12
    }
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1
  },
  totalCount: 2
};

// How to use the enhanced business fetch API with review filtering:

console.log("Enhanced Business Fetch API with Review Filtering:");
console.log("GET /api/admin/businesses?hasReviews=true");
console.log("This endpoint now filters businesses to only show those with reviews!");

console.log("\nKey features of the review filtering:");

console.log("\n✅ Review Filter Parameter:");
console.log("- hasReviews=true: Only returns businesses with at least 1 review");
console.log("- hasReviews=false or not provided: Returns all businesses (default behavior)");

console.log("\n✅ Review Count Information:");
console.log("- Each business now includes a reviewCount field");
console.log("- Shows the total number of reviews for each business");
console.log("- Helps identify businesses with high engagement");

console.log("\n✅ Performance Optimized:");
console.log("- Uses MongoDB aggregation for efficient review counting");
console.log("- Filters at database level for better performance");
console.log("- Handles cases where no businesses have reviews");

console.log("\n✅ Complete Business Information:");
console.log("- All existing business data is preserved");
console.log("- Subscription details are still included");
console.log("- Review count is added as an additional field");

console.log("\nExample usage in your frontend:");

console.log("\n// Get businesses with reviews only");
console.log("const response = await fetch('/api/admin/businesses?hasReviews=true', {");
console.log("  headers: { 'Authorization': 'Bearer token' }");
console.log("});");
console.log("const result = await response.json();");
console.log("console.log('Businesses with reviews:', result.data.length);");

console.log("\n// Get businesses with reviews and pagination");
console.log("const response = await fetch('/api/admin/businesses?hasReviews=true&page=1&limit=5', {");
console.log("  headers: { 'Authorization': 'Bearer token' }");
console.log("});");
console.log("const result = await response.json();");
console.log("console.log('Total businesses with reviews:', result.data.totalCount);");

console.log("\n// Access review count for each business");
console.log("result.data.forEach(business => {");
console.log("  console.log(`${business.businessName}: ${business.reviewCount} reviews`);");
console.log("});");

console.log("\n// Filter businesses by review count in frontend");
console.log("const businessesWithManyReviews = result.data.filter(business => business.reviewCount >= 5);");
console.log("console.log('Businesses with 5+ reviews:', businessesWithManyReviews.length);");

console.log("\nWhat you get with the review filtering:");

console.log("\n1. Filtered Results:");
console.log("   - Only businesses with at least 1 review are returned");
console.log("   - Businesses without reviews are excluded");
console.log("   - Maintains all existing business information");

console.log("\n2. Review Count Data:");
console.log("   - reviewCount field shows total reviews per business");
console.log("   - Helps identify popular businesses");
console.log("   - Useful for sorting and filtering in frontend");

console.log("\n3. Pagination Support:");
console.log("   - Works with existing pagination parameters");
console.log("   - Total count reflects only businesses with reviews");
console.log("   - Maintains consistent pagination behavior");

console.log("\n4. Performance Benefits:");
console.log("   - Database-level filtering for efficiency");
console.log("   - Reduces data transfer for better performance");
console.log("   - Optimized aggregation queries");

module.exports = {
  exampleBusinessesWithReviewsResponse
};
