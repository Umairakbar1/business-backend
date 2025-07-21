# Cloudinary Upload API Documentation

This document explains how to use the Cloudinary upload API endpoints for storing images and videos.

## API Endpoints

### 1. Upload Single Image
```
POST /api/media/upload-image
```

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `image` field containing the image file

**Response:**
```json
{
  "success": true,
  "data": {
    "original": {
      "public_id": "business-app/images/abc123",
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/business-app/images/abc123.jpg",
      "width": 1920,
      "height": 1080
    },
    "thumbnail": {
      "public_id": "business-app/images/thumbnails/abc123",
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/business-app/images/thumbnails/abc123.jpg",
      "width": 50,
      "height": 50
    }
  }
}
```

### 2. Upload Single Video
```
POST /api/media/upload-video
```

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `image` field containing the video file

**Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "public_id": "business-app/videos/abc123",
      "url": "https://res.cloudinary.com/your-cloud/video/upload/v1234567890/business-app/videos/abc123.mp4",
      "duration": 30.5,
      "format": "mp4",
      "bytes": 1024000
    }
  }
}
```

### 3. Upload Multiple Files (Images and Videos)
```
POST /api/media/upload-multiple
```

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `images` field containing multiple files

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "original": {
        "public_id": "business-app/images/abc123",
        "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/business-app/images/abc123.jpg",
        "width": 1920,
        "height": 1080
      },
      "thumbnail": {
        "public_id": "business-app/images/thumbnails/abc123",
        "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/business-app/images/thumbnails/abc123.jpg",
        "width": 50,
        "height": 50
      },
      "mediaType": "image"
    },
    {
      "video": {
        "public_id": "business-app/videos/def456",
        "url": "https://res.cloudinary.com/your-cloud/video/upload/v1234567890/business-app/videos/def456.mp4",
        "duration": 15.2,
        "format": "mp4",
        "bytes": 512000
      },
      "mediaType": "video"
    }
  ]
}
```

## Usage Examples

### Frontend JavaScript Example
```javascript
// Upload single image
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/media/upload-image', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  return result.data;
};

// Upload multiple files
const uploadMultipleFiles = async (files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await fetch('/api/media/upload-multiple', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  return result.data;
};
```

### React Example
```jsx
import { useState } from 'react';

const ImageUpload = () => {
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/media/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setUploadedImage(result.data.original.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileUpload} />
      {uploadedImage && (
        <img src={uploadedImage} alt="Uploaded" style={{ maxWidth: '200px' }} />
      )}
    </div>
  );
};
```

## File Requirements

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Supported Video Formats
- MP4 (.mp4)
- MOV (.mov)
- AVI (.avi)
- WMV (.wmv)

### File Size Limits
- Maximum file size: 5MB per file
- Multiple files: Up to 10 files per request

## Error Responses

### File Too Large
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB"
}
```

### Invalid File Type
```json
{
  "success": false,
  "message": "File type not allowed! Only images (JPEG, PNG, GIF, WebP) are allowed."
}
```

### Upload Failed
```json
{
  "success": false,
  "message": "Image upload failed: [error details]"
}
```

## Database Storage

When storing Cloudinary data in your database, use this structure:

```javascript
// For images
{
  url: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/business-app/images/abc123.jpg",
  public_id: "business-app/images/abc123"
}

// For videos
{
  url: "https://res.cloudinary.com/your-cloud/video/upload/v1234567890/business-app/videos/abc123.mp4",
  public_id: "business-app/videos/abc123"
}
```

## Environment Variables

Make sure you have these environment variables set:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Security Notes

1. **File Validation**: All files are validated for type and size before upload
2. **Secure URLs**: Cloudinary provides HTTPS URLs by default
3. **Folder Organization**: Files are organized in folders for better management
4. **Thumbnail Generation**: Images automatically get thumbnails generated
5. **Error Handling**: Comprehensive error handling for upload failures 