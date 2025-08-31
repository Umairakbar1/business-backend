import express from 'express';
import { 
    uploadBrandLogo, 
    getBrandLogo, 
    deleteBrandLogo 
} from '../../controllers/admin/brandLogo.controller.js';
import { verifyAdminToken } from '../../middleware/authorization.js';
import { uploadSingleImageToCloudinary, handleCloudinaryUploadError } from '../../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public endpoint - Get brand logo (no authentication required)
router.get('/', getBrandLogo);

// Admin protected routes
router.use(verifyAdminToken);

// Upload or replace brand logo
router.post('/upload', uploadSingleImageToCloudinary, handleCloudinaryUploadError, uploadBrandLogo);

// Delete brand logo
router.delete('/', deleteBrandLogo);

export default router;
