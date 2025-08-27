# Comprehensive Payment Plan & Subscription API Documentation

## Overview

This document describes the complete API system for managing payment plans, business subscriptions, and payment history. The system supports two types of plans:

1. **Business Plans**: Lifetime subscriptions with business features and daily boost limits
2. **Boost Plans**: Temporary visibility boosts with configurable validity periods

**Note**: This system uses the existing admin subscription model that tracks what businesses have purchased. Admins can view, monitor, and analyze business subscriptions but cannot purchase subscriptions themselves.

## Models

### 1. PaymentPlan Model
- **planType**: `business` or `boost`
- **features**: Business features (query, review, embedded) - only for business plans
- **maxBoostPerDay**: Daily boost usage limit - only for business plans
- **validityHours**: Validity period - only for boost plans

### 2. Subscription Model (Admin side)
- Tracks business subscriptions to payment plans (what businesses have purchased)
- Handles lifetime vs temporary subscriptions
- Manages boost usage tracking for business plans
- Automatic expiration for boost plans
- Admins can view all business subscriptions and usage

### 3. Payment Model (Admin side)
- Records all payment transactions for business subscriptions and boosts
- Tracks payment status and metadata
- Links to subscriptions and payment plans
- Generates invoice numbers automatically
- Admins can view payment history and analytics

## API Endpoints

### Payment Plan Management

#### Get All Boost Plans
```http
GET /api/admin/payment-plans/boost/all
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `isActive`: Filter by active status (true/false)
- `sortBy`: Sort field (sortOrder, price, name, createdAt)
- `sortOrder`: Sort direction (asc/desc)

**Response:**
```json
{
  "success": true,
  "message": "Boost plans retrieved successfully",
  "data": [
    {
      "_id": "plan_id",
      "name": "24-Hour Boost",
      "description": "24-hour visibility boost",
      "planType": "boost",
      "price": 9.99,
      "validityHours": 24,
      "planDuration": "24 hours",
      "planCategory": "Temporary Boost",
      "validityDays": 1.0,
      "isActive": true
    }
  ]
}
```

#### Get All Business Plans
```http
GET /api/admin/payment-plans/business/all
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `isActive`: Filter by active status (true/false)
- `sortBy`: Sort field (sortOrder, price, name, createdAt)
- `sortOrder`: Sort direction (asc/desc)

**Response:**
```json
{
  "success": true,
  "message": "Business plans retrieved successfully",
  "data": [
    {
      "_id": "plan_id",
      "name": "Premium Business",
      "description": "Premium business subscription",
      "planType": "business",
      "price": 99.99,
      "features": ["query", "review", "embeded"],
      "maxBoostPerDay": 5,
      "planDuration": "Lifetime (No expiration)",
      "planCategory": "Business Subscription",
      "boostLimitInfo": "5 boosts per day",
      "isActive": true
    }
  ]
}
```

### Business Subscription History

#### Get Business Subscription History
```http
GET /api/admin/payment-plans/subscriptions/history
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `businessId`: Filter by specific business ID
- `planType`: Filter by plan type (business/boost)
- `status`: Filter by subscription status (active/expired/cancelled/pending)
- `page`: Page number for pagination
- `limit`: Items per page

**Response:**
```json
{
  "success": true,
  "message": "Business subscription history retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "_id": "subscription_id",
        "businessId": {
          "_id": "business_id",
          "businessName": "ABC Company",
          "businessEmail": "abc@company.com"
        },
        "paymentPlanId": {
          "_id": "plan_id",
          "name": "Premium Business",
          "description": "Premium business subscription",
          "price": 99.99,
          "currency": "USD",
          "features": ["query", "review", "embeded"],
          "maxBoostPerDay": 5,
          "validityHours": null
        },
        "planType": "business",
        "status": "active",
        "startDate": "2024-01-15T10:00:00.000Z",
        "endDate": null,
        "statusInfo": "Lifetime subscription",
        "isExpired": false,
        "daysRemaining": null,
        "canUseBoost": true,
        "boostUsageInfo": "2/5 used today",
        "boostUsageCount": 2,
        "maxBoostPerDay": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalSubscriptions": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Payment History

#### Get Payment History
```http
GET /api/admin/payment-plans/payments/history
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `businessId`: Filter by specific business ID
- `planType`: Filter by plan type (business/boost)
- `paymentType`: Filter by payment type (subscription/boost/renewal/upgrade)
- `status`: Filter by payment status (pending/completed/failed/refunded/cancelled)
- `startDate`: Filter payments from this date (ISO format)
- `endDate`: Filter payments until this date (ISO format)
- `page`: Page number for pagination
- `limit`: Items per page

**Response:**
```json
{
  "success": true,
  "message": "Payment history retrieved successfully",
  "data": {
    "payments": [
      {
        "_id": "payment_id",
        "businessId": {
          "_id": "business_id",
          "businessName": "ABC Company",
          "businessEmail": "abc@company.com"
        },
        "paymentPlanId": {
          "_id": "plan_id",
          "name": "Premium Business",
          "description": "Premium business subscription",
          "planType": "business"
        },
        "subscriptionId": {
          "_id": "subscription_id",
          "status": "active",
          "startDate": "2024-01-15T10:00:00.000Z",
          "endDate": null
        },
        "planType": "business",
        "paymentType": "subscription",
        "status": "completed",
        "amount": 99.99,
        "currency": "USD",
        "discount": 0,
        "finalAmount": 99.99,
        "invoiceNumber": "INV-1705312800000-123",
        "receiptUrl": "https://receipt.stripe.com/ch_123",
        "statusDisplay": "Payment Successful",
        "paymentTypeDisplay": "Business Subscription",
        "subscriptionStatus": "active",
        "subscriptionStartDate": "2024-01-15T10:00:00.000Z",
        "subscriptionEndDate": null,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalPayments": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Business Overview

#### Get Business Overview
```http
GET /api/admin/payment-plans/business/{businessId}/overview
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Business overview retrieved successfully",
  "data": {
    "businessId": "business_id",
    "activeSubscriptions": {
      "businessPlans": 2,
      "boostPlans": 1,
      "total": 3
    },
    "inactiveSubscriptions": {
      "expired": 5,
      "cancelled": 2,
      "total": 7
    },
    "payments": {
      "total": 25,
      "completed": 20,
      "pending": 3,
      "failed": 2,
      "totalSpent": 2499.75,
      "totalPending": 299.97
    },
    "boostUsage": [
      {
        "planName": "Premium Business",
        "maxBoostPerDay": 5,
        "usedToday": 2,
        "canUseBoost": true,
        "lastBoostDate": "2024-01-15T15:30:00.000Z"
      }
    ],
    "recentPayments": [...],
    "paymentStats": [
      {
        "_id": "completed",
        "count": 20,
        "totalAmount": 2499.75
      }
    ]
  }
}
```

### Subscription Analytics

#### Get Subscription Analytics
```http
GET /api/admin/payment-plans/analytics/subscriptions
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `startDate`: Start date for analytics (ISO format)
- `endDate`: End date for analytics (ISO format)
- `planType`: Filter by plan type (business/boost)

**Response:**
```json
{
  "success": true,
  "message": "Subscription analytics retrieved successfully",
  "data": {
    "subscriptionStats": [
      {
        "_id": {
          "planType": "business",
          "status": "active"
        },
        "count": 150
      }
    ],
    "paymentStats": [
      {
        "_id": {
          "planType": "business",
          "status": "completed"
        },
        "count": 200,
        "totalAmount": 19999.00
      }
    ],
    "monthlyTrends": [
      {
        "_id": {
          "year": 2024,
          "month": 1,
          "planType": "business"
        },
        "count": 25
      }
    ],
    "topPlans": [
      {
        "_id": {
          "_id": "plan_id",
          "name": "Premium Business",
          "description": "Premium business subscription",
          "planType": "business",
          "price": 99.99
        },
        "count": 50
      }
    ],
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

## Key Features

### 1. Plan Type Constraints
- **Business Plans**: Cannot have `validityHours`, must have `features`, can have `maxBoostPerDay`
- **Boost Plans**: Must have `validityHours`, cannot have `features` or `maxBoostPerDay`

### 2. Subscription Management
- **Lifetime Subscriptions**: Business plans never expire
- **Temporary Subscriptions**: Boost plans automatically expire based on validity hours
- **Boost Usage Tracking**: Daily limits and usage counting for business plans

### 3. Payment Tracking
- **Complete Payment History**: All transactions with detailed metadata
- **Status Management**: Pending, completed, failed, refunded, cancelled
- **Invoice Generation**: Automatic invoice numbers and receipt URLs

### 4. Analytics & Reporting
- **Subscription Statistics**: Counts by plan type and status
- **Payment Analytics**: Revenue tracking and payment trends
- **Business Overview**: Comprehensive view of individual business status
- **Monthly Trends**: Historical subscription and payment patterns

## Usage Examples

### Frontend Integration

```javascript
// Get all boost plans for display
const getBoostPlans = async () => {
  const response = await fetch('/api/admin/payment-plans/boost/all?isActive=true');
  const data = await response.json();
  return data.data;
};

// Get business subscription history
const getBusinessSubscriptions = async (businessId) => {
  const response = await fetch(`/api/admin/payment-plans/subscriptions/history?businessId=${businessId}`);
  const data = await response.json();
  return data.data;
};

// Get payment history with filters
const getPaymentHistory = async (filters) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/admin/payment-plans/payments/history?${params}`);
  const data = await response.json();
  return data.data;
};
```

### Admin Dashboard Features

1. **Plan Management**: View, create, edit, and delete payment plans
2. **Subscription Monitoring**: Track active, expired, and cancelled subscriptions
3. **Payment Tracking**: Monitor payment status and revenue
4. **Business Insights**: Individual business overview and analytics
5. **System Analytics**: Overall subscription and payment trends

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Security

- All admin endpoints require valid admin authentication token
- Business data is properly isolated and secured
- Payment information is handled securely through Stripe
- Input validation prevents injection attacks

## Performance

- Efficient database indexing for fast queries
- Pagination support for large datasets
- Aggregation pipelines for analytics
- Optimized population of related data
