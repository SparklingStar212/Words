import type { Request, Response } from "express";
import { Types } from "mongoose";
import { DailyProgress } from "../models/DailyProgress.js";
import { User } from "../models/User.js";
import { getUniqueWordsForUser } from "../services/wordService.js";

interface AuthRequest extends Request {
  userId?: string;
}

export const getTodayProgress = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const rawUserId = req.params.userId;
    const userIdStr = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!userIdStr) {
      res.status(400).json({ error: "User ID is required." });
      return;
    }

    const userObjectId = new Types.ObjectId(userIdStr);
    const today: string = new Date().toISOString().split("T")[0] ?? "";

    // 1. Fetch user to check their preferred level, field, and seen words history
    const user = await User.findById(userObjectId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // --- STREAK CHECK: Reset if user missed a day ---
    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate);
      const currentDate = new Date(today);
      const diffTime = currentDate.getTime() - lastActive.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        user.streakCount = 0;
        await user.save();
      }
    }

    const targetLevel = user.preferredLevel || "Intermediate";
    const targetField = user.preferredField || "General"; // 👈 Capture preferred field

    // 2. Check if a daily progress session already exists for TODAY
    let dailyProgress = await DailyProgress.findOne({
      userId: userObjectId,
      date: today,
    }).populate("wordsAssigned wordsCompleted");

    // 3. If NO session exists for today, generate fresh words dynamically using AI!
    if (!dailyProgress) {
      // 🔥 CORRECTED ARGUMENT ORDER: (level, field, seenWords, count)
      const freshWordDocs = await getUniqueWordsForUser(
        targetLevel,
        targetField, // 👈 2nd argument: Field
        user.seenWords || [], // 🛡️ 3rd argument: Seen words history
        5, // 🔢 4th argument: Count
      );

      const wordIds = freshWordDocs.map((w: any) => w._id);
      const wordStrings = freshWordDocs.map((w: any) => w.word);

      // Create today's learning session record
      await DailyProgress.create({
        userId: userObjectId,
        date: today,
        wordsAssigned: wordIds,
        wordsCompleted: [],
        completed: false,
      });

      // Permanently add these new words to the user's seen history so they never repeat
      await User.findByIdAndUpdate(userObjectId, {
        $addToSet: { seenWords: { $each: wordStrings } },
      });

      // Query the fresh record with proper population
      dailyProgress = await DailyProgress.findOne({
        userId: userObjectId,
        date: today,
      }).populate("wordsAssigned wordsCompleted");
    }

    // 4. Return the progress package to the frontend
    res.status(200).json({
      date: dailyProgress!.date,
      completed: dailyProgress!.completed,
      wordsAssigned: dailyProgress!.wordsAssigned,
      wordsCompleted: dailyProgress!.wordsCompleted,
    });
  } catch (error) {
    console.error("Progress error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
};
