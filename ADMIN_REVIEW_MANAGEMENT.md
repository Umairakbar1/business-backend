# Admin Review Management System

## Overview
The admin review management system allows administrators to approve, reject, or delete reviews submitted by users for businesses. Only approved reviews are displayed to users on the business details page.

## Review Status Flow
1. **Pending** - Default status when a user submits a review
2. **Approved** - Admin approves the review, making it visible to users
3. **Rejected** - Admin rejects the review, keeping it hidden from users

## Database Schema Updates

### Review Model (`src/models/admin/review.js`)
```javascript
{
  userId: { type: ObjectId, ref: 'User', required: true },
  businessId: { type: ObjectId, ref: 'Business', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true },
  comment: { type: String, trim: true },
  media: [String],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: ObjectId, ref: 'Admin' },
  approvedByType: { type: String, enum: ['admin', 'business'], default: 'admin' },
  businessCanManage: { type: Boolean, default: false },
  businessManagementGrantedBy: { type: ObjectId, ref: 'Admin' },
  businessManagementGrantedAt: Date,
  approvedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

## Admin API Endpoints

### 1. Get All Reviews
**GET** `/api/admin/reviews`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ('pending', 'approved', 'rejected')
- `businessId` (optional): Filter by business ID
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Response:**
```json
{
  "success": true,
  "message": "Reviews fetched successfully",
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "userId": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "profilePhoto": "photo_url"
        },
        "businessId": {
          "_id": "business_id",
          "businessName": "Business Name",
          "contactPerson": "Contact Person",
          "email": "business@example.com",
          "phone": "1234567890",
          "businessCategory": "Category"
        },
        "rating": 5,
        "title": "Great Service!",
        "comment": "Excellent experience",
        "media": ["media_url1", "media_url2"],
        "status": "pending",
        "approvedBy": null,
        "approvedAt": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### 2. Get Review Statistics
**GET** `/api/admin/reviews/stats`

**Response:**
```json
{
  "success": true,
  "message": "Review statistics fetched successfully",
  "data": {
    "totalReviews": 100,
    "pendingReviews": 20,
    "approvedReviews": 70,
    "rejectedReviews": 10,
    "reviewsByBusiness": [
      {
        "businessName": "Business Name",
        "totalReviews": 15,
        "approvedReviews": 12,
        "pendingReviews": 2,
        "rejectedReviews": 1
      }
    ]
  }
}
```

### 3. Get Reviews by Business
**GET** `/api/admin/reviews/business/:businessId`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Response:**
```json
{
  "success": true,
  "message": "Business reviews fetched successfully",
  "data": {
    "business": {
      "_id": "business_id",
      "businessName": "Business Name",
      "contactPerson": "Contact Person",
      "email": "business@example.com",
      "phone": "1234567890",
      "businessCategory": "Category"
    },
    "reviews": [...],
    "pagination": {...}
  }
}
```

### 4. Get Single Review
**GET** `/api/admin/reviews/:id`

**Response:**
```json
{
  "success": true,
  "message": "Review fetched successfully",
  "data": {
    "_id": "review_id",
    "userId": {...},
    "businessId": {...},
    "rating": 5,
    "title": "Great Service!",
    "comment": "Excellent experience",
    "media": ["media_url1"],
    "status": "pending",
    "approvedBy": null,
    "approvedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Approve Review
**PUT** `/api/admin/reviews/:id/approve`

**Response:**
```json
{
  "success": true,
  "message": "Review approved successfully",
  "data": {
    "_id": "review_id",
    "status": "approved",
    "approvedBy": "admin_id",
    "approvedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Reject Review
**PUT** `/api/admin/reviews/:id/reject`

**Response:**
```json
{
  "success": true,
  "message": "Review rejected successfully",
  "data": {
    "_id": "review_id",
    "status": "rejected",
    "approvedBy": "admin_id",
    "approvedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 7. Delete Review
**DELETE** `/api/admin/reviews/:id`

**Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

### 8. Grant Business Access to Review
**PUT** `/api/admin/reviews/:id/grant-business-access`

**Response:**
```json
{
  "success": true,
  "message": "Business access granted successfully",
  "data": {
    "_id": "review_id",
    "businessCanManage": true,
    "businessManagementGrantedBy": "admin_id",
    "businessManagementGrantedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 9. Revoke Business Access to Review
**PUT** `/api/admin/reviews/:id/revoke-business-access`

**Response:**
```json
{
  "success": true,
  "message": "Business access revoked successfully",
  "data": {
    "_id": "review_id",
    "businessCanManage": false,
    "businessManagementGrantedBy": "admin_id",
    "businessManagementGrantedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Business API Endpoints

### 1. Get Business Reviews
**GET** `/api/business/reviews`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Response:**
```json
{
  "success": true,
  "message": "Business reviews fetched successfully",
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "userId": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "profilePhoto": "photo_url"
        },
        "rating": 5,
        "title": "Great Service!",
        "comment": "Excellent experience",
        "status": "pending",
        "businessCanManage": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 2. Get Manageable Reviews
**GET** `/api/business/reviews/manageable`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Response:**
```json
{
  "success": true,
  "message": "Manageable reviews fetched successfully",
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "userId": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "profilePhoto": "photo_url"
        },
        "rating": 5,
        "title": "Great Service!",
        "comment": "Excellent experience",
        "status": "pending",
        "businessCanManage": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 3. Get Review Statistics
**GET** `/api/business/reviews/stats`

**Response:**
```json
{
  "success": true,
  "message": "Review statistics fetched successfully",
  "data": {
    "totalReviews": 50,
    "pendingReviews": 10,
    "approvedReviews": 35,
    "rejectedReviews": 5,
    "manageableReviews": 8
  }
}
```

### 4. Get Single Review
**GET** `/api/business/reviews/:id`

**Response:**
```json
{
  "success": true,
  "message": "Review fetched successfully",
  "data": {
    "_id": "review_id",
    "userId": {...},
    "rating": 5,
    "title": "Great Service!",
    "comment": "Excellent experience",
    "status": "pending",
    "businessCanManage": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Approve Review (Business)
**PUT** `/api/business/reviews/:id/approve`

**Response:**
```json
{
  "success": true,
  "message": "Review approved successfully",
  "data": {
    "_id": "review_id",
    "status": "approved",
    "approvedBy": "business_id",
    "approvedByType": "business",
    "approvedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Reject Review (Business)
**PUT** `/api/business/reviews/:id/reject`

**Response:**
```json
{
  "success": true,
  "message": "Review rejected successfully",
  "data": {
    "_id": "review_id",
    "status": "rejected",
    "approvedBy": "business_id",
    "approvedByType": "business",
    "approvedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 7. Delete Review (Business)
**DELETE** `/api/business/reviews/:id`

**Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

## User API Endpoints

### 1. Submit Review
**POST** `/api/user/review`

**Request Body:**
```json
{
  "businessId": "business_id",
  "rating": 5,
  "title": "Great Service!",
  "comment": "Excellent experience",
  "media": ["media_url1", "media_url2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully and pending approval",
  "data": {
    "review": {
      "_id": "review_id",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Get User's Reviews
**GET** `/api/user/review/my-reviews`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "message": "Your reviews fetched successfully",
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "businessId": {
          "_id": "business_id",
          "businessName": "Business Name",
          "businessCategory": "Category"
        },
        "rating": 5,
        "title": "Great Service!",
        "status": "approved",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 3. Get Business Reviews (User Side)
**GET** `/api/user/business/:id/reviews`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field ('date' or 'rating', default: 'date')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "review_id",
      "userId": {
        "_id": "user_id",
        "name": "John Doe",
        "profilePhoto": "photo_url"
      },
      "rating": 5,
      "title": "Great Service!",
      "comment": "Excellent experience",
      "media": ["media_url1"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 25
}
```

## Business Impact

### User Side Changes
- Only **approved** reviews are displayed on business details pages
- Business ratings and statistics are calculated only from approved reviews
- Users can see the status of their own reviews (pending/approved/rejected)

### Admin Side Features
- View all reviews with business and user information
- Filter reviews by status, business, or other criteria
- Approve or reject reviews with admin tracking
- Delete inappropriate reviews
- View review statistics and business-wise breakdown
- Get detailed review information with populated references
- **Grant/revoke business access to individual reviews**
- **Track who approved each review (admin vs business)**

### Business Side Features
- View all reviews for their business
- **Manage reviews that admin has granted access to**
- Approve/reject/delete reviews (only if granted access)
- View review statistics for their business
- **See which reviews they can manage vs which are admin-only**

## Security Features
- All admin endpoints require admin authentication
- All user endpoints require user authentication
- Input validation for all review data
- Proper error handling and response codes
- Audit trail for review approvals/rejections

## Usage Examples

### Admin Dashboard Workflow
1. Admin logs in and navigates to review management
2. Views pending reviews with business and user details
3. Reviews each submission for appropriateness
4. **Decides which reviews to grant business access to**
5. **Approves good reviews or grants business access for business to manage**
6. Monitors review statistics and business performance

### Business Dashboard Workflow
1. Business logs in and navigates to review management
2. Views all reviews for their business
3. **Sees which reviews they can manage (businessCanManage: true)**
4. **Approves/rejects/deletes reviews they have access to**
5. Monitors their review statistics and performance

### User Experience
1. User submits a review for a business
2. Review goes into pending status
3. Admin reviews and approves/rejects
4. If approved, review appears on business page
5. User can track their review status

## Error Handling
- Invalid review ID: 400 Bad Request
- Review not found: 404 Not Found
- Invalid business ID: 400 Bad Request
- Missing required fields: 400 Bad Request
- Server errors: 500 Internal Server Error

## Performance Considerations
- Pagination implemented for all list endpoints
- Database indexes on frequently queried fields
- Populated references for efficient data retrieval
- Aggregation pipelines for statistics calculation 