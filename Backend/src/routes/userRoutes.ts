import express from "express";
import { User } from "../models/User.js";

const router = express.Router();

router.post("/api/push/subscribe", async (req, res): Promise<void> => {
  try {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      res.status(400).json({ error: "User ID and subscription required." });
      return;
    }

    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    res
      .status(200)
      .json({ success: true, message: "Push subscription saved." });
  } catch (error) {
    res.status(500).json({ error: "Failed to save push subscription." });
  }
});

export default router;
