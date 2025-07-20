# Cloudinary Integration Setup

This document explains how to set up Cloudinary integration for the media upload controller.

## Prerequisites

1. **Cloudinary Account**: Sign up for a free account at [cloudinary.com](https://cloudinary.com)
2. **Node.js**: Ensure you have Node.js installed
3. **Cloudinary Package**: Install the cloudinary package

## Installation

Install the Cloudinary package:

```bash
npm install cloudinary
```

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### How to get Cloudinary credentials:

1. Log in to your Cloudinary dashboard
2. Go to the "Dashboard" section
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

## Features Implemented

### 1. Image Upload with Thumbnail
- Uploads original image to Cloudinary
- Automatically generates and uploads a thumbnail (50x50px)
- Returns both original and thumbnail URLs

### 2. Video Upload
- Uploads videos to Cloudinary
- Returns video metadata including duration, format, and size

### 3. Multiple File Upload
- Supports uploading multiple images and videos simultaneously
- Handles errors gracefully for individual files

### 4. File Management
- Delete single files
- Delete multiple files
- Generate signed URLs for private files

## API Endpoints

The following endpoints are available in the media controller:

### Upload Single Image
```
POST /api/media/upload-image
```
Returns:
```json
{
  "success": true,
  "data": {
    "original": {
      "public_id": "business-app/images/abc123",
      "url": "https://res.cloudinary.com/...",
      "width": 1920,
      "height": 1080
    },
    "thumbnail": {
      "public_id": "business-app/images/thumbnails/abc123",
      "url": "https://res.cloudinary.com/...",
      "width": 50,
      "height": 50
    }
  }
}
```

### Upload Single Video
```
POST /api/media/upload-video
```
Returns:
```json
{
  "success": true,
  "data": {
    "video": {
      "public_id": "business-app/videos/abc123",
      "url": "https://res.cloudinary.com/...",
      "duration": 30.5,
      "format": "mp4",
      "bytes": 1024000
    }
  }
}
```

### Upload Multiple Files
```
POST /api/media/upload-multiple
```
Returns an array of uploaded files with their metadata.

## Helper Functions

The `cloudinaryHelper.js` provides the following functions:

- `uploadImage(fileBuffer, folder, options)` - Upload single image
- `uploadVideo(fileBuffer, folder, options)` - Upload single video
- `uploadImageWithThumbnail(fileBuffer, folder)` - Upload image with thumbnail
- `generateThumbnail(imageBuffer, width, height)` - Generate thumbnail
- `deleteFile(publicId, resourceType)` - Delete single file
- `deleteMultipleFiles(publicIds, resourceType)` - Delete multiple files
- `getSignedUrl(publicId, expiresIn)` - Generate signed URL

## Error Handling

The implementation includes comprehensive error handling:
- Invalid file types
- Upload failures
- Network errors
- Cloudinary API errors

## Security Features

- Files are organized in folders for better management
- Thumbnails are stored separately
- Support for private files with signed URLs
- Automatic file format detection

## Migration from AWS S3

If you're migrating from AWS S3 to Cloudinary:

1. Update your environment variables
2. The API response format has changed:
   - `key` → `public_id`
   - `location` → `url`
   - Additional metadata is now included

## Testing

To test the Cloudinary integration:

1. Set up your environment variables
2. Start the server
3. Use a tool like Postman to test the upload endpoints
4. Verify files are uploaded to your Cloudinary dashboard

## Troubleshooting

### Common Issues:

1. **"Cloudinary configuration error"**
   - Check your environment variables are correctly set
   - Verify your Cloudinary credentials

2. **"Upload failed"**
   - Check file size limits
   - Verify file format is supported
   - Check network connectivity

3. **"Thumbnail generation failed"**
   - Ensure sharp package is installed
   - Check image format compatibility

## Support

For Cloudinary-specific issues, refer to:
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration) 