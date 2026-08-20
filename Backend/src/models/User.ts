import { Schema, model, Document } from "mongoose";

// 1. Update the TypeScript interface to include pushSubscription
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  streakCount: number;
  preferredLevel: "Beginner" | "Intermediate" | "Advanced";
  lastActiveDate?: string;
  seenWords: string[];
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  } | null;
}

// 2. Add pushSubscription to the Mongoose Schema definition
const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    streakCount: { type: Number, default: 0 },
    preferredLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Intermediate",
    },
    lastActiveDate: { type: String },
    pushSubscription: { type: Object, default: null },
    seenWords: {
      type: [String],
      default: [], // Stores lowercase words the user has already encountered
    },
  },
  {
    timestamps: true,
  },
);

export const User = model<IUser>("User", userSchema);
