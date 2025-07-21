import { Router } from "express";
import { authorizedAccessBusiness } from "../../middleware/authorization.js";
import { uploadSingleDocumentToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";
import {
  getBusinessQueryTickets,
  getQueryTicketById,
  createQueryTicket,
  updateQueryTicket,
  deleteQueryTicket,
  updateTicketStatus,
  addComment,
  editComment,
  deleteComment,
  getTicketStats
} from "../../controllers/business/queryTicket.controller.js";

const router = Router();

// GET /business/query-tickets - Get all query tickets for business
router.get("/", authorizedAccessBusiness, getBusinessQueryTickets);

// GET /business/query-tickets/stats - Get ticket statistics
router.get("/stats", authorizedAccessBusiness, getTicketStats);

// GET /business/query-tickets/:id - Get single query ticket details
router.get("/:id", authorizedAccessBusiness, getQueryTicketById);

// POST /business/query-tickets - Create new query ticket with file upload
router.post("/", authorizedAccessBusiness, uploadSingleDocumentToCloudinary, handleCloudinaryUploadError, createQueryTicket);

// PUT /business/query-tickets/:id - Update query ticket with file upload
router.put("/:id", authorizedAccessBusiness, uploadSingleDocumentToCloudinary, handleCloudinaryUploadError, updateQueryTicket);

// DELETE /business/query-tickets/:id - Delete query ticket
router.delete("/:id", authorizedAccessBusiness, deleteQueryTicket);

// PUT /business/query-tickets/:id/status - Update ticket status
router.put("/:id/status", authorizedAccessBusiness, updateTicketStatus);

// POST /business/query-tickets/:id/comments - Add comment to ticket
router.post("/:id/comments", authorizedAccessBusiness, addComment);

// PUT /business/query-tickets/:id/comments/:commentId - Edit comment
router.put("/:id/comments/:commentId", authorizedAccessBusiness, editComment);

// DELETE /business/query-tickets/:id/comments/:commentId - Delete comment
router.delete("/:id/comments/:commentId", authorizedAccessBusiness, deleteComment);

export default router; 