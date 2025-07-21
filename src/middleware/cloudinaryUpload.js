import multer from 'multer';

// Configure memory storage for Cloudinary uploads
const memoryStorage = multer.memoryStorage();

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  // Accept only image files
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
    cb(new Error('File type not allowed! Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

// File filter for images and videos
const mediaFileFilter = (req, file, cb) => {
  // Accept image and video files
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

// Single media upload middleware for Cloudinary (images and videos)
export const uploadSingleMediaToCloudinary = cloudinaryMediaUpload.single('media');

// Single document upload middleware for Cloudinary
export const uploadSingleDocumentToCloudinary = cloudinaryDocumentUpload.single('document');

// Multiple images upload middleware for Cloudinary
export const uploadMultipleImagesToCloudinary = cloudinaryImageUpload.array('images', 10);

// Multiple media upload middleware for Cloudinary (images and videos)
export const uploadMultipleMediaToCloudinary = cloudinaryMediaUpload.array('media', 10);

// Multiple documents upload middleware for Cloudinary
export const uploadMultipleDocumentsToCloudinary = cloudinaryDocumentUpload.array('documents', 5);

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