# User Activity Tracking System

This system provides comprehensive tracking of user activities, visit counts, and last activity times for admin monitoring and analytics.

## Features

- **Visit Count Tracking**: Automatically increments visit count on each user activity
- **Last Activity Time**: Updates timestamp of user's last activity
- **Detailed Activity Logging**: Tracks specific user actions with metadata
- **Admin Dashboard**: Complete analytics and monitoring for administrators
- **Search & Filter**: Advanced search capabilities for user activities

## Models

### UserActivity Model
Tracks detailed user activities with the following fields:
- `userId`: Reference to User
- `action`: Type of activity (login, logout, profile_update, etc.)
- `description`: Human-readable description
- `details`: Additional activity-specific data
- `ipAddress`: User's IP address
- `userAgent`: Browser/client information
- `location`: Geographic location data
- `deviceInfo`: Device type, browser, OS
- `sessionId`: Session identifier
- `duration`: Activity duration in seconds
- `metadata`: Additional metadata

### User Model Updates
Added fields to existing User model:
- `lastActivityTime`: Timestamp of last user activity
- `visitCount`: Total number of visits (existing field)
- `lastVisit`: Last visit timestamp (existing field)

## API Endpoints

### Admin Endpoints

#### 1. Get All Users with Activity Data
```
GET /admin/user-activity/users
```
**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `days` (default: 30): Days to look back for activity
- `includeActivity` (default: true): Include activity data

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "userName": "john_doe",
        "visitCount": 25,
        "lastVisit": "2024-01-15T10:30:00Z",
        "lastActivityTime": "2024-01-15T10:30:00Z",
        "activity": {
          "totalActivities": 45,
          "lastActivity": "2024-01-15T10:30:00Z",
          "uniqueSessions": 12,
          "topActions": [
            {"action": "login", "count": 15},
            {"action": "page_visited", "count": 20}
          ]
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### 2. Get User Activity Details
```
GET /admin/user-activity/users/:userId/activity
```
**Query Parameters:**
- `days` (default: 30): Days to look back
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page

#### 3. Get User Activity Analytics
```
GET /admin/user-activity/users/:userId/analytics
```
**Query Parameters:**
- `days` (default: 30): Days to look back

#### 4. Get Admin Dashboard Data
```
GET /admin/user-activity/dashboard
```
**Query Parameters:**
- `days` (default: 30): Days to look back

#### 5. Search User Activities
```
GET /admin/user-activity/activities/search
```
**Query Parameters:**
- `query`: Search term
- `action`: Filter by action type
- `userId`: Filter by specific user
- `startDate`: Start date filter
- `endDate`: End date filter
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page

## Usage Examples

### 1. Using Middleware in Routes

```javascript
import { trackPageVisitMiddleware, trackApiCallMiddleware } from '../middleware/userActivityMiddleware.js';

// Track page visits
router.get('/businesses', trackPageVisitMiddleware('Business Listings'), getBusinessListings);

// Track API calls
router.post('/reviews', trackApiCallMiddleware('Create Review'), createReview);
```

### 2. Manual Activity Tracking

```javascript
import { trackUserActivity, trackLoginActivity } from '../helpers/userActivityHelper.js';

// Track custom activity
await trackUserActivity({
  userId: user._id,
  action: 'review_posted',
  description: 'User posted a review',
  details: {
    businessId: businessId,
    rating: rating,
    reviewId: review._id
  },
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  sessionId: req.sessionID
});
```

### 3. Getting Activity Data in Controllers

```javascript
import { getUserActivitySummary, getUsersActivityCounts } from '../helpers/userActivityHelper.js';

// Get user activity summary
const summary = await getUserActivitySummary(userId, 30);

// Get activity counts for multiple users
const counts = await getUsersActivityCounts([userId1, userId2, userId3]);
```

## Activity Types

The system tracks the following activity types:

- `login`: User login
- `logout`: User logout
- `profile_update`: Profile modifications
- `password_change`: Password changes
- `email_verification`: Email verification
- `phone_verification`: Phone verification
- `review_posted`: Review creation
- `review_updated`: Review updates
- `review_deleted`: Review deletion
- `review_comment_posted`: Adding comments to reviews
- `review_reply_posted`: Adding replies to review comments
- `business_viewed`: Business page views
- `product_viewed`: Product page views
- `blog_viewed`: Blog page views
- `search_performed`: Search activities
- `category_browsed`: Category browsing
- `page_visited`: General page visits
- `api_call`: API calls
- `file_upload`: File uploads
- `subscription_change`: Subscription changes
- `account_deleted`: Account deletion
- `other`: Other activities

## Middleware Options

### Available Middleware Functions

1. **trackUserActivityMiddleware(action, description, details)**
   - Generic activity tracking middleware

2. **trackPageVisitMiddleware(pageName)**
   - Track page visits

3. **trackApiCallMiddleware(endpoint)**
   - Track API calls

4. **trackProfileUpdateMiddleware()**
   - Track profile updates

5. **trackPasswordChangeMiddleware()**
   - Track password changes

6. **trackReviewActivityMiddleware(action)**
   - Track review-related activities

7. **trackBusinessViewMiddleware()**
   - Track business page views

8. **trackSearchMiddleware()**
   - Track search activities

9. **updateLastActivityMiddleware()**
   - Simple middleware to update last activity time

### Example Route Implementation

```javascript
import express from 'express';
import { 
  trackPageVisitMiddleware, 
  trackApiCallMiddleware,
  updateLastActivityMiddleware 
} from '../middleware/userActivityMiddleware.js';

const router = express.Router();

// Track business listing page visits
router.get('/businesses', 
  trackPageVisitMiddleware('Business Listings'), 
  getBusinessListings
);

// Track review creation
router.post('/reviews', 
  trackReviewActivityMiddleware('review_posted'),
  createReview
);

// Track review comments
router.post('/reviews/:id/comments', 
  trackReviewActivityMiddleware('review_comment_posted'),
  addComment
);

// Track review replies
router.post('/reviews/comments/:commentId/replies', 
  trackReviewActivityMiddleware('review_reply_posted'),
  addReply
);

// Simple activity tracking for profile routes
router.get('/profile', 
  updateLastActivityMiddleware,
  getProfile
);
```

## Database Indexes

The UserActivity model includes optimized indexes for:
- `userId` + `createdAt` (for user activity queries)
- `action` + `createdAt` (for action-based queries)
- `sessionId` (for session tracking)
- `createdAt` (for time-based queries)

## Performance Considerations

1. **Async Tracking**: All activity tracking is asynchronous and won't block user requests
2. **Error Handling**: Tracking failures don't affect user experience
3. **Indexing**: Proper database indexes for efficient queries
4. **Pagination**: All list endpoints support pagination
5. **Filtering**: Advanced filtering options to reduce data transfer

## Security

- All admin endpoints require authentication
- IP addresses and user agents are logged for security monitoring
- Sensitive data is not stored in activity logs
- Session tracking helps identify suspicious activities

## Monitoring

The system provides comprehensive monitoring capabilities:
- Real-time activity tracking
- User engagement metrics
- Session analysis
- Geographic activity distribution
- Device and browser statistics
- Admin dashboard with key metrics

This system enables administrators to monitor user behavior, track engagement, and identify potential issues or security concerns.
