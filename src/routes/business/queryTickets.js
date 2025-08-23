import { Router } from "express";
import { verifyBusinessOwnerToken } from "../../middleware/authorization.js";
import { uploadMultipleDocumentsToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";
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
  getTicketStats,
  addReply,
  editReply,
  deleteReply
} from "../../controllers/business/queryTicket.controller.js";

const router = Router();

// GET /business/query-tickets - Get all query tickets for business
router.get("/", verifyBusinessOwnerToken, getBusinessQueryTickets);

// GET /business/query-tickets/stats - Get ticket statistics
router.get("/stats", verifyBusinessOwnerToken, getTicketStats);

// GET /business/query-tickets/:id - Get single query ticket details
router.get("/:id", verifyBusinessOwnerToken, getQueryTicketById);

// POST /business/query-tickets - Create new query ticket with file upload
router.post("/", verifyBusinessOwnerToken, uploadMultipleDocumentsToCloudinary, handleCloudinaryUploadError, createQueryTicket);

// PUT /business/query-tickets/:id - Update query ticket with file upload
router.put("/:id", verifyBusinessOwnerToken, uploadMultipleDocumentsToCloudinary, handleCloudinaryUploadError, updateQueryTicket);

// DELETE /business/query-tickets/:id - Delete query ticket
router.delete("/:id", verifyBusinessOwnerToken, deleteQueryTicket);

// PUT /business/query-tickets/:id/status - Update ticket status
router.put("/:id/status", verifyBusinessOwnerToken, updateTicketStatus);

// POST /business/query-tickets/:id/comments - Add comment to ticket
router.post("/:id/comments", verifyBusinessOwnerToken, addComment);

// PUT /business/query-tickets/:id/comments/:commentId - Edit comment
router.put("/:id/comments/:commentId", verifyBusinessOwnerToken, editComment);

// DELETE /business/query-tickets/:id/comments/:commentId - Delete comment
router.delete("/:id/comments/:commentId", verifyBusinessOwnerToken, deleteComment);

// POST /business/query-tickets/:id/comments/:commentId/replies - Add reply to comment
router.post("/:id/comments/:commentId/replies", verifyBusinessOwnerToken, addReply);

// PUT /business/query-tickets/:id/comments/:commentId/replies/:replyId - Edit reply
router.put("/:id/comments/:commentId/replies/:replyId", verifyBusinessOwnerToken, editReply);

// DELETE /business/query-tickets/:id/comments/:commentId/replies/:replyId - Delete reply
router.delete("/:id/comments/:commentId/replies/:replyId", verifyBusinessOwnerToken, deleteReply);

export default router; 