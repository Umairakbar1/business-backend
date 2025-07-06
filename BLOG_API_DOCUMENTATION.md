# User Blog API Documentation

## Overview
The User Blog API provides public access to blog content without requiring authentication tokens. All endpoints are accessible at `/api/user/blogs`.

## Endpoints

### 1. Get All Blogs
**GET** `/api/user/blogs`

Retrieves all published blogs with filtering and pagination options.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of blogs per page (default: 10)
- `category` (optional): Filter blogs by category (case-insensitive)
- `subCategory` (optional): Filter blogs by subcategory (case-insensitive)
- `search` (optional): Search blogs by title (case-insensitive)

**Example Requests:**
```
GET /api/user/blogs
GET /api/user/blogs?page=1&limit=5
GET /api/user/blogs?category=technology
GET /api/user/blogs?search=javascript
GET /api/user/blogs?category=technology&subCategory=web-development
```

**Response:**
```json
{
  "success": true,
  "data": {
    "blogs": [
      {
        "_id": "blog_id",
        "title": "Blog Title",
        "description": "Blog description",
        "author": "Author Name",
        "category": "Technology",
        "subCategory": "Web Development",
        "image": "image_url",
        "video": "video_url",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "status": "published"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 2. Get Single Blog
**GET** `/api/user/blogs/:id`

Retrieves a single published blog by its ID.

**Path Parameters:**
- `id`: Blog ID

**Example Request:**
```
GET /api/user/blogs/64f1a2b3c4d5e6f7g8h9i0j1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "blog_id",
    "title": "Blog Title",
    "description": "Blog description",
    "author": "Author Name",
    "category": "Technology",
    "subCategory": "Web Development",
    "image": "image_url",
    "video": "video_url",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "status": "published"
  }
}
```

### 3. Get All Categories
**GET** `/api/user/blogs/categories/all`

Retrieves all unique categories from published blogs.

**Example Request:**
```
GET /api/user/blogs/categories/all
```

**Response:**
```json
{
  "success": true,
  "data": [
    "Technology",
    "Business",
    "Health",
    "Education"
  ]
}
```

### 4. Get Subcategories by Category
**GET** `/api/user/blogs/categories/:category/subcategories`

Retrieves all subcategories for a specific category from published blogs.

**Path Parameters:**
- `category`: Category name (case-insensitive)

**Example Request:**
```
GET /api/user/blogs/categories/technology/subcategories
```

**Response:**
```json
{
  "success": true,
  "data": [
    "Web Development",
    "Mobile Development",
    "Data Science",
    "Artificial Intelligence"
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Notes

- All endpoints only return published blogs (status: 'published')
- No authentication is required for any endpoint
- Search and filtering are case-insensitive
- Pagination is available for the main blogs endpoint
- Categories and subcategories are automatically extracted from published blogs 