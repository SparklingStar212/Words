import { Schema, model, Document } from "mongoose";

export interface IWord extends Document {
  word: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  partOfSpeech: string;
  phonetic: string;
  audioUrl: string;
  definitions: string[];
  exampleSentences: string[];
}

const wordSchema = new Schema<IWord>({
  word: { type: String, required: true, unique: true, trim: true },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Intermediate",
  },
  partOfSpeech: { type: String, required: true },
  phonetic: { type: String, default: "" },
  audioUrl: { type: String, default: "" },
  definitions: { type: [String], required: true },
  exampleSentences: { type: [String], required: true },
});

export const Word = model<IWord>("Word", wordSchema);
