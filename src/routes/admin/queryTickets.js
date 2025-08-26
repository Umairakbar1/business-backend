import { Router } from "express";
import { uploadMultipleDocumentsToCloudinary, handleCloudinaryUploadError } from "../../middleware/cloudinaryUpload.js";
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
  bulkUpdateStatus,
  addComment,
  editComment,
  deleteComment,
  addReply,
  editReply,
  deleteReply,
  closeQueryTicket
} from "../../controllers/admin/queryTicket.controller.js";

const router = Router();

// Query Ticket routes
router.post("/", authorizedAccessAdmin, uploadMultipleDocumentsToCloudinary, handleCloudinaryUploadError, createQueryTicket);
router.get("/", authorizedAccessAdmin, getAllQueryTickets);
router.get("/stats", authorizedAccessAdmin, getTicketStats);
router.get("/:id", authorizedAccessAdmin, getQueryTicketById);
router.put("/:id", authorizedAccessAdmin, uploadMultipleDocumentsToCloudinary, handleCloudinaryUploadError, updateQueryTicket);
router.delete("/:id", authorizedAccessAdmin, deleteQueryTicket);
router.patch("/:id/status", authorizedAccessAdmin, updateTicketStatus);
router.patch("/:id/assign", authorizedAccessAdmin, assignTicket);
router.patch("/bulk-status", authorizedAccessAdmin, bulkUpdateStatus);
router.patch("/:id/close", authorizedAccessAdmin, closeQueryTicket);

// Comment routes
router.post("/:id/comments", authorizedAccessAdmin, addComment);
router.put("/:id/comments/:commentId", authorizedAccessAdmin, editComment);
router.delete("/:id/comments/:commentId", authorizedAccessAdmin, deleteComment);

// Reply routes
router.post("/comments/:commentId/replies", authorizedAccessAdmin, addReply);
router.put("/comments/:commentId/replies/:replyId", authorizedAccessAdmin, editReply);
router.delete("/comments/:commentId/replies/:replyId", authorizedAccessAdmin, deleteReply);

export default router; 