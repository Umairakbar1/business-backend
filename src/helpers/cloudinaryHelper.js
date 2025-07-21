import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { GLOBAL_ENV } from '../config/globalConfig.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: GLOBAL_ENV.cloudinaryCloudName,
  api_key: GLOBAL_ENV.cloudinaryApiKey,
  api_secret: GLOBAL_ENV.cloudinaryApiSecret,
});

// Validate Cloudinary configuration
const validateCloudinaryConfig = () => {
  if (!GLOBAL_ENV.cloudinaryCloudName || !GLOBAL_ENV.cloudinaryApiKey || !GLOBAL_ENV.cloudinaryApiSecret) {
    throw new Error('Cloudinary configuration is incomplete. Please check your environment variables.');
  }
};

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The folder to upload to (optional)
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result with public_id and url
 */
const uploadImage = async (fileBuffer, folder = 'business-app', options = {}) => {
  try {
    // Validate configuration first
    validateCloudinaryConfig();
    
    // Validate file buffer
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer provided');
    }

    const uploadOptions = {
      folder,
      resource_type: 'image',
      ...options
    };

    console.log('Starting Cloudinary upload with options:', { folder, ...options });

    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Upload timeout - request took too long'));
      }, 30000); // 30 second timeout

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          clearTimeout(timeout);
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else {
            console.log('Cloudinary upload successful:', result.public_id);
            resolve({
              public_id: result.public_id,
              url: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes
            });
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Upload video to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The folder to upload to (optional)
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result with public_id and url
 */
const uploadVideo = async (fileBuffer, folder = 'business-app/videos', options = {}) => {
  try {
    const uploadOptions = {
      folder,
      resource_type: 'video',
      ...options
    };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              public_id: result.public_id,
              url: result.secure_url,
              duration: result.duration,
              format: result.format,
              bytes: result.bytes
            });
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Video upload failed: ${error.message}`);
  }
};

/**
 * Generate thumbnail from image
 * @param {Buffer} imageBuffer - The image buffer
 * @param {number} width - Thumbnail width (default: 50)
 * @param {number} height - Thumbnail height (default: 50)
 * @returns {Promise<Buffer>} Compressed thumbnail buffer
 */
const generateThumbnail = async (imageBuffer, width = 50, height = 50) => {
  try {
    return await sharp(imageBuffer)
      .resize({
        width,
        height,
        fit: 'cover'
      })
      .toBuffer();
  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error.message}`);
  }
};

/**
 * Upload image with thumbnail
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The folder to upload to (optional)
 * @returns {Promise<Object>} Upload result with original and thumbnail
 */
const uploadImageWithThumbnail = async (fileBuffer, folder = 'business-app') => {
  try {
    // Upload original image
    const originalImage = await uploadImage(fileBuffer, folder);
    
    // Generate and upload thumbnail
    const thumbnailBuffer = await generateThumbnail(fileBuffer);
    const thumbnail = await uploadImage(thumbnailBuffer, `${folder}/thumbnails`);

    return {
      original: {
        public_id: originalImage.public_id,
        url: originalImage.url,
        width: originalImage.width,
        height: originalImage.height
      },
      thumbnail: {
        public_id: thumbnail.public_id,
        url: thumbnail.url,
        width: thumbnail.width,
        height: thumbnail.height
      }
    };
  } catch (error) {
    throw new Error(`Image with thumbnail upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @param {string} resourceType - The resource type ('image' or 'video')
 * @returns {Promise<Object>} Deletion result
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return {
      success: result.result === 'ok',
      message: result.result
    };
  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @param {string} resourceType - The resource type ('image' or 'video')
 * @returns {Promise<Array>} Array of deletion results
 */
const deleteMultipleFiles = async (publicIds, resourceType = 'image') => {
  try {
    const deletePromises = publicIds.map(publicId => 
      deleteFile(publicId, resourceType)
    );
    
    return await Promise.all(deletePromises);
  } catch (error) {
    throw new Error(`Multiple file deletion failed: ${error.message}`);
  }
};

/**
 * Get signed URL for private files (if needed)
 * @param {string} publicId - The public ID of the file
 * @param {number} expiresIn - Expiration time in seconds (default: 7200)
 * @returns {string} Signed URL
 */
const getSignedUrl = (publicId, expiresIn = 7200) => {
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'private',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn
  });
};

export {
  uploadImage,
  uploadVideo,
  uploadImageWithThumbnail,
  generateThumbnail,
  deleteFile,
  deleteMultipleFiles,
  getSignedUrl
}; 