# Review Reply API Documentation

## Overview

This document outlines the implementation of direct reply functionality for reviews, allowing both admin and business users to reply directly to reviews (one reply per review). This is separate from the existing comment and reply system.

## Key Features

- **Two Replies Per Review**: Each review can have both an admin reply AND a business reply
- **Admin & Business Access**: Both admin and business users can reply to reviews independently
- **Full CRUD Operations**: Create, read, update, and delete replies
- **Author Information**: Replies include author name, email, and type
- **Edit Tracking**: Tracks when replies are edited
- **Populated Data**: All review fetch endpoints now include reply information

## Database Schema Changes

### Review Model Updates

The Review model now includes a `replies` field that allows both admin and business replies:

```javascript
replies: {
  admin: {
    content: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    authorName: {
      type: String,
      required: false,
      trim: true
    },
    authorEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  },
  business: {
    content: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    authorName: {
      type: String,
      required: false,
      trim: true
    },
    authorEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  }
}
```

## API Endpoints

### Admin Review Reply Endpoints

#### 1. Add Reply to Review
- **POST** `/admin/reviews/:id/reply`
- **Description**: Add a direct reply to a review
- **Authentication**: Admin required
- **Body**:
  ```json
  {
    "content": "Reply content here"
  }
  ```
- **Response**: Review object with populated reply data

#### 2. Edit Reply to Review
- **PUT** `/admin/reviews/:id/reply`
- **Description**: Edit an existing reply to a review
- **Authentication**: Admin required (only own replies)
- **Body**:
  ```json
  {
    "content": "Updated reply content"
  }
  ```
- **Response**: Review object with updated reply data

#### 3. Delete Reply to Review
- **DELETE** `/admin/reviews/:id/reply`
- **Description**: Delete a reply to a review
- **Authentication**: Admin required (only own replies)
- **Response**: Review object with reply removed

### Business Review Reply Endpoints

#### 1. Add Reply to Review
- **POST** `/business/reviews/:id/reply`
- **Description**: Add a direct reply to a review
- **Authentication**: Business owner required
- **Body**:
  ```json
  {
    "content": "Reply content here"
  }
  ```
- **Response**: Review object with populated reply data

#### 2. Edit Reply to Review
- **PUT** `/business/reviews/:id/reply`
- **Description**: Edit an existing reply to a review
- **Authentication**: Business owner required (only own replies)
- **Body**:
  ```json
  {
    "content": "Updated reply content"
  }
  ```
- **Response**: Review object with updated reply data

#### 3. Delete Reply to Review
- **DELETE** `/business/reviews/:id/reply`
- **Description**: Delete a reply to a review
- **Authentication**: Business owner required (only own replies)
- **Response**: Review object with reply removed

## Business Logic

### Reply Constraints

1. **Two Replies Per Review**: Each review can have both an admin reply AND a business reply
2. **One Reply Per User Type**: Admin can only have one reply, business can only have one reply
3. **Author Verification**: Users can only edit/delete their own replies
4. **Business Ownership**: Business users can only reply to reviews for their businesses
5. **Admin Access**: Admins can reply to any review

### Reply Data Population

All review fetch endpoints now automatically populate reply information:

- `replies.admin.content` - The admin reply text (if exists)
- `replies.admin.authorId` - Reference to the admin author
- `replies.admin.authorName` - Display name of the admin
- `replies.admin.authorEmail` - Email of the admin
- `replies.admin.createdAt` - When the admin reply was created
- `replies.admin.updatedAt` - When the admin reply was last updated
- `replies.admin.isEdited` - Whether the admin reply has been edited
- `replies.admin.editedAt` - When the admin reply was last edited

- `replies.business.content` - The business reply text (if exists)
- `replies.business.authorId` - Reference to the business author
- `replies.business.authorName` - Display name of the business
- `replies.business.authorEmail` - Email of the business
- `replies.business.createdAt` - When the business reply was created
- `replies.business.updatedAt` - When the business reply was last updated
- `replies.business.isEdited` - Whether the business reply has been edited
- `replies.business.editedAt` - When the business reply was last edited

## Updated Review Fetch Endpoints

The following endpoints now include reply data:

### Admin Endpoints
- `GET /admin/reviews` - All reviews with reply data
- `GET /admin/reviews/:id` - Single review with reply data
- `GET /admin/reviews/businesses-with-reviews` - Businesses with reviews including reply data
- `GET /admin/reviews/business/:businessId` - Single business with reviews including reply data

### Business Endpoints
- `GET /business/reviews` - Business reviews with reply data
- `GET /business/reviews/manageable` - Manageable reviews with reply data
- `GET /business/reviews/:id` - Single review with reply data

### User Endpoints
- `GET /user/review/my-reviews` - User's reviews with reply data
- `GET /user/review/:id` - Single review with reply data

## Example Response

```json
{
  "message": "Review fetched successfully",
  "data": {
    "_id": "review_id_here",
    "userId": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "businessId": {
      "_id": "business_id",
      "businessName": "Test Business"
    },
    "rating": 4,
    "title": "Great Service",
    "comment": "Really enjoyed the service",
    "status": "approved",
    "replies": {
      "admin": {
        "content": "Thank you for your feedback!",
        "authorId": {
          "_id": "admin_id",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "authorName": "Admin User (Admin)",
        "authorEmail": "admin@example.com",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "isEdited": false
      },
      "business": {
        "content": "We appreciate your review and will continue to improve our services!",
        "authorId": {
          "_id": "business_id",
          "name": "Test Business",
          "email": "business@example.com"
        },
        "authorName": "Test Business (Business)",
        "authorEmail": "business@example.com",
        "createdAt": "2024-01-15T11:00:00.000Z",
        "updatedAt": "2024-01-15T11:00:00.000Z",
        "isEdited": false
      }
    },
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Error Handling

### Common Error Codes

- **400**: Bad Request (missing content, invalid review ID)
- **401**: Unauthorized (not authenticated)
- **403**: Forbidden (trying to edit/delete someone else's reply)
- **404**: Not Found (review doesn't exist)
- **409**: Conflict (user type already has a reply to this review)

### Error Response Format

```json
{
  "success": false,
  "message": "Review already has a reply",
  "code": "00400"
}
```

## Security Considerations

1. **Authentication Required**: All reply endpoints require proper authentication
2. **Authorization**: Users can only modify their own replies
3. **Business Ownership**: Business users can only reply to their own business reviews
4. **Input Validation**: Reply content is validated and sanitized
5. **Rate Limiting**: Consider implementing rate limiting for reply creation

## Testing

A test file `test-review-reply.js` is provided to verify the functionality:

```bash
node test-review-reply.js
```

The test covers:
- Creating reviews
- Adding replies
- Updating replies
- Deleting replies
- Single reply constraint
- Edit tracking

## Migration Notes

### For Existing Reviews

- Existing reviews without replies will have `reply: undefined`
- No data migration is required
- New reply functionality works alongside existing comment system

### Backward Compatibility

- All existing review endpoints continue to work
- New reply field is optional and doesn't break existing functionality
- Existing comment and reply system remains unchanged

## Future Enhancements

1. **Reply Notifications**: Email notifications when replies are added
2. **Reply Moderation**: Admin approval for business replies
3. **Reply Analytics**: Track reply response times and engagement
4. **Reply Templates**: Predefined reply templates for common scenarios
5. **Reply History**: Track all changes to replies over time

## Support

For questions or issues with the review reply functionality, please refer to:
- API documentation
- Test files
- Controller implementation
- Model schema definitions
