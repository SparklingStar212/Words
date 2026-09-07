import Word from "../models/Word.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const MODEL_CANDIDATES = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

/**
 * Ensures a healthy global pool of words exists for a given level and field,
 * then picks a requested number of unique words the user hasn't seen yet.
 */
export async function getUniqueWordsForUser(
  level: "Beginner" | "Intermediate" | "Advanced",
  preferredField = "General",
  seenWords: string[],
  count = 3,
) {
  try {
    // 1. Check how many unseen words currently exist in the global database for this level & field
    let availableWords = await Word.find({
      level,
      field: preferredField,
      word: { $nin: seenWords },
    } as any);

    // 🛡️ Safety Filter: Instantly drop any legacy placeholders if they survived
    availableWords = availableWords.filter(
      (w: any) => !w.example?.includes("Using the word"),
    );

    // 2. If the pool is running low, bulk-generate more via AI tailored to this field!
    if (availableWords.length < 15) {
      console.log(
        `⚡ Vocabulary pool low for ${level} (${preferredField}). Bulk generating fresh words via AI...`,
      );
      await bulkGenerateAndEnrichWords(level, preferredField, 25);

      // Re-fetch after generation
      availableWords = await Word.find({
        level,
        field: preferredField,
        word: { $nin: seenWords },
      } as any);

      // Apply safety filter again just to be safe
      availableWords = availableWords.filter(
        (w: any) => !w.example?.includes("Using the word"),
      );
    }

    // 3. Randomly shuffle and pick the requested count from the available pool
    const shuffled = availableWords.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (err) {
    console.error("Error fetching unique words from pool:", err);
    throw err;
  }
}

/**
 * Helper function to ask Gemini for a bulk batch of rich word objects directly
 */
async function bulkGenerateAndEnrichWords(
  level: "Beginner" | "Intermediate" | "Advanced",
  preferredField = "General",
  count = 15,
) {
  try {
    const fieldInstruction =
      preferredField && preferredField !== "General"
        ? `The words must specifically relate to the academic or professional field of: "${preferredField}".`
        : `The words should be high-value vocabulary suitable for everyday professional and conversational use.`;

    const prompt = `Generate a JSON array of ${count} distinct, sophisticated English words suitable for a ${level} English learner. 
    ${fieldInstruction}
    
    Return ONLY a raw JSON array of objects with these exact keys:
    - "word": string (lowercase)
    - "definition": string (clear, accurate, comprehensive definition)
    - "partOfSpeech": string (e.g., noun, verb, adjective)
    - "phonetic": string (e.g., /sɪmpəl/)
    - "example": string (a rich, contextual sentence using the word naturally)`;

    let response: any = null;
    let lastError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) break;
      } catch (modelErr) {
        lastError = modelErr;
      }
    }

    if (!response || !response.text) {
      throw (
        lastError ||
        new Error("All Gemini model candidates failed bulk generation.")
      );
    }

    const textResponse = response.text || "[]";
    const cleanedJson = textResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const rawWords: any[] = JSON.parse(cleanedJson);

    // Save each word object directly into MongoDB with its field tag
    for (const item of rawWords) {
      const lowerWord = item.word?.toLowerCase().trim();
      if (!lowerWord) continue;

      const existing = await Word.findOne({
        word: lowerWord,
        field: preferredField,
      } as any);
      if (existing) continue;

      await Word.create({
        word: lowerWord,
        level,
        field: preferredField,
        definition:
          item.definition || "A valuable term for professional contexts.",
        partOfSpeech: item.partOfSpeech || "noun",
        phonetic: item.phonetic || `/${lowerWord}/`,
        audioUrl: "", // Handled gracefully via browser speech synthesis fallback
        example: item.example || `Practice using "${lowerWord}" properly.`,
      }).catch(() => {}); // Silently ignore duplicate key inserts
    }
  } catch (err) {
    console.error("Bulk generation error:", err);
  }
}
