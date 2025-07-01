import { Router } from "express";
import { authorizedAccessAdmin } from "../../middleware/authorization.js";
import { getAllUsers, getSingleUser, changeStatusOfUser, deleteUser } from "../../controllers/admin/user.controller.js";

const router = Router();

// router.post("/create", authorizedAccessAdmin, rationalReflectionValidator, createRationReflection);
router.get("/all", authorizedAccessAdmin, getAllUsers);
router.get("/:userId", authorizedAccessAdmin, getSingleUser);
router.post("/status/:userId", authorizedAccessAdmin, changeStatusOfUser);
router.delete("/:userId", authorizedAccessAdmin, deleteUser);

export default router;
