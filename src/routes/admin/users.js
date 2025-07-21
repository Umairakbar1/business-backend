import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { 
  getAllUsers, 
  getSingleUser, 
  changeStatusOfUser, 
  deleteUser, 
  updateUser,
  getUserStats,
  bulkUpdateUserStatus
} from "../../controllers/admin/user.controller.js";

const router = Router();

// Get all users with pagination and filtering
router.get("/", authorizedAccessAdmin, getAllUsers);

// Get single user by ID
router.get("/:userId", authorizedAccessAdmin, getSingleUser);

// Update user status
router.post("/status/:userId", authorizedAccessAdmin, changeStatusOfUser);

// Update user information
router.put("/:userId", authorizedAccessAdmin, updateUser);

// Delete user
router.delete("/:userId", authorizedAccessAdmin, deleteUser);

// Get user statistics
router.get("/stats/summary", authorizedAccessAdmin, getUserStats);

// Bulk update user status
router.patch("/bulk-status", authorizedAccessAdmin, bulkUpdateUserStatus);

export default router;
