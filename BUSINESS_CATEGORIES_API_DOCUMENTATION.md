# Business Categories and Subcategories API Documentation

This document describes the API endpoints for managing business categories and subcategories for users.

## Overview

The business categories and subcategories system allows users to:
- View all available business categories
- Get subcategories for a specific category
- Get all subcategories with optional filtering
- Filter by status (active/inactive)

## Models

### Category Model
```javascript
{
  title: String (required),
  slug: String (unique, auto-generated),
  description: String,
  image: {
    url: String,
    public_id: String
  },
  status: String (enum: ['active', 'inactive', 'draft'], default: 'active'),
  color: String,
  sortOrder: Number (default: 0),
  metaTitle: String,
  metaDescription: String,
  parentCategory: ObjectId (ref: Category, for nested categories),
  createdBy: ObjectId (ref: Admin),
  updatedBy: ObjectId (ref: Admin),
  createdAt: Date,
  updatedAt: Date
}
```

### SubCategory Model
```javascript
{
  title: String (required),
  slug: String (unique, auto-generated),
  description: String,
  image: {
    url: String,
    public_id: String
  },
  categoryId: ObjectId (ref: Category, required),
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: Admin),
  updatedBy: ObjectId (ref: Admin),
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Get All Business Categories with Nested Subcategories
- **GET** `/api/user/business/categories`
- **Query Parameters:**
  - `status`: Filter by status (active, inactive, draft) - optional
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "category_id",
        "title": "Restaurants",
        "description": "Food and dining establishments",
        "image": {
          "url": "https://example.com/restaurant.jpg",
          "public_id": "restaurant_image_id"
        },
        "slug": "restaurants",
        "color": "#FF6B6B",
        "sortOrder": 1,
        "subcategories": [
          {
            "_id": "subcategory_id",
            "title": "Italian",
            "description": "Italian cuisine restaurants",
            "image": {
              "url": "https://example.com/italian.jpg",
              "public_id": "italian_image_id"
            },
            "slug": "italian"
          },
          {
            "_id": "subcategory_id_2",
            "title": "Chinese",
            "description": "Chinese cuisine restaurants",
            "image": {
              "url": "https://example.com/chinese.jpg",
              "public_id": "chinese_image_id"
            },
            "slug": "chinese"
          }
        ]
      },
      {
        "_id": "category_id_2",
        "title": "Healthcare",
        "description": "Medical and health services",
        "image": {
          "url": "https://example.com/healthcare.jpg",
          "public_id": "healthcare_image_id"
        },
        "slug": "healthcare",
        "color": "#4ECDC4",
        "sortOrder": 2,
        "subcategories": [
          {
            "_id": "subcategory_id_3",
            "title": "Cardiology",
            "description": "Heart and cardiovascular care",
            "image": {
              "url": "https://example.com/cardiology.jpg",
              "public_id": "cardiology_image_id"
            },
            "slug": "cardiology"
          }
        ]
      }
    ],
    "total": 2
  }
  ```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Common Error Codes
- `400`: Bad Request (invalid category ID, validation errors)
- `404`: Not Found (category not found or inactive)
- `500`: Internal Server Error

## Business Rules

1. **Category Access:**
   - Only active categories are returned by default
   - Categories can be filtered by status
   - Categories are sorted by sortOrder, then by title

2. **Subcategory Access:**
   - Only active subcategories are returned by default
   - Subcategories can be filtered by category
   - Subcategories are sorted alphabetically by title

3. **Data Security:**
   - Only public fields are exposed
   - Admin-only fields (createdBy, updatedBy) are excluded
   - Status filtering ensures only appropriate content is shown

## Usage Examples

### Get all active business categories with nested subcategories
```bash
GET /api/user/business/categories?status=active
```

### Get all business categories (regardless of status) with nested subcategories
```bash
GET /api/user/business/categories
```

## Performance Considerations

1. **Indexing:**
   - Categories are indexed by status and sortOrder
   - Subcategories are indexed by categoryId and isActive
   - Efficient sorting and filtering

2. **Data Selection:**
   - Only necessary fields are selected
   - Population is limited to essential category information
   - Minimal data transfer

## Future Enhancements

1. **Caching:**
   - Implement Redis caching for frequently accessed categories
   - Cache invalidation on category updates

2. **Pagination:**
   - Add pagination for large category/subcategory lists
   - Configurable page sizes

3. **Search:**
   - Add search functionality for categories and subcategories
   - Fuzzy search with relevance scoring

4. **Hierarchical Categories:**
   - Support for nested category structures
   - Tree-like category navigation
