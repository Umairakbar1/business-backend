# Log Category and Subcategory Implementation

## Overview
This implementation adds dedicated category and subcategory management for blogs (logs) separate from the business categories. The new system provides better organization and management of blog content.

## New Models

### LogCategory Model (`src/models/admin/logCategory.js`)
- **Fields:**
  - `name` (String, required): Category name
  - `description` (String): Category description
  - `slug` (String, unique): Auto-generated URL-friendly slug
  - `image` (String): Category image URL
  - `status` (String, enum): 'active' or 'inactive'
  - `parent` (ObjectId): Reference to parent category for hierarchy
  - `timestamps`: createdAt, updatedAt

### LogSubCategory Model (`src/models/admin/logSubCategory.js`)
- **Fields:**
  - `name` (String, required): Subcategory name
  - `description` (String): Subcategory description
  - `slug` (String, unique): Auto-generated URL-friendly slug
  - `image` (String): Subcategory image URL
  - `categoryId` (ObjectId, required): Reference to LogCategory
  - `status` (String, enum): 'active' or 'inactive'
  - `createdBy` (ObjectId): Reference to Admin who created it
  - `updatedBy` (ObjectId): Reference to Admin who last updated it
  - `timestamps`: createdAt, updatedAt

## Updated Blog Model
The Blog model has been updated to use ObjectId references instead of strings:
- `category` (ObjectId, ref: 'LogCategory', required)
- `subCategory` (ObjectId, ref: 'LogSubCategory')

## New Controllers

### LogCategory Controller (`src/controllers/admin/logCategory.controller.js`)
**Endpoints:**
- `POST /admin/log-category` - Create new log category
- `GET /admin/log-category` - Get all log categories with pagination
- `GET /admin/log-category/hierarchy` - Get category hierarchy
- `GET /admin/log-category/:id` - Get category by ID
- `PUT /admin/log-category/:id` - Update category
- `DELETE /admin/log-category/:id` - Delete category
- `PATCH /admin/log-category/bulk-status` - Bulk update status

### LogSubCategory Controller (`src/controllers/admin/logSubCategory.controller.js`)
**Endpoints:**
- `POST /admin/log-subcategory` - Create new log subcategory
- `GET /admin/log-subcategory` - Get all log subcategories with pagination
- `GET /admin/log-subcategory/category/:categoryId` - Get subcategories by category
- `GET /admin/log-subcategory/:id` - Get subcategory by ID
- `PUT /admin/log-subcategory/:id` - Update subcategory
- `DELETE /admin/log-subcategory/:id` - Delete subcategory
- `PATCH /admin/log-subcategory/bulk-status` - Bulk update status

## Updated User Blogs Controller
The user blogs controller has been updated to work with the new category system:

### Changes in `getAllBlogs`:
- Now accepts `categoryId` and `subCategoryId` instead of string values
- Populates category and subcategory details
- Uses ObjectId filtering instead of regex

### Changes in `getAllCategories`:
- Now fetches from LogCategory model instead of Blog distinct values
- Returns structured category objects with name, description, image, and slug
- Only returns active categories

### Changes in `getSubCategoriesByCategory`:
- Now accepts `categoryId` parameter instead of category name
- Validates category existence
- Returns structured subcategory objects
- Only returns active subcategories

## API Usage Examples

### Creating a Log Category
```bash
POST /admin/log-category
{
  "name": "Technology",
  "description": "Technology related blogs",
  "image": "https://example.com/tech.jpg",
  "status": "active"
}
```

### Creating a Log Subcategory
```bash
POST /admin/log-subcategory
{
  "name": "Web Development",
  "description": "Web development tutorials and tips",
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "status": "active"
}
```

### Getting Blogs with Category Filter
```bash
GET /user/blogs?categoryId=64f8a1b2c3d4e5f6a7b8c9d0&subCategoryId=64f8a1b2c3d4e5f6a7b8c9d1
```

### Getting All Categories (User)
```bash
GET /user/blogs/categories/all
```

### Getting Subcategories by Category (User)
```bash
GET /user/blogs/categories/64f8a1b2c3d4e5f6a7b8c9d0/subcategories
```

## Benefits
1. **Better Organization**: Dedicated category system for blogs
2. **Hierarchical Structure**: Support for parent-child category relationships
3. **Rich Metadata**: Categories and subcategories can have descriptions, images, and slugs
4. **Status Management**: Active/inactive status for better content management
5. **Audit Trail**: Track who created and updated categories/subcategories
6. **Performance**: ObjectId references are more efficient than string matching
7. **Flexibility**: Easy to extend with additional fields in the future

## Migration Notes
- Existing blogs with string-based categories will need to be migrated
- New blogs must use the category and subcategory ObjectIds
- The system maintains backward compatibility for user-facing APIs 