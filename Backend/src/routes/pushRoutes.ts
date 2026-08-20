import { Router } from "express";
import type { Request, Response } from "express";
import {User} from "../models/User.js"; // Adjust path to your User model if necessary

const router = Router();

// Endpoint to save or update a user's push subscription
router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res
        .status(400)
        .json({ error: "Missing userId or subscription data." });
    }

    // Save the subscription object directly to the user document in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { pushSubscription: subscription },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    console.log(`🔔 Push subscription saved for user: ${updatedUser.email}`);
    return res
      .status(200)
      .json({ message: "Subscribed to push notifications successfully!" });
  } catch (err) {
    console.error("Error saving push subscription:", err);
    return res
      .status(500)
      .json({ error: "Internal server error while saving subscription." });
  }
});

export default router;
