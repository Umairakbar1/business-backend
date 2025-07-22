import { Router } from "express";
import { uploadSingleDocumentToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import {
  createQueryTicket,
  getAllQueryTickets,
  getQueryTicketById,
  updateQueryTicket,
  deleteQueryTicket,
  updateTicketStatus,
  assignTicket,
  getTicketStats,
  bulkUpdateStatus
} from "../../controllers/admin/queryTicket.controller.js";

const router = Router();

// Query Ticket routes
router.post("/", authorizedAccessAdmin, uploadSingleDocumentToCloudinary, handleCloudinaryUploadError, createQueryTicket);
router.get("/", authorizedAccessAdmin, getAllQueryTickets);
router.get("/stats", authorizedAccessAdmin, getTicketStats);
router.get("/:id", authorizedAccessAdmin, getQueryTicketById);
router.put("/:id", authorizedAccessAdmin, uploadSingleDocumentToCloudinary, handleCloudinaryUploadError, updateQueryTicket);
router.delete("/:id", authorizedAccessAdmin, deleteQueryTicket);
router.patch("/:id/status", authorizedAccessAdmin, updateTicketStatus);
router.patch("/:id/assign", authorizedAccessAdmin, assignTicket);
router.patch("/bulk-status", authorizedAccessAdmin, bulkUpdateStatus);

export default router; 