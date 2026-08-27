export interface IWord {
  _id: string;
  word: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  definition: string;
  partOfSpeech: string;
  phonetic?: string;
  audioUrl?: string;
  example: string;
}

export interface UserSession {
  id: string;
  email: string;
  streakCount: number;
  preferredLevel: "Beginner" | "Intermediate" | "Advanced";
}
