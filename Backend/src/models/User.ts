import { Schema, model, Document } from "mongoose";

// 1. Update the TypeScript interface to include preferredField and pushSubscription
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  streakCount: number;
  preferredLevel: "Beginner" | "Intermediate" | "Advanced";
  preferredField: string; // 👈 Added field preference
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

// 2. Add preferredField to the Mongoose Schema definition
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
    preferredField: {
      type: String,
      default: "General", // 👈 Added default profession/field
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
