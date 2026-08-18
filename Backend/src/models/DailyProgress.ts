import { Schema, model, Document, Types } from "mongoose";

export interface IDailyProgress extends Document {
  userId: Types.ObjectId;
  date: string; // Stored as 'YYYY-MM-DD' to easily match calendar days
  wordsAssigned: Types.ObjectId[];
  wordsCompleted: Types.ObjectId[];
  completed: boolean;
}

const dailyProgressSchema = new Schema<IDailyProgress>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  wordsAssigned: [{ type: Schema.Types.ObjectId, ref: "Word" }],
  wordsCompleted: [{ type: Schema.Types.ObjectId, ref: "Word" }],
  completed: { type: Boolean, default: false },
});

// Ensure a user only has one progress document per calendar day
dailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyProgress = model<IDailyProgress>(
  "DailyProgress",
  dailyProgressSchema,
);
