import { Router } from "express";
import { 
  getMetadataByUrl
} from "../../controllers/user/meta.controller.js";
import { uploadMultipleMediaToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";

const router = Router();

// POST /user/meta - Submit review with media upload support
router.get("/", getMetadataByUrl);

export default router;
