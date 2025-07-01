import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import {
  getAllBusinesses,
  getSingleBusiness,
  changeStatusOfBusiness,
  deleteBusiness,
  updateBusiness
} from "../../controllers/admin/busienss.controller.js";

const router = Router();

router.get("/all", authorizedAccessAdmin, getAllBusinesses);
router.get("/:businessId", authorizedAccessAdmin, getSingleBusiness);
router.post("/status/:businessId", authorizedAccessAdmin, changeStatusOfBusiness);
router.delete("/:businessId", authorizedAccessAdmin, deleteBusiness);
router.put("/:businessId", authorizedAccessAdmin, updateBusiness);

export default router;
