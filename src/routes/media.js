import { Router } from 'express';
import {
  uploadSingleImage,
  uploadSingleVideo,
  uploadImagesVideos
} from '../controllers/mediaUpload.controller.js';
import { 
  uploadSingleImageToCloudinary, 
  uploadSingleMediaToCloudinary,
  uploadMultipleImagesToCloudinary, 
  uploadMultipleMediaToCloudinary,
  handleCloudinaryUploadError 
} from '../middleware/cloudinaryUpload.js';

const router = Router();

// Media upload routes
router.post('/upload-image', uploadSingleImageToCloudinary, handleCloudinaryUploadError, uploadSingleImage);
router.post('/upload-video', uploadSingleMediaToCloudinary, handleCloudinaryUploadError, uploadSingleVideo);
router.post('/upload-multiple', uploadMultipleMediaToCloudinary, handleCloudinaryUploadError, uploadImagesVideos);

export default router; 