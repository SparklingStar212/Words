import { Router } from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { updatePreferredLevel } from "../controllers/authController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/level", updatePreferredLevel);

export default router;

