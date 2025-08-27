# Review Comments and Replies Implementation

This document outlines the implementation of comment and reply functionality for reviews across user, business, and admin controllers, similar to the existing queryTicket system.

## Overview

The implementation adds a complete comment and reply system to reviews, allowing:
- Users to comment on reviews and reply to comments
- Business owners to comment on reviews and reply to comments
- Admins to comment on reviews and reply to comments
- Full CRUD operations for comments and replies
- Proper authorization and ownership validation

## Database Schema Changes

### Review Model Updates
The `Review` model has been enhanced with embedded comments and replies:

```javascript
// Comments and replies for reviews
comments: [{
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  authorType: {
    type: String,
    enum: ['user', 'business', 'admin'],
    required: true
  },
  authorName: {
    type: String,
    required: true,
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
  editedAt: Date,
  // Replies to this comment
  replies: [{
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    authorType: {
      type: String,
      enum: ['user', 'business', 'admin'],
      required: true
    },
    authorName: {
      type: String,
      required: true,
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
  }]
}]
```

## API Endpoints

### User Review Comments & Replies

#### Add Comment to Review
- **POST** `/user/review/:id/comments`
- **Body**: `{ "content": "Comment text" }`
- **Auth**: User authentication required
- **Description**: Add a comment to a specific review

#### Add Reply to Comment
- **POST** `/user/review/comments/:commentId/replies`
- **Body**: `{ "content": "Reply text" }`
- **Auth**: User authentication required
- **Description**: Add a reply to a specific comment

#### Edit Comment
- **PUT** `/user/review/comments/:commentId`
- **Body**: `{ "content": "Updated comment text" }`
- **Auth**: User authentication required
- **Description**: Edit own comment (ownership validation)

#### Edit Reply
- **PUT** `/user/review/comments/:commentId/replies/:replyId`
- **Body**: `{ "content": "Updated reply text" }`
- **Auth**: User authentication required
- **Description**: Edit own reply (ownership validation)

#### Delete Comment
- **DELETE** `/user/review/comments/:commentId`
- **Auth**: User authentication required
- **Description**: Delete own comment (ownership validation)

#### Delete Reply
- **DELETE** `/user/review/comments/:commentId/replies/:replyId`
- **Auth**: User authentication required
- **Description**: Delete own reply (ownership validation)

### Business Review Comments & Replies

#### Add Comment to Review
- **POST** `/business/reviews/:id/comments`
- **Body**: `{ "content": "Comment text" }`
- **Auth**: Business owner authentication required
- **Description**: Add a comment to a review for their business

#### Add Reply to Comment
- **POST** `/business/reviews/comments/:commentId/replies`
- **Body**: `{ "content": "Reply text" }`
- **Auth**: Business owner authentication required
- **Description**: Add a reply to a comment on their business review

#### Edit Comment
- **PUT** `/business/reviews/comments/:commentId`
- **Body**: `{ "content": "Updated comment text" }`
- **Auth**: Business owner authentication required
- **Description**: Edit own comment (ownership validation)

#### Edit Reply
- **PUT** `/business/reviews/comments/:commentId/replies/:replyId`
- **Body**: `{ "content": "Updated reply text" }`
- **Auth**: Business owner authentication required
- **Description**: Edit own reply (ownership validation)

#### Delete Comment
- **DELETE** `/business/reviews/comments/:commentId`
- **Auth**: Business owner authentication required
- **Description**: Delete own comment (ownership validation)

#### Delete Reply
- **DELETE** `/business/reviews/comments/:commentId/replies/:replyId`
- **Auth**: Business owner authentication required
- **Description**: Delete own reply (ownership validation)

### Admin Review Comments & Replies

#### Add Comment to Review
- **POST** `/admin/reviews/:id/comments`
- **Body**: `{ "content": "Comment text" }`
- **Auth**: Admin authentication required
- **Description**: Add a comment to any review

#### Add Reply to Comment
- **POST** `/admin/reviews/comments/:commentId/replies`
- **Body**: `{ "content": "Reply text" }`
- **Auth**: Admin authentication required
- **Description**: Add a reply to any comment

#### Edit Comment
- **PUT** `/admin/reviews/comments/:commentId`
- **Body**: `{ "content": "Updated comment text" }`
- **Auth**: Admin authentication required
- **Description**: Edit own comment (ownership validation)

#### Edit Reply
- **PUT** `/admin/reviews/comments/:commentId/replies/:replyId`
- **Body**: `{ "content": "Updated reply text" }`
- **Auth**: Admin authentication required
- **Description**: Edit own reply (ownership validation)

#### Delete Comment
- **DELETE** `/admin/reviews/comments/:commentId`
- **Auth**: Admin authentication required
- **Description**: Delete own comment (ownership validation)

#### Delete Reply
- **DELETE** `/admin/reviews/comments/:commentId/replies/:replyId`
- **Auth**: Admin authentication required
- **Description**: Delete own reply (ownership validation)

## Implementation Details

### Authorization & Security
- **User Comments**: Users can only manage their own comments and replies
- **Business Comments**: Business owners can only comment on reviews for their businesses
- **Admin Comments**: Admins can comment on any review but can only edit/delete their own comments
- **Ownership Validation**: All edit/delete operations verify the user owns the content

### Data Validation
- **Comment Content**: Required, max 1000 characters
- **Reply Content**: Required, max 500 characters
- **Object ID Validation**: All IDs are validated as valid MongoDB ObjectIds
- **Required Fields**: Content is required for all comment/reply operations

### Response Format
All endpoints return consistent response formats:

```javascript
// Success Response
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Populated review object with comments and replies
  }
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "code": "Error code"
}
```

### Population
Reviews are populated with relevant information:
- **User Reviews**: Business and user information
- **Business Reviews**: User, business, approval, and management information
- **Admin Reviews**: Full business, user, approval, and management information

## Usage Examples

### Adding a Comment
```javascript
// User adding comment to review
const response = await fetch('/user/review/64f1a2b3c4d5e6f7g8h9i0j1/comments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer user-token'
  },
  body: JSON.stringify({
    content: "Great review! I had a similar experience."
  })
});
```

### Adding a Reply
```javascript
// Business owner replying to comment
const response = await fetch('/business/reviews/comments/64f1a2b3c4d5e6f7g8h9i0j1/replies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer business-token'
  },
  body: JSON.stringify({
    content: "Thank you for your feedback. We're working on improving our service."
  })
});
```

## Error Handling

The implementation includes comprehensive error handling:

- **400**: Bad Request (missing content, invalid IDs)
- **401**: Unauthorized (missing authentication)
- **403**: Forbidden (ownership validation failed)
- **404**: Not Found (review, comment, or reply not found)
- **500**: Internal Server Error (database or processing errors)

## Testing Considerations

When testing the implementation:

1. **Authentication**: Ensure proper tokens are used for each user type
2. **Ownership**: Verify users can only manage their own content
3. **Business Access**: Confirm business owners can only comment on their business reviews
4. **Data Integrity**: Check that comments and replies are properly nested
5. **Population**: Verify that responses include all necessary populated data

## Future Enhancements

Potential improvements for the comment system:

1. **Moderation**: Add admin moderation for inappropriate comments
2. **Notifications**: Implement notifications when comments/replies are added
3. **Rich Content**: Support for markdown or HTML in comments
4. **Attachments**: Allow file attachments in comments
5. **Threading**: Support for deeper reply nesting
6. **Voting**: Add like/dislike functionality for comments and replies

## Conclusion

This implementation provides a robust, secure, and scalable comment and reply system for reviews that follows the same patterns established in the queryTicket system. It maintains proper separation of concerns, implements comprehensive security measures, and provides a consistent API interface across all user types.
