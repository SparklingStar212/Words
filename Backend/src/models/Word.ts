// backend/src/models/Word.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IWord extends Document {
  word: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  field: string; // 👈 Add field property
  definition: string;
  partOfSpeech: string;
  audioUrl: string;
  phonetic: string;
  example: string;
}

const WordSchema = new Schema<IWord>({
  word: { type: String, required: true, lowercase: true, trim: true },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: true,
  },
  field: { type: String, default: "General", required: true }, // 👈 Add field schema definition
  definition: { type: String, required: true },
  phonetic: { type: String, default: "" },
  partOfSpeech: { type: String, required: true },
  audioUrl: { type: String, default: "" },
  example: { type: String, required: true },
});

// Compound index so a word can exist in multiple fields (e.g. "solution" in General vs Chemistry)
WordSchema.index({ word: 1, field: 1 }, { unique: true });

export default mongoose.models.Word ||
  mongoose.model<IWord>("Word", WordSchema);
