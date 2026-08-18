import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { Types } from "mongoose";
import { DailyProgress } from "../models/DailyProgress.js";
import { User } from "../models/User.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

const FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

export const validateSentence = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { word, sentence, userId, wordId } = req.body;

    if (!word || !sentence) {
      res.status(400).json({ error: "Target word and sentence are required." });
      return;
    }

    const prompt = `
      You are an expert, encouraging English writing teacher. 
      Evaluate if the user's sentence correctly uses the target vocabulary word contextually and grammatically.
      
      Target Word: "${word}"
      User Sentence: "${sentence}"

      Respond STRICTLY in valid JSON format with no markdown wrappers or extra text:
      {
        "passed": boolean,
        "feedback": "A concise, 1-2 sentence encouraging teacher-like feedback explaining why it passed or how to improve."
      }
    `;

    let response = null;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) break;
      } catch (err) {
        console.warn(`Model ${modelName} failed, trying next fallback...`, err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw (
        lastError ||
        new Error("All fallback models failed to generate a response.")
      );
    }

    const textResponse = response.text.trim();
    const cleanedJsonString = textResponse.replace(/^```json\s*|\s*```$/g, "");
    const result = JSON.parse(cleanedJsonString);

    let streakUpdated = false;
    let newStreakCount = 0;
    let sessionCompleted = false;

    // If AI evaluation passes and we have user/word identifiers, update database progress
    if (result.passed && userId && wordId) {
      const userObjectId = new Types.ObjectId(userId);
      const wordObjectId = new Types.ObjectId(wordId);
      // Ensure today is strictly typed as a string
      const today: string = new Date().toISOString().split("T")[0] ?? "";

      let dailyProgress = await DailyProgress.findOne({
        userId: userObjectId,
        date: today,
      });

      if (dailyProgress && !dailyProgress.completed) {
        // Add word to completed array if not already present
        if (!dailyProgress.wordsCompleted.includes(wordObjectId)) {
          dailyProgress.wordsCompleted.push(wordObjectId);
        }

        // Check if all assigned words are now completed
        if (
          dailyProgress.wordsCompleted.length >=
          dailyProgress.wordsAssigned.length
        ) {
          dailyProgress.completed = true;
          sessionCompleted = true;

          // Increment streak count on User model
          const user = await User.findById(userObjectId);
          if (user) {
            user.streakCount += 1;
            user.lastActiveDate = today;
            await user.save();
            newStreakCount = user.streakCount;
            streakUpdated = true;
          }
        }

        await dailyProgress.save();
      }
    }

    res.status(200).json({
      passed: result.passed ?? false,
      feedback:
        result.feedback ?? "Review your sentence structure and try again.",
      sessionCompleted,
      streakUpdated,
      newStreakCount,
    });
  } catch (error) {
    console.error("AI Validation Error:", error);
    res.status(500).json({ error: "Failed to evaluate sentence via AI." });
  }
};
