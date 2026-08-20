// backend/src/models/Word.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IWord extends Document {
  word: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  definition: string;
  partOfSpeech: string;
  audioUrl: string;
  phonetic: string;
  example: string;
}

const WordSchema = new Schema<IWord>({
  word: { type: String, required: true, unique: true, lowercase: true },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: true,
  },
  definition: { type: String, required: true },
  phonetic: { type: String, default: "" },
  partOfSpeech: { type: String, required: true },
  audioUrl: { type: String, default: "" },
  example: { type: String, required: true },
});

export default mongoose.models.Word ||
  mongoose.model<IWord>("Word", WordSchema);
