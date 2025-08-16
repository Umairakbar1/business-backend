# Comment and Reply API Documentation

This document describes the API endpoints for managing comments and replies on blog posts.

## Overview

The comment and reply system allows users to:
- Add comments to blog posts (when `enableComments` is true)
- Reply to existing comments
- Edit and delete their own comments/replies
- Like comments and replies
- View comments and replies with pagination and sorting

## Models

### Comment Model
```javascript
{
  content: String (required, max 1000 chars),
  author: ObjectId (ref: User, required),
  authorName: String (required),
  authorEmail: String (required),
  blog: ObjectId (ref: Blog, required),
  status: String (enum: ['active', 'pending', 'spam', 'deleted'], default: 'active'),
  likes: Number (default: 0),
  dislikes: Number (default: 0),
  isEdited: Boolean (default: false),
  editedAt: Date,
  parentComment: ObjectId (ref: Comment, for nested comments),
  replies: [ObjectId] (ref: Reply),
  replyCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

### Reply Model
```javascript
{
  content: String (required, max 500 chars),
  author: ObjectId (ref: User, required),
  authorName: String (required),
  authorEmail: String (required),
  comment: ObjectId (ref: Comment, required),
  blog: ObjectId (ref: Blog, required),
  status: String (enum: ['active', 'pending', 'spam', 'deleted'], default: 'active'),
  likes: Number (default: 0),
  dislikes: Number (default: 0),
  isEdited: Boolean (default: false),
  editedAt: Date,
  parentReply: ObjectId (ref: Reply, for nested replies),
  createdAt: Date,
  updatedAt: Date
}
```

## Authentication

All comment and reply operations require user authentication using the `authorizedAccessUser` middleware.

## API Endpoints

### Comments

#### 1. Create Comment
- **POST** `/api/user/comments`
- **Body:**
  ```json
  {
    "blogId": "blog_id_here",
    "content": "Your comment content here",
    "parentCommentId": "optional_parent_comment_id"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment created successfully",
    "data": {
      "content": "Your comment content here",
      "author": "user_id",
      "authorName": "John Doe",
      "authorEmail": "john@example.com",
      "blog": "blog_id",
      "status": "active",
      "likes": 0,
      "dislikes": 0,
      "isEdited": false,
      "parentComment": null,
      "replies": [],
      "replyCount": 0,
      "_id": "comment_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 2. Get Blog with Comments and Replies (Single Blog)
- **GET** `/api/user/blogs/:id?includeComments=true&commentPage=1&commentLimit=10&commentSort=newest`
- **Query Parameters:**
  - `includeComments`: Set to 'true' to include comments (default: 'true')
  - `commentPage`: Comment page number (default: 1)
  - `commentLimit`: Comments per page (default: 10)
  - `commentSort`: Comment sorting option (newest, oldest, mostLiked, mostReplied)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "_id": "blog_id",
      "title": "Blog Title",
      "content": "Blog content...",
      "author": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "commentCount": 5,
      "comments": [
        {
          "_id": "comment_id",
          "content": "Comment content",
          "author": {
            "_id": "user_id",
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane@example.com"
          },
          "authorName": "Jane Smith",
          "authorEmail": "jane@example.com",
          "blogId": "blog_id",
          "status": "active",
          "likes": 2,
          "dislikes": 0,
          "isEdited": false,
          "parentComment": null,
          "replyCount": 2,
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z",
          "replies": [
            {
              "_id": "reply_id_1",
              "content": "First reply content",
              "author": {
                "_id": "user_id_2",
                "firstName": "Bob",
                "lastName": "Johnson",
                "email": "bob@example.com"
              },
              "authorName": "Bob Johnson",
              "authorEmail": "bob@example.com",
              "comment": "comment_id",
              "blogId": "blog_id",
              "status": "active",
              "likes": 1,
              "dislikes": 0,
              "isEdited": false,
              "parentReply": null,
              "createdAt": "2024-01-01T00:00:00.000Z",
              "updatedAt": "2024-01-01T00:00:00.000Z"
            },
            {
              "_id": "reply_id_2",
              "content": "Second reply content",
              "author": {
                "_id": "user_id_3",
                "firstName": "Alice",
                "lastName": "Brown",
                "email": "alice@example.com"
              },
              "authorName": "Alice Brown",
              "authorEmail": "alice@example.com",
              "comment": "comment_id",
              "blogId": "blog_id",
              "status": "active",
              "likes": 0,
              "dislikes": 0,
              "isEdited": false,
              "parentReply": null,
              "createdAt": "2024-01-01T00:00:00.000Z",
              "updatedAt": "2024-01-01T00:00:00.000Z"
            }
          ]
        }
      ],
      "commentPagination": {
        "page": 1,
        "limit": 10,
        "total": 5,
        "pages": 1
      }
    }
  }
  ```

#### 3. Update Comment
- **PUT** `/api/user/comments/:commentId`
- **Body:**
  ```json
  {
    "content": "Updated comment content"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment updated successfully",
    "data": {
      "content": "Updated comment content",
      "isEdited": true,
      "editedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 4. Delete Comment
- **DELETE** `/api/user/comments/:commentId`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment deleted successfully"
  }
  ```

#### 5. Like Comment
- **POST** `/api/user/comments/:commentId/like`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment liked successfully",
    "data": {
      "likes": 6
    }
  }
  ```

### Replies

#### 1. Create Reply
- **POST** `/api/user/replies`
- **Body:**
  ```json
  {
    "commentId": "comment_id_here",
    "content": "Your reply content here",
    "parentReplyId": "optional_parent_reply_id"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reply created successfully",
    "data": {
      "content": "Your reply content here",
      "author": "user_id",
      "authorName": "John Doe",
      "authorEmail": "john@example.com",
      "comment": "comment_id",
      "blog": "blog_id",
      "status": "active",
      "likes": 0,
      "dislikes": 0,
      "isEdited": false,
      "parentReply": null,
      "_id": "reply_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 2. Get Comment Replies
- **GET** `/api/user/replies/comment/:commentId?page=1&limit=10&sort=newest`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Replies per page (default: 10)
  - `sort`: Sorting option (newest, oldest, mostLiked)
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "content": "Reply content",
        "author": {
          "_id": "user_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "likes": 2,
        "dislikes": 0,
        "parentReply": null,
        "_id": "reply_id",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
  ```

#### 3. Update Reply
- **PUT** `/api/user/replies/:replyId`
- **Body:**
  ```json
  {
    "content": "Updated reply content"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reply updated successfully",
    "data": {
      "content": "Updated reply content",
      "isEdited": true,
      "editedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 4. Delete Reply
- **DELETE** `/api/user/replies/:replyId`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reply deleted successfully"
  }
  ```

#### 5. Like Reply
- **POST** `/api/user/replies/:replyId/like`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reply liked successfully",
    "data": {
      "likes": 3
    }
  }
  ```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `00400`: Bad Request (missing required fields, validation errors)
- `00403`: Forbidden (insufficient permissions, comments disabled)
- `00404`: Not Found (blog, comment, or reply not found)
- `00500`: Internal Server Error

## Business Rules

1. **Comment Creation:**
   - Only allowed on published blogs
   - Blog must have `enableComments: true`
   - User must be authenticated

2. **Comment Editing:**
   - Users can only edit their own comments
   - Only active comments can be edited
   - Edited comments are marked with `isEdited: true`

3. **Comment Deletion:**
   - Users can only delete their own comments
   - Soft delete (status changed to 'deleted')
   - Reply count is maintained

4. **Reply System:**
   - Replies can be nested (reply to replies)
   - Reply count is automatically updated
   - Same editing/deletion rules as comments

5. **Like System:**
   - Simple increment system (can be enhanced later)
   - Only active comments/replies can be liked

## Rate Limiting

Consider implementing rate limiting to prevent spam:
- Maximum comments per user per hour
- Maximum replies per user per comment
- Content filtering for inappropriate content

## Security Considerations

1. **Input Validation:**
   - All inputs are validated using Joi schemas
   - Content length limits enforced
   - XSS protection through proper escaping

2. **Authorization:**
   - Users can only modify their own content
   - Authentication required for all operations

3. **Data Sanitization:**
   - Content is trimmed and validated
   - HTML tags should be stripped if needed

## Performance Optimizations

1. **Database Indexes:**
   - Indexes on frequently queried fields
   - Compound indexes for complex queries

2. **Pagination:**
   - Efficient pagination using skip/limit
   - Total count for pagination info

3. **Population:**
   - Selective field population
   - Nested population for replies

## Future Enhancements

1. **Advanced Like System:**
   - User-specific like tracking
   - Unlike functionality
   - Like analytics

2. **Moderation:**
   - Admin approval for comments
   - Spam detection
   - Content filtering

3. **Notifications:**
   - Email notifications for replies
   - Push notifications
   - Mention system (@username)

4. **Rich Content:**
   - Image attachments
   - Emoji support
   - Markdown formatting
