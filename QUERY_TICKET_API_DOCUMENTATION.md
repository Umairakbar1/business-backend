# Query Ticket API Documentation

## Overview
The Query Ticket API provides functionality for creating, managing, and tracking support tickets. Both administrators and business owners can create tickets, add comments, and update ticket statuses.

## Authentication
All endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <token>
```

## Models

### QueryTicket Schema
```javascript
{
  title: String (required),
  businessName: String (required),
  description: String (required),
  childIssue: String (optional),
  linkedIssue: String (optional),
  websiteUrl: String (optional),
  attachment: {
    url: String,
    key: String,
    originalName: String
  },
  createdBy: ObjectId (required),
  createdByType: String (enum: ['admin', 'business']) (required),
  businessId: ObjectId (ref: 'Business'),
  status: String (enum: ['pending', 'in_progress', 'completed', 'not_completed']) (default: 'pending'),
  comments: [CommentSchema],
  createdAt: Date,
  updatedAt: Date
}
```

### Comment Schema
```javascript
{
  content: String (required),
  authorId: ObjectId (required),
  authorType: String (enum: ['admin', 'business']) (required),
  authorName: String (required),
  isEdited: Boolean (default: false),
  editedAt: Date,
  createdAt: Date
}
```

## Business Endpoints

### 1. Get Business Query Tickets
**GET** `/business/query-tickets`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): Sort order - 'asc' or 'desc' (default: 'desc')

**Response:**
```json
{
  "success": true,
  "message": "Business query tickets fetched successfully",
  "data": {
    "tickets": [
      {
        "_id": "ticket_id",
        "title": "Technical Issue",
        "businessName": "ABC Company",
        "description": "Unable to access dashboard",
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "comments": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 2. Get Single Query Ticket
**GET** `/business/query-tickets/:id`

**Response:**
```json
{
  "success": true,
  "message": "Query ticket fetched successfully",
  "data": {
    "_id": "ticket_id",
    "title": "Technical Issue",
    "businessName": "ABC Company",
    "description": "Unable to access dashboard",
    "childIssue": "Dashboard access",
    "linkedIssue": "TICKET-123",
    "websiteUrl": "https://example.com",
    "attachment": {
      "url": "/uploads/file.pdf",
      "key": "file_key",
      "originalName": "screenshot.pdf"
    },
    "status": "pending",
    "comments": [
      {
        "_id": "comment_id",
        "content": "We're looking into this issue",
        "authorId": "admin_id",
        "authorType": "admin",
        "authorName": "John Doe (Admin)",
        "isEdited": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Create Query Ticket
**POST** `/business/query-tickets`

**Form Data:**
- `title` (required): Ticket title
- `businessName` (required): Business name
- `description` (required): Ticket description
- `childIssue` (optional): Related child issue
- `linkedIssue` (optional): Linked ticket reference
- `websiteUrl` (optional): Website URL
- `attachment` (optional): File attachment

**Response:**
```json
{
  "success": true,
  "message": "Query ticket created successfully",
  "data": {
    "_id": "ticket_id",
    "title": "Technical Issue",
    "businessName": "ABC Company",
    "description": "Unable to access dashboard",
    "status": "pending",
    "createdBy": "business_id",
    "createdByType": "business",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Query Ticket
**PUT** `/business/query-tickets/:id`

**Form Data:** (same as create, all fields optional)

**Response:**
```json
{
  "success": true,
  "message": "Query ticket updated successfully",
  "data": {
    "_id": "ticket_id",
    "title": "Updated Technical Issue",
    "businessName": "ABC Company",
    "description": "Updated description",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Delete Query Ticket
**DELETE** `/business/query-tickets/:id`

**Response:**
```json
{
  "success": true,
  "message": "Query ticket deleted successfully"
}
```

### 6. Update Ticket Status
**PUT** `/business/query-tickets/:id/status`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket status updated successfully",
  "data": {
    "_id": "ticket_id",
    "status": "completed",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 7. Add Comment
**POST** `/business/query-tickets/:id/comments`

**Request Body:**
```json
{
  "content": "This is a comment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "_id": "comment_id",
    "content": "This is a comment",
    "authorId": "business_id",
    "authorType": "business",
    "authorName": "John Smith (ABC Company)",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 8. Edit Comment
**PUT** `/business/query-tickets/:id/comments/:commentId`

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "_id": "comment_id",
    "content": "Updated comment content",
    "isEdited": true,
    "editedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 9. Delete Comment
**DELETE** `/business/query-tickets/:id/comments/:commentId`

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

### 10. Get Ticket Statistics
**GET** `/business/query-tickets/stats`

**Response:**
```json
{
  "success": true,
  "message": "Ticket statistics fetched successfully",
  "data": {
    "total": 25,
    "pending": 10,
    "in_progress": 8,
    "completed": 5,
    "not_completed": 2
  }
}
```

## Admin Endpoints

### 1. Get All Query Tickets
**GET** `/admin/query-tickets`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `createdByType` (optional): Filter by creator type ('admin' or 'business')
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): Sort order - 'asc' or 'desc' (default: 'desc')

**Response:**
```json
{
  "success": true,
  "message": "Query tickets fetched successfully",
  "data": {
    "tickets": [
      {
        "_id": "ticket_id",
        "title": "Technical Issue",
        "businessName": "ABC Company",
        "description": "Unable to access dashboard",
        "status": "pending",
        "createdBy": {
          "_id": "business_id",
          "firstName": "John",
          "lastName": "Smith",
          "email": "john@example.com"
        },
        "createdByType": "business",
        "createdAt": "2024-01-01T00:00:00.000Z"
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

### 2. Get Single Query Ticket
**GET** `/admin/query-tickets/:id`

**Response:** (Same format as business endpoint but with populated creator information)

### 3. Create Query Ticket
**POST** `/admin/query-tickets`

**Form Data:** (Same as business endpoint)

**Response:**
```json
{
  "success": true,
  "message": "Query ticket created successfully",
  "data": {
    "_id": "ticket_id",
    "title": "System Maintenance",
    "businessName": "All Businesses",
    "description": "Scheduled maintenance notification",
    "status": "pending",
    "createdBy": "admin_id",
    "createdByType": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Query Ticket
**PUT** `/admin/query-tickets/:id`

**Note:** Admin can only update tickets they created.

**Form Data:** (Same as business endpoint)

### 5. Delete Query Ticket
**DELETE** `/admin/query-tickets/:id`

**Note:** Admin can only delete tickets they created.

### 6. Update Ticket Status
**PUT** `/admin/query-tickets/:id/status`

**Note:** Admin can update status of any ticket.

**Request Body:**
```json
{
  "status": "in_progress"
}
```

### 7. Add Comment
**POST** `/admin/query-tickets/:id/comments`

**Request Body:**
```json
{
  "content": "Admin response to the ticket"
}
```

### 8. Edit Comment
**PUT** `/admin/query-tickets/:id/comments/:commentId`

**Note:** Admin can only edit their own comments.

### 9. Delete Comment
**DELETE** `/admin/query-tickets/:id/comments/:commentId`

**Note:** Admin can only delete their own comments.

### 10. Get Ticket Statistics
**GET** `/admin/query-tickets/stats`

**Response:**
```json
{
  "success": true,
  "message": "Ticket statistics fetched successfully",
  "data": {
    "total": 50,
    "pending": 20,
    "in_progress": 15,
    "completed": 10,
    "not_completed": 5,
    "byCreator": {
      "admin": 10,
      "business": 40
    }
  }
}
```

## Status Values
- `pending`: Ticket is waiting for review
- `in_progress`: Ticket is being worked on
- `completed`: Ticket has been resolved
- `not_completed`: Ticket could not be completed

## File Upload
- Supported file types: Images (JPEG, PNG, GIF, WebP), PDFs, Word documents, Excel files, and text files
- Maximum file size: 5MB
- File field name: `attachment`

## Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "code": "error_code"
}
```

Common error codes:
- `00400`: Bad Request
- `00401`: Unauthorized
- `00403`: Forbidden
- `00404`: Not Found
- `00500`: Internal Server Error

## Authentication Requirements
- Business endpoints require business authentication token
- Admin endpoints require admin authentication token
- Users can only access/modify their own tickets and comments
- Admins can view all tickets but can only modify their own tickets and comments
- Admins can update the status of any ticket 