import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  streakCount: number;
  preferredLevel: "Beginner" | "Intermediate" | "Advanced";
  lastActiveDate?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  streakCount: { type: Number, default: 0 },
  preferredLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Intermediate",
  },
  lastActiveDate: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
