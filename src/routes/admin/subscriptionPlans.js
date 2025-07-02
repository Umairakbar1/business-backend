import { Router } from "express";
import {
  createPlan,
  updatePlan,
  getAllPlans,
  deletePlan,
  changePlanStatus
} from "../../controllers/admin/subscriptions.plans.conroller.js";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";

const router = Router();

// Get all plans
router.get("/all", authorizedAccessAdmin, getAllPlans);
// Create a new plan
router.post("/", authorizedAccessAdmin, createPlan);
// Update a plan
router.put("/:id", authorizedAccessAdmin, updatePlan);
// Delete a plan
router.delete("/:id", authorizedAccessAdmin, deletePlan);
// Change plan status
router.patch("/:id/status", authorizedAccessAdmin, changePlanStatus);

export default router;
