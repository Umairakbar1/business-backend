import { Router } from "express";
import {
  createMedia,
  getAllMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  bulkDeleteMedia,
  bulkUploadMedia,
  toggleMediaStatus,
  getMediaStats
} from "../../controllers/admin/media.controller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { uploadSingleMediaToCloudinary, uploadMultipleMediaToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";

const router = Router();

// Media CRUD routes
router.post("/", authorizedAccessAdmin, uploadSingleMediaToCloudinary, handleCloudinaryUploadError, createMedia);
router.post("/bulk-upload", authorizedAccessAdmin, uploadMultipleMediaToCloudinary, handleCloudinaryUploadError, bulkUploadMedia);
router.get("/", authorizedAccessAdmin, getAllMedia);
router.get("/:id", authorizedAccessAdmin, getMediaById);
router.put("/:id", authorizedAccessAdmin, uploadSingleMediaToCloudinary, handleCloudinaryUploadError, updateMedia);
router.delete("/:id", authorizedAccessAdmin, deleteMedia);
router.patch("/bulk-delete", authorizedAccessAdmin, bulkDeleteMedia);
router.patch("/:id/toggle-status", authorizedAccessAdmin, toggleMediaStatus);
router.get("/stats/summary", authorizedAccessAdmin, getMediaStats);

export default router; 