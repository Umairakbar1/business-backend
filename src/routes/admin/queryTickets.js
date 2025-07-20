import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { uploadSingleImage,uploadMultipleImages } from "../../middleware/fileUpload.js";
import {
  getAllQueryTickets,
  getQueryTicketById,
  createQueryTicket,
  updateQueryTicket,
  deleteQueryTicket,
  updateTicketStatus,
  addComment,
  editComment,
  deleteComment,
  getTicketStats
} from "../../controllers/admin/queryTicket.controller.js";

const router = Router();

// GET /admin/query-tickets - Get all query tickets
router.get("/", authorizedAccessAdmin, getAllQueryTickets);

// GET /admin/query-tickets/stats - Get ticket statistics
router.get("/stats", authorizedAccessAdmin, getTicketStats);

// GET /admin/query-tickets/:id - Get single query ticket details
router.get("/:id", authorizedAccessAdmin, getQueryTicketById);

// POST /admin/query-tickets - Create new query ticket
router.post("/", authorizedAccessAdmin, uploadSingleImage, createQueryTicket);

// PUT /admin/query-tickets/:id - Update query ticket
router.put("/:id", authorizedAccessAdmin, uploadSingleImage, updateQueryTicket);

// DELETE /admin/query-tickets/:id - Delete query ticket
router.delete("/:id", authorizedAccessAdmin, deleteQueryTicket);

// PUT /admin/query-tickets/:id/status - Update ticket status
router.put("/:id/status", authorizedAccessAdmin, updateTicketStatus);

// POST /admin/query-tickets/:id/comments - Add comment to ticket
router.post("/:id/comments", authorizedAccessAdmin, addComment);

// PUT /admin/query-tickets/:id/comments/:commentId - Edit comment
router.put("/:id/comments/:commentId", authorizedAccessAdmin, editComment);

// DELETE /admin/query-tickets/:id/comments/:commentId - Delete comment
router.delete("/:id/comments/:commentId", authorizedAccessAdmin, deleteComment);

export default router; 