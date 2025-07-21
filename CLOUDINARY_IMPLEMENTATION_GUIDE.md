# Cloudinary Implementation Guide

This document provides a comprehensive guide for the Cloudinary image and video upload implementation across all APIs in the business application.

## Overview

Cloudinary has been integrated across multiple APIs to handle image and video uploads with the following features:
- Image uploads with automatic thumbnail generation
- Video uploads with metadata extraction
- Multiple file upload support
- Document uploads for query tickets
- Profile photo and logo uploads for businesses

## Implemented APIs

### 1. User Review System
**Endpoint:** `POST /api/user/review`
**Middleware:** `uploadMultipleMediaToCloudinary`
**Features:**
- Upload multiple images and videos in reviews
- Automatic thumbnail generation for images
- Video metadata extraction (duration, format, size)
- Organized storage in `business-app/reviews/` folder

**Request Example:**
```javascript
const formData = new FormData();
formData.append('businessId', 'business_id');
formData.append('rating', '5');
formData.append('title', 'Great Service!');
formData.append('comment', 'Excellent experience');
formData.append('media', imageFile1);
formData.append('media', videoFile1);
formData.append('media', imageFile2);

const response = await fetch('/api/user/review', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response Example:**
```json
{
  "success": true,
  "message": "Review submitted successfully and pending approval",
  "data": {
    "review": {
      "_id": "review_id",
      "rating": 5,
      "title": "Great Service!",
      "comment": "Excellent experience",
      "media": [
        {
          "type": "image",
          "original": {
            "url": "https://res.cloudinary.com/...",
            "public_id": "business-app/reviews/images/abc123",
            "width": 1920,
            "height": 1080
          },
          "thumbnail": {
            "url": "https://res.cloudinary.com/...",
            "public_id": "business-app/reviews/images/thumbnails/abc123",
            "width": 50,
            "height": 50
          }
        },
        {
          "type": "video",
          "video": {
            "url": "https://res.cloudinary.com/...",
            "public_id": "business-app/reviews/videos/def456",
            "duration": 30.5,
            "format": "mp4",
            "bytes": 1024000
          }
        }
      ],
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Business Profile Management
**Endpoint:** `PUT /api/business/auth/update-profile`
**Middleware:** `uploadSingleImageToCloudinary`
**Features:**
- Profile photo upload with thumbnail
- Organized storage in `business-app/profiles/` folder

**Request Example:**
```javascript
const formData = new FormData();
formData.append('ownerFirstName', 'John');
formData.append('ownerLastName', 'Doe');
formData.append('businessName', 'My Business');
formData.append('image', profilePhotoFile);

const response = await fetch('/api/business/auth/update-profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 3. Business Logo Management
**Endpoints:** 
- `POST /api/business/business` (Create business)
- `PUT /api/business/business/:id` (Update business)
**Middleware:** `uploadSingleImageToCloudinary`
**Features:**
- Logo upload with thumbnail
- Organized storage in `business-app/logos/` folder

**Request Example:**
```javascript
const formData = new FormData();
formData.append('businessName', 'My Business');
formData.append('businessCategory', 'Technology');
formData.append('plan', 'gold');
formData.append('image', logoFile);

const response = await fetch('/api/business/business', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 4. Query Ticket Attachments
**Endpoints:**
- `POST /api/business/query-tickets` (Create ticket)
- `PUT /api/business/query-tickets/:id` (Update ticket)
**Middleware:** `uploadSingleDocumentToCloudinary`
**Features:**
- Document and video upload support
- Organized storage in `business-app/tickets/` folder
- Support for PDFs, Word docs, Excel files, images, and videos

**Request Example:**
```javascript
const formData = new FormData();
formData.append('title', 'Technical Issue');
formData.append('businessName', 'My Business');
formData.append('description', 'Having trouble with the system');
formData.append('document', attachmentFile);

const response = await fetch('/api/business/query-tickets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 5. Media Upload API
**Endpoints:**
- `POST /api/media/upload-image` (Single image)
- `POST /api/media/upload-video` (Single video)
- `POST /api/media/upload-multiple` (Multiple files)

**Features:**
- Standalone media upload service
- Support for images and videos
- Multiple file upload with mixed types
- Organized storage in `business-app/images/` and `business-app/videos/` folders

## File Type Support

### Images
- **Formats:** JPEG, JPG, PNG, GIF, WebP
- **Max Size:** 5MB
- **Features:** Automatic thumbnail generation (50x50px)

### Videos
- **Formats:** MP4, MOV, AVI, WMV, WebM
- **Max Size:** 10MB
- **Features:** Metadata extraction (duration, format, size)

### Documents
- **Formats:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Text files
- **Max Size:** 5MB
- **Features:** Direct upload to Cloudinary

## Database Schema Updates

### Review Model
```javascript
media: [{
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  // For images
  original: {
    url: String,
    public_id: String,
    width: Number,
    height: Number
  },
  thumbnail: {
    url: String,
    public_id: String,
    width: Number,
    height: Number
  },
  // For videos
  video: {
    url: String,
    public_id: String,
    duration: Number,
    format: String,
    bytes: Number
  }
}]
```

### Business Model
```javascript
logo: {
  url: String,
  public_id: String,
  thumbnail: {
    url: String,
    public_id: String
  }
}
```

### QueryTicket Model
```javascript
attachment: {
  url: String,
  public_id: String,
  originalName: String,
  type: {
    type: String,
    enum: ['document', 'video'],
    required: true
  },
  // For documents
  format: String,
  bytes: Number,
  // For videos
  duration: Number
}
```

## Middleware Functions

### Image Upload
- `uploadSingleImageToCloudinary` - Single image upload
- `uploadMultipleImagesToCloudinary` - Multiple image upload

### Media Upload (Images + Videos)
- `uploadSingleMediaToCloudinary` - Single media upload
- `uploadMultipleMediaToCloudinary` - Multiple media upload

### Document Upload
- `uploadSingleDocumentToCloudinary` - Single document upload
- `uploadMultipleDocumentsToCloudinary` - Multiple document upload

### Error Handling
- `handleCloudinaryUploadError` - Centralized error handling

## Error Responses

### File Too Large
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB for images/documents, 10MB for videos"
}
```

### Invalid File Type
```json
{
  "success": false,
  "message": "File type not allowed! Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WMV, WebM) are allowed."
}
```

### Upload Failed
```json
{
  "success": false,
  "message": "Failed to upload media files. Please try again."
}
```

## Environment Variables

Make sure these environment variables are set:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Frontend Integration Examples

### React/Next.js Example
```javascript
const uploadReview = async (reviewData, mediaFiles) => {
  const formData = new FormData();
  
  // Add review data
  Object.keys(reviewData).forEach(key => {
    formData.append(key, reviewData[key]);
  });
  
  // Add media files
  mediaFiles.forEach(file => {
    formData.append('media', file);
  });
  
  const response = await fetch('/api/user/review', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

### JavaScript Example
```javascript
const uploadBusinessLogo = async (businessId, logoFile) => {
  const formData = new FormData();
  formData.append('image', logoFile);
  formData.append('businessName', 'Updated Business Name');
  
  const response = await fetch(`/api/business/business/${businessId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

## Security Features

1. **File Type Validation** - Only allowed file types are accepted
2. **File Size Limits** - Prevents large file uploads
3. **Authentication Required** - All upload endpoints require authentication
4. **Organized Storage** - Files are stored in organized folders
5. **Error Handling** - Comprehensive error handling and user feedback

## Performance Considerations

1. **Thumbnail Generation** - Automatic thumbnail creation for faster loading
2. **Metadata Extraction** - Video metadata is extracted for better UX
3. **Organized Storage** - Files are organized in folders for better management
4. **Error Recovery** - Failed uploads don't affect other files in batch uploads

## Migration Notes

If migrating from existing file upload systems:
1. Update frontend to use new field names (`image` for logos, `media` for reviews)
2. Update database schemas to match new structure
3. Test all upload functionality thoroughly
4. Update any hardcoded file paths to use Cloudinary URLs 