# Business Image Upload API Documentation

This document describes the Cloudinary image upload functionality for business registration and management.

## Overview

The system supports both single and multiple image uploads for business logos and business images using Cloudinary as the cloud storage provider. All images are automatically optimized and thumbnails are generated.

## Features

- **Single Logo Upload**: Upload business logo with automatic thumbnail generation
- **Multiple Images Upload**: Upload up to 10 business images with captions
- **Automatic Optimization**: Images are optimized for web delivery
- **Thumbnail Generation**: Automatic thumbnail creation for faster loading
- **File Validation**: Supports JPEG, JPG, PNG, GIF, WebP formats
- **File Size Limit**: Maximum 10MB per image
- **Cleanup on Failure**: Automatic cleanup of uploaded files if business creation fails

## API Endpoints

### 1. Create Business with Media

**POST** `/api/business/business`

Create a new business with logo and multiple images support.

**Headers:**
```
Authorization: Bearer <business_owner_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `logo` (file, optional): Business logo image
- `images` (files, optional): Up to 10 business images
- `imageCaption_0` (string, optional): Caption for first image
- `imageCaption_1` (string, optional): Caption for second image
- ... (up to imageCaption_9)
- `businessName` (string, required): Business name
- `category` (string, required): Business category
- `phoneNumber` (string, required): Business phone number
- `email` (string, required): Business email
- `subcategories` (array, optional): Business subcategories
- `facebook` (string, optional): Facebook URL
- `linkedIn` (string, optional): LinkedIn URL
- `website` (string, optional): Website URL
- `twitter` (string, optional): Twitter URL
- `metaTitle` (string, optional): SEO meta title
- `metaDescription` (string, optional): SEO meta description
- `focusKeywords` (array, optional): SEO focus keywords
- `businessUrls` (array, optional): Up to 5 business URLs/links
- `about` (string, optional): Business description
- `serviceOffer` (string, optional): Services offered
- `address` (string, optional): Business address
- `city` (string, optional): City
- `state` (string, optional): State
- `zipCode` (string, optional): ZIP code
- `country` (string, optional): Country
- `plan` (string, optional): Business plan (bronze/silver/gold)
- `location` (object, optional): Location coordinates

**Response:**
```json
{
  "success": true,
  "message": "Business created successfully",
  "data": {
    "business": {
      "_id": "business_id",
      "businessName": "Business Name",
      "category": "Category",
      "email": "business@example.com",
      "phoneNumber": "+1234567890",
      "status": "pending",
      "plan": "bronze",
      "logo": {
        "url": "https://res.cloudinary.com/.../logo.jpg",
        "public_id": "business-app/logos/...",
        "thumbnail": {
          "url": "https://res.cloudinary.com/.../logo_thumb.jpg",
          "public_id": "business-app/logos/thumbnails/..."
        }
      },
      "images": [
        {
          "url": "https://res.cloudinary.com/.../image1.jpg",
          "public_id": "business-app/images/...",
          "thumbnail": {
            "url": "https://res.cloudinary.com/.../image1_thumb.jpg",
            "public_id": "business-app/images/thumbnails/..."
          },
          "caption": "Image caption",
          "uploadedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "media": [
        // Same as images array for consistency
      ],
      "businessUrls": [
        "https://example.com",
        "https://linkedin.com/company/business"
      ]
    }
  }
}
```

### 2. Register Business with Images

**POST** `/api/business/auth/register-business`

Register a new business with logo and images.

**Headers:**
```
Authorization: Bearer <business_owner_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `logo` (file, optional): Business logo image
- `images` (files, optional): Up to 10 business images
- `imageCaption_0` (string, optional): Caption for first image
- `imageCaption_1` (string, optional): Caption for second image
- ... (up to imageCaption_9)
- `businessName` (string, required): Business name
- `category` (string, required): Business category
- `phoneNumber` (string, required): Business phone number
- `email` (string, required): Business email
- `subcategories` (array, optional): Business subcategories
- `facebook` (string, optional): Facebook URL
- `linkedIn` (string, optional): LinkedIn URL
- `website` (string, optional): Website URL
- `twitter` (string, optional): Twitter URL
- `metaTitle` (string, optional): SEO meta title
- `metaDescription` (string, optional): SEO meta description
- `focusKeywords` (array, optional): SEO focus keywords
- `about` (string, optional): Business description
- `serviceOffer` (string, optional): Services offered
- `address` (string, optional): Business address
- `city` (string, optional): City
- `state` (string, optional): State
- `zipCode` (string, optional): ZIP code
- `country` (string, optional): Country
- `plan` (string, optional): Business plan (bronze/silver/gold)

**Response:**
```json
{
  "success": true,
  "message": "Business registered successfully. Pending admin approval.",
  "data": {
    "business": {
      "_id": "business_id",
      "businessName": "Business Name",
      "category": "Category",
      "email": "business@example.com",
      "phoneNumber": "+1234567890",
      "status": "pending",
      "plan": "bronze",
      "logo": {
        "url": "https://res.cloudinary.com/.../logo.jpg",
        "public_id": "business-app/logos/...",
        "thumbnail": {
          "url": "https://res.cloudinary.com/.../logo_thumb.jpg",
          "public_id": "business-app/logos/thumbnails/..."
        }
      },
      "images": [
        {
          "url": "https://res.cloudinary.com/.../image1.jpg",
          "public_id": "business-app/images/...",
          "thumbnail": {
            "url": "https://res.cloudinary.com/.../image1_thumb.jpg",
            "public_id": "business-app/images/thumbnails/..."
          },
          "caption": "Image caption"
        }
      ]
    }
  }
}
```

### 2. Update Business Logo

**PUT** `/api/business/auth/business/:businessId/logo`

Update the logo for an existing business.

**Headers:**
```
Authorization: Bearer <business_owner_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `logo` (file, required): New business logo image

**Response:**
```json
{
  "success": true,
  "message": "Business logo updated successfully",
  "data": {
    "logo": {
      "url": "https://res.cloudinary.com/.../new_logo.jpg",
      "public_id": "business-app/logos/...",
      "thumbnail": {
        "url": "https://res.cloudinary.com/.../new_logo_thumb.jpg",
        "public_id": "business-app/logos/thumbnails/..."
      }
    }
  }
}
```

### 3. Add Business Images

**PUT** `/api/business/auth/business/:businessId/images`

Add new images to an existing business.

**Headers:**
```
Authorization: Bearer <business_owner_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `images` (files, required): Up to 10 new business images
- `imageCaption_0` (string, optional): Caption for first new image
- `imageCaption_1` (string, optional): Caption for second new image
- ... (up to imageCaption_9)

**Response:**
```json
{
  "success": true,
  "message": "Business images updated successfully",
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/.../image.jpg",
        "public_id": "business-app/images/...",
        "thumbnail": {
          "url": "https://res.cloudinary.com/.../image_thumb.jpg",
          "public_id": "business-app/images/thumbnails/..."
        },
        "caption": "Image caption"
      }
    ],
    "totalImages": 5
  }
}
```

### 4. Delete Business Image

**DELETE** `/api/business/auth/business/:businessId/images/:imageId`

Delete a specific image from a business.

**Headers:**
```
Authorization: Bearer <business_owner_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "totalImages": 4
  }
}
```

### 5. Update Business with Media Management

**PUT** `/api/business/business/:id`

Update an existing business with full media management capabilities.

**Headers:**
```
Authorization: Bearer <business_owner_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `logo` (file, optional): New business logo image
- `images` (files, optional): New business images to add
- `imageCaption_0` (string, optional): Caption for first new image
- `imageCaption_1` (string, optional): Caption for second new image
- ... (up to imageCaption_9)
- `removeLogo` (boolean, optional): Set to `true` to remove existing logo
- `removeImages` (array, optional): Array of public_ids of images to remove
- `businessName` (string, optional): Updated business name
- `category` (string, optional): Updated business category
- `phoneNumber` (string, optional): Updated phone number
- `email` (string, optional): Updated email
- `subcategories` (array, optional): Updated subcategories
- `facebook` (string, optional): Updated Facebook URL
- `linkedIn` (string, optional): Updated LinkedIn URL
- `website` (string, optional): Updated website URL
- `twitter` (string, optional): Updated Twitter URL
- `metaTitle` (string, optional): Updated SEO meta title
- `metaDescription` (string, optional): Updated SEO meta description
- `focusKeywords` (array, optional): Updated SEO focus keywords
- `businessUrls` (array, optional): Updated business URLs/links (max 5)
- `about` (string, optional): Updated business description
- `serviceOffer` (string, optional): Updated services offered
- `address` (string, optional): Updated business address
- `city` (string, optional): Updated city
- `state` (string, optional): Updated state
- `zipCode` (string, optional): Updated ZIP code
- `country` (string, optional): Updated country
- `plan` (string, optional): Updated business plan (bronze/silver/gold)
- `location` (object, optional): Updated location coordinates

**Response:**
```json
{
  "success": true,
  "message": "Business updated successfully",
  "data": {
    "_id": "business_id",
    "businessName": "Updated Business Name",
    "category": "Updated Category",
    "email": "updated@example.com",
    "phoneNumber": "+1234567890",
    "status": "active",
    "plan": "silver",
    "logo": {
      "url": "https://res.cloudinary.com/.../updated_logo.jpg",
      "public_id": "business-app/logos/...",
      "thumbnail": {
        "url": "https://res.cloudinary.com/.../updated_logo_thumb.jpg",
        "public_id": "business-app/logos/thumbnails/..."
      }
    },
    "images": [
      {
        "url": "https://res.cloudinary.com/.../image1.jpg",
        "public_id": "business-app/images/...",
        "thumbnail": {
          "url": "https://res.cloudinary.com/.../image1_thumb.jpg",
          "public_id": "business-app/images/thumbnails/..."
        },
        "caption": "Updated image caption",
        "uploadedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "media": [
      // Same as images array for consistency
    ],
    "businessUrls": [
      "https://example.com",
      "https://linkedin.com/company/business"
    ]
  }
}
```

**Media Management Features:**
- **Logo Update**: Upload new logo (automatically replaces old one)
- **Logo Removal**: Set `removeLogo: true` to remove existing logo
- **Image Addition**: Upload new images (added to existing ones)
- **Image Removal**: Specify `removeImages` array with public_ids to remove
- **Automatic Cleanup**: Removed images are automatically deleted from Cloudinary
- **Thumbnail Sync**: Both original and thumbnail images are managed together

**Example Usage:**
```javascript
// Update business with logo change and image removal
const formData = new FormData();
formData.append('businessName', 'Updated Business Name');

// Change logo
if (newLogoFile) {
  formData.append('logo', newLogoFile);
}

// Remove logo
formData.append('removeLogo', 'false');

// Add new images
newImageFiles.forEach((file, index) => {
  formData.append('images', file);
  if (captions[index]) {
    formData.append(`imageCaption_${index}`, captions[index]);
  }
});

// Remove specific images
const imagesToRemove = ['public_id_1', 'public_id_2'];
formData.append('removeImages', JSON.stringify(imagesToRemove));

const response = await fetch(`/api/business/business/${businessId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 6. Delete Business Image

**DELETE** `/api/business/auth/business/:businessId/images/:imageId`

Delete a specific image from a business.

**Headers:**
```
Authorization: Bearer <business_owner_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "totalImages": 4
  }
}
```

## File Requirements

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### File Size Limits
- Maximum file size: 10MB per image
- Maximum images per upload: 10

### Image Optimization
- Images are automatically optimized for web delivery
- Thumbnails are generated automatically (50x50px)
- Original images are preserved for high-quality display

## Error Handling

### Common Error Responses

**File Too Large:**
```json
{
  "success": false,
  "message": "File too large. Maximum size is 10MB"
}
```

**Invalid File Type:**
```json
{
  "success": false,
  "message": "Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!"
}
```

**Too Many Files:**
```json
{
  "success": false,
  "message": "Too many files. Maximum is 10 images"
}
```

**Upload Failed:**
```json
{
  "success": false,
  "message": "Failed to upload logo: [error details]"
}
```

## Cloudinary Configuration

The system uses Cloudinary for image storage and optimization. Make sure the following environment variables are configured:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Folder Structure

Images are organized in Cloudinary with the following folder structure:

```
business-app/
├── logos/
│   ├── [logo files]
│   └── thumbnails/
│       └── [logo thumbnails]
└── images/
    ├── [business images]
    └── thumbnails/
        └── [image thumbnails]
```

## Security Features

- **Authentication Required**: All endpoints require valid business owner token
- **Ownership Validation**: Users can only modify their own businesses
- **File Type Validation**: Only allowed image formats are accepted
- **File Size Limits**: Prevents abuse and ensures performance
- **Automatic Cleanup**: Failed uploads are automatically cleaned up

## Usage Examples

### Frontend Implementation (JavaScript)

```javascript
// Create business with images
const formData = new FormData();
formData.append('businessName', 'My Business');
formData.append('category', 'Technology');
formData.append('phoneNumber', '+1234567890');
formData.append('email', 'business@example.com');

// Add logo
if (logoFile) {
  formData.append('logo', logoFile);
}

// Add images
imageFiles.forEach((file, index) => {
  formData.append('images', file);
  if (captions[index]) {
    formData.append(`imageCaption_${index}`, captions[index]);
  }
});

const response = await fetch('/api/business/business', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();

// Update business with media management
const updateFormData = new FormData();
updateFormData.append('businessName', 'Updated Business Name');

// Change logo
if (newLogoFile) {
  updateFormData.append('logo', newLogoFile);
}

// Remove logo
if (removeLogo) {
  updateFormData.append('removeLogo', 'true');
}

// Add new images
newImageFiles.forEach((file, index) => {
  updateFormData.append('images', file);
  if (captions[index]) {
    updateFormData.append(`imageCaption_${index}`, captions[index]);
  }
});

// Remove specific images
if (imagesToRemove.length > 0) {
  updateFormData.append('removeImages', JSON.stringify(imagesToRemove));
}

const updateResponse = await fetch(`/api/business/business/${businessId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: updateFormData
});

const updateResult = await updateResponse.json();

// Legacy business registration (still supported)
const legacyFormData = new FormData();
legacyFormData.append('businessName', 'My Business');
legacyFormData.append('category', 'Technology');
legacyFormData.append('phoneNumber', '+1234567890');
legacyFormData.append('email', 'business@example.com');

// Add logo
if (logoFile) {
  legacyFormData.append('logo', logoFile);
}

// Add images
imageFiles.forEach((file, index) => {
  legacyFormData.append('images', file);
  if (captions[index]) {
    legacyFormData.append(`imageCaption_${index}`, captions[index]);
  }
});

const legacyResponse = await fetch('/api/business/auth/register-business', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: legacyFormData
});

const legacyResult = await legacyResponse.json();
```

### cURL Examples

```bash
# Create business with logo and images
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "businessName=My Business" \
  -F "category=Technology" \
  -F "phoneNumber=+1234567890" \
  -F "email=business@example.com" \
  -F "logo=@logo.jpg" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "imageCaption_0=Office front" \
  -F "imageCaption_1=Team meeting" \
  http://localhost:3000/api/business/business

# Update business with logo change and image removal
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "businessName=Updated Business Name" \
  -F "logo=@new_logo.jpg" \
  -F "removeImages=[\"public_id_1\",\"public_id_2\"]" \
  http://localhost:3000/api/business/business/BUSINESS_ID

# Update business to remove logo
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "removeLogo=true" \
  http://localhost:3000/api/business/business/BUSINESS_ID

# Register business with images (legacy endpoint)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "businessName=My Business" \
  -F "category=Technology" \
  -F "phoneNumber=+1234567890" \
  -F "email=business@example.com" \
  -F "logo=@logo.jpg" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "imageCaption_0=Office front" \
  -F "imageCaption_1=Team meeting" \
  http://localhost:3000/api/business/auth/register-business

# Update business logo
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@new_logo.jpg" \
  http://localhost:3000/api/business/auth/business/BUSINESS_ID/logo

# Add business images
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@new_image1.jpg" \
  -F "images=@new_image2.jpg" \
  -F "imageCaption_0=New office" \
  -F "imageCaption_1=Product showcase" \
  http://localhost:3000/api/business/auth/business/BUSINESS_ID/images

# Delete business image
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/business/auth/business/BUSINESS_ID/images/IMAGE_ID
```

## Best Practices

1. **Image Optimization**: Use appropriate image formats and sizes before upload
2. **Captions**: Provide meaningful captions for better SEO and user experience
3. **Error Handling**: Always handle upload errors gracefully in your frontend
4. **Loading States**: Show loading indicators during uploads
5. **File Validation**: Validate files on the frontend before upload
6. **Retry Logic**: Implement retry logic for failed uploads
7. **Progress Tracking**: Show upload progress for better UX

## Troubleshooting

### Common Issues

1. **Upload Fails**: Check Cloudinary configuration and network connectivity
2. **File Not Found**: Ensure file exists and is accessible
3. **Permission Denied**: Verify business ownership and token validity
4. **Storage Quota**: Check Cloudinary storage limits
5. **Network Timeout**: Increase timeout settings for large files

### Debug Information

Enable debug logging by setting the appropriate log level in your environment:

```env
LOG_LEVEL=debug
```

This will provide detailed information about upload processes and any errors that occur. 