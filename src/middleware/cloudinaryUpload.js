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
    fileSize: 5 * 1024 * 1024, // 5MB limit
    fieldSize: 2 * 1024 * 1024, // 2MB limit for text fields
    fields: 50, // Maximum number of non-file fields
    files: 1, // Maximum number of files
    parts: 100, // Maximum number of parts (fields + files)
    headerPairs: 2000 // Maximum number of header key=>value pairs
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

// Legal document upload middleware - accepts both 'file' and 'document' field names
export const uploadLegalDocumentToCloudinary = (req, res, next) => {
  console.log('🔧 uploadLegalDocumentToCloudinary - Starting...');
  console.log('🔧 Request path:', req.path);
  console.log('🔧 Content-Type:', req.headers['content-type']);
  console.log('🔧 Content-Length:', req.headers['content-length']);
  
  // Check if this is a multipart request
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    console.log('⚠️ Not a multipart request, skipping file upload');
    return next();
  }
  
  // Set a timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    console.error('❌ Request timeout - multer processing took too long');
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Request timeout. The file upload is taking too long.',
        code: '00408'
      });
    }
  }, 30000); // 30 second timeout
  
  // Try with 'file' field first, then 'document' if that fails
  const tryUpload = (fieldName) => {
    return new Promise((resolve, reject) => {
      cloudinaryDocumentUpload.single(fieldName)(req, res, (err) => {
        if (err) {
          if (err.code === 'LIMIT_UNEXPECTED_FILE' && fieldName === 'file') {
            // Try with 'document' field next
            console.log(`🔧 Field '${fieldName}' not found, trying 'document'...`);
            resolve(tryUpload('document'));
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  };
  
  // Start with 'file' field
  tryUpload('file')
    .then(() => {
      clearTimeout(timeout);
      
      // Success - log file details
      if (req.file) {
        console.log('✅ File uploaded successfully:');
        console.log('   - Field name:', req.file.fieldname);
        console.log('   - Original name:', req.file.originalname);
        console.log('   - MIME type:', req.file.mimetype);
        console.log('   - Size:', req.file.size, 'bytes');
        console.log('   - Buffer exists:', !!req.file.buffer);
      } else {
        console.log('ℹ️ No file uploaded in this request');
      }
      
      console.log('🔧 Multer processing completed successfully');
      next();
    })
    .catch((err) => {
      clearTimeout(timeout);
      
      console.error('❌ File upload error in uploadLegalDocumentToCloudinary:', err);
      console.error('❌ Error type:', err.constructor.name);
      console.error('❌ Error code:', err.code);
      console.error('❌ Error field:', err.field);
      console.error('❌ Error message:', err.message);
      
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'File too large. Maximum size is 5MB',
              code: '00400'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              message: 'Too many files. Only one document allowed',
              code: '00400'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: 'No file field found. Please ensure you are sending a file with field name "file" or "document"',
              code: '00400'
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'File upload error: ' + err.message,
              code: '00400'
            });
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'File upload failed: ' + err.message,
        code: '00400'
      });
    });
};
export const uploadBrandLogoToCloudinary = (req, res, next) => {
  console.log('🔧 uploadBrandLogoToCloudinary - Starting...');
  console.log('🔧 Request path:', req.path);
  console.log('🔧 Content-Type:', req.headers['content-type']);
  console.log('🔧 Content-Length:', req.headers['content-length']);
  
  // Check if this is a multipart request
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    console.log('⚠️ Not a multipart request, skipping file upload');
    return next();
  }
  
  // Set a timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    console.error('❌ Request timeout - multer processing took too long');
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Request timeout. The file upload is taking too long.',
        code: '00408'
      });
    }
  }, 30000); // 30 second timeout
  
  // Try with 'file' field first, then 'image' if that fails
  const tryUpload = (fieldName) => {
    return new Promise((resolve, reject) => {
      cloudinaryImageUpload.single(fieldName)(req, res, (err) => {
        if (err) {
          if (err.code === 'LIMIT_UNEXPECTED_FILE' && fieldName === 'file') {
            // Try with 'image' field next
            console.log(`🔧 Field '${fieldName}' not found, trying 'image'...`);
            resolve(tryUpload('image'));
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  };
  
  // Start with 'file' field
  tryUpload('file')
    .then(() => {
      clearTimeout(timeout);
      
      // Success - log file details
      if (req.file) {
        console.log('✅ File uploaded successfully:');
        console.log('   - Field name:', req.file.fieldname);
        console.log('   - Original name:', req.file.originalname);
        console.log('   - MIME type:', req.file.mimetype);
        console.log('   - Size:', req.file.size, 'bytes');
        console.log('   - Buffer exists:', !!req.file.buffer);
      } else {
        console.log('ℹ️ No file uploaded in this request');
      }
      
      console.log('🔧 Multer processing completed successfully');
      next();
    })
    .catch((err) => {
      clearTimeout(timeout);
      
      console.error('❌ File upload error in uploadBrandLogoToCloudinary:', err);
      console.error('❌ Error type:', err.constructor.name);
      console.error('❌ Error code:', err.code);
      console.error('❌ Error field:', err.field);
      console.error('❌ Error message:', err.message);
      
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'File too large. Maximum size is 5MB',
              code: '00400'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              message: 'Too many files. Only one image allowed',
              code: '00400'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: 'No file field found. Please ensure you are sending a file with field name "file" or "image"',
              code: '00400'
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'File upload error: ' + err.message,
              code: '00400'
            });
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'File upload failed: ' + err.message,
        code: '00400'
      });
    });
};

// Single image upload middleware for Cloudinary
export const uploadSingleImageToCloudinary = (req, res, next) => {
  console.log('🔧 uploadSingleImageToCloudinary - Starting...');
  console.log('🔧 Request path:', req.path);
  console.log('🔧 Content-Type:', req.headers['content-type']);
  console.log('🔧 Content-Length:', req.headers['content-length']);
  
  // Check if this is a multipart request
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    console.log('⚠️ Not a multipart request, skipping file upload');
    return next();
  }
  
  // Set a timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    console.error('❌ Request timeout - multer processing took too long');
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Request timeout. The file upload is taking too long.',
        code: '00408'
      });
    }
  }, 30000); // 30 second timeout
  
  // Use the configured multer instance
  cloudinaryImageUpload.single('image')(req, res, (err) => {
    // Clear the timeout since we got a response
    clearTimeout(timeout);
    
    if (err) {
      console.error('❌ File upload error in uploadSingleImageToCloudinary:', err);
      console.error('❌ Error type:', err.constructor.name);
      console.error('❌ Error code:', err.code);
      console.error('❌ Error field:', err.field);
      console.error('❌ Error message:', err.message);
      
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'File too large. Maximum size is 5MB',
              code: '00400'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              message: 'Too many files. Only one image allowed',
              code: '00400'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: 'No file field found. Please ensure you are sending a file with field name "image"',
              code: '00400'
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'File upload error: ' + err.message,
              code: '00400'
            });
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'File upload failed: ' + err.message,
        code: '00400'
      });
    }
    
    // Success - log file details
    if (req.file) {
      console.log('✅ File uploaded successfully:');
      console.log('   - Field name:', req.file.fieldname);
      console.log('   - Original name:', req.file.originalname);
      console.log('   - MIME type:', req.file.mimetype);
      console.log('   - Size:', req.file.size, 'bytes');
      console.log('   - Buffer exists:', !!req.file.buffer);
    } else {
      console.log('ℹ️ No file uploaded in this request');
    }
    
    console.log('🔧 Multer processing completed successfully');
    next();
  });
};

// Robust profile upload middleware specifically for admin profiles
export const uploadAdminProfileImage = (req, res, next) => {
    console.log('🔧 Admin Profile Upload Middleware - Starting...');
    console.log('🔧 Request headers:', req.headers);
    console.log('🔧 Content-Type:', req.headers['content-type']);
    console.log('🔧 Content-Length:', req.headers['content-length']);
    
    // Check if this is a multipart request
    if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        console.log('⚠️ Not a multipart request, skipping file upload');
        return next();
    }
    
    // Use a simple, reliable multer configuration
    const simpleUpload = multer({
        storage: memoryStorage,
        fileFilter: (req, file, cb) => {
            // Only accept image files
            if (file.mimetype.startsWith('image/')) {
                console.log('✅ File accepted:', file.originalname, file.mimetype, file.size);
                cb(null, true);
            } else {
                console.log('❌ File rejected:', file.originalname, file.mimetype);
                cb(new Error('Only image files are allowed'), false);
            }
        },
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
            files: 1 // Only allow 1 file
        }
    }).any(); // Use .any() to accept any field name
    
    simpleUpload(req, res, (err) => {
        if (err) {
            console.error('❌ File upload error:', err);
            
            if (err instanceof multer.MulterError) {
                switch (err.code) {
                    case 'LIMIT_FILE_SIZE':
                        return res.status(400).json({
                            success: false,
                            message: 'File too large. Maximum size is 5MB',
                            code: '00400'
                        });
                    case 'LIMIT_FILE_COUNT':
                        return res.status(400).json({
                            success: false,
                            message: 'Too many files. Only one image allowed',
                            code: '00400'
                        });
                    default:
                        return res.status(400).json({
                            success: false,
                            message: 'File upload error: ' + err.message,
                            code: '00400'
                        });
                }
            }
            
            return res.status(400).json({
                success: false,
                message: 'File upload failed: ' + err.message,
                code: '00400'
            });
        }
        
        // Success - log file details
        if (req.files && req.files.length > 0) {
            console.log('✅ Files uploaded successfully:');
            req.files.forEach((file, index) => {
                console.log(`   File ${index + 1}:`);
                console.log('     - Field name:', file.fieldname);
                console.log('     - Original name:', file.originalname);
                console.log('     - MIME type:', file.mimetype);
                console.log('     - Size:', file.size, 'bytes');
                console.log('     - Buffer exists:', !!file.buffer);
            });
            
            // Set req.file to the first file for backward compatibility
            req.file = req.files[0];
        } else {
            console.log('ℹ️ No files uploaded in this request');
        }
        
        console.log('🔧 Admin Profile Upload Middleware - Completed successfully');
        next();
    });
};

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
// Multiple media upload middleware for Cloudinary (images and videos)
export const uploadQueryMultipleMediaToCloudinary = cloudinaryMediaUpload.array('document', 10);
// Multiple documents upload middleware for Cloudinary
export const uploadMultipleDocumentsToCloudinary = cloudinaryDocumentUpload.array('document', 5);

// Error handling middleware for Cloudinary uploads
export const handleCloudinaryUploadError = (error, req, res, next) => {
  console.log('🔧 handleCloudinaryUploadError - Processing error:', error.message);
  
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
  } else if (error.message.includes('Unexpected end of form')) {
    console.error('❌ Multipart form parsing error detected in handleCloudinaryUploadError');
    return res.status(400).json({
      success: false,
      message: 'Form data is incomplete or malformed. Please ensure all required fields are filled and the image file is properly selected.',
      code: '00400'
    });
  }
  
  // For any other errors, pass them to the next error handler
  console.log('🔧 Passing error to next handler:', error.message);
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

// Very simple middleware that just handles the existing Cloudinary upload
export const simpleProfileUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
        // For multipart requests, use the existing Cloudinary upload middleware
        uploadSingleImageToCloudinary(req, res, (err) => {
            if (err) {
                console.error('Simple upload error:', err);
                // Handle specific multipart errors
                if (err.message && err.message.includes('Unexpected end of form')) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid form data. Please ensure your form is properly formatted and complete.',
                        code: '00400'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: 'Form data error: ' + err.message,
                    code: '00400'
                });
            }
            next();
        });
    } else {
        // For JSON requests, just continue
        next();
    }
};

// Completely new, robust middleware for admin profile updates
export const robustProfileUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    console.log('🔍 Middleware: Content-Type detected:', contentType);
    console.log('🔍 Middleware: Request method:', req.method);
    console.log('🔍 Middleware: Request URL:', req.url);
    
    if (contentType.includes('multipart/form-data')) {
        console.log('🔍 Middleware: Processing multipart request');
        
        // Create a completely new multer instance with more permissive settings
        const robustUpload = multer({
            storage: memoryStorage,
            fileFilter: (req, file, cb) => {
                // Accept any file for now - validation happens in controller
                console.log('🔍 Middleware: Processing file:', file.originalname, file.mimetype, file.size);
                cb(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
                fieldSize: 2 * 1024 * 1024, // 2MB for text fields
                fields: 20, // Allow up to 20 fields
                files: 1, // Allow only 1 file
                parts: 25 // Allow up to 25 parts total
            }
        }).single('image');
        
        robustUpload(req, res, (err) => {
            if (err) {
                console.error('❌ Middleware: Upload error:', err);
                console.error('❌ Middleware: Error details:', {
                    message: err.message,
                    code: err.code,
                    field: err.field,
                    storageErrors: err.storageErrors
                });
                
                // Handle specific multipart errors with better messages
                if (err.message && err.message.includes('Unexpected end of form')) {
                    console.error('❌ Middleware: Form data incomplete - this usually means:');
                    console.error('   - Form was submitted before all data was entered');
                    console.error('   - Network interruption during upload');
                    console.error('   - File object is invalid or corrupted');
                    console.error('   - FormData construction issue on frontend');
                    
                    return res.status(400).json({
                        success: false,
                        message: 'Form data incomplete. Please check your form and try again.',
                        code: '00400',
                        details: 'The form submission was incomplete. This usually happens when: 1) The form is submitted too quickly, 2) There are network issues, 3) The file object is invalid, or 4) There are frontend form construction issues.',
                        suggestions: [
                            'Ensure all form fields are filled before submitting',
                            'Check that the image file is valid and not corrupted',
                            'Try submitting without an image first',
                            'Check your network connection',
                            'Verify the form is properly constructed on the frontend'
                        ]
                    });
                }
                
                if (err.message && err.message.includes('Multipart')) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid form format. Please use a proper form submission.',
                        code: '00400',
                        details: err.message
                    });
                }
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File too large. Maximum size is 5MB.',
                        code: '00400'
                    });
                }
                
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: 'Too many files. Only one image is allowed.',
                        code: '00400'
                    });
                }
                
                // Generic error for other cases
                return res.status(400).json({
                    success: false,
                    message: 'Form processing failed: ' + err.message,
                    code: '00400',
                    details: 'Please check your form data and try again.'
                });
            }
            
            // Log successful processing
            console.log('✅ Middleware: Form data processed successfully');
            console.log('✅ Middleware: Body fields:', Object.keys(req.body || {}));
            console.log('✅ Middleware: File:', req.file ? {
                name: req.file.originalname,
                type: req.file.mimetype,
                size: req.file.size
            } : 'No file');
            
            next();
        });
    } else {
        // For JSON requests, just continue
        console.log('🔍 Middleware: JSON request detected, skipping file processing');
        next();
    }
};

// Ultra-robust middleware for admin profile updates
// This middleware can handle corrupted multipart forms and provide recovery options
export const ultraRobustProfileUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    console.log('🚀 Ultra-Robust Middleware: Content-Type detected:', contentType);
    console.log('🚀 Ultra-Robust Middleware: Request method:', req.method);
    console.log('🚀 Ultra-Robust Middleware: Request URL:', req.url);
    
    if (contentType.includes('multipart/form-data')) {
        console.log('🚀 Ultra-Robust Middleware: Processing multipart request');
        
        // Create a completely new multer instance with ultra-permissive settings
        const ultraRobustUpload = multer({
            storage: memoryStorage,
            fileFilter: (req, file, cb) => {
                // Accept any file for now - validation happens in controller
                console.log('🚀 Ultra-Robust Middleware: Processing file:', file.originalname, file.mimetype, file.size);
                cb(null, true);
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit (increased)
                fieldSize: 5 * 1024 * 1024, // 5MB for text fields (increased)
                fields: 50, // Allow up to 50 fields (increased)
                files: 1, // Allow only 1 file
                parts: 100, // Allow up to 100 parts total (increased)
                headerPairs: 2000 // Allow more header pairs
            }
        }).single('image');
        
        ultraRobustUpload(req, res, (err) => {
            if (err) {
                console.error('❌ Ultra-Robust Middleware: Upload error:', err);
                console.error('❌ Ultra-Robust Middleware: Error details:', {
                    message: err.message,
                    code: err.code,
                    field: err.field,
                    storageErrors: err.storageErrors,
                    stack: err.stack
                });
                
                // Handle specific multipart errors with recovery options
                if (err.message && err.message.includes('Unexpected end of form')) {
                    console.error('❌ Ultra-Robust Middleware: Form data incomplete detected');
                    console.error('🔧 Attempting recovery...');
                    
                    // Try to extract any partial data that might have been received
                    const partialData = {};
                    if (req.body && typeof req.body === 'object') {
                        Object.keys(req.body).forEach(key => {
                            if (req.body[key] && req.body[key].trim() !== '') {
                                partialData[key] = req.body[key];
                            }
                        });
                    }
                    
                    console.log('🔍 Partial data received:', partialData);
                    
                    // If we have some data, offer a recovery option
                    if (Object.keys(partialData).length > 0) {
                        console.log('✅ Partial data recovery possible');
                        
                        // Set the partial data and continue without file
                        req.body = partialData;
                        req.file = null;
                        
                        console.log('🚀 Ultra-Robust Middleware: Continuing with partial data recovery');
                        console.log('⚠️ Note: No image file was processed due to form corruption');
                        
                        // Add a flag to indicate this was a recovery
                        req.partialDataRecovery = true;
                        
                        return next();
                    } else {
                        console.error('❌ No partial data available for recovery');
                        
                        return res.status(400).json({
                            success: false,
                            message: 'Form submission failed - data was corrupted during transmission',
                            code: '00400',
                            details: 'The multipart form was incomplete or corrupted. This usually happens when:',
                            causes: [
                                'Form submitted before all data was fully loaded',
                                'Network interruption during upload',
                                'File object is corrupted or invalid',
                                'Browser compatibility issues',
                                'FormData construction problems on frontend'
                            ],
                            recoverySteps: [
                                'Try submitting the form again',
                                'Check your network connection',
                                'Try without an image first',
                                'Use a different browser',
                                'Clear browser cache and cookies',
                                'Ensure the file is not corrupted'
                            ],
                            technicalDetails: {
                                error: err.message,
                                contentType: contentType,
                                boundary: contentType.includes('boundary=') ? contentType.split('boundary=')[1] : 'Not found'
                            }
                        });
                    }
                }
                
                // Handle other specific errors
                if (err.message && err.message.includes('Multipart')) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid multipart form format',
                        code: '00400',
                        details: err.message,
                        suggestions: [
                            'Ensure you are using a proper form submission',
                            'Check that all form fields are properly filled',
                            'Try refreshing the page and submitting again'
                        ]
                    });
                }
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File too large. Maximum size is 10MB.',
                        code: '00400',
                        details: `File size limit exceeded. Received: ${err.message}`
                    });
                }
                
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: 'Too many files. Only one image is allowed.',
                        code: '00400'
                    });
                }
                
                // Generic error for other cases
                return res.status(400).json({
                    success: false,
                    message: 'Form processing failed',
                    code: '00400',
                    details: err.message,
                    suggestions: [
                        'Check your form data and try again',
                        'Ensure all required fields are filled',
                        'Try submitting without an image first'
                    ]
                });
            }
            
            // Log successful processing
            console.log('✅ Ultra-Robust Middleware: Form data processed successfully');
            console.log('✅ Ultra-Robust Middleware: Body fields:', Object.keys(req.body || {}));
            console.log('✅ Ultra-Robust Middleware: File:', req.file ? {
                name: req.file.originalname,
                type: req.file.mimetype,
                size: req.file.size
            } : 'No file');
            
            next();
        });
    } else {
        // For JSON requests, just continue
        console.log('🚀 Ultra-Robust Middleware: JSON request detected, skipping file processing');
        next();
    }
};

// Alternative: Ultra-simple middleware that just passes through
export const passThroughUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
        console.log('Multipart request detected, using basic multer');
        
        // Use the most basic multer configuration possible
        const basicUpload = multer({
            storage: memoryStorage,
            limits: {
                fileSize: 5 * 1024 * 1024
            }
        }).single('image');
        
        basicUpload(req, res, (err) => {
            if (err) {
                console.error('Basic upload error:', err);
                return res.status(400).json({
                    success: false,
                    message: 'Form processing error: ' + err.message,
                    code: '00400'
                });
            }
            next();
        });
    } else {
        next();
    }
};

// Error handling middleware specifically for multipart form errors
export const handleMultipartErrors = (error, req, res, next) => {
    if (error.message && error.message.includes('Unexpected end of form')) {
        return res.status(400).json({
            success: false,
            message: 'Invalid form data. Please check your request format.',
            code: '00400'
        });
    }
    
    if (error.message && error.message.includes('Multipart')) {
        return res.status(400).json({
            success: false,
            message: 'Invalid multipart form data.',
            code: '00400'
        });
    }
    
    // Pass other errors to the next error handler
    next(error);
}; 