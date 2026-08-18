import { Router } from "express";
import { getTodayProgress } from "../controllers/progressController.js";

const router = Router();

router.get("/:userId", getTodayProgress);

export default router;
