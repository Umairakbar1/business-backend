import { Router } from "express";
import { authorizedAccessAdmin } from "../../middlewares/authorization.js";
import { archiveUser, changeStatusOfUser, getAllUsers } from "../../controllers/admin/users.controller.js";


const router = Router();

// router.post("/create", authorizedAccessAdmin, rationalReflectionValidator, createRationReflection);
router.get("/all", authorizedAccessAdmin, getAllUsers);
router.post("/archive/:userId", authorizedAccessAdmin, archiveUser);
router.post("/status/:userId", authorizedAccessAdmin, changeStatusOfUser);



export default router;
