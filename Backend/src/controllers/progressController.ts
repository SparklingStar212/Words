import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Word } from "../models/Word.js";
import { DailyProgress } from "../models/DailyProgress.js";
import { User } from "../models/User.js";

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

    // Fetch user to check their preferred complexity level
    const user = await User.findById(userObjectId);
    const targetLevel = user?.preferredLevel || "Intermediate";

    let dailyProgress = await DailyProgress.findOne({
      userId: userObjectId,
      date: today,
    }).populate("wordsAssigned wordsCompleted");

    if (!dailyProgress) {
      const pastProgresses = await DailyProgress.find({ userId: userObjectId });
      const seenWordIds = pastProgresses.flatMap((p) => p.wordsAssigned);

      // Query words matching the user's specific level preference first
      const freshWords = await Word.aggregate([
        { $match: { _id: { $nin: seenWordIds }, level: targetLevel } },
        { $sample: { size: 5 } },
      ]);

      let wordsToAssign = freshWords;
      // Fallback if they've seen all words of this level
      if (wordsToAssign.length < 5) {
        const fallbackWords = await Word.aggregate([
          { $match: { level: targetLevel } },
          { $sample: { size: 5 } },
        ]);
        wordsToAssign =
          fallbackWords.length > 0
            ? fallbackWords
            : await Word.aggregate([{ $sample: { size: 5 } }]);
      }

      const wordIds = wordsToAssign.map((w) => w._id);

      dailyProgress = await DailyProgress.create({
        userId: userObjectId,
        date: today,
        wordsAssigned: wordIds,
        wordsCompleted: [],
        completed: false,
      });

      dailyProgress = await dailyProgress.populate(
        "wordsAssigned wordsCompleted",
      );
    }

    res.status(200).json({
      date: dailyProgress.date,
      completed: dailyProgress.completed,
      wordsAssigned: dailyProgress.wordsAssigned,
      wordsCompleted: dailyProgress.wordsCompleted,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
