import { Router } from "express";
import { validateSentence } from "../controllers/aiController.js";

const router = Router();

router.post("/validate", validateSentence);

export default router;
