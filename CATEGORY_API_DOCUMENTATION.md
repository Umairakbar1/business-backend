# Category & Subcategory API Documentation

## Overview
This document describes the public APIs for accessing categories and subcategories. These APIs are designed for business owners and users to retrieve category information without authentication.

## Base URL
```
/api/business/categories
```

## Authentication
**No authentication required** - These are public APIs that can be accessed by anyone.

## API Endpoints

### 1. Get All Categories
**GET** `/api/business/categories`

Retrieves all active categories with pagination and search functionality.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `search` (optional): Search term for category title
- `sortBy` (optional): Sort field (default: 'title')
- `sortOrder` (optional): Sort direction - 'asc' or 'desc' (default: 'asc')

**Example Request:**
```bash
GET /api/business/categories?page=1&limit=10&search=restaurant&sortBy=title&sortOrder=asc
```

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Restaurants",
        "slug": "restaurants",
        "description": "Food and dining establishments",
        "image": {
          "url": "https://res.cloudinary.com/...",
          "public_id": "business-app/categories/..."
        },
        "isActive": true,
        "createdAt": "2023-09-06T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

### 2. Get Categories Hierarchy
**GET** `/api/business/categories/hierarchy`

Retrieves all categories with their subcategories in a hierarchical structure.

**Query Parameters:**
- `includeInactive` (optional): Include inactive subcategories (default: false)

**Example Request:**
```bash
GET /api/business/categories/hierarchy?includeInactive=false
```

**Response:**
```json
{
  "success": true,
  "message": "Categories hierarchy retrieved successfully",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Restaurants",
      "slug": "restaurants",
      "description": "Food and dining establishments",
      "image": {
        "url": "https://res.cloudinary.com/...",
        "public_id": "business-app/categories/..."
      },
      "isActive": true,
      "createdAt": "2023-09-06T10:30:00.000Z",
      "subcategories": [
        {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "title": "Italian Restaurants",
          "slug": "italian-restaurants",
          "description": "Italian cuisine",
          "image": {
            "url": "https://res.cloudinary.com/...",
            "public_id": "business-app/subcategories/..."
          },
          "isActive": true,
          "createdAt": "2023-09-06T10:30:00.000Z"
        }
      ]
    }
  ]
}
```

### 3. Get Category by ID
**GET** `/api/business/categories/:id`

Retrieves a specific category by its ID.

**Path Parameters:**
- `id`: Category ID

**Example Request:**
```bash
GET /api/business/categories/64f8a1b2c3d4e5f6a7b8c9d0
```

**Response:**
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Restaurants",
    "slug": "restaurants",
    "description": "Food and dining establishments",
    "image": {
      "url": "https://res.cloudinary.com/...",
      "public_id": "business-app/categories/..."
    },
    "isActive": true,
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
}
```

### 4. Get Category with Subcategories
**GET** `/api/business/categories/:id/with-subcategories`

Retrieves a specific category along with all its subcategories.

**Path Parameters:**
- `id`: Category ID

**Query Parameters:**
- `includeInactive` (optional): Include inactive subcategories (default: false)

**Example Request:**
```bash
GET /api/business/categories/64f8a1b2c3d4e5f6a7b8c9d0/with-subcategories?includeInactive=false
```

**Response:**
```json
{
  "success": true,
  "message": "Category with subcategories retrieved successfully",
  "data": {
    "category": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Restaurants",
      "slug": "restaurants",
      "description": "Food and dining establishments",
      "image": {
        "url": "https://res.cloudinary.com/...",
        "public_id": "business-app/categories/..."
      },
      "isActive": true,
      "createdAt": "2023-09-06T10:30:00.000Z"
    },
    "subcategories": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "title": "Italian Restaurants",
        "slug": "italian-restaurants",
        "description": "Italian cuisine",
        "image": {
          "url": "https://res.cloudinary.com/...",
          "public_id": "business-app/subcategories/..."
        },
        "isActive": true,
        "createdAt": "2023-09-06T10:30:00.000Z"
      }
    ]
  }
}
```

### 5. Get All Subcategories
**GET** `/api/business/categories/subcategories`

Retrieves all active subcategories with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `search` (optional): Search term for subcategory title
- `categoryId` (optional): Filter by category ID
- `sortBy` (optional): Sort field (default: 'title')
- `sortOrder` (optional): Sort direction - 'asc' or 'desc' (default: 'asc')

**Example Request:**
```bash
GET /api/business/categories/subcategories?page=1&limit=10&categoryId=64f8a1b2c3d4e5f6a7b8c9d0&search=italian
```

**Response:**
```json
{
  "success": true,
  "message": "Subcategories retrieved successfully",
  "data": {
    "subcategories": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "title": "Italian Restaurants",
        "slug": "italian-restaurants",
        "description": "Italian cuisine",
        "image": {
          "url": "https://res.cloudinary.com/...",
          "public_id": "business-app/subcategories/..."
        },
        "isActive": true,
        "categoryId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
          "title": "Restaurants",
          "slug": "restaurants"
        },
        "createdAt": "2023-09-06T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    }
  }
}
```

### 6. Get Subcategory by ID
**GET** `/api/business/categories/subcategories/:id`

Retrieves a specific subcategory by its ID.

**Path Parameters:**
- `id`: Subcategory ID

**Example Request:**
```bash
GET /api/business/categories/subcategories/64f8a1b2c3d4e5f6a7b8c9d1
```

**Response:**
```json
{
  "success": true,
  "message": "Subcategory retrieved successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "title": "Italian Restaurants",
    "slug": "italian-restaurants",
    "description": "Italian cuisine",
    "image": {
      "url": "https://res.cloudinary.com/...",
      "public_id": "business-app/subcategories/..."
    },
    "isActive": true,
    "categoryId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Restaurants",
      "slug": "restaurants"
    },
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
}
```

### 7. Get Subcategories by Category
**GET** `/api/business/categories/:categoryId/subcategories`

Retrieves all subcategories for a specific category.

**Path Parameters:**
- `categoryId`: Category ID

**Query Parameters:**
- `includeInactive` (optional): Include inactive subcategories (default: false)

**Example Request:**
```bash
GET /api/business/categories/64f8a1b2c3d4e5f6a7b8c9d0/subcategories?includeInactive=false
```

**Response:**
```json
{
  "success": true,
  "message": "Subcategories retrieved successfully",
  "data": {
    "category": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Restaurants",
      "slug": "restaurants"
    },
    "subcategories": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "title": "Italian Restaurants",
        "slug": "italian-restaurants",
        "description": "Italian cuisine",
        "image": {
          "url": "https://res.cloudinary.com/...",
          "public_id": "business-app/subcategories/..."
        },
        "isActive": true,
        "createdAt": "2023-09-06T10:30:00.000Z"
      }
    ]
  }
}
```

## Error Responses

### 404 - Not Found
```json
{
  "success": false,
  "message": "Category not found",
  "code": "00404"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve categories",
  "code": "00500"
}
```

## Usage Examples

### Frontend Integration

```javascript
// Get all categories
const fetchCategories = async () => {
  try {
    const response = await fetch('/api/business/categories?page=1&limit=20');
    const data = await response.json();
    return data.data.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

// Get categories hierarchy
const fetchCategoriesHierarchy = async () => {
  try {
    const response = await fetch('/api/business/categories/hierarchy');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching categories hierarchy:', error);
  }
};

// Get subcategories for a category
const fetchSubcategories = async (categoryId) => {
  try {
    const response = await fetch(`/api/business/categories/${categoryId}/subcategories`);
    const data = await response.json();
    return data.data.subcategories;
  } catch (error) {
    console.error('Error fetching subcategories:', error);
  }
};
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/business/categories?${queryString}`);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data.categories);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, loading, error, refetch: fetchCategories };
};
```

## Rate Limiting
These APIs are subject to rate limiting. Please implement appropriate caching strategies for frequently accessed data.

## Caching Recommendations
- Cache category hierarchy data for 1 hour
- Cache individual category/subcategory data for 30 minutes
- Implement client-side caching for better performance

## Notes
- All APIs return only active categories/subcategories by default
- Use `includeInactive=true` query parameter to include inactive items
- Images are served via Cloudinary CDN for optimal performance
- All timestamps are in ISO 8601 format 