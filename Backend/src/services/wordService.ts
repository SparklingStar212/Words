import Word from "../models/Word.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const MODEL_CANDIDATES = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

/**
 * Ensures a healthy global pool of words exists for a given level,
 * then picks a requested number of unique words the user hasn't seen yet.
 */
export async function getUniqueWordsForUser(
  level: "Beginner" | "Intermediate" | "Advanced",
  seenWords: string[],
  count = 3,
) {
  try {
    // 1. Check how many unseen words currently exist in the global database for this level
    let availableWords = await Word.find({
      level,
      word: { $nin: seenWords },
    } as any);

    // 2. If the pool is running low (e.g., less than 10 words left), bulk-generate more via AI!
    if (availableWords.length < 15) {
      console.log(
        `⚡ Vocabulary pool low for ${level}. Bulk generating fresh words via AI...`,
      );
      await bulkGenerateAndEnrichWords(level, 25); // Bulk generate 25 words at once
    }

    // 3. Randomly shuffle and pick the requested count (e.g., 3 words) from the available pool
    const shuffled = availableWords.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (err) {
    console.error("Error fetching unique words from pool:", err);
    throw err;
  }
}

/**
 * Helper function to ask Gemini for a bulk batch of words and enrich them with the dictionary API
 */
async function bulkGenerateAndEnrichWords(
  level: "Beginner" | "Intermediate" | "Advanced",
  count = 15,
) {
  try {
    const prompt = `Generate a JSON array of ${count} distinct, sophisticated English words suitable for a ${level} English learner. 
    Return ONLY a raw JSON array of strings, e.g., ["word1", "word2", "word3"].`;

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
    const rawWords: string[] = JSON.parse(cleanedJson);

    // Enrich and save each word to MongoDB globally
    for (const w of rawWords) {
      const lowerWord = w.toLowerCase();
      const existing = await Word.findOne({ word: lowerWord } as any);
      if (existing) continue; // Skip if already in global DB

      try {
        const dictRes = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${lowerWord}`,
        );
        if (!dictRes.ok) continue;

        const dictData = (await dictRes.json()) as any[];
        const entry = dictData[0];

        const definition =
          entry.meanings[0]?.definitions[0]?.definition ||
          "Definition unavailable.";
        const partOfSpeech = entry.meanings[0]?.partOfSpeech || "noun";

        let audioUrl = "";
        let phoneticText = "";

        for (const phonetic of entry.phonetics || []) {
          if (phonetic.audio && !audioUrl) audioUrl = phonetic.audio;
          if (phonetic.text && !phoneticText) phoneticText = phonetic.text;
        }

        const example =
          entry.meanings[0]?.definitions[0]?.example ||
          `Using the word "${lowerWord}" in a sentence.`;

        await Word.create({
          word: lowerWord,
          level,
          definition,
          partOfSpeech,
          audioUrl,
          phonetic: phoneticText || `/${lowerWord}/`,
          example,
        });
      } catch (dictErr) {
        // Create a fallback entry if dictionary lookup fails
        await Word.create({
          word: lowerWord,
          level,
          definition: "A valuable term for daily communication.",
          partOfSpeech: "noun",
          audioUrl: "",
          phonetic: `/${lowerWord}/`,
          example: `Practice using "${lowerWord}" correctly.`,
        }).catch(() => {}); // Ignore duplicate key errors
      }
    }
  } catch (err) {
    console.error("Bulk generation error:", err);
  }
}
