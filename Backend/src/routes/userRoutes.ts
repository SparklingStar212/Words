import { Router } from "express";
import {
  updatePreferredField,
  updatePreferredLevel,
} from "../controllers/authController.js";

const router = Router();

// These will now correctly map to PUT /api/users/field and PUT /api/users/level
router.put("/field", updatePreferredField);
router.put("/level", updatePreferredLevel);

export default router;
