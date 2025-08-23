import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept image files and common document types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed! Only images, PDFs, Word documents, Excel files, and text files are allowed.'), false);
  }
};

// Create multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Single file upload middleware
export const uploadSingleImage = upload.single('image');

// Multiple files upload middleware
export const uploadMultipleImages = upload.array('images', 10);

// Error handling middleware
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
  } else if (error.message.includes('File type not allowed!')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

// Helper function to delete file
export const deleteFile = async (filePath) => {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file URL
export const getFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/${filename}`;
};

// ===== NEW BUSINESS-SPECIFIC CLOUDINARY FUNCTIONS =====

import { uploadImage, uploadImageWithThumbnail } from '../helpers/cloudinaryHelper.js';

// Configure multer for memory storage (for Cloudinary uploads)
const memoryStorage = multer.memoryStorage();

// File filter for images only (for Cloudinary)
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!'), false);
  }
};

// File filter for images and videos
const mediaFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mov',
    'video/avi',
    'video/wmv',
    'video/webm'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed! Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WMV, WebM) are allowed.'), false);
  }
};

// File filter for documents and images
const documentFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed! Only images, PDFs, Word documents, Excel files, and text files are allowed.'), false);
  }
};

// Create multer instances for different use cases
export const cloudinaryImageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export const cloudinaryMediaUpload = multer({
  storage: memoryStorage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for videos
  }
});

export const cloudinaryDocumentUpload = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Single image upload middleware for Cloudinary
export const uploadSingleImageToCloudinary = cloudinaryImageUpload.single('image');

// Single image upload middleware for blog cover images
export const uploadBlogCoverImageToCloudinary = cloudinaryImageUpload.single('coverImage');

// Single media upload middleware for Cloudinary (images and videos)
export const uploadSingleMediaToCloudinary = cloudinaryMediaUpload.single('media');

// Single document upload middleware for Cloudinary
export const uploadSingleDocumentToCloudinary = cloudinaryDocumentUpload.single('document');

// Multiple images upload middleware for Cloudinary
export const uploadMultipleImagesToCloudinary = cloudinaryImageUpload.array('images', 10);

// Multiple media upload middleware for Cloudinary (images and videos)
export const uploadMultipleMediaToCloudinary = cloudinaryMediaUpload.array('media', 10);

// Multiple documents upload middleware for Cloudinary
export const uploadMultipleDocumentsToCloudinary = cloudinaryDocumentUpload.array('document', 5);

// Error handling middleware for Cloudinary uploads
export const handleCloudinaryUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB for images/documents, 10MB for videos'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files for media, 5 for documents'
      });
    }
  } else if (error.message.includes('File type not allowed!')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

// Create multer instance for business Cloudinary uploads (10MB limit)
const businessCloudinaryUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for images
  }
});

// Business-specific upload middlewares
export const uploadLogo = businessCloudinaryUpload.single('logo');
export const uploadBusinessImages = businessCloudinaryUpload.array('images', 10);
export const uploadBusinessAssets = businessCloudinaryUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);

// Process uploaded files and upload to Cloudinary
export const processCloudinaryUpload = async (req, res, next) => {
  try {
    const uploadedFiles = {};
    
    // Process logo if uploaded
    if (req.files && req.files.logo && req.files.logo[0]) {
      const logoFile = req.files.logo[0];
      console.log('Processing logo upload:', logoFile.originalname);
      
      try {
        const logoResult = await uploadImageWithThumbnail(
          logoFile.buffer, 
          'business-app/logos'
        );
        
        uploadedFiles.logo = {
          url: logoResult.original.url,
          public_id: logoResult.original.public_id,
          thumbnail: {
            url: logoResult.thumbnail.url,
            public_id: logoResult.thumbnail.public_id
          }
        };
        
        console.log('Logo uploaded successfully:', logoResult.original.public_id);
      } catch (error) {
        console.error('Logo upload failed:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload logo: ' + error.message
        });
      }
    }
    
    // Process business images if uploaded
    if (req.files && req.files.images && req.files.images.length > 0) {
      const imageFiles = req.files.images;
      uploadedFiles.images = [];
      
      console.log(`Processing ${imageFiles.length} business images`);
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        console.log(`Processing image ${i + 1}/${imageFiles.length}:`, imageFile.originalname);
        
        try {
          const imageResult = await uploadImageWithThumbnail(
            imageFile.buffer, 
            'business-app/images'
          );
          
          uploadedFiles.images.push({
            url: imageResult.original.url,
            public_id: imageResult.original.public_id,
            thumbnail: {
              url: imageResult.thumbnail.url,
              public_id: imageResult.thumbnail.public_id
            },
            caption: req.body[`imageCaption_${i}`] || null
          });
          
          console.log(`Image ${i + 1} uploaded successfully:`, imageResult.original.public_id);
        } catch (error) {
          console.error(`Image ${i + 1} upload failed:`, error);
          return res.status(400).json({
            success: false,
            message: `Failed to upload image ${i + 1}: ${error.message}`
          });
        }
      }
    }
    
    // Attach uploaded files to request object
    req.uploadedFiles = uploadedFiles;
    next();
    
  } catch (error) {
    console.error('Cloudinary upload processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'File upload processing failed: ' + error.message
    });
  }
};



// Helper function to delete uploaded files from Cloudinary if business creation fails
export const cleanupUploadedFiles = async (uploadedFiles) => {
  const { deleteMultipleFiles } = await import('../helpers/cloudinaryHelper.js');
  
  try {
    const publicIds = [];
    
    // Add logo public ID if exists
    if (uploadedFiles.logo) {
      publicIds.push(uploadedFiles.logo.public_id);
      if (uploadedFiles.logo.thumbnail) {
        publicIds.push(uploadedFiles.logo.thumbnail.public_id);
      }
    }
    
    // Add image public IDs if exist
    if (uploadedFiles.images && uploadedFiles.images.length > 0) {
      uploadedFiles.images.forEach(image => {
        publicIds.push(image.public_id);
        if (image.thumbnail) {
          publicIds.push(image.thumbnail.public_id);
        }
      });
    }
    
    if (publicIds.length > 0) {
      await deleteMultipleFiles(publicIds);
      console.log('Cleaned up uploaded files:', publicIds);
    }
  } catch (error) {
    console.error('Failed to cleanup uploaded files:', error);
  }
}; 